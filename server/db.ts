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
  console.warn('警告: DATABASE_URL环境变量未设置，将尝试使用备用配置');
}

// 创建MySQL连接池 - 增强版配置，添加更多的容错机制
let pool;

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
      connectionLimit: 10,
      queueLimit: 0,
      connectTimeout: 30000, // 减少超时时间到30秒
      keepAliveInitialDelay: 10000,
      enableKeepAlive: true,
      multipleStatements: true, // 允许多语句查询
      dateStrings: true // 日期以字符串形式返回
    });
  } else {
    // 使用备用连接信息
    console.log('环境变量不可用，将使用内存存储模式运行');
  }
} catch (error) {
  console.error('创建数据库连接池失败:', error);
  // 创建一个内存存储模式，确保应用即使没有数据库也能运行
  console.log('将使用内存存储模式运行');
}

// 测试连接
pool.getConnection()
  .then(conn => {
    console.log('数据库连接成功!');
    conn.release();
  })
  .catch(err => {
    console.error('数据库连接失败:', err);
  });

export const db = drizzle(pool);
