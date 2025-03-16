#!/usr/bin/env node

/**
 * 独立后端开发服务器启动脚本
 * 这个脚本仅启动 Express 服务器，不包含 Vite 前端开发服务
 * 使用方法: node scripts/run-backend.js
 */

import { spawn } from 'child_process';
import { fileURLToPath } from 'url';
import { dirname, resolve } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// 服务器入口文件路径
const serverEntryPath = resolve(__dirname, '../server/index.ts');

// 设置环境变量，指示服务器以 API 模式运行（不包含 Vite 前端开发服务）
process.env.API_ONLY_MODE = 'true';
process.env.PORT = '5000';

console.log('正在启动后端 API 服务器...');
console.log(`入口文件: ${serverEntryPath}`);
console.log('运行模式: 仅 API (不包含前端开发服务)');

// 使用 tsx 启动 TypeScript 服务器，与 package.json 中的 dev 脚本一致
const serverProcess = spawn('tsx', [serverEntryPath], {
  stdio: 'inherit',
  env: {
    ...process.env,
    API_ONLY_MODE: 'true',
    PORT: '5000'
  }
});

// 捕获进程事件
serverProcess.on('error', (error) => {
  console.error('启动后端服务器失败:', error);
  process.exit(1);
});

serverProcess.on('exit', (code) => {
  console.log(`后端服务器已退出，退出码: ${code}`);
  process.exit(code);
});

// 处理终止信号，确保子进程正确关闭
process.on('SIGINT', () => {
  console.log('接收到终止信号，正在关闭后端服务器...');
  serverProcess.kill('SIGINT');
});

process.on('SIGTERM', () => {
  console.log('接收到终止信号，正在关闭后端服务器...');
  serverProcess.kill('SIGTERM');
});