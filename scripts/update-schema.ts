import { drizzle } from 'drizzle-orm/mysql2';
import mysql from 'mysql2/promise';

// 数据库架构更新脚本
async function main() {
  console.log('开始更新数据库架构...');
  
  try {
    // 创建到指定数据库的连接
    console.log('正在连接到数据库...');
    const connection = await mysql.createConnection({
      host: '77.243.80.129',
      port: 3307,
      user: 'root',
      password: '@Hzca1575@',
      database: 'wlolly',
    });
    
    console.log('数据库连接成功');
    
    // 创建drizzle实例
    const db = drizzle(connection);
    
    // 执行表结构更新
    console.log('正在更新数据库表结构...');
    
    // 添加入库单订单类型
    await connection.execute(`
      ALTER TABLE \`inbound_orders\` 
      ADD COLUMN \`order_type\` VARCHAR(50) NOT NULL DEFAULT 'purchase' 
      AFTER \`status\`
    `);
    console.log('inbound_orders表已更新，添加了order_type字段');
    
    // 添加出库单订单类型和目的地类型
    await connection.execute(`
      ALTER TABLE \`outbound_orders\` 
      ADD COLUMN \`order_type\` VARCHAR(50) NOT NULL DEFAULT 'sale' 
      AFTER \`status\`,
      ADD COLUMN \`destination_type\` VARCHAR(50) DEFAULT 'customer' 
      AFTER \`order_type\`
    `);
    console.log('outbound_orders表已更新，添加了order_type和destination_type字段');
    
    // 创建入库单类型枚举表
    await connection.execute(`
      CREATE TABLE IF NOT EXISTS \`inbound_order_type_enum\` (
        \`value\` VARCHAR(20) NOT NULL PRIMARY KEY
      )
    `);
    
    // 添加入库单类型值
    await connection.execute(`
      INSERT IGNORE INTO \`inbound_order_type_enum\` (\`value\`) VALUES 
      ('purchase'), ('return'), ('transfer'), ('production')
    `);
    console.log('inbound_order_type_enum表已创建');
    
    // 创建出库单类型枚举表
    await connection.execute(`
      CREATE TABLE IF NOT EXISTS \`outbound_order_type_enum\` (
        \`value\` VARCHAR(20) NOT NULL PRIMARY KEY
      )
    `);
    
    // 添加出库单类型值
    await connection.execute(`
      INSERT IGNORE INTO \`outbound_order_type_enum\` (\`value\`) VALUES 
      ('sale'), ('return'), ('transfer'), ('scrap')
    `);
    console.log('outbound_order_type_enum表已创建');
    
    // 创建目的地类型枚举表
    await connection.execute(`
      CREATE TABLE IF NOT EXISTS \`destination_type_enum\` (
        \`value\` VARCHAR(20) NOT NULL PRIMARY KEY
      )
    `);
    
    // 添加目的地类型值
    await connection.execute(`
      INSERT IGNORE INTO \`destination_type_enum\` (\`value\`) VALUES 
      ('customer'), ('retail'), ('wholesale'), ('transfer'), ('supplier')
    `);
    console.log('destination_type_enum表已创建');
    
    console.log('数据库架构更新已完成');
    
    // 关闭连接
    await connection.end();
    
  } catch (error) {
    console.error('数据库架构更新失败:', error);
    process.exit(1);
  }
}

// 运行更新脚本
main()
  .then(() => {
    console.log('数据库架构更新脚本执行完成');
    process.exit(0);
  })
  .catch(error => {
    console.error('数据库架构更新脚本执行失败:', error);
    process.exit(1);
  });