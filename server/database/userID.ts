/**
 * 用户ID管理模块
 * 负责内部用户ID的创建、验证和清理
 * 内部用户ID有效期为两天，之后自动清除
 */

import { db } from '../db';
import { sql } from 'drizzle-orm';
import { v4 as uuidv4 } from 'uuid';

// 检查internal_user_ids表是否存在，不存在则创建
export async function initializeUserIDTable(retryCount = 0, maxRetries = 3) {
  try {
    console.log('[UserID] 初始化内部用户ID表...');
    
    // 检查表是否存在
    const checkTableExists = await db.execute(sql`
      SELECT table_name FROM information_schema.tables 
      WHERE table_schema = DATABASE() AND table_name = 'internal_user_ids'
    `);
    
    // 检查结果是否有rows属性且不为空
    const rowsExist = checkTableExists && 
                      (checkTableExists as any).rows && 
                      (checkTableExists as any).rows.length > 0;
    
    if (!rowsExist) {
      console.log('[UserID] 创建内部用户ID表...');
      
      // 创建内部用户ID表
      await db.execute(sql`
        CREATE TABLE IF NOT EXISTS internal_user_ids (
          id VARCHAR(36) PRIMARY KEY,
          user_id INT NOT NULL,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          expires_at TIMESTAMP NOT NULL,
          FOREIGN KEY (user_id) REFERENCES users(id)
        )
      `);
      
      console.log('[UserID] 内部用户ID表创建成功');
    } else {
      console.log('[UserID] 内部用户ID表已存在');
    }
    
    // 设置定时清理过期ID的任务
    setupCleanupTask();
    
    return true;
  } catch (error) {
    console.error(`[UserID] 初始化内部用户ID表失败 (尝试 ${retryCount + 1}/${maxRetries + 1}):`, error);
    
    // 实现重试逻辑
    if (retryCount < maxRetries) {
      const retryDelay = Math.pow(2, retryCount) * 1000; // 指数退避策略: 1s, 2s, 4s...
      console.log(`[UserID] ${retryDelay/1000}秒后将重试初始化...`);
      
      return new Promise<boolean>((resolve) => {
        setTimeout(() => {
          console.log('[UserID] 开始重试初始化...');
          resolve(initializeUserIDTable(retryCount + 1, maxRetries));
        }, retryDelay);
      });
    }
    
    console.error('[UserID] 初始化内部用户ID表失败，已达到最大重试次数');
    return false;
  }
}

// 定期清理过期的用户ID
function setupCleanupTask() {
  // 每小时执行一次清理任务
  const ONE_HOUR = 60 * 60 * 1000;
  
  setInterval(async () => {
    try {
      console.log('[UserID] 执行过期ID清理任务...');
      
      // 删除所有已过期的ID
      const result = await db.execute(sql`
        DELETE FROM internal_user_ids 
        WHERE expires_at < CURRENT_TIMESTAMP
      `);
      
      // 安全获取删除的行数
      const count = result && (result as any).rowsAffected ? (result as any).rowsAffected : 0;
      console.log(`[UserID] 已清理 ${count} 个过期ID`);
    } catch (error) {
      console.error('[UserID] 清理过期ID失败:', error);
    }
  }, ONE_HOUR);
  
  console.log('[UserID] 已设置定期清理任务');
}

// 为内部用户创建ID，有效期为两天
export async function createInternalUserID(userId: number, retryCount = 0, maxRetries = 2): Promise<string | null> {
  try {
    // 首先移除该用户的所有现有ID（避免重复）
    await removeUserIDs(userId);
    
    // 生成新的唯一ID
    const internalId = uuidv4();
    
    // 计算过期时间（当前时间 + 2天）
    const TWO_DAYS = 2 * 24 * 60 * 60 * 1000;
    const expiresAt = new Date(Date.now() + TWO_DAYS);
    
    // 保存到数据库
    await db.execute(sql`
      INSERT INTO internal_user_ids (id, user_id, expires_at)
      VALUES (${internalId}, ${userId}, ${expiresAt})
    `);
    
    console.log(`[UserID] 已为用户${userId}创建内部ID: ${internalId}，有效期至 ${expiresAt}`);
    return internalId;
  } catch (error) {
    console.error(`[UserID] 创建内部用户ID失败 (尝试 ${retryCount + 1}/${maxRetries + 1}):`, error);
    
    // 实现重试逻辑
    if (retryCount < maxRetries) {
      const retryDelay = Math.pow(2, retryCount) * 1000; // 指数退避策略: 1s, 2s, 4s...
      console.log(`[UserID] ${retryDelay/1000}秒后将重试创建内部ID...`);
      
      return new Promise<string | null>((resolve) => {
        setTimeout(() => {
          console.log(`[UserID] 开始重试为用户${userId}创建内部ID...`);
          resolve(createInternalUserID(userId, retryCount + 1, maxRetries));
        }, retryDelay);
      });
    }
    
    console.error(`[UserID] 为用户${userId}创建内部ID失败，已达到最大重试次数`);
    return null;
  }
}

// 验证内部用户ID是否有效
export async function validateInternalUserID(internalId: string, retryCount = 0, maxRetries = 2): Promise<number | null> {
  try {
    // 查询匹配的有效ID
    const result = await db.execute(sql`
      SELECT user_id 
      FROM internal_user_ids 
      WHERE id = ${internalId} AND expires_at > CURRENT_TIMESTAMP
    `);
    
    // 检查是否找到有效ID
    const rowsExist = result && 
                      (result as any).rows && 
                      (result as any).rows.length > 0;
    
    if (rowsExist) {
      const userId = (result as any).rows[0].user_id;
      console.log(`[UserID] 验证成功: ID ${internalId} 对应用户 ${userId}`);
      return userId;
    }
    
    console.log(`[UserID] 验证失败: ID ${internalId} 不存在或已过期`);
    return null;
  } catch (error) {
    console.error(`[UserID] 验证内部用户ID失败 (尝试 ${retryCount + 1}/${maxRetries + 1}):`, error);
    
    // 实现重试逻辑
    if (retryCount < maxRetries) {
      const retryDelay = Math.pow(2, retryCount) * 1000; // 指数退避策略: 1s, 2s, 4s...
      console.log(`[UserID] ${retryDelay/1000}秒后将重试验证...`);
      
      return new Promise<number | null>((resolve) => {
        setTimeout(() => {
          console.log(`[UserID] 开始重试验证内部ID ${internalId}...`);
          resolve(validateInternalUserID(internalId, retryCount + 1, maxRetries));
        }, retryDelay);
      });
    }
    
    console.error(`[UserID] 验证内部ID ${internalId} 失败，已达到最大重试次数`);
    return null;
  }
}

// 移除用户的所有ID
export async function removeUserIDs(userId: number): Promise<boolean> {
  try {
    // 删除该用户的所有ID
    await db.execute(sql`
      DELETE FROM internal_user_ids 
      WHERE user_id = ${userId}
    `);
    
    console.log(`[UserID] 已移除用户 ${userId} 的所有ID`);
    return true;
  } catch (error) {
    console.error('[UserID] 移除用户ID失败:', error);
    return false;
  }
}

// 手动清理所有过期ID
export async function cleanupExpiredIDs(): Promise<number> {
  try {
    // 删除所有已过期的ID
    const result = await db.execute(sql`
      DELETE FROM internal_user_ids 
      WHERE expires_at < CURRENT_TIMESTAMP
    `);
    
    // 安全获取删除的行数
    const count = result && (result as any).rowsAffected ? (result as any).rowsAffected : 0;
    console.log(`[UserID] 手动清理: 已删除 ${count} 个过期ID`);
    return count;
  } catch (error) {
    console.error('[UserID] 手动清理过期ID失败:', error);
    return 0;
  }
}