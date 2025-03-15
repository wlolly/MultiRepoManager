/**
 * 唯一码跟踪服务
 * 用于管理所有唯一码的生命周期和流转
 */
import { IStorage } from '../storage';
import { 
  InsertUniqueCodeTracking, 
  InsertUniqueCodeHistory, 
  UniqueCodeTracking, 
  UniqueCodeHistory 
} from '../../shared/schema';

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
  ): Promise<UniqueCodeTracking> {
    // 检查唯一码是否已存在
    const existingCode = await this.storage.getUniqueCodeTracking(uniqueCode);
    if (existingCode) {
      throw new Error(`唯一码 ${uniqueCode} 已存在于系统中，无法重复注册`);
    }

    // 创建唯一码跟踪记录
    const trackingData: InsertUniqueCodeTracking = {
      uniqueCode,
      productId,
      warehouseId,
      currentStatus: 'in_stock',
      quantity: 1,
      inboundOrderId,
      inboundItemId,
      lastOperationType: 'inbound',
      lastOperationDate: new Date()
    };

    const tracking = await this.storage.trackUniqueCode(trackingData);

    // 添加历史记录
    const historyData: InsertUniqueCodeHistory = {
      uniqueCode,
      productId,
      warehouseId,
      operationType: 'inbound',
      quantity: 1,
      orderId: inboundOrderId,
      orderItemId: inboundItemId,
      newStatus: 'in_stock',
      operationDate: new Date(),
      userId
    };

    await this.storage.addUniqueCodeHistory(historyData);

    return tracking;
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
  ): Promise<UniqueCodeTracking | undefined> {
    // 查找唯一码
    const codeTracking = await this.storage.getUniqueCodeTracking(uniqueCode);
    if (!codeTracking) {
      throw new Error(`唯一码 ${uniqueCode} 不存在于系统中`);
    }

    // 验证是否可出库（必须是在库状态）
    if (codeTracking.currentStatus !== 'in_stock') {
      throw new Error(`唯一码 ${uniqueCode} 当前状态为 ${codeTracking.currentStatus}，不能执行出库操作`);
    }

    // 更新跟踪状态
    const updates: Partial<UniqueCodeTracking> = {
      currentStatus: 'sold',
      outboundOrderId,
      outboundItemId,
      lastOperationType: 'outbound',
      lastOperationDate: new Date()
    };

    const updated = await this.storage.updateUniqueCodeTracking(uniqueCode, updates);

    // 添加历史记录
    const historyData: InsertUniqueCodeHistory = {
      uniqueCode,
      productId: codeTracking.productId,
      warehouseId: codeTracking.warehouseId,
      operationType: 'outbound',
      quantity: 1,
      orderId: outboundOrderId,
      orderItemId: outboundItemId,
      oldStatus: 'in_stock',
      newStatus: 'sold',
      operationDate: new Date(),
      userId
    };

    await this.storage.addUniqueCodeHistory(historyData);

    return updated;
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
  ): Promise<UniqueCodeTracking | undefined> {
    // 查找唯一码
    const codeTracking = await this.storage.getUniqueCodeTracking(uniqueCode);
    if (!codeTracking) {
      throw new Error(`唯一码 ${uniqueCode} 不存在于系统中`);
    }

    // 验证是否可调拨（必须是在库状态）
    if (codeTracking.currentStatus !== 'in_stock') {
      throw new Error(`唯一码 ${uniqueCode} 当前状态为 ${codeTracking.currentStatus}，不能执行调拨操作`);
    }

    // 验证仓库正确性
    if (codeTracking.warehouseId !== sourceWarehouseId) {
      throw new Error(`唯一码 ${uniqueCode} 当前在仓库ID ${codeTracking.warehouseId}，不在源仓库 ${sourceWarehouseId}`);
    }

    // 添加调拨出库历史
    const outHistoryData: InsertUniqueCodeHistory = {
      uniqueCode,
      productId: codeTracking.productId,
      warehouseId: sourceWarehouseId,
      operationType: 'transfer_out',
      quantity: 1,
      transferId,
      transferItemId,
      oldStatus: 'in_stock',
      newStatus: 'transferred',
      operationDate: new Date(),
      userId
    };

    await this.storage.addUniqueCodeHistory(outHistoryData);

    // 更新为转移状态
    const transferUpdates: Partial<UniqueCodeTracking> = {
      currentStatus: 'transferred',
      transferId,
      transferItemId,
      lastOperationType: 'transfer',
      lastOperationDate: new Date()
    };

    await this.storage.updateUniqueCodeTracking(uniqueCode, transferUpdates);

    // 添加调拨入库历史
    const inHistoryData: InsertUniqueCodeHistory = {
      uniqueCode,
      productId: codeTracking.productId,
      warehouseId: targetWarehouseId,
      operationType: 'transfer_in',
      quantity: 1,
      transferId,
      transferItemId,
      oldStatus: 'transferred',
      newStatus: 'in_stock',
      operationDate: new Date(),
      userId
    };

    await this.storage.addUniqueCodeHistory(inHistoryData);

    // 更新为新仓库的在库状态
    const finalUpdates: Partial<UniqueCodeTracking> = {
      warehouseId: targetWarehouseId,
      currentStatus: 'in_stock',
      lastOperationType: 'transfer',
      lastOperationDate: new Date()
    };

    return await this.storage.updateUniqueCodeTracking(uniqueCode, finalUpdates);
  }

  /**
   * 验证唯一码是否可用
   * @param uniqueCode 唯一码
   * @param warehouseId 仓库ID（可选，如提供则验证是否在指定仓库）
   */
  async verifyUniqueCodeAvailability(uniqueCode: string, warehouseId?: number): Promise<boolean> {
    const codeTracking = await this.storage.getUniqueCodeTracking(uniqueCode);
    
    // 不存在的唯一码视为不可用
    if (!codeTracking) {
      return false;
    }

    // 检查是否在库状态
    if (codeTracking.currentStatus !== 'in_stock') {
      return false;
    }

    // 如果指定了仓库，检查是否在该仓库
    if (warehouseId !== undefined && codeTracking.warehouseId !== warehouseId) {
      return false;
    }

    return true;
  }

  /**
   * 获取唯一码历史
   * @param uniqueCode 唯一码
   */
  async getUniqueCodeHistory(uniqueCode: string): Promise<UniqueCodeHistory[]> {
    return this.storage.getUniqueCodeHistory(uniqueCode);
  }

  /**
   * 获取仓库中的唯一码跟踪记录
   * @param warehouseId 仓库ID
   */
  async getWarehouseUniqueCodeTracking(warehouseId: number): Promise<UniqueCodeTracking[]> {
    return this.storage.getUniqueCodeTrackingByWarehouse(warehouseId);
  }

  /**
   * 获取产品的唯一码跟踪记录
   * @param productId 产品ID
   */
  async getProductUniqueCodeTracking(productId: number): Promise<UniqueCodeTracking[]> {
    return this.storage.getUniqueCodeTrackingByProduct(productId);
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
    return this.storage.generateUniqueCodeReport(filter);
  }
}