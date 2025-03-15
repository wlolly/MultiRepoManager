/**
 * 创建唯一码跟踪表的脚本
 * 该表用于跟踪每个唯一码的历史和当前状态
 */
import mysql from 'mysql2/promise';
import dotenv from 'dotenv';

dotenv.config();

async function createUniqueCodeTrackingTable() {
  console.log('开始创建唯一码跟踪表...');
  
  // 创建数据库连接
  const connection = await mysql.createConnection({
    host: '77.243.80.129',
    port: 3307,
    user: 'root',
    password: '@Hzca1575@',
    database: 'wlolly',
    connectTimeout: 60000, // 60s connection timeout
  });

  try {
    // 创建唯一码跟踪表
    await connection.execute(`
      CREATE TABLE IF NOT EXISTS unique_code_tracking (
        id INT AUTO_INCREMENT PRIMARY KEY,
        unique_code VARCHAR(50) NOT NULL,
        product_id INT NOT NULL,
        warehouse_id INT NOT NULL,
        current_status ENUM('in_stock', 'transferred', 'sold', 'returned', 'scrapped') NOT NULL DEFAULT 'in_stock',
        quantity INT NOT NULL DEFAULT 1,
        inbound_order_id INT,
        inbound_item_id INT,
        outbound_order_id INT,
        outbound_item_id INT,
        transfer_id INT,
        transfer_item_id INT,
        last_operation_type ENUM('inbound', 'outbound', 'transfer', 'adjust') NOT NULL,
        last_operation_date TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
        remark TEXT,
        created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        FOREIGN KEY (product_id) REFERENCES products(id),
        FOREIGN KEY (warehouse_id) REFERENCES warehouses(id),
        FOREIGN KEY (inbound_order_id) REFERENCES inbound_orders(id) ON DELETE SET NULL,
        FOREIGN KEY (outbound_order_id) REFERENCES outbound_orders(id) ON DELETE SET NULL,
        FOREIGN KEY (transfer_id) REFERENCES warehouse_transfers(id) ON DELETE SET NULL,
        UNIQUE (unique_code)
      )
    `);
    console.log('唯一码跟踪表已创建');

    // 创建唯一码流转历史表
    await connection.execute(`
      CREATE TABLE IF NOT EXISTS unique_code_history (
        id INT AUTO_INCREMENT PRIMARY KEY,
        unique_code VARCHAR(50) NOT NULL,
        product_id INT NOT NULL,
        warehouse_id INT NOT NULL,
        operation_type ENUM('inbound', 'outbound', 'transfer_in', 'transfer_out', 'adjust') NOT NULL,
        quantity INT NOT NULL DEFAULT 1,
        order_id INT,
        order_item_id INT,
        transfer_id INT,
        transfer_item_id INT,
        old_status ENUM('in_stock', 'transferred', 'sold', 'returned', 'scrapped'),
        new_status ENUM('in_stock', 'transferred', 'sold', 'returned', 'scrapped') NOT NULL,
        operation_date TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
        user_id INT,
        remark TEXT,
        FOREIGN KEY (product_id) REFERENCES products(id),
        FOREIGN KEY (warehouse_id) REFERENCES warehouses(id),
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL,
        INDEX (unique_code),
        INDEX (operation_date)
      )
    `);
    console.log('唯一码流转历史表已创建');
    
    console.log('唯一码跟踪系统表创建完成！');
  } catch (error) {
    console.error('创建唯一码跟踪表时出错:', error);
  } finally {
    await connection.end();
    console.log('数据库连接已关闭');
  }
}

// 执行创建表操作
createUniqueCodeTrackingTable().catch(console.error);