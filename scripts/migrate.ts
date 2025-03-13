import { drizzle } from 'drizzle-orm/mysql2';
import mysql from 'mysql2/promise';
import * as schema from '../shared/schema';
import { migrate } from 'drizzle-orm/mysql2/migrator';
import path from 'path';

// 数据库迁移脚本
async function main() {
  console.log('开始数据库迁移...');
  
  try {
    // 首先创建到MySQL的连接(不指定数据库)
    console.log('正在连接到MySQL服务器...');
    const rootConnection = await mysql.createConnection({
      host: '77.243.80.129',
      port: 3307,
      user: 'root',
      password: '@Hzca1575@'
    });
    
    // 创建数据库(如果不存在)
    console.log('正在创建数据库...');
    await rootConnection.execute('CREATE DATABASE IF NOT EXISTS wlolly');
    console.log('数据库创建或已存在');
    
    // 关闭根连接
    await rootConnection.end();
    
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
    
    // 执行迁移
    console.log('正在生成数据库表...');
    
    // 创建必要的枚举类型表
    await createEnumTypes(connection);
    
    // 根据schema定义创建所有表
    await createAllTables(db);
    
    console.log('数据库迁移已完成');
    
    // 关闭连接
    await connection.end();
    
  } catch (error) {
    console.error('数据库迁移失败:', error);
    process.exit(1);
  }
}

async function createEnumTypes(connection: mysql.Connection) {
  console.log('正在创建枚举类型表...');
  
  // 创建语言枚举类型
  try {
    await connection.execute(`
      CREATE TABLE IF NOT EXISTS \`language_enum\` (
        \`value\` VARCHAR(2) NOT NULL PRIMARY KEY
      )
    `);
    
    // 添加语言值
    await connection.execute(`
      INSERT IGNORE INTO \`language_enum\` (\`value\`) VALUES 
      ('zh'), ('en'), ('ru'), ('kk'), ('uz')
    `);
    
    console.log('language_enum 表已创建');
  } catch (error) {
    console.error('创建language_enum表失败:', error);
  }
  
  // 创建仓库可见性枚举类型
  try {
    await connection.execute(`
      CREATE TABLE IF NOT EXISTS \`visibility_enum\` (
        \`value\` VARCHAR(10) NOT NULL PRIMARY KEY
      )
    `);
    
    // 添加可见性值
    await connection.execute(`
      INSERT IGNORE INTO \`visibility_enum\` (\`value\`) VALUES 
      ('public'), ('private'), ('internal')
    `);
    
    console.log('visibility_enum 表已创建');
  } catch (error) {
    console.error('创建visibility_enum表失败:', error);
  }
  
  // 创建编程语言枚举类型
  try {
    await connection.execute(`
      CREATE TABLE IF NOT EXISTS \`programming_language_enum\` (
        \`value\` VARCHAR(20) NOT NULL PRIMARY KEY
      )
    `);
    
    // 添加编程语言值
    await connection.execute(`
      INSERT IGNORE INTO \`programming_language_enum\` (\`value\`) VALUES 
      ('javascript'), ('typescript'), ('python'), ('java'), ('go'), 
      ('rust'), ('c'), ('cpp'), ('csharp'), ('php'), ('ruby'), 
      ('swift'), ('kotlin'), ('other')
    `);
    
    console.log('programming_language_enum 表已创建');
  } catch (error) {
    console.error('创建programming_language_enum表失败:', error);
  }
  
  // 创建活动类型枚举
  try {
    await connection.execute(`
      CREATE TABLE IF NOT EXISTS \`activity_type_enum\` (
        \`value\` VARCHAR(20) NOT NULL PRIMARY KEY
      )
    `);
    
    // 添加活动类型值
    await connection.execute(`
      INSERT IGNORE INTO \`activity_type_enum\` (\`value\`) VALUES 
      ('commit'), ('branch'), ('pull_request'), ('comment'), ('issue'), 
      ('release'), ('fork'), ('star'), ('update'), ('other')
    `);
    
    console.log('activity_type_enum 表已创建');
  } catch (error) {
    console.error('创建activity_type_enum表失败:', error);
  }
  
  // 创建操作类型枚举
  try {
    await connection.execute(`
      CREATE TABLE IF NOT EXISTS \`operation_type_enum\` (
        \`value\` VARCHAR(10) NOT NULL PRIMARY KEY
      )
    `);
    
    // 添加操作类型值
    await connection.execute(`
      INSERT IGNORE INTO \`operation_type_enum\` (\`value\`) VALUES 
      ('inbound'), ('outbound')
    `);
    
    console.log('operation_type_enum 表已创建');
  } catch (error) {
    console.error('创建operation_type_enum表失败:', error);
  }
}

async function createAllTables(db: any) {
  console.log('正在创建数据库表...');
  
  try {
    // 创建users表
    await db.execute(`
      CREATE TABLE IF NOT EXISTS \`users\` (
        \`id\` INT AUTO_INCREMENT PRIMARY KEY,
        \`username\` VARCHAR(255) NOT NULL UNIQUE,
        \`password\` VARCHAR(255) NOT NULL,
        \`full_name\` VARCHAR(255) NOT NULL,
        \`avatar_url\` VARCHAR(255),
        \`created_at\` TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);
    console.log('users 表已创建');
    
    // 创建repositories表
    await db.execute(`
      CREATE TABLE IF NOT EXISTS \`repositories\` (
        \`id\` INT AUTO_INCREMENT PRIMARY KEY,
        \`name\` VARCHAR(255) NOT NULL,
        \`description\` TEXT,
        \`owner_id\` INT NOT NULL,
        \`visibility\` ENUM('public', 'private', 'internal') NOT NULL DEFAULT 'public',
        \`language\` ENUM('javascript', 'typescript', 'python', 'java', 'go', 'rust', 'c', 'cpp', 'csharp', 'php', 'ruby', 'swift', 'kotlin', 'other') DEFAULT 'other',
        \`clone_url\` VARCHAR(255),
        \`branch_count\` INT DEFAULT 0,
        \`contributor_count\` INT DEFAULT 0,
        \`view_count\` INT DEFAULT 0,
        \`created_at\` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        \`updated_at\` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        FOREIGN KEY (\`owner_id\`) REFERENCES \`users\`(\`id\`)
      )
    `);
    console.log('repositories 表已创建');
    
    // 创建teams表
    await db.execute(`
      CREATE TABLE IF NOT EXISTS \`teams\` (
        \`id\` INT AUTO_INCREMENT PRIMARY KEY,
        \`name\` VARCHAR(255) NOT NULL,
        \`description\` TEXT,
        \`created_at\` TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);
    console.log('teams 表已创建');
    
    // 创建team_members表
    await db.execute(`
      CREATE TABLE IF NOT EXISTS \`team_members\` (
        \`id\` INT AUTO_INCREMENT PRIMARY KEY,
        \`team_id\` INT NOT NULL,
        \`user_id\` INT NOT NULL,
        \`is_admin\` BOOLEAN DEFAULT FALSE,
        FOREIGN KEY (\`team_id\`) REFERENCES \`teams\`(\`id\`),
        FOREIGN KEY (\`user_id\`) REFERENCES \`users\`(\`id\`)
      )
    `);
    console.log('team_members 表已创建');
    
    // 创建team_repositories表
    await db.execute(`
      CREATE TABLE IF NOT EXISTS \`team_repositories\` (
        \`id\` INT AUTO_INCREMENT PRIMARY KEY,
        \`team_id\` INT NOT NULL,
        \`repository_id\` INT NOT NULL,
        FOREIGN KEY (\`team_id\`) REFERENCES \`teams\`(\`id\`),
        FOREIGN KEY (\`repository_id\`) REFERENCES \`repositories\`(\`id\`)
      )
    `);
    console.log('team_repositories 表已创建');
    
    // 创建activities表
    await db.execute(`
      CREATE TABLE IF NOT EXISTS \`activities\` (
        \`id\` INT AUTO_INCREMENT PRIMARY KEY,
        \`repository_id\` INT NOT NULL,
        \`user_id\` INT NOT NULL,
        \`type\` ENUM('commit', 'branch', 'pull_request', 'comment', 'issue', 'release', 'fork', 'star', 'update', 'other') NOT NULL,
        \`summary\` VARCHAR(255) NOT NULL,
        \`details\` TEXT,
        \`branch\` VARCHAR(255),
        \`created_at\` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (\`repository_id\`) REFERENCES \`repositories\`(\`id\`),
        FOREIGN KEY (\`user_id\`) REFERENCES \`users\`(\`id\`)
      )
    `);
    console.log('activities 表已创建');
    
    // 仓库管理系统相关表
    
    // 创建products表
    await db.execute(`
      CREATE TABLE IF NOT EXISTS \`products\` (
        \`id\` INT AUTO_INCREMENT PRIMARY KEY,
        \`name\` VARCHAR(255) NOT NULL,
        \`barcode\` VARCHAR(255) NOT NULL UNIQUE,
        \`single_length_cm\` DECIMAL(10, 2) NOT NULL,
        \`single_width_cm\` DECIMAL(10, 2) NOT NULL,
        \`single_height_cm\` DECIMAL(10, 2) NOT NULL,
        \`single_volume_m3\` DECIMAL(10, 6) NOT NULL,
        \`single_weight_kg\` DECIMAL(10, 3) NOT NULL,
        \`bulk_width_cm\` DECIMAL(10, 2) NOT NULL,
        \`bulk_length_cm\` DECIMAL(10, 2) NOT NULL,
        \`bulk_height_cm\` DECIMAL(10, 2) NOT NULL,
        \`bulk_weight_kg\` DECIMAL(10, 3) NOT NULL,
        \`bulk_volume_m3\` DECIMAL(10, 6) NOT NULL,
        \`created_at\` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        \`updated_at\` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
      )
    `);
    console.log('products 表已创建');
    
    // 创建warehouses表
    await db.execute(`
      CREATE TABLE IF NOT EXISTS \`warehouses\` (
        \`id\` INT AUTO_INCREMENT PRIMARY KEY,
        \`name\` VARCHAR(255) NOT NULL,
        \`location\` VARCHAR(255) NOT NULL,
        \`capacity\` DECIMAL(10, 2) NOT NULL,
        \`created_at\` TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);
    console.log('warehouses 表已创建');
    
    // 创建inbound_orders表
    await db.execute(`
      CREATE TABLE IF NOT EXISTS \`inbound_orders\` (
        \`id\` INT AUTO_INCREMENT PRIMARY KEY,
        \`order_number\` VARCHAR(255) NOT NULL UNIQUE,
        \`warehouse_id\` INT NOT NULL,
        \`total_weight\` DECIMAL(10, 3) NOT NULL,
        \`total_volume\` DECIMAL(10, 6) NOT NULL,
        \`created_by\` INT NOT NULL,
        \`created_at\` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        \`status\` VARCHAR(50) NOT NULL DEFAULT 'pending',
        \`notes\` TEXT,
        FOREIGN KEY (\`warehouse_id\`) REFERENCES \`warehouses\`(\`id\`),
        FOREIGN KEY (\`created_by\`) REFERENCES \`users\`(\`id\`)
      )
    `);
    console.log('inbound_orders 表已创建');
    
    // 创建inbound_order_items表
    await db.execute(`
      CREATE TABLE IF NOT EXISTS \`inbound_order_items\` (
        \`id\` INT AUTO_INCREMENT PRIMARY KEY,
        \`inbound_order_id\` INT NOT NULL,
        \`product_id\` INT NOT NULL,
        \`quantity\` INT NOT NULL,
        \`weight\` DECIMAL(10, 3) NOT NULL,
        \`volume\` DECIMAL(10, 6) NOT NULL,
        FOREIGN KEY (\`inbound_order_id\`) REFERENCES \`inbound_orders\`(\`id\`),
        FOREIGN KEY (\`product_id\`) REFERENCES \`products\`(\`id\`)
      )
    `);
    console.log('inbound_order_items 表已创建');
    
    // 创建outbound_orders表
    await db.execute(`
      CREATE TABLE IF NOT EXISTS \`outbound_orders\` (
        \`id\` INT AUTO_INCREMENT PRIMARY KEY,
        \`order_number\` VARCHAR(255) NOT NULL UNIQUE,
        \`warehouse_id\` INT NOT NULL,
        \`total_weight\` DECIMAL(10, 3) NOT NULL,
        \`total_volume\` DECIMAL(10, 6) NOT NULL,
        \`created_by\` INT NOT NULL,
        \`created_at\` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        \`status\` VARCHAR(50) NOT NULL DEFAULT 'pending',
        \`notes\` TEXT,
        FOREIGN KEY (\`warehouse_id\`) REFERENCES \`warehouses\`(\`id\`),
        FOREIGN KEY (\`created_by\`) REFERENCES \`users\`(\`id\`)
      )
    `);
    console.log('outbound_orders 表已创建');
    
    // 创建outbound_order_items表
    await db.execute(`
      CREATE TABLE IF NOT EXISTS \`outbound_order_items\` (
        \`id\` INT AUTO_INCREMENT PRIMARY KEY,
        \`outbound_order_id\` INT NOT NULL,
        \`product_id\` INT NOT NULL,
        \`quantity\` INT NOT NULL,
        \`weight\` DECIMAL(10, 3) NOT NULL,
        \`volume\` DECIMAL(10, 6) NOT NULL,
        FOREIGN KEY (\`outbound_order_id\`) REFERENCES \`outbound_orders\`(\`id\`),
        FOREIGN KEY (\`product_id\`) REFERENCES \`products\`(\`id\`)
      )
    `);
    console.log('outbound_order_items 表已创建');
    
  } catch (error) {
    console.error('创建表失败:', error);
    throw error;
  }
}

// 运行迁移脚本
main()
  .then(() => {
    console.log('数据库迁移脚本执行完成');
    process.exit(0);
  })
  .catch(error => {
    console.error('数据库迁移脚本执行失败:', error);
    process.exit(1);
  });