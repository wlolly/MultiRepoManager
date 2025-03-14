/**
 * 创建仓库调拨相关表的单独脚本
 */
import mysql from 'mysql2/promise';

async function createTransferTables() {
  console.log('开始创建仓库调拨表...');
  
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
    
    // 创建仓库调拨单表
    await connection.execute(`
      CREATE TABLE IF NOT EXISTS warehouse_transfers (
        id INT AUTO_INCREMENT PRIMARY KEY,
        reference_number VARCHAR(255) NOT NULL UNIQUE,
        source_warehouse_id INT NOT NULL,
        target_warehouse_id INT NOT NULL,
        total_items INT NOT NULL,
        total_packages INT NOT NULL,
        total_weight DECIMAL(10, 3) NOT NULL,
        total_volume DECIMAL(10, 6) NOT NULL,
        status VARCHAR(50) NOT NULL DEFAULT 'pending',
        created_by INT NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        completed_at TIMESTAMP NULL,
        outbound_order_id INT,
        inbound_order_id INT,
        notes TEXT,
        document_file_path VARCHAR(255),
        document_file_name VARCHAR(255),
        document_file_type VARCHAR(50),
        document_uploaded_at TIMESTAMP NULL,
        FOREIGN KEY (source_warehouse_id) REFERENCES warehouses(id),
        FOREIGN KEY (target_warehouse_id) REFERENCES warehouses(id),
        FOREIGN KEY (created_by) REFERENCES users(id)
      )
    `);
    console.log('warehouse_transfers 表已创建');
    
    // 创建仓库调拨单明细表
    await connection.execute(`
      CREATE TABLE IF NOT EXISTS warehouse_transfer_items (
        id INT AUTO_INCREMENT PRIMARY KEY,
        transfer_id INT NOT NULL,
        product_id INT NOT NULL,
        quantity INT NOT NULL,
        package_count INT NOT NULL,
        weight DECIMAL(10, 3) NOT NULL,
        volume DECIMAL(10, 6) NOT NULL,
        unique_code VARCHAR(255),
        remark TEXT,
        FOREIGN KEY (transfer_id) REFERENCES warehouse_transfers(id) ON DELETE CASCADE,
        FOREIGN KEY (product_id) REFERENCES products(id)
      )
    `);
    console.log('warehouse_transfer_items 表已创建');
    
    // 关闭连接
    await connection.end();
    
    console.log('仓库调拨表创建完成');
    
  } catch (error) {
    console.error('创建仓库调拨表失败:', error);
    process.exit(1);
  }
}

// 执行创建表函数
createTransferTables()
  .then(() => {
    console.log('脚本执行完成');
    process.exit(0);
  })
  .catch(error => {
    console.error('脚本执行失败:', error);
    process.exit(1);
  });