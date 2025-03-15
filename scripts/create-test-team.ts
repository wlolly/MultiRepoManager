/**
 * 创建测试团队与权限数据
 * 用于初始化团队权限系统
 */

import * as mysql from 'mysql2/promise';
import { db } from '../server/db';
import {
  teams, teamMembers, teamPagePermissions, teamWarehousePermissions
} from '../shared/schema';

async function createTestTeamData() {
  // 创建与服务器中相同配置的连接
  const connection = await mysql.createConnection({
    host: '77.243.80.129',
    port: 3307,
    user: 'root',
    password: '@Hzca1575@',
    database: 'wlolly',
    waitForConnections: true,
    connectTimeout: 60000, // 60s connection timeout
  });

  console.log('连接到数据库成功');

  try {
    // 1. 创建测试团队
    console.log('创建测试团队...');
    const [teamResult] = await connection.execute(
      "INSERT INTO teams (name, description, is_active) VALUES (?, ?, ?)",
      ['销售团队', '负责产品销售和客户关系管理', true]
    );
    
    // @ts-ignore
    const teamId = teamResult.insertId;
    console.log(`已创建团队，ID: ${teamId}`);

    // 2. 添加管理员用户到团队
    console.log('添加团队成员...');
    await connection.execute(
      "INSERT INTO team_members (team_id, user_id, is_admin) VALUES (?, ?, ?)",
      [teamId, 1, true] // 使用ID为1的管理员用户
    );
    
    // 3. 设置团队页面权限 - 销售团队只能访问与销售相关的页面
    console.log('设置团队页面权限...');
    const pagePermissions = [
      { pageName: 'dashboard', canAccess: true },
      { pageName: 'products', canAccess: true },
      { pageName: 'warehouse-products', canAccess: true },
      { pageName: 'outbound-orders', canAccess: true },
      { pageName: 'warehouses', canAccess: false },
      { pageName: 'inbound-orders', canAccess: false },
      { pageName: 'warehouse-transfers', canAccess: false },
      { pageName: 'api-configurations', canAccess: false },
      { pageName: 'users', canAccess: false },
      { pageName: 'teams', canAccess: false },
      { pageName: 'team-permissions', canAccess: false },
      { pageName: 'settings', canAccess: false }
    ];
    
    for (const perm of pagePermissions) {
      await connection.execute(
        "INSERT INTO team_page_permissions (team_id, page_name, can_access) VALUES (?, ?, ?)",
        [teamId, perm.pageName, perm.canAccess]
      );
    }
    
    // 4. 设置团队仓库权限 - 销售团队只能查看部分仓库
    console.log('设置团队仓库权限...');
    
    // 获取所有仓库ID
    const [warehouses] = await connection.execute("SELECT id FROM warehouses");
    
    // 为每个仓库设置不同的权限
    for (const warehouse of warehouses as any[]) {
      const warehouseId = warehouse.id;
      // 销售团队只能查看ID为1和2的仓库，而且只有查看权限没有管理权限
      const canView = (warehouseId === 1 || warehouseId === 2);
      const canManage = false; // 销售团队无法管理仓库
      
      await connection.execute(
        "INSERT INTO team_warehouse_permissions (team_id, warehouse_id, can_view, can_manage) VALUES (?, ?, ?, ?)",
        [teamId, warehouseId, canView, canManage]
      );
    }

    // 创建第二个团队 - 仓库团队
    console.log('创建仓库团队...');
    const [warehouseTeamResult] = await connection.execute(
      "INSERT INTO teams (name, description, is_active) VALUES (?, ?, ?)",
      ['仓库团队', '负责仓库管理和库存控制', true]
    );
    
    // @ts-ignore
    const warehouseTeamId = warehouseTeamResult.insertId;
    console.log(`已创建团队，ID: ${warehouseTeamId}`);

    // 添加管理员用户到仓库团队
    await connection.execute(
      "INSERT INTO team_members (team_id, user_id, is_admin) VALUES (?, ?, ?)",
      [warehouseTeamId, 1, true]
    );
    
    // 设置仓库团队页面权限 - 可以访问与仓库相关的页面
    const warehouseTeamPagePermissions = [
      { pageName: 'dashboard', canAccess: true },
      { pageName: 'warehouses', canAccess: true },
      { pageName: 'products', canAccess: true },
      { pageName: 'warehouse-products', canAccess: true },
      { pageName: 'inbound-orders', canAccess: true },
      { pageName: 'outbound-orders', canAccess: true },
      { pageName: 'warehouse-transfers', canAccess: true },
      { pageName: 'api-configurations', canAccess: false },
      { pageName: 'users', canAccess: false },
      { pageName: 'teams', canAccess: false },
      { pageName: 'team-permissions', canAccess: false },
      { pageName: 'settings', canAccess: false }
    ];
    
    for (const perm of warehouseTeamPagePermissions) {
      await connection.execute(
        "INSERT INTO team_page_permissions (team_id, page_name, can_access) VALUES (?, ?, ?)",
        [warehouseTeamId, perm.pageName, perm.canAccess]
      );
    }
    
    // 为仓库团队设置仓库权限 - 可以管理所有仓库
    for (const warehouse of warehouses as any[]) {
      const warehouseId = warehouse.id;
      await connection.execute(
        "INSERT INTO team_warehouse_permissions (team_id, warehouse_id, can_view, can_manage) VALUES (?, ?, ?, ?)",
        [warehouseTeamId, warehouseId, true, true]
      );
    }

    console.log('测试团队数据创建完成');
  } catch (err) {
    console.error('创建测试团队数据时出错:', err);
    throw err;
  } finally {
    await connection.end();
  }
}

async function main() {
  try {
    await createTestTeamData();
    process.exit(0);
  } catch (err) {
    console.error('程序执行失败:', err);
    process.exit(1);
  }
}

main();