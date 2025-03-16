/**
 * 唯一码跟踪服务
 * 用于管理所有唯一码的生命周期和流转
 */

import { db } from '../db';
import {
  uniqueCodeTracking,
  uniqueCodeHistory,
  InsertUniqueCodeTracking,
  InsertUniqueCodeHistory,
} from '../../shared/schema';
import { IStorage } from '../storage';
import { eq, and, desc } from 'drizzle-orm';
import { InventoryItemStatus, InventoryOperationType } from './inventory.service';

export class UniqueCodeTrackingService {
  constructor(private storage: IStorage) {}
  
  /**
   * 注册新的唯一码（入库）
   * @param uniqueCode 唯一码
   * @param productId 产品ID
   * @param warehouseId 仓库ID
   * @param inboundOrderId 入库单ID
   * @param inboundItemId 入库单明细ID
   * @param userId 操作用户ID
   */
  async registerNewUniqueCode(
    uniqueCode: string, 
    productId: number, 
    warehouseId: number, 
    inboundOrderId: number, 
    inboundItemId: number, 
    userId: number
  ): Promise<any> {
    try {
      // 检查唯一码是否已存在
      const existing = await this.storage.getUniqueCodeTracking(uniqueCode);
      if (existing) {
        throw new Error(`唯一码 ${uniqueCode} 已存在`);
      }
      
      // 检查产品是否存在
      const product = await this.storage.getProduct(productId);
      if (!product) {
        throw new Error(`未找到ID为${productId}的产品`);
      }
      
      // 检查仓库是否存在
      const warehouse = await this.storage.getWarehouse(warehouseId);
      if (!warehouse) {
        throw new Error(`未找到ID为${warehouseId}的仓库`);
      }
      
      // 创建唯一码跟踪记录
      const trackingData: InsertUniqueCodeTracking = {
        uniqueCode,
        productId,
        warehouseId,
        currentStatus: InventoryItemStatus.InStock,
        quantity: 1, // 唯一码对应的数量一般为1
        inboundOrderId,
        inboundItemId,
        lastOperationType: InventoryOperationType.Inbound,
        lastOperationDate: new Date(),
        remark: `产品首次入库 - 入库单号:${inboundOrderId}`
      };
      
      const tracking = await this.storage.trackUniqueCode(trackingData);
      
      // 记录唯一码历史
      const historyData: InsertUniqueCodeHistory = {
        uniqueCode,
        productId,
        warehouseId,
        operationType: InventoryOperationType.Inbound,
        quantity: 1,
        orderId: inboundOrderId,
        orderItemId: inboundItemId,
        newStatus: InventoryItemStatus.InStock,
        operationDate: new Date(),
        userId,
        remark: `产品首次入库 - 入库单号:${inboundOrderId}`
      };
      
      await this.storage.addUniqueCodeHistory(historyData);
      
      return tracking;
    } catch (error) {
      console.error('注册唯一码失败:', error);
      throw error;
    }
  }
  
  /**
   * 处理唯一码出库
   * @param uniqueCode 唯一码
   * @param outboundOrderId 出库单ID
   * @param outboundItemId 出库单明细ID
   * @param userId 操作用户ID
   */
  async processUniqueCodeOutbound(
    uniqueCode: string,
    outboundOrderId: number,
    outboundItemId: number,
    userId: number
  ): Promise<any> {
    try {
      // 检查唯一码是否存在
      const tracking = await this.storage.getUniqueCodeTracking(uniqueCode);
      if (!tracking) {
        throw new Error(`未找到唯一码 ${uniqueCode} 的跟踪记录`);
      }
      
      // 检查唯一码状态是否允许出库
      if (tracking.currentStatus !== InventoryItemStatus.InStock) {
        throw new Error(`唯一码 ${uniqueCode} 当前状态为 ${tracking.currentStatus}，不允许出库操作`);
      }
      
      // 更新唯一码状态
      await this.storage.updateUniqueCodeTracking(uniqueCode, {
        currentStatus: InventoryItemStatus.Sold,
        outboundOrderId,
        outboundItemId,
        lastOperationType: InventoryOperationType.Outbound,
        lastOperationDate: new Date(),
        remark: `产品出库 - 出库单号:${outboundOrderId}`
      });
      
      // 记录唯一码历史
      const historyData: InsertUniqueCodeHistory = {
        uniqueCode,
        productId: tracking.productId,
        warehouseId: tracking.warehouseId,
        operationType: InventoryOperationType.Outbound,
        quantity: 1,
        orderId: outboundOrderId,
        orderItemId: outboundItemId,
        oldStatus: tracking.currentStatus,
        newStatus: InventoryItemStatus.Sold,
        operationDate: new Date(),
        userId,
        remark: `产品出库 - 出库单号:${outboundOrderId}`
      };
      
      await this.storage.addUniqueCodeHistory(historyData);
      
      return await this.storage.getUniqueCodeTracking(uniqueCode);
    } catch (error) {
      console.error('处理唯一码出库失败:', error);
      throw error;
    }
  }
  
  /**
   * 处理唯一码调拨
   * @param uniqueCode 唯一码
   * @param sourceWarehouseId 源仓库ID
   * @param targetWarehouseId 目标仓库ID
   * @param transferId 调拨单ID
   * @param transferItemId 调拨单明细ID
   * @param userId 操作用户ID
   */
  async processUniqueCodeTransfer(
    uniqueCode: string,
    sourceWarehouseId: number,
    targetWarehouseId: number,
    transferId: number,
    transferItemId: number,
    userId: number
  ): Promise<any> {
    try {
      // 检查唯一码是否存在
      const tracking = await this.storage.getUniqueCodeTracking(uniqueCode);
      if (!tracking) {
        throw new Error(`未找到唯一码 ${uniqueCode} 的跟踪记录`);
      }
      
      // 检查唯一码状态是否允许调拨
      if (tracking.currentStatus !== InventoryItemStatus.InStock) {
        throw new Error(`唯一码 ${uniqueCode} 当前状态为 ${tracking.currentStatus}，不允许调拨操作`);
      }
      
      // 检查唯一码是否在源仓库
      if (tracking.warehouseId !== sourceWarehouseId) {
        throw new Error(`唯一码 ${uniqueCode} 不在源仓库(ID:${sourceWarehouseId})中，当前所在仓库ID:${tracking.warehouseId}`);
      }
      
      // 执行两步调拨操作：1.从源仓库出库 2.进入目标仓库
      
      // 1. 更新为"调拨中"状态
      await this.storage.updateUniqueCodeTracking(uniqueCode, {
        currentStatus: InventoryItemStatus.Transferred,
        transferId,
        transferItemId,
        lastOperationType: InventoryOperationType.TransferOut,
        lastOperationDate: new Date(),
        remark: `产品调拨出库 - 调拨单号:${transferId}`
      });
      
      // 记录唯一码出库历史
      const outHistoryData: InsertUniqueCodeHistory = {
        uniqueCode,
        productId: tracking.productId,
        warehouseId: sourceWarehouseId,
        operationType: InventoryOperationType.TransferOut,
        quantity: 1,
        transferId,
        transferItemId,
        oldStatus: tracking.currentStatus,
        newStatus: InventoryItemStatus.Transferred,
        operationDate: new Date(),
        userId,
        remark: `产品调拨出库 - 调拨单号:${transferId}`
      };
      
      await this.storage.addUniqueCodeHistory(outHistoryData);
      
      // 2. 更新为"入库"状态并更改仓库
      await this.storage.updateUniqueCodeTracking(uniqueCode, {
        warehouseId: targetWarehouseId,
        currentStatus: InventoryItemStatus.InStock,
        lastOperationType: InventoryOperationType.TransferIn,
        lastOperationDate: new Date(),
        remark: `产品调拨入库 - 调拨单号:${transferId}`
      });
      
      // 记录唯一码入库历史
      const inHistoryData: InsertUniqueCodeHistory = {
        uniqueCode,
        productId: tracking.productId,
        warehouseId: targetWarehouseId,
        operationType: InventoryOperationType.TransferIn,
        quantity: 1,
        transferId,
        transferItemId,
        oldStatus: InventoryItemStatus.Transferred,
        newStatus: InventoryItemStatus.InStock,
        operationDate: new Date(),
        userId,
        remark: `产品调拨入库 - 调拨单号:${transferId}`
      };
      
      await this.storage.addUniqueCodeHistory(inHistoryData);
      
      return await this.storage.getUniqueCodeTracking(uniqueCode);
    } catch (error) {
      console.error('处理唯一码调拨失败:', error);
      throw error;
    }
  }
  
  /**
   * 验证唯一码是否可用
   * @param uniqueCode 唯一码
   * @param warehouseId 仓库ID（可选，如提供则验证是否在指定仓库）
   */
  async verifyUniqueCodeAvailability(uniqueCode: string, warehouseId?: number): Promise<boolean> {
    try {
      // 检查唯一码是否存在
      const tracking = await this.storage.getUniqueCodeTracking(uniqueCode);
      if (!tracking) {
        // 唯一码不存在
        return false;
      }
      
      // 检查唯一码状态是否为"在库"
      if (tracking.currentStatus !== InventoryItemStatus.InStock) {
        // 唯一码不在库
        return false;
      }
      
      // 如果指定了仓库ID，检查唯一码是否在该仓库
      if (warehouseId !== undefined && tracking.warehouseId !== warehouseId) {
        // 唯一码不在指定仓库
        return false;
      }
      
      return true;
    } catch (error) {
      console.error('验证唯一码可用性失败:', error);
      return false;
    }
  }
  
  /**
   * 获取唯一码历史
   * @param uniqueCode 唯一码
   */
  async getUniqueCodeHistory(uniqueCode: string): Promise<any[]> {
    try {
      return await this.storage.getUniqueCodeHistory(uniqueCode);
    } catch (error) {
      console.error('获取唯一码历史失败:', error);
      return [];
    }
  }
  
  /**
   * 获取仓库中的唯一码跟踪记录
   * @param warehouseId 仓库ID
   */
  async getWarehouseUniqueCodeTracking(warehouseId: number): Promise<any[]> {
    try {
      return await this.storage.getUniqueCodeTrackingByWarehouse(warehouseId);
    } catch (error) {
      console.error(`获取仓库(ID:${warehouseId})唯一码跟踪记录失败:`, error);
      return [];
    }
  }
  
  /**
   * 获取产品的唯一码跟踪记录
   * @param productId 产品ID
   */
  async getProductUniqueCodeTracking(productId: number): Promise<any[]> {
    try {
      return await this.storage.getUniqueCodeTrackingByProduct(productId);
    } catch (error) {
      console.error(`获取产品(ID:${productId})唯一码跟踪记录失败:`, error);
      return [];
    }
  }
  
  /**
   * 生成唯一码跟踪报告
   * @param filter 过滤条件
   */
  async generateUniqueCodeReport(filter?: { 
    productId?: number, 
    warehouseId?: number, 
    status?: string,
    startDate?: Date, 
    endDate?: Date 
  }): Promise<any[]> {
    try {
      return await this.storage.generateUniqueCodeReport(filter);
    } catch (error) {
      console.error('生成唯一码跟踪报告失败:', error);
      return [];
    }
  }
}