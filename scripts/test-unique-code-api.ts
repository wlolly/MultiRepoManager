/**
 * 唯一码跟踪API测试脚本
 * 
 * 这个脚本用于：
 * 1. 添加示例唯一码数据到跟踪系统
 * 2. 测试新添加的API路由功能
 */

import { db } from '../server/db';
import { uniqueCodeTracking, uniqueCodeHistory } from '../shared/schema';
import { sql } from 'drizzle-orm';

async function main() {
  console.log('开始添加唯一码测试数据...');
  
  try {
    // 清理已存在的测试数据
    console.log('清理已存在的测试数据...');
    await db.delete(uniqueCodeTracking).where(sql`uniqueCode LIKE ${'TEST%'}`);
    await db.delete(uniqueCodeHistory).where(sql`uniqueCode LIKE ${'TEST%'}`);
    
    // 添加唯一码跟踪记录
    console.log('添加唯一码跟踪记录...');
    
    // 获取可用的产品和仓库ID
    const products = await db.query.products.findMany({
      limit: 5
    });
    
    const warehouses = await db.query.warehouses.findMany({
      limit: 3
    });
    
    if (products.length === 0 || warehouses.length === 0) {
      console.error('没有可用的产品或仓库数据，请先运行初始化测试数据');
      process.exit(1);
    }
    
    const currentDate = new Date();
    const yesterday = new Date(currentDate);
    yesterday.setDate(yesterday.getDate() - 1);
    
    // 添加测试记录
    const trackingRecords = [
      {
        uniqueCode: 'TEST001',
        productId: products[0].id,
        warehouseId: warehouses[0].id,
        status: 'in_stock',
        quantity: 1,
        lastOperationType: 'inbound',
        inboundOrderId: 1,
        inboundItemId: 1,
        transferId: null,
        transferItemId: null,
        outboundOrderId: null,
        outboundItemId: null,
        lastOperationUserId: 1,
        lastOperationDate: currentDate,
        createdAt: yesterday,
        updatedAt: currentDate,
        remark: '测试唯一码-在库'
      },
      {
        uniqueCode: 'TEST002',
        productId: products[1].id,
        warehouseId: warehouses[1].id,
        status: 'in_stock',
        quantity: 1,
        lastOperationType: 'transfer',
        inboundOrderId: 1,
        inboundItemId: 2,
        transferId: 1,
        transferItemId: 1,
        outboundOrderId: null,
        outboundItemId: null,
        lastOperationUserId: 1,
        lastOperationDate: currentDate,
        createdAt: yesterday,
        updatedAt: currentDate,
        remark: '测试唯一码-调拨后在库'
      },
      {
        uniqueCode: 'TEST003',
        productId: products[2].id,
        warehouseId: null,
        status: 'sold',
        quantity: 1,
        lastOperationType: 'outbound',
        inboundOrderId: 1,
        inboundItemId: 3,
        transferId: null,
        transferItemId: null,
        outboundOrderId: 1,
        outboundItemId: 1,
        lastOperationUserId: 1,
        lastOperationDate: currentDate,
        createdAt: yesterday,
        updatedAt: currentDate,
        remark: '测试唯一码-已出库'
      }
    ];
    
    const insertResult = await db.insert(uniqueCodeTracking).values(trackingRecords);
    console.log(`成功插入 ${trackingRecords.length} 条唯一码跟踪记录`);
    
    // 添加唯一码历史记录
    console.log('添加唯一码历史记录...');
    
    // TEST001 的历史记录 - 只有入库记录
    const historyRecords = [
      {
        uniqueCode: 'TEST001',
        warehouseId: warehouses[0].id,
        productId: products[0].id,
        operationType: 'inbound',
        newStatus: 'in_stock',
        operationId: 1,
        operationItemId: 1,
        operationUserId: 1,
        operationDate: yesterday,
        details: 'TEST001 入库',
        remark: '测试唯一码历史记录-入库'
      },
      
      // TEST002 的历史记录 - 有入库和调拨记录
      {
        uniqueCode: 'TEST002',
        warehouseId: warehouses[0].id,
        productId: products[1].id,
        operationType: 'inbound',
        newStatus: 'in_stock',
        operationId: 1,
        operationItemId: 2,
        operationUserId: 1,
        operationDate: new Date(yesterday.getTime() - 86400000),
        details: 'TEST002 入库',
        remark: '测试唯一码历史记录-入库'
      },
      {
        uniqueCode: 'TEST002',
        warehouseId: warehouses[0].id,
        productId: products[1].id,
        operationType: 'transfer_out',
        newStatus: 'transferred',
        operationId: 1,
        operationItemId: 1,
        operationUserId: 1,
        operationDate: new Date(yesterday.getTime() - 43200000),
        details: 'TEST002 从仓库 ' + warehouses[0].id + ' 调出',
        remark: '测试唯一码历史记录-调出'
      },
      {
        uniqueCode: 'TEST002',
        warehouseId: warehouses[1].id,
        productId: products[1].id,
        operationType: 'transfer_in',
        newStatus: 'in_stock',
        operationId: 1,
        operationItemId: 1,
        operationUserId: 1,
        operationDate: yesterday,
        details: 'TEST002 调入仓库 ' + warehouses[1].id,
        remark: '测试唯一码历史记录-调入'
      },
      
      // TEST003 的历史记录 - 有入库和出库记录
      {
        uniqueCode: 'TEST003',
        warehouseId: warehouses[2].id,
        productId: products[2].id,
        operationType: 'inbound',
        newStatus: 'in_stock',
        operationId: 1,
        operationItemId: 3,
        operationUserId: 1,
        operationDate: new Date(yesterday.getTime() - 86400000),
        details: 'TEST003 入库',
        remark: '测试唯一码历史记录-入库'
      },
      {
        uniqueCode: 'TEST003',
        warehouseId: warehouses[2].id,
        productId: products[2].id,
        operationType: 'outbound',
        newStatus: 'sold',
        operationId: 1,
        operationItemId: 1,
        operationUserId: 1,
        operationDate: yesterday,
        details: 'TEST003 出库',
        remark: '测试唯一码历史记录-出库'
      }
    ];
    
    const historyResult = await db.insert(uniqueCodeHistory).values(historyRecords);
    console.log(`成功插入 ${historyRecords.length} 条唯一码历史记录`);
    
    console.log('测试数据添加完成！现在您可以通过API测试唯一码跟踪功能了');
    console.log('示例API:');
    console.log('- 获取唯一码跟踪记录: GET http://localhost:5000/api/unique-code/TEST001');
    console.log('- 获取唯一码历史记录: GET http://localhost:5000/api/unique-code/TEST001/history');
    console.log('- 验证唯一码是否可用: GET http://localhost:5000/api/unique-code/TEST001/verify');
    console.log('- 获取仓库内唯一码列表: GET http://localhost:5000/api/warehouses/1/unique-codes');
    console.log('- 获取产品唯一码列表: GET http://localhost:5000/api/products/1/unique-codes');
    console.log('- 生成唯一码报告: GET http://localhost:5000/api/unique-code-report');
    
  } catch (error) {
    console.error('添加唯一码测试数据时出错:', error);
  } finally {
    process.exit(0);
  }
}

main().catch(console.error);