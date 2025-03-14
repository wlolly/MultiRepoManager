/**
 * 修复outbound_order_items和inbound_order_items表缺少remark字段的问题
 * 此脚本仅在特定情况下需要执行，用于修复数据库结构
 */

import * as mysql from 'mysql2/promise';
import dotenv from 'dotenv';

dotenv.config();

async function main() {
  console.log("开始修复remark字段...");
  
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
    
    // 检查出库单明细表是否已有remark字段
    console.log("检查出库单明细表的remark字段...");
    const [outboundColumns] = await connection.execute(`
      SELECT COLUMN_NAME 
      FROM INFORMATION_SCHEMA.COLUMNS 
      WHERE TABLE_SCHEMA = ? AND TABLE_NAME = 'outbound_order_items' AND COLUMN_NAME = 'remark'
    `, [dbName]);
    
    if ((outboundColumns as any[]).length === 0) {
      console.log("出库单明细表缺少remark字段，添加中...");
      await connection.execute(`
        ALTER TABLE outbound_order_items 
        ADD COLUMN remark TEXT NULL COMMENT '备注' AFTER volume
      `);
      console.log("出库单明细表的remark字段添加成功");
    } else {
      console.log("出库单明细表已存在remark字段，跳过");
    }
    
    // 检查入库单明细表是否已有remark字段
    console.log("检查入库单明细表的remark字段...");
    const [inboundColumns] = await connection.execute(`
      SELECT COLUMN_NAME 
      FROM INFORMATION_SCHEMA.COLUMNS 
      WHERE TABLE_SCHEMA = ? AND TABLE_NAME = 'inbound_order_items' AND COLUMN_NAME = 'remark'
    `, [dbName]);
    
    if ((inboundColumns as any[]).length === 0) {
      console.log("入库单明细表缺少remark字段，添加中...");
      await connection.execute(`
        ALTER TABLE inbound_order_items 
        ADD COLUMN remark TEXT NULL COMMENT '备注' AFTER volume
      `);
      console.log("入库单明细表的remark字段添加成功");
    } else {
      console.log("入库单明细表已存在remark字段，跳过");
    }
    
    // 检查是否存在remarks字段（错误拼写）并将数据转移到remark字段
    console.log("检查是否存在拼写错误的remarks字段...");
    
    try {
      const [outboundRemarksColumns] = await connection.execute(`
        SELECT COLUMN_NAME 
        FROM INFORMATION_SCHEMA.COLUMNS 
        WHERE TABLE_SCHEMA = ? AND TABLE_NAME = 'outbound_order_items' AND COLUMN_NAME = 'remarks'
      `, [dbName]);
      
      if ((outboundRemarksColumns as any[]).length > 0) {
        console.log("发现拼写错误的remarks字段，迁移数据...");
        await connection.execute(`
          UPDATE outbound_order_items
          SET remark = remarks
          WHERE remarks IS NOT NULL AND remarks != ''
        `);
        console.log("数据迁移完成，移除错误字段...");
        await connection.execute(`
          ALTER TABLE outbound_order_items
          DROP COLUMN remarks
        `);
        console.log("拼写错误的remarks字段已移除");
      }
    } catch (error) {
      console.log("检查拼写错误字段时出错，可能该字段不存在，跳过");
    }
    
    try {
      const [inboundRemarksColumns] = await connection.execute(`
        SELECT COLUMN_NAME 
        FROM INFORMATION_SCHEMA.COLUMNS 
        WHERE TABLE_SCHEMA = ? AND TABLE_NAME = 'inbound_order_items' AND COLUMN_NAME = 'remarks'
      `, [dbName]);
      
      if ((inboundRemarksColumns as any[]).length > 0) {
        console.log("发现拼写错误的remarks字段，迁移数据...");
        await connection.execute(`
          UPDATE inbound_order_items
          SET remark = remarks
          WHERE remarks IS NOT NULL AND remarks != ''
        `);
        console.log("数据迁移完成，移除错误字段...");
        await connection.execute(`
          ALTER TABLE inbound_order_items
          DROP COLUMN remarks
        `);
        console.log("拼写错误的remarks字段已移除");
      }
    } catch (error) {
      console.log("检查拼写错误字段时出错，可能该字段不存在，跳过");
    }
    
    // 关闭数据库连接
    await connection.end();
    console.log("数据库连接已关闭");
    console.log("remark字段修复完成！");
  } catch (error) {
    console.error("发生错误：", error);
    process.exit(1);
  }
}

main().catch(console.error);