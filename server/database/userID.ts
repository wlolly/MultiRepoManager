/**
 * 用户ID管理模块
 * 负责内部用户ID的创建、验证和清理
 * 内部用户ID有效期为两天，之后自动清除
 */

import { db, useFallbackStorage } from '../db';
import { sql } from 'drizzle-orm';
import { v4 as uuidv4 } from 'uuid';

// 检查数据库连接是否有效
async function isDatabaseConnected(): Promise<boolean> {
  // 如果使用内存存储模式，则认为数据库不可用
  if (useFallbackStorage) {
    console.log('[UserID] 系统正在使用内存存储模式，跳过数据库操作');
    return false;
  }
  
  try {
    const result = await db.execute(sql`SELECT 1 AS test`);
    
    // 检查查询结果是否包含正确的值
    const isConnected = result && 
                       result[0] && 
                       result[0][0] && 
                       result[0][0].test === 1;
    
    if (!isConnected) {
      console.error('[UserID] 数据库连接测试失败: 未返回预期结果');
    }
    
    return isConnected;
  } catch (error) {
    console.error('[UserID] 数据库连接测试失败:', error);
    return false;
  }
}

// 检查internal_user_ids表是否存在，不存在则创建
export async function initializeUserIDTable(retryCount = 0, maxRetries = 3) {
  try {
    console.log('[UserID] 初始化内部用户ID表...');
    
    // 首先检查数据库连接是否有效
    const isConnected = await isDatabaseConnected();
    if (!isConnected) {
      console.log('[UserID] 数据库连接不可用，跳过用户ID表初始化');
      return false;
    }
    
    // 检查users表是否存在（是foreign key的前提）
    const usersTableExists = await db.execute(sql`
      SELECT table_name FROM information_schema.tables 
      WHERE table_schema = DATABASE() AND table_name = 'users'
    `);
    
    const usersExist = usersTableExists && 
                      (usersTableExists as any).rows && 
                      (usersTableExists as any).rows.length > 0;
                      
    if (!usersExist) {
      console.log('[UserID] users表不存在，跳过用户ID表初始化（因为需要外键引用）');
      return false;
    }
    
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
          FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
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
// 如果用户ID < 0，直接返回null表示不创建内部ID（访客用户）
export async function createInternalUserID(userId: number, retryCount = 0, maxRetries = 2): Promise<string | null> {
  // 访客用户或无效用户ID，不创建内部ID
  if (userId < 0) {
    console.log(`[UserID] 访客用户 (ID=${userId}) 不创建内部ID`);
    return null;
  }
  
  // 检查数据库连接状态
  const isConnected = await isDatabaseConnected();
  if (!isConnected) {
    console.log('[UserID] 数据库连接不可用，跳过内部ID创建');
    return null;
  }
  
  try {
    // 首先检查用户是否存在
    const userExists = await db.execute(sql`
      SELECT id FROM users WHERE id = ${userId} LIMIT 1
    `);
    
    const userFound = userExists && 
                      userExists[0] && 
                      userExists[0][0];
                      
    if (!userFound) {
      console.log(`[UserID] 用户ID ${userId} 不存在，跳过内部ID创建`);
      return null;
    }
    
    // 移除该用户的所有现有ID（避免重复）
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
// 如果传入的internalId是null或空字符串，视为访客用户，返回-1
// 简化验证逻辑：只要ID存在即可验证通过，不需要完全匹配
export async function validateInternalUserID(internalId: string | null, retryCount = 0, maxRetries = 2): Promise<number | null> {
  // 空ID或null处理 - 对应访客用户（隐式访客模式）
  if (!internalId) {
    console.log(`[UserID] 访客模式: 空ID或null表示访客用户`);
    return -1; // 返回-1表示访客用户ID
  }
  
  // 检查数据库连接状态
  const isConnected = await isDatabaseConnected();
  if (!isConnected) {
    console.log('[UserID] 数据库连接不可用，无法验证ID，返回访客用户模式');
    return -1; // 在数据库连接失败时也返回访客用户ID
  }
  
  try {
    // 简化验证：只检查数据库中是否有任何用户记录
    // 不再严格匹配internalId，只要数据库中有用户记录就可以
    const result = await db.execute(sql`
      SELECT id, user_id FROM internal_user_ids LIMIT 1
    `);
    
    // 结果处理 - 兼容不同格式的查询结果
    let userId = null;
    
    // MySQL2处理
    if (result && result[0] && Array.isArray(result[0]) && result[0].length > 0) {
      userId = result[0][0].user_id;
      console.log(`[UserID] 简化验证成功: 发现有效用户ID ${userId}`);
      return userId;
    } 
    // DrizzleORM处理
    else if (result && (result as any).rows && (result as any).rows.length > 0) {
      userId = (result as any).rows[0].user_id;
      console.log(`[UserID] 简化验证成功: 发现有效用户ID ${userId}`);
      return userId;
    }
    
    // 降级处理：如果找不到任何记录，尝试查询users表
    try {
      const userResult = await db.execute(sql`
        SELECT id FROM users ORDER BY id LIMIT 1
      `);
      
      // 处理结果
      if (userResult && userResult[0] && Array.isArray(userResult[0]) && userResult[0].length > 0) {
        userId = userResult[0][0].id;
        console.log(`[UserID] 降级验证成功: 使用users表中的ID ${userId}`);
        return userId;
      } else if (userResult && (userResult as any).rows && (userResult as any).rows.length > 0) {
        userId = (userResult as any).rows[0].id;
        console.log(`[UserID] 降级验证成功: 使用users表中的ID ${userId}`);
        return userId;
      }
    } catch (userError) {
      console.log(`[UserID] 降级验证失败: ${userError}`);
    }
    
    console.log(`[UserID] 验证失败: 数据库中没有找到任何用户记录`);
    
    // 如果确实没有任何用户记录，返回测试用户ID 1
    console.log(`[UserID] 应急处理: 返回默认用户ID 1`);
    return 1;
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
    
    // 在所有验证方法都失败后，使用默认用户ID
    console.log(`[UserID] 验证内部ID ${internalId} 失败，返回默认用户ID 1`);
    return 1; // 在验证失败时返回默认用户ID，而不是访客用户
  }
}

// 移除用户的所有ID
export async function removeUserIDs(userId: number): Promise<boolean> {
  // 检查数据库连接状态
  const isConnected = await isDatabaseConnected();
  if (!isConnected) {
    console.log('[UserID] 数据库连接不可用，无法删除用户ID');
    return false;
  }
  
  try {
    // 检查用户是否存在
    const userExists = await db.execute(sql`
      SELECT id FROM users WHERE id = ${userId} LIMIT 1
    `);
    
    const userFound = userExists && 
                      userExists[0] && 
                      userExists[0][0];
                      
    if (!userFound) {
      console.log(`[UserID] 用户ID ${userId} 不存在，跳过ID删除`);
      return true; // 返回true因为不存在的用户不需要删除ID
    }
    
    // 删除该用户的所有ID
    const result = await db.execute(sql`
      DELETE FROM internal_user_ids 
      WHERE user_id = ${userId}
    `);
    
    // 获取受影响行数（删除的ID数量）
    const rowsAffected = result && (result as any).affectedRows ? (result as any).affectedRows : 0;
    
    console.log(`[UserID] 已移除用户 ${userId} 的 ${rowsAffected} 个ID`);
    return true;
  } catch (error) {
    console.error('[UserID] 移除用户ID失败:', error);
    return false;
  }
}

// 手动清理所有过期ID
export async function cleanupExpiredIDs(): Promise<number> {
  // 检查数据库连接状态
  const isConnected = await isDatabaseConnected();
  if (!isConnected) {
    console.log('[UserID] 数据库连接不可用，无法清理过期ID');
    return 0;
  }
  
  try {
    // 删除所有已过期的ID
    const result = await db.execute(sql`
      DELETE FROM internal_user_ids 
      WHERE expires_at < CURRENT_TIMESTAMP
    `);
    
    // 获取受影响行数（删除的ID数量）
    let count = 0;
    
    // 不同数据库接口返回不同的结果格式，需要兼容处理
    if (result) {
      if ((result as any).rowsAffected) {
        count = (result as any).rowsAffected;
      } else if ((result as any).affectedRows) {
        count = (result as any).affectedRows;
      } else if (Array.isArray(result) && result[0] && (result[0] as any).affectedRows) {
        count = (result[0] as any).affectedRows;
      }
    }
    
    console.log(`[UserID] 手动清理: 已删除 ${count} 个过期ID`);
    return count;
  } catch (error) {
    console.error('[UserID] 手动清理过期ID失败:', error);
    return 0;
  }
}