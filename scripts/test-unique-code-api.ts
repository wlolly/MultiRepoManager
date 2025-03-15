/**
 * 唯一码跟踪API测试脚本
 * 
 * 这个脚本用于：
 * 1. 添加示例唯一码数据到跟踪系统
 * 2. 测试新添加的API路由功能
 */

import { db } from '../server/db';
import { sql } from 'drizzle-orm';

async function main() {
  console.log('开始添加唯一码测试数据...');
  
  try {
    // 清理已存在的测试数据
    console.log('清理已存在的测试数据...');
    await db.execute(sql`DELETE FROM unique_code_tracking WHERE unique_code LIKE 'TEST%'`);
    await db.execute(sql`DELETE FROM unique_code_history WHERE unique_code LIKE 'TEST%'`);
    
    // 添加唯一码跟踪记录
    console.log('添加唯一码跟踪记录...');
    
    // 获取可用的产品和仓库ID
    const products = await db.execute(sql`SELECT id, name FROM products LIMIT 5`);
    const warehouses = await db.execute(sql`SELECT id, name, location FROM warehouses LIMIT 3`);
    
    if (!products.rows || products.rows.length === 0 || !warehouses.rows || warehouses.rows.length === 0) {
      console.error('没有可用的产品或仓库数据，请先运行初始化测试数据');
      process.exit(1);
    }
    
    const currentDate = new Date();
    const yesterday = new Date(currentDate);
    yesterday.setDate(yesterday.getDate() - 1);
    
    // 添加测试记录
    // 使用原生SQL查询添加数据
    // 添加第一条唯一码跟踪记录 - TEST001
    await db.execute(sql`
      INSERT INTO unique_code_tracking 
      (unique_code, product_id, warehouse_id, current_status, quantity, last_operation_type, 
      inbound_order_id, inbound_item_id, transfer_id, transfer_item_id, outbound_order_id, 
      outbound_item_id, last_operation_date, created_at, updated_at, remark)
      VALUES 
      ('TEST001', ${products.rows[0].id}, ${warehouses.rows[0].id}, 'in_stock', 1, 'inbound',
      1, 1, NULL, NULL, NULL, NULL, 
      ${currentDate}, ${yesterday}, ${currentDate}, '测试唯一码-在库')
    `);
    
    // 添加第二条唯一码跟踪记录 - TEST002
    await db.execute(sql`
      INSERT INTO unique_code_tracking 
      (unique_code, product_id, warehouse_id, current_status, quantity, last_operation_type, 
      inbound_order_id, inbound_item_id, transfer_id, transfer_item_id, outbound_order_id, 
      outbound_item_id, last_operation_date, created_at, updated_at, remark)
      VALUES 
      ('TEST002', ${products.rows[1].id}, ${warehouses.rows[1].id}, 'in_stock', 1, 'transfer',
      1, 2, 1, 1, NULL, NULL, 
      ${currentDate}, ${yesterday}, ${currentDate}, '测试唯一码-调拨后在库')
    `);
    
    // 添加第三条唯一码跟踪记录 - TEST003
    await db.execute(sql`
      INSERT INTO unique_code_tracking 
      (unique_code, product_id, warehouse_id, current_status, quantity, last_operation_type, 
      inbound_order_id, inbound_item_id, transfer_id, transfer_item_id, outbound_order_id, 
      outbound_item_id, last_operation_date, created_at, updated_at, remark)
      VALUES 
      ('TEST003', ${products.rows[2].id}, NULL, 'sold', 1, 'outbound',
      1, 3, NULL, NULL, 1, 1, 
      ${currentDate}, ${yesterday}, ${currentDate}, '测试唯一码-已出库')
    `);
    
    console.log(`成功插入 3 条唯一码跟踪记录`);
    
    // 添加唯一码历史记录
    console.log('添加唯一码历史记录...');
    
    // TEST001 的历史记录 - 只有入库记录
    await db.execute(sql`
      INSERT INTO unique_code_history 
      (unique_code, warehouse_id, product_id, operation_type, new_status, 
       order_id, order_item_id, operation_user_id, operation_date, remark)
      VALUES 
      ('TEST001', ${warehouses.rows[0].id}, ${products.rows[0].id}, 'inbound', 'in_stock',
       1, 1, 1, ${yesterday}, '测试唯一码历史记录-入库')
    `);
    
    // TEST002 的历史记录 - 有入库和调拨记录
    const test002InboundDate = new Date(yesterday.getTime() - 86400000);
    const test002TransferOutDate = new Date(yesterday.getTime() - 43200000);
    
    await db.execute(sql`
      INSERT INTO unique_code_history 
      (unique_code, warehouse_id, product_id, operation_type, new_status, 
       order_id, order_item_id, operation_user_id, operation_date, remark)
      VALUES 
      ('TEST002', ${warehouses.rows[0].id}, ${products.rows[1].id}, 'inbound', 'in_stock',
       1, 2, 1, ${test002InboundDate}, '测试唯一码历史记录-入库')
    `);
    
    await db.execute(sql`
      INSERT INTO unique_code_history 
      (unique_code, warehouse_id, product_id, operation_type, new_status, 
       order_id, order_item_id, operation_user_id, operation_date, remark)
      VALUES 
      ('TEST002', ${warehouses.rows[0].id}, ${products.rows[1].id}, 'transfer_out', 'transferred',
       1, 1, 1, ${test002TransferOutDate}, '测试唯一码历史记录-调出')
    `);
    
    await db.execute(sql`
      INSERT INTO unique_code_history 
      (unique_code, warehouse_id, product_id, operation_type, new_status, 
       order_id, order_item_id, operation_user_id, operation_date, remark)
      VALUES 
      ('TEST002', ${warehouses.rows[1].id}, ${products.rows[1].id}, 'transfer_in', 'in_stock',
       1, 1, 1, ${yesterday}, '测试唯一码历史记录-调入')
    `);
    
    // TEST003 的历史记录 - 有入库和出库记录
    const test003InboundDate = new Date(yesterday.getTime() - 86400000);
    
    await db.execute(sql`
      INSERT INTO unique_code_history 
      (unique_code, warehouse_id, product_id, operation_type, new_status, 
       order_id, order_item_id, operation_user_id, operation_date, remark)
      VALUES 
      ('TEST003', ${warehouses.rows[2].id}, ${products.rows[2].id}, 'inbound', 'in_stock',
       1, 3, 1, ${test003InboundDate}, '测试唯一码历史记录-入库')
    `);
    
    await db.execute(sql`
      INSERT INTO unique_code_history 
      (unique_code, warehouse_id, product_id, operation_type, new_status, 
       order_id, order_item_id, operation_user_id, operation_date, remark)
      VALUES 
      ('TEST003', ${warehouses.rows[2].id}, ${products.rows[2].id}, 'outbound', 'sold',
       1, 1, 1, ${yesterday}, '测试唯一码历史记录-出库')
    `);
    
    console.log(`成功插入 6 条唯一码历史记录`);
    
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