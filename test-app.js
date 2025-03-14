import express from 'express';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 5555;

// 基本的中间件
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// 静态文件服务
app.use(express.static(path.join(__dirname, 'public')));

// 创建一个简单的HTML测试页面
const testHtmlDir = path.join(__dirname, 'public');
if (!fs.existsSync(testHtmlDir)) {
  fs.mkdirSync(testHtmlDir, { recursive: true });
}

const testHtmlPath = path.join(testHtmlDir, 'test.html');
const testHtmlContent = `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>测试应用</title>
  <style>
    body {
      font-family: Arial, sans-serif;
      display: flex;
      justify-content: center;
      align-items: center;
      height: 100vh;
      margin: 0;
      background: linear-gradient(135deg, #f5f7fa 0%, #c3cfe2 100%);
    }
    .container {
      background: white;
      padding: 2rem;
      border-radius: 8px;
      box-shadow: 0 10px 25px rgba(0,0,0,0.1);
      text-align: center;
      max-width: 500px;
    }
    h1 {
      color: #333;
      margin-bottom: 1rem;
    }
    p {
      color: #666;
      line-height: 1.6;
    }
    .status {
      margin-top: 1.5rem;
      padding: 1rem;
      background-color: #f1f9fe;
      border-radius: 4px;
    }
    .status h2 {
      margin-top: 0;
      font-size: 1.2rem;
      color: #0066cc;
    }
    .button {
      display: inline-block;
      margin-top: 1.5rem;
      padding: 0.6rem 1.2rem;
      background-color: #0066cc;
      color: white;
      border-radius: 4px;
      text-decoration: none;
      font-weight: bold;
      transition: background-color 0.3s;
    }
    .button:hover {
      background-color: #0055aa;
    }
  </style>
</head>
<body>
  <div class="container">
    <h1>仓库管理系统 - 测试页面</h1>
    <p>这是一个简单的测试页面，用于验证服务器和前端渲染是否正常工作。</p>
    
    <div class="status">
      <h2>系统状态</h2>
      <p>服务器: <span id="server-status">正在检查...</span></p>
      <p>浏览器: <span id="browser-info">正在检查...</span></p>
      <p>当前时间: <span id="current-time">正在加载...</span></p>
    </div>
    
    <a href="/api/test" class="button" id="test-api">测试API连接</a>
  </div>

  <script>
    // 更新当前时间
    document.getElementById('current-time').textContent = new Date().toLocaleString();
    
    // 显示浏览器信息
    document.getElementById('browser-info').textContent = navigator.userAgent;
    
    // 测试服务器连接
    fetch('/api/health')
      .then(response => response.json())
      .then(data => {
        document.getElementById('server-status').textContent = '连接正常 ✅';
      })
      .catch(error => {
        document.getElementById('server-status').textContent = '连接失败 ❌';
        console.error('API请求失败:', error);
      });
    
    // 添加API测试按钮事件
    document.getElementById('test-api').addEventListener('click', function(e) {
      e.preventDefault();
      fetch('/api/test')
        .then(response => response.json())
        .then(data => {
          alert('API测试成功: ' + JSON.stringify(data));
        })
        .catch(error => {
          alert('API测试失败: ' + error.message);
        });
    });
  </script>
</body>
</html>
`;

fs.writeFileSync(testHtmlPath, testHtmlContent);

// API路由
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

app.get('/api/test', (req, res) => {
  res.json({ 
    message: '测试API响应成功',
    time: new Date().toISOString(),
    env: process.env.NODE_ENV || 'development'
  });
});

// 启动服务器
app.listen(PORT, '0.0.0.0', () => {
  console.log(`测试应用服务器运行在: http://localhost:${PORT}`);
  console.log(`请访问 http://localhost:${PORT}/test.html 查看测试页面`);
});