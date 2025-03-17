/**
 * 用户ID不匹配修复脚本
 * 
 * 这个脚本修复auth.ts中的登录和验证登录过程，确保返回正确的用户ID和权限信息
 * 主要解决问题：前端存储的用户ID与数据库不一致，导致权限验证失败
 */
const fs = require('fs');
const path = require('path');

// 读取 auth.ts 文件
const authFilePath = path.join(__dirname, 'server', 'auth.ts');
let authContent = fs.readFileSync(authFilePath, 'utf8');

// 修复 completeLogin 函数，添加权限信息和返回用户数据
let lines = authContent.split('\n');

// 定位到 completeLogin 函数中的 undefined 行
let targetLine = -1;
for (let i = 0; i < lines.length; i++) {
  if (lines[i].trim() === 'undefined' && 
      lines[i-1].trim() === '});' && 
      lines[i-2].trim().includes('path:')) {
    targetLine = i;
    break;
  }
}

if (targetLine > 0) {
  console.log(`找到目标行: ${targetLine}`);
  
  // 替换为完整的用户返回信息
  lines[targetLine] = `    // 构建权限信息
    const permissions = {
      pages: user.role === 'admin' ? ['all'] : ['dashboard', 'profile'],
      actions: user.role === 'admin' ? ['all'] : ['read'],
      warehouses: user.role === 'admin' ? { all: { canView: true, canManage: true } } : {}
    };
    
    // 返回成功响应
    console.log('[认证系统] 验证登录成功，返回用户ID:', user.id);
    
    return res.status(200).json({
      success: true,
      authenticated: true,
      message: '登录成功',
      sessionId,
      user: {
        id: user.id, // 确保使用真实的用户ID
        username: user.username,
        role: user.role,
        fullName: user.full_name,
        language: user.language || 'zh',
        isactive: user.is_active, // 使用前端要求的字段名
        isSocialUser: !!user.social_id, // 社交账号标识
        permissions // 添加权限信息
      }
    });`;
  
  // 写回文件
  fs.writeFileSync(authFilePath, lines.join('\n'), 'utf8');
  console.log('已修复 completeLogin 函数，添加用户ID和权限信息');
} else {
  console.error('未找到目标行，请手动修复');
}

// 其他修复逻辑可以在这里添加