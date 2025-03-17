/**
 * 修复会话超时警告脚本
 * 
 * 这个脚本修复 TimeoutOverflowWarning 警告，通过替换大整数超时值为合理的值
 */

const fs = require('fs');
const path = require('path');

// 修复pruneSessionInterval参数
function fixPruneSessionInterval() {
  const filePath = path.join(process.cwd(), 'server/middleware/session.ts');
  
  if (!fs.existsSync(filePath)) {
    console.error('会话中间件文件不存在:', filePath);
    return false;
  }
  
  let content = fs.readFileSync(filePath, 'utf8');
  
  // 修复ttl参数 (单位是秒，而不是毫秒)
  content = content.replace(
    /pruneSessionInterval:\s*\d+\s*\*\s*\d+\s*\*\s*\d+\s*\*\s*\d+/g, 
    'pruneSessionInterval: 86400'
  );
  
  // 修复ttl参数
  content = content.replace(
    /ttl:\s*\d+\s*\*\s*\d+\s*\*\s*\d+\s*\*\s*\d+/g, 
    'ttl: 2592000'
  );
  
  fs.writeFileSync(filePath, content, 'utf8');
  console.log('已修复会话超时参数');
  return true;
}

// 修复全局会话存储定义和使用
function fixGlobalSessionStorage() {
  const filePath = path.join(process.cwd(), 'server/middleware/session.ts');
  
  if (!fs.existsSync(filePath)) {
    console.error('会话中间件文件不存在:', filePath);
    return false;
  }
  
  let content = fs.readFileSync(filePath, 'utf8');
  
  // 定义新的会话存储声明
  const newSessionStorageDeclaration = `
// 全局session存储，避免模块重新加载时丢失会话
// 创建自定义会话存储类型
interface SessionMap {
  [key: string]: string;
}

// 全局声明
declare global {
  namespace NodeJS {
    interface Global {
      sessionMap: SessionMap;
    }
  }
}

// 初始化全局会话存储
if (!global.sessionMap) {
  global.sessionMap = {};
}`;

  // 查找当前的会话存储声明区域并替换
  const sessionStorageRegex = /\/\/\s*全局session存储[\s\S]*?(?=export|$)/;
  if (sessionStorageRegex.test(content)) {
    content = content.replace(sessionStorageRegex, newSessionStorageDeclaration);
  } else {
    // 如果找不到现有声明，则在导入之后添加
    content = content.replace(
      /import crypto from ['"]crypto['"];(\s*)/,
      `import crypto from 'crypto';\n${newSessionStorageDeclaration}\n\n`
    );
  }
  
  // 替换所有 global.sessionStorage 为 global.sessionMap
  content = content.replace(/global\.sessionStorage/g, 'global.sessionMap');
  
  fs.writeFileSync(filePath, content, 'utf8');
  console.log('已修复全局会话存储定义');
  return true;
}

// 执行修复
fixPruneSessionInterval();
fixGlobalSessionStorage();

console.log('会话修复脚本执行完成');