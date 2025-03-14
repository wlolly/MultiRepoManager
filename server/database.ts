import { drizzle } from 'drizzle-orm/mysql2';
import mysql from 'mysql2/promise';
import * as schema from '@shared/schema';
import { log } from './vite';
import dotenv from 'dotenv';

// 加载环境变量
dotenv.config();

// 创建MySQL连接池
export async function createConnection() {
  try {
    // 获取环境变量中的数据库连接字符串
    const dbUrl = process.env.DATABASE_URL;
    
    if (!dbUrl) {
      throw new Error('DATABASE_URL environment variable is not set');
    }
    
    // 使用环境变量中的数据库连接字符串
    const connection = await mysql.createConnection(dbUrl);

    log('MySQL database connection established', 'mysql');
    
    // 使用drizzle-orm包装连接
    const db = drizzle(connection);
    
    return { connection, db };
  } catch (error) {
    log(`Error connecting to database: ${error}`, 'mysql-error');
    throw error;
  }
}