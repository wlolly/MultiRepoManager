/**
 * 仓库调拨单服务
 * 提供仓库调拨单相关的数据库操作和业务逻辑
 */

import { db } from '../db';
import {
  InsertWarehouseTransfer,
  InsertWarehouseTransferItem,
  WarehouseTransfer,
  WarehouseTransferItem,
  warehouseTransferItems,
  warehouseTransfers
} from '../../shared/schema';
import { IStorage } from '../storage';
import { and, desc, eq } from 'drizzle-orm';

export class WarehouseTransferService {
  constructor(private storage: IStorage) {}
  
  /**
   * 生成调拨单编号
   * 格式：TRF(调拨单代码)-仓库代码(2位)-日期-4位序列号
   * 例如：TRF-SH-20250314-0001
   * @param sourceWarehouseId 源仓库ID
   */
  private async generateReferenceNumber(sourceWarehouseId: number): Promise<string> {
    const TRANSFER_PREFIX = 'TRF'; // 调拨单代码前缀
    
    // 获取源仓库信息，提取代码
    const sourceWarehouse = await this.storage.getWarehouse(sourceWarehouseId);
    let warehouseCode = 'WH'; // 默认仓库代码
    
    if (sourceWarehouse) {
      // 从仓库名称提取首字母或特定代码
      if (sourceWarehouse.name.includes('Shanghai')) {
        warehouseCode = 'SH';
      } else if (sourceWarehouse.name.includes('Beijing')) {
        warehouseCode = 'BJ';
      } else if (sourceWarehouse.name.includes('Guangzhou')) {
        warehouseCode = 'GZ';
      } else if (sourceWarehouse.name.includes('Shenzhen')) {
        warehouseCode = 'SZ';
      } else {
        // 从仓库名称提取前两个字符作为代码
        warehouseCode = sourceWarehouse.name.substring(0, 2).toUpperCase();
      }
    }
    
    // 获取当前日期，格式为YYYYMMDD
    const now = new Date();
    const dateStr = now.getFullYear() +
                    String(now.getMonth() + 1).padStart(2, '0') +
                    String(now.getDate()).padStart(2, '0');
    
    // 查询当天的最后一个调拨单，以便生成序列号
    const lastTransfers = await db.select()
      .from(warehouseTransfers)
      .where(eq(warehouseTransfers.sourceWarehouseId, sourceWarehouseId))
      .orderBy(desc(warehouseTransfers.id))
      .limit(10);
    
    // 序列号计数，从0001开始
    let sequenceNumber = 1;
    
    // 如果有现有的调拨单，尝试从最近的调拨单号中提取序列号
    for (const transfer of lastTransfers) {
      if (transfer.referenceNumber) {
        const parts = transfer.referenceNumber.split('-');
        if (parts.length === 4 && parts[2] === dateStr) {
          // 找到同一天的调拨单，提取序列号
          try {
            const lastSeq = parseInt(parts[3]);
            if (!isNaN(lastSeq) && lastSeq >= sequenceNumber) {
              sequenceNumber = lastSeq + 1;
            }
          } catch (e) {
            // 忽略解析错误
          }
        }
      }
    }
    
    // 格式化序列号为4位数字
    const sequenceStr = String(sequenceNumber).padStart(4, '0');
    
    // 拼接调拨单号
    return `${TRANSFER_PREFIX}-${warehouseCode}-${dateStr}-${sequenceStr}`;
  }

  // 仓库调拨单相关方法
  async getWarehouseTransfer(id: number): Promise<WarehouseTransfer | undefined> {
    const transfers = await db.select().from(warehouseTransfers).where(eq(warehouseTransfers.id, id));
    
    if (transfers.length === 0) {
      return undefined;
    }

    // 获取调拨单的基本信息
    const transfer = transfers[0];

    // 添加源仓库信息
    const sourceWarehouse = await this.storage.getWarehouse(transfer.sourceWarehouseId);
    if (sourceWarehouse) {
      (transfer as any).sourceWarehouse = {
        id: sourceWarehouse.id,
        name: sourceWarehouse.name,
        location: sourceWarehouse.location
      };
    }
    
    // 添加目标仓库信息
    const targetWarehouse = await this.storage.getWarehouse(transfer.targetWarehouseId);
    if (targetWarehouse) {
      (transfer as any).targetWarehouse = {
        id: targetWarehouse.id,
        name: targetWarehouse.name,
        location: targetWarehouse.location
      };
    }
    
    // 添加创建人信息
    const creator = await this.storage.getUser(transfer.createdBy);
    if (creator) {
      (transfer as any).creator = {
        id: creator.id,
        username: creator.username,
        fullName: creator.fullName
      };
    }
    
    // 添加关联单据信息
    if (transfer.outboundOrderId) {
      const outboundOrder = await this.storage.getOutboundOrder(transfer.outboundOrderId);
      if (outboundOrder) {
        (transfer as any).outboundOrder = {
          id: outboundOrder.id,
          orderNumber: outboundOrder.orderNumber
        };
      }
    }
    
    if (transfer.inboundOrderId) {
      const inboundOrder = await this.storage.getInboundOrder(transfer.inboundOrderId);
      if (inboundOrder) {
        (transfer as any).inboundOrder = {
          id: inboundOrder.id,
          orderNumber: inboundOrder.orderNumber
        };
      }
    }
    
    return transfer;
  }

  async getWarehouseTransferByReference(referenceNumber: string): Promise<WarehouseTransfer | undefined> {
    const transfers = await db.select()
      .from(warehouseTransfers)
      .where(eq(warehouseTransfers.referenceNumber, referenceNumber));
    
    if (transfers.length === 0) {
      return undefined;
    }

    return this.getWarehouseTransfer(transfers[0].id);
  }

  async createWarehouseTransfer(insertTransfer: InsertWarehouseTransfer): Promise<WarehouseTransfer> {
    // 处理调拨单中的明细项
    const items = (insertTransfer as any).items || [];
    delete (insertTransfer as any).items;
    
    // 计算汇总数据
    let totalItems = 0;
    let totalPackages = 0;
    let totalWeight = 0;
    let totalVolume = 0;
    
    for (const item of items) {
      totalItems += parseInt(String(item.quantity)) || 0;
      totalPackages += parseInt(String(item.packageCount)) || 0;
      totalWeight += parseFloat(String(item.weight)) || 0;
      totalVolume += parseFloat(String(item.volume)) || 0;
    }
    
    // 确保汇总数据已包含在插入数据中
    if (!insertTransfer.totalItems) {
      insertTransfer.totalItems = totalItems;
    }
    if (!insertTransfer.totalPackages) {
      insertTransfer.totalPackages = totalPackages;
    }
    if (!insertTransfer.totalWeight) {
      insertTransfer.totalWeight = String(totalWeight);
    }
    if (!insertTransfer.totalVolume) {
      insertTransfer.totalVolume = String(totalVolume);
    }
    
    // 生成调拨单号（如果未提供）
    if (!insertTransfer.referenceNumber && insertTransfer.sourceWarehouseId) {
      insertTransfer.referenceNumber = await this.generateReferenceNumber(insertTransfer.sourceWarehouseId);
    }

    // 创建调拨单记录
    const result = await db.insert(warehouseTransfers).values({
      ...insertTransfer,
      status: insertTransfer.status || "pending",
      createdBy: insertTransfer.createdBy || 1, // 默认使用ID为1的用户
    });

    // 获取新生成的调拨单ID
    const insertId = Number(result.insertId);
    
    // 创建调拨单明细
    if (items && items.length > 0) {
      for (const item of items) {
        await this.createWarehouseTransferItem({
          transferId: insertId,
          productId: parseInt(String(item.productId)) || 0,
          uniqueCode: item.uniqueCode,
          quantity: parseInt(String(item.quantity)) || 0,
          packageCount: parseInt(String(item.packageCount)) || 0,
          weight: String(parseFloat(String(item.weight)) || 0),
          volume: String(parseFloat(String(item.volume)) || 0),
          status: "pending"
        });
      }
    }
    
    // 返回新创建的调拨单
    const newTransfer = await this.getWarehouseTransfer(insertId);
    return newTransfer as WarehouseTransfer;
  }

  async updateWarehouseTransfer(id: number, transfer: Partial<WarehouseTransfer>): Promise<WarehouseTransfer | undefined> {
    const existingTransfer = await this.getWarehouseTransfer(id);
    if (!existingTransfer) return undefined;
    
    await db.update(warehouseTransfers)
      .set(transfer)
      .where(eq(warehouseTransfers.id, id));
    
    return this.getWarehouseTransfer(id);
  }

  async getWarehouseTransfers(filter?: { sourceWarehouseId?: number, targetWarehouseId?: number, status?: string }): Promise<WarehouseTransfer[]> {
    let query = db.select().from(warehouseTransfers);
    
    if (filter) {
      const conditions = [];
      
      if (filter.sourceWarehouseId !== undefined) {
        conditions.push(eq(warehouseTransfers.sourceWarehouseId, filter.sourceWarehouseId));
      }
      
      if (filter.targetWarehouseId !== undefined) {
        conditions.push(eq(warehouseTransfers.targetWarehouseId, filter.targetWarehouseId));
      }
      
      if (filter.status) {
        conditions.push(eq(warehouseTransfers.status, filter.status));
      }
      
      if (conditions.length > 0) {
        query = query.where(and(...conditions));
      }
    }
    
    // 按创建时间排序（最新的在前）
    query = query.orderBy(desc(warehouseTransfers.createdAt));
    
    const transfers = await query;
    
    // 添加关联数据
    const result = [];
    for (const transfer of transfers) {
      const detailedTransfer = await this.getWarehouseTransfer(transfer.id);
      if (detailedTransfer) {
        result.push(detailedTransfer);
      }
    }
    
    return result;
  }

  async getWarehouseTransferStats(): Promise<{
    totalTransfers: number;
    pendingTransfers: number;
    completedTransfers: number;
    totalWeight: number;
    totalVolume: number;
    recentTransfers: number;
  }> {
    // 获取所有调拨单
    const transfers = await db.select().from(warehouseTransfers);
    
    // 最近7天的调拨单
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
    
    const pendingTransfers = transfers.filter(transfer => transfer.status === "pending").length;
    const completedTransfers = transfers.filter(transfer => transfer.status === "completed").length;
    const recentTransfers = transfers.filter(transfer => new Date(transfer.createdAt) >= sevenDaysAgo).length;
    
    // 计算总重量和总体积
    let totalWeight = 0;
    let totalVolume = 0;
    
    transfers.forEach(transfer => {
      totalWeight += parseFloat(String(transfer.totalWeight)) || 0;
      totalVolume += parseFloat(String(transfer.totalVolume)) || 0;
    });
    
    return {
      totalTransfers: transfers.length,
      pendingTransfers,
      completedTransfers,
      totalWeight,
      totalVolume,
      recentTransfers
    };
  }

  // 仓库调拨单明细相关方法
  async getWarehouseTransferItems(transferId: number): Promise<WarehouseTransferItem[]> {
    const items = await db.select()
      .from(warehouseTransferItems)
      .where(eq(warehouseTransferItems.transferId, transferId));
    
    // 添加商品信息
    for (const item of items) {
      const product = await this.storage.getProduct(item.productId);
      if (product) {
        (item as any).product = {
          id: product.id,
          name: product.name,
          barcode: product.barcode,
          category: product.category
        };
      }
    }
    
    return items;
  }

  async createWarehouseTransferItem(insertItem: InsertWarehouseTransferItem): Promise<WarehouseTransferItem> {
    const result = await db.insert(warehouseTransferItems).values(insertItem);
    const id = Number(result.insertId);
    
    const items = await db.select()
      .from(warehouseTransferItems)
      .where(eq(warehouseTransferItems.id, id));
      
    return items[0];
  }

  async updateWarehouseTransferItem(id: number, item: Partial<WarehouseTransferItem>): Promise<WarehouseTransferItem | undefined> {
    const existingItem = await db.select()
      .from(warehouseTransferItems)
      .where(eq(warehouseTransferItems.id, id));
      
    if (existingItem.length === 0) {
      return undefined;
    }
    
    await db.update(warehouseTransferItems)
      .set(item)
      .where(eq(warehouseTransferItems.id, id));
    
    const updatedItems = await db.select()
      .from(warehouseTransferItems)
      .where(eq(warehouseTransferItems.id, id));
      
    return updatedItems[0];
  }

  async deleteWarehouseTransferItem(id: number): Promise<void> {
    await db.delete(warehouseTransferItems)
      .where(eq(warehouseTransferItems.id, id));
  }
}