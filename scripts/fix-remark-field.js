/**
 * 修复outbound_order_items表缺少remark字段的问题
 * 此脚本仅针对特定问题执行修复
 */

import mysql from 'mysql2/promise';

async function main() {
  try {
    console.log('开始修复outbound_order_items表...');
    
    // 连接到数据库
    console.log('正在连接到wlolly数据库...');
    const connection = await mysql.createConnection({
      host: '77.243.80.129',
      port: 3307,
      user: 'root',
      password: 'password',
      database: 'wlolly'
    });
    
    console.log('数据库连接成功');
    
    // 检查并修复outbound_order_items表的remark字段
    try {
      // 检查remark列是否存在
      const [remarkColumns] = await connection.execute(`SHOW COLUMNS FROM outbound_order_items LIKE 'remark'`);
      if (Array.isArray(remarkColumns) && remarkColumns.length === 0) {
        await connection.execute(`ALTER TABLE outbound_order_items ADD COLUMN remark TEXT NULL AFTER volume`);
        console.log('outbound_order_items表添加remark列成功');
      } else {
        console.log('outbound_order_items表中remark列已存在');
      }
    } catch (error) {
      console.error('修复outbound_order_items表失败:', error);
      throw error;
    }
    
    console.log('修复完成');
    
    // 关闭连接
    await connection.end();
    
  } catch (error) {
    console.error('修复脚本执行失败:', error);
    process.exit(1);
  }
}

// 运行修复脚本
main()
  .then(() => {
    console.log('修复脚本执行完成');
    process.exit(0);
  })
  .catch(error => {
    console.error('修复脚本执行失败:', error);
    process.exit(1);
  });