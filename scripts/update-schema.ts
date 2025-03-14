import { drizzle } from 'drizzle-orm/mysql2';
import mysql from 'mysql2/promise';

// 更新数据库表结构以添加新字段
async function main() {
  console.log('开始更新数据库表结构...');
  
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
    
    // 创建drizzle实例
    const db = drizzle(connection);
    
    // 创建入库单类型枚举类型
    try {
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
      
      console.log('inbound_order_type_enum 表已创建');
    } catch (error) {
      console.error('创建inbound_order_type_enum表失败:', error);
    }
    
    // 创建出库单类型枚举类型
    try {
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
      
      console.log('outbound_order_type_enum 表已创建');
    } catch (error) {
      console.error('创建outbound_order_type_enum表失败:', error);
    }
    
    // 创建出库单目的地类型枚举类型
    try {
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
      
      console.log('destination_type_enum 表已创建');
    } catch (error) {
      console.error('创建destination_type_enum表失败:', error);
    }
    
    // 更新inbound_orders表结构
    try {
      // 先检查是否已存在字段
      const [inboundColumns] = await connection.execute(`
        SHOW COLUMNS FROM \`inbound_orders\` LIKE 'order_type'
      `);
      
      if (Array.isArray(inboundColumns) && inboundColumns.length === 0) {
        await connection.execute(`
          ALTER TABLE \`inbound_orders\` 
          ADD COLUMN \`order_type\` ENUM('purchase', 'return', 'transfer', 'production') DEFAULT 'purchase'
        `);
        console.log('inbound_orders表已添加order_type字段');
      } else {
        console.log('inbound_orders表已存在order_type字段');
      }
    } catch (error) {
      console.error('更新inbound_orders表失败:', error);
    }
    
    // 更新outbound_orders表结构
    try {
      // 检查order_type字段
      const [outboundOrderTypeColumns] = await connection.execute(`
        SHOW COLUMNS FROM \`outbound_orders\` LIKE 'order_type'
      `);
      
      if (Array.isArray(outboundOrderTypeColumns) && outboundOrderTypeColumns.length === 0) {
        await connection.execute(`
          ALTER TABLE \`outbound_orders\` 
          ADD COLUMN \`order_type\` ENUM('sale', 'return', 'transfer', 'scrap') DEFAULT 'sale'
        `);
        console.log('outbound_orders表已添加order_type字段');
      } else {
        console.log('outbound_orders表已存在order_type字段');
      }
      
      // 检查destination_type字段
      const [outboundDestTypeColumns] = await connection.execute(`
        SHOW COLUMNS FROM \`outbound_orders\` LIKE 'destination_type'
      `);
      
      if (Array.isArray(outboundDestTypeColumns) && outboundDestTypeColumns.length === 0) {
        await connection.execute(`
          ALTER TABLE \`outbound_orders\` 
          ADD COLUMN \`destination_type\` ENUM('customer', 'retail', 'wholesale', 'transfer', 'supplier') DEFAULT 'customer'
        `);
        console.log('outbound_orders表已添加destination_type字段');
      } else {
        console.log('outbound_orders表已存在destination_type字段');
      }
    } catch (error) {
      console.error('更新outbound_orders表失败:', error);
    }
    
    console.log('数据库表结构更新完成');
    
    // 关闭连接
    await connection.end();
    
  } catch (error) {
    console.error('更新数据库表结构失败:', error);
    process.exit(1);
  }
}

// 运行更新脚本
main()
  .then(() => {
    console.log('数据库表结构更新完成');
    process.exit(0);
  })
  .catch(error => {
    console.error('数据库表结构更新失败:', error);
    process.exit(1);
  });