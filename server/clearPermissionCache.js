/**
 * 清除用户权限缓存函数 - 在用户登录和会话验证时调用
 * 
 * 用法示例:
 * 
 * // 在完成用户登录验证后:
 * try {
 *   console.log(`[认证系统] 清除用户${user.id}的权限缓存`);
 *   clearPermissionCache(user.id);
 * } catch (cacheError) {
 *   console.error(`[认证系统] 清除权限缓存失败:`, cacheError);
 *   // 继续处理登录，不因缓存清理失败而中断登录流程
 * }
 * 
 * 需要在以下文件中添加此调用:
 * 1. server/auth.ts -> completeLogin函数 (第556行)
 * 2. server/auth.ts -> loginUser函数 (第724行)
 * 3. server/auth.ts -> initiateLogin函数 (第166行)
 */

// 修改位置：server/auth.ts 第555-556行
/*
    }

    // 清除用户权限缓存，确保用户重新登录时获取最新权限
    try {
      console.log(`[认证系统] 清除用户${user.id}的权限缓存`);
      clearPermissionCache(user.id);
    } catch (cacheError) {
      console.error(`[认证系统] 清除权限缓存失败:`, cacheError);
      // 继续处理登录，不因缓存清理失败而中断登录流程
    }

    // 更新会话对象
    req.session.authenticated = true;
*/

// 修改位置：server/auth.ts 第723-724行
/*
    }

    // 清除用户权限缓存，确保用户重新登录时获取最新权限
    try {
      console.log(`[认证系统] 清除用户${user.id}的权限缓存`);
      clearPermissionCache(user.id);
    } catch (cacheError) {
      console.error(`[认证系统] 清除权限缓存失败:`, cacheError);
      // 继续处理登录，不因缓存清理失败而中断登录流程
    }

    // 更新会话对象
    req.session.authenticated = true;
*/
