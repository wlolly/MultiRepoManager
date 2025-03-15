/**
 * 创建团队权限相关表的脚本
 * 用于实现基于团队的权限控制
 */

import * as mysql from 'mysql2/promise';
import { eq } from 'drizzle-orm';
import { db } from '../server/db';
import { 
  teams, teamMembers, teamPagePermissions, teamWarehousePermissions, pageNameEnum,
  warehouses
} from '../shared/schema';

async function createPermissionTables() {
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
    // 检查团队表是否有is_active字段
    const [teamsColumns] = await connection.execute(
      "SHOW COLUMNS FROM teams LIKE 'is_active'"
    );

    if (Array.isArray(teamsColumns) && teamsColumns.length === 0) {
      console.log('添加 is_active 字段到 teams 表');
      await connection.execute(
        "ALTER TABLE teams ADD COLUMN is_active BOOLEAN DEFAULT TRUE"
      );
    }

    // MySQL不支持枚举类型，我们将使用VARCHAR代替
    console.log('MySQL不支持枚举类型，使用VARCHAR替代');

    // 创建团队页面权限表
    console.log('创建 team_page_permissions 表');
    await connection.execute(`
      CREATE TABLE IF NOT EXISTS team_page_permissions (
        id INT AUTO_INCREMENT PRIMARY KEY,
        team_id INT NOT NULL,
        page_name VARCHAR(50) NOT NULL,
        can_access BOOLEAN DEFAULT FALSE,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        FOREIGN KEY (team_id) REFERENCES teams(id) ON DELETE CASCADE,
        UNIQUE KEY (team_id, page_name)
      )
    `);

    // 创建团队仓库权限表
    console.log('创建 team_warehouse_permissions 表');
    await connection.execute(`
      CREATE TABLE IF NOT EXISTS team_warehouse_permissions (
        id INT AUTO_INCREMENT PRIMARY KEY,
        team_id INT NOT NULL,
        warehouse_id INT NOT NULL,
        can_view BOOLEAN DEFAULT FALSE,
        can_manage BOOLEAN DEFAULT FALSE,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        FOREIGN KEY (team_id) REFERENCES teams(id) ON DELETE CASCADE,
        FOREIGN KEY (warehouse_id) REFERENCES warehouses(id) ON DELETE CASCADE,
        UNIQUE KEY (team_id, warehouse_id)
      )
    `);

    // 为已有的团队初始化权限数据
    const [existingTeams] = await connection.execute(
      "SELECT id FROM teams"
    );

    if (Array.isArray(existingTeams) && existingTeams.length > 0) {
      console.log('为现有团队初始化权限数据');
      
      // 获取所有页面权限和仓库
      const pageNames = [
        'dashboard', 'warehouses', 'products', 'warehouse-products', 'inbound-orders',
        'outbound-orders', 'warehouse-transfers', 'api-configurations', 'users',
        'teams', 'team-permissions', 'settings'
      ];
      
      const [warehousesData] = await connection.execute(
        "SELECT id FROM warehouses"
      );
      
      // 为每个团队创建默认权限
      for (const team of existingTeams as any[]) {
        const teamId = team.id;
        
        // 团队页面权限
        for (const pageName of pageNames) {
          const [pagePermExists] = await connection.execute(
            "SELECT id FROM team_page_permissions WHERE team_id = ? AND page_name = ?",
            [teamId, pageName]
          );
          
          if (Array.isArray(pagePermExists) && pagePermExists.length === 0) {
            await connection.execute(
              "INSERT INTO team_page_permissions (team_id, page_name, can_access) VALUES (?, ?, ?)",
              [teamId, pageName, true] // 默认为true，给予所有权限
            );
          }
        }
        
        // 团队仓库权限
        if (Array.isArray(warehousesData)) {
          for (const warehouse of warehousesData as any[]) {
            const warehouseId = warehouse.id;
            
            const [warehousePermExists] = await connection.execute(
              "SELECT id FROM team_warehouse_permissions WHERE team_id = ? AND warehouse_id = ?",
              [teamId, warehouseId]
            );
            
            if (Array.isArray(warehousePermExists) && warehousePermExists.length === 0) {
              await connection.execute(
                "INSERT INTO team_warehouse_permissions (team_id, warehouse_id, can_view, can_manage) VALUES (?, ?, ?, ?)",
                [teamId, warehouseId, true, true] // 默认为true，给予所有权限
              );
            }
          }
        }
      }
    }

    console.log('团队权限相关表创建完成');
  } catch (err) {
    console.error('创建权限表时出错:', err);
    throw err;
  } finally {
    await connection.end();
  }
}

async function main() {
  try {
    await createPermissionTables();
    console.log('团队权限表创建成功');
    process.exit(0);
  } catch (err) {
    console.error('团队权限表创建失败:', err);
    process.exit(1);
  }
}

main();