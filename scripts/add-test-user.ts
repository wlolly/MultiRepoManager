/**
 * 添加测试用户脚本
 * 用于创建一个测试用户，用户名为 222，密码为 222
 */
import { db } from '../server/db';
import { users } from '../shared/schema';
import { eq } from 'drizzle-orm';
import crypto from 'crypto';

// 密码哈希函数 - 使用与auth.ts中相同的逻辑
function hashPassword(password: string): string {
  return crypto
    .createHash('sha256')
    .update(password + 'warehouse-management-salt')
    .digest('hex');
}

async function addTestUser() {
  try {
    console.log('开始创建测试用户...');
    
    // 首先检查用户是否已存在
    const existingUser = await db.select().from(users).where(eq(users.username, '222'));
    
    if (existingUser.length > 0) {
      console.log('测试用户已存在，无需重新创建');
      return;
    }
    
    // 创建测试用户
    const hashedPassword = hashPassword('222');
    
    const result = await db.insert(users).values({
      username: '222',
      password: hashedPassword,
      fullName: '测试用户',
      role: 'admin',
      userSource: 'local',
      isActive: true,
      email: null,
      phoneNumber: null,
      avatarUrl: null,
      socialId: null,
      socialData: null,
    });
    
    console.log('测试用户创建成功！', result);
  } catch (error) {
    console.error('创建测试用户失败:', error);
  } finally {
    // 关闭数据库连接
    process.exit(0);
  }
}

// 执行函数
addTestUser();