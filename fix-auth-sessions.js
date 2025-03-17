/**
 * 修复认证会话问题脚本
 * 
 * 该脚本用于将 server/auth.ts 中的所有会话管理代码更新为一致的格式
 * 包括添加 isAuthenticated 属性和会话保存逻辑
 */
import * as fs from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

// 获取当前文件的目录
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// 读取 auth.ts 文件
const authFilePath = join(__dirname, 'server', 'auth.ts');
let authContent = fs.readFileSync(authFilePath, 'utf8');

// 修复 completeLogin 函数，直接使用正则表达式匹配整个函数体
const completeFuncRegex = /export async function completeLogin\(req: Request, res: Response\) \{[\s\S]*?undefined[\s\S]*?catch \(error\) \{/;

// 查找匹配
const match = authContent.match(completeFuncRegex);

if (match) {
  console.log('找到 completeLogin 函数，准备修复...');
  
  // 构造替换后的函数内容
  const replacementCode = match[0]
    .replace('undefined', `// 构建权限信息
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
    });`);
  
  // 更新文件内容
  authContent = authContent.replace(completeFuncRegex, replacementCode);
  
  // 写回文件
  fs.writeFileSync(authFilePath, authContent, 'utf8');
  console.log('已修复 completeLogin 函数，添加了用户ID和权限信息');
} else {
  console.error('无法找到 completeLogin 函数，请手动修复');
}

console.log('修复脚本执行完成');