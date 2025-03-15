/**
 * 创建管理员用户脚本
 * 此脚本用于创建一个具有管理员权限的账户，用户名为 222，密码为 222
 */
import { db } from '../server/db';
import { users } from '../shared/schema';
import { eq } from 'drizzle-orm';
import * as crypto from 'crypto';

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
    
    // 检查用户是否已存在
    const existingUsers = await db.select().from(users).where(eq(users.username, '222')).execute();
    const existingUser = existingUsers.length > 0 ? existingUsers[0] : null;
    
    if (existingUser) {
      console.log('用户名为 222 的用户已存在，正在更新为管理员权限...');
      
      // 更新用户为管理员权限
      await db.update(users)
        .set({ 
          role: 'admin',
          isActive: true
        })
        .where(eq(users.username, '222'))
        .execute();
      
      console.log('用户已更新为管理员！');
      return;
    }
    
    // 使用自定义函数哈希密码
    const hashedPassword = hashPassword('222');
    
    // 创建管理员用户
    await db.insert(users).values({
      username: '222',
      fullName: '管理员',
      email: 'admin@example.com',
      password: hashedPassword,
      role: 'admin',
      isActive: true,
      userSource: 'local',
      createdAt: new Date(),
      updatedAt: new Date()
    }).execute();
    
    console.log('管理员用户创建成功！');
    console.log({
      username: '222',
      password: '222',
      role: 'admin'
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