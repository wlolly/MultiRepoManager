/**
 * 创建管理员用户脚本
 * 此脚本用于创建一个具有管理员权限的账户，用户名为 222，密码为 222
 * 此脚本使用命令行调用MySQL而不是使用MySQL模块
 */
import { exec } from 'child_process';
import * as crypto from 'crypto';
import { promisify } from 'util';

const execPromise = promisify(exec);

// 简单的密码哈希函数（替代bcryptjs）
function hashPassword(password: string): string {
  // 创建一个固定的salt值，这里只用于示例
  const salt = 'e5warehouse-salt';
  // 使用SHA-256哈希算法
  return crypto.createHmac('sha256', salt)
    .update(password)
    .digest('hex');
}

async function createAdminUser() {
  try {
    console.log('开始创建管理员用户...');
    
    // 使用自定义函数哈希密码
    const hashedPassword = hashPassword('222');
    
    // 检查用户是否已存在
    const checkUserSql = `mysql -h 77.243.80.129 -P 3307 -u root -p'@Hzca1575@' wlolly -e "SELECT * FROM users WHERE username = '222'"`;
    const { stdout: checkResult } = await execPromise(checkUserSql);
    
    if (checkResult.includes('222')) {
      console.log('用户名为 222 的用户已存在');
      return;
    }
    
    // 创建管理员用户 - 只使用表中实际存在的字段
    const insertUserSql = `mysql -h 77.243.80.129 -P 3307 -u root -p'@Hzca1575@' wlolly -e "INSERT INTO users (username, password, full_name) VALUES ('222', '${hashedPassword}', '管理员')"`;
    await execPromise(insertUserSql);
    
    console.log('管理员用户创建成功！');
    console.log({
      username: '222',
      password: '222'
    });
    
  } catch (error) {
    console.error('创建管理员用户失败:', error);
  }
}

// 执行创建管理员用户的函数
createAdminUser().then(() => {
  console.log('脚本执行完毕');
  process.exit(0);
}).catch(err => {
  console.error('脚本执行失败:', err);
  process.exit(1);
});