import { drizzle } from 'drizzle-orm/mysql2';
import mysql from 'mysql2/promise';
import * as schema from '@shared/schema';
import { log } from './vite';
import dotenv from 'dotenv';

// 加载环境变量
dotenv.config();

// 创建MySQL连接池，包含重试机制
export async function createConnection(retryAttempt = 0, maxRetries = 3) {
  try {
    // 获取环境变量中的数据库连接字符串
    const dbUrl = process.env.DATABASE_URL;
    
    if (!dbUrl) {
      throw new Error('DATABASE_URL environment variable is not set');
    }
    
    // 解析连接URL
    const urlObj = new URL(dbUrl);
    const host = urlObj.hostname;
    const port = parseInt(urlObj.port || '3306');
    const user = urlObj.username;
    const password = decodeURIComponent(urlObj.password);
    const database = urlObj.pathname.substring(1); // 移除开头的'/'
    
    log(`Connecting to database (attempt ${retryAttempt + 1}/${maxRetries + 1})`, 'mysql');
    
    // 创建具有更多可靠性参数的连接
    const connection = await mysql.createConnection({
      host,
      port,
      user,
      password,
      database,
      connectTimeout: 20000, // 20秒连接超时
      // 禁用SSL模式，解决SSL相关警告
      ssl: undefined,
      // 为长连接设置会话变量
      timezone: '+00:00', // UTC时区
      charset: 'utf8mb4',
    });
    
    // 设置会话变量，增加稳定性
    await connection.query(`
      SET SESSION wait_timeout=600;
      SET SESSION interactive_timeout=600;
      SET SESSION net_read_timeout=120;
      SET SESSION net_write_timeout=120;
    `);

    log('MySQL database connection established', 'mysql');
    
    // 使用drizzle-orm包装连接，使用正确的drizzle配置格式
    const db = drizzle(connection);
    
    return { connection, db };
  } catch (error: any) {
    log(`Error connecting to database: ${error}`, 'mysql-error');
    
    // 如果是连接超时错误，并且尚未达到最大重试次数，则重试
    if ((error.code === 'ETIMEDOUT' || error.code === 'ECONNREFUSED') && retryAttempt < maxRetries) {
      const delayMs = Math.min(1000 * Math.pow(2, retryAttempt), 10000); // 指数退避，最大10秒
      log(`Will retry in ${delayMs}ms (attempt ${retryAttempt + 1}/${maxRetries})`, 'mysql');
      
      return new Promise((resolve) => {
        setTimeout(() => {
          resolve(createConnection(retryAttempt + 1, maxRetries));
        }, delayMs);
      });
    }
    
    // 如果重试次数已用完，或者是其他错误，则抛出异常
    throw error;
  }
}