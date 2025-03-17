import { db } from '../db';
import {
  uniqueCodeTracking,
  uniqueCodeHistory,
  InsertUniqueCodeTracking,
  InsertUniqueCodeHistory,
} from '../../shared/schema';
import { IStorage } from '../storage';
import { eq, and, desc } from 'drizzle-orm';

export class UniqueCodeTrackingService {
  constructor(private storage: IStorage) {}

  async getUniqueCodeTracking(uniqueCode: string): Promise<any> {
    const [tracking] = await db
      .select()
      .from(uniqueCodeTracking)
      .where(eq(uniqueCodeTracking.uniqueCode, uniqueCode));
    return tracking;
  }

  async registerUniqueCodeInbound(
    uniqueCode: string,
    productId: number,
    warehouseId: number,
    inboundOrderId: number,
    inboundItemId: number,
    userId: number
  ): Promise<any> {
    // Create tracking record
    const tracking = await db.insert(uniqueCodeTracking).values({
      uniqueCode,
      productId,
      warehouseId,
      currentStatus: 'in_stock',
      quantity: 1,
      inboundOrderId,
      inboundItemId,
      lastOperationType: 'inbound',
      lastOperationDate: new Date()
    }).returning();

    // Create history record
    await db.insert(uniqueCodeHistory).values({
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
    });

    return tracking[0];
  }

  async registerUniqueCodeOutbound(
    uniqueCode: string,
    outboundOrderId: number,
    outboundItemId: number,
    userId: number
  ): Promise<any> {
    // Get current tracking
    const [tracking] = await db
      .select()
      .from(uniqueCodeTracking)
      .where(eq(uniqueCodeTracking.uniqueCode, uniqueCode));

    if (!tracking || tracking.currentStatus !== 'in_stock') {
      throw new Error('唯一码不存在或不在库存中');
    }

    // Update tracking record
    const updatedTracking = await db
      .update(uniqueCodeTracking)
      .set({
        currentStatus: 'sold',
        outboundOrderId,
        outboundItemId,
        lastOperationType: 'outbound',
        lastOperationDate: new Date()
      })
      .where(eq(uniqueCodeTracking.uniqueCode, uniqueCode))
      .returning();

    // Create history record
    await db.insert(uniqueCodeHistory).values({
      uniqueCode,
      productId: tracking.productId,
      warehouseId: tracking.warehouseId,
      operationType: 'outbound',
      quantity: 1,
      orderId: outboundOrderId,
      orderItemId: outboundItemId,
      oldStatus: tracking.currentStatus,
      newStatus: 'sold',
      operationDate: new Date(),
      userId
    });

    return updatedTracking[0];
  }

  async registerUniqueCodeTransfer(
    uniqueCode: string,
    sourceWarehouseId: number,
    targetWarehouseId: number,
    transferId: number,
    transferItemId: number,
    userId: number
  ): Promise<any> {
    // Get current tracking
    const [tracking] = await db
      .select()
      .from(uniqueCodeTracking)
      .where(eq(uniqueCodeTracking.uniqueCode, uniqueCode));

    if (!tracking || tracking.currentStatus !== 'in_stock') {
      throw new Error('唯一码不存在或不在库存中');
    }

    if (tracking.warehouseId !== sourceWarehouseId) {
      throw new Error('唯一码不在源仓库中');
    }

    // Update tracking record
    const updatedTracking = await db
      .update(uniqueCodeTracking)
      .set({
        warehouseId: targetWarehouseId,
        transferId,
        transferItemId,
        lastOperationType: 'transfer',
        lastOperationDate: new Date()
      })
      .where(eq(uniqueCodeTracking.uniqueCode, uniqueCode))
      .returning();

    // Create transfer out history record
    await db.insert(uniqueCodeHistory).values({
      uniqueCode,
      productId: tracking.productId,
      warehouseId: sourceWarehouseId,
      operationType: 'transfer_out',
      quantity: 1,
      transferId,
      transferItemId,
      oldStatus: tracking.currentStatus,
      newStatus: 'transferred',
      operationDate: new Date(),
      userId
    });

    // Create transfer in history record
    await db.insert(uniqueCodeHistory).values({
      uniqueCode,
      productId: tracking.productId,
      warehouseId: targetWarehouseId,
      operationType: 'transfer_in',
      quantity: 1,
      transferId,
      transferItemId,
      oldStatus: 'transferred',
      newStatus: 'in_stock',
      operationDate: new Date(),
      userId
    });

    return updatedTracking[0];
  }

  async getUniqueCodeHistory(uniqueCode: string): Promise<any[]> {
    return await db
      .select()
      .from(uniqueCodeHistory)
      .where(eq(uniqueCodeHistory.uniqueCode, uniqueCode))
      .orderBy(desc(uniqueCodeHistory.operationDate));
  }

  async verifyUniqueCodeAvailable(uniqueCode: string, warehouseId?: number): Promise<boolean> {
    const query = db
      .select()
      .from(uniqueCodeTracking)
      .where(eq(uniqueCodeTracking.uniqueCode, uniqueCode));

    if (warehouseId) {
      query.where(and(
        eq(uniqueCodeTracking.currentStatus, 'in_stock'),
        eq(uniqueCodeTracking.warehouseId, warehouseId)
      ));
    }

    const [tracking] = await query;
    return !!tracking;
  }

  async generateUniqueCodeReport(filter: {
    productId?: number;
    warehouseId?: number;
    status?: string;
    startDate?: Date;
    endDate?: Date;
  }): Promise<any> {
    // Build query based on filters
    let query = db.select().from(uniqueCodeHistory);

    if (filter.productId) {
      query = query.where(eq(uniqueCodeHistory.productId, filter.productId));
    }
    if (filter.warehouseId) {
      query = query.where(eq(uniqueCodeHistory.warehouseId, filter.warehouseId));
    }
    if (filter.status) {
      query = query.where(eq(uniqueCodeHistory.newStatus, filter.status));
    }
    // Add date range filters if provided
    // Additional filtering logic here

    const history = await query;

    // Generate report statistics
    const report = {
      totalRecords: history.length,
      statusDistribution: {},
      operationTypeDistribution: {},
      timeline: []
    };

    // Process history records to build report
    history.forEach(record => {
      // Build status distribution
      if (!report.statusDistribution[record.newStatus]) {
        report.statusDistribution[record.newStatus] = 0;
      }
      report.statusDistribution[record.newStatus]++;

      // Build operation type distribution
      if (!report.operationTypeDistribution[record.operationType]) {
        report.operationTypeDistribution[record.operationType] = 0;
      }
      report.operationTypeDistribution[record.operationType]++;

      // Build timeline
      report.timeline.push({
        date: record.operationDate,
        operationType: record.operationType,
        oldStatus: record.oldStatus,
        newStatus: record.newStatus
      });
    });

    return report;
  }
}