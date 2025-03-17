/**
 * 修复认证会话问题脚本
 * 
 * 该脚本用于将 server/auth.ts 中的所有会话管理代码更新为一致的格式
 * 包括添加 isAuthenticated 属性和会话保存逻辑
 */
const fs = require('fs');
const path = require('path');

// 读取auth文件
const authFilePath = path.join(process.cwd(), 'server', 'auth.ts');
let content = fs.readFileSync(authFilePath, 'utf8');

// 替换所有登录函数中的会话设置代码
const sessionUpdatePattern = /\/\/ 更新会话对象[\s\S]*?req\.session\.authenticated = true;[\s\S]*?req\.session\.userId = user\.id;[\s\S]*?req\.session\.role = user\.role;[\s\S]*?req\.session\.language[\s\S]*?req\.session\.username[\s\S]*?\/\/ 设置新会话ID[\s\S]*?req\.sessionID = sessionId;/g;

const improvedSessionCode = `// 更新会话对象
    req.session.authenticated = true;
    req.session.isAuthenticated = true; // 同时设置两个属性以确保兼容性
    req.session.userId = user.id;
    req.session.role = user.role;
    req.session.language = user.language || 'zh';
    req.session.username = user.username;
    
    // 设置新会话ID 
    req.sessionID = sessionId;
    
    // 保存会话以确保状态被持久化
    await new Promise<void>((resolve) => {
      req.session.save((err) => {
        if (err) {
          console.error('[认证系统] 保存会话状态失败:', err);
        }
        resolve();
      });
    });`;

// 替换所有匹配的代码
content = content.replace(sessionUpdatePattern, improvedSessionCode);

// 写回文件
fs.writeFileSync(authFilePath, content, 'utf8');

console.log('认证会话代码更新完成');
