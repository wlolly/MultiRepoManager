import { and, desc, eq, sql } from 'drizzle-orm/mysql-core';
import { db } from './db';
import {
  InsertWarehouseTransfer,
  InsertWarehouseTransferItem,
  WarehouseTransfer,
  WarehouseTransferItem,
  warehouseTransferItems,
  warehouseTransfers
} from '../shared/schema';

// 仓库调拨单相关方法
export async function getWarehouseTransfer(id: number): Promise<WarehouseTransfer | undefined> {
  const transfers = await db.select().from(warehouseTransfers).where(eq(warehouseTransfers.id, id));
  
  if (transfers.length === 0) {
    return undefined;
  }

  return transfers[0];
}

export async function getWarehouseTransferWithDetails(id: number, storage: any): Promise<any> {
  const transfer = await getWarehouseTransfer(id);
  if (!transfer) return undefined;

  // 添加源仓库信息
  const sourceWarehouse = await storage.getWarehouse(transfer.sourceWarehouseId);
  // 添加目标仓库信息
  const targetWarehouse = await storage.getWarehouse(transfer.targetWarehouseId);
  // 添加创建人信息
  const creator = await storage.getUser(transfer.createdBy);
  // 添加关联单据信息
  let outboundOrder;
  if (transfer.outboundOrderId) {
    outboundOrder = await storage.getOutboundOrder(transfer.outboundOrderId);
  }
  
  let inboundOrder;
  if (transfer.inboundOrderId) {
    inboundOrder = await storage.getInboundOrder(transfer.inboundOrderId);
  }

  return {
    ...transfer,
    sourceWarehouse: sourceWarehouse ? {
      id: sourceWarehouse.id,
      name: sourceWarehouse.name,
      location: sourceWarehouse.location
    } : null,
    targetWarehouse: targetWarehouse ? {
      id: targetWarehouse.id,
      name: targetWarehouse.name,
      location: targetWarehouse.location
    } : null,
    creator: creator ? {
      id: creator.id,
      username: creator.username,
      fullName: creator.fullName
    } : null,
    outboundOrder: outboundOrder ? {
      id: outboundOrder.id,
      orderNumber: outboundOrder.orderNumber
    } : null,
    inboundOrder: inboundOrder ? {
      id: inboundOrder.id,
      orderNumber: inboundOrder.orderNumber
    } : null
  };
}

export async function getWarehouseTransferByReference(referenceNumber: string): Promise<WarehouseTransfer | undefined> {
  const transfers = await db.select()
    .from(warehouseTransfers)
    .where(eq(warehouseTransfers.referenceNumber, referenceNumber));
  
  if (transfers.length === 0) {
    return undefined;
  }

  return transfers[0];
}

export async function createWarehouseTransfer(insertTransfer: InsertWarehouseTransfer, items: any[] = []): Promise<number> {
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

  // 创建调拨单记录
  const result = await db.insert(warehouseTransfers).values({
    ...insertTransfer,
    status: insertTransfer.status || "pending",
    createdBy: insertTransfer.createdBy || 1, // 默认使用ID为1的用户
  });

  // 返回新生成的调拨单ID
  return Number(result.insertId);
}

export async function updateWarehouseTransfer(id: number, transfer: Partial<WarehouseTransfer>): Promise<void> {
  await db.update(warehouseTransfers)
    .set(transfer)
    .where(eq(warehouseTransfers.id, id));
}

export async function getWarehouseTransfers(filter?: { 
  sourceWarehouseId?: number, 
  targetWarehouseId?: number, 
  status?: string 
}): Promise<WarehouseTransfer[]> {
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
  
  return query;
}

export async function getWarehouseTransferStats(): Promise<{
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
export async function getWarehouseTransferItems(transferId: number): Promise<WarehouseTransferItem[]> {
  return db.select()
    .from(warehouseTransferItems)
    .where(eq(warehouseTransferItems.transferId, transferId));
}

export async function getWarehouseTransferItemsWithProductDetails(transferId: number, storage: any): Promise<any[]> {
  const items = await getWarehouseTransferItems(transferId);
  
  // 添加商品信息
  const itemsWithDetails = [];
  for (const item of items) {
    const product = await storage.getProduct(item.productId);
    
    itemsWithDetails.push({
      ...item,
      product: product ? {
        id: product.id,
        name: product.name,
        barcode: product.barcode,
        category: product.category
      } : null
    });
  }
  
  return itemsWithDetails;
}

export async function createWarehouseTransferItem(insertItem: InsertWarehouseTransferItem): Promise<number> {
  const result = await db.insert(warehouseTransferItems).values(insertItem);
  return Number(result.insertId);
}

export async function getWarehouseTransferItem(id: number): Promise<WarehouseTransferItem | undefined> {
  const items = await db.select()
    .from(warehouseTransferItems)
    .where(eq(warehouseTransferItems.id, id));
    
  if (items.length === 0) {
    return undefined;
  }
  
  return items[0];
}

export async function updateWarehouseTransferItem(id: number, item: Partial<WarehouseTransferItem>): Promise<void> {
  await db.update(warehouseTransferItems)
    .set(item)
    .where(eq(warehouseTransferItems.id, id));
}

export async function deleteWarehouseTransferItem(id: number): Promise<void> {
  await db.delete(warehouseTransferItems)
    .where(eq(warehouseTransferItems.id, id));
}