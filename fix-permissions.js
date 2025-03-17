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

// 替换所有的权限验证逻辑
content = content.replace(/user\.role === ['"]admin['"]/g, "user.role === 'admin' || user.role === 'super_admin'");

// 替换isAdmin函数中的验证逻辑
content = content.replace(/role === ['"]admin['"]/g, "role === 'admin' || role === 'super_admin'");

// 替换session属性设置中的验证逻辑
content = content.replace(/req\.session\.isAdmin = user\.role === ['"]admin['"]/g, "req.session.isAdmin = user.role === 'admin' || user.role === 'super_admin'");

// 输出修改后的结果
fs.writeFileSync(filePath, content);
console.log('权限验证逻辑已更新，现在包含super_admin角色');
