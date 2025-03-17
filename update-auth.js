// ESM Module version
import * as fs from 'fs';

// 读取 auth.ts 文件
const authFilePath = './server/auth.ts';
let lines = fs.readFileSync(authFilePath, 'utf8').split('\n');

// 在指定行插入代码
if (lines[375].trim() === '' && lines[376].trim() === 'undefined') {
  console.log('找到目标位置，开始修复...');
  
  // 新的代码块，替换undefined
  const newCode = [
    '    // 构建权限信息',
    '    const permissions = {',
    '      pages: user.role === \'admin\' ? [\'all\'] : [\'dashboard\', \'profile\'],',
    '      actions: user.role === \'admin\' ? [\'all\'] : [\'read\'],',
    '      warehouses: user.role === \'admin\' ? { all: { canView: true, canManage: true } } : {}',
    '    };',
    '    ',
    '    // 返回成功响应',
    '    console.log(\'[认证系统] 验证登录成功，返回用户ID:\', user.id);',
    '    ',
    '    return res.status(200).json({',
    '      success: true,',
    '      authenticated: true,',
    '      message: \'登录成功\',',
    '      sessionId,',
    '      user: {',
    '        id: user.id, // 确保使用真实的用户ID',
    '        username: user.username,',
    '        role: user.role,',
    '        fullName: user.full_name,',
    '        language: user.language || \'zh\',',
    '        isactive: user.is_active, // 使用前端要求的字段名',
    '        isSocialUser: !!user.social_id, // 社交账号标识',
    '        permissions // 添加权限信息',
    '      }',
    '    });'
  ];
  
  // 替换原来的 undefined 行
  lines.splice(375, 2, ...newCode);
  
  // 写回文件
  fs.writeFileSync(authFilePath, lines.join('\n'), 'utf8');
  console.log('已修复 completeLogin 函数的返回值，添加了用户ID和权限信息');
} else {
  console.log('未找到目标行或行内容不匹配，请检查文件');
}
