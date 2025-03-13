import { drizzle } from 'drizzle-orm/mysql2';
import mysql from 'mysql2/promise';
import * as schema from "@shared/schema";

// 创建MySQL连接池
const pool = mysql.createPool({
  host: '77.243.80.129',
  port: 3307,
  user: 'root',
  password: '@Hzca1575@',
  database: 'wlolly',
});

export const db = drizzle(pool);
