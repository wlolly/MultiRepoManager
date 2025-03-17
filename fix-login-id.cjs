/**
 * 用户ID不匹配修复脚本
 * 
 * 这个脚本修复auth.ts中的登录和验证登录过程，确保返回正确的用户ID和权限信息
 * 主要解决问题：前端存储的用户ID与数据库不一致，导致权限验证失败
 */

const fs = require('fs');
const path = require('path');

// 获取auth.ts文件路径
const authFilePath = path.join(__dirname, 'server', 'auth.ts');

// 读取文件内容
let authContent = fs.readFileSync(authFilePath, 'utf8');

// 1. 修复登录函数返回的用户数据
authContent = authContent.replace(
  /\/\/ 返回带用户数据的成功响应[\s\S]*?console\.log\('\[认证系统\] 登录成功，返回会话ID:', sessionId\);[\s\S]*?\/\/ 增加客户端权限信息[\s\S]*?const permissions = \{[\s\S]*?return res\.status\(200\)\.json\(\{[\s\S]*?success: true,[\s\S]*?authenticated: true,[\s\S]*?message: '登录成功',[\s\S]*?sessionId,[\s\S]*?requireVerification: false,[\s\S]*?user: \{[\s\S]*?id: user\.id,[\s\S]*?username: user\.username,[\s\S]*?role: user\.role,[\s\S]*?fullName: user\.full_name,[\s\S]*?language: user\.language \|\| 'zh',[\s\S]*?isactive: user\.is_active,[\s\S]*?permissions[\s\S]*?\}[\s\S]*?\}\);/g,
  `// 返回带用户数据的成功响应
    console.log('[认证系统] 登录成功，返回会话ID:', sessionId);
    console.log('[认证系统] 登录用户ID:', user.id, '用户名:', user.username);
    
    // 增加客户端权限信息
    const permissions = {
      pages: user.role === 'admin' ? ['all'] : ['dashboard', 'profile'],
      actions: user.role === 'admin' ? ['all'] : ['read'],
      warehouses: user.role === 'admin' ? { all: { canView: true, canManage: true } } : {}
    };
    
    // 确保前端收到正确的用户ID
    // 修复ID不匹配问题：确保前端收到的ID与数据库匹配
    return res.status(200).json({
      success: true,
      authenticated: true,
      message: '登录成功',
      sessionId,
      requireVerification: false,
      user: {
        id: user.id, // 使用真实的用户ID
        username: user.username,
        role: user.role,
        fullName: user.full_name,
        language: user.language || 'zh',
        isactive: user.is_active, // 使用前端要求的字段名
        isSocialUser: !!user.social_id, // 社交账号标识
        permissions
      }
    });`
);

// 2. 修复验证登录返回的用户数据 - completeLogin函数
authContent = authContent.replace(
  /\/\/ 返回成功响应[\s\S]*?return res\.status\(200\)\.json\(\{[\s\S]*?success: true,[\s\S]*?authenticated: true,[\s\S]*?message: '登录成功',[\s\S]*?sessionId,[\s\S]*?user: \{[\s\S]*?id: user\.id,[\s\S]*?username: user\.username,[\s\S]*?role: user\.role,[\s\S]*?fullName: user\.full_name,[\s\S]*?language: user\.language \|\| 'zh'[\s\S]*?\}[\s\S]*?\}\);/g,
  `// 构建权限信息
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
    });`
);

// 3. 修复传统登录方法 - loginUser函数
authContent = authContent.replace(
  /\/\/ 返回成功响应[\s\S]*?return res\.status\(200\)\.json\(\{[\s\S]*?success: true,[\s\S]*?authenticated: true,[\s\S]*?message: '登录成功',[\s\S]*?sessionId,[\s\S]*?user: \{[\s\S]*?id: user\.id,[\s\S]*?username: user\.username,[\s\S]*?role: user\.role,[\s\S]*?fullName: user\.full_name,[\s\S]*?language: user\.language \|\| 'zh'[\s\S]*?\}[\s\S]*?\}\);/g,
  `// 构建权限信息
    const permissions = {
      pages: user.role === 'admin' ? ['all'] : ['dashboard', 'profile'],
      actions: user.role === 'admin' ? ['all'] : ['read'],
      warehouses: user.role === 'admin' ? { all: { canView: true, canManage: true } } : {}
    };
    
    // 返回成功响应
    console.log('[认证系统] 传统登录成功，返回用户ID:', user.id);
    
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
    });`
);

// 保存修改后的文件
fs.writeFileSync(authFilePath, authContent, 'utf8');

console.log('用户ID不匹配问题修复完成');
console.log('已更新server/auth.ts中的所有登录相关函数，确保它们返回一致的用户ID和权限信息');