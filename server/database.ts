import { drizzle } from 'drizzle-orm/mysql2';
import mysql from 'mysql2/promise';
import * as schema from '@shared/schema';
import { log } from './vite';

// 创建MySQL连接池
export async function createConnection() {
  try {
    // 使用您提供的MySQL连接配置
    const connection = await mysql.createConnection({
      host: '77.243.80.129',
      port: 3307,
      user: 'root',
      password: '@Hzca1575@',
      database: 'wlolly',
    });

    log('MySQL database connection established', 'mysql');
    
    // 使用drizzle-orm包装连接
    const db = drizzle(connection);
    
    return { connection, db };
  } catch (error) {
    log(`Error connecting to database: ${error}`, 'mysql-error');
    throw error;
  }
}