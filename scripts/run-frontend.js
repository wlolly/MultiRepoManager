#!/usr/bin/env node

/**
 * 独立前端开发服务器启动脚本
 * 这个脚本使用 Vite 启动一个专用的前端开发服务器
 * 使用方法: node scripts/run-frontend.js
 */

import { createServer } from 'vite';
import viteConfig from '../vite.config.js';

async function startFrontendServer() {
  console.log('正在启动前端开发服务器...');
  
  try {
    // 设置专门的前端服务器配置
    const server = await createServer({
      ...viteConfig,
      // 使用不同的端口，避免与主服务器冲突
      server: {
        port: 5173,
        // 允许所有主机访问
        host: '0.0.0.0',
        // 开启 HMR
        hmr: {
          port: 5173,
        },
        // 代理 API 请求到主服务器
        proxy: {
          '/api': {
            target: 'http://localhost:5000',
            changeOrigin: true,
          }
        },
      },
      // 确保使用客户端入口
      root: './client',
      publicDir: './public',
    });

    await server.listen();
    
    server.printUrls();
    console.log('前端开发服务器启动成功!');
    console.log('API 请求将被代理到 http://localhost:5000');
  } catch (error) {
    console.error('前端开发服务器启动失败:', error);
    process.exit(1);
  }
}

startFrontendServer();