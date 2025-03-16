import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import * as schema from "@shared/schema";
import dotenv from 'dotenv';
import { MemStorage } from './storage'; // 导入MemStorage实现
import fs from 'fs';
import path from 'path';
import { log } from './vite';
import { sql } from 'drizzle-orm';

// 加载环境变量
dotenv.config();

// 检查.env文件是否存在，并尝试读取内容进行诊断
try {
  const envPath = path.resolve(process.cwd(), '.env');
  console.log(`[配置检查] 尝试读取.env文件 (${envPath})`);
  if (fs.existsSync(envPath)) {
    const envContent = fs.readFileSync(envPath, 'utf8');
    console.log('[配置检查] .env文件存在，内容长度:', envContent.length);
    // 安全显示前50个字符，不显示敏感信息
    const safePreview = envContent.substring(0, 50).replace(/=.*$/gm, '=***');
    console.log('[配置检查] .env文件预览:', safePreview);
  } else {
    console.log('[配置检查] .env文件不存在');
  }
} catch (err) {
  console.error('[配置检查] 读取.env文件时出错:', err);
}

// 创建内存存储实例
export const memStorage = new MemStorage();

// 监听未捕获的异常和拒绝的Promise
process.on('uncaughtException', (err) => {
  console.error(`[数据库] 未捕获的异常: ${err.message}`, err);
  // 不终止进程，允许应用继续运行
});

process.on('unhandledRejection', (reason, promise) => {
  console.error(`[数据库] 未处理的Promise拒绝:`, reason);
  // 不终止进程，允许应用继续运行
});

// 禁用内存存储，强制使用数据库连接
// 这个标志始终为false，确保系统只使用数据库存储，没有降级选项
export let useFallbackStorage = false;

// 获取数据库连接详细信息（使用Replit提供的PostgreSQL）
const connectionString = process.env.DATABASE_URL;

if (!connectionString) {
  console.error('[数据库错误] DATABASE_URL环境变量未设置！');
  console.log('可用的环境变量:', Object.keys(process.env).filter(key => 
    key.startsWith('PG') || key.startsWith('DATABASE')
  ));
  throw new Error('缺少数据库连接信息，请确保设置了DATABASE_URL');
}

console.log('[数据库] 使用Replit PostgreSQL连接');
console.log(`[数据库] 连接字符串前缀: ${connectionString.substring(0, 20)}...`);

// 创建PostgreSQL客户端连接
const client = postgres(connectionString, {
  max: 10, // 设置合理的最大连接数
  idle_timeout: 30, // 空闲连接的过期时间 (秒)
  connect_timeout: 10, // 连接超时时间 (秒)
  prepare: false // 禁用准备好的语句，避免与某些查询不兼容
});

// 导出drizzle实例
export const db = drizzle(client, { schema });

// 导出获取连接池状态的函数
export function isDatabaseConnected(): boolean {
  return !!client;
}

// 初始化数据库连接
console.log('[数据库] 正在初始化PostgreSQL数据库连接');

// 测试连接
(async () => {
  try {
    // 进行简单查询测试连接
    const result = await db.execute(sql`SELECT 1 as test`);
    
    if (result && result.length > 0) {
      console.log('[数据库] 连接测试成功!');
      console.log('✅ 正在使用PostgreSQL数据库存储模式运行');
      
      // 设置标志表示使用数据库而非内存存储
      useFallbackStorage = false;
    }
  } catch (err) {
    console.error('[数据库] 连接测试失败:', err);
    console.error('[数据库] 请检查数据库配置和网络连接');
    
    // 记录更多诊断信息
    log('数据库连接测试失败，每30秒尝试重新连接一次', 'database-error');
    
    // 设置定期重试逻辑
    const retryInterval = setInterval(async () => {
      try {
        console.log('[数据库] 尝试重新连接数据库...');
        const result = await db.execute(sql`SELECT version()`);
        
        console.log('[数据库] 成功重新连接到数据库!');
        console.log('✅ 现已使用PostgreSQL数据库存储模式运行');
        useFallbackStorage = false;
        
        // 成功后清除重试间隔
        clearInterval(retryInterval);
      } catch (retryErr) {
        console.error('[数据库] 重新连接尝试失败:', retryErr);
      }
    }, 30000); // 每30秒重试一次
  }
})();