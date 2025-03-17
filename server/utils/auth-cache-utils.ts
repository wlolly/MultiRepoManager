/**
 * 认证系统缓存工具函数
 * 提供权限缓存清理和预加载功能
 */
import { clearPermissionCache, loadUserPermissions } from './permission-utils';

/**
 * 清除用户权限缓存并记录日志
 * 在用户登录、注销、权限变更时调用
 * 
 * @param userId 用户ID
 * @returns 是否成功清除缓存
 */
export function clearUserPermissionCache(userId: number): boolean {
  try {
    console.log(`[认证系统] 清除用户${userId}的权限缓存`);
    clearPermissionCache(userId);
    return true;
  } catch (cacheError) {
    console.error(`[认证系统] 清除权限缓存失败:`, cacheError);
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
): Promise<void> {
  try {
    console.log(`[认证系统] 预加载用户${userId}的权限数据 (角色: ${userRole})`);
    await loadUserPermissions(userId, sessionId, userRole);
    console.log(`[认证系统] 用户权限数据已预加载`);
  } catch (error) {
    console.error(`[认证系统] 预加载权限数据失败:`, error);
    // 预加载失败不阻止后续流程，用户可在访问需要权限的资源时动态加载
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
): Promise<void> {
  // 1. 首先清除旧缓存
  clearUserPermissionCache(userId);
  
  // 2. 预加载新的权限数据
  await preloadUserPermissions(userId, userRole, sessionId);
}