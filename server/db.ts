import { drizzle } from 'drizzle-orm/mysql2';
import mysql from 'mysql2/promise';
import * as schema from "@shared/schema";
import dotenv from 'dotenv';
import { MemStorage } from './storage'; // 导入MemStorage实现
import fs from 'fs';
import path from 'path';

// 加载环境变量
dotenv.config();

// 检查.env文件是否存在，并尝试读取内容进行诊断
try {
  const envPath = path.resolve(process.cwd(), '.env');
  console.log(`[配置检查] 尝试读取.env文件 (${envPath})`);
  if (fs.existsSync(envPath)) {
    const envContent = fs.readFileSync(envPath, 'utf8');
    console.log('[配置检查] .env文件存在，内容长度:', envContent.length);
    console.log('[配置检查] .env文件前50个字符:', envContent.substring(0, 50));
  } else {
    console.log('[配置检查] .env文件不存在');
  }
} catch (err) {
  console.error('[配置检查] 读取.env文件时出错:', err);
}

// 直接获取数据库配置 - 更加可靠，避免URL解析问题
const DB_HOST = process.env.DB_HOST || "77.243.80.129";
const DB_PORT = parseInt(process.env.DB_PORT || "3307");
const DB_USER = process.env.DB_USER || "root";
const DB_PASSWORD = process.env.DB_PASSWORD || "@Hzca1575@";
const DB_NAME = process.env.DB_NAME || "wlolly";

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

// 初始化数据库连接 - 不再依赖URL，直接使用配置
console.log('[数据库] 正在使用直接配置连接数据库');
console.log('[数据库] 系统需要数据库连接才能正常工作，不再提供内存存储降级选项');

// 创建优化后的MySQL连接池 - 增强版配置，添加更多的容错机制
let pool;

// 自动重新连接函数 (增加默认重试次数)
async function createPoolWithRetry(retryCount = 0, maxRetries = 10) {
  if (retryCount > 0) {
    console.log(`[数据库] 第 ${retryCount}/${maxRetries} 次尝试重新连接数据库...`);
  }
  
  try {
    // 使用直接配置而不是解析URL
    // 这样可以避免URL解析问题，特别是当密码中有特殊字符时
    const host = process.env.DB_HOST || 'localhost';
    const port = parseInt(process.env.DB_PORT || '3306', 10);
    const user = process.env.DB_USER || 'root';
    const password = process.env.DB_PASSWORD || '';
    const database = process.env.DB_NAME || 'warehouse_db';
    
    console.log(`[数据库] 连接到 ${host}:${port}/${database} (尝试 ${retryCount+1}/${maxRetries+1})`);
    console.log(`[数据库] 用户名: ${user}`);
    
    // 使用解析出的参数，创建更加健壮的连接池配置
    // 注意：只使用mysql2支持的配置选项
    const newPool = mysql.createPool({
      host,
      port,
      user,
      password,
      database,
      waitForConnections: true,
      connectionLimit: 5,         // 减少连接限制，避免超出数据库最大连接数
      queueLimit: 10,             // 适当减少队列长度
      connectTimeout: 60000,      // 连接超时时间调整为60秒
      // 移除不支持的配置项: acquireTimeout, timeout
      // 添加必要的连接保持活动配置
      keepAliveInitialDelay: 10000,
      enableKeepAlive: true,
      multipleStatements: true,   // 允许多语句查询
      dateStrings: true,          // 日期以字符串形式返回
      // 移除trace选项，减少内存占用
      debug: false,               // 不输出调试信息
      charset: 'utf8mb4',         // 使用更好的字符集支持
      supportBigNumbers: true,    // 支持大数字
      bigNumberStrings: true,     // 大数字以字符串形式返回
      namedPlaceholders: true,    // 支持命名参数，增强SQL安全性
    });
    
    // 监听连接错误，但不让它导致程序退出
    newPool.on('error', (err) => {
      console.error('[数据库] 池发生错误:', err);
      
      // 在发生致命错误时尝试重新创建连接池
      if (err.code === 'PROTOCOL_CONNECTION_LOST' || 
          err.code === 'ETIMEDOUT' || 
          err.code === 'ECONNRESET') {
        console.log('[数据库] 检测到连接丢失，将在10秒后自动尝试重新连接...');
        
        // 10秒后尝试重新连接
        setTimeout(() => {
          createPoolWithRetry(0, maxRetries)
            .then(newPool => {
              if (newPool) {
                pool = newPool;
                console.log('[数据库] 已成功重新建立连接池');
              }
            })
            .catch(err => {
              console.error('[数据库] 重新连接失败:', err);
            });
        }, 10000);
      }
    });
    
    // 测试连接并执行一些初始化查询
    const conn = await newPool.getConnection();
    
    // 设置会话变量以提高稳定性
    await conn.query(`
      SET SESSION wait_timeout=600;
      SET SESSION interactive_timeout=600;
      SET SESSION net_read_timeout=180;
      SET SESSION net_write_timeout=180;
      SET SESSION max_allowed_packet=16777216;
    `);
    
    console.log('[数据库] 连接成功并设置了会话变量!');
    conn.release();
    
    // 减少日志输出
    console.log('✅ 正在使用数据库存储模式运行');
    useFallbackStorage = false;
    
    return newPool;
  } catch (err: any) {
    console.error('[数据库] 连接错误:', err.message);
    
    // 对特定错误进行重试
    if (retryCount < maxRetries && 
        (err.code === 'ECONNREFUSED' || 
         err.code === 'ETIMEDOUT' || 
         err.code === 'PROTOCOL_CONNECTION_LOST' ||
         err.code === 'ER_ACCESS_DENIED_ERROR' ||
         err.code === 'ENOTFOUND')) {
      
      // 使用指数退避策略计算延迟
      const delay = Math.min(Math.pow(2, retryCount) * 1000, 30000);
      console.log(`[数据库] 将在 ${delay/1000} 秒后重试连接...`);
      
      return new Promise(resolve => {
        setTimeout(() => {
          resolve(createPoolWithRetry(retryCount + 1, maxRetries));
        }, delay);
      });
    } else {
      // 如果重试次数已用完或是其他错误，不再切换到内存存储，而是直接抛出错误
      console.error('[数据库] 错误: 数据库连接失败，系统需要数据库连接才能正常工作');
      console.error('[数据库] 请检查数据库连接配置和网络连接');
      
      // 抛出错误，终止应用程序
      throw new Error('数据库连接失败，无法启动应用程序');
    }
  }
}

// 立即尝试创建连接池
try {
  // 直接使用配置而不是URL
  const dbHost = process.env.DB_HOST || 'localhost';
  const dbPort = parseInt(process.env.DB_PORT || '3306', 10);
  const dbName = process.env.DB_NAME || 'warehouse_db';
  console.log(`[数据库] 尝试连接到数据库 ${dbHost}:${dbPort}/${dbName}`);
  
  // 尝试连接数据库，最多重试10次，给更多的缓冲时间
  createPoolWithRetry(0, 10)
    .then(newPool => {
      if (newPool) {
        pool = newPool;
        // 使用新的连接池更新drizzle实例
        updateDbInstance(newPool);
        console.log('[数据库] 连接池初始化成功');
      }
    })
    .catch(err => {
      console.error('[数据库] 创建连接池失败:', err);
      console.error('[数据库] 错误: 数据库连接失败，系统需要数据库连接才能正常工作');
      console.error('[数据库] 请检查数据库连接配置和网络连接');
      
      // 不再提供内存存储降级，而是直接抛出错误
      throw new Error('数据库连接失败，无法启动应用程序');
    });
} catch (err) {
  console.error('[数据库] 初始化错误:', err);
  setupFallbackPool();
}

// 设置后备内存存储池 - 现在禁用此功能，强制使用数据库连接
function setupFallbackPool() {
  // 不再设置useFallbackStorage为true，保持强制使用数据库
  console.error('[数据库] 错误: 数据库连接失败，系统需要数据库连接才能正常工作');
  console.error('[数据库] 请检查数据库连接配置和网络连接');
  
  // 不再提供模拟池对象
  throw new Error('数据库连接失败，无法启动应用程序');
}

// 给数据库连接更长的等待时间，2分钟后仍未初始化pool，就报错退出
// 这样可以在数据库暂时不可用时，仍然坚持等待更长时间
setTimeout(() => {
  if (!pool) {
    console.error('[数据库] 连接池初始化超时 (2分钟)，应用程序需要数据库连接才能工作');
    console.error('[数据库] 请检查数据库连接配置和网络连接');
    
    // 不再提供内存存储，直接抛出错误
    throw new Error('数据库连接失败，无法启动应用程序');
  }
}, 120000); // 两分钟

// 创建初始空连接池
// 我们会在连接成功后更新这个对象
const initialPool = {
  execute: async () => { 
    throw new Error('数据库尚未连接，请等待连接完成或检查数据库配置'); 
  },
  query: async () => { 
    throw new Error('数据库尚未连接，请等待连接完成或检查数据库配置'); 
  },
  getConnection: async () => { 
    throw new Error('数据库尚未连接，请等待连接完成或检查数据库配置'); 
  },
  on: () => {}
};

// 使用初始连接池创建drizzle实例
let poolInstance = initialPool;
export const db = drizzle(poolInstance as any);

// 导出获取连接池状态的函数
export function isDatabaseConnected(): boolean {
  return poolInstance !== initialPool;
}

// 在连接池建立后更新drizzle实例
export function updateDbInstance(newPool: any): void {
  poolInstance = newPool;
  // 由于drizzle对象内部引用了pool，我们不需要更新db对象
  console.log('[数据库] Drizzle实例已更新为使用新的连接池');
}
