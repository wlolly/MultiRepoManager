import { 
  users, type User, type InsertUser,
  repositories, type Repository, type InsertRepository,
  teams, type Team, type InsertTeam,
  teamMembers, type TeamMember, type InsertTeamMember,
  teamRepositories, type TeamRepository, type InsertTeamRepository,
  activities, type Activity, type InsertActivity,
  // 仓库管理系统相关导入
  products, type Product, type InsertProduct,
  warehouses, type Warehouse, type InsertWarehouse,
  inboundOrders, type InboundOrder, type InsertInboundOrder,
  inboundOrderItems, type InboundOrderItem, type InsertInboundOrderItem,
  outboundOrders, type OutboundOrder, type InsertOutboundOrder,
  outboundOrderItems, type OutboundOrderItem, type InsertOutboundOrderItem,
  // 电商平台相关导入
  apiConfigurations, type ApiConfiguration, type InsertApiConfiguration,
  ecommerceProducts, type EcommerceProduct, type InsertEcommerceProduct
} from "@shared/schema";
import { processProductCode } from "./utils/product-code-matcher";
import { db } from './db';
import { eq, and, gt, count, desc, sql } from 'drizzle-orm';

export interface IStorage {
  // User methods
  getUser(id: number): Promise<User | undefined>;
  getUserByUsername(username: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;
  getUsers(): Promise<User[]>;
  
  // Repository methods
  getRepository(id: number): Promise<Repository | undefined>;
  getRepositoryByName(name: string): Promise<Repository | undefined>;
  createRepository(repository: InsertRepository): Promise<Repository>;
  updateRepository(id: number, repository: Partial<Repository>): Promise<Repository | undefined>;
  getRepositories(filters?: { ownerId?: number, language?: string, visibility?: string }): Promise<Repository[]>;
  
  // Team methods
  getTeam(id: number): Promise<Team | undefined>;
  createTeam(team: InsertTeam): Promise<Team>;
  getTeams(): Promise<Team[]>;
  
  // Team members methods
  addTeamMember(teamMember: InsertTeamMember): Promise<TeamMember>;
  getTeamMembers(teamId: number): Promise<TeamMember[]>;
  removeTeamMember(teamId: number, userId: number): Promise<void>;
  
  // Team repositories methods
  addTeamRepository(teamRepository: InsertTeamRepository): Promise<TeamRepository>;
  getTeamRepositories(teamId: number): Promise<TeamRepository[]>;
  
  // Activity methods
  createActivity(activity: InsertActivity): Promise<Activity>;
  getActivities(repositoryId?: number, limit?: number): Promise<Activity[]>;
  
  // Stats methods
  getLanguageDistribution(): Promise<{ language: string, count: number, percentage: number }[]>;
  getRepositoryStats(): Promise<{ totalRepositories: number, totalUsers: number, languagesCount: number, recentCommits: number }>;
  
  // 仓库管理系统方法
  // 商品相关方法
  getProduct(id: number): Promise<Product | undefined>;
  getProductByBarcode(barcode: string): Promise<Product | undefined>;
  createProduct(product: InsertProduct): Promise<Product>;
  updateProduct(id: number, product: Partial<Product>): Promise<Product | undefined>;
  getProducts(filter?: { warehouseId?: number, category?: string }): Promise<Product[]>;
  getProductsStats(): Promise<{
    totalProducts: number;
    totalCategories: number;
    lowStockProducts: number;
    totalValue: number;
    avgPrice: number;
  }>;
  
  // 仓库相关方法
  getWarehouse(id: number): Promise<Warehouse | undefined>;
  createWarehouse(warehouse: InsertWarehouse): Promise<Warehouse>;
  updateWarehouse(id: number, warehouse: Partial<Warehouse>): Promise<Warehouse | undefined>;
  getWarehouses(): Promise<Warehouse[]>;
  
  // 入库单相关方法
  getInboundOrder(id: number): Promise<InboundOrder | undefined>;
  getInboundOrderByNumber(orderNumber: string): Promise<InboundOrder | undefined>;
  createInboundOrder(inboundOrder: InsertInboundOrder): Promise<InboundOrder>;
  updateInboundOrder(id: number, inboundOrder: Partial<InboundOrder>): Promise<InboundOrder | undefined>;
  getInboundOrders(filter?: { warehouseId?: number, status?: string }): Promise<InboundOrder[]>;
  
  // 入库单明细相关方法
  getInboundOrderItems(inboundOrderId: number): Promise<InboundOrderItem[]>;
  createInboundOrderItem(inboundOrderItem: InsertInboundOrderItem): Promise<InboundOrderItem>;
  updateInboundOrderItem(id: number, inboundOrderItem: Partial<InboundOrderItem>): Promise<InboundOrderItem | undefined>;
  deleteInboundOrderItem(id: number): Promise<void>;
  
  // 出库单相关方法
  getOutboundOrder(id: number): Promise<OutboundOrder | undefined>;
  getOutboundOrderByNumber(orderNumber: string): Promise<OutboundOrder | undefined>;
  createOutboundOrder(outboundOrder: InsertOutboundOrder): Promise<OutboundOrder>;
  updateOutboundOrder(id: number, outboundOrder: Partial<OutboundOrder>): Promise<OutboundOrder | undefined>;
  getOutboundOrders(filter?: { warehouseId?: number, status?: string }): Promise<OutboundOrder[]>;
  
  // 出库单明细相关方法
  getOutboundOrderItems(outboundOrderId: number): Promise<OutboundOrderItem[]>;
  createOutboundOrderItem(outboundOrderItem: InsertOutboundOrderItem): Promise<OutboundOrderItem>;
  updateOutboundOrderItem(id: number, outboundOrderItem: Partial<OutboundOrderItem>): Promise<OutboundOrderItem | undefined>;
  deleteOutboundOrderItem(id: number): Promise<void>;
  
  // 电商平台API配置方法
  getApiConfiguration(id: number): Promise<ApiConfiguration | undefined>;
  getApiConfigurationByName(name: string): Promise<ApiConfiguration | undefined>;
  createApiConfiguration(config: InsertApiConfiguration): Promise<ApiConfiguration>;
  updateApiConfiguration(id: number, config: Partial<ApiConfiguration>): Promise<ApiConfiguration | undefined>;
  getApiConfigurations(): Promise<ApiConfiguration[]>;
  
  // 电商平台产品方法
  getEcommerceProduct(id: number): Promise<EcommerceProduct | undefined>;
  getEcommerceProductByPlatformId(platformId: string): Promise<EcommerceProduct | undefined>;
  getEcommerceProductByPlatformCode(platformCode: string): Promise<EcommerceProduct | undefined>;
  createEcommerceProduct(product: InsertEcommerceProduct): Promise<EcommerceProduct>;
  updateEcommerceProduct(id: number, product: Partial<EcommerceProduct>): Promise<EcommerceProduct | undefined>;
  getEcommerceProducts(filter?: { platformSource?: string, matchedProductId?: number }): Promise<EcommerceProduct[]>;
  
  // 产品编码匹配辅助方法
  processProductCode(platformCode: string): string; // 处理电商平台编码为可匹配的编码
  findProductsByMatchedCode(matchedCode: string): Promise<Product[]>; // 通过匹配码查找系统产品
  matchPlatformProducts(platformSource: string): Promise<{
    matched: number,
    unmatched: number,
    total: number
  }>; // 执行匹配操作并返回结果统计
}

export class MemStorage implements IStorage {
  private usersMap: Map<number, User>;
  private repositoriesMap: Map<number, Repository>;
  private teamsMap: Map<number, Team>;
  private teamMembersMap: Map<number, TeamMember>;
  private teamRepositoriesMap: Map<number, TeamRepository>;
  private activitiesMap: Map<number, Activity>;
  
  // 仓库管理系统相关存储
  private productsMap: Map<number, Product>;
  private warehousesMap: Map<number, Warehouse>;
  private inboundOrdersMap: Map<number, InboundOrder>;
  private inboundOrderItemsMap: Map<number, InboundOrderItem>;
  private outboundOrdersMap: Map<number, OutboundOrder>;
  private outboundOrderItemsMap: Map<number, OutboundOrderItem>;
  
  // 电商平台相关存储
  private apiConfigurationsMap: Map<number, ApiConfiguration>;
  private ecommerceProductsMap: Map<number, EcommerceProduct>;

  private userIdCounter: number;
  private repositoryIdCounter: number;
  private teamIdCounter: number;
  private teamMemberIdCounter: number;
  private teamRepositoryIdCounter: number;
  private activityIdCounter: number;
  
  // 仓库管理系统相关计数器
  private productIdCounter: number;
  private warehouseIdCounter: number;
  private inboundOrderIdCounter: number;
  private inboundOrderItemIdCounter: number;
  private outboundOrderIdCounter: number;
  private outboundOrderItemIdCounter: number;
  
  // 电商平台相关计数器
  private apiConfigurationIdCounter: number;
  private ecommerceProductIdCounter: number;
  
  // 计算体积的辅助函数 (长x宽x高，单位：cm，结果为立方米)
  private calculateVolume(length: number, width: number, height: number): number {
    return (length * width * height) / 1000000; // 将立方厘米转换为立方米
  }

  constructor() {
    // 初始化存储
    this.usersMap = new Map();
    this.repositoriesMap = new Map();
    this.teamsMap = new Map();
    this.teamMembersMap = new Map();
    this.teamRepositoriesMap = new Map();
    this.activitiesMap = new Map();
    
    // 初始化仓库管理系统存储
    this.productsMap = new Map();
    this.warehousesMap = new Map();
    this.inboundOrdersMap = new Map();
    this.inboundOrderItemsMap = new Map();
    this.outboundOrdersMap = new Map();
    this.outboundOrderItemsMap = new Map();
    
    // 初始化电商平台相关存储
    this.apiConfigurationsMap = new Map();
    this.ecommerceProductsMap = new Map();

    // 初始化ID计数器
    this.userIdCounter = 1;
    this.repositoryIdCounter = 1;
    this.teamIdCounter = 1;
    this.teamMemberIdCounter = 1;
    this.teamRepositoryIdCounter = 1;
    this.activityIdCounter = 1;
    
    // 初始化仓库管理系统ID计数器
    this.productIdCounter = 1;
    this.warehouseIdCounter = 1;
    this.inboundOrderIdCounter = 1;
    this.inboundOrderItemIdCounter = 1;
    this.outboundOrderIdCounter = 1;
    this.outboundOrderItemIdCounter = 1;
    
    // 初始化电商平台相关ID计数器
    this.apiConfigurationIdCounter = 1;
    this.ecommerceProductIdCounter = 1;

    // 初始化演示数据
    this.initializeDemoData();
  }

  private initializeDemoData() {
    // Create some demo users
    const demoUsers = [
      { username: "liuyang", password: "password", fullName: "Liu Yang", avatarUrl: "https://randomuser.me/api/portraits/men/1.jpg" },
      { username: "chenwei", password: "password", fullName: "Chen Wei", avatarUrl: "https://randomuser.me/api/portraits/women/2.jpg" },
      { username: "wangxin", password: "password", fullName: "Wang Xin", avatarUrl: "https://randomuser.me/api/portraits/men/3.jpg" },
      { username: "zhangmin", password: "password", fullName: "Zhang Min", avatarUrl: "https://randomuser.me/api/portraits/women/4.jpg" },
      { username: "zhaoling", password: "password", fullName: "Zhao Ling", avatarUrl: "https://randomuser.me/api/portraits/women/5.jpg" },
      { username: "zhangwei", password: "password", fullName: "Zhang Wei", avatarUrl: "https://randomuser.me/api/portraits/men/6.jpg" }
    ];

    demoUsers.forEach(user => this.createUser(user));
    
    // 创建仓库管理系统的示例数据
    this.initializeWarehouseSystemData();

    // Create some demo repositories
    const demoRepositories = [
      { 
        name: "user-authentication-service", 
        description: "Microservice for managing user authentication and permissions", 
        ownerId: 1, 
        visibility: "public", 
        language: "go",
        branchCount: 5,
        contributorCount: 3,
        updatedAt: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000) // 3 days ago
      },
      { 
        name: "data-processing-pipeline", 
        description: "ETL pipeline for processing large datasets from multiple sources", 
        ownerId: 2, 
        visibility: "internal", 
        language: "python",
        branchCount: 8,
        contributorCount: 4,
        updatedAt: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000) // 5 days ago
      },
      { 
        name: "frontend-dashboard", 
        description: "React dashboard for monitoring system metrics and user analytics", 
        ownerId: 3, 
        visibility: "private", 
        language: "javascript",
        branchCount: 4,
        contributorCount: 2,
        updatedAt: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) // 7 days ago
      },
      { 
        name: "api-gateway", 
        description: "API gateway service for routing requests to microservices", 
        ownerId: 4, 
        visibility: "public", 
        language: "java",
        branchCount: 3,
        contributorCount: 5,
        updatedAt: new Date(Date.now() - 14 * 24 * 60 * 60 * 1000) // 14 days ago
      },
      { 
        name: "user-management-service", 
        description: "Service for managing user profiles and authentication", 
        ownerId: 5, 
        visibility: "public", 
        language: "python",
        branchCount: 8,
        contributorCount: 5,
        updatedAt: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000) // 3 days ago
      },
      { 
        name: "analytics-dashboard", 
        description: "Frontend dashboard for visualizing data metrics", 
        ownerId: 1, 
        visibility: "private", 
        language: "javascript",
        branchCount: 4,
        contributorCount: 3,
        updatedAt: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) // 7 days ago
      },
      { 
        name: "message-queue-service", 
        description: "Messaging queue for inter-service communication", 
        ownerId: 6, 
        visibility: "internal", 
        language: "go",
        branchCount: 6,
        contributorCount: 4,
        updatedAt: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000) // 5 days ago
      }
    ];

    demoRepositories.forEach(repo => this.createRepository(repo as InsertRepository));

    // Create some demo activities
    const demoActivities = [
      { 
        repositoryId: 1, 
        userId: 1, 
        type: "commit", 
        summary: "Updated user authentication",
        branch: "main",
        createdAt: new Date(Date.now() - 2 * 60 * 60 * 1000) // 2 hours ago
      },
      { 
        repositoryId: 4, 
        userId: 6, 
        type: "branch", 
        summary: "Created branch \"feature/api-v2\"",
        branch: "feature/api-v2",
        createdAt: new Date(Date.now() - 5 * 60 * 60 * 1000) // 5 hours ago
      },
      { 
        repositoryId: 2, 
        userId: 2, 
        type: "pull_request", 
        summary: "Opened PR #42",
        branch: "feature/data-transform",
        createdAt: new Date(Date.now() - 24 * 60 * 60 * 1000) // 1 day ago
      },
      { 
        repositoryId: 3, 
        userId: 3, 
        type: "update", 
        summary: "Updated README.md",
        branch: "main",
        createdAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000) // 2 days ago
      }
    ];

    demoActivities.forEach(activity => this.createActivity(activity as InsertActivity));

    // Create a demo team
    const demoTeam = {
      name: "Backend Team",
      description: "Team responsible for backend services and infrastructure"
    };

    const team = this.createTeam(demoTeam as InsertTeam);

    // Add members to the team
    this.addTeamMember({ teamId: team.id, userId: 1, isAdmin: true });
    this.addTeamMember({ teamId: team.id, userId: 2, isAdmin: false });
    this.addTeamMember({ teamId: team.id, userId: 6, isAdmin: false });

    // Add repositories to the team
    this.addTeamRepository({ teamId: team.id, repositoryId: 1 });
    this.addTeamRepository({ teamId: team.id, repositoryId: 2 });
    this.addTeamRepository({ teamId: team.id, repositoryId: 4 });
  }

  // User methods
  async getUser(id: number): Promise<User | undefined> {
    return this.usersMap.get(id);
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    return Array.from(this.usersMap.values()).find(
      (user) => user.username === username,
    );
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    const id = this.userIdCounter++;
    const createdAt = new Date();
    const user: User = { ...insertUser, id, createdAt };
    this.usersMap.set(id, user);
    return user;
  }

  async getUsers(): Promise<User[]> {
    return Array.from(this.usersMap.values());
  }

  // Repository methods
  async getRepository(id: number): Promise<Repository | undefined> {
    return this.repositoriesMap.get(id);
  }

  async getRepositoryByName(name: string): Promise<Repository | undefined> {
    return Array.from(this.repositoriesMap.values()).find(
      (repo) => repo.name === name,
    );
  }

  async createRepository(insertRepository: InsertRepository): Promise<Repository> {
    const id = this.repositoryIdCounter++;
    const createdAt = new Date();
    const updatedAt = new Date();
    const viewCount = 0;
    const repository: Repository = { 
      ...insertRepository, 
      id, 
      createdAt, 
      updatedAt, 
      viewCount 
    };
    this.repositoriesMap.set(id, repository);
    return repository;
  }

  async updateRepository(id: number, repository: Partial<Repository>): Promise<Repository | undefined> {
    const existingRepository = this.repositoriesMap.get(id);
    if (!existingRepository) return undefined;

    const updatedRepository = { 
      ...existingRepository, 
      ...repository, 
      updatedAt: new Date() 
    };
    this.repositoriesMap.set(id, updatedRepository);
    return updatedRepository;
  }

  async getRepositories(filters?: { ownerId?: number, language?: string, visibility?: string }): Promise<Repository[]> {
    let repositories = Array.from(this.repositoriesMap.values());

    if (filters) {
      if (filters.ownerId !== undefined) {
        repositories = repositories.filter(repo => repo.ownerId === filters.ownerId);
      }

      if (filters.language && filters.language !== "all") {
        repositories = repositories.filter(repo => repo.language === filters.language);
      }

      if (filters.visibility && filters.visibility !== "all") {
        repositories = repositories.filter(repo => repo.visibility === filters.visibility);
      }
    }

    // Sort by updated date (newest first)
    repositories.sort((a, b) => b.updatedAt.getTime() - a.updatedAt.getTime());
    
    return repositories;
  }

  // Team methods
  async getTeam(id: number): Promise<Team | undefined> {
    return this.teamsMap.get(id);
  }

  async createTeam(insertTeam: InsertTeam): Promise<Team> {
    const id = this.teamIdCounter++;
    const createdAt = new Date();
    const team: Team = { ...insertTeam, id, createdAt };
    this.teamsMap.set(id, team);
    return team;
  }

  async getTeams(): Promise<Team[]> {
    return Array.from(this.teamsMap.values());
  }

  // Team members methods
  async addTeamMember(insertTeamMember: InsertTeamMember): Promise<TeamMember> {
    const id = this.teamMemberIdCounter++;
    const teamMember: TeamMember = { ...insertTeamMember, id };
    this.teamMembersMap.set(id, teamMember);
    return teamMember;
  }

  async getTeamMembers(teamId: number): Promise<TeamMember[]> {
    return Array.from(this.teamMembersMap.values()).filter(
      (tm) => tm.teamId === teamId,
    );
  }

  async removeTeamMember(teamId: number, userId: number): Promise<void> {
    const teamMember = Array.from(this.teamMembersMap.values()).find(
      (tm) => tm.teamId === teamId && tm.userId === userId,
    );
    if (teamMember) {
      this.teamMembersMap.delete(teamMember.id);
    }
  }

  // Team repositories methods
  async addTeamRepository(insertTeamRepository: InsertTeamRepository): Promise<TeamRepository> {
    const id = this.teamRepositoryIdCounter++;
    const teamRepository: TeamRepository = { ...insertTeamRepository, id };
    this.teamRepositoriesMap.set(id, teamRepository);
    return teamRepository;
  }

  async getTeamRepositories(teamId: number): Promise<TeamRepository[]> {
    return Array.from(this.teamRepositoriesMap.values()).filter(
      (tr) => tr.teamId === teamId,
    );
  }

  // Activity methods
  async createActivity(insertActivity: InsertActivity): Promise<Activity> {
    const id = this.activityIdCounter++;
    const createdAt = new Date();
    const activity: Activity = { ...insertActivity, id, createdAt };
    this.activitiesMap.set(id, activity);
    return activity;
  }

  async getActivities(repositoryId?: number, limit?: number): Promise<Activity[]> {
    let activities = Array.from(this.activitiesMap.values());

    if (repositoryId) {
      activities = activities.filter(activity => activity.repositoryId === repositoryId);
    }

    // Sort by created date (newest first)
    activities.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());

    if (limit) {
      activities = activities.slice(0, limit);
    }

    return activities;
  }

  // 仓库管理系统初始化数据
  private initializeWarehouseSystemData() {
    // 创建仓库
    const demoWarehouses = [
      {
        name: "北京主仓库",
        address: "北京市朝阳区建国路88号",
        contact: "李经理",
        phone: "13800138001",
        area: 5000, // 平方米
        language: "zh" // 中文
      },
      {
        name: "Shanghai Warehouse",
        address: "No.666 Jiangxi Middle Road, Shanghai",
        contact: "Jack Wang",
        phone: "13900139001",
        area: 3500, // 平方米
        language: "en" // 英文
      },
      {
        name: "Москва Склад", // 莫斯科仓库
        address: "Россия, г. Москва, ул. Тверская, 1", // 俄罗斯，莫斯科，Tverskaya街1号
        contact: "Иван Петров", // Ivan Petrov
        phone: "+7 495 123 4567",
        area: 2800, // 平方米
        language: "ru" // 俄文
      },
      {
        name: "Алматы қоймасы", // 阿拉木图仓库
        address: "Қазақстан, Алматы, Абай көшесі, 10", // 哈萨克斯坦，阿拉木图，阿拜街10号
        contact: "Серік Ахметов", // Serik Akhmetov
        phone: "+7 727 123 4567",
        area: 1800, // 平方米
        language: "kk" // 哈萨克文
      },
      {
        name: "Toshkent ombori", // 塔什干仓库
        address: "O'zbekiston, Toshkent, Amir Temur ko'chasi, 5", // 乌兹别克斯坦，塔什干，阿米尔·帖木儿街5号
        contact: "Rustam Karimov", // Rustam Karimov
        phone: "+998 71 123 4567",
        area: 2200, // 平方米
        language: "uz" // 乌兹别克文
      }
    ];
    
    demoWarehouses.forEach(warehouse => this.createWarehouse(warehouse));
    
    // 创建商品
    const demoProducts = [
      {
        name: "高精度工业传感器",
        barcode: "6901234567890", 
        category: "电子设备",
        description: "用于工业自动化的高精度温度传感器",
        unitWeight: 0.15, // kg
        length: 10, // cm
        width: 5, // cm
        height: 3, // cm
        bulkQuantity: 20, // 每箱20个
        bulkLength: 30, // cm
        bulkWidth: 25, // cm
        bulkHeight: 15, // cm
        bulkWeight: 3.5, // kg (包含包装)
        price: 299.99
      },
      {
        name: "医用口罩",
        barcode: "6902345678901",
        category: "医疗用品",
        description: "一次性医用防护口罩，三层过滤",
        unitWeight: 0.005, // kg
        length: 17, // cm
        width: 9, // cm
        height: 0.5, // cm
        bulkQuantity: 50, // 每盒50个
        bulkLength: 20, // cm
        bulkWidth: 15, // cm
        bulkHeight: 10, // cm
        bulkWeight: 0.3, // kg (包含包装)
        price: 49.99
      },
      {
        name: "高性能笔记本电脑",
        barcode: "6903456789012",
        category: "电子产品",
        description: "商务办公高性能笔记本电脑，16GB内存，512GB固态硬盘",
        unitWeight: 1.8, // kg
        length: 35, // cm
        width: 25, // cm
        height: 2, // cm
        bulkQuantity: 5, // 每箱5台
        bulkLength: 45, // cm
        bulkWidth: 40, // cm
        bulkHeight: 30, // cm
        bulkWeight: 11, // kg (包含包装)
        price: 6999.99
      },
      {
        name: "专业摄影三脚架",
        barcode: "6904567890123",
        category: "摄影器材",
        description: "碳纤维专业摄影三脚架，承重10kg",
        unitWeight: 1.2, // kg
        length: 65, // cm (折叠后)
        width: 15, // cm
        height: 15, // cm
        bulkQuantity: 8, // 每箱8个
        bulkLength: 70, // cm
        bulkWidth: 40, // cm
        bulkHeight: 40, // cm
        bulkWeight: 12, // kg (包含包装)
        price: 899.99
      },
      {
        name: "智能手表",
        barcode: "6905678901234",
        category: "穿戴设备",
        description: "多功能智能手表，支持心率监测、GPS定位",
        unitWeight: 0.08, // kg
        length: 4.5, // cm
        width: 3.8, // cm
        height: 1.2, // cm
        bulkQuantity: 30, // 每箱30个
        bulkLength: 35, // cm
        bulkWidth: 25, // cm
        bulkHeight: 15, // cm
        bulkWeight: 3.2, // kg (包含包装)
        price: 1299.99
      }
    ];
    
    demoProducts.forEach(product => {
      // 计算单个产品体积 (立方米)
      const unitVolume = this.calculateVolume(product.length, product.width, product.height);
      
      // 计算整箱产品体积 (立方米)
      const bulkVolume = this.calculateVolume(product.bulkLength, product.bulkWidth, product.bulkHeight);
      
      // 添加体积信息并创建产品
      this.createProduct({
        ...product,
        unitVolume,
        bulkVolume
      });
    });
    
    // 创建入库单
    const demoInboundOrders = [
      {
        orderNumber: "IN20250301001",
        warehouseId: 1,
        status: "completed", // 已完成
        receivedAt: new Date(Date.now() - 15 * 24 * 60 * 60 * 1000), // 15天前
        supplier: "北京电子器材有限公司",
        operator: "张伟"
      },
      {
        orderNumber: "IN20250305002",
        warehouseId: 2,
        status: "processing", // 处理中
        receivedAt: new Date(Date.now() - 10 * 24 * 60 * 60 * 1000), // 10天前
        supplier: "Shanghai Medical Equipment Co., Ltd.",
        operator: "Wang Xin"
      },
      {
        orderNumber: "IN20250308003",
        warehouseId: 3,
        status: "pending", // 待处理
        receivedAt: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000), // 7天前
        supplier: "Электроника Плюс", // Electronics Plus
        operator: "Михаил Иванов" // Mikhail Ivanov
      }
    ];
    
    // 创建入库单和入库单明细
    demoInboundOrders.forEach((order, index) => {
      const inboundOrder = this.createInboundOrder(order);
      
      // 为每个入库单添加2-3个商品
      const numItems = 2 + Math.min(index, 1); // 第一个入库单2个商品，其他3个商品
      
      for (let i = 0; i < numItems; i++) {
        const productId = (i % 5) + 1; // 商品ID从1到5循环
        const quantity = (i + 1) * 10; // 数量：10, 20, 30...
        
        this.createInboundOrderItem({
          inboundOrderId: inboundOrder.id,
          productId,
          quantity,
          remarks: `批次号: BATCH${index + 1}${i + 1}`
        });
      }
    });
    
    // 创建出库单
    const demoOutboundOrders = [
      {
        orderNumber: "OUT20250310001",
        warehouseId: 1,
        status: "completed", // 已完成
        shippedAt: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000), // 5天前
        customer: "上海数字科技有限公司",
        operator: "刘阳"
      },
      {
        orderNumber: "OUT20250312002",
        warehouseId: 4,
        status: "processing", // 处理中
        shippedAt: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000), // 3天前
        customer: "Алматы Технологиялар", // Almaty Technologies
        operator: "Айдар Нұрлан" // Aidar Nurlan
      }
    ];
    
    // 创建出库单和出库单明细
    demoOutboundOrders.forEach((order, index) => {
      const outboundOrder = this.createOutboundOrder(order);
      
      // 为每个出库单添加1-2个商品
      const numItems = index + 1; // 第一个出库单1个商品，第二个2个商品
      
      for (let i = 0; i < numItems; i++) {
        const productId = i + 3; // 商品ID从3开始
        const quantity = (index + 1) * 5; // 数量：5, 10
        
        this.createOutboundOrderItem({
          outboundOrderId: outboundOrder.id,
          productId,
          quantity,
          remarks: `订单号: ORD${index + 1}${i + 1}`
        });
      }
    });
  }
  
  // Stats methods
  async getLanguageDistribution(): Promise<{ language: string; count: number; percentage: number; }[]> {
    const repositories = Array.from(this.repositoriesMap.values());
    const languageCounts: Record<string, number> = {};
    
    repositories.forEach(repo => {
      const language = repo.language || 'other';
      languageCounts[language] = (languageCounts[language] || 0) + 1;
    });

    const totalCount = repositories.length;
    const distribution = Object.entries(languageCounts).map(([language, count]) => ({
      language,
      count,
      percentage: totalCount ? Math.round((count / totalCount) * 100) : 0
    }));

    // Sort by count in descending order
    return distribution.sort((a, b) => b.count - a.count);
  }

  async getRepositoryStats(): Promise<{ totalRepositories: number; totalUsers: number; languagesCount: number; recentCommits: number; }> {
    const repositories = Array.from(this.repositoriesMap.values());
    const users = Array.from(this.usersMap.values());
    const activities = Array.from(this.activitiesMap.values());
    
    // Get unique languages
    const uniqueLanguages = new Set<string>();
    repositories.forEach(repo => {
      if (repo.language) uniqueLanguages.add(repo.language);
    });

    // Count recent commits (activities of type 'commit')
    const recentCommits = activities.filter(activity => activity.type === 'commit').length;

    return {
      totalRepositories: repositories.length,
      totalUsers: users.length,
      languagesCount: uniqueLanguages.size,
      recentCommits
    };
  }
  
  // 仓库管理系统相关方法
  // 商品相关方法
  async getProduct(id: number): Promise<Product | undefined> {
    return this.productsMap.get(id);
  }
  
  async getProductByBarcode(barcode: string): Promise<Product | undefined> {
    return Array.from(this.productsMap.values()).find(
      (product) => product.barcode === barcode,
    );
  }
  
  async createProduct(insertProduct: InsertProduct): Promise<Product> {
    const id = this.productIdCounter++;
    const createdAt = new Date();
    const product: Product = { ...insertProduct, id, createdAt };
    this.productsMap.set(id, product);
    return product;
  }
  
  async updateProduct(id: number, product: Partial<Product>): Promise<Product | undefined> {
    const existingProduct = this.productsMap.get(id);
    if (!existingProduct) return undefined;

    const updatedProduct = { 
      ...existingProduct, 
      ...product, 
      updatedAt: new Date() 
    };
    this.productsMap.set(id, updatedProduct);
    return updatedProduct;
  }
  
  async getProducts(filter?: { warehouseId?: number, category?: string }): Promise<Product[]> {
    let products = Array.from(this.productsMap.values());
    
    if (filter) {
      if (filter.warehouseId !== undefined) {
        products = products.filter(product => 
          product.warehouseId === filter.warehouseId
        );
      }
      
      if (filter.category && filter.category !== "all") {
        products = products.filter(product => 
          product.category === filter.category
        );
      }
    }
    
    return products;
  }
  
  async getProductsStats(): Promise<{
    totalProducts: number;
    totalCategories: number;
    lowStockProducts: number;
    totalValue: number;
    avgPrice: number;
  }> {
    const products = Array.from(this.productsMap.values());
    
    // 获取所有唯一分类
    const categories = new Set<string>();
    for (const product of products) {
      if (product.category) {
        categories.add(product.category);
      }
    }
    
    // 计算库存低的产品数量 (库存少于10的产品)
    const lowStockProducts = products.filter(product => product.stock < 10).length;
    
    // 计算总价值 (库存 * 价格)
    const totalValue = products.reduce((sum, product) => {
      return sum + (product.stock * product.price);
    }, 0);
    
    // 计算平均价格
    const avgPrice = products.length > 0 
      ? products.reduce((sum, product) => sum + product.price, 0) / products.length
      : 0;
    
    return {
      totalProducts: products.length,
      totalCategories: categories.size,
      lowStockProducts,
      totalValue,
      avgPrice
    };
  }
  
  // 仓库相关方法
  async getWarehouse(id: number): Promise<Warehouse | undefined> {
    return this.warehousesMap.get(id);
  }
  
  async createWarehouse(warehouse: InsertWarehouse): Promise<Warehouse> {
    const id = this.warehouseIdCounter++;
    const createdAt = new Date();
    const newWarehouse: Warehouse = { ...warehouse, id, createdAt };
    this.warehousesMap.set(id, newWarehouse);
    return newWarehouse;
  }
  
  async updateWarehouse(id: number, warehouse: Partial<Warehouse>): Promise<Warehouse | undefined> {
    const existingWarehouse = this.warehousesMap.get(id);
    if (!existingWarehouse) return undefined;

    const updatedWarehouse = { 
      ...existingWarehouse, 
      ...warehouse, 
      updatedAt: new Date() 
    };
    this.warehousesMap.set(id, updatedWarehouse);
    return updatedWarehouse;
  }
  
  async getWarehouses(): Promise<Warehouse[]> {
    return Array.from(this.warehousesMap.values());
  }
  
  // 入库单相关方法
  async getInboundOrder(id: number): Promise<InboundOrder | undefined> {
    return this.inboundOrdersMap.get(id);
  }
  
  async getInboundOrderByNumber(orderNumber: string): Promise<InboundOrder | undefined> {
    return Array.from(this.inboundOrdersMap.values()).find(
      (order) => order.orderNumber === orderNumber,
    );
  }
  
  async createInboundOrder(inboundOrder: InsertInboundOrder): Promise<InboundOrder> {
    const id = this.inboundOrderIdCounter++;
    const createdAt = new Date();
    const newInboundOrder: InboundOrder = { 
      ...inboundOrder, 
      id, 
      createdAt, 
      updatedAt: createdAt 
    };
    this.inboundOrdersMap.set(id, newInboundOrder);
    return newInboundOrder;
  }
  
  async updateInboundOrder(id: number, inboundOrder: Partial<InboundOrder>): Promise<InboundOrder | undefined> {
    const existingInboundOrder = this.inboundOrdersMap.get(id);
    if (!existingInboundOrder) return undefined;

    const updatedInboundOrder = { 
      ...existingInboundOrder, 
      ...inboundOrder, 
      updatedAt: new Date() 
    };
    this.inboundOrdersMap.set(id, updatedInboundOrder);
    return updatedInboundOrder;
  }
  
  async getInboundOrders(filter?: { warehouseId?: number, status?: string }): Promise<InboundOrder[]> {
    let orders = Array.from(this.inboundOrdersMap.values());

    if (filter) {
      if (filter.warehouseId !== undefined) {
        orders = orders.filter(order => order.warehouseId === filter.warehouseId);
      }

      if (filter.status) {
        orders = orders.filter(order => order.status === filter.status);
      }
    }

    // Sort by updatedAt (newest first)
    orders.sort((a, b) => b.updatedAt.getTime() - a.updatedAt.getTime());
    
    return orders;
  }
  
  // 入库单明细相关方法
  async getInboundOrderItems(inboundOrderId: number): Promise<InboundOrderItem[]> {
    return Array.from(this.inboundOrderItemsMap.values()).filter(
      (item) => item.inboundOrderId === inboundOrderId,
    );
  }
  
  async createInboundOrderItem(inboundOrderItem: InsertInboundOrderItem): Promise<InboundOrderItem> {
    const id = this.inboundOrderItemIdCounter++;
    const createdAt = new Date();
    const newInboundOrderItem: InboundOrderItem = { 
      ...inboundOrderItem, 
      id, 
      createdAt, 
      updatedAt: createdAt 
    };
    this.inboundOrderItemsMap.set(id, newInboundOrderItem);
    return newInboundOrderItem;
  }
  
  async updateInboundOrderItem(id: number, inboundOrderItem: Partial<InboundOrderItem>): Promise<InboundOrderItem | undefined> {
    const existingInboundOrderItem = this.inboundOrderItemsMap.get(id);
    if (!existingInboundOrderItem) return undefined;

    const updatedInboundOrderItem = { 
      ...existingInboundOrderItem, 
      ...inboundOrderItem, 
      updatedAt: new Date() 
    };
    this.inboundOrderItemsMap.set(id, updatedInboundOrderItem);
    return updatedInboundOrderItem;
  }
  
  async deleteInboundOrderItem(id: number): Promise<void> {
    this.inboundOrderItemsMap.delete(id);
  }
  
  // 出库单相关方法
  async getOutboundOrder(id: number): Promise<OutboundOrder | undefined> {
    return this.outboundOrdersMap.get(id);
  }
  
  async getOutboundOrderByNumber(orderNumber: string): Promise<OutboundOrder | undefined> {
    return Array.from(this.outboundOrdersMap.values()).find(
      (order) => order.orderNumber === orderNumber,
    );
  }
  
  async createOutboundOrder(outboundOrder: InsertOutboundOrder): Promise<OutboundOrder> {
    const id = this.outboundOrderIdCounter++;
    const createdAt = new Date();
    const newOutboundOrder: OutboundOrder = { 
      ...outboundOrder, 
      id, 
      createdAt, 
      updatedAt: createdAt 
    };
    this.outboundOrdersMap.set(id, newOutboundOrder);
    return newOutboundOrder;
  }
  
  async updateOutboundOrder(id: number, outboundOrder: Partial<OutboundOrder>): Promise<OutboundOrder | undefined> {
    const existingOutboundOrder = this.outboundOrdersMap.get(id);
    if (!existingOutboundOrder) return undefined;

    const updatedOutboundOrder = { 
      ...existingOutboundOrder, 
      ...outboundOrder, 
      updatedAt: new Date() 
    };
    this.outboundOrdersMap.set(id, updatedOutboundOrder);
    return updatedOutboundOrder;
  }
  
  async getOutboundOrders(filter?: { warehouseId?: number, status?: string }): Promise<OutboundOrder[]> {
    let orders = Array.from(this.outboundOrdersMap.values());

    if (filter) {
      if (filter.warehouseId !== undefined) {
        orders = orders.filter(order => order.warehouseId === filter.warehouseId);
      }

      if (filter.status) {
        orders = orders.filter(order => order.status === filter.status);
      }
    }

    // Sort by updatedAt (newest first)
    orders.sort((a, b) => b.updatedAt.getTime() - a.updatedAt.getTime());
    
    return orders;
  }
  
  // 出库单明细相关方法
  async getOutboundOrderItems(outboundOrderId: number): Promise<OutboundOrderItem[]> {
    return Array.from(this.outboundOrderItemsMap.values()).filter(
      (item) => item.outboundOrderId === outboundOrderId,
    );
  }
  
  async createOutboundOrderItem(outboundOrderItem: InsertOutboundOrderItem): Promise<OutboundOrderItem> {
    const id = this.outboundOrderItemIdCounter++;
    const createdAt = new Date();
    const newOutboundOrderItem: OutboundOrderItem = { 
      ...outboundOrderItem, 
      id, 
      createdAt, 
      updatedAt: createdAt 
    };
    this.outboundOrderItemsMap.set(id, newOutboundOrderItem);
    return newOutboundOrderItem;
  }
  
  async updateOutboundOrderItem(id: number, outboundOrderItem: Partial<OutboundOrderItem>): Promise<OutboundOrderItem | undefined> {
    const existingOutboundOrderItem = this.outboundOrderItemsMap.get(id);
    if (!existingOutboundOrderItem) return undefined;

    const updatedOutboundOrderItem = { 
      ...existingOutboundOrderItem, 
      ...outboundOrderItem, 
      updatedAt: new Date() 
    };
    this.outboundOrderItemsMap.set(id, updatedOutboundOrderItem);
    return updatedOutboundOrderItem;
  }
  
  async deleteOutboundOrderItem(id: number): Promise<void> {
    this.outboundOrderItemsMap.delete(id);
  }
  
  // 电商平台API配置方法
  async getApiConfiguration(id: number): Promise<ApiConfiguration | undefined> {
    return this.apiConfigurationsMap.get(id);
  }
  
  async getApiConfigurationByName(name: string): Promise<ApiConfiguration | undefined> {
    return Array.from(this.apiConfigurationsMap.values()).find(
      (config) => config.name === name
    );
  }
  
  async createApiConfiguration(insertConfig: InsertApiConfiguration): Promise<ApiConfiguration> {
    const id = this.apiConfigurationIdCounter++;
    const createdAt = new Date();
    const config: ApiConfiguration = { ...insertConfig, id, createdAt };
    this.apiConfigurationsMap.set(id, config);
    return config;
  }
  
  async updateApiConfiguration(id: number, config: Partial<ApiConfiguration>): Promise<ApiConfiguration | undefined> {
    const existingConfig = this.apiConfigurationsMap.get(id);
    if (!existingConfig) return undefined;
    
    const updatedConfig = { ...existingConfig, ...config, updatedAt: new Date() };
    this.apiConfigurationsMap.set(id, updatedConfig);
    return updatedConfig;
  }
  
  async getApiConfigurations(): Promise<ApiConfiguration[]> {
    return Array.from(this.apiConfigurationsMap.values());
  }
  
  // 电商平台产品方法
  async getEcommerceProduct(id: number): Promise<EcommerceProduct | undefined> {
    return this.ecommerceProductsMap.get(id);
  }
  
  async getEcommerceProductByPlatformId(platformId: string): Promise<EcommerceProduct | undefined> {
    return Array.from(this.ecommerceProductsMap.values()).find(
      (product) => product.platformId === platformId
    );
  }
  
  async getEcommerceProductByPlatformCode(platformCode: string): Promise<EcommerceProduct | undefined> {
    return Array.from(this.ecommerceProductsMap.values()).find(
      (product) => product.platformCode === platformCode
    );
  }
  
  async createEcommerceProduct(insertProduct: InsertEcommerceProduct): Promise<EcommerceProduct> {
    const id = this.ecommerceProductIdCounter++;
    const createdAt = new Date();
    const product: EcommerceProduct = { ...insertProduct, id, createdAt };
    this.ecommerceProductsMap.set(id, product);
    return product;
  }
  
  async updateEcommerceProduct(id: number, product: Partial<EcommerceProduct>): Promise<EcommerceProduct | undefined> {
    const existingProduct = this.ecommerceProductsMap.get(id);
    if (!existingProduct) return undefined;
    
    const updatedProduct = { ...existingProduct, ...product, updatedAt: new Date() };
    this.ecommerceProductsMap.set(id, updatedProduct);
    return updatedProduct;
  }
  
  async getEcommerceProducts(filter?: { platformSource?: string, matchedProductId?: number }): Promise<EcommerceProduct[]> {
    let products = Array.from(this.ecommerceProductsMap.values());
    
    if (filter) {
      if (filter.platformSource) {
        products = products.filter(product => product.platformSource === filter.platformSource);
      }
      
      if (filter.matchedProductId !== undefined) {
        products = products.filter(product => product.matchedProductId === filter.matchedProductId);
      }
    }
    
    return products;
  }
  
  // 产品编码匹配辅助方法
  processProductCode(platformCode: string): string {
    return processProductCode(platformCode);
  }
  
  async findProductsByMatchedCode(matchedCode: string): Promise<Product[]> {
    return Array.from(this.productsMap.values()).filter(product => {
      // 从条形码中提取匹配码
      const productCode = product.barcode;
      // 检查是否匹配
      return productCode.includes(matchedCode);
    });
  }
  
  async matchPlatformProducts(platformSource: string): Promise<{
    matched: number,
    unmatched: number,
    total: number
  }> {
    // 获取指定平台的所有产品
    const platformProducts = await this.getEcommerceProducts({ platformSource });
    let matched = 0;
    let unmatched = 0;
    
    for (const product of platformProducts) {
      if (product.platformCode) {
        // 处理平台产品编码
        const matchedCode = this.processProductCode(product.platformCode);
        // 查找匹配的系统产品
        const matchedProducts = await this.findProductsByMatchedCode(matchedCode);
        
        if (matchedProducts.length > 0) {
          // 匹配到系统产品，更新平台产品的匹配状态
          await this.updateEcommerceProduct(product.id, {
            matchedProductId: matchedProducts[0].id,
            matchedProductId: true ? matchedProducts[0].id : null
          });
          matched++;
        } else {
          // 未匹配到系统产品
          await this.updateEcommerceProduct(product.id, {
            matchedProductId: null
          });
          unmatched++;
        }
      } else {
        // 没有产品编码
        unmatched++;
      }
    }
    
    return {
      matched,
      unmatched,
      total: platformProducts.length
    };
  }
}

export class DatabaseStorage implements IStorage {
  // 辅助函数：计算体积
  private calculateVolume(length: number, width: number, height: number): number {
    return (length * width * height) / 1000000; // 将立方厘米转换为立方米
  }

  // User methods
  async getUser(id: number): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.id, id));
    return user || undefined;
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.username, username));
    return user || undefined;
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    // MySQL不直接支持returning，所以我们需要先插入然后查询
    const result = await db.insert(users).values(insertUser);
    const userId = Number(result.insertId);
    
    // 获取刚插入的用户
    const user = await this.getUser(userId);
    if (!user) throw new Error(`Failed to retrieve user after creation`);
    
    return user;
  }

  async getUsers(): Promise<User[]> {
    return await db.select().from(users);
  }

  // Repository methods
  async getRepository(id: number): Promise<Repository | undefined> {
    const [repository] = await db.select().from(repositories).where(eq(repositories.id, id));
    return repository || undefined;
  }

  async getRepositoryByName(name: string): Promise<Repository | undefined> {
    const [repository] = await db.select().from(repositories).where(eq(repositories.name, name));
    return repository || undefined;
  }

  async createRepository(insertRepository: InsertRepository): Promise<Repository> {
    // MySQL不直接支持returning，所以我们需要先插入然后查询
    const result = await db.insert(repositories).values(insertRepository);
    const repositoryId = Number(result.insertId);
    
    // 获取刚插入的仓库
    const repository = await this.getRepository(repositoryId);
    if (!repository) throw new Error(`Failed to retrieve repository after creation`);
    
    return repository;
  }

  async updateRepository(id: number, repository: Partial<Repository>): Promise<Repository | undefined> {
    await db
      .update(repositories)
      .set({ ...repository, updatedAt: new Date() })
      .where(eq(repositories.id, id));
    
    // 获取更新后的仓库
    return await this.getRepository(id);
  }

  async getRepositories(filters?: { ownerId?: number, language?: string, visibility?: string }): Promise<Repository[]> {
    let query = db.select().from(repositories);

    if (filters) {
      if (filters.ownerId !== undefined) {
        query = query.where(eq(repositories.ownerId, filters.ownerId));
      }

      if (filters.language && filters.language !== "all") {
        query = query.where(eq(repositories.language, filters.language as any));
      }

      if (filters.visibility && filters.visibility !== "all") {
        query = query.where(eq(repositories.visibility, filters.visibility as any));
      }
    }

    const result = await query.orderBy(desc(repositories.updatedAt));
    return result;
  }

  // Team methods
  async getTeam(id: number): Promise<Team | undefined> {
    const [team] = await db.select().from(teams).where(eq(teams.id, id));
    return team || undefined;
  }

  async createTeam(insertTeam: InsertTeam): Promise<Team> {
    // MySQL不直接支持returning，所以我们需要先插入然后查询
    const result = await db.insert(teams).values(insertTeam);
    const teamId = Number(result.insertId);
    
    // 获取刚插入的团队
    const team = await this.getTeam(teamId);
    if (!team) throw new Error(`Failed to retrieve team after creation`);
    
    return team;
  }

  async getTeams(): Promise<Team[]> {
    return await db.select().from(teams);
  }

  // Team members methods
  async addTeamMember(insertTeamMember: InsertTeamMember): Promise<TeamMember> {
    // MySQL不直接支持returning，所以我们需要先插入然后查询
    const result = await db.insert(teamMembers).values(insertTeamMember);
    const memberId = Number(result.insertId);
    
    // 获取刚插入的团队成员
    const [teamMember] = await db.select().from(teamMembers).where(eq(teamMembers.id, memberId));
    if (!teamMember) throw new Error(`Failed to retrieve team member after creation`);
    
    return teamMember;
  }

  async getTeamMembers(teamId: number): Promise<TeamMember[]> {
    return await db.select().from(teamMembers).where(eq(teamMembers.teamId, teamId));
  }

  async removeTeamMember(teamId: number, userId: number): Promise<void> {
    await db
      .delete(teamMembers)
      .where(and(eq(teamMembers.teamId, teamId), eq(teamMembers.userId, userId)));
  }

  // Team repositories methods
  async addTeamRepository(insertTeamRepository: InsertTeamRepository): Promise<TeamRepository> {
    // MySQL不直接支持returning，所以我们需要先插入然后查询
    const result = await db.insert(teamRepositories).values(insertTeamRepository);
    const repoId = Number(result.insertId);
    
    // 获取刚插入的团队仓库关联
    const [teamRepository] = await db.select().from(teamRepositories).where(eq(teamRepositories.id, repoId));
    if (!teamRepository) throw new Error(`Failed to retrieve team repository after creation`);
    
    return teamRepository;
  }

  async getTeamRepositories(teamId: number): Promise<TeamRepository[]> {
    return await db.select().from(teamRepositories).where(eq(teamRepositories.teamId, teamId));
  }

  // Activity methods
  async createActivity(insertActivity: InsertActivity): Promise<Activity> {
    // MySQL不直接支持returning，所以我们需要先插入然后查询
    const result = await db.insert(activities).values(insertActivity);
    const activityId = Number(result.insertId);
    
    // 获取刚插入的活动
    const [activity] = await db.select().from(activities).where(eq(activities.id, activityId));
    if (!activity) throw new Error(`Failed to retrieve activity after creation`);
    
    return activity;
  }

  async getActivities(repositoryId?: number, limit?: number): Promise<Activity[]> {
    let query = db.select().from(activities);

    if (repositoryId !== undefined) {
      query = query.where(eq(activities.repositoryId, repositoryId));
    }

    query = query.orderBy(desc(activities.createdAt));

    if (limit !== undefined) {
      query = query.limit(limit);
    }

    return await query;
  }

  // Stats methods
  async getLanguageDistribution(): Promise<{ language: string, count: number, percentage: number }[]> {
    const repoCount = await db.select({ count: count() }).from(repositories);
    const totalRepos = repoCount[0].count;

    const result = await db
      .select({
        language: repositories.language,
        count: count(),
      })
      .from(repositories)
      .groupBy(repositories.language);

    return result.map(item => ({
      language: item.language || "other",
      count: item.count,
      percentage: (item.count / totalRepos) * 100
    }));
  }

  async getRepositoryStats(): Promise<{ totalRepositories: number, totalUsers: number, languagesCount: number, recentCommits: number }> {
    const repoCount = await db.select({ count: count() }).from(repositories);
    const userCount = await db.select({ count: count() }).from(users);
    
    const languagesResult = await db
      .select({ language: repositories.language })
      .from(repositories)
      .groupBy(repositories.language);
    
    const weekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
    
    const commitCount = await db
      .select({ count: count() })
      .from(activities)
      .where(and(
        eq(activities.type, "commit"),
        gt(activities.createdAt, weekAgo)
      ));

    return {
      totalRepositories: repoCount[0].count,
      totalUsers: userCount[0].count,
      languagesCount: languagesResult.length,
      recentCommits: commitCount[0].count
    };
  }

  // 商品相关方法
  async getProduct(id: number): Promise<Product | undefined> {
    const [product] = await db.select().from(products).where(eq(products.id, id));
    return product || undefined;
  }

  async getProductByBarcode(barcode: string): Promise<Product | undefined> {
    const [product] = await db.select().from(products).where(eq(products.barcode, barcode));
    return product || undefined;
  }

  async createProduct(insertProduct: InsertProduct): Promise<Product> {
    // MySQL不直接支持returning，所以我们需要先插入然后查询
    const result = await db.insert(products).values(insertProduct);
    const productId = Number(result.insertId);
    
    // 获取刚插入的产品
    const product = await this.getProduct(productId);
    if (!product) throw new Error(`Failed to retrieve product after creation`);
    
    return product;
  }

  async updateProduct(id: number, product: Partial<Product>): Promise<Product | undefined> {
    await db
      .update(products)
      .set({ ...product, updatedAt: new Date() })
      .where(eq(products.id, id));
    
    // 获取更新后的产品
    return await this.getProduct(id);
  }

  async getProducts(filter?: { warehouseId?: number, category?: string }): Promise<Product[]> {
    let query = db.select().from(products);
    
    if (filter) {
      if (filter.warehouseId !== undefined) {
        query = query.where(eq(products.warehouseId, filter.warehouseId));
      }
      
      if (filter.category && filter.category !== "all") {
        query = query.where(eq(products.category, filter.category));
      }
    }
    
    return await query;
  }

  async getProductsStats(): Promise<{
    totalProducts: number;
    totalCategories: number;
    lowStockProducts: number;
    totalValue: number;
    avgPrice: number;
  }> {
    // 获取所有产品
    const allProducts = await db.select().from(products);
    
    // 获取所有唯一分类
    const categories = new Set<string>();
    for (const product of allProducts) {
      if (product.category) {
        categories.add(product.category);
      }
    }
    
    // 计算库存低的产品数量 (库存少于10的产品)
    const lowStockProducts = allProducts.filter(product => product.stock < 10).length;
    
    // 计算总价值 (库存 * 价格)
    const totalValue = allProducts.reduce((sum, product) => {
      return sum + (product.stock * product.price);
    }, 0);
    
    // 计算平均价格
    const avgPrice = allProducts.length > 0 
      ? allProducts.reduce((sum, product) => sum + product.price, 0) / allProducts.length
      : 0;
    
    return {
      totalProducts: allProducts.length,
      totalCategories: categories.size,
      lowStockProducts,
      totalValue,
      avgPrice
    };
  }

  // 仓库相关方法
  async getWarehouse(id: number): Promise<Warehouse | undefined> {
    const [warehouse] = await db.select().from(warehouses).where(eq(warehouses.id, id));
    return warehouse || undefined;
  }

  async createWarehouse(insertWarehouse: InsertWarehouse): Promise<Warehouse> {
    // MySQL不直接支持returning，所以我们需要先插入然后查询
    const result = await db.insert(warehouses).values(insertWarehouse);
    const warehouseId = Number(result.insertId);
    
    // 获取刚插入的仓库
    const warehouse = await this.getWarehouse(warehouseId);
    if (!warehouse) throw new Error(`Failed to retrieve warehouse after creation`);
    
    return warehouse;
  }

  async updateWarehouse(id: number, warehouse: Partial<Warehouse>): Promise<Warehouse | undefined> {
    await db
      .update(warehouses)
      .set(warehouse)
      .where(eq(warehouses.id, id));
    
    // 获取更新后的仓库
    return await this.getWarehouse(id);
  }

  async getWarehouses(): Promise<Warehouse[]> {
    return await db.select().from(warehouses);
  }

  // 入库单相关方法
  async getInboundOrder(id: number): Promise<InboundOrder | undefined> {
    const [inboundOrder] = await db.select().from(inboundOrders).where(eq(inboundOrders.id, id));
    
    if (!inboundOrder) return undefined;
    
    // 获取关联数据
    // 获取订单项目
    const items = await this.getInboundOrderItems(id);
    // 获取商品详情
    for (const item of items) {
      if (item.productId) {
        item.product = await this.getProduct(item.productId);
      }
    }
    
    // 获取仓库信息
    if (inboundOrder.warehouseId) {
      inboundOrder.warehouse = await this.getWarehouse(inboundOrder.warehouseId);
    }
    
    // 获取创建者信息
    if (inboundOrder.createdBy) {
      inboundOrder.creator = await this.getUser(inboundOrder.createdBy);
    }
    
    // 添加项目到订单
    inboundOrder.items = items;
    
    return inboundOrder;
  }

  async getInboundOrderByNumber(orderNumber: string): Promise<InboundOrder | undefined> {
    const [inboundOrder] = await db.select().from(inboundOrders).where(eq(inboundOrders.orderNumber, orderNumber));
    return inboundOrder || undefined;
  }

  async createInboundOrder(insertInboundOrder: InsertInboundOrder): Promise<InboundOrder> {
    try {
      // MySQL不直接支持returning，所以我们需要先插入然后查询
      console.log("即将插入入库单数据:", JSON.stringify(insertInboundOrder));
      const result = await db.insert(inboundOrders).values(insertInboundOrder);
      
      // 处理insertId可能在不同位置的情况
      let orderId;
      if (result && typeof result === 'object') {
        console.log("插入入库单结果:", JSON.stringify(result));
        
        // 尝试多种可能的路径获取insertId
        if ('insertId' in result) {
          orderId = Number(result.insertId);
        } else if (result[0] && 'insertId' in result[0]) {
          orderId = Number(result[0].insertId);
        } else if (result.rows && result.rows.insertId) {
          orderId = Number(result.rows.insertId);
        } else {
          // 如果无法获取ID，使用订单号查询
          console.log("无法从插入结果中获取ID，尝试通过订单号查询");
          const orderByNumber = await this.getInboundOrderByNumber(insertInboundOrder.orderNumber);
          if (orderByNumber) {
            return orderByNumber;
          }
          throw new Error("无法获取新创建的入库单ID");
        }
      } else {
        console.log("插入结果不是对象:", result);
        throw new Error("插入结果格式异常");
      }
      
      if (isNaN(orderId) || orderId <= 0) {
        console.log("获取到的入库单ID无效:", orderId);
        // 尝试通过订单号查询
        const orderByNumber = await this.getInboundOrderByNumber(insertInboundOrder.orderNumber);
        if (orderByNumber) {
          return orderByNumber;
        }
        throw new Error(`无效的入库单ID: ${orderId}`);
      }
      
      console.log("成功获取入库单ID:", orderId);
      
      // 获取刚插入的入库单
      const inboundOrder = await this.getInboundOrder(orderId);
      if (!inboundOrder) {
        console.log("无法通过ID查询到入库单，尝试通过订单号查询");
        // 尝试通过订单号查询
        const orderByNumber = await this.getInboundOrderByNumber(insertInboundOrder.orderNumber);
        if (orderByNumber) {
          return orderByNumber;
        }
        throw new Error(`无法获取新创建的入库单: ${orderId}`);
      }
      
      return inboundOrder;
    } catch (error) {
      console.error("创建入库单错误:", error);
      throw error;
    }
  }

  async updateInboundOrder(id: number, inboundOrder: Partial<InboundOrder>): Promise<InboundOrder | undefined> {
    await db
      .update(inboundOrders)
      .set(inboundOrder)
      .where(eq(inboundOrders.id, id));
    
    // 获取更新后的入库单
    return await this.getInboundOrder(id);
  }

  async getInboundOrders(filter?: { warehouseId?: number, status?: string }): Promise<InboundOrder[]> {
    let query = db.select().from(inboundOrders);

    if (filter) {
      if (filter.warehouseId !== undefined) {
        query = query.where(eq(inboundOrders.warehouseId, filter.warehouseId));
      }

      if (filter.status !== undefined) {
        query = query.where(eq(inboundOrders.status, filter.status));
      }
    }

    query = query.orderBy(desc(inboundOrders.createdAt));
    const orders = await query;
    
    // 为每个订单加载关联数据
    for (const order of orders) {
      // 获取订单项目
      order.items = await this.getInboundOrderItems(order.id);
      
      // 获取仓库信息
      if (order.warehouseId) {
        order.warehouse = await this.getWarehouse(order.warehouseId);
      }
      
      // 获取创建者信息
      if (order.createdBy) {
        order.creator = await this.getUser(order.createdBy);
      }
    }
    
    return orders;
  }

  // 入库单明细相关方法
  async getInboundOrderItems(inboundOrderId: number): Promise<InboundOrderItem[]> {
    return await db
      .select()
      .from(inboundOrderItems)
      .where(eq(inboundOrderItems.inboundOrderId, inboundOrderId));
  }

  async createInboundOrderItem(insertInboundOrderItem: InsertInboundOrderItem): Promise<InboundOrderItem> {
    try {
      // MySQL不直接支持returning，所以我们需要先插入然后查询
      console.log("插入入库单明细:", JSON.stringify(insertInboundOrderItem));
      const result = await db.insert(inboundOrderItems).values(insertInboundOrderItem);
      
      // 处理insertId可能在不同位置的情况
      let itemId;
      if (result && typeof result === 'object') {
        console.log("入库单明细插入结果:", JSON.stringify(result));
        
        // 尝试多种可能的路径获取insertId
        if ('insertId' in result) {
          itemId = Number(result.insertId);
        } else if (result[0] && 'insertId' in result[0]) {
          itemId = Number(result[0].insertId);
        } else if (result.rows && result.rows.insertId) {
          itemId = Number(result.rows.insertId);
        } else {
          // 如果无法获取ID，尝试通过联合查询
          console.log("无法获取明细ID，尝试通过订单ID和商品ID查询最新插入的项目");
          const recentItems = await db.select()
                                     .from(inboundOrderItems)
                                     .where(eq(inboundOrderItems.inboundOrderId, insertInboundOrderItem.inboundOrderId))
                                     .orderBy(desc(inboundOrderItems.id))
                                     .limit(1);
          
          if (recentItems.length > 0) {
            return recentItems[0];
          }
          
          throw new Error("无法获取新创建的入库单明细ID");
        }
      } else {
        console.log("插入结果不是对象:", result);
        throw new Error("插入结果格式异常");
      }
      
      if (isNaN(itemId) || itemId <= 0) {
        console.log("获取到的明细ID无效:", itemId);
        // 尝试通过关联字段查询
        const recentItems = await db.select()
                                   .from(inboundOrderItems)
                                   .where(eq(inboundOrderItems.inboundOrderId, insertInboundOrderItem.inboundOrderId))
                                   .orderBy(desc(inboundOrderItems.id))
                                   .limit(1);
        
        if (recentItems.length > 0) {
          return recentItems[0];
        }
        
        throw new Error(`无效的入库单明细ID: ${itemId}`);
      }
      
      console.log("成功获取入库单明细ID:", itemId);
      
      // 获取刚插入的入库单明细
      const inboundOrderItem = await this.getInboundOrderItem(itemId);
      if (!inboundOrderItem) {
        console.log("无法通过ID查询到入库单明细，尝试通过订单ID查询最新项目");
        // 尝试通过关联字段查询
        const recentItems = await db.select()
                                   .from(inboundOrderItems)
                                   .where(eq(inboundOrderItems.inboundOrderId, insertInboundOrderItem.inboundOrderId))
                                   .orderBy(desc(inboundOrderItems.id))
                                   .limit(1);
        
        if (recentItems.length > 0) {
          return recentItems[0];
        }
        
        throw new Error(`无法获取新创建的入库单明细: ${itemId}`);
      }
      
      return inboundOrderItem;
    } catch (error) {
      console.error("创建入库单明细错误:", error);
      throw error;
    }
  }

  async getInboundOrderItem(id: number): Promise<InboundOrderItem | undefined> {
    const [item] = await db.select().from(inboundOrderItems).where(eq(inboundOrderItems.id, id));
    return item || undefined;
  }

  async updateInboundOrderItem(id: number, inboundOrderItem: Partial<InboundOrderItem>): Promise<InboundOrderItem | undefined> {
    await db
      .update(inboundOrderItems)
      .set(inboundOrderItem)
      .where(eq(inboundOrderItems.id, id));
    
    // 获取更新后的入库单明细
    return await this.getInboundOrderItem(id);
  }

  async deleteInboundOrderItem(id: number): Promise<void> {
    await db.delete(inboundOrderItems).where(eq(inboundOrderItems.id, id));
  }

  // 出库单相关方法
  async getOutboundOrder(id: number): Promise<OutboundOrder | undefined> {
    const [outboundOrder] = await db.select().from(outboundOrders).where(eq(outboundOrders.id, id));
    
    if (!outboundOrder) return undefined;
    
    // 获取关联数据
    // 获取订单项目
    const items = await this.getOutboundOrderItems(id);
    // 获取商品详情
    for (const item of items) {
      if (item.productId) {
        item.product = await this.getProduct(item.productId);
      }
    }
    
    // 获取仓库信息
    if (outboundOrder.warehouseId) {
      outboundOrder.warehouse = await this.getWarehouse(outboundOrder.warehouseId);
    }
    
    // 获取创建者信息
    if (outboundOrder.createdBy) {
      outboundOrder.creator = await this.getUser(outboundOrder.createdBy);
    }
    
    // 添加项目到订单
    outboundOrder.items = items;
    
    return outboundOrder;
  }

  async getOutboundOrderByNumber(orderNumber: string): Promise<OutboundOrder | undefined> {
    const [outboundOrder] = await db.select().from(outboundOrders).where(eq(outboundOrders.orderNumber, orderNumber));
    return outboundOrder || undefined;
  }

  async createOutboundOrder(insertOutboundOrder: InsertOutboundOrder): Promise<OutboundOrder> {
    try {
      // MySQL不直接支持returning，所以我们需要先插入然后查询
      console.log("即将插入出库单数据:", JSON.stringify(insertOutboundOrder));
      const result = await db.insert(outboundOrders).values(insertOutboundOrder);
      
      // 处理insertId可能在不同位置的情况
      let orderId;
      if (result && typeof result === 'object') {
        // 输出结果以便调试
        console.log("插入结果:", JSON.stringify(result));
        
        // 尝试多种可能的路径获取insertId
        if ('insertId' in result) {
          orderId = Number(result.insertId);
        } else if (result[0] && 'insertId' in result[0]) {
          orderId = Number(result[0].insertId);
        } else if (result.rows && result.rows.insertId) {
          orderId = Number(result.rows.insertId);
        } else {
          // 如果无法获取ID，使用订单号查询
          console.log("无法从插入结果中获取ID，尝试通过订单号查询");
          const orderByNumber = await this.getOutboundOrderByNumber(insertOutboundOrder.orderNumber);
          if (orderByNumber) {
            return orderByNumber;
          }
          throw new Error("无法获取新创建的出库单ID");
        }
      } else {
        console.log("插入结果不是对象:", result);
        throw new Error("插入结果格式异常");
      }
      
      if (isNaN(orderId) || orderId <= 0) {
        console.log("获取到的订单ID无效:", orderId);
        // 尝试通过订单号查询
        const orderByNumber = await this.getOutboundOrderByNumber(insertOutboundOrder.orderNumber);
        if (orderByNumber) {
          return orderByNumber;
        }
        throw new Error(`无效的出库单ID: ${orderId}`);
      }
      
      console.log("成功获取出库单ID:", orderId);
      
      // 获取刚插入的出库单
      const outboundOrder = await this.getOutboundOrder(orderId);
      if (!outboundOrder) {
        console.log("无法通过ID查询到出库单，尝试通过订单号查询");
        // 尝试通过订单号查询
        const orderByNumber = await this.getOutboundOrderByNumber(insertOutboundOrder.orderNumber);
        if (orderByNumber) {
          return orderByNumber;
        }
        throw new Error(`无法获取新创建的出库单: ${orderId}`);
      }
      
      return outboundOrder;
    } catch (error) {
      console.error("创建出库单错误:", error);
      throw error;
    }
  }

  async updateOutboundOrder(id: number, outboundOrder: Partial<OutboundOrder>): Promise<OutboundOrder | undefined> {
    await db
      .update(outboundOrders)
      .set(outboundOrder)
      .where(eq(outboundOrders.id, id));
    
    // 获取更新后的出库单
    return await this.getOutboundOrder(id);
  }

  async getOutboundOrders(filter?: { warehouseId?: number, status?: string }): Promise<OutboundOrder[]> {
    let query = db.select().from(outboundOrders);

    if (filter) {
      if (filter.warehouseId !== undefined) {
        query = query.where(eq(outboundOrders.warehouseId, filter.warehouseId));
      }

      if (filter.status !== undefined) {
        query = query.where(eq(outboundOrders.status, filter.status));
      }
    }

    query = query.orderBy(desc(outboundOrders.createdAt));
    const orders = await query;
    
    // 为每个订单加载关联数据
    for (const order of orders) {
      // 获取订单项目
      order.items = await this.getOutboundOrderItems(order.id);
      
      // 获取仓库信息
      if (order.warehouseId) {
        order.warehouse = await this.getWarehouse(order.warehouseId);
      }
      
      // 获取创建者信息
      if (order.createdBy) {
        order.creator = await this.getUser(order.createdBy);
      }
    }
    
    return orders;
  }

  // 出库单明细相关方法
  async getOutboundOrderItems(outboundOrderId: number): Promise<OutboundOrderItem[]> {
    return await db
      .select()
      .from(outboundOrderItems)
      .where(eq(outboundOrderItems.outboundOrderId, outboundOrderId));
  }

  async createOutboundOrderItem(insertOutboundOrderItem: InsertOutboundOrderItem): Promise<OutboundOrderItem> {
    try {
      // MySQL不直接支持returning，所以我们需要先插入然后查询
      console.log("插入出库单明细:", JSON.stringify(insertOutboundOrderItem));
      const result = await db.insert(outboundOrderItems).values(insertOutboundOrderItem);
      
      // 处理insertId可能在不同位置的情况
      let itemId;
      if (result && typeof result === 'object') {
        console.log("出库单明细插入结果:", JSON.stringify(result));
        
        // 尝试多种可能的路径获取insertId
        if ('insertId' in result) {
          itemId = Number(result.insertId);
        } else if (result[0] && 'insertId' in result[0]) {
          itemId = Number(result[0].insertId);
        } else if (result.rows && result.rows.insertId) {
          itemId = Number(result.rows.insertId);
        } else {
          // 如果无法获取ID，尝试通过联合查询
          console.log("无法获取明细ID，尝试通过订单ID和商品ID查询最新插入的项目");
          const recentItems = await db.select()
                                     .from(outboundOrderItems)
                                     .where(eq(outboundOrderItems.outboundOrderId, insertOutboundOrderItem.outboundOrderId))
                                     .orderBy(desc(outboundOrderItems.id))
                                     .limit(1);
          
          if (recentItems.length > 0) {
            return recentItems[0];
          }
          
          throw new Error("无法获取新创建的出库单明细ID");
        }
      } else {
        console.log("插入结果不是对象:", result);
        throw new Error("插入结果格式异常");
      }
      
      if (isNaN(itemId) || itemId <= 0) {
        console.log("获取到的明细ID无效:", itemId);
        // 尝试通过关联字段查询
        const recentItems = await db.select()
                                   .from(outboundOrderItems)
                                   .where(eq(outboundOrderItems.outboundOrderId, insertOutboundOrderItem.outboundOrderId))
                                   .orderBy(desc(outboundOrderItems.id))
                                   .limit(1);
        
        if (recentItems.length > 0) {
          return recentItems[0];
        }
        
        throw new Error(`无效的出库单明细ID: ${itemId}`);
      }
      
      console.log("成功获取出库单明细ID:", itemId);
      
      // 获取刚插入的出库单明细
      const outboundOrderItem = await this.getOutboundOrderItem(itemId);
      if (!outboundOrderItem) {
        console.log("无法通过ID查询到出库单明细，尝试通过订单ID查询最新项目");
        // 尝试通过关联字段查询
        const recentItems = await db.select()
                                   .from(outboundOrderItems)
                                   .where(eq(outboundOrderItems.outboundOrderId, insertOutboundOrderItem.outboundOrderId))
                                   .orderBy(desc(outboundOrderItems.id))
                                   .limit(1);
        
        if (recentItems.length > 0) {
          return recentItems[0];
        }
        
        throw new Error(`无法获取新创建的出库单明细: ${itemId}`);
      }
      
      return outboundOrderItem;
    } catch (error) {
      console.error("创建出库单明细错误:", error);
      throw error;
    }
  }

  async getOutboundOrderItem(id: number): Promise<OutboundOrderItem | undefined> {
    const [item] = await db.select().from(outboundOrderItems).where(eq(outboundOrderItems.id, id));
    return item || undefined;
  }

  async updateOutboundOrderItem(id: number, outboundOrderItem: Partial<OutboundOrderItem>): Promise<OutboundOrderItem | undefined> {
    await db
      .update(outboundOrderItems)
      .set(outboundOrderItem)
      .where(eq(outboundOrderItems.id, id));
    
    // 获取更新后的出库单明细
    return await this.getOutboundOrderItem(id);
  }

  async deleteOutboundOrderItem(id: number): Promise<void> {
    await db.delete(outboundOrderItems).where(eq(outboundOrderItems.id, id));
  }
  
  // 电商平台API配置方法
  async getApiConfiguration(id: number): Promise<ApiConfiguration | undefined> {
    const [config] = await db.select().from(apiConfigurations).where(eq(apiConfigurations.id, id));
    return config || undefined;
  }
  
  async getApiConfigurationByName(name: string): Promise<ApiConfiguration | undefined> {
    const [config] = await db.select().from(apiConfigurations).where(eq(apiConfigurations.name, name));
    return config || undefined;
  }
  
  async createApiConfiguration(insertConfig: InsertApiConfiguration): Promise<ApiConfiguration> {
    try {
      // MySQL不直接支持returning，所以我们需要先插入然后查询
      console.log("即将插入API配置数据:", JSON.stringify(insertConfig));
      const result = await db.insert(apiConfigurations).values(insertConfig);
      
      // 处理insertId可能在不同位置的情况
      let configId;
      if (result && typeof result === 'object') {
        console.log("插入API配置结果:", JSON.stringify(result));
        
        // 尝试多种可能的路径获取insertId
        if ('insertId' in result) {
          configId = Number(result.insertId);
        } else if (result[0] && 'insertId' in result[0]) {
          configId = Number(result[0].insertId);
        } else if (result.rows && result.rows.insertId) {
          configId = Number(result.rows.insertId);
        } else {
          // 如果无法获取ID，使用名称查询
          console.log("无法从插入结果中获取ID，尝试通过名称查询");
          const configByName = await this.getApiConfigurationByName(insertConfig.name);
          if (configByName) {
            return configByName;
          }
          throw new Error("无法获取新创建的API配置ID");
        }
      } else {
        console.log("插入结果不是对象:", result);
        throw new Error("插入结果格式异常");
      }
      
      if (isNaN(configId) || configId <= 0) {
        console.log("获取到的API配置ID无效:", configId);
        // 尝试通过名称查询
        const configByName = await this.getApiConfigurationByName(insertConfig.name);
        if (configByName) {
          return configByName;
        }
        throw new Error(`无效的API配置ID: ${configId}`);
      }
      
      console.log("成功获取API配置ID:", configId);
      
      // 获取刚插入的API配置
      const config = await this.getApiConfiguration(configId);
      if (!config) {
        console.log("无法通过ID查询到API配置，尝试通过名称查询");
        // 尝试通过名称查询
        const configByName = await this.getApiConfigurationByName(insertConfig.name);
        if (configByName) {
          return configByName;
        }
        throw new Error(`无法获取新创建的API配置: ${configId}`);
      }
      
      return config;
    } catch (error) {
      console.error("创建API配置错误:", error);
      throw error;
    }
  }
  
  async updateApiConfiguration(id: number, config: Partial<ApiConfiguration>): Promise<ApiConfiguration | undefined> {
    await db
      .update(apiConfigurations)
      .set({ ...config, updatedAt: new Date() })
      .where(eq(apiConfigurations.id, id));
    
    // 获取更新后的API配置
    return await this.getApiConfiguration(id);
  }
  
  async getApiConfigurations(): Promise<ApiConfiguration[]> {
    return await db.select().from(apiConfigurations);
  }
  
  // 电商平台产品方法
  async getEcommerceProduct(id: number): Promise<EcommerceProduct | undefined> {
    const [product] = await db.select().from(ecommerceProducts).where(eq(ecommerceProducts.id, id));
    return product || undefined;
  }
  
  async getEcommerceProductByPlatformId(platformId: string): Promise<EcommerceProduct | undefined> {
    const [product] = await db.select().from(ecommerceProducts)
      .where(eq(ecommerceProducts.platformId, platformId));
    return product || undefined;
  }
  
  async getEcommerceProductByPlatformCode(platformCode: string): Promise<EcommerceProduct | undefined> {
    const [product] = await db.select().from(ecommerceProducts)
      .where(eq(ecommerceProducts.platformCode, platformCode));
    return product || undefined;
  }
  
  async createEcommerceProduct(insertProduct: InsertEcommerceProduct): Promise<EcommerceProduct> {
    try {
      // MySQL不直接支持returning，所以我们需要先插入然后查询
      console.log("即将插入电商产品数据:", JSON.stringify(insertProduct));
      const result = await db.insert(ecommerceProducts).values(insertProduct);
      
      // 处理insertId可能在不同位置的情况
      let productId;
      if (result && typeof result === 'object') {
        console.log("插入电商产品结果:", JSON.stringify(result));
        
        // 尝试多种可能的路径获取insertId
        if ('insertId' in result) {
          productId = Number(result.insertId);
        } else if (result[0] && 'insertId' in result[0]) {
          productId = Number(result[0].insertId);
        } else if (result.rows && result.rows.insertId) {
          productId = Number(result.rows.insertId);
        } else {
          // 如果无法获取ID，使用平台ID或平台编码查询
          console.log("无法从插入结果中获取ID，尝试通过平台标识查询");
          
          if (insertProduct.platformId) {
            const productByPlatformId = await this.getEcommerceProductByPlatformId(insertProduct.platformId);
            if (productByPlatformId) {
              return productByPlatformId;
            }
          }
          
          if (insertProduct.platformCode) {
            const productByPlatformCode = await this.getEcommerceProductByPlatformCode(insertProduct.platformCode);
            if (productByPlatformCode) {
              return productByPlatformCode;
            }
          }
          
          throw new Error("无法获取新创建的电商产品ID");
        }
      } else {
        console.log("插入结果不是对象:", result);
        throw new Error("插入结果格式异常");
      }
      
      if (isNaN(productId) || productId <= 0) {
        console.log("获取到的电商产品ID无效:", productId);
        // 尝试通过平台ID或平台编码查询
        if (insertProduct.platformId) {
          const productByPlatformId = await this.getEcommerceProductByPlatformId(insertProduct.platformId);
          if (productByPlatformId) {
            return productByPlatformId;
          }
        }
        
        if (insertProduct.platformCode) {
          const productByPlatformCode = await this.getEcommerceProductByPlatformCode(insertProduct.platformCode);
          if (productByPlatformCode) {
            return productByPlatformCode;
          }
        }
        
        throw new Error(`无效的电商产品ID: ${productId}`);
      }
      
      console.log("成功获取电商产品ID:", productId);
      
      // 获取刚插入的电商产品
      const product = await this.getEcommerceProduct(productId);
      if (!product) {
        console.log("无法通过ID查询到电商产品，尝试通过平台标识查询");
        // 尝试通过平台ID或平台编码查询
        if (insertProduct.platformId) {
          const productByPlatformId = await this.getEcommerceProductByPlatformId(insertProduct.platformId);
          if (productByPlatformId) {
            return productByPlatformId;
          }
        }
        
        if (insertProduct.platformCode) {
          const productByPlatformCode = await this.getEcommerceProductByPlatformCode(insertProduct.platformCode);
          if (productByPlatformCode) {
            return productByPlatformCode;
          }
        }
        
        throw new Error(`无法获取新创建的电商产品: ${productId}`);
      }
      
      return product;
    } catch (error) {
      console.error("创建电商产品错误:", error);
      throw error;
    }
  }
  
  async updateEcommerceProduct(id: number, product: Partial<EcommerceProduct>): Promise<EcommerceProduct | undefined> {
    const updateData = { ...product };
    // 确保包含更新时间
    if (!('updatedAt' in updateData)) {
      // @ts-ignore - 我们知道在MySQL schema中有updatedAt字段
      updateData.updatedAt = new Date();
    }
    
    await db
      .update(ecommerceProducts)
      .set(updateData)
      .where(eq(ecommerceProducts.id, id));
    
    // 获取更新后的电商产品
    return await this.getEcommerceProduct(id);
  }
  
  async getEcommerceProducts(filter?: { platformSource?: string, matchedProductId?: number }): Promise<EcommerceProduct[]> {
    let query = db.select().from(ecommerceProducts);
    
    if (filter) {
      if (filter.platformSource) {
        query = query.where(eq(ecommerceProducts.platformSource, filter.platformSource));
      }
      
      if (filter.matchedProductId !== undefined) {
        query = query.where(eq(ecommerceProducts.matchedProductId, filter.matchedProductId));
      }
    }
    
    return await query;
  }
  
  // 产品编码匹配辅助方法
  processProductCode(platformCode: string): string {
    return processProductCode(platformCode);
  }
  
  async findProductsByMatchedCode(matchedCode: string): Promise<Product[]> {
    return await db.select().from(products)
      .where(sql`${products.barcode} LIKE ${`%${matchedCode}%`}`);
  }
  
  async matchPlatformProducts(platformSource: string): Promise<{
    matched: number,
    unmatched: number,
    total: number
  }> {
    // 获取指定平台的所有产品
    const platformProducts = await this.getEcommerceProducts({ platformSource });
    let matched = 0;
    let unmatched = 0;
    
    for (const product of platformProducts) {
      if (product.platformCode) {
        // 处理平台产品编码
        const matchedCode = this.processProductCode(product.platformCode);
        // 查找匹配的系统产品
        const matchedProducts = await this.findProductsByMatchedCode(matchedCode);
        
        if (matchedProducts.length > 0) {
          // 匹配到系统产品，更新平台产品的匹配状态
          await this.updateEcommerceProduct(product.id, {
            matchedProductId: matchedProducts[0].id,
            matchedProductId: true ? matchedProducts[0].id : null
          });
          matched++;
        } else {
          // 未匹配到系统产品
          await this.updateEcommerceProduct(product.id, {
            matchedProductId: false ? matchedProducts[0].id : null
          });
          unmatched++;
        }
      } else {
        // 没有产品编码
        unmatched++;
      }
    }
    
    return {
      matched,
      unmatched,
      total: platformProducts.length
    };
  }
}

// 切换到数据库存储方式
export const storage = new DatabaseStorage();
