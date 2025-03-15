/**
 * 为outbound_order_items表添加unique_code字段的脚本
 * 此脚本用于修复数据库结构，使其与schema定义一致
 */

import * as mysql from 'mysql2/promise';
import dotenv from 'dotenv';

dotenv.config();

async function main() {
  console.log("开始添加unique_code字段...");
  
  try {
    // 使用环境变量中的数据库URL创建连接
    const dbUrl = process.env.DATABASE_URL;
    
    if (!dbUrl) {
      throw new Error("数据库URL环境变量未设置");
    }
    
    console.log("连接到数据库...");
    const connection = await mysql.createConnection(dbUrl);
    
    // 获取数据库名称
    const dbName = dbUrl.split('/').pop()?.split('?')[0];
    
    // 检查出库单明细表是否已有unique_code字段
    console.log("检查出库单明细表的unique_code字段...");
    const [outboundColumns] = await connection.execute(`
      SELECT COLUMN_NAME 
      FROM INFORMATION_SCHEMA.COLUMNS 
      WHERE TABLE_SCHEMA = ? AND TABLE_NAME = 'outbound_order_items' AND COLUMN_NAME = 'unique_code'
    `, [dbName]);
    
    if ((outboundColumns as any[]).length === 0) {
      console.log("出库单明细表缺少unique_code字段，添加中...");
      await connection.execute(`
        ALTER TABLE outbound_order_items 
        ADD COLUMN unique_code VARCHAR(50) NULL COMMENT '唯一码' AFTER barcode
      `);
      console.log("出库单明细表的unique_code字段添加成功");
    } else {
      console.log("出库单明细表已存在unique_code字段，跳过");
    }
    
    // 检查仓库调拨明细表是否已有unique_code字段
    console.log("检查仓库调拨明细表的unique_code字段...");
    const [transferItemsColumns] = await connection.execute(`
      SELECT COLUMN_NAME 
      FROM INFORMATION_SCHEMA.COLUMNS 
      WHERE TABLE_SCHEMA = ? AND TABLE_NAME = 'warehouse_transfer_items' AND COLUMN_NAME = 'unique_code'
    `, [dbName]);
    
    if ((transferItemsColumns as any[]).length === 0) {
      console.log("仓库调拨明细表缺少unique_code字段，添加中...");
      await connection.execute(`
        ALTER TABLE warehouse_transfer_items 
        ADD COLUMN unique_code VARCHAR(50) NULL COMMENT '唯一码' AFTER product_id
      `);
      console.log("仓库调拨明细表的unique_code字段添加成功");
    } else {
      console.log("仓库调拨明细表已存在unique_code字段，跳过");
    }
    
    // 关闭数据库连接
    await connection.end();
    console.log("数据库连接已关闭");
    console.log("unique_code字段添加完成！");
  } catch (error) {
    console.error("发生错误：", error);
    process.exit(1);
  }
}

main().catch(console.error);