/**
 * 认证系统缓存工具函数
 * 提供权限缓存清理和预加载功能
 */
import { getPermissionCache, setPermissionCache, clearPermissionCache } from './permission-utils';
import { loadUserPermissions } from './permission-utils';

/**
 * 清除用户权限缓存并记录日志
 * 在用户登录、注销、权限变更时调用
 * 
 * @param userId 用户ID
 * @returns 是否成功清除缓存
 */
export function clearUserPermissionCache(userId: number): boolean {
  try {
    console.log(`[权限缓存] 清理用户ID=${userId}的权限缓存`);
    clearPermissionCache(userId);
    return true;
  } catch (error) {
    console.error(`[权限缓存] 清理用户ID=${userId}的权限缓存时出错:`, error);
    return false;
  }
}

/**
 * 预加载用户权限
 * 在用户登录成功后调用，提前加载权限数据到缓存
 * 
 * @param userId 用户ID
 * @param userRole 用户角色
 * @param sessionId 会话ID (可选)
 */
export async function preloadUserPermissions(
  userId: number, 
  userRole: string,
  sessionId?: string
): Promise<boolean> {
  try {
    console.log(`[权限缓存] 预加载用户ID=${userId}, 角色=${userRole}的权限数据`);

    // 从数据库加载用户权限
    const permissions = await loadUserPermissions(userId, sessionId, userRole);
    
    // 保存到缓存
    setPermissionCache(userId, permissions);
    
    console.log(`[权限缓存] 成功预加载用户权限到缓存: 用户ID=${userId}`);
    return true;
  } catch (error) {
    console.error(`[权限缓存] 预加载用户权限时出错: 用户ID=${userId}`, error);
    return false;
  }
}

/**
 * 处理用户登录时的权限缓存
 * 综合清除缓存和预加载权限的逻辑
 * 
 * @param userId 用户ID
 * @param userRole 用户角色
 * @param sessionId 会话ID (可选)
 */
export async function handleLoginPermissions(
  userId: number,
  userRole: string,
  sessionId?: string
): Promise<boolean> {
  try {
    // 先清除旧的权限缓存
    clearUserPermissionCache(userId);
    
    // 然后预加载新的权限数据
    await preloadUserPermissions(userId, userRole, sessionId);
    
    return true;
  } catch (error) {
    console.error(`[权限缓存] 处理登录权限时出错: 用户ID=${userId}`, error);
    return false;
  }
}