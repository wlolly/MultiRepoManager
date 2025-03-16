import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import * as schema from '@shared/schema';
import { log } from './vite';
import dotenv from 'dotenv';

dotenv.config();

const connectionString = process.env.DATABASE_URL;

if (!connectionString) {
  throw new Error('DATABASE_URL not found in environment variables');
}

// 创建连接池
const client = postgres(connectionString, {
  max: 10,
  idle_timeout: 20,
  connect_timeout: 10
});

export const db = drizzle(client, { schema });

// 导出检查连接状态的函数
export function isDatabaseConnected(): boolean {
  return !!client;
}