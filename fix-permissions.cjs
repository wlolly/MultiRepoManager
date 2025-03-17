/**
 * 修复super_admin权限脚本
 * 
 * 用于确保所有权限验证逻辑中都包含super_admin角色
 */
const fs = require('fs');
const path = require('path');

// 读取文件
const filePath = path.join(__dirname, './server/auth.ts');
let content = fs.readFileSync(filePath, 'utf8');

console.log('原始内容中的admin角色检查次数:', (content.match(/user\.role === ['"]admin['"]/g) || []).length);
console.log('原始内容中的super_admin角色检查次数:', (content.match(/user\.role === ['"]super_admin['"]/g) || []).length);
console.log('原始内容中已包含super_admin的组合检查次数:', (content.match(/user\.role === ['"]admin['"] \|\| user\.role === ['"]super_admin['"]/g) || []).length);

// 替换所有仅检查admin而不检查super_admin的地方
content = content.replace(/user\.role === ['"]admin['"]/g, "user.role === 'admin' || user.role === 'super_admin'");

// 替换isAdmin函数中的验证逻辑
content = content.replace(/role === ['"]admin['"]/g, "role === 'admin' || role === 'super_admin'");

console.log('修改后内容中的组合检查次数:', (content.match(/user\.role === ['"]admin['"] \|\| user\.role === ['"]super_admin['"]/g) || []).length);

// 输出修改后的结果
fs.writeFileSync(filePath, content);
console.log('权限验证逻辑已更新');
