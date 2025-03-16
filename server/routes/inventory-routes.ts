/**
 * 库存管理系统路由
 * 集成库存服务、库存盘点服务和唯一码跟踪服务的API端点
 */

import { Router, Request, Response } from 'express';
import { InventoryService, InventoryOperationType } from '../services/inventory.service';
import { InventoryCountService } from '../services/inventory-count.service';
import { UniqueCodeTrackingService } from '../services/unique-code-tracking.service';
import { memStorage } from '../db';
import { WarehouseTransferService } from '../services/warehouse-transfer.service';
import { verifySession, isAdmin } from '../auth';
import { z } from 'zod';

// 验证库存状态更新请求
const inventoryTransactionSchema = z.object({
  warehouseId: z.number(),
  productId: z.number(),
  quantity: z.number(),
  operationType: z.enum([
    InventoryOperationType.Inbound, 
    InventoryOperationType.Outbound, 
    InventoryOperationType.TransferIn, 
    InventoryOperationType.TransferOut, 
    InventoryOperationType.Adjustment,
    InventoryOperationType.Inventory
  ]),
  referenceId: z.number().optional(),
  referenceItemId: z.number().optional(),
  uniqueCode: z.string().optional(),
  notes: z.string().optional()
});

// 验证执行入库单库存操作请求
const inboundInventorySchema = z.object({
  inboundOrderId: z.number(),
  userId: z.number()
});

// 验证执行出库单库存操作请求
const outboundInventorySchema = z.object({
  outboundOrderId: z.number(),
  userId: z.number()
});

// 验证执行调拨单库存操作请求
const transferInventorySchema = z.object({
  transferId: z.number(),
  userId: z.number()
});

// 验证库存盘点创建请求
const createInventoryCountSchema = z.object({
  warehouseId: z.number(),
  productIds: z.array(z.number()).optional(),
  categoryIds: z.array(z.string()).optional(),
  notes: z.string().optional(),
  createdBy: z.number()
});

// 验证库存盘点明细更新请求
const updateInventoryCountItemSchema = z.object({
  actualQuantity: z.number(),
  notes: z.string().optional(),
  countedBy: z.number()
});

// 验证库存盘点完成请求
const completeInventoryCountSchema = z.object({
  inventoryCountId: z.number(),
  userId: z.number(),
  adjustInventory: z.boolean()
});

// 验证唯一码注册请求
const registerUniqueCodeSchema = z.object({
  uniqueCode: z.string(),
  productId: z.number(),
  warehouseId: z.number(),
  inboundOrderId: z.number(),
  inboundItemId: z.number(),
  userId: z.number()
});

// 验证唯一码出库请求
const outboundUniqueCodeSchema = z.object({
  uniqueCode: z.string(),
  outboundOrderId: z.number(),
  outboundItemId: z.number(),
  userId: z.number()
});

// 验证唯一码调拨请求
const transferUniqueCodeSchema = z.object({
  uniqueCode: z.string(),
  sourceWarehouseId: z.number(),
  targetWarehouseId: z.number(),
  transferId: z.number(),
  transferItemId: z.number(),
  userId: z.number()
});

// 创建并导出路由
export function createInventoryRoutes() {
  const router = Router();
  
  // 创建服务实例
  const inventoryService = new InventoryService(memStorage);
  const inventoryCountService = new InventoryCountService(memStorage);
  const uniqueCodeService = new UniqueCodeTrackingService(memStorage);
  const warehouseTransferService = new WarehouseTransferService(memStorage);
  
  // 中间件：验证会话并处理错误
  router.use(verifySession);
  
  // 库存事务相关路由
  router.post('/transactions', async (req: Request, res: Response) => {
    try {
      const validatedData = inventoryTransactionSchema.parse(req.body);
      const userId = req.session?.userId || 1;
      
      const result = await inventoryService.executeInventoryTransaction({
        ...validatedData,
        userId
      });
      
      res.json(result);
    } catch (error) {
      console.error('执行库存事务失败:', error);
      res.status(400).json({ 
        success: false, 
        message: error instanceof z.ZodError 
          ? '请求数据验证失败: ' + error.errors.map(e => e.message).join(', ')
          : '执行库存事务失败: ' + error.message
      });
    }
  });
  
  // 执行入库单库存操作
  router.post('/inbound-orders/execute', async (req: Request, res: Response) => {
    try {
      const validatedData = inboundInventorySchema.parse(req.body);
      const result = await inventoryService.createInventoryTransactionsFromInboundOrder(
        validatedData.inboundOrderId,
        validatedData.userId
      );
      
      res.json(result);
    } catch (error) {
      console.error('执行入库单库存操作失败:', error);
      res.status(400).json({ 
        success: false, 
        message: error instanceof z.ZodError 
          ? '请求数据验证失败: ' + error.errors.map(e => e.message).join(', ')
          : '执行入库单库存操作失败: ' + error.message
      });
    }
  });
  
  // 执行出库单库存操作
  router.post('/outbound-orders/execute', async (req: Request, res: Response) => {
    try {
      const validatedData = outboundInventorySchema.parse(req.body);
      const result = await inventoryService.createInventoryTransactionsFromOutboundOrder(
        validatedData.outboundOrderId,
        validatedData.userId
      );
      
      res.json(result);
    } catch (error) {
      console.error('执行出库单库存操作失败:', error);
      res.status(400).json({ 
        success: false, 
        message: error instanceof z.ZodError 
          ? '请求数据验证失败: ' + error.errors.map(e => e.message).join(', ')
          : '执行出库单库存操作失败: ' + error.message
      });
    }
  });
  
  // 执行调拨单
  router.post('/transfers/execute', async (req: Request, res: Response) => {
    try {
      const validatedData = transferInventorySchema.parse(req.body);
      const result = await warehouseTransferService.executeTransfer(
        validatedData.transferId,
        validatedData.userId
      );
      
      res.json(result);
    } catch (error) {
      console.error('执行调拨单操作失败:', error);
      res.status(400).json({ 
        success: false, 
        message: error instanceof z.ZodError 
          ? '请求数据验证失败: ' + error.errors.map(e => e.message).join(', ')
          : '执行调拨单操作失败: ' + error.message
      });
    }
  });
  
  // 取消调拨单
  router.post('/transfers/cancel', async (req: Request, res: Response) => {
    try {
      const validatedData = transferInventorySchema.parse(req.body);
      const result = await warehouseTransferService.cancelTransfer(
        validatedData.transferId,
        validatedData.userId
      );
      
      res.json(result);
    } catch (error) {
      console.error('取消调拨单操作失败:', error);
      res.status(400).json({ 
        success: false, 
        message: error instanceof z.ZodError 
          ? '请求数据验证失败: ' + error.errors.map(e => e.message).join(', ')
          : '取消调拨单操作失败: ' + error.message
      });
    }
  });
  
  // 获取库存统计信息
  router.get('/stats', async (req: Request, res: Response) => {
    try {
      const warehouseId = req.query.warehouseId ? Number(req.query.warehouseId) : undefined;
      const stats = await inventoryService.getInventoryStats(warehouseId);
      
      res.json(stats);
    } catch (error) {
      console.error('获取库存统计信息失败:', error);
      res.status(500).json({ 
        success: false, 
        message: '获取库存统计信息失败: ' + error.message
      });
    }
  });
  
  // 库存盘点相关路由
  
  // 创建库存盘点单
  router.post('/counts', async (req: Request, res: Response) => {
    try {
      const validatedData = createInventoryCountSchema.parse(req.body);
      const result = await inventoryCountService.createInventoryCount(validatedData);
      
      res.json(result);
    } catch (error) {
      console.error('创建库存盘点单失败:', error);
      res.status(400).json({ 
        success: false, 
        message: error instanceof z.ZodError 
          ? '请求数据验证失败: ' + error.errors.map(e => e.message).join(', ')
          : '创建库存盘点单失败: ' + error.message
      });
    }
  });
  
  // 获取库存盘点单
  router.get('/counts/:id', async (req: Request, res: Response) => {
    try {
      const id = Number(req.params.id);
      const count = await inventoryCountService.getInventoryCount(id);
      
      if (!count) {
        return res.status(404).json({ 
          success: false, 
          message: `未找到ID为${id}的库存盘点单` 
        });
      }
      
      // 获取盘点单明细
      const items = await inventoryCountService.getInventoryCountItems(id);
      count.items = items;
      
      res.json(count);
    } catch (error) {
      console.error('获取库存盘点单失败:', error);
      res.status(500).json({ 
        success: false, 
        message: '获取库存盘点单失败: ' + error.message
      });
    }
  });
  
  // 获取库存盘点单列表
  router.get('/counts', async (req: Request, res: Response) => {
    try {
      const warehouseId = req.query.warehouseId ? Number(req.query.warehouseId) : undefined;
      const status = req.query.status ? String(req.query.status) : undefined;
      const startDate = req.query.startDate ? new Date(String(req.query.startDate)) : undefined;
      const endDate = req.query.endDate ? new Date(String(req.query.endDate)) : undefined;
      
      const counts = await inventoryCountService.getInventoryCounts(warehouseId, status, startDate, endDate);
      
      res.json(counts);
    } catch (error) {
      console.error('获取库存盘点单列表失败:', error);
      res.status(500).json({ 
        success: false, 
        message: '获取库存盘点单列表失败: ' + error.message
      });
    }
  });
  
  // 开始库存盘点
  router.post('/counts/:id/start', async (req: Request, res: Response) => {
    try {
      const id = Number(req.params.id);
      const userId = req.session?.userId || 1;
      
      const result = await inventoryCountService.startInventoryCount(id, userId);
      
      res.json(result);
    } catch (error) {
      console.error('开始库存盘点失败:', error);
      res.status(400).json({ 
        success: false, 
        message: '开始库存盘点失败: ' + error.message
      });
    }
  });
  
  // 更新库存盘点明细
  router.put('/counts/:countId/items/:itemId', async (req: Request, res: Response) => {
    try {
      const countId = Number(req.params.countId);
      const itemId = Number(req.params.itemId);
      const validatedData = updateInventoryCountItemSchema.parse(req.body);
      
      const result = await inventoryCountService.updateInventoryCountItem(countId, itemId, validatedData);
      
      res.json(result);
    } catch (error) {
      console.error('更新库存盘点明细失败:', error);
      res.status(400).json({ 
        success: false, 
        message: error instanceof z.ZodError 
          ? '请求数据验证失败: ' + error.errors.map(e => e.message).join(', ')
          : '更新库存盘点明细失败: ' + error.message
      });
    }
  });
  
  // 完成库存盘点
  router.post('/counts/:id/complete', async (req: Request, res: Response) => {
    try {
      const id = Number(req.params.id);
      const validatedData = completeInventoryCountSchema.parse({
        ...req.body,
        inventoryCountId: id
      });
      
      const result = await inventoryCountService.completeInventoryCount(
        validatedData.inventoryCountId,
        validatedData.userId,
        validatedData.adjustInventory
      );
      
      res.json(result);
    } catch (error) {
      console.error('完成库存盘点失败:', error);
      res.status(400).json({ 
        success: false, 
        message: error instanceof z.ZodError 
          ? '请求数据验证失败: ' + error.errors.map(e => e.message).join(', ')
          : '完成库存盘点失败: ' + error.message
      });
    }
  });
  
  // 取消库存盘点
  router.post('/counts/:id/cancel', async (req: Request, res: Response) => {
    try {
      const id = Number(req.params.id);
      const userId = req.session?.userId || 1;
      
      const result = await inventoryCountService.cancelInventoryCount(id, userId);
      
      res.json(result);
    } catch (error) {
      console.error('取消库存盘点失败:', error);
      res.status(400).json({ 
        success: false, 
        message: '取消库存盘点失败: ' + error.message
      });
    }
  });
  
  // 获取库存盘点差异报告
  router.get('/counts/:id/report', async (req: Request, res: Response) => {
    try {
      const id = Number(req.params.id);
      const report = await inventoryCountService.generateDifferenceReport(id);
      
      res.json(report);
    } catch (error) {
      console.error('生成库存盘点差异报告失败:', error);
      res.status(500).json({ 
        success: false, 
        message: '生成库存盘点差异报告失败: ' + error.message
      });
    }
  });
  
  // 唯一码跟踪相关路由
  
  // 注册新的唯一码
  router.post('/unique-codes/register', async (req: Request, res: Response) => {
    try {
      const validatedData = registerUniqueCodeSchema.parse(req.body);
      
      const result = await uniqueCodeService.registerNewUniqueCode(
        validatedData.uniqueCode,
        validatedData.productId,
        validatedData.warehouseId,
        validatedData.inboundOrderId,
        validatedData.inboundItemId,
        validatedData.userId
      );
      
      res.json(result);
    } catch (error) {
      console.error('注册唯一码失败:', error);
      res.status(400).json({ 
        success: false, 
        message: error instanceof z.ZodError 
          ? '请求数据验证失败: ' + error.errors.map(e => e.message).join(', ')
          : '注册唯一码失败: ' + error.message
      });
    }
  });
  
  // 处理唯一码出库
  router.post('/unique-codes/outbound', async (req: Request, res: Response) => {
    try {
      const validatedData = outboundUniqueCodeSchema.parse(req.body);
      
      const result = await uniqueCodeService.processUniqueCodeOutbound(
        validatedData.uniqueCode,
        validatedData.outboundOrderId,
        validatedData.outboundItemId,
        validatedData.userId
      );
      
      res.json(result);
    } catch (error) {
      console.error('处理唯一码出库失败:', error);
      res.status(400).json({ 
        success: false, 
        message: error instanceof z.ZodError 
          ? '请求数据验证失败: ' + error.errors.map(e => e.message).join(', ')
          : '处理唯一码出库失败: ' + error.message
      });
    }
  });
  
  // 处理唯一码调拨
  router.post('/unique-codes/transfer', async (req: Request, res: Response) => {
    try {
      const validatedData = transferUniqueCodeSchema.parse(req.body);
      
      const result = await uniqueCodeService.processUniqueCodeTransfer(
        validatedData.uniqueCode,
        validatedData.sourceWarehouseId,
        validatedData.targetWarehouseId,
        validatedData.transferId,
        validatedData.transferItemId,
        validatedData.userId
      );
      
      res.json(result);
    } catch (error) {
      console.error('处理唯一码调拨失败:', error);
      res.status(400).json({ 
        success: false, 
        message: error instanceof z.ZodError 
          ? '请求数据验证失败: ' + error.errors.map(e => e.message).join(', ')
          : '处理唯一码调拨失败: ' + error.message
      });
    }
  });
  
  // 验证唯一码可用性
  router.get('/unique-codes/:code/verify', async (req: Request, res: Response) => {
    try {
      const uniqueCode = req.params.code;
      const warehouseId = req.query.warehouseId ? Number(req.query.warehouseId) : undefined;
      
      const isAvailable = await uniqueCodeService.verifyUniqueCodeAvailability(uniqueCode, warehouseId);
      
      res.json({ 
        success: true, 
        isAvailable,
        message: isAvailable 
          ? '唯一码可用' 
          : warehouseId 
            ? `唯一码${uniqueCode}不可用或不在指定仓库中` 
            : `唯一码${uniqueCode}不可用`
      });
    } catch (error) {
      console.error('验证唯一码可用性失败:', error);
      res.status(500).json({ 
        success: false, 
        message: '验证唯一码可用性失败: ' + error.message
      });
    }
  });
  
  // 获取唯一码历史
  router.get('/unique-codes/:code/history', async (req: Request, res: Response) => {
    try {
      const uniqueCode = req.params.code;
      const history = await uniqueCodeService.getUniqueCodeHistory(uniqueCode);
      
      res.json(history);
    } catch (error) {
      console.error('获取唯一码历史失败:', error);
      res.status(500).json({ 
        success: false, 
        message: '获取唯一码历史失败: ' + error.message
      });
    }
  });
  
  // 获取仓库唯一码跟踪记录
  router.get('/unique-codes/warehouse/:warehouseId', async (req: Request, res: Response) => {
    try {
      const warehouseId = Number(req.params.warehouseId);
      const trackingRecords = await uniqueCodeService.getWarehouseUniqueCodeTracking(warehouseId);
      
      res.json(trackingRecords);
    } catch (error) {
      console.error('获取仓库唯一码跟踪记录失败:', error);
      res.status(500).json({ 
        success: false, 
        message: '获取仓库唯一码跟踪记录失败: ' + error.message
      });
    }
  });
  
  // 获取产品唯一码跟踪记录
  router.get('/unique-codes/product/:productId', async (req: Request, res: Response) => {
    try {
      const productId = Number(req.params.productId);
      const trackingRecords = await uniqueCodeService.getProductUniqueCodeTracking(productId);
      
      res.json(trackingRecords);
    } catch (error) {
      console.error('获取产品唯一码跟踪记录失败:', error);
      res.status(500).json({ 
        success: false, 
        message: '获取产品唯一码跟踪记录失败: ' + error.message
      });
    }
  });
  
  // 生成唯一码跟踪报告
  router.get('/unique-codes/report', async (req: Request, res: Response) => {
    try {
      const filter: any = {};
      
      if (req.query.productId) filter.productId = Number(req.query.productId);
      if (req.query.warehouseId) filter.warehouseId = Number(req.query.warehouseId);
      if (req.query.status) filter.status = String(req.query.status);
      if (req.query.startDate) filter.startDate = new Date(String(req.query.startDate));
      if (req.query.endDate) filter.endDate = new Date(String(req.query.endDate));
      
      const report = await uniqueCodeService.generateUniqueCodeReport(filter);
      
      res.json(report);
    } catch (error) {
      console.error('生成唯一码跟踪报告失败:', error);
      res.status(500).json({ 
        success: false, 
        message: '生成唯一码跟踪报告失败: ' + error.message
      });
    }
  });
  
  return router;
}