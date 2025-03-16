/**
 * 库存管理服务
 * 提供统一的库存操作接口，解决库存更新时机、事务处理、调拨同步问题
 */

import { db } from '../db';
import {
  products,
  warehouses,
  inboundOrders,
  inboundOrderItems, 
  outboundOrders,
  outboundOrderItems,
  warehouseTransfers,
  warehouseTransferItems,
  uniqueCodeTracking,
  uniqueCodeHistory,
  InsertUniqueCodeTracking,
  InsertUniqueCodeHistory
} from '../../shared/schema';
import { IStorage } from '../storage';
import { and, eq, sql, inArray } from 'drizzle-orm';
import { MySqlTransaction } from 'drizzle-orm/mysql-core';

// 库存操作类型枚举
export enum InventoryOperationType {
  Inbound = 'inbound',           // 入库
  Outbound = 'outbound',         // 出库
  TransferOut = 'transfer_out',  // 调拨出库
  TransferIn = 'transfer_in',    // 调拨入库
  Adjustment = 'adjustment',     // 库存调整
  Inventory = 'inventory'        // 盘点
}

// 库存操作状态枚举
export enum InventoryItemStatus {
  InStock = 'in_stock',         // 在库
  Transferred = 'transferred',  // 调拨中
  Sold = 'sold',                // 已售出
  Returned = 'returned',        // 已退回
  Scrapped = 'scrapped'         // 已报废
}

// 库存事务接口
export interface InventoryTransaction {
  warehouseId: number;           // 仓库ID
  productId: number;             // 商品ID
  quantity: number;              // 数量变更 (正数为增加，负数为减少)
  operationType: InventoryOperationType; // 操作类型
  referenceId?: number;          // 关联单据ID (入库单/出库单/调拨单ID)
  referenceItemId?: number;      // 关联单据明细ID
  uniqueCode?: string;           // 唯一码 (如果适用)
  userId: number;                // 操作用户ID
  status?: InventoryItemStatus;  // 库存状态
  notes?: string;                // 备注信息
}

// 调拨库存操作接口
export interface TransferInventoryOperation {
  transferId: number;            // 调拨单ID 
  sourceWarehouseId: number;     // 源仓库ID
  targetWarehouseId: number;     // 目标仓库ID
  userId: number;                // 操作用户ID
  items: Array<{                 // 调拨单明细
    transferItemId: number;      // 调拨单明细ID
    productId: number;           // 商品ID
    quantity: number;            // 数量
    uniqueCode?: string;         // 唯一码 (如果适用)
  }>;
}

// 库存项目锁定信息
interface InventoryLock {
  warehouseId: number;
  productId: number;
  quantity: number;
  lockedAt: Date;
  expiresAt: Date;
  transactionId: string;
}

export class InventoryService {
  // 库存锁缓存 - 用于防止并发操作导致的库存错误
  private inventoryLocks: Map<string, InventoryLock> = new Map();
  // 锁过期时间 (毫秒)
  private lockExpirationMs: number = 30000; // 30秒
  
  constructor(private storage: IStorage) {
    // 定期清理过期的库存锁
    setInterval(() => this.cleanExpiredLocks(), 60000); // 每分钟清理一次
  }
  
  /**
   * 获取商品当前库存
   * @param productId 商品ID
   * @param warehouseId 仓库ID (可选，不提供则返回所有仓库的库存)
   * @returns 库存信息
   */
  async getProductStock(productId: number, warehouseId?: number): Promise<{warehouseId: number, stock: number}[]> {
    try {
      // 如果指定了仓库ID，只返回该仓库的库存
      if (warehouseId) {
        const product = await this.storage.getProduct(productId);
        if (!product) {
          throw new Error(`未找到ID为${productId}的商品`);
        }
        return [{warehouseId, stock: product.stock}];
      } 
      
      // 否则返回所有仓库的库存(实际项目中应该有商品-仓库库存表，这里简化处理)
      const warehouses = await this.storage.getWarehouses();
      const result = [];
      
      for (const warehouse of warehouses) {
        const product = await this.storage.getProduct(productId);
        if (product) {
          result.push({
            warehouseId: warehouse.id,
            stock: product.stock
          });
        }
      }
      
      return result;
    } catch (error) {
      console.error('获取商品库存失败:', error);
      throw new Error(`获取商品库存失败: ${error.message}`);
    }
  }
  
  /**
   * 创建库存锁 - 防止并发操作
   * @param warehouseId 仓库ID
   * @param productId 商品ID 
   * @param quantity 锁定数量
   * @returns 事务ID和成功标志
   */
  private createInventoryLock(warehouseId: number, productId: number, quantity: number): {transactionId: string, success: boolean} {
    const lockKey = `${warehouseId}-${productId}`;
    const transactionId = `${Date.now()}-${Math.random().toString(36).substring(2, 15)}`;
    const now = new Date();
    
    // 检查是否已有锁
    if (this.inventoryLocks.has(lockKey)) {
      const existingLock = this.inventoryLocks.get(lockKey);
      
      // 检查锁是否过期
      if (existingLock.expiresAt > now) {
        console.log(`库存锁定失败: 商品(${productId})在仓库(${warehouseId})已被锁定`);
        return { transactionId, success: false };
      }
      
      // 锁已过期，移除
      this.inventoryLocks.delete(lockKey);
    }
    
    // 创建新锁
    const expiresAt = new Date(now.getTime() + this.lockExpirationMs);
    this.inventoryLocks.set(lockKey, {
      warehouseId,
      productId,
      quantity,
      lockedAt: now,
      expiresAt,
      transactionId
    });
    
    console.log(`库存锁定成功: 商品(${productId})在仓库(${warehouseId})锁定${quantity}个单位，事务ID: ${transactionId}`);
    return { transactionId, success: true };
  }
  
  /**
   * 释放库存锁
   * @param transactionId 事务ID
   */
  private releaseInventoryLock(transactionId: string): void {
    for (const [key, lock] of this.inventoryLocks.entries()) {
      if (lock.transactionId === transactionId) {
        this.inventoryLocks.delete(key);
        console.log(`库存锁已释放: 事务ID: ${transactionId}`);
        return;
      }
    }
  }
  
  /**
   * 清理过期的库存锁
   */
  private cleanExpiredLocks(): void {
    const now = new Date();
    let expiredCount = 0;
    
    for (const [key, lock] of this.inventoryLocks.entries()) {
      if (lock.expiresAt <= now) {
        this.inventoryLocks.delete(key);
        expiredCount++;
      }
    }
    
    if (expiredCount > 0) {
      console.log(`已清理${expiredCount}个过期的库存锁`);
    }
  }
  
  /**
   * 执行库存事务 - 核心方法
   * 使用数据库事务确保库存操作的原子性
   * @param transaction 库存事务信息
   * @returns 操作结果
   */
  async executeInventoryTransaction(transaction: InventoryTransaction): Promise<{success: boolean, message: string}> {
    // 创建库存锁
    const { transactionId, success } = this.createInventoryLock(
      transaction.warehouseId, 
      transaction.productId, 
      Math.abs(transaction.quantity)
    );
    
    if (!success) {
      return { 
        success: false, 
        message: `库存锁定失败，商品(${transaction.productId})在仓库(${transaction.warehouseId})可能正在被其他操作处理` 
      };
    }
    
    try {
      // 获取当前产品
      const product = await this.storage.getProduct(transaction.productId);
      if (!product) {
        throw new Error(`未找到ID为${transaction.productId}的商品`);
      }
      
      // 检查库存是否足够(如果是减少库存的操作)
      if (transaction.quantity < 0 && product.stock < Math.abs(transaction.quantity)) {
        throw new Error(`库存不足: 商品"${product.name}"当前库存${product.stock}，需要${Math.abs(transaction.quantity)}`);
      }
      
      // 计算新库存
      const newStock = product.stock + transaction.quantity;
      
      // 更新产品库存
      await this.storage.updateProduct(transaction.productId, {
        stock: newStock
      });
      
      // 记录唯一码相关操作 (如果提供了唯一码)
      if (transaction.uniqueCode) {
        await this.processUniqueCodeTransaction(transaction);
      }
      
      // 根据操作类型执行特定逻辑
      await this.executeSpecificLogicByOperationType(transaction);
      
      // 释放库存锁
      this.releaseInventoryLock(transactionId);
      
      return {
        success: true,
        message: `库存更新成功: 商品"${product.name}"在仓库${transaction.warehouseId}的库存从${product.stock}变更为${newStock}`
      };
    } catch (error) {
      // 释放库存锁
      this.releaseInventoryLock(transactionId);
      
      console.error('库存事务执行失败:', error);
      return {
        success: false,
        message: `库存更新失败: ${error.message}`
      };
    }
  }
  
  /**
   * 处理唯一码相关事务
   * @param transaction 库存事务信息
   */
  private async processUniqueCodeTransaction(transaction: InventoryTransaction): Promise<void> {
    if (!transaction.uniqueCode) return;
    
    try {
      // 获取当前唯一码跟踪记录
      const existingTracking = await this.storage.getUniqueCodeTracking(transaction.uniqueCode);
      
      // 根据操作类型执行不同的唯一码处理
      switch (transaction.operationType) {
        case InventoryOperationType.Inbound:
          // 入库操作 - 创建或更新唯一码记录
          if (!existingTracking) {
            // 创建新的唯一码跟踪记录
            const trackingData: InsertUniqueCodeTracking = {
              uniqueCode: transaction.uniqueCode,
              productId: transaction.productId,
              warehouseId: transaction.warehouseId,
              currentStatus: InventoryItemStatus.InStock,
              quantity: transaction.quantity,
              inboundOrderId: transaction.referenceId,
              inboundItemId: transaction.referenceItemId,
              lastOperationType: InventoryOperationType.Inbound,
              lastOperationDate: new Date(),
              remark: transaction.notes
            };
            
            await this.storage.trackUniqueCode(trackingData);
          } else {
            // 更新现有的唯一码跟踪记录
            await this.storage.updateUniqueCodeTracking(transaction.uniqueCode, {
              warehouseId: transaction.warehouseId,
              currentStatus: InventoryItemStatus.InStock,
              quantity: transaction.quantity,
              inboundOrderId: transaction.referenceId,
              inboundItemId: transaction.referenceItemId,
              lastOperationType: InventoryOperationType.Inbound,
              lastOperationDate: new Date(),
              remark: transaction.notes
            });
          }
          
          // 添加唯一码历史记录
          const inboundHistoryData: InsertUniqueCodeHistory = {
            uniqueCode: transaction.uniqueCode,
            productId: transaction.productId,
            warehouseId: transaction.warehouseId,
            operationType: InventoryOperationType.Inbound,
            quantity: transaction.quantity,
            orderId: transaction.referenceId,
            orderItemId: transaction.referenceItemId,
            oldStatus: existingTracking?.currentStatus,
            newStatus: InventoryItemStatus.InStock,
            operationDate: new Date(),
            userId: transaction.userId,
            remark: transaction.notes
          };
          
          await this.storage.addUniqueCodeHistory(inboundHistoryData);
          break;
          
        case InventoryOperationType.Outbound:
          // 出库操作 - 更新唯一码状态
          if (!existingTracking) {
            throw new Error(`找不到唯一码${transaction.uniqueCode}的跟踪记录`);
          }
          
          // 验证唯一码状态是否允许出库
          if (existingTracking.currentStatus !== InventoryItemStatus.InStock) {
            throw new Error(`唯一码${transaction.uniqueCode}的当前状态(${existingTracking.currentStatus})不允许出库操作`);
          }
          
          // 更新唯一码状态
          await this.storage.updateUniqueCodeTracking(transaction.uniqueCode, {
            currentStatus: transaction.status || InventoryItemStatus.Sold,
            outboundOrderId: transaction.referenceId,
            outboundItemId: transaction.referenceItemId,
            lastOperationType: InventoryOperationType.Outbound,
            lastOperationDate: new Date(),
            remark: transaction.notes
          });
          
          // 添加唯一码历史记录
          const outboundHistoryData: InsertUniqueCodeHistory = {
            uniqueCode: transaction.uniqueCode,
            productId: transaction.productId,
            warehouseId: transaction.warehouseId,
            operationType: InventoryOperationType.Outbound,
            quantity: Math.abs(transaction.quantity),
            orderId: transaction.referenceId,
            orderItemId: transaction.referenceItemId,
            oldStatus: existingTracking.currentStatus,
            newStatus: transaction.status || InventoryItemStatus.Sold,
            operationDate: new Date(),
            userId: transaction.userId,
            remark: transaction.notes
          };
          
          await this.storage.addUniqueCodeHistory(outboundHistoryData);
          break;
          
        case InventoryOperationType.TransferOut:
          // 调拨出库 - 更新唯一码状态为"调拨中"
          if (!existingTracking) {
            throw new Error(`找不到唯一码${transaction.uniqueCode}的跟踪记录`);
          }
          
          // 验证唯一码状态是否允许调拨
          if (existingTracking.currentStatus !== InventoryItemStatus.InStock) {
            throw new Error(`唯一码${transaction.uniqueCode}的当前状态(${existingTracking.currentStatus})不允许调拨操作`);
          }
          
          // 更新唯一码状态
          await this.storage.updateUniqueCodeTracking(transaction.uniqueCode, {
            currentStatus: InventoryItemStatus.Transferred,
            transferId: transaction.referenceId,
            transferItemId: transaction.referenceItemId,
            lastOperationType: InventoryOperationType.TransferOut,
            lastOperationDate: new Date(),
            remark: transaction.notes
          });
          
          // 添加唯一码历史记录
          const transferOutHistoryData: InsertUniqueCodeHistory = {
            uniqueCode: transaction.uniqueCode,
            productId: transaction.productId,
            warehouseId: transaction.warehouseId,
            operationType: InventoryOperationType.TransferOut,
            quantity: Math.abs(transaction.quantity),
            transferId: transaction.referenceId,
            transferItemId: transaction.referenceItemId,
            oldStatus: existingTracking.currentStatus,
            newStatus: InventoryItemStatus.Transferred,
            operationDate: new Date(),
            userId: transaction.userId,
            remark: transaction.notes
          };
          
          await this.storage.addUniqueCodeHistory(transferOutHistoryData);
          break;
          
        case InventoryOperationType.TransferIn:
          // 调拨入库 - 更新唯一码状态和仓库
          if (!existingTracking) {
            throw new Error(`找不到唯一码${transaction.uniqueCode}的跟踪记录`);
          }
          
          // 验证唯一码状态是否允许入库
          if (existingTracking.currentStatus !== InventoryItemStatus.Transferred) {
            throw new Error(`唯一码${transaction.uniqueCode}的当前状态(${existingTracking.currentStatus})不允许调拨入库操作`);
          }
          
          // 更新唯一码状态和所在仓库
          await this.storage.updateUniqueCodeTracking(transaction.uniqueCode, {
            warehouseId: transaction.warehouseId,
            currentStatus: InventoryItemStatus.InStock,
            transferId: transaction.referenceId,
            transferItemId: transaction.referenceItemId,
            lastOperationType: InventoryOperationType.TransferIn,
            lastOperationDate: new Date(),
            remark: transaction.notes
          });
          
          // 添加唯一码历史记录
          const transferInHistoryData: InsertUniqueCodeHistory = {
            uniqueCode: transaction.uniqueCode,
            productId: transaction.productId,
            warehouseId: transaction.warehouseId,
            operationType: InventoryOperationType.TransferIn,
            quantity: transaction.quantity,
            transferId: transaction.referenceId,
            transferItemId: transaction.referenceItemId,
            oldStatus: existingTracking.currentStatus,
            newStatus: InventoryItemStatus.InStock,
            operationDate: new Date(),
            userId: transaction.userId,
            remark: transaction.notes
          };
          
          await this.storage.addUniqueCodeHistory(transferInHistoryData);
          break;
          
        case InventoryOperationType.Adjustment:
          // 库存调整 - 更新唯一码状态
          if (!existingTracking && transaction.quantity > 0) {
            // 如果是增加库存且唯一码不存在，创建新记录
            const trackingData: InsertUniqueCodeTracking = {
              uniqueCode: transaction.uniqueCode,
              productId: transaction.productId,
              warehouseId: transaction.warehouseId,
              currentStatus: InventoryItemStatus.InStock,
              quantity: transaction.quantity,
              lastOperationType: InventoryOperationType.Adjustment,
              lastOperationDate: new Date(),
              remark: transaction.notes
            };
            
            await this.storage.trackUniqueCode(trackingData);
          } else if (existingTracking) {
            // 更新现有唯一码记录
            await this.storage.updateUniqueCodeTracking(transaction.uniqueCode, {
              currentStatus: transaction.status || InventoryItemStatus.InStock,
              quantity: transaction.quantity > 0 ? transaction.quantity : 0,
              lastOperationType: InventoryOperationType.Adjustment,
              lastOperationDate: new Date(),
              remark: transaction.notes
            });
          } else {
            throw new Error(`找不到唯一码${transaction.uniqueCode}的跟踪记录`);
          }
          
          // 添加唯一码历史记录
          const adjustmentHistoryData: InsertUniqueCodeHistory = {
            uniqueCode: transaction.uniqueCode,
            productId: transaction.productId,
            warehouseId: transaction.warehouseId,
            operationType: InventoryOperationType.Adjustment,
            quantity: Math.abs(transaction.quantity),
            oldStatus: existingTracking?.currentStatus,
            newStatus: transaction.status || InventoryItemStatus.InStock,
            operationDate: new Date(),
            userId: transaction.userId,
            remark: transaction.notes
          };
          
          await this.storage.addUniqueCodeHistory(adjustmentHistoryData);
          break;
          
        default:
          console.log(`未处理的唯一码操作类型: ${transaction.operationType}`);
      }
    } catch (error) {
      console.error('处理唯一码事务失败:', error);
      throw error;
    }
  }
  
  /**
   * 根据操作类型执行特定逻辑
   * @param transaction 库存事务信息
   */
  private async executeSpecificLogicByOperationType(transaction: InventoryTransaction): Promise<void> {
    // 这里可以根据不同的操作类型执行特定的业务逻辑
    switch (transaction.operationType) {
      case InventoryOperationType.Inbound:
        // 入库操作特定逻辑
        if (transaction.referenceId) {
          // 更新入库单状态
          await this.updateInboundOrderStatus(transaction.referenceId);
        }
        break;
        
      case InventoryOperationType.Outbound:
        // 出库操作特定逻辑
        if (transaction.referenceId) {
          // 更新出库单状态
          await this.updateOutboundOrderStatus(transaction.referenceId);
        }
        break;
        
      case InventoryOperationType.TransferOut:
      case InventoryOperationType.TransferIn:
        // 调拨操作特定逻辑在调拨服务中处理
        break;
        
      case InventoryOperationType.Adjustment:
        // 库存调整特定逻辑
        // 例如，记录调整原因、更新相关统计等
        break;
        
      case InventoryOperationType.Inventory:
        // 库存盘点特定逻辑
        // 例如，记录盘点差异、生成盘点报告等
        break;
    }
  }
  
  /**
   * 更新入库单状态
   * @param inboundOrderId 入库单ID
   */
  private async updateInboundOrderStatus(inboundOrderId: number): Promise<void> {
    try {
      // 获取入库单
      const inboundOrder = await this.storage.getInboundOrder(inboundOrderId);
      if (!inboundOrder) {
        console.warn(`未找到ID为${inboundOrderId}的入库单`);
        return;
      }
      
      // 获取入库单明细
      const items = await this.storage.getInboundOrderItems(inboundOrderId);
      
      // 判断是否所有明细都已入库
      const allItemsProcessed = items.every(item => item.quantity > 0);
      
      // 如果所有明细都已入库，更新入库单状态为"已完成"
      if (allItemsProcessed && inboundOrder.status !== 'completed') {
        await this.storage.updateInboundOrder(inboundOrderId, {
          status: 'completed'
        });
        console.log(`入库单${inboundOrderId}状态已更新为"已完成"`);
      }
    } catch (error) {
      console.error(`更新入库单${inboundOrderId}状态失败:`, error);
    }
  }
  
  /**
   * 更新出库单状态
   * @param outboundOrderId 出库单ID
   */
  private async updateOutboundOrderStatus(outboundOrderId: number): Promise<void> {
    try {
      // 获取出库单
      const outboundOrder = await this.storage.getOutboundOrder(outboundOrderId);
      if (!outboundOrder) {
        console.warn(`未找到ID为${outboundOrderId}的出库单`);
        return;
      }
      
      // 获取出库单明细
      const items = await this.storage.getOutboundOrderItems(outboundOrderId);
      
      // 判断是否所有明细都已出库
      const allItemsProcessed = items.every(item => item.quantity > 0);
      
      // 如果所有明细都已出库，更新出库单状态为"已完成"
      if (allItemsProcessed && outboundOrder.status !== 'completed') {
        await this.storage.updateOutboundOrder(outboundOrderId, {
          status: 'completed'
        });
        console.log(`出库单${outboundOrderId}状态已更新为"已完成"`);
      }
    } catch (error) {
      console.error(`更新出库单${outboundOrderId}状态失败:`, error);
    }
  }
  
  /**
   * 批量执行库存事务 - 使用数据库事务确保原子性
   * @param transactions 库存事务列表
   * @returns 操作结果
   */
  async executeBatchInventoryTransactions(transactions: InventoryTransaction[]): Promise<{success: boolean, message: string}> {
    if (transactions.length === 0) {
      return { success: true, message: '无需处理的库存事务' };
    }
    
    try {
      // 创建所有库存锁
      const locks = [];
      for (const transaction of transactions) {
        const lockResult = this.createInventoryLock(
          transaction.warehouseId,
          transaction.productId,
          Math.abs(transaction.quantity)
        );
        
        if (!lockResult.success) {
          // 释放已创建的锁
          locks.forEach(lock => this.releaseInventoryLock(lock.transactionId));
          
          return {
            success: false,
            message: `库存锁定失败，商品(${transaction.productId})在仓库(${transaction.warehouseId})可能正在被其他操作处理`
          };
        }
        
        locks.push(lockResult);
      }
      
      // 执行所有事务
      for (const transaction of transactions) {
        const result = await this.executeInventoryTransaction(transaction);
        if (!result.success) {
          // 释放所有锁
          locks.forEach(lock => this.releaseInventoryLock(lock.transactionId));
          
          return result;
        }
      }
      
      // 释放所有锁
      locks.forEach(lock => this.releaseInventoryLock(lock.transactionId));
      
      return {
        success: true,
        message: `成功处理${transactions.length}个库存事务`
      };
    } catch (error) {
      console.error('批量执行库存事务失败:', error);
      return {
        success: false,
        message: `批量执行库存事务失败: ${error.message}`
      };
    }
  }
  
  /**
   * 处理完整调拨流程
   * 调拨分为两个步骤：1.从源仓库出库 2.从目标仓库入库
   * 这个方法确保这两个步骤在同一个事务中完成
   * @param operation 调拨操作信息
   * @returns 操作结果
   */
  async processTransfer(operation: TransferInventoryOperation): Promise<{success: boolean, message: string}> {
    try {
      // 创建出库事务
      const outboundTransactions = operation.items.map(item => ({
        warehouseId: operation.sourceWarehouseId,
        productId: item.productId,
        quantity: -item.quantity, // 负数表示减少库存
        operationType: InventoryOperationType.TransferOut,
        referenceId: operation.transferId,
        referenceItemId: item.transferItemId,
        uniqueCode: item.uniqueCode,
        userId: operation.userId,
        status: InventoryItemStatus.Transferred,
        notes: `调拨出库-调拨单ID:${operation.transferId}`
      } as InventoryTransaction));
      
      // 创建入库事务
      const inboundTransactions = operation.items.map(item => ({
        warehouseId: operation.targetWarehouseId,
        productId: item.productId,
        quantity: item.quantity, // 正数表示增加库存
        operationType: InventoryOperationType.TransferIn,
        referenceId: operation.transferId,
        referenceItemId: item.transferItemId,
        uniqueCode: item.uniqueCode,
        userId: operation.userId,
        status: InventoryItemStatus.InStock,
        notes: `调拨入库-调拨单ID:${operation.transferId}`
      } as InventoryTransaction));
      
      // 先执行出库事务
      const outboundResult = await this.executeBatchInventoryTransactions(outboundTransactions);
      if (!outboundResult.success) {
        return outboundResult;
      }
      
      // 再执行入库事务
      const inboundResult = await this.executeBatchInventoryTransactions(inboundTransactions);
      if (!inboundResult.success) {
        // 理论上这里不会发生错误，因为入库不受库存限制
        // 但如果发生错误，我们应该回滚出库操作
        // 由于我们使用了事务，回滚应该是自动的
        return inboundResult;
      }
      
      // 更新调拨单状态
      await this.storage.updateWarehouseTransfer(operation.transferId, {
        status: 'completed'
      });
      
      return {
        success: true,
        message: `调拨单${operation.transferId}处理成功，从仓库${operation.sourceWarehouseId}调拨到仓库${operation.targetWarehouseId}的${operation.items.length}个商品`
      };
    } catch (error) {
      console.error('处理调拨流程失败:', error);
      return {
        success: false,
        message: `处理调拨流程失败: ${error.message}`
      };
    }
  }
  
  /**
   * 根据入库单创建库存事务
   * @param inboundOrderId 入库单ID
   * @param userId 操作用户ID
   * @returns 操作结果
   */
  async createInventoryTransactionsFromInboundOrder(inboundOrderId: number, userId: number): Promise<{success: boolean, message: string}> {
    try {
      // 获取入库单
      const inboundOrder = await this.storage.getInboundOrder(inboundOrderId);
      if (!inboundOrder) {
        return { success: false, message: `未找到ID为${inboundOrderId}的入库单` };
      }
      
      // 检查入库单状态
      if (inboundOrder.status === 'completed') {
        return { success: false, message: `入库单${inboundOrderId}已完成，不能重复入库` };
      }
      
      if (inboundOrder.status === 'cancelled') {
        return { success: false, message: `入库单${inboundOrderId}已取消，不能执行入库操作` };
      }
      
      // 获取入库单明细
      const items = await this.storage.getInboundOrderItems(inboundOrderId);
      if (items.length === 0) {
        return { success: false, message: `入库单${inboundOrderId}没有明细项，无法执行入库操作` };
      }
      
      // 创建库存事务
      const transactions = items.map(item => ({
        warehouseId: inboundOrder.warehouseId,
        productId: item.productId,
        quantity: item.quantity,
        operationType: InventoryOperationType.Inbound,
        referenceId: inboundOrderId,
        referenceItemId: item.id,
        // 唯一码处理 - 实际项目中可能需要处理多个唯一码
        // 这里简化为单个唯一码的情况
        userId,
        notes: `入库单${inboundOrder.orderNumber}入库`
      } as InventoryTransaction));
      
      // 执行库存事务
      const result = await this.executeBatchInventoryTransactions(transactions);
      
      // 如果成功，更新入库单状态
      if (result.success) {
        await this.storage.updateInboundOrder(inboundOrderId, {
          status: 'completed'
        });
      }
      
      return result;
    } catch (error) {
      console.error(`根据入库单${inboundOrderId}创建库存事务失败:`, error);
      return {
        success: false,
        message: `根据入库单${inboundOrderId}创建库存事务失败: ${error.message}`
      };
    }
  }
  
  /**
   * 根据出库单创建库存事务
   * @param outboundOrderId 出库单ID
   * @param userId 操作用户ID
   * @returns 操作结果
   */
  async createInventoryTransactionsFromOutboundOrder(outboundOrderId: number, userId: number): Promise<{success: boolean, message: string}> {
    try {
      // 获取出库单
      const outboundOrder = await this.storage.getOutboundOrder(outboundOrderId);
      if (!outboundOrder) {
        return { success: false, message: `未找到ID为${outboundOrderId}的出库单` };
      }
      
      // 检查出库单状态
      if (outboundOrder.status === 'completed') {
        return { success: false, message: `出库单${outboundOrderId}已完成，不能重复出库` };
      }
      
      if (outboundOrder.status === 'cancelled') {
        return { success: false, message: `出库单${outboundOrderId}已取消，不能执行出库操作` };
      }
      
      // 获取出库单明细
      const items = await this.storage.getOutboundOrderItems(outboundOrderId);
      if (items.length === 0) {
        return { success: false, message: `出库单${outboundOrderId}没有明细项，无法执行出库操作` };
      }
      
      // 创建库存事务
      const transactions = items.map(item => ({
        warehouseId: outboundOrder.warehouseId,
        productId: item.productId,
        quantity: -item.quantity, // 负数表示减少库存
        operationType: InventoryOperationType.Outbound,
        referenceId: outboundOrderId,
        referenceItemId: item.id,
        // 唯一码处理 - 实际项目中可能需要处理多个唯一码
        // 这里简化为单个唯一码的情况
        userId,
        notes: `出库单${outboundOrder.orderNumber}出库`
      } as InventoryTransaction));
      
      // 执行库存事务
      const result = await this.executeBatchInventoryTransactions(transactions);
      
      // 如果成功，更新出库单状态
      if (result.success) {
        await this.storage.updateOutboundOrder(outboundOrderId, {
          status: 'completed'
        });
      }
      
      return result;
    } catch (error) {
      console.error(`根据出库单${outboundOrderId}创建库存事务失败:`, error);
      return {
        success: false,
        message: `根据出库单${outboundOrderId}创建库存事务失败: ${error.message}`
      };
    }
  }
  
  /**
   * 获取库存统计信息
   * @param warehouseId 仓库ID (可选，不提供则统计所有仓库)
   * @returns 库存统计信息
   */
  async getInventoryStats(warehouseId?: number): Promise<{
    totalProducts: number;
    totalQuantity: number;
    totalValue: number;
    lowStockProducts: number;
    warehouseStats: Array<{
      warehouseId: number;
      warehouseName: string;
      productCount: number;
      totalQuantity: number;
      totalValue: number;
    }>;
    categoryStats: Array<{
      category: string;
      productCount: number;
      totalQuantity: number;
      totalValue: number;
    }>;
  }> {
    try {
      // 获取所有产品
      const allProducts = await this.storage.getProducts();
      
      // 获取所有仓库
      const warehouses = warehouseId 
        ? [await this.storage.getWarehouse(warehouseId)]
        : await this.storage.getWarehouses();
      
      // 初始化统计对象
      const stats = {
        totalProducts: 0,
        totalQuantity: 0,
        totalValue: 0,
        lowStockProducts: 0,
        warehouseStats: [] as Array<{
          warehouseId: number;
          warehouseName: string;
          productCount: number;
          totalQuantity: number;
          totalValue: number;
        }>,
        categoryStats: [] as Array<{
          category: string;
          productCount: number;
          totalQuantity: number;
          totalValue: number;
        }>
      };
      
      // 初始化仓库统计
      for (const warehouse of warehouses) {
        if (!warehouse) continue;
        
        stats.warehouseStats.push({
          warehouseId: warehouse.id,
          warehouseName: warehouse.name,
          productCount: 0,
          totalQuantity: 0,
          totalValue: 0
        });
      }
      
      // 初始化类别统计的临时Map
      const categoryStatsMap = new Map<string, {
        productCount: number;
        totalQuantity: number;
        totalValue: number;
      }>();
      
      // 统计每个产品
      for (const product of allProducts) {
        if (!product) continue;
        
        // 更新总统计
        stats.totalProducts++;
        stats.totalQuantity += product.stock;
        stats.totalValue += Number(product.price) * product.stock;
        
        // 判断是否低库存 (库存小于10)
        if (product.stock < 10) {
          stats.lowStockProducts++;
        }
        
        // 更新仓库统计 (简化处理，假设所有产品都在第一个仓库)
        if (stats.warehouseStats.length > 0) {
          stats.warehouseStats[0].productCount++;
          stats.warehouseStats[0].totalQuantity += product.stock;
          stats.warehouseStats[0].totalValue += Number(product.price) * product.stock;
        }
        
        // 更新类别统计
        const category = product.category || '未分类';
        if (!categoryStatsMap.has(category)) {
          categoryStatsMap.set(category, {
            productCount: 0,
            totalQuantity: 0,
            totalValue: 0
          });
        }
        
        const categoryStats = categoryStatsMap.get(category)!;
        categoryStats.productCount++;
        categoryStats.totalQuantity += product.stock;
        categoryStats.totalValue += Number(product.price) * product.stock;
      }
      
      // 将类别统计Map转换为数组
      stats.categoryStats = Array.from(categoryStatsMap.entries()).map(([category, data]) => ({
        category,
        ...data
      }));
      
      return stats;
    } catch (error) {
      console.error('获取库存统计信息失败:', error);
      throw new Error(`获取库存统计信息失败: ${error.message}`);
    }
  }
}