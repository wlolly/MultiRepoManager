/**
 * 创建管理员用户脚本
 * 此脚本使用Drizzle ORM创建一个具有管理员权限的标准账户
 */
import { db } from '../server/db';
import { users } from '../shared/schema';
import { eq } from 'drizzle-orm';
import { hashPassword } from '../server/auth';

async function createAdminUser() {
  try {
    console.log('开始创建管理员用户...');
    
    const username = 'admin';
    const password = 'admin123';
    
    // 检查用户是否已存在
    const existingUser = await db.select().from(users).where(eq(users.username, username));
    
    if (existingUser.length > 0) {
      console.log(`用户 ${username} 已存在，无需重新创建`);
      return;
    }
    
    // 使用标准的哈希函数处理密码
    const hashedPassword = hashPassword(password);
    
    // 创建管理员用户
    const result = await db.insert(users).values({
      username: username,
      password: hashedPassword,
      full_name: '系统管理员',
      role: 'admin',
      user_source: 'local',
      is_active: true,
      email: null,
      phone_number: null,
      avatar_url: null,
      social_id: null,
      social_data: null,
    });
    
    console.log(`管理员用户创建成功！用户名: ${username}, 密码: ${password}`);
    console.log(result);
    
  } catch (error) {
    console.error('创建管理员用户失败:', error);
  } finally {
    process.exit(0);
  }
}

// 执行创建管理员用户的函数
createAdminUser();