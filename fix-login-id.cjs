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

// 修复 initiateLogin 函数，添加权限信息和返回用户数据
// 搜索模式：判断用户可以直接登录的情况下，在返回用户数据时添加权限信息
const initiateFuncRegex = /export async function initiateLogin\(req: Request, res: Response\) \{[\s\S]*?return res\.status\(200\)\.json\(\{[\s\S]*?id: user\.id,[\s\S]*?language: user\.language \|\| 'zh'[\s\S]*?\}\)\;/;

// 查找匹配
const match = authContent.match(initiateFuncRegex);

if (match) {
  console.log('找到 initiateLogin 函数，准备修复...');
  
  // 构造替换后的函数内容 - 在用户数据中添加权限信息
  const replacementCode = match[0].replace(
    /return res\.status\(200\)\.json\(\{[\s\S]*?user: \{[\s\S]*?id: user\.id,[\s\S]*?language: user\.language \|\| 'zh'[\s\S]*?\}\)/,
    `// 构建权限信息
    const permissions = {
      pages: user.role === 'admin' ? ['all'] : ['dashboard', 'profile'],
      actions: user.role === 'admin' ? ['all'] : ['read'],
      warehouses: user.role === 'admin' ? { all: { canView: true, canManage: true } } : {}
    };
    
    // 返回成功响应
    console.log('[认证系统] 登录成功，返回用户ID:', user.id);
    
    return res.status(200).json({
      success: true,
      authenticated: true,
      message: '登录成功',
      sessionId,
      requireVerification: false,
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
    })`
  );
  
  // 更新文件内容
  authContent = authContent.replace(initiateFuncRegex, replacementCode);
  
  // 写回文件
  fs.writeFileSync(authFilePath, authContent, 'utf8');
  console.log('已修复 initiateLogin 函数，添加了用户ID和权限信息');
} else {
  console.error('无法找到 initiateLogin 函数，请手动修复');
}

// 修复 getCurrentUser 函数，确保返回权限信息
const getCurrentUserRegex = /export async function getCurrentUser\(req: Request, res: Response\) \{[\s\S]*?return res\.status\(200\)\.json\(\{[\s\S]*?id: user\.id,[\s\S]*?\}\);[\s\S]*?\}/;

const currentUserMatch = authContent.match(getCurrentUserRegex);

if (currentUserMatch) {
  console.log('找到 getCurrentUser 函数，准备修复...');
  
  // 构造替换后的函数内容 - 在用户数据中添加权限信息
  const replacementCode = currentUserMatch[0].replace(
    /return res\.status\(200\)\.json\(\{[\s\S]*?user: \{[\s\S]*?id: user\.id,[\s\S]*?\}\);/,
    `// 构建权限信息
    const permissions = {
      pages: user.role === 'admin' ? ['all'] : ['dashboard', 'profile'],
      actions: user.role === 'admin' ? ['all'] : ['read'],
      warehouses: user.role === 'admin' ? { all: { canView: true, canManage: true } } : {}
    };
    
    // 返回成功响应
    console.log('[认证系统] 获取当前用户信息，用户ID:', user.id);
    
    return res.status(200).json({
      authenticated: true,
      user: {
        id: user.id, // 确保使用真实的用户ID
        username: user.username,
        role: user.role,
        fullName: user.full_name,
        avatarUrl: user.avatar_url,
        language: user.language || 'zh',
        isactive: user.is_active, // 使用前端要求的字段名
        isSocialUser: !!user.social_id, // 社交账号标识
        permissions // 添加权限信息
      }
    });`
  );
  
  // 更新文件内容
  authContent = authContent.replace(getCurrentUserRegex, replacementCode);
  
  // 写回文件
  fs.writeFileSync(authFilePath, authContent, 'utf8');
  console.log('已修复 getCurrentUser 函数，添加了用户ID和权限信息');
} else {
  console.error('无法找到 getCurrentUser 函数，请手动修复');
}

console.log('修复脚本执行完成');