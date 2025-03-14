// 仓库调拨单相关方法
async getWarehouseTransfer(id: number): Promise<WarehouseTransfer | undefined> {
  return this.warehouseTransfersMap.get(id);
}

async getWarehouseTransferByReference(referenceNumber: string): Promise<WarehouseTransfer | undefined> {
  return Array.from(this.warehouseTransfersMap.values()).find(
    (transfer) => transfer.referenceNumber === referenceNumber
  );
}

async createWarehouseTransfer(insertTransfer: InsertWarehouseTransfer): Promise<WarehouseTransfer> {
  const id = ++this.warehouseTransferIdCounter;
  const createdAt = new Date();
  
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
  
  // 创建调拨单记录
  const transfer: WarehouseTransfer = {
    ...insertTransfer,
    id,
    createdAt,
    totalItems,
    totalPackages,
    totalWeight,
    totalVolume,
    status: insertTransfer.status || "pending",
    createdBy: insertTransfer.createdBy || 1, // 默认使用ID为1的用户
    completedAt: null,
    outboundOrderId: null,
    inboundOrderId: null
  };
  
  this.warehouseTransfersMap.set(id, transfer);
  
  // 创建调拨单明细
  if (items && items.length > 0) {
    for (const item of items) {
      await this.createWarehouseTransferItem({
        transferId: id,
        productId: parseInt(String(item.productId)) || 0,
        uniqueCode: item.uniqueCode,
        quantity: parseInt(String(item.quantity)) || 0,
        packageCount: parseInt(String(item.packageCount)) || 0,
        weight: parseFloat(String(item.weight)) || 0,
        volume: parseFloat(String(item.volume)) || 0,
        status: "pending"
      });
    }
  }
  
  return transfer;
}

async updateWarehouseTransfer(id: number, transfer: Partial<WarehouseTransfer>): Promise<WarehouseTransfer | undefined> {
  const existingTransfer = this.warehouseTransfersMap.get(id);
  if (!existingTransfer) return undefined;
  
  const updatedTransfer = { ...existingTransfer, ...transfer };
  this.warehouseTransfersMap.set(id, updatedTransfer);
  
  return updatedTransfer;
}

async getWarehouseTransfers(filter?: { sourceWarehouseId?: number, targetWarehouseId?: number, status?: string }): Promise<WarehouseTransfer[]> {
  let transfers = Array.from(this.warehouseTransfersMap.values());
  
  if (filter) {
    if (filter.sourceWarehouseId !== undefined) {
      transfers = transfers.filter(transfer => transfer.sourceWarehouseId === filter.sourceWarehouseId);
    }
    
    if (filter.targetWarehouseId !== undefined) {
      transfers = transfers.filter(transfer => transfer.targetWarehouseId === filter.targetWarehouseId);
    }
    
    if (filter.status) {
      transfers = transfers.filter(transfer => transfer.status === filter.status);
    }
  }
  
  // 按创建时间排序（最新的在前）
  transfers.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  
  // 添加关联数据
  for (const transfer of transfers) {
    // 添加源仓库信息
    const sourceWarehouse = this.warehousesMap.get(transfer.sourceWarehouseId);
    if (sourceWarehouse) {
      (transfer as any).sourceWarehouse = {
        id: sourceWarehouse.id,
        name: sourceWarehouse.name,
        location: sourceWarehouse.location
      };
    }
    
    // 添加目标仓库信息
    const targetWarehouse = this.warehousesMap.get(transfer.targetWarehouseId);
    if (targetWarehouse) {
      (transfer as any).targetWarehouse = {
        id: targetWarehouse.id,
        name: targetWarehouse.name,
        location: targetWarehouse.location
      };
    }
    
    // 添加创建人信息
    const creator = this.usersMap.get(transfer.createdBy);
    if (creator) {
      (transfer as any).creator = {
        id: creator.id,
        username: creator.username,
        fullName: creator.fullName
      };
    }
    
    // 添加关联单据信息
    if (transfer.outboundOrderId) {
      const outboundOrder = this.outboundOrdersMap.get(transfer.outboundOrderId);
      if (outboundOrder) {
        (transfer as any).outboundOrder = {
          id: outboundOrder.id,
          orderNumber: outboundOrder.orderNumber
        };
      }
    }
    
    if (transfer.inboundOrderId) {
      const inboundOrder = this.inboundOrdersMap.get(transfer.inboundOrderId);
      if (inboundOrder) {
        (transfer as any).inboundOrder = {
          id: inboundOrder.id,
          orderNumber: inboundOrder.orderNumber
        };
      }
    }
  }
  
  return transfers;
}

async getWarehouseTransferStats(): Promise<{
  totalTransfers: number;
  pendingTransfers: number;
  completedTransfers: number;
  totalWeight: number;
  totalVolume: number;
  recentTransfers: number;
}> {
  const transfers = Array.from(this.warehouseTransfersMap.values());
  
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
  const items = Array.from(this.warehouseTransferItemsMap.values())
    .filter(item => item.transferId === transferId);
  
  // 添加商品信息
  for (const item of items) {
    const product = this.productsMap.get(item.productId);
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
  const id = ++this.warehouseTransferItemIdCounter;
  
  const item: WarehouseTransferItem = {
    ...insertItem,
    id
  };
  
  this.warehouseTransferItemsMap.set(id, item);
  return item;
}

async updateWarehouseTransferItem(id: number, item: Partial<WarehouseTransferItem>): Promise<WarehouseTransferItem | undefined> {
  const existingItem = this.warehouseTransferItemsMap.get(id);
  if (!existingItem) return undefined;
  
  const updatedItem = { ...existingItem, ...item };
  this.warehouseTransferItemsMap.set(id, updatedItem);
  
  return updatedItem;
}

async deleteWarehouseTransferItem(id: number): Promise<void> {
  this.warehouseTransferItemsMap.delete(id);
}