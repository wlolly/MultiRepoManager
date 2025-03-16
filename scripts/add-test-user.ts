/**
 * 添加开发环境用户脚本
 * 用于创建一个开发环境中的管理员用户，用户名为 admin，密码为 admin123
 */
import { db } from '../server/db';
import { users } from '../shared/schema';
import { eq } from 'drizzle-orm';
import crypto from 'crypto';
import { hashPassword } from '../server/auth'; 

async function addDevUser() {
  try {
    console.log('开始创建开发环境用户...');
    
    const username = 'admin';
    const password = 'admin123';
    
    // 首先检查用户是否已存在
    const existingUser = await db.select().from(users).where(eq(users.username, username));
    
    if (existingUser.length > 0) {
      console.log(`用户 ${username} 已存在，无需重新创建`);
      return;
    }
    
    // 创建管理员用户
    const hashedPassword = hashPassword(password);
    
    const result = await db.insert(users).values({
      username: username,
      password: hashedPassword,
      fullName: '系统管理员',
      role: 'admin',
      userSource: 'local',
      isActive: true,
      email: null,
      phoneNumber: null,
      avatarUrl: null,
      socialId: null,
      socialData: null,
    });
    
    console.log(`开发环境用户创建成功！用户名: ${username}, 密码: ${password}`, result);
  } catch (error) {
    console.error('创建开发环境用户失败:', error);
  } finally {
    // 关闭数据库连接
    process.exit(0);
  }
}

// 执行函数
addDevUser();