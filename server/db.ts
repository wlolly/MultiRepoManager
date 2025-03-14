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

// 创建MySQL连接池
const pool = mysql.createPool(dbUrl);

export const db = drizzle(pool);
