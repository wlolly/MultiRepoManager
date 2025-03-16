#!/usr/bin/env node

/**
 * 开发环境启动脚本
 * 同时启动前端和后端开发服务器
 */

import { spawn } from 'child_process';
import { dirname, resolve } from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// 启动后端服务器的脚本
const backendScript = resolve(__dirname, 'run-backend.js');
// 启动前端服务器的脚本
const frontendScript = resolve(__dirname, 'run-frontend.js');

console.log('=== 开发环境启动 ===');
console.log('正在启动前端和后端开发服务器...');

// 存储子进程引用
const processes = [];

// 启动后端服务器
console.log('\n【后端服务器】启动中...');
const backendProcess = spawn('node', [backendScript], {
  stdio: 'inherit',
  shell: true
});

backendProcess.on('error', (error) => {
  console.error('后端服务器启动失败:', error);
});

processes.push(backendProcess);

// 等待 2 秒再启动前端服务器，确保后端已经启动
setTimeout(() => {
  console.log('\n【前端服务器】启动中...');
  const frontendProcess = spawn('node', [frontendScript], {
    stdio: 'inherit',
    shell: true
  });

  frontendProcess.on('error', (error) => {
    console.error('前端服务器启动失败:', error);
  });

  processes.push(frontendProcess);
}, 2000);

// 处理进程终止信号
process.on('SIGINT', () => {
  console.log('\n接收到终止信号，正在关闭所有服务器...');
  processes.forEach(proc => {
    proc.kill('SIGINT');
  });
  
  setTimeout(() => {
    console.log('所有服务器已关闭');
    process.exit(0);
  }, 1000);
});

process.on('SIGTERM', () => {
  console.log('\n接收到终止信号，正在关闭所有服务器...');
  processes.forEach(proc => {
    proc.kill('SIGTERM');
  });
  
  setTimeout(() => {
    console.log('所有服务器已关闭');
    process.exit(0);
  }, 1000);
});