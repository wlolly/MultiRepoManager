import { drizzle } from 'drizzle-orm/mysql2';
import mysql from 'mysql2/promise';
import * as schema from "@shared/schema";
import dotenv from 'dotenv';

// 加载环境变量
dotenv.config();

// 获取数据库连接URL
const dbUrl = process.env.DATABASE_URL;

// 检查数据库URL是否设置，但不抛出错误
if (!dbUrl) {
  console.warn('警告: DATABASE_URL环境变量未设置，将使用内存存储模式');
}

// 创建MySQL连接池 - 增强版配置，添加更多的容错机制
let pool;
export let useFallbackStorage = false;

try {
  if (dbUrl) {
    console.log('使用环境变量DATABASE_URL连接数据库');
    
    // 解析连接URL，更新一些连接参数
    const urlObj = new URL(dbUrl);
    const host = urlObj.hostname;
    const port = parseInt(urlObj.port || '3306');
    const user = urlObj.username;
    const password = decodeURIComponent(urlObj.password);
    const database = urlObj.pathname.substring(1); // 移除开头的'/'
    
    // 使用解析出的参数，创建更加健壮的连接池配置
    // 注意: 只使用mysql2支持的选项
    pool = mysql.createPool({
      host,
      port,
      user,
      password,
      database,
      waitForConnections: true,
      connectionLimit: 5, // 减少连接数以节省资源
      queueLimit: 0,
      connectTimeout: 10000, // 减少超时时间到10秒，以便更快失败并降级
      keepAliveInitialDelay: 10000,
      enableKeepAlive: true,
      multipleStatements: true, // 允许多语句查询
      dateStrings: true // 日期以字符串形式返回
    });
    
    // 测试连接
    pool.getConnection()
      .then(conn => {
        console.log('数据库连接成功!');
        conn.release();
      })
      .catch(err => {
        console.error('数据库连接失败:', err);
        useFallbackStorage = true;
        
        // 创建一个模拟的池对象，在查询时返回空结果
        pool = {
          execute: async () => [[], []],
          query: async () => [[], []],
          getConnection: async () => ({
            execute: async () => [[], []],
            query: async () => [[], []],
            release: () => {}
          })
        };
        
        console.log('⚠️ 降级到内存存储模式 - 应用将使用内存存储而不是数据库');
        console.log('⚠️ 警告: 内存存储中的数据在应用重启后会丢失');
      });
  } else {
    // 标记使用内存存储
    useFallbackStorage = true;
    console.log('环境变量不可用，将使用内存存储模式运行');
    
    // 创建一个模拟的池对象，在查询时返回空结果
    pool = {
      execute: async () => [[], []],
      query: async () => [[], []],
      getConnection: async () => ({
        execute: async () => [[], []],
        query: async () => [[], []],
        release: () => {}
      })
    };
  }
} catch (error) {
  useFallbackStorage = true;
  console.error('创建数据库连接池失败:', error);
  console.log('将使用内存存储模式运行');
  
  // 创建一个模拟的池对象，在查询时返回空结果
  pool = {
    execute: async () => [[], []],
    query: async () => [[], []],
    getConnection: async () => ({
      execute: async () => [[], []],
      query: async () => [[], []],
      release: () => {}
    })
  };
}

// 导出数据库实例
export const db = drizzle(pool);
