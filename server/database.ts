import { drizzle } from 'drizzle-orm/mysql2';
import mysql from 'mysql2/promise';
import * as schema from '@shared/schema';
import { log } from './vite';
import dotenv from 'dotenv';
import fs from 'fs';
import path from 'path';

// 加载环境变量
dotenv.config();

// 打印环境变量和配置信息以便排查问题
console.log('=== 数据库配置信息 ===');
console.log(`DB_HOST: ${process.env.DB_HOST || '未设置'}`);
console.log(`DB_PORT: ${process.env.DB_PORT || '未设置'}`);
console.log(`DB_USER: ${process.env.DB_USER || '未设置'}`);
console.log(`DB_NAME: ${process.env.DB_NAME || '未设置'}`);
console.log(`DB_PASSWORD: ${process.env.DB_PASSWORD ? '已设置' : '未设置'}`);
console.log(`DATABASE_URL: ${process.env.DATABASE_URL ? '已设置' : '未设置'}`);

// 检查.env文件
try {
  const envPath = path.resolve(process.cwd(), '.env');
  console.log(`[配置检查] .env文件路径: ${envPath}`);
  if (fs.existsSync(envPath)) {
    const envContent = fs.readFileSync(envPath, 'utf8');
    console.log('[配置检查] .env文件存在，内容长度:', envContent.length);
    // 仅输出不包含敏感信息的前50个字符
    const safePreview = envContent.substring(0, 50).replace(/=.*$/gm, '=***');
    console.log('[配置检查] .env文件预览:', safePreview);
  } else {
    console.log('[配置检查] .env文件不存在');
  }
} catch (err) {
  console.error('[配置检查] 读取.env文件时出错:', err);
}

/**
 * 创建MySQL连接，使用分离的环境变量而不是URL
 * 优化了对数据库连接失败的处理，使用指数退避算法
 * 
 * @param retryAttempt 当前重试次数
 * @param maxRetries 最大重试次数
 * @returns 包含数据库连接和drizzle实例的对象，或在连接失败时返回null
 */
export async function createConnection(retryAttempt = 0, maxRetries = 5) {
  try {
    // 优先使用分离的配置变量而不是URL
    const host = process.env.DB_HOST || "77.243.80.129";
    const port = parseInt(process.env.DB_PORT || "3307", 10);
    const user = process.env.DB_USER || "root";
    const password = process.env.DB_PASSWORD || "@Hzca1575@";
    const database = process.env.DB_NAME || "wlolly";
    
    // 打印当前尝试的连接信息
    console.log(`[数据库] 连接尝试 ${retryAttempt + 1}/${maxRetries + 1}`);
    console.log(`[数据库] 连接到: ${host}:${port}/${database}`);
    console.log(`[数据库] 用户名: ${user}, 密码长度: ${password ? password.length : 0}`);
    
    
    log(`连接到数据库 ${host}:${port}/${database} (尝试 ${retryAttempt + 1}/${maxRetries + 1})`, 'mysql');
    console.log(`尝试连接: host=${host}, port=${port}, user=${user}, database=${database}, password长度=${password ? password.length : 0}`);
    
    // 创建具有更多可靠性参数的连接，只使用mysql2支持的配置选项
    const connection = await mysql.createConnection({
      host,
      port,
      user,
      password,
      database,
      connectTimeout: 60000,      // 60秒连接超时，增加连接超时时间
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
    const db = drizzle(connection as any, { schema, mode: 'default' });
    
    console.log('[数据库] 成功创建数据库连接, 并绑定drizzle ORM');
    return { connection, db };
  } catch (error: any) {
    log(`数据库连接失败: ${error.message}`, 'mysql-error');
    console.error(`[数据库] 连接失败: ${error.message}`);
    
    // 检查.env文件中的环境变量是否正确
    if (error.code === 'ER_ACCESS_DENIED_ERROR') {
      console.error('[数据库] 访问被拒绝，请检查用户名和密码是否正确');
      console.error(`[数据库] 当前用户名: ${process.env.DB_USER || '未设置'}`);
      console.error('[数据库] 密码是否已设置: ' + (process.env.DB_PASSWORD ? '是' : '否'));
    } else if (error.code === 'ECONNREFUSED') {
      console.error('[数据库] 连接被拒绝，请检查数据库服务器是否运行及端口是否正确');
      console.error(`[数据库] 当前主机: ${process.env.DB_HOST || '未设置'}`);
      console.error(`[数据库] 当前端口: ${process.env.DB_PORT || '未设置'}`);
    } else if (error.code === 'ER_BAD_DB_ERROR') {
      console.error('[数据库] 数据库不存在，请检查数据库名称是否正确');
      console.error(`[数据库] 当前数据库名: ${process.env.DB_NAME || '未设置'}`);
    } else if (error.code === 'ER_DBACCESS_DENIED_ERROR') {
      console.error('[数据库] 对特定数据库的访问被拒绝，请检查用户是否有访问该数据库的权限');
      console.error(`[数据库] 当前数据库名: ${process.env.DB_NAME || '未设置'}`);
      console.error(`[数据库] 当前用户名: ${process.env.DB_USER || '未设置'}`);
    }
    
    // 对特定错误进行重试，使用指数退避策略
    if (retryAttempt < maxRetries && 
        (error.code === 'ECONNREFUSED' || 
         error.code === 'ETIMEDOUT' || 
         error.code === 'PROTOCOL_CONNECTION_LOST' ||
         error.code === 'ER_ACCESS_DENIED_ERROR' ||
         error.code === 'ENOTFOUND' ||
         error.code === 'ER_BAD_DB_ERROR')) {
      
      // 计算延迟时间，使用指数退避算法，但最长不超过30秒
      const delayMs = Math.min(Math.pow(2, retryAttempt) * 1000, 30000);
      log(`将在 ${delayMs/1000} 秒后重试连接...`, 'mysql');
      console.log(`[数据库] 尝试 ${retryAttempt + 1}/${maxRetries + 1} 失败，将在 ${delayMs/1000} 秒后重试...`);
      
      // 等待计算出的时间后再次尝试连接
      return new Promise((resolve) => {
        setTimeout(() => {
          resolve(createConnection(retryAttempt + 1, maxRetries));
        }, delayMs);
      });
    }
    
    // 如果重试次数达到上限或是非连接类错误
    log('数据库连接失败并超过最大重试次数，将返回null', 'mysql-warning');
    console.error('[数据库] 连接尝试已达最大次数，放弃连接');
    
    // 记录详细错误信息，帮助排查问题
    log(`错误代码: ${error.code || '未知'}`, 'mysql-error');
    log(`错误消息: ${error.message || '未知'}`, 'mysql-error');
    console.error(`[数据库] 错误代码: ${error.code || '未知'}`);
    console.error(`[数据库] 错误消息: ${error.message || '未知'}`);
    
    if (error.errno) {
      log(`错误号: ${error.errno}`, 'mysql-error');
      console.error(`[数据库] 错误号: ${error.errno}`);
    }
    if (error.sqlState) {
      log(`SQL状态: ${error.sqlState}`, 'mysql-error');
      console.error(`[数据库] SQL状态: ${error.sqlState}`);
    }
    if (error.sqlMessage) {
      log(`SQL消息: ${error.sqlMessage}`, 'mysql-error');
      console.error(`[数据库] SQL消息: ${error.sqlMessage}`);
    }
    
    // 输出环境信息以帮助排查问题
    console.error('[数据库] 环境变量检查:');
    console.error(`[数据库] NODE_ENV: ${process.env.NODE_ENV || '未设置'}`);
    console.error(`[数据库] DB_HOST: ${process.env.DB_HOST || '未设置'}`);
    console.error(`[数据库] DB_PORT: ${process.env.DB_PORT || '未设置'}`);
    console.error(`[数据库] DB_USER: ${process.env.DB_USER || '未设置'}`);
    console.error(`[数据库] DB_NAME: ${process.env.DB_NAME || '未设置'}`);
    console.error(`[数据库] DB_PASSWORD 是否已设置: ${process.env.DB_PASSWORD ? '是' : '否'}`);
    
    // 返回null而不是抛出异常，允许应用优雅降级
    return null;
  }
}