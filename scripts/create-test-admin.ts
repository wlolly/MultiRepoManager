/**
 * 创建测试管理员账户
 * 用于测试登录功能和权限管理
 */

import { createPostgresConnection } from '../server/database';
import { hashPassword } from '../server/auth';
import dotenv from 'dotenv';

// 加载环境变量
dotenv.config();

async function createAdminUser() {
  try {
    console.log('开始创建测试管理员用户...');
    
    // 创建数据库连接
    const connection = await createPostgresConnection();
    if (!connection) {
      throw new Error('无法连接到数据库');
    }
    
    const { client } = connection;
    console.log('[数据库] 连接测试成功!');
    console.log('✅ 正在使用PostgreSQL数据库存储模式运行');
    
    // 检查用户是否已存在
    const existingAdmin = await client`
      SELECT * FROM users WHERE username = 'admin' LIMIT 1
    `;
    
    if (existingAdmin && existingAdmin.length > 0) {
      console.log('管理员用户已存在，无需创建');
      return existingAdmin[0];
    }
    
    // 创建管理员用户
    const hashedPassword = hashPassword('admin123');
    
    // 直接使用SQL插入，以规避schema.ts与数据库结构不一致的问题
    const insertResult = await client`
      INSERT INTO users (username, password, role, is_active, full_name, user_source, created_at, updated_at)
      VALUES ('admin', ${hashedPassword}, 'super_admin', true, '系统管理员', 'local', ${new Date()}, ${new Date()})
      RETURNING *
    `;
    
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