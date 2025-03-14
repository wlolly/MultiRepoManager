// 脚本更新表结构以匹配schema.ts中的定义
import mysql from 'mysql2/promise';

async function main() {
  console.log('开始更新数据库结构...');
  
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
    
    // 安全地更新表结构，通过检查列是否存在来决定是否添加
    
    // 检查并更新products表
    console.log('更新products表...');
    try {
      // 首先检查列是否存在
      const [columns] = await connection.execute(`SHOW COLUMNS FROM products LIKE 'unique_code'`);
      if (Array.isArray(columns) && columns.length === 0) {
        await connection.execute(`ALTER TABLE products ADD COLUMN unique_code VARCHAR(255) NULL AFTER barcode`);
        console.log('products表添加unique_code列成功');
      } else {
        console.log('products表中unique_code列已存在');
      }
    } catch (error) {
      console.error('更新products表失败:', error);
    }
    
    // 检查并更新inbound_orders表
    console.log('更新inbound_orders表...');
    try {
      const [columns] = await connection.execute(`SHOW COLUMNS FROM inbound_orders LIKE 'order_type'`);
      if (Array.isArray(columns) && columns.length === 0) {
        await connection.execute(`ALTER TABLE inbound_orders ADD COLUMN order_type ENUM('purchase', 'return', 'transfer', 'production') DEFAULT 'purchase' AFTER status`);
        console.log('inbound_orders表添加order_type列成功');
      } else {
        console.log('inbound_orders表中order_type列已存在');
      }
    } catch (error) {
      console.error('更新inbound_orders表失败:', error);
    }
    
    // 检查并更新outbound_orders表
    console.log('更新outbound_orders表...');
    try {
      // 检查order_type列
      const [orderTypeColumns] = await connection.execute(`SHOW COLUMNS FROM outbound_orders LIKE 'order_type'`);
      if (Array.isArray(orderTypeColumns) && orderTypeColumns.length === 0) {
        await connection.execute(`ALTER TABLE outbound_orders ADD COLUMN order_type ENUM('sale', 'return', 'transfer', 'scrap') DEFAULT 'sale' AFTER status`);
        console.log('outbound_orders表添加order_type列成功');
      } else {
        console.log('outbound_orders表中order_type列已存在');
      }
      
      // 检查destination_type列
      const [destTypeColumns] = await connection.execute(`SHOW COLUMNS FROM outbound_orders LIKE 'destination_type'`);
      if (Array.isArray(destTypeColumns) && destTypeColumns.length === 0) {
        await connection.execute(`ALTER TABLE outbound_orders ADD COLUMN destination_type ENUM('customer', 'retail', 'wholesale', 'transfer', 'supplier') DEFAULT 'customer' AFTER order_type`);
        console.log('outbound_orders表添加destination_type列成功');
      } else {
        console.log('outbound_orders表中destination_type列已存在');
      }
    } catch (error) {
      console.error('更新outbound_orders表失败:', error);
    }
    
    // 检查并更新inbound_order_items表
    console.log('更新inbound_order_items表...');
    try {
      // 检查product_name列
      const [productNameColumns] = await connection.execute(`SHOW COLUMNS FROM inbound_order_items LIKE 'product_name'`);
      if (Array.isArray(productNameColumns) && productNameColumns.length === 0) {
        await connection.execute(`ALTER TABLE inbound_order_items ADD COLUMN product_name VARCHAR(255) NOT NULL AFTER product_id`);
        console.log('inbound_order_items表添加product_name列成功');
      } else {
        console.log('inbound_order_items表中product_name列已存在');
      }
      
      // 检查barcode列
      const [barcodeColumns] = await connection.execute(`SHOW COLUMNS FROM inbound_order_items LIKE 'barcode'`);
      if (Array.isArray(barcodeColumns) && barcodeColumns.length === 0) {
        await connection.execute(`ALTER TABLE inbound_order_items ADD COLUMN barcode VARCHAR(255) NOT NULL AFTER product_name`);
        console.log('inbound_order_items表添加barcode列成功');
      } else {
        console.log('inbound_order_items表中barcode列已存在');
      }
      
      // 检查external_order_number列
      const [extOrderColumns] = await connection.execute(`SHOW COLUMNS FROM inbound_order_items LIKE 'external_order_number'`);
      if (Array.isArray(extOrderColumns) && extOrderColumns.length === 0) {
        await connection.execute(`ALTER TABLE inbound_order_items ADD COLUMN external_order_number VARCHAR(255) NULL AFTER barcode`);
        console.log('inbound_order_items表添加external_order_number列成功');
      } else {
        console.log('inbound_order_items表中external_order_number列已存在');
      }
      
      // 检查package_count列
      const [packageCountColumns] = await connection.execute(`SHOW COLUMNS FROM inbound_order_items LIKE 'package_count'`);
      if (Array.isArray(packageCountColumns) && packageCountColumns.length === 0) {
        await connection.execute(`ALTER TABLE inbound_order_items ADD COLUMN package_count INT NOT NULL DEFAULT 1 AFTER quantity`);
        console.log('inbound_order_items表添加package_count列成功');
      } else {
        console.log('inbound_order_items表中package_count列已存在');
      }
      
      // 检查remark列
      const [remarkColumns] = await connection.execute(`SHOW COLUMNS FROM inbound_order_items LIKE 'remark'`);
      if (Array.isArray(remarkColumns) && remarkColumns.length === 0) {
        await connection.execute(`ALTER TABLE inbound_order_items ADD COLUMN remark TEXT NULL AFTER volume`);
        console.log('inbound_order_items表添加remark列成功');
      } else {
        console.log('inbound_order_items表中remark列已存在');
      }
    } catch (error) {
      console.error('更新inbound_order_items表失败:', error);
    }
    
    // 检查并更新outbound_order_items表
    console.log('更新outbound_order_items表...');
    try {
      // 检查product_name列
      const [productNameColumns] = await connection.execute(`SHOW COLUMNS FROM outbound_order_items LIKE 'product_name'`);
      if (Array.isArray(productNameColumns) && productNameColumns.length === 0) {
        await connection.execute(`ALTER TABLE outbound_order_items ADD COLUMN product_name VARCHAR(255) NOT NULL AFTER product_id`);
        console.log('outbound_order_items表添加product_name列成功');
      } else {
        console.log('outbound_order_items表中product_name列已存在');
      }
      
      // 检查barcode列
      const [barcodeColumns] = await connection.execute(`SHOW COLUMNS FROM outbound_order_items LIKE 'barcode'`);
      if (Array.isArray(barcodeColumns) && barcodeColumns.length === 0) {
        await connection.execute(`ALTER TABLE outbound_order_items ADD COLUMN barcode VARCHAR(255) NOT NULL AFTER product_name`);
        console.log('outbound_order_items表添加barcode列成功');
      } else {
        console.log('outbound_order_items表中barcode列已存在');
      }
      
      // 检查external_order_number列
      const [extOrderColumns] = await connection.execute(`SHOW COLUMNS FROM outbound_order_items LIKE 'external_order_number'`);
      if (Array.isArray(extOrderColumns) && extOrderColumns.length === 0) {
        await connection.execute(`ALTER TABLE outbound_order_items ADD COLUMN external_order_number VARCHAR(255) NULL AFTER barcode`);
        console.log('outbound_order_items表添加external_order_number列成功');
      } else {
        console.log('outbound_order_items表中external_order_number列已存在');
      }
      
      // 检查package_count列
      const [packageCountColumns] = await connection.execute(`SHOW COLUMNS FROM outbound_order_items LIKE 'package_count'`);
      if (Array.isArray(packageCountColumns) && packageCountColumns.length === 0) {
        await connection.execute(`ALTER TABLE outbound_order_items ADD COLUMN package_count INT NOT NULL DEFAULT 1 AFTER quantity`);
        console.log('outbound_order_items表添加package_count列成功');
      } else {
        console.log('outbound_order_items表中package_count列已存在');
      }
      
      // 检查remark列
      const [remarkColumns] = await connection.execute(`SHOW COLUMNS FROM outbound_order_items LIKE 'remark'`);
      if (Array.isArray(remarkColumns) && remarkColumns.length === 0) {
        await connection.execute(`ALTER TABLE outbound_order_items ADD COLUMN remark TEXT NULL AFTER volume`);
        console.log('outbound_order_items表添加remark列成功');
      } else {
        console.log('outbound_order_items表中remark列已存在');
      }
    } catch (error) {
      console.error('更新outbound_order_items表失败:', error);
    }
    
    console.log('数据库结构更新完成');
    
    // 关闭连接
    await connection.end();
    
  } catch (error) {
    console.error('数据库结构更新失败:', error);
    process.exit(1);
  }
}

// 运行更新脚本
main()
  .then(() => {
    console.log('数据库结构更新脚本执行完成');
    process.exit(0);
  })
  .catch(error => {
    console.error('数据库结构更新脚本执行失败:', error);
    process.exit(1);
  });