/**
 * 库存盘点服务
 * 提供库存盘点相关功能，用于定期核对实际库存与系统记录，解决库存统计不准确问题
 */

import { db } from '../db';
import {
  products,
  warehouses,
  users,
} from '../../shared/schema';
import { IStorage } from '../storage';
import { and, eq, sql } from 'drizzle-orm';
import { InventoryOperationType, InventoryService, InventoryTransaction } from './inventory.service';

// 库存盘点状态枚举
export enum InventoryCountStatus {
  Draft = 'draft',           // 草稿
  InProgress = 'in_progress', // 进行中
  Completed = 'completed',   // 已完成
  Cancelled = 'cancelled'    // 已取消
}

// 库存盘点明细状态枚举
export enum InventoryCountItemStatus {
  Pending = 'pending',       // 待盘点
  Counted = 'counted',       // 已盘点
  Adjusted = 'adjusted'      // 已调整
}

// 库存盘点单信息
export interface InventoryCount {
  id: number;                 // 盘点单ID
  countNumber: string;        // 盘点单编号
  warehouseId: number;        // 仓库ID
  status: InventoryCountStatus; // 状态
  startDate: Date;            // 开始日期
  endDate?: Date;             // 结束日期
  createdBy: number;          // 创建人ID
  completedBy?: number;       // 完成人ID
  notes?: string;             // 备注
  createdAt: Date;            // 创建时间
  updatedAt: Date;            // 更新时间
  
  // 关联信息
  warehouse?: {
    id: number;
    name: string;
    location: string;
  };
  creator?: {
    id: number;
    username: string;
    fullName?: string;
  };
  completer?: {
    id: number;
    username: string;
    fullName?: string;
  };
  items?: InventoryCountItem[]; // 盘点明细
}

// 库存盘点明细信息
export interface InventoryCountItem {
  id: number;                 // 盘点明细ID
  inventoryCountId: number;   // 盘点单ID
  productId: number;          // 商品ID
  expectedQuantity: number;   // 系统预期数量
  actualQuantity?: number;    // 实际盘点数量
  difference?: number;        // 差异数量
  status: InventoryCountItemStatus; // 状态
  countedBy?: number;         // 盘点人ID
  countedAt?: Date;           // 盘点时间
  notes?: string;             // 备注
  
  // 关联信息
  product?: {
    id: number;
    name: string;
    barcode: string;
    category: string;
  };
  counter?: {
    id: number;
    username: string;
    fullName?: string;
  };
}

// 创建库存盘点单信息
export interface CreateInventoryCount {
  warehouseId: number;        // 仓库ID
  productIds?: number[];      // 商品ID列表 (可选，不提供则盘点所有商品)
  categoryIds?: string[];     // 类别ID列表 (可选，不提供则盘点所有类别)
  notes?: string;             // 备注
  createdBy: number;          // 创建人ID
}

// 更新盘点明细信息
export interface UpdateInventoryCountItem {
  actualQuantity: number;     // 实际盘点数量
  notes?: string;             // 备注
  countedBy: number;          // 盘点人ID
}

export class InventoryCountService {
  private inventoryService: InventoryService;
  private countNumberPrefix = 'IC';  // 盘点单编号前缀
  
  constructor(private storage: IStorage) {
    this.inventoryService = new InventoryService(storage);
  }
  
  /**
   * 创建库存盘点单
   * @param data 盘点单创建信息
   * @returns 创建的盘点单
   */
  async createInventoryCount(data: CreateInventoryCount): Promise<InventoryCount> {
    try {
      // 验证仓库是否存在
      const warehouse = await this.storage.getWarehouse(data.warehouseId);
      if (!warehouse) {
        throw new Error(`未找到ID为${data.warehouseId}的仓库`);
      }
      
      // 生成盘点单编号 格式: IC-仓库代码-日期-序号
      const countNumber = await this.generateCountNumber(data.warehouseId);
      
      // 创建盘点单
      const countData = {
        countNumber,
        warehouseId: data.warehouseId,
        status: InventoryCountStatus.Draft,
        startDate: new Date(),
        createdBy: data.createdBy,
        notes: data.notes,
        createdAt: new Date(),
        updatedAt: new Date()
      };
      
      // 使用SQL语句插入盘点单，获取插入的ID
      // 注意：由于当前没有实际的inventory_counts表，所以这里是伪代码
      // const [result] = await db.execute(
      //   `INSERT INTO inventory_counts 
      //    (count_number, warehouse_id, status, start_date, created_by, notes, created_at, updated_at)
      //    VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      //   [
      //     countData.countNumber,
      //     countData.warehouseId,
      //     countData.status,
      //     countData.startDate,
      //     countData.createdBy,
      //     countData.notes,
      //     countData.createdAt,
      //     countData.updatedAt
      //   ]
      // );
      
      // 假设ID为1
      const inventoryCountId = 1;
      
      // 获取要盘点的商品列表
      let productsToCount = [];
      
      if (data.productIds && data.productIds.length > 0) {
        // 如果指定了商品ID，只盘点这些商品
        productsToCount = await this.getProductsByIds(data.productIds);
      } else if (data.categoryIds && data.categoryIds.length > 0) {
        // 如果指定了类别，盘点这些类别的商品
        productsToCount = await this.getProductsByCategories(data.categoryIds);
      } else {
        // 否则盘点所有商品
        productsToCount = await this.storage.getProducts();
      }
      
      // 创建盘点明细
      for (const product of productsToCount) {
        if (!product) continue;
        
        const itemData = {
          inventoryCountId,
          productId: product.id,
          expectedQuantity: product.stock,
          status: InventoryCountItemStatus.Pending,
        };
        
        // 使用SQL语句插入盘点明细
        // 注意：由于当前没有实际的inventory_count_items表，所以这里是伪代码
        // await db.execute(
        //   `INSERT INTO inventory_count_items 
        //    (inventory_count_id, product_id, expected_quantity, status)
        //    VALUES (?, ?, ?, ?)`,
        //   [
        //     itemData.inventoryCountId,
        //     itemData.productId,
        //     itemData.expectedQuantity,
        //     itemData.status
        //   ]
        // );
      }
      
      // 返回创建的盘点单信息
      return {
        id: inventoryCountId,
        ...countData,
        warehouse: {
          id: warehouse.id,
          name: warehouse.name,
          location: warehouse.location
        },
        items: []
      };
    } catch (error) {
      console.error('创建库存盘点单失败:', error);
      throw new Error(`创建库存盘点单失败: ${error.message}`);
    }
  }
  
  /**
   * 获取指定ID的商品列表
   * @param productIds 商品ID列表
   * @returns 商品列表
   */
  private async getProductsByIds(productIds: number[]): Promise<any[]> {
    try {
      const productsArray = [];
      
      for (const id of productIds) {
        const product = await this.storage.getProduct(id);
        if (product) {
          productsArray.push(product);
        }
      }
      
      return productsArray;
    } catch (error) {
      console.error('获取指定ID的商品列表失败:', error);
      throw new Error(`获取指定ID的商品列表失败: ${error.message}`);
    }
  }
  
  /**
   * 获取指定类别的商品列表
   * @param categories 类别列表
   * @returns 商品列表
   */
  private async getProductsByCategories(categories: string[]): Promise<any[]> {
    try {
      const allProducts = await this.storage.getProducts();
      return allProducts.filter(product => product && categories.includes(product.category));
    } catch (error) {
      console.error('获取指定类别的商品列表失败:', error);
      throw new Error(`获取指定类别的商品列表失败: ${error.message}`);
    }
  }
  
  /**
   * 生成盘点单编号
   * 格式: IC-仓库代码-日期-序号
   * @param warehouseId 仓库ID
   * @returns 盘点单编号
   */
  private async generateCountNumber(warehouseId: number): Promise<string> {
    try {
      // 获取仓库信息，提取代码
      const warehouse = await this.storage.getWarehouse(warehouseId);
      
      let warehouseCode = 'WH'; // 默认仓库代码
      
      if (warehouse) {
        // 从仓库名称提取首字母或特定代码
        if (warehouse.name.includes('Shanghai')) {
          warehouseCode = 'SH';
        } else if (warehouse.name.includes('Beijing')) {
          warehouseCode = 'BJ';
        } else if (warehouse.name.includes('Guangzhou')) {
          warehouseCode = 'GZ';
        } else if (warehouse.name.includes('Shenzhen')) {
          warehouseCode = 'SZ';
        } else {
          // 从仓库名称提取前两个字符作为代码
          warehouseCode = warehouse.name.substring(0, 2).toUpperCase();
        }
      }
      
      // 获取当前日期，格式为YYYYMMDD
      const now = new Date();
      const dateStr = now.getFullYear() +
                     String(now.getMonth() + 1).padStart(2, '0') +
                     String(now.getDate()).padStart(2, '0');
      
      // 查询当天的最后一个盘点单
      // 注意：由于当前没有实际的inventory_counts表，所以这里是伪代码
      // const [counts] = await db.execute(
      //   `SELECT count_number FROM inventory_counts 
      //    WHERE warehouse_id = ? AND count_number LIKE ? 
      //    ORDER BY id DESC LIMIT 1`,
      //   [warehouseId, `${this.countNumberPrefix}-${warehouseCode}-${dateStr}%`]
      // );
      
      // 确定序列号
      let sequenceNumber = 1;
      
      // 如果存在当天的盘点单，提取序列号并加1
      // if (counts && counts.length > 0) {
      //   const lastCountNumber = counts[0].count_number;
      //   const lastSequence = parseInt(lastCountNumber.split('-')[3]);
      //   if (!isNaN(lastSequence)) {
      //     sequenceNumber = lastSequence + 1;
      //   }
      // }
      
      // 格式化序列号为4位数字
      const formattedSequence = String(sequenceNumber).padStart(4, '0');
      
      return `${this.countNumberPrefix}-${warehouseCode}-${dateStr}-${formattedSequence}`;
    } catch (error) {
      console.error('生成盘点单编号失败:', error);
      throw new Error(`生成盘点单编号失败: ${error.message}`);
    }
  }
  
  /**
   * 开始盘点
   * @param inventoryCountId 盘点单ID
   * @param userId 用户ID
   * @returns 更新后的盘点单信息
   */
  async startInventoryCount(inventoryCountId: number, userId: number): Promise<InventoryCount> {
    try {
      // 获取盘点单信息
      const count = await this.getInventoryCount(inventoryCountId);
      if (!count) {
        throw new Error(`未找到ID为${inventoryCountId}的盘点单`);
      }
      
      // 检查盘点单状态
      if (count.status !== InventoryCountStatus.Draft) {
        throw new Error(`只有草稿状态的盘点单才能开始盘点，当前状态: ${count.status}`);
      }
      
      // 更新盘点单状态
      // 注意：由于当前没有实际的inventory_counts表，所以这里是伪代码
      // await db.execute(
      //   `UPDATE inventory_counts 
      //    SET status = ?, updated_at = ?
      //    WHERE id = ?`,
      //   [InventoryCountStatus.InProgress, new Date(), inventoryCountId]
      // );
      
      // 返回更新后的盘点单信息
      return {
        ...count,
        status: InventoryCountStatus.InProgress,
        updatedAt: new Date()
      };
    } catch (error) {
      console.error('开始盘点失败:', error);
      throw new Error(`开始盘点失败: ${error.message}`);
    }
  }
  
  /**
   * 更新盘点明细
   * @param inventoryCountId 盘点单ID
   * @param itemId 盘点明细ID
   * @param data 更新数据
   * @returns 更新后的盘点明细信息
   */
  async updateInventoryCountItem(inventoryCountId: number, itemId: number, data: UpdateInventoryCountItem): Promise<InventoryCountItem> {
    try {
      // 获取盘点单信息
      const count = await this.getInventoryCount(inventoryCountId);
      if (!count) {
        throw new Error(`未找到ID为${inventoryCountId}的盘点单`);
      }
      
      // 检查盘点单状态
      if (count.status !== InventoryCountStatus.InProgress) {
        throw new Error(`只有进行中状态的盘点单才能更新明细，当前状态: ${count.status}`);
      }
      
      // 获取盘点明细
      const item = await this.getInventoryCountItem(itemId);
      if (!item) {
        throw new Error(`未找到ID为${itemId}的盘点明细`);
      }
      
      // 检查明细是否属于该盘点单
      if (item.inventoryCountId !== inventoryCountId) {
        throw new Error(`盘点明细${itemId}不属于盘点单${inventoryCountId}`);
      }
      
      // 计算差异数量
      const difference = data.actualQuantity - item.expectedQuantity;
      
      // 更新盘点明细
      // 注意：由于当前没有实际的inventory_count_items表，所以这里是伪代码
      // await db.execute(
      //   `UPDATE inventory_count_items 
      //    SET actual_quantity = ?, difference = ?, status = ?, counted_by = ?, counted_at = ?, notes = ?
      //    WHERE id = ?`,
      //   [
      //     data.actualQuantity,
      //     difference,
      //     InventoryCountItemStatus.Counted,
      //     data.countedBy,
      //     new Date(),
      //     data.notes,
      //     itemId
      //   ]
      // );
      
      // 检查是否所有明细都已盘点
      const allItemsCounted = await this.checkAllItemsCounted(inventoryCountId);
      
      // 返回更新后的盘点明细信息
      return {
        ...item,
        actualQuantity: data.actualQuantity,
        difference,
        status: InventoryCountItemStatus.Counted,
        countedBy: data.countedBy,
        countedAt: new Date(),
        notes: data.notes
      };
    } catch (error) {
      console.error('更新盘点明细失败:', error);
      throw new Error(`更新盘点明细失败: ${error.message}`);
    }
  }
  
  /**
   * 完成盘点并处理库存差异
   * @param inventoryCountId 盘点单ID
   * @param userId 用户ID
   * @param adjustInventory 是否调整库存
   * @returns 更新后的盘点单信息
   */
  async completeInventoryCount(inventoryCountId: number, userId: number, adjustInventory: boolean): Promise<InventoryCount> {
    try {
      // 获取盘点单信息
      const count = await this.getInventoryCount(inventoryCountId);
      if (!count) {
        throw new Error(`未找到ID为${inventoryCountId}的盘点单`);
      }
      
      // 检查盘点单状态
      if (count.status !== InventoryCountStatus.InProgress) {
        throw new Error(`只有进行中状态的盘点单才能完成，当前状态: ${count.status}`);
      }
      
      // 检查是否所有明细都已盘点
      const allItemsCounted = await this.checkAllItemsCounted(inventoryCountId);
      if (!allItemsCounted) {
        throw new Error('还有明细项未盘点，无法完成盘点');
      }
      
      // 获取盘点明细
      const items = await this.getInventoryCountItems(inventoryCountId);
      
      // 如果需要调整库存
      if (adjustInventory) {
        for (const item of items) {
          if (!item.actualQuantity) continue;
          
          // 计算差异数量
          const difference = item.actualQuantity - item.expectedQuantity;
          
          // 如果有差异，进行库存调整
          if (difference !== 0) {
            const transaction: InventoryTransaction = {
              warehouseId: count.warehouseId,
              productId: item.productId,
              quantity: difference, // 正数表示增加，负数表示减少
              operationType: InventoryOperationType.Adjustment,
              userId,
              notes: `库存盘点调整 - 盘点单号: ${count.countNumber}`
            };
            
            // 执行库存调整
            const result = await this.inventoryService.executeInventoryTransaction(transaction);
            
            if (!result.success) {
              throw new Error(`调整商品${item.productId}库存失败: ${result.message}`);
            }
            
            // 更新盘点明细状态为已调整
            // 注意：由于当前没有实际的inventory_count_items表，所以这里是伪代码
            // await db.execute(
            //   `UPDATE inventory_count_items 
            //    SET status = ?
            //    WHERE id = ?`,
            //   [InventoryCountItemStatus.Adjusted, item.id]
            // );
          }
        }
      }
      
      // 更新盘点单状态
      // 注意：由于当前没有实际的inventory_counts表，所以这里是伪代码
      // await db.execute(
      //   `UPDATE inventory_counts 
      //    SET status = ?, completed_by = ?, end_date = ?, updated_at = ?
      //    WHERE id = ?`,
      //   [
      //     InventoryCountStatus.Completed,
      //     userId,
      //     new Date(),
      //     new Date(),
      //     inventoryCountId
      //   ]
      // );
      
      // 返回更新后的盘点单信息
      return {
        ...count,
        status: InventoryCountStatus.Completed,
        completedBy: userId,
        endDate: new Date(),
        updatedAt: new Date()
      };
    } catch (error) {
      console.error('完成盘点失败:', error);
      throw new Error(`完成盘点失败: ${error.message}`);
    }
  }
  
  /**
   * 取消盘点
   * @param inventoryCountId 盘点单ID
   * @param userId 用户ID
   * @returns 更新后的盘点单信息
   */
  async cancelInventoryCount(inventoryCountId: number, userId: number): Promise<InventoryCount> {
    try {
      // 获取盘点单信息
      const count = await this.getInventoryCount(inventoryCountId);
      if (!count) {
        throw new Error(`未找到ID为${inventoryCountId}的盘点单`);
      }
      
      // 检查盘点单状态
      if (count.status === InventoryCountStatus.Completed) {
        throw new Error('已完成的盘点单不能取消');
      }
      
      // 更新盘点单状态
      // 注意：由于当前没有实际的inventory_counts表，所以这里是伪代码
      // await db.execute(
      //   `UPDATE inventory_counts 
      //    SET status = ?, updated_at = ?
      //    WHERE id = ?`,
      //   [
      //     InventoryCountStatus.Cancelled,
      //     new Date(),
      //     inventoryCountId
      //   ]
      // );
      
      // 返回更新后的盘点单信息
      return {
        ...count,
        status: InventoryCountStatus.Cancelled,
        updatedAt: new Date()
      };
    } catch (error) {
      console.error('取消盘点失败:', error);
      throw new Error(`取消盘点失败: ${error.message}`);
    }
  }
  
  /**
   * 获取盘点单信息
   * @param inventoryCountId 盘点单ID
   * @returns 盘点单信息
   */
  async getInventoryCount(inventoryCountId: number): Promise<InventoryCount | null> {
    try {
      // 注意：由于当前没有实际的inventory_counts表，所以这里是模拟数据
      const mockCount: InventoryCount = {
        id: inventoryCountId,
        countNumber: `IC-BJ-20250315-0001`,
        warehouseId: 1,
        status: InventoryCountStatus.Draft,
        startDate: new Date(),
        createdBy: 1,
        notes: '月度库存盘点',
        createdAt: new Date(),
        updatedAt: new Date(),
        warehouse: {
          id: 1,
          name: '北京主仓库',
          location: '北京市朝阳区'
        },
        creator: {
          id: 1,
          username: 'admin',
          fullName: '系统管理员'
        }
      };
      
      return mockCount;
    } catch (error) {
      console.error('获取盘点单信息失败:', error);
      return null;
    }
  }
  
  /**
   * 获取盘点单明细列表
   * @param inventoryCountId 盘点单ID
   * @returns 盘点明细列表
   */
  async getInventoryCountItems(inventoryCountId: number): Promise<InventoryCountItem[]> {
    try {
      // 注意：由于当前没有实际的inventory_count_items表，所以这里是模拟数据
      const mockItems: InventoryCountItem[] = [
        {
          id: 1,
          inventoryCountId,
          productId: 1,
          expectedQuantity: 100,
          status: InventoryCountItemStatus.Pending,
          product: {
            id: 1,
            name: '测试产品1',
            barcode: '1001001',
            category: '电子产品'
          }
        },
        {
          id: 2,
          inventoryCountId,
          productId: 2,
          expectedQuantity: 50,
          status: InventoryCountItemStatus.Pending,
          product: {
            id: 2,
            name: '测试产品2',
            barcode: '1001002',
            category: '办公用品'
          }
        }
      ];
      
      return mockItems;
    } catch (error) {
      console.error('获取盘点明细列表失败:', error);
      return [];
    }
  }
  
  /**
   * 获取盘点明细信息
   * @param itemId 盘点明细ID
   * @returns 盘点明细信息
   */
  async getInventoryCountItem(itemId: number): Promise<InventoryCountItem | null> {
    try {
      // 注意：由于当前没有实际的inventory_count_items表，所以这里是模拟数据
      const mockItem: InventoryCountItem = {
        id: itemId,
        inventoryCountId: 1,
        productId: 1,
        expectedQuantity: 100,
        status: InventoryCountItemStatus.Pending,
        product: {
          id: 1,
          name: '测试产品1',
          barcode: '1001001',
          category: '电子产品'
        }
      };
      
      return mockItem;
    } catch (error) {
      console.error('获取盘点明细信息失败:', error);
      return null;
    }
  }
  
  /**
   * 检查盘点单的所有明细是否都已盘点
   * @param inventoryCountId 盘点单ID
   * @returns 是否所有明细都已盘点
   */
  private async checkAllItemsCounted(inventoryCountId: number): Promise<boolean> {
    try {
      // 注意：由于当前没有实际的inventory_count_items表，所以这里是伪代码
      // const [result] = await db.execute(
      //   `SELECT COUNT(*) as total FROM inventory_count_items 
      //    WHERE inventory_count_id = ? AND status = ?`,
      //   [inventoryCountId, InventoryCountItemStatus.Pending]
      // );
      
      // return result[0].total === 0;
      
      // 模拟所有明细都已盘点
      return true;
    } catch (error) {
      console.error('检查盘点明细状态失败:', error);
      throw new Error(`检查盘点明细状态失败: ${error.message}`);
    }
  }
  
  /**
   * 获取盘点单列表
   * @param warehouseId 仓库ID (可选)
   * @param status 状态 (可选)
   * @param startDate 开始日期 (可选)
   * @param endDate 结束日期 (可选)
   * @returns 盘点单列表
   */
  async getInventoryCounts(warehouseId?: number, status?: InventoryCountStatus, startDate?: Date, endDate?: Date): Promise<InventoryCount[]> {
    try {
      // 注意：由于当前没有实际的inventory_counts表，所以这里是模拟数据
      const mockCounts: InventoryCount[] = [
        {
          id: 1,
          countNumber: 'IC-BJ-20250315-0001',
          warehouseId: 1,
          status: InventoryCountStatus.Draft,
          startDate: new Date(),
          createdBy: 1,
          notes: '月度库存盘点',
          createdAt: new Date(),
          updatedAt: new Date(),
          warehouse: {
            id: 1,
            name: '北京主仓库',
            location: '北京市朝阳区'
          },
          creator: {
            id: 1,
            username: 'admin',
            fullName: '系统管理员'
          }
        },
        {
          id: 2,
          countNumber: 'IC-SH-20250314-0001',
          warehouseId: 2,
          status: InventoryCountStatus.Completed,
          startDate: new Date('2025-03-14'),
          endDate: new Date('2025-03-14'),
          createdBy: 1,
          completedBy: 1,
          notes: '季度库存盘点',
          createdAt: new Date('2025-03-14'),
          updatedAt: new Date('2025-03-14'),
          warehouse: {
            id: 2,
            name: '上海分仓',
            location: '上海市浦东新区'
          },
          creator: {
            id: 1,
            username: 'admin',
            fullName: '系统管理员'
          },
          completer: {
            id: 1,
            username: 'admin',
            fullName: '系统管理员'
          }
        }
      ];
      
      // 应用过滤条件
      let filteredCounts = mockCounts;
      
      if (warehouseId) {
        filteredCounts = filteredCounts.filter(count => count.warehouseId === warehouseId);
      }
      
      if (status) {
        filteredCounts = filteredCounts.filter(count => count.status === status);
      }
      
      if (startDate) {
        filteredCounts = filteredCounts.filter(count => new Date(count.createdAt) >= new Date(startDate));
      }
      
      if (endDate) {
        filteredCounts = filteredCounts.filter(count => new Date(count.createdAt) <= new Date(endDate));
      }
      
      return filteredCounts;
    } catch (error) {
      console.error('获取盘点单列表失败:', error);
      return [];
    }
  }
  
  /**
   * 生成盘点差异报告
   * @param inventoryCountId 盘点单ID
   * @returns 盘点差异报告
   */
  async generateDifferenceReport(inventoryCountId: number): Promise<{
    countNumber: string;
    warehouseName: string;
    startDate: Date;
    endDate?: Date;
    totalItems: number;
    itemsWithDifference: number;
    totalDifference: number;
    totalValue: number;
    items: Array<{
      productId: number;
      productName: string;
      barcode: string;
      category: string;
      expectedQuantity: number;
      actualQuantity: number;
      difference: number;
      price: number;
      totalValue: number;
    }>;
  }> {
    try {
      // 获取盘点单信息
      const count = await this.getInventoryCount(inventoryCountId);
      if (!count) {
        throw new Error(`未找到ID为${inventoryCountId}的盘点单`);
      }
      
      // 获取盘点明细
      const items = await this.getInventoryCountItems(inventoryCountId);
      
      // 过滤出有差异的明细
      const itemsWithDiff = items.filter(item => 
        item.actualQuantity !== undefined && 
        item.difference !== undefined && 
        item.difference !== 0
      );
      
      // 计算总差异和总价值
      let totalDifference = 0;
      let totalValue = 0;
      
      const reportItems = [];
      
      for (const item of itemsWithDiff) {
        if (item.difference === undefined || item.actualQuantity === undefined) continue;
        
        // 获取商品信息
        const product = await this.storage.getProduct(item.productId);
        if (!product) continue;
        
        totalDifference += item.difference;
        const itemValue = item.difference * Number(product.price);
        totalValue += itemValue;
        
        reportItems.push({
          productId: item.productId,
          productName: product.name,
          barcode: product.barcode,
          category: product.category || '未分类',
          expectedQuantity: item.expectedQuantity,
          actualQuantity: item.actualQuantity,
          difference: item.difference,
          price: Number(product.price),
          totalValue: itemValue
        });
      }
      
      return {
        countNumber: count.countNumber,
        warehouseName: count.warehouse?.name || '',
        startDate: count.startDate,
        endDate: count.endDate,
        totalItems: items.length,
        itemsWithDifference: itemsWithDiff.length,
        totalDifference,
        totalValue,
        items: reportItems
      };
    } catch (error) {
      console.error('生成盘点差异报告失败:', error);
      throw new Error(`生成盘点差异报告失败: ${error.message}`);
    }
  }
}