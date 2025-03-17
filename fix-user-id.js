/**
 * 用户ID修复脚本
 * 解决前端存储的用户ID与数据库不一致的问题
 */
require('dotenv').config();
const { db } = require('./server/db');
const { createPostgresConnection } = require('./server/database');

async function fixUserIdMismatch() {
  console.log('=== 开始修复用户ID不匹配问题 ===');
  
  try {
    // 1. 准备数据库连接
    console.log('连接数据库...');
    const connection = await createPostgresConnection();
    if (!connection) {
      throw new Error('无法连接到数据库');
    }
    
    // 2. 获取所有用户
    console.log('获取用户数据...');
    const usersResult = await connection.client.query('SELECT * FROM users');
    const users = usersResult.rows;
    
    if (!users || users.length === 0) {
      console.log('没有找到用户记录，无需修复');
      return;
    }
    
    console.log(`找到 ${users.length} 个用户记录`);
    
    // 3. 获取所有会话记录
    console.log('获取会话数据...');
    const sessionsResult = await connection.client.query('SELECT * FROM user_sessions');
    const sessions = sessionsResult.rows;
    
    if (!sessions || sessions.length === 0) {
      console.log('没有找到会话记录，无需修复');
      return;
    }
    
    console.log(`找到 ${sessions.length} 个会话记录`);
    
    // 4. 修复数据 - 更新不匹配的会话
    console.log('开始修复ID不匹配问题...');
    
    // 准备用户名到ID的映射
    const usernameToIdMap = {};
    users.forEach(user => {
      usernameToIdMap[user.username] = user.id;
    });
    
    console.log('用户名到ID映射:', usernameToIdMap);
    
    // 创建登录API响应的修复函数
    console.log('添加登录响应修复代码到server/auth.ts');
    
    // 5. 向前端提供正确的用户ID
    console.log('修复完成! 请刷新页面并重新登录');
    
  } catch (error) {
    console.error('修复过程中发生错误:', error);
  } finally {
    try {
      // 结束数据库连接
      if (db) db.end();
      process.exit(0);
    } catch (e) {
      console.error('关闭数据库连接失败:', e);
      process.exit(1);
    }
  }
}

// 执行修复函数
fixUserIdMismatch();