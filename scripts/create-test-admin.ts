/**
 * 创建测试管理员账户
 * 用于测试登录功能和权限管理
 */

import { db } from '../server/db';
import { users, userRoleEnum } from '../shared/schema';
import { hashPassword } from '../server/auth';
import { eq } from 'drizzle-orm';

async function createAdminUser() {
  try {
    console.log('开始创建测试管理员用户...');
    
    // 检查用户是否已存在
    const existingAdmin = await db.select().from(users).where(eq(users.username, 'admin')).limit(1);
    
    if (existingAdmin.length > 0) {
      console.log('管理员用户已存在，无需创建');
      return existingAdmin[0];
    }
    
    // 创建管理员用户
    const hashedPassword = hashPassword('admin123');
    
    const insertResult = await db.insert(users).values({
      username: 'admin',
      password: hashedPassword,
      role: 'super_admin',
      isactive: true, // 全小写的isactive字段
      full_name: '系统管理员', // 使用下划线命名规则，与数据库一致
      usersource: 'local', // 全小写的usersource字段
      // 使用与schema.ts中定义相匹配的字段名
      created_at: new Date(), // 使用下划线命名，与数据库保持一致
      updated_at: new Date()  // 使用下划线命名，与数据库保持一致
    }).returning();
    
    console.log('管理员用户创建成功:', insertResult[0]);
    return insertResult[0];
  } catch (error) {
    console.error('创建管理员用户失败:', error);
    throw error;
  }
}

// 执行创建管理员用户的函数
createAdminUser()
  .then(user => {
    console.log('操作完成，用户信息:', user);
    // 输出登录信息
    console.log('\n可以使用以下信息登录:');
    console.log('用户名: admin');
    console.log('密码: admin123');
    console.log('权限: 超级管理员');
    process.exit(0);
  })
  .catch(error => {
    process.exit(1);
  });