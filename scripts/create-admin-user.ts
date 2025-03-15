/**
 * 创建管理员用户脚本
 * 此脚本用于创建一个具有管理员权限的账户，用户名为 222，密码为 222
 */
import bcrypt from 'bcryptjs';
import { db } from '../server/db';
import { users } from '../shared/schema';

async function createAdminUser() {
  try {
    console.log('开始创建管理员用户...');
    
    // 检查用户是否已存在
    const existingUser = await db.query.users.findFirst({
      where: (users, { eq }) => eq(users.username, '222')
    });
    
    if (existingUser) {
      console.log('用户名为 222 的用户已存在，正在更新为管理员权限...');
      
      // 更新用户为管理员权限
      await db.update(users)
        .set({ 
          role: 'admin',
          isActive: true
        })
        .where(users.username === '222')
        .execute();
      
      console.log('用户已更新为管理员！');
      return;
    }
    
    // 加密密码
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash('222', salt);
    
    // 创建管理员用户
    const result = await db.insert(users).values({
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