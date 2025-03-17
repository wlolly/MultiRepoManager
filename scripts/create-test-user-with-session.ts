/**
 * 创建测试用户并设置会话脚本
 * 直接在数据库中创建一个测试用户，并设置相应的会话记录
 */

import { hashPassword } from '../server/auth';
import { db } from '../server/db';
import { userRoleEnum, users, userSessions } from '@shared/schema';
import { sql } from 'drizzle-orm';

/**
 * 主函数：创建测试用户并设置会话
 */
async function createTestUserAndSession() {
  console.log('开始创建测试用户和会话...');
  
  try {
    // 1. 检查用户是否已存在
    const existingUser = await db.select().from(users).where(sql`username = 'testuser'`);
    
    let userId: number;
    
    if (existingUser.length > 0) {
      console.log('测试用户已存在，ID:', existingUser[0].id);
      userId = existingUser[0].id;
    } else {
      // 2. 创建测试用户
      const insertResult = await db.insert(users).values({
        username: 'testuser',
        password: hashPassword('password'),
        email: 'test@example.com',
        role: 'admin' as any, // 使用管理员角色
        isactive: true,
        fullname: '测试用户',
        language: 'zh',
        createdAt: new Date(),
        updatedAt: new Date(),
        usersource: 'local',
        socialid: null,
        avatarurl: null,
        phoneNumber: null,
        lastLoginAt: new Date()
      }).returning({ id: users.id });
      
      if (insertResult.length === 0) {
        throw new Error('创建用户失败，没有返回ID');
      }
      
      userId = insertResult[0].id;
      console.log('已创建测试用户，ID:', userId);
    }
    
    // 3. 创建固定的测试会话ID
    const testSessionId = 'test_session_id_12345';
    
    // 4. 检查会话是否已存在
    const existingSession = await db.select().from(userSessions).where(sql`session_id = ${testSessionId}`);
    
    if (existingSession.length > 0) {
      console.log('测试会话已存在，正在更新...');
      await db.update(userSessions)
        .set({
          userId: userId,
          lastActivity: new Date(),
          isActive: true
        })
        .where(sql`session_id = ${testSessionId}`);
    } else {
      // 5. 创建会话记录
      await db.insert(userSessions).values({
        sessionId: testSessionId,
        userId: userId,
        ipAddress: '127.0.0.1',
        userAgent: 'Test Agent',
        isActive: true,
        lastActivity: new Date(),
        createdAt: new Date()
      });
      
      console.log('已创建测试会话，ID:', testSessionId);
    }
    
    // 6. 输出登录信息
    console.log('\n==================================');
    console.log('测试用户和会话创建成功！');
    console.log('登录信息:');
    console.log('- 用户名: testuser');
    console.log('- 密码: password');
    console.log('- 会话ID: ' + testSessionId);
    console.log('==================================\n');
    
    console.log('现在，您可以使用以下方法测试登录:');
    console.log('1. 使用测试会话ID访问系统');
    console.log('2. 使用用户名和密码通过登录表单登录');
    
  } catch (error) {
    console.error('创建测试用户和会话时出错:', error);
  }
}

// 执行主函数
createTestUserAndSession().catch(console.error).finally(() => process.exit(0));