/**
 * 唯一码跟踪API测试脚本
 * 
 * 这个脚本用于：
 * 1. 添加示例唯一码数据到跟踪系统
 * 2. 测试新添加的API路由功能
 */

import { db } from '../server/db';
import { sql } from 'drizzle-orm';
import mysql from 'mysql2/promise';
import dotenv from 'dotenv';

// 配置dotenv
dotenv.config();

async function main() {
  console.log('开始添加唯一码测试数据...');
  
  try {
    // 创建直接数据库连接，确保可以执行SQL语句
    const connection = await mysql.createConnection({
      host: '77.243.80.129',
      port: 3307,
      user: 'root',
      password: '@Hzca1575@',
      database: 'wlolly',
      connectTimeout: 60000,
    });
    
    console.log('数据库连接成功!');
    
    // 清理已存在的测试数据
    console.log('清理已存在的测试数据...');
    await connection.execute(`DELETE FROM unique_code_tracking WHERE unique_code LIKE 'TEST%'`);
    await connection.execute(`DELETE FROM unique_code_history WHERE unique_code LIKE 'TEST%'`);
    
    // 添加唯一码跟踪记录
    console.log('添加唯一码跟踪记录...');
    
    // 获取可用的产品和仓库ID
    const [products] = await connection.execute(`SELECT id, name FROM products LIMIT 5`);
    const [warehouses] = await connection.execute(`SELECT id, name, location FROM warehouses LIMIT 3`);
    
    if (!products || products.length === 0 || !warehouses || warehouses.length === 0) {
      console.error('没有可用的产品或仓库数据，请先运行初始化测试数据');
      await connection.end();
      process.exit(1);
    }
    
    const currentDate = new Date();
    const yesterday = new Date(currentDate);
    yesterday.setDate(yesterday.getDate() - 1);
    
    // 获取第一个产品和仓库的ID
    const product1Id = products[0].id;
    const product2Id = products[1].id;
    const product3Id = products[2].id;
    const warehouse1Id = warehouses[0].id;
    const warehouse2Id = warehouses[1].id;
    const warehouse3Id = warehouses[2].id;
    
    // 添加测试记录
    // 使用原生SQL查询添加数据
    // 添加第一条唯一码跟踪记录 - TEST001
    await connection.execute(`
      INSERT INTO unique_code_tracking 
      (unique_code, product_id, warehouse_id, current_status, quantity, last_operation_type, 
      inbound_order_id, inbound_item_id, transfer_id, transfer_item_id, outbound_order_id, 
      outbound_item_id, last_operation_date, created_at, updated_at, remark)
      VALUES 
      ('TEST001', ?, ?, 'in_stock', 1, 'inbound',
      1, 1, NULL, NULL, NULL, NULL, 
      ?, ?, ?, '测试唯一码-在库')
    `, [product1Id, warehouse1Id, currentDate, yesterday, currentDate]);
    
    // 添加第二条唯一码跟踪记录 - TEST002
    await connection.execute(`
      INSERT INTO unique_code_tracking 
      (unique_code, product_id, warehouse_id, current_status, quantity, last_operation_type, 
      inbound_order_id, inbound_item_id, transfer_id, transfer_item_id, outbound_order_id, 
      outbound_item_id, last_operation_date, created_at, updated_at, remark)
      VALUES 
      ('TEST002', ?, ?, 'in_stock', 1, 'transfer',
      1, 2, 1, 1, NULL, NULL, 
      ?, ?, ?, '测试唯一码-调拨后在库')
    `, [product2Id, warehouse2Id, currentDate, yesterday, currentDate]);
    
    // 添加第三条唯一码跟踪记录 - TEST003
    await connection.execute(`
      INSERT INTO unique_code_tracking 
      (unique_code, product_id, warehouse_id, current_status, quantity, last_operation_type, 
      inbound_order_id, inbound_item_id, transfer_id, transfer_item_id, outbound_order_id, 
      outbound_item_id, last_operation_date, created_at, updated_at, remark)
      VALUES 
      ('TEST003', ?, NULL, 'sold', 1, 'outbound',
      1, 3, NULL, NULL, 1, 1, 
      ?, ?, ?, '测试唯一码-已出库')
    `, [product3Id, currentDate, yesterday, currentDate]);
    
    console.log(`成功插入 3 条唯一码跟踪记录`);
    
    // 添加唯一码历史记录
    console.log('添加唯一码历史记录...');
    
    // TEST001 的历史记录 - 只有入库记录
    await connection.execute(`
      INSERT INTO unique_code_history 
      (unique_code, warehouse_id, product_id, operation_type, new_status, 
       order_id, order_item_id, operation_user_id, operation_date, remark)
      VALUES 
      ('TEST001', ?, ?, 'inbound', 'in_stock',
       1, 1, 1, ?, '测试唯一码历史记录-入库')
    `, [warehouse1Id, product1Id, yesterday]);
    
    // TEST002 的历史记录 - 有入库和调拨记录
    const test002InboundDate = new Date(yesterday.getTime() - 86400000);
    const test002TransferOutDate = new Date(yesterday.getTime() - 43200000);
    
    await connection.execute(`
      INSERT INTO unique_code_history 
      (unique_code, warehouse_id, product_id, operation_type, new_status, 
       order_id, order_item_id, operation_user_id, operation_date, remark)
      VALUES 
      ('TEST002', ?, ?, 'inbound', 'in_stock',
       1, 2, 1, ?, '测试唯一码历史记录-入库')
    `, [warehouse1Id, product2Id, test002InboundDate]);
    
    await connection.execute(`
      INSERT INTO unique_code_history 
      (unique_code, warehouse_id, product_id, operation_type, new_status, 
       order_id, order_item_id, operation_user_id, operation_date, remark)
      VALUES 
      ('TEST002', ?, ?, 'transfer_out', 'transferred',
       1, 1, 1, ?, '测试唯一码历史记录-调出')
    `, [warehouse1Id, product2Id, test002TransferOutDate]);
    
    await connection.execute(`
      INSERT INTO unique_code_history 
      (unique_code, warehouse_id, product_id, operation_type, new_status, 
       order_id, order_item_id, operation_user_id, operation_date, remark)
      VALUES 
      ('TEST002', ?, ?, 'transfer_in', 'in_stock',
       1, 1, 1, ?, '测试唯一码历史记录-调入')
    `, [warehouse2Id, product2Id, yesterday]);
    
    // TEST003 的历史记录 - 有入库和出库记录
    const test003InboundDate = new Date(yesterday.getTime() - 86400000);
    
    await connection.execute(`
      INSERT INTO unique_code_history 
      (unique_code, warehouse_id, product_id, operation_type, new_status, 
       order_id, order_item_id, operation_user_id, operation_date, remark)
      VALUES 
      ('TEST003', ?, ?, 'inbound', 'in_stock',
       1, 3, 1, ?, '测试唯一码历史记录-入库')
    `, [warehouse3Id, product3Id, test003InboundDate]);
    
    await connection.execute(`
      INSERT INTO unique_code_history 
      (unique_code, warehouse_id, product_id, operation_type, new_status, 
       order_id, order_item_id, operation_user_id, operation_date, remark)
      VALUES 
      ('TEST003', ?, ?, 'outbound', 'sold',
       1, 1, 1, ?, '测试唯一码历史记录-出库')
    `, [warehouse3Id, product3Id, yesterday]);
    
    console.log(`成功插入 6 条唯一码历史记录`);
    
    // 关闭数据库连接
    await connection.end();
    
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