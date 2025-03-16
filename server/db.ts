import { drizzle } from 'drizzle-orm/mysql2';
import mysql from 'mysql2/promise';
import * as schema from "@shared/schema";
import dotenv from 'dotenv';
import { MemStorage } from './storage'; // 导入MemStorage实现

// 加载环境变量
dotenv.config();

// 获取数据库连接URL
const dbUrl = process.env.DATABASE_URL;

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

// 根据环境变量决定是否使用内存存储
export let useFallbackStorage = !dbUrl; 

// 检查数据库URL是否设置，但不抛出错误
if (!dbUrl) {
  console.warn('警告: DATABASE_URL环境变量未设置，将使用内存存储模式');
}

// 创建优化后的MySQL连接池 - 增强版配置，添加更多的容错机制
let pool;

// 自动重新连接函数
async function createPoolWithRetry(retryCount = 0, maxRetries = 5) {
  if (retryCount > 0) {
    console.log(`[数据库] 第 ${retryCount}/${maxRetries} 次尝试重新连接数据库...`);
  }
  
  try {
    if (!dbUrl) {
      throw new Error('数据库URL未设置');
    }
    
    // 解析连接URL，更新一些连接参数
    const urlObj = new URL(dbUrl);
    const host = urlObj.hostname;
    const port = parseInt(urlObj.port || '3306');
    const user = urlObj.username;
    const password = decodeURIComponent(urlObj.password);
    const database = urlObj.pathname.substring(1); // 移除开头的'/'
    
    console.log(`[数据库] 连接到 ${host}:${port}/${database} (尝试 ${retryCount+1}/${maxRetries+1})`);
    
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
      connectTimeout: 20000,      // 连接超时时间调整为20秒
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
      // 如果重试次数已用完或是其他错误，切换到内存存储
      useFallbackStorage = true;
      console.log('⚠️ 降级到内存存储模式 - 应用将使用内存存储而不是数据库');
      console.log('⚠️ 警告: 内存存储中的数据在应用重启后会丢失');
      
      // 创建一个模拟的池对象，在查询时返回空结果
      return {
        execute: () => Promise.resolve([[], []]),
        query: () => Promise.resolve([[], []]),
        getConnection: () => Promise.resolve({
          execute: () => Promise.resolve([[], []]),
          query: () => Promise.resolve([[], []]),
          release: () => {}
        }),
        on: () => {} // 添加on方法以匹配Pool接口
      } as any;
    }
  }
}

// 立即尝试创建连接池
try {
  if (dbUrl) {
    // 尝试连接数据库，最多重试5次
    createPoolWithRetry(0, 5)
      .then(newPool => {
        if (newPool) {
          pool = newPool;
        }
      })
      .catch(err => {
        console.error('[数据库] 创建连接池失败:', err);
        setupFallbackPool();
      });
  } else {
    // 没有数据库URL时使用内存存储
    setupFallbackPool();
  }
} catch (err) {
  console.error('[数据库] 初始化错误:', err);
  setupFallbackPool();
}

// 设置后备内存存储池
function setupFallbackPool() {
  useFallbackStorage = true;
  console.log('[数据库] 使用内存存储模式运行');
  
  pool = {
    execute: () => Promise.resolve([[], []]),
    query: () => Promise.resolve([[], []]),
    getConnection: () => Promise.resolve({
      execute: () => Promise.resolve([[], []]),
      query: () => Promise.resolve([[], []]),
      release: () => {}
    }),
    on: () => {} // 添加on方法以匹配Pool接口
  } as any;
  
  // 初始化内存存储的测试数据
  memStorage.initializeDemoData();
}

// 如果10秒后仍未初始化pool，则设置后备池
setTimeout(() => {
  if (!pool) {
    console.log('[数据库] 连接池初始化超时，使用后备方案');
    setupFallbackPool();
  }
}, 10000);

// 确保pool总是有定义值
pool = pool || {
  execute: () => Promise.resolve([[], []]),
  query: () => Promise.resolve([[], []]),
  getConnection: () => Promise.resolve({
    execute: () => Promise.resolve([[], []]),
    query: () => Promise.resolve([[], []]),
    release: () => {}
  }),
  on: () => {}
} as any;

// 导出数据库实例
export const db = drizzle(pool);
