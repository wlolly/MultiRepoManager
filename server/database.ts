import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import * as schema from '@shared/schema';
import { log } from './vite';
import dotenv from 'dotenv';
import fs from 'fs';
import path from 'path';

// 加载环境变量
dotenv.config();

// 打印环境变量和配置信息以便排查问题
console.log('=== 数据库配置信息 ===');
console.log(`DATABASE_URL: ${process.env.DATABASE_URL ? '已设置' : '未设置'}`);
console.log(`PGHOST: ${process.env.PGHOST || '未设置'}`);
console.log(`PGPORT: ${process.env.PGPORT || '未设置'}`);
console.log(`PGUSER: ${process.env.PGUSER || '未设置'}`);
console.log(`PGDATABASE: ${process.env.PGDATABASE || '未设置'}`);
console.log(`PGPASSWORD: ${process.env.PGPASSWORD ? '已设置' : '未设置'}`);

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

// 获取数据库连接字符串
const connectionString = process.env.DATABASE_URL;

if (!connectionString) {
  throw new Error('DATABASE_URL not found in environment variables');
}

/**
 * 创建PostgreSQL连接，使用Replit提供的数据库
 * 优化了对数据库连接失败的处理，使用指数退避算法
 * 
 * @param retryAttempt 当前重试次数
 * @param maxRetries 最大重试次数
 * @returns 包含数据库连接和drizzle实例的对象，或在连接失败时返回null
 */
export async function createPostgresConnection(retryAttempt = 0, maxRetries = 5) {
  try {
    // 打印当前尝试的连接信息
    console.log(`[数据库] 连接尝试 ${retryAttempt + 1}/${maxRetries + 1}`);
    console.log(`[数据库] 使用连接字符串: ${connectionString.substring(0, 20)}...`);
    
    log(`连接到PostgreSQL数据库 (尝试 ${retryAttempt + 1}/${maxRetries + 1})`, 'postgres');
    
    // 创建postgres-js客户端
    const client = postgres(connectionString, {
      max: 10, // 最大连接数
      idle_timeout: 30, // 空闲连接超时时间
      connect_timeout: 10, // 连接超时时间
      prepare: false // 禁用准备好的语句
    });
    
    // 测试连接
    await client`SELECT 1`;
    
    log('PostgreSQL数据库连接已成功建立', 'postgres');
    
    // 使用drizzle-orm包装连接
    const db = drizzle(client, { schema });
    
    console.log('[数据库] 成功创建PostgreSQL数据库连接, 并绑定drizzle ORM');
    return { client, db };
  } catch (error: any) {
    log(`PostgreSQL数据库连接失败: ${error.message}`, 'postgres-error');
    console.error(`[数据库] 连接失败: ${error.message}`);
    
    // 对特定错误进行重试，使用指数退避策略
    if (retryAttempt < maxRetries) {
      // 计算延迟时间，使用指数退避算法，但最长不超过30秒
      const delayMs = Math.min(Math.pow(2, retryAttempt) * 1000, 30000);
      log(`将在 ${delayMs/1000} 秒后重试连接...`, 'postgres');
      console.log(`[数据库] 尝试 ${retryAttempt + 1}/${maxRetries + 1} 失败，将在 ${delayMs/1000} 秒后重试...`);
      
      // 等待计算出的时间后再次尝试连接
      return new Promise((resolve) => {
        setTimeout(() => {
          resolve(createPostgresConnection(retryAttempt + 1, maxRetries));
        }, delayMs);
      });
    }
    
    // 如果重试次数达到上限或是非连接类错误
    log('PostgreSQL数据库连接失败并超过最大重试次数，将返回null', 'postgres-warning');
    console.error('[数据库] 连接尝试已达最大次数，放弃连接');
    
    // 记录详细错误信息，帮助排查问题
    log(`错误消息: ${error.message || '未知'}`, 'postgres-error');
    console.error(`[数据库] 错误消息: ${error.message || '未知'}`);
    
    // 输出环境信息以帮助排查问题
    console.error('[数据库] 环境变量检查:');
    console.error(`[数据库] NODE_ENV: ${process.env.NODE_ENV || '未设置'}`);
    console.error(`[数据库] DATABASE_URL 是否已设置: ${process.env.DATABASE_URL ? '是' : '否'}`);
    console.error(`[数据库] PGHOST: ${process.env.PGHOST || '未设置'}`);
    console.error(`[数据库] PGPORT: ${process.env.PGPORT || '未设置'}`);
    console.error(`[数据库] PGUSER: ${process.env.PGUSER || '未设置'}`);
    console.error(`[数据库] PGDATABASE: ${process.env.PGDATABASE || '未设置'}`);
    console.error(`[数据库] PGPASSWORD 是否已设置: ${process.env.PGPASSWORD ? '是' : '否'}`);
    
    // 返回null而不是抛出异常，允许应用优雅降级
    return null;
  }
}