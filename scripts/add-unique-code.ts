import mysql from 'mysql2/promise';

// 添加uniqueCode字段到products表的脚本
async function main() {
  console.log('开始添加uniqueCode字段到products表...');
  
  try {
    // 创建到指定数据库的连接
    console.log('正在连接到wlolly数据库...');
    const connection = await mysql.createConnection({
      host: '77.243.80.129',
      port: 3307,
      user: 'root',
      password: '@Hzca1575@',
      database: 'wlolly',
    });
    
    console.log('数据库连接成功');
    
    // 检查字段是否已存在
    console.log('检查unique_code字段是否存在...');
    const [columns] = await connection.execute(`
      SELECT COLUMN_NAME
      FROM INFORMATION_SCHEMA.COLUMNS 
      WHERE TABLE_SCHEMA = 'wlolly' 
      AND TABLE_NAME = 'products'
      AND COLUMN_NAME = 'unique_code'
    `);
    
    // @ts-ignore
    if (columns.length === 0) {
      console.log('正在添加unique_code字段...');
      await connection.execute(`
        ALTER TABLE products
        ADD COLUMN unique_code VARCHAR(255) NULL AFTER barcode
      `);
      console.log('unique_code字段已成功添加到products表');
    } else {
      console.log('unique_code字段已存在于products表中');
    }
    
    // 关闭连接
    await connection.end();
    console.log('数据库连接已关闭');
    
  } catch (error) {
    console.error('添加字段失败:', error);
    process.exit(1);
  }
}

main();