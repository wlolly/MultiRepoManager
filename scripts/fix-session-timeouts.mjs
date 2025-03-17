/**
 * 修复会话超时警告脚本
 * 
 * 这个脚本修复 TimeoutOverflowWarning 警告，通过替换大整数超时值为合理的值
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// 修复pruneSessionInterval和ttl参数
function fixSessionIntervals() {
  console.log('开始修复会话超时参数...');
  const filePath = path.join(process.cwd(), 'server/middleware/session.ts');
  
  if (!fs.existsSync(filePath)) {
    console.error('会话中间件文件不存在:', filePath);
    return false;
  }
  
  let content = fs.readFileSync(filePath, 'utf8');
  
  // 1. 修复pruneSessionInterval参数
  content = content.replace(
    /pruneSessionInterval:\s*\d+\s*\*\s*\d+\s*\*\s*\d+\s*\*\s*\d+/g, 
    'pruneSessionInterval: 86400'
  );
  
  // 2. 修复ttl参数
  content = content.replace(
    /ttl:\s*\d+\s*\*\s*\d+\s*\*\s*\d+\s*\*\s*\d+/g, 
    'ttl: 2592000'
  );
  
  // 3. 修复checkPeriod参数
  content = content.replace(
    /checkPeriod:\s*\d+\s*\*\s*\d+\s*\*\s*\d+\s*\*\s*\d+/g, 
    'checkPeriod: 86400000'
  );
  
  fs.writeFileSync(filePath, content, 'utf8');
  console.log('已修复会话超时参数');
  return true;
}

// 执行修复
fixSessionIntervals();

console.log('会话修复脚本执行完成');