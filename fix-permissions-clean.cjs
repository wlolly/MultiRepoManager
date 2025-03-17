/**
 * 修复super_admin权限脚本 - 清理版本
 * 
 * 用于清理重复的super_admin角色检查
 */
const fs = require('fs');
const path = require('path');

// 读取文件
const filePath = path.join(__dirname, './server/auth.ts');
let content = fs.readFileSync(filePath, 'utf8');

// 清理重复的权限检查
content = content.replace(/user\.role === ['"]admin['"] \|\| role === ['"]super_admin['"] \|\| user\.role === ['"]super_admin['"] \|\| role === ['"]super_admin['"] \|\| user\.role === ['"]super_admin['"]( \|\| user\.role === ['"]super_admin['"])?/g, "user.role === 'admin' || user.role === 'super_admin'");

// 清理重复的isAdminRole赋值
content = content.replace(/const isAdminRole = user\.role === ['"]admin['"] \|\| role === ['"]super_admin['"] \|\| user\.role === ['"]super_admin['"] \|\| role === ['"]super_admin['"] \|\| user\.role === ['"]super_admin['"]( \|\| user\.role === ['"]super_admin['"])?;/g, "const isAdminRole = user.role === 'admin' || user.role === 'super_admin';");

// 输出修改后的结果
fs.writeFileSync(filePath, content);
console.log('权限验证逻辑已清理完成');
