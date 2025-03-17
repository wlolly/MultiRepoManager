// 创建一个临时的修复脚本来直接编辑文件
const fs = require('fs');

// 读取 auth.ts 文件
const authFilePath = './server/auth.ts';
let authContent = fs.readFileSync(authFilePath, 'utf8');

// 修改 completeLogin 函数中的用户返回数据
let updatedContent = authContent.replace(
  /\/\/ 返回成功响应\s+return res\.status\(200\)\.json\(\{\s+success: true,\s+authenticated: true,\s+message: '登录成功',\s+sessionId,\s+user: \{\s+id: user\.id,\s+username: user\.username,\s+role: user\.role,\s+fullName: user\.full_name,\s+language: user\.language \|\| 'zh'\s+\}\s+\}\);/,
  
);

// 保存修改后的文件
fs.writeFileSync(authFilePath, updatedContent, 'utf8');

console.log('已修复 auth.ts 文件中的用户ID返回逻辑');
