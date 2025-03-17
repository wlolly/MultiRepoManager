/**
 * PostgreSQL数据库存储实现
 * 基于Drizzle ORM实现IStorage接口
 */

// 动态获取db实例，避免循环依赖
import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import { 
  User, InsertUser, InsertUserSession, UserSession, 
  InsertLoginVerification, LoginVerification, InsertRepository,
  Repository, InsertTeam, Team, InsertTeamMember, TeamMember,
  InsertTeamPagePermission, TeamPagePermission, InsertTeamWarehousePermission,
  TeamWarehousePermission, InsertTeamRepository, TeamRepository, 
  InsertActivity, Activity, InsertTranslation, Translation,
  Product, InsertProduct, Warehouse, InsertWarehouse,
  InboundOrder, InsertInboundOrder, InboundOrderItem, InsertInboundOrderItem,
  OutboundOrder, InsertOutboundOrder, OutboundOrderItem, InsertOutboundOrderItem,
  ApiConfiguration, InsertApiConfiguration, EcommerceProduct, InsertEcommerceProduct,
  PlatformOrder, InsertPlatformOrder, PlatformOrderItem, InsertPlatformOrderItem,
  ProductMatchingRule, InsertProductMatchingRule, PreAuditOrder, InsertPreAuditOrder,
  PreAuditOrderItem, InsertPreAuditOrderItem, WarehouseTransfer, InsertWarehouseTransfer,
  WarehouseTransferItem, InsertWarehouseTransferItem, UniqueCodeTracking,
  InsertUniqueCodeTracking, UniqueCodeHistory, InsertUniqueCodeHistory,
  ProductInventory, InsertProductInventory
} from '@shared/schema';
import { IStorage } from './storage';
import { eq, and, or, desc, sql, asc, gte, lte, isNull, inArray } from 'drizzle-orm';
import * as schema from '@shared/schema';
import { log } from './vite';

/**
 * PostgreSQL数据库存储实现
 * 实现IStorage接口，使用Drizzle ORM进行数据库操作
 */
export class DbStorage implements IStorage {
  private db: any;
  private client: any;

  constructor() {
    console.log('[存储] 初始化PostgreSQL数据库存储');

    // 检查环境变量
    const connectionString = process.env.DATABASE_URL;
    if (!connectionString) {
      console.error('[DbStorage错误] DATABASE_URL环境变量未设置！');
      throw new Error('缺少数据库连接信息，请确保设置了DATABASE_URL');
    }

    // 创建PostgreSQL客户端连接
    this.client = postgres(connectionString, {
      max: 10, // 设置合理的最大连接数
      idle_timeout: 30, // 空闲连接的过期时间 (秒)
      connect_timeout: 10, // 连接超时时间 (秒)
      prepare: false // 禁用准备好的语句，避免与某些查询不兼容
    });

    // 创建drizzle实例
    this.db = drizzle(this.client, { schema });

    // 测试连接
    this.testConnection();
  }

  // 测试数据库连接
  private async testConnection() {
    try {
      // 进行简单查询测试连接
      const result = await this.db.execute(sql`SELECT 1 as test`);

      if (result && result.length > 0) {
        console.log('[DbStorage] 数据库连接测试成功!');
      }
    } catch (error) {
      console.error('[DbStorage] 数据库连接测试失败:', error);
      console.error('[DbStorage] 请检查数据库配置和网络连接');

      // 设置定期重试逻辑
      const retryInterval = setInterval(async () => {
        try {
          console.log('[DbStorage] 尝试重新连接数据库...');
          const result = await this.db.execute(sql`SELECT version()`);

          console.log('[DbStorage] 成功重新连接到数据库!');

          // 成功后清除重试间隔
          clearInterval(retryInterval);
        } catch (retryErr) {
          console.error('[DbStorage] 重新连接尝试失败:', retryErr);
        }
      }, 30000); // 每30秒重试一次
    }
  }

  // 用户方法 ==========================================================

  async getUser(id: number): Promise<User | undefined> {
    try {
      const users = await this.db.select().from(schema.users).where(eq(schema.users.id, id));
      return users[0];
    } catch (error) {
      console.error('[DbStorage] getUser错误:', error);
      return undefined;
    }
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    try {
      const users = await this.db.select().from(schema.users).where(eq(schema.users.username, username));
      return users[0];
    } catch (error) {
      console.error('[DbStorage] getUserByUsername错误:', error);
      return undefined;
    }
  }

  async getUserBySocialId(socialId: string): Promise<User | undefined> {
    try {
      const users = await this.db.select().from(schema.users).where(eq(schema.users.socialId as any, socialId));
      return users[0];
    } catch (error) {
      console.error('[DbStorage] getUserBySocialId错误:', error);
      return undefined;
    }
  }

  async createUser(user: InsertUser): Promise<User> {
    try {
      const result = await this.db.insert(schema.users).values(user).returning();
      return result[0];
    } catch (error) {
      console.error('[DbStorage] createUser错误:', error);
      throw error;
    }
  }

  async updateUser(id: number, user: Partial<User>): Promise<User | undefined> {
    try {
      const result = await this.db.update(schema.users)
        .set(user)
        .where(eq(schema.users.id, id))
        .returning();
      return result[0];
    } catch (error) {
      console.error('[DbStorage] updateUser错误:', error);
      return undefined;
    }
  }

  async getUsers(): Promise<User[]> {
    try {
      return await this.db.select().from(schema.users);
    } catch (error) {
      console.error('[DbStorage] getUsers错误:', error);
      return [];
    }
  }

  // 登录验证方法 ==========================================================

  async createLoginVerification(verification: InsertLoginVerification): Promise<LoginVerification> {
    try {
      const result = await this.db.insert(schema.loginVerifications).values(verification).returning();
      return result[0];
    } catch (error) {
      console.error('[DbStorage] createLoginVerification错误:', error);
      throw error;
    }
  }

  async getLoginVerification(verificationId: string): Promise<LoginVerification | undefined> {
    try {
      const verifications = await this.db.select().from(schema.loginVerifications)
        .where(eq(schema.loginVerifications.verificationId, verificationId));
      return verifications[0];
    } catch (error) {
      console.error('[DbStorage] getLoginVerification错误:', error);
      return undefined;
    }
  }

  async updateLoginVerification(verificationId: string, updates: Partial<LoginVerification>): Promise<LoginVerification | undefined> {
    try {
      const result = await this.db.update(schema.loginVerifications)
        .set(updates)
        .where(eq(schema.loginVerifications.verificationId, verificationId))
        .returning();
      return result[0];
    } catch (error) {
      console.error('[DbStorage] updateLoginVerification错误:', error);
      return undefined;
    }
  }

  async cleanupExpiredVerifications(): Promise<number> {
    try {
      // 清理过期的验证记录 (30分钟前)
      const thirtyMinutesAgo = new Date(Date.now() - 30 * 60 * 1000);

      const result = await this.db.delete(schema.loginVerifications)
        .where(sql`${schema.loginVerifications.created} <= ${thirtyMinutesAgo.toISOString()}`)
        .returning();

      return result.length;
    } catch (error) {
      console.error('[DbStorage] cleanupExpiredVerifications错误:', error);
      return 0;
    }
  }

  // 会话管理方法 ==========================================================

  async createUserSession(sessionData: InsertUserSession): Promise<UserSession> {
    try {
      const result = await this.db.insert(schema.userSessions).values(sessionData).returning();
      return result[0];
    } catch (error) {
      console.error('[DbStorage] createUserSession错误:', error);
      throw error;
    }
  }

  async getUserSessionById(sessionId: string): Promise<UserSession | undefined> {
    try {
      const sessions = await this.db.select().from(schema.userSessions)
        .where(and(
          eq(schema.userSessions.sessionId, sessionId),
          eq(schema.userSessions.isValid, true),
          sql`${schema.userSessions.expiresAt} > NOW()`
        ));
      const session = sessions[0];
      if (session) {
        await this.db.update(schema.userSessions)
          .set({ lastActivity: new Date() })
          .where(eq(schema.userSessions.sessionId, sessionId));
      }
      return session;
    } catch (error) {
      console.error('[DbStorage] getUserSessionById错误:', error);
      return undefined;
    }
  }

  async getUserSessionsByUserId(userId: number): Promise<UserSession[]> {
    try {
      return await this.db.select().from(schema.userSessions)
        .where(eq(schema.userSessions.userId, userId));
    } catch (error) {
      console.error('[DbStorage] getUserSessionsByUserId错误:', error);
      return [];
    }
  }

  async updateUserSession(sessionId: string, updates: Partial<UserSession>): Promise<UserSession | undefined> {
    try {
      const result = await this.db.update(schema.userSessions)
        .set(updates)
        .where(eq(schema.userSessions.sessionId, sessionId))
        .returning();
      return result[0];
    } catch (error) {
      console.error('[DbStorage] updateUserSession错误:', error);
      return undefined;
    }
  }

  async invalidateUserSession(sessionId: string): Promise<boolean> {
    try {
      const result = await this.db.update(schema.userSessions)
        .set({ isValid: false, updatedAt: new Date() })
        .where(eq(schema.userSessions.sessionId, sessionId))
        .returning();
      return result.length > 0;
    } catch (error) {
      console.error('[DbStorage] invalidateUserSession错误:', error);
      return false;
    }
  }

  async invalidateAllUserSessions(userId: number): Promise<number> {
    try {
      const result = await this.db.update(schema.userSessions)
        .set({ isValid: false, updatedAt: new Date() })
        .where(eq(schema.userSessions.userId, userId))
        .returning();
      return result.length;
    } catch (error) {
      console.error('[DbStorage] invalidateAllUserSessions错误:', error);
      return 0;
    }
  }

  async cleanupExpiredSessions(): Promise<number> {
    try {
      // 清理过期的会话记录 (7天前)
      const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);

      const result = await this.db.delete(schema.userSessions)
        .where(or(
          sql`${schema.userSessions.expiresAt} <= ${new Date().toISOString()}`,
          sql`${schema.userSessions.createdAt} <= ${sevenDaysAgo.toISOString()}`
        ))
        .returning();

      return result.length;
    } catch (error) {
      console.error('[DbStorage] cleanupExpiredSessions错误:', error);
      return 0;
    }
  }

  // Repository方法 ==========================================================

  async getRepository(id: number): Promise<Repository | undefined> {
    try {
      const repositories = await this.db.select().from(schema.repositories).where(eq(schema.repositories.id, id));
      return repositories[0];
    } catch (error) {
      console.error('[DbStorage] getRepository错误:', error);
      return undefined;
    }
  }

  async getRepositoryByName(name: string): Promise<Repository | undefined> {
    try {
      const repositories = await this.db.select().from(schema.repositories).where(eq(schema.repositories.name, name));
      return repositories[0];
    } catch (error) {
      console.error('[DbStorage] getRepositoryByName错误:', error);
      return undefined;
    }
  }

  async createRepository(repository: InsertRepository): Promise<Repository> {
    try {
      const result = await this.db.insert(schema.repositories).values(repository).returning();
      return result[0];
    } catch (error) {
      console.error('[DbStorage] createRepository错误:', error);
      throw error;
    }
  }

  async updateRepository(id: number, repository: Partial<Repository>): Promise<Repository | undefined> {
    try {
      const result = await this.db.update(schema.repositories)
        .set(repository)
        .where(eq(schema.repositories.id, id))
        .returning();
      return result[0];
    } catch (error) {
      console.error('[DbStorage] updateRepository错误:', error);
      return undefined;
    }
  }

  async getRepositories(filters?: { ownerId?: number, language?: string, visibility?: string }): Promise<Repository[]> {
    try {
      let query = this.db.select().from(schema.repositories);

      if (filters) {
        const conditions = [];

        if (filters.ownerId !== undefined) {
          conditions.push(eq(schema.repositories.ownerId, filters.ownerId));
        }

        if (filters.language) {
          conditions.push(eq(schema.repositories.language, filters.language));
        }

        if (filters.visibility) {
          conditions.push(eq(schema.repositories.visibility, filters.visibility as any));
        }

        if (conditions.length > 0) {
          query = query.where(and(...conditions));
        }
      }

      return await query;
    } catch (error) {
      console.error('[DbStorage] getRepositories错误:', error);
      return [];
    }
  }

  // 团队方法 ==========================================================

  async getTeam(id: number): Promise<Team | undefined> {
    try {
      const teams = await this.db.select().from(schema.teams).where(eq(schema.teams.id, id));
      return teams[0];
    } catch (error) {
      console.error('[DbStorage] getTeam错误:', error);
      return undefined;
    }
  }

  async createTeam(team: InsertTeam): Promise<Team> {
    try {
      const result = await this.db.insert(schema.teams).values(team).returning();
      return result[0];
    } catch (error) {
      console.error('[DbStorage] createTeam错误:', error);
      throw error;
    }
  }

  async getTeams(): Promise<Team[]> {
    try {
      return await this.db.select().from(schema.teams);
    } catch (error) {
      console.error('[DbStorage] getTeams错误:', error);
      return [];
    }
  }

  // 团队成员方法 ==========================================================

  async addTeamMember(teamMember: InsertTeamMember): Promise<TeamMember> {
    try {
      const result = await this.db.insert(schema.teamMembers).values(teamMember).returning();
      return result[0];
    } catch (error) {
      console.error('[DbStorage] addTeamMember错误:', error);
      throw error;
    }
  }

  async getTeamMembers(teamId: number): Promise<TeamMember[]> {
    try {
      return await this.db.select().from(schema.teamMembers).where(eq(schema.teamMembers.teamId, teamId));
    } catch (error) {
      console.error('[DbStorage] getTeamMembers错误:', error);
      return [];
    }
  }

  async getTeamMembersForUser(userId: number): Promise<TeamMember[]> {
    try {
      return await this.db.select().from(schema.teamMembers).where(eq(schema.teamMembers.userId, userId));
    } catch (error) {
      console.error('[DbStorage] getTeamMembersForUser错误:', error);
      return [];
    }
  }

  async removeTeamMember(teamId: number, userId: number): Promise<void> {
    try {
      await this.db.delete(schema.teamMembers)
        .where(and(
          eq(schema.teamMembers.teamId, teamId),
          eq(schema.teamMembers.userId, userId)
        ));
    } catch (error) {
      console.error('[DbStorage] removeTeamMember错误:', error);
      throw error;
    }
  }

  // 团队权限方法 ==========================================================

  async addTeamPagePermission(insertTeamPagePermission: InsertTeamPagePermission): Promise<TeamPagePermission> {
    try {
      const result = await this.db.insert(schema.teamPagePermissions).values(insertTeamPagePermission).returning();
      return result[0];
    } catch (error) {
      console.error('[DbStorage] addTeamPagePermission错误:', error);
      throw error;
    }
  }

  async getTeamPagePermissions(teamId: number): Promise<TeamPagePermission[]> {
    try {
      return await this.db.select().from(schema.teamPagePermissions).where(eq(schema.teamPagePermissions.teamId, teamId));
    } catch (error) {
      console.error('[DbStorage] getTeamPagePermissions错误:', error);
      return [];
    }
  }

  async removeTeamPagePermission(teamId: number, pageName: string): Promise<void> {
    try {
      await this.db.delete(schema.teamPagePermissions)
        .where(and(
          eq(schema.teamPagePermissions.teamId, teamId),
          eq(schema.teamPagePermissions.pageName, pageName as any)
        ));
    } catch (error) {
      console.error('[DbStorage] removeTeamPagePermission错误:', error);
      throw error;
    }
  }

  async addTeamWarehousePermission(insertTeamWarehousePermission: InsertTeamWarehousePermission): Promise<TeamWarehousePermission> {
    try {
      const result = await this.db.insert(schema.teamWarehousePermissions).values(insertTeamWarehousePermission).returning();
      return result[0];
    } catch (error) {
      console.error('[DbStorage] addTeamWarehousePermission错误:', error);
      throw error;
    }
  }

  async getTeamWarehousePermissions(teamId: number): Promise<TeamWarehousePermission[]> {
    try {
      if (!teamId) {
        console.log('[权限] 团队ID未提供，返回空权限列表');
        return [];
      }

      const permissions = await this.db.select()
        .from(schema.teamWarehousePermissions)
        .where(eq(schema.teamWarehousePermissions.teamId, teamId));

      if (!permissions.length) {
        console.log(`[权限] 团队 ${teamId} 没有仓库权限配置`);
      }

      return permissions.map(p => ({
        warehouseId: p.warehouseId,
        canView: !!p.canView,
        canManage: !!p.canManage,
        teamId: p.teamId
      }));
    } catch (error) {
      console.error('[权限] 获取仓库权限失败:', error);
      return [];
    }
  }

  async removeTeamWarehousePermission(teamId: number, warehouseId: number): Promise<void> {
    try {
      await this.db.delete(schema.teamWarehousePermissions)
        .where(and(
          eq(schema.teamWarehousePermissions.teamId, teamId),
          eq(schema.teamWarehousePermissions.warehouseId, warehouseId)
        ));
    } catch (error) {
      console.error('[DbStorage] removeTeamWarehousePermission错误:', error);
      throw error;
    }
  }

  // 团队仓库方法 ==========================================================

  async addTeamRepository(teamRepository: InsertTeamRepository): Promise<TeamRepository> {
    try {
      const result = await this.db.insert(schema.teamRepositories).values(teamRepository).returning();
      return result[0];
    } catch (error) {
      console.error('[DbStorage] addTeamRepository错误:', error);
      throw error;
    }
  }

  async getTeamRepositories(teamId: number): Promise<TeamRepository[]> {
    try {
      return await this.db.select().from(schema.teamRepositories).where(eq(schema.teamRepositories.teamId, teamId));
    } catch (error) {
      console.error('[DbStorage] getTeamRepositories错误:', error);
      return [];
    }
  }

  // 活动方法 ==========================================================

  async createActivity(activity: InsertActivity): Promise<Activity> {
    try {
      const result = await this.db.insert(schema.activities).values(activity).returning();
      return result[0];
    } catch (error) {
      console.error('[DbStorage] createActivity错误:', error);
      throw error;
    }
  }

  async getActivities(repositoryId?: number, limit?: number): Promise<Activity[]> {
    try {
      let query = this.db.select().from(schema.activities).orderBy(desc(schema.activities.createdAt));

      if (repositoryId !== undefined) {
        query = query.where(eq(schema.activities.repositoryId, repositoryId));
      }

      if (limit !== undefined) {
        query = query.limit(limit);
      }

      return await query;
    } catch (error) {
      console.error('[DbStorage] getActivities错误:', error);
      return [];
    }
  }

  // 统计方法 ==========================================================

  async getLanguageDistribution(): Promise<{ language: string, count: number, percentage: number }[]> {
    try {
      // 使用SQL原生查询获取语言分布统计
      const result = await this.db.execute(sql`
        SELECT 
          language, 
          COUNT(*) as count,
          ROUND(COUNT(*) * 100.0 / (SELECT COUNT(*) FROM repositories), 2) as percentage
        FROM repositories
        GROUP BY language
        ORDER BY count DESC
      `);

      return result.map(row => ({
        language: row.language,
        count: Number(row.count),
        percentage: Number(row.percentage)
      }));
    } catch (error) {
      console.error('[DbStorage] getLanguageDistribution错误:', error);
      return [];
    }
  }

  async getRepositoryStats(): Promise<{ totalRepositories: number, totalUsers: number, languagesCount: number, recentCommits: number }> {
    try {
      // 获取仓库总数
      const repoCount = await this.db.select({ count: sql`COUNT(*)` }).from(schema.repositories);

      // 获取用户总数
      const userCount = await this.db.select({ count: sql`COUNT(*)` }).from(schema.users);

      // 获取不同语言数量
      const languageCount = await this.db.select({ count: sql`COUNT(DISTINCT language)` }).from(schema.repositories);

      // 获取最近一周提交数
      const oneWeekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
      const commitCount = await this.db.select({ count: sql`COUNT(*)` })
        .from(schema.activities)
        .where(and(
          eq(schema.activities.type, 'commit' as any),
          sql`${schema.activities.createdAt} >= ${oneWeekAgo.toISOString()}`
        ));

      return {
        totalRepositories: Number(repoCount[0]?.count || 0),
        totalUsers: Number(userCount[0]?.count || 0),
        languagesCount: Number(languageCount[0]?.count || 0),
        recentCommits: Number(commitCount[0]?.count || 0)
      };
    } catch (error) {
      console.error('[DbStorage] getRepositoryStats错误:', error);
      return {
        totalRepositories: 0,
        totalUsers: 0,
        languagesCount: 0,
        recentCommits: 0
      };
    }
  }

  // 翻译方法 ==========================================================

  async getTranslations(): Promise<Translation[]> {
    try {
      return await this.db.select().from(schema.translations);
    } catch (error) {
      console.error('[DbStorage] getTranslations错误:', error);
      return [];
    }
  }

  async getTranslationByKeyAndLanguage(key: string, language: string): Promise<Translation | undefined> {
    try {
      const translations = await this.db.select().from(schema.translations)
        .where(and(
          eq(schema.translations.key, key),
          eq(schema.translations.language, language as any)
        ));
      return translations[0];
    } catch (error) {
      console.error('[DbStorage] getTranslationByKeyAndLanguage错误:', error);
      return undefined;
    }
  }

  async createTranslation(translation: InsertTranslation): Promise<Translation> {
    try {
      const result = await this.db.insert(schema.translations).values(translation).returning();
      return result[0];
    } catch (error) {
      console.error('[DbStorage] createTranslation错误:', error);
      throw error;
    }
  }

  async createTranslationsBatch(translations: InsertTranslation[]): Promise<Translation[]> {
    try {
      if (translations.length === 0) return [];
      const result = await this.db.insert(schema.translations).values(translations).returning();
      return result;
    } catch (error) {
      console.error('[DbStorage] createTranslationsBatch错误:', error);
      throw error;
    }
  }

  async updateTranslation(id: number, translation: Partial<Translation>): Promise<Translation | undefined> {
    try {
      const result = await this.db.update(schema.translations)
        .set(translation)
        .where(eq(schema.translations.id, id))
        .returning();
      return result[0];
    } catch (error) {
      console.error('[DbStorage] updateTranslation错误:', error);
      return undefined;
    }
  }

  async deleteTranslationByKeyAndLanguage(key: string, language: string): Promise<void> {
    try {
      await this.db.delete(schema.translations)
        .where(and(
          eq(schema.translations.key, key),
          eq(schema.translations.language, language as any)
        ));
    } catch (error) {
      console.error('[DbStorage] deleteTranslationByKeyAndLanguage错误:', error);
      throw error;
    }
  }

  async deleteTranslationByKey(key: string): Promise<void> {
    try {
      await this.db.delete(schema.translations).where(eq(schema.translations.key, key));
    } catch (error) {
      console.error('[DbStorage] deleteTranslationByKey错误:', error);
      throw error;
    }
  }

  // 仓库管理系统方法 ==========================================================
  // 产品相关方法

  async getProduct(id: number): Promise<Product | undefined> {
    try {
      const products = await this.db.select().from(schema.products).where(eq(schema.products.id, id));
      return products[0];
    } catch (error) {
      console.error('[DbStorage] getProduct错误:', error);
      return undefined;
    }
  }

  async getProductByBarcode(barcode: string): Promise<Product | undefined> {
    try {
      const products = await this.db.select().from(schema.products).where(eq(schema.products.barcode, barcode));
      return products[0];
    } catch (error) {
      console.error('[DbStorage] getProductByBarcode错误:', error);
      return undefined;
    }
  }

  async getProductByUniqueCode(uniqueCode: string): Promise<Product | undefined> {
    try {
      const products = await this.db.select().from(schema.products).where(eq(schema.products.uniqueCode as any, uniqueCode));
      return products[0];
    } catch (error) {
      console.error('[DbStorage] getProductByUniqueCode错误:', error);
      return undefined;
    }
  }

  async createProduct(product: InsertProduct): Promise<Product> {
    try {
      const result = await this.db.insert(schema.products).values(product).returning();
      return result[0];
    } catch (error) {
      console.error('[DbStorage] createProduct错误:', error);
      throw error;
    }
  }

  async updateProduct(id: number, product: Partial<Product>): Promise<Product | undefined> {
    try {
      const result = await this.db.update(schema.products)
        .set(product)
        .where(eq(schema.products.id, id))
        .returning();
      return result[0];
    } catch (error) {
      console.error('[DbStorage] updateProduct错误:', error);
      return undefined;
    }
  }

  async getProducts(filter?: { warehouseId?: number, category?: string }): Promise<Product[]> {
    try {
      // 基本查询不考虑仓库过滤，直接从产品表查询
      let query = this.db.select().from(schema.products);

      // 如果指定了分类，添加过滤条件
      if (filter?.category) {
        query = query.where(eq(schema.products.category, filter.category));
      }

      // 获取产品列表
      const products = await query;

      // 如果指定了仓库ID，需要进一步过滤
      if (filter?.warehouseId) {
        // 获取指定仓库的库存记录
        const inventories = await this.db.select()
          .from(schema.productInventory)
          .where(eq(schema.productInventory.warehouseId, filter.warehouseId));

        // 创建产品ID到库存数量的映射
        const inventoryMap = new Map<number, number>();
        inventories.forEach(inv => {
          inventoryMap.set(inv.productId, inv.quantity);
        });

        // 只返回在指定仓库有库存的产品
        return products.filter(product => {
          const quantity = inventoryMap.get(product.id) || 0;
          return quantity > 0;
        });
      }

      return products;
    } catch (error) {
      console.error('[DbStorage] getProducts错误:', error);
      return [];
    }
  }

  async getProductsStats(): Promise<{
    totalProducts: number;
    totalCategories: number;
    lowStockProducts: number;
    totalValue: number;
    avgPrice: number;
    totalPackages: number;
    totalWeight: number;
    totalVolume: number;
  }> {
    try {
      // 获取产品总数
      const productCount = await this.db.select({ count: sql`COUNT(*)` }).from(schema.products);

      // 获取不同分类数量
      const categoryCount = await this.db.select({ count: sql`COUNT(DISTINCT category)` }).from(schema.products);

      // 获取低库存产品数量 (设定阈值为5)
      const lowStockCount = await this.db.select({ count: sql`COUNT(*)` })
        .from(schema.products)
        .where(lte(schema.products.stockQuantity, 5));

      // 获取总价值、平均价格、总数量、总重量和总体积
      const aggregates = await this.db.select({
        totalValue: sql`SUM(price * stock_quantity)`,
        avgPrice: sql`AVG(price)`,
        totalPackages: sql`SUM(stock_quantity)`,
        totalWeight: sql`SUM(weight * stock_quantity)`,
        totalVolume: sql`SUM(volume * stock_quantity)`
      }).from(schema.products);

      return {
        totalProducts: Number(productCount[0]?.count || 0),
        totalCategories: Number(categoryCount[0]?.count || 0),
        lowStockProducts: Number(lowStockCount[0]?.count || 0),
        totalValue: Number(aggregates[0]?.totalValue || 0),
        avgPrice: Number(aggregates[0]?.avgPrice || 0),
        totalPackages: Number(aggregates[0]?.totalPackages || 0),
        totalWeight: Number(aggregates[0]?.totalWeight || 0),
        totalVolume: Number(aggregates[0]?.totalVolume || 0)
      };
    } catch (error) {
      console.error('[DbStorage] getProductsStats错误:', error);
      return {
        totalProducts: 0,
        totalCategories: 0,
        lowStockProducts: 0,
        totalValue: 0,
        avgPrice: 0,
        totalPackages: 0,
        totalWeight: 0,
        totalVolume: 0
      };
    }
  }

  // 仓库相关方法

  async getWarehouse(id: number): Promise<Warehouse | undefined> {
    try {
      const warehouses = await this.db.select().from(schema.warehouses).where(eq(schema.warehouses.id, id));
      return warehouses[0];
    } catch (error) {
      console.error('[DbStorage] getWarehouse错误:', error);
      return undefined;
    }
  }

  async createWarehouse(warehouse: InsertWarehouse): Promise<Warehouse> {
    try {
      const result = await this.db.insert(schema.warehouses).values(warehouse).returning();
      return result[0];
    } catch (error) {
      console.error('[DbStorage] createWarehouse错误:', error);
      throw error;
    }
  }

  async updateWarehouse(id: number, warehouse: Partial<Warehouse>): Promise<Warehouse | undefined> {
    try {
      const result = await this.db.update(schema.warehouses)
        .set(warehouse)
        .where(eq(schema.warehouses.id, id))
        .returning();
      return result[0];
    } catch (error) {
      console.error('[DbStorage] updateWarehouse错误:', error);
      return undefined;
    }
  }

  async getWarehouses(): Promise<Warehouse[]> {
    try {
      return await this.db.select().from(schema.warehouses);
    } catch (error) {
      console.error('[DbStorage] getWarehouses错误:', error);
      return [];
    }
  }

  // 其他必要方法的实现略去，根据需要可以继续添加

  // 实现IStorage接口中的其他所有必要方法
  // 这里省略其余方法的实现，实际使用时需要完整实现所有接口方法

  // 调拨单相关方法的简单实现示例
  async getWarehouseTransfer(id: number): Promise<WarehouseTransfer | undefined> {
    try {
      const transfers = await this.db.select().from(schema.warehouseTransfers).where(eq(schema.warehouseTransfers.id, id));
      return transfers[0];
    } catch (error) {
      console.error('[DbStorage] getWarehouseTransfer错误:', error);
      return undefined;
    }
  }

  // 以下为其他接口方法的存根，实际使用时需要完整实现
  async getInboundOrder(id: number): Promise<InboundOrder | undefined> {
    // 实现省略
    return undefined;
  }

  async getInboundOrderByNumber(orderNumber: string): Promise<InboundOrder | undefined> {
    // 实现省略
    return undefined;
  }

  async createInboundOrder(inboundOrder: InsertInboundOrder): Promise<InboundOrder> {
    // 实现省略
    throw new Error('方法未实现');
  }

  async updateInboundOrder(id: number, inboundOrder: Partial<InboundOrder>): Promise<InboundOrder | undefined> {
    // 实现省略
    return undefined;
  }

  async getInboundOrders(filter?: { warehouseId?: number, status?: string }): Promise<InboundOrder[]> {
    // 实现省略
    return [];
  }

  async getInboundOrderItems(inboundOrderId: number): Promise<InboundOrderItem[]> {
    // 实现省略
    return [];
  }

  async createInboundOrderItem(inboundOrderItem: InsertInboundOrderItem): Promise<InboundOrderItem> {
    // 实现省略
    throw new Error('方法未实现');
  }

  async updateInboundOrderItem(id: number, inboundOrderItem: Partial<InboundOrderItem>): Promise<InboundOrderItem | undefined> {
    // 实现省略
    return undefined;
  }

  async deleteInboundOrderItem(id: number): Promise<void> {
    // 实现省略
  }

  async getOutboundOrder(id: number): Promise<OutboundOrder | undefined> {
    // 实现省略
    return undefined;
  }

  async getOutboundOrderByNumber(orderNumber: string): Promise<OutboundOrder | undefined> {
    // 实现省略
    return undefined;
  }

  async createOutboundOrder(outboundOrder: InsertOutboundOrder): Promise<OutboundOrder> {
    // 实现省略
    throw new Error('方法未实现');
  }

  async updateOutboundOrder(id: number, outboundOrder: Partial<OutboundOrder>): Promise<OutboundOrder | undefined> {
    // 实现省略
    return undefined;
  }

  async getOutboundOrders(filter?: { warehouseId?: number, status?: string }): Promise<OutboundOrder[]> {
    // 实现省略
    return [];
  }

  async getOutboundOrderItems(outboundOrderId: number): Promise<OutboundOrderItem[]> {
    // 实现省略
    return [];
  }

  async createOutboundOrderItem(outboundOrderItem: InsertOutboundOrderItem): Promise<OutboundOrderItem> {
    // 实现省略
    throw new Error('方法未实现');
  }

  async updateOutboundOrderItem(id: number, outboundOrderItem: Partial<OutboundOrderItem>): Promise<OutboundOrderItem | undefined> {
    // 实现省略
    return undefined;
  }

  async deleteOutboundOrderItem(id: number): Promise<void> {
    // 实现省略
  }

  async getApiConfiguration(id: number): Promise<ApiConfiguration | undefined> {
    // 实现省略
    return undefined;
  }

  async getApiConfigurationByName(name: string): Promise<ApiConfiguration | undefined> {
    // 实现省略
    return undefined;
  }

  async createApiConfiguration(config: InsertApiConfiguration): Promise<ApiConfiguration> {
    // 实现省略
    throw new Error('方法未实现');
  }

  async updateApiConfiguration(id: number, config: Partial<ApiConfiguration>): Promise<ApiConfiguration | undefined> {
    // 实现省略
    return undefined;
  }

  // ... 其他方法的存根实现
}