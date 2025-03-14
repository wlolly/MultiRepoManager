import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';
import mysql from 'mysql2/promise';

// 加载环境变量
dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// 创建Express应用
const app = express();
const PORT = process.env.PORT || 5000;

// 中间件
app.use(express.json());
app.use(express.static(path.join(__dirname, '../public')));

// 数据库测试
let dbConnection = null;
const connectToDatabase = async () => {
  try {
    const dbUrl = process.env.DATABASE_URL;
    if (!dbUrl) {
      console.error('错误: 未找到DATABASE_URL环境变量');
      return false;
    }
    
    dbConnection = await mysql.createConnection(dbUrl);
    const [rows] = await dbConnection.execute('SELECT 1 as connection_test');
    return rows.length > 0;
  } catch (error) {
    console.error('数据库连接失败:', error.message);
    return false;
  }
};

// 健康检查API
app.get('/api/health', async (req, res) => {
  const dbConnected = dbConnection !== null || await connectToDatabase();
  
  res.json({
    status: 'ok',
    serverTime: new Date().toISOString(),
    environment: process.env.NODE_ENV || 'development',
    database: {
      connected: dbConnected,
      url: process.env.DATABASE_URL ? '已配置' : '未配置'
    },
    system: {
      nodeVersion: process.version,
      platform: process.platform,
      memory: process.memoryUsage()
    }
  });
});

// 测试API
app.get('/api/test', async (req, res) => {
  const dbConnected = dbConnection !== null || await connectToDatabase();
  
  if (dbConnected) {
    try {
      // 尝试执行一个简单的查询
      const [results] = await dbConnection.execute('SHOW TABLES');
      const tables = results.map(row => Object.values(row)[0]);
      
      res.json({
        message: '测试成功',
        databaseTables: tables,
        timestamp: new Date().toISOString()
      });
    } catch (error) {
      res.status(500).json({
        message: '数据库查询失败',
        error: error.message,
        timestamp: new Date().toISOString()
      });
    }
  } else {
    res.status(500).json({
      message: '数据库连接失败',
      timestamp: new Date().toISOString()
    });
  }
});

// 渲染测试页面
app.get('/test', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'test.html'));
});

// 启动服务器
app.listen(PORT, '0.0.0.0', async () => {
  console.log(`测试服务器运行在: http://localhost:${PORT}`);
  console.log('正在尝试连接数据库...');
  
  const dbConnected = await connectToDatabase();
  if (dbConnected) {
    console.log('✅ 数据库连接成功!');
  } else {
    console.log('❌ 数据库连接失败!');
  }
  
  console.log(`\n访问以下URL来测试系统:`);
  console.log(`- 健康检查: http://localhost:${PORT}/api/health`);
  console.log(`- 数据库测试: http://localhost:${PORT}/api/test`);
});