# 认证系统权限缓存更新位置

## 需要添加`handleLoginPermissions`调用的位置

1. server/auth.ts - 修改 initiateLogin 函数 (大约在166行)
```typescript
// 用户身份验证成功后，处理权限缓存
await handleLoginPermissions(user.id, user.role, sessionId);
```

2. server/auth.ts - 修改 completeLogin 函数 (大约在556行)
```typescript
// 在更新会话对象前，处理权限缓存
await handleLoginPermissions(user.id, user.role, sessionId);

// 更新会话对象
req.session.authenticated = true;
```

3. server/auth.ts - 修改 loginUser 函数 (大约在724行)
```typescript
// 在更新会话对象前，处理权限缓存
await handleLoginPermissions(user.id, user.role, sessionId);

// 更新会话对象
req.session.authenticated = true;
```

4. server/auth.ts - 修改 logout 函数 (大约在1100行) 
```typescript
// 在用户退出登录时清除缓存
if (userId) {
  clearUserPermissionCache(Number(userId));
}
```

## 导入需要添加的地方

server/auth.ts - 添加导入 (顶部)
```typescript
import { handleLoginPermissions, clearUserPermissionCache } from './utils/auth-cache-utils';
```