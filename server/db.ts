import { drizzle } from 'drizzle-orm/mysql2';
import mysql from 'mysql2/promise';
import * as schema from "@shared/schema";
import dotenv from 'dotenv';

// 加载环境变量
dotenv.config();

// 获取数据库连接URL
const dbUrl = process.env.DATABASE_URL;

if (!dbUrl) {
  throw new Error('DATABASE_URL environment variable is not set');
}

// 创建MySQL连接池 - 增加连接配置以提高稳定性
const pool = mysql.createPool(dbUrl);

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
