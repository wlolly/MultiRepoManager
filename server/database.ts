import { drizzle } from 'drizzle-orm/mysql2';
import mysql from 'mysql2/promise';
import * as schema from '@shared/schema';
import { log } from './vite';
import dotenv from 'dotenv';

// 加载环境变量
dotenv.config();

/**
 * 创建MySQL连接，包含智能重试机制
 * 优化了对数据库连接失败的处理，使用指数退避算法
 * 
 * @param retryAttempt 当前重试次数
 * @param maxRetries 最大重试次数
 * @returns 包含数据库连接和drizzle实例的对象，或在连接失败时返回null
 */
export async function createConnection(retryAttempt = 0, maxRetries = 5) {
  try {
    // 获取环境变量中的数据库连接字符串
    const dbUrl = process.env.DATABASE_URL;
    
    if (!dbUrl) {
      log('DATABASE_URL环境变量未设置', 'mysql-error');
      return null;
    }
    
    let host, port, user, password, database;
    
    try {
      // 正则解析连接URL，更可靠地处理特殊字符
      const mysqlRegex = /mysql:\/\/([^:]+):([^@]+)@([^:]+):(\d+)\/(.+)/;
      const match = dbUrl.match(mysqlRegex);
      
      if (match) {
        user = match[1];
        password = match[2]; // 不需要再次解码
        host = match[3];
        port = parseInt(match[4] || '3306');
        database = match[5];
      } else {
        // 备用解析方法
        const urlObj = new URL(dbUrl);
        host = urlObj.hostname;
        port = parseInt(urlObj.port || '3306');
        user = urlObj.username;
        password = urlObj.password; // 尝试直接使用
        database = urlObj.pathname.substring(1); // 移除开头的'/'
      }
    } catch (error) {
      log(`解析数据库URL失败: ${error}`, 'mysql-error');
      return null;
    }
    
    log(`连接到数据库 ${host}:${port}/${database} (尝试 ${retryAttempt + 1}/${maxRetries + 1})`, 'mysql');
    
    // 创建具有更多可靠性参数的连接，只使用mysql2支持的配置选项
    const connection = await mysql.createConnection({
      host,
      port,
      user,
      password,
      database,
      connectTimeout: 20000,      // 20秒连接超时
      ssl: undefined,             // 禁用SSL模式，解决SSL相关警告
      timezone: '+00:00',         // UTC时区
      charset: 'utf8mb4',         // 更好的字符集支持
      multipleStatements: true,   // 支持多语句查询
      dateStrings: true,          // 日期以字符串形式返回
      supportBigNumbers: true,    // 支持大数字
      bigNumberStrings: true,     // 大数字以字符串形式返回
      namedPlaceholders: true,    // 支持命名参数
    });
    
    // 设置会话变量，增加稳定性
    await connection.query(`
      SET SESSION wait_timeout=600;
      SET SESSION interactive_timeout=600;
      SET SESSION net_read_timeout=180;
      SET SESSION net_write_timeout=180;
      SET SESSION max_allowed_packet=16777216;
    `);

    log('MySQL数据库连接已建立，会话变量已设置', 'mysql');
    
    // 注册连接错误处理器
    connection.on('error', (err) => {
      log(`数据库连接发生错误: ${err.message}`, 'mysql-error');
      // 不终止进程，允许应用继续运行
    });
    
    // 使用drizzle-orm包装连接
    const db = drizzle(connection, { schema });
    
    return { connection, db };
  } catch (error: any) {
    log(`数据库连接失败: ${error.message}`, 'mysql-error');
    
    // 对特定错误进行重试，使用指数退避策略
    if (retryAttempt < maxRetries && 
        (error.code === 'ECONNREFUSED' || 
         error.code === 'ETIMEDOUT' || 
         error.code === 'PROTOCOL_CONNECTION_LOST' ||
         error.code === 'ER_ACCESS_DENIED_ERROR' ||
         error.code === 'ENOTFOUND')) {
      
      // 计算延迟时间，使用指数退避算法，但最长不超过30秒
      const delayMs = Math.min(Math.pow(2, retryAttempt) * 1000, 30000);
      log(`将在 ${delayMs/1000} 秒后重试连接...`, 'mysql');
      
      // 等待计算出的时间后再次尝试连接
      return new Promise((resolve) => {
        setTimeout(() => {
          resolve(createConnection(retryAttempt + 1, maxRetries));
        }, delayMs);
      });
    }
    
    // 如果重试次数达到上限或是非连接类错误
    log('数据库连接失败并超过最大重试次数，将返回null', 'mysql-warning');
    
    // 记录详细错误信息，帮助排查问题
    log(`错误代码: ${error.code || '未知'}`, 'mysql-error');
    log(`错误消息: ${error.message || '未知'}`, 'mysql-error');
    if (error.errno) log(`错误号: ${error.errno}`, 'mysql-error');
    if (error.sqlState) log(`SQL状态: ${error.sqlState}`, 'mysql-error');
    if (error.sqlMessage) log(`SQL消息: ${error.sqlMessage}`, 'mysql-error');
    
    // 返回null而不是抛出异常，允许应用优雅降级
    return null;
  }
}