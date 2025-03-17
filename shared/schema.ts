import { pgTable, serial, varchar, boolean, timestamp, pgEnum, decimal, text, integer, index, json } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

// Define enums for the application
// UI languages enum (i18n)
export const uiLanguageEnum = pgEnum("ui_language", ["zh", "en", "ru", "kk", "uz"]); // 中文，英文，俄文，哈萨克文，乌兹别克文

// 翻译表 - 用于存储所有语言的翻译文本
export const translations = pgTable("translations", {
  id: serial("id").primaryKey(),
  key: text("key").notNull(),
  language: text("language").notNull(),
  value: text("value").notNull(),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow()
}, (table) => {
  return {
    languageIdx: index("translations_language_idx").on(table.language),
    keyIdx: index("translations_key_idx").on(table.key),
    uniqueKeyLang: index("translations_key_language_unique_idx").on(table.key, table.language)
  };
});

// 为翻译表创建插入模式
export const insertTranslationSchema = createInsertSchema(translations).pick({
  key: true,
  language: true,
  value: true
});

export type InsertTranslation = z.infer<typeof insertTranslationSchema>;
export type Translation = typeof translations.$inferSelect;

// Repository visibility enum
export const visibilityEnum = pgEnum("visibility", ["public", "private", "internal"]);

// Programming languages enum
export const languageEnum = pgEnum("language", [
  "javascript",
  "typescript",
  "python",
  "java",
  "go",
  "rust",
  "c",
  "cpp",
  "csharp",
  "php",
  "ruby",
  "swift",
  "kotlin",
  "other"
]);

// Operation types enum (入库，出库)
export const operationTypeEnum = pgEnum("operation_type", ["inbound", "outbound"]);

// 入库单类型: 采购入库、退货入库、调拨入库、生产入库

// 出库单类型: 销售出库、退货出库、调拨出库、报废出库

// 出库单目的地类型: 客户、零售商、批发商、调拨仓库、供应商（退货）

// 用户来源类型枚举
export const userSourceEnum = pgEnum("user_source", ["local", "wechat", "whatsapp"]);

// 用户角色枚举
export const userRoleEnum = pgEnum("role", ["user", "admin", "super_admin"]);

// Users table
export const users = pgTable("users", {
  id: serial("id").primaryKey(),
  username: varchar("username", { length: 255 }).notNull().unique(),
  password: varchar("password", { length: 255 }),
  fullname: varchar("fullname", { length: 255 }).notNull(),
  avatarurl: varchar("avatarurl", { length: 255 }),
  email: varchar("email", { length: 255 }),
  phonenumber: varchar("phonenumber", { length: 50 }),
  role: userRoleEnum("role").notNull().default("user"),
  usersource: userSourceEnum("user_source").notNull().default("local"),
  // 团队关联字段
  primaryTeamId: integer("primary_team_id"), // 用户的主要团队ID，管理员可以没有主要团队
  // 社交媒体登录相关字段
  socialId: varchar("social_id", { length: 255 }), // 微信或WhatsApp的唯一ID
  socialData: text("social_data"), // 存储从社交平台获取的JSON数据
  lastLoginAt: timestamp("last_login_at"),
  isactive: boolean("isactive").default(true), // 用户是否激活
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const insertUserSchema = createInsertSchema(users).pick({
  username: true,
  password: true,
  fullname: true,
  avatarurl: true,
  email: true,
  phonenumber: true,
  role: true,
  usersource: true, // 修改为与数据库字段名一致的全小写
  primaryTeamId: true,
  socialId: true,
  socialData: true,
  isactive: true, // 与数据库字段名一致的全小写
});

export type InsertUser = z.infer<typeof insertUserSchema>;
export type User = typeof users.$inferSelect;

// 用户会话表定义 - 用于存储用户登录会话信息
export const userSessions = pgTable("user_sessions", {
  id: serial("id").primaryKey(),
  sessionId: varchar("session_id", { length: 255 }).notNull().unique(),
  userId: integer("user_id").notNull().references(() => users.id),
  ipAddress: varchar("ip_address", { length: 50 }),
  userAgent: text("user_agent"),
  isValid: boolean("is_valid").default(true),
  lastActivity: timestamp("last_activity").defaultNow(),
  expiresAt: timestamp("expires_at"),
  createdAt: timestamp("created_at").defaultNow(),
  data: json("data")
}, (table) => {
  return {
    sessionIdIdx: index("user_sessions_session_id_idx").on(table.sessionId),
    userIdIdx: index("user_sessions_user_id_idx").on(table.userId)
  };
});

export const insertUserSessionSchema = createInsertSchema(userSessions).pick({
  sessionId: true,
  userId: true,
  ipAddress: true,
  userAgent: true,
  isValid: true,
  lastActivity: true,
  expiresAt: true,
  data: true
});

export type InsertUserSession = z.infer<typeof insertUserSessionSchema>;
export type UserSession = typeof userSessions.$inferSelect;

// Repositories table
export const repositories = pgTable("repositories", {
  id: serial("id").primaryKey(),
  name: varchar("name", { length: 255 }).notNull(),
  description: text("description"),
  ownerId: integer("owner_id").notNull().references(() => users.id),
  visibility: visibilityEnum("visibility").notNull().default("public"),
  language: languageEnum("language").default("other"),
  cloneUrl: varchar("clone_url", { length: 255 }),
  branchCount: integer("branch_count").default(0),
  contributorCount: integer("contributor_count").default(0),
  viewCount: integer("view_count").default(0),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const insertRepositorySchema = createInsertSchema(repositories).pick({
  name: true,
  description: true,
  ownerId: true,
  visibility: true,
  language: true,
  cloneUrl: true,
  branchCount: true,
  contributorCount: true,
});

export type InsertRepository = z.infer<typeof insertRepositorySchema>;
export type Repository = typeof repositories.$inferSelect;

// Teams table
export const teams = pgTable("teams", {
  id: serial("id").primaryKey(),
  name: varchar("name", { length: 255 }).notNull(),
  description: text("description"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  isActive: boolean("is_active").default(true), // 团队是否激活
});

export const insertTeamSchema = createInsertSchema(teams).pick({
  name: true,
  description: true,
  isActive: true,
});

export type InsertTeam = z.infer<typeof insertTeamSchema>;
export type Team = typeof teams.$inferSelect;

// 系统页面枚举定义
export const pageNameEnum = pgEnum("page_name", [
  "dashboard", // 首页
  "warehouses", // 仓库管理
  "products", // 产品管理
  "warehouse-products", // 仓库产品
  "inbound-orders", // 入库单
  "outbound-orders", // 出库单
  "warehouse-transfers", // 仓库调拨
  "api-configurations", // API配置
  "users", // 用户管理
  "teams", // 团队管理
  "team-permissions", // 团队权限
  "settings", // 系统设置
  "new-product", // 新增商品页面
  "create-outbound-order", // 创建出库单页面
  "create-inbound-order", // 创建入库单页面
  "create-warehouse-transfer" // 创建仓库调拨单页面
]);

// 团队页面权限表
export const teamPagePermissions = pgTable("team_page_permissions", {
  id: serial("id").primaryKey(),
  teamId: integer("team_id").notNull().references(() => teams.id), // 团队ID
  pageName: pageNameEnum("page_name").notNull(), // 页面名称
  canAccess: boolean("can_access").default(false), // 是否可以访问该页面
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const insertTeamPagePermissionSchema = createInsertSchema(teamPagePermissions).pick({
  teamId: true,
  pageName: true,
  canAccess: true,
});

export type InsertTeamPagePermission = z.infer<typeof insertTeamPagePermissionSchema>;
export type TeamPagePermission = typeof teamPagePermissions.$inferSelect;

// 团队仓库权限表
export const teamWarehousePermissions = pgTable("team_warehouse_permissions", {
  id: serial("id").primaryKey(),
  teamId: integer("team_id").notNull().references(() => teams.id), // 团队ID
  warehouseId: integer("warehouse_id").notNull().references(() => warehouses.id), // 仓库ID
  canView: boolean("can_view").default(false), // 是否可以查看该仓库
  canManage: boolean("can_manage").default(false), // 是否可以管理该仓库
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const insertTeamWarehousePermissionSchema = createInsertSchema(teamWarehousePermissions).pick({
  teamId: true,
  warehouseId: true,
  canView: true,
  canManage: true,
});

export type InsertTeamWarehousePermission = z.infer<typeof insertTeamWarehousePermissionSchema>;
export type TeamWarehousePermission = typeof teamWarehousePermissions.$inferSelect;

// Team members (users in teams)
export const teamMembers = pgTable("team_members", {
  id: serial("id").primaryKey(),
  teamId: integer("team_id").notNull().references(() => teams.id),
  userId: integer("user_id").notNull().references(() => users.id),
  isAdmin: boolean("is_admin").default(false),
});

export const insertTeamMemberSchema = createInsertSchema(teamMembers).pick({
  teamId: true,
  userId: true,
  isAdmin: true,
});

export type InsertTeamMember = z.infer<typeof insertTeamMemberSchema>;
export type TeamMember = typeof teamMembers.$inferSelect;

// Team repositories
export const teamRepositories = pgTable("team_repositories", {
  id: serial("id").primaryKey(),
  teamId: integer("team_id").notNull().references(() => teams.id),
  repositoryId: integer("repository_id").notNull().references(() => repositories.id),
});

export const insertTeamRepositorySchema = createInsertSchema(teamRepositories).pick({
  teamId: true,
  repositoryId: true,
});

export type InsertTeamRepository = z.infer<typeof insertTeamRepositorySchema>;
export type TeamRepository = typeof teamRepositories.$inferSelect;

// Activity table to track repository events
export const activitiesTypeEnum = pgEnum("activity_type", [
  "commit",
  "branch",
  "pull_request",
  "comment",
  "issue",
  "release",
  "fork",
  "star",
  "update",
  "other"
]);

export const activities = pgTable("activities", {
  id: serial("id").primaryKey(),
  repositoryId: integer("repository_id").notNull().references(() => repositories.id),
  userId: integer("user_id").notNull().references(() => users.id),
  type: activitiesTypeEnum("type").notNull(),
  summary: varchar("summary", { length: 255 }).notNull(),
  details: text("details"),
  branch: varchar("branch", { length: 255 }),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const insertActivitySchema = createInsertSchema(activities).pick({
  repositoryId: true,
  userId: true,
  type: true,
  summary: true,
  details: true,
  branch: true,
});

export type InsertActivity = z.infer<typeof insertActivitySchema>;
export type Activity = typeof activities.$inferSelect;

// 仓库管理系统的数据模型开始

// 产品表
export const products = pgTable("products", {
  id: serial("id").primaryKey(), // 商品ID
  name: varchar("name", { length: 255 }).notNull(), // 商品名称
  // 数据库中缺少以下字段，临时添加了默认值以使代码兼容
  description: text("description").default(""), // 商品描述（数据库中不存在）
  barcode: varchar("barcode", { length: 255 }).notNull().unique(), // 条码
  uniqueCode: varchar("unique_code", { length: 255 }), // 唯一码，用于与电商平台匹配
  category: varchar("category", { length: 100 }).default(""), // 商品类别（数据库中不存在）
  stock: integer("stock").notNull().default(0), // 库存数量（数据库中不存在）
  price: decimal("price", { precision: 10, scale: 2 }).notNull().default("0"), // 售价（数据库中不存在）
  cost: decimal("cost", { precision: 10, scale: 2 }).notNull().default("0"), // 成本（数据库中不存在）
  singleLengthCm: decimal("single_length_cm", { precision: 10, scale: 2 }).notNull(), // 单件尺寸（长CM）
  singleWidthCm: decimal("single_width_cm", { precision: 10, scale: 2 }).notNull(), // 单件尺寸（宽CM）
  singleHeightCm: decimal("single_height_cm", { precision: 10, scale: 2 }).notNull(), // 单件尺寸（高CM）
  singleVolumeM3: decimal("single_volume_m3", { precision: 10, scale: 6 }).notNull(), // 单件立方（M3）
  singleWeightKg: decimal("single_weight_kg", { precision: 10, scale: 3 }).notNull(), // 单件重量（kg）
  bulkQuantity: integer("bulk_quantity").notNull().default(1), // 整件包装内产品数量（数据库中不存在）
  bulkWidthCm: decimal("bulk_width_cm", { precision: 10, scale: 2 }).notNull(), // 整件尺寸（宽CM）
  bulkLengthCm: decimal("bulk_length_cm", { precision: 10, scale: 2 }).notNull(), // 整件尺寸（长CM）
  bulkHeightCm: decimal("bulk_height_cm", { precision: 10, scale: 2 }).notNull(), // 整件尺寸（高CM）
  bulkWeightKg: decimal("bulk_weight_kg", { precision: 10, scale: 3 }).notNull(), // 整件重量（kg）
  bulkVolumeM3: decimal("bulk_volume_m3", { precision: 10, scale: 6 }).notNull(), // 整件立方（M3）
  createdAt: timestamp("created_at").defaultNow(), // 创建时间
  updatedAt: timestamp("updated_at").defaultNow(), // 更新时间
});

export const insertProductSchema = createInsertSchema(products).pick({
  name: true,
  description: true,
  barcode: true,
  uniqueCode: true,
  category: true,
  stock: true,
  price: true,
  cost: true,
  singleLengthCm: true,
  singleWidthCm: true,
  singleHeightCm: true,
  singleVolumeM3: true,
  singleWeightKg: true,
  bulkQuantity: true,
  bulkWidthCm: true,
  bulkLengthCm: true,
  bulkHeightCm: true,
  bulkWeightKg: true,
  bulkVolumeM3: true,
});

export type InsertProduct = z.infer<typeof insertProductSchema>;
export type Product = typeof products.$inferSelect;

// 操作类型枚举已在前面定义 (入库，出库)

// 订单类型枚举 (采购、退货、调拨、生产、销售、报废)
export const orderTypeEnum = pgEnum("order_type", ["purchase", "return", "transfer", "production", "sale", "scrap"]);

// 目的地类型枚举 (客户、零售商、批发商、调拨仓库、供应商)
export const destinationTypeEnum = pgEnum("destination_type", ["customer", "retail", "wholesale", "transfer", "supplier"]);

// 匹配方式枚举 (手动、自动、模糊)
export const matchMethodEnum = pgEnum("match_method", ["manual", "auto", "fuzzy"]);

// 仓库
export const warehouses = pgTable("warehouses", {
  id: serial("id").primaryKey(),
  name: varchar("name", { length: 255 }).notNull(), // 仓库名称
  location: varchar("location", { length: 255 }).notNull(), // 仓库地址
  capacity: decimal("capacity", { precision: 10, scale: 2 }).notNull(), // 容量
  createdAt: timestamp("created_at").defaultNow().notNull(), // 创建时间
});

export const insertWarehouseSchema = createInsertSchema(warehouses).pick({
  name: true,
  location: true,
  capacity: true,
});

export type InsertWarehouse = z.infer<typeof insertWarehouseSchema>;
export type Warehouse = typeof warehouses.$inferSelect;

// 入库单
export const inboundOrders = pgTable("inbound_orders", (table) => {
  return {
    id: serial("id").primaryKey(),
    orderNumber: varchar("order_number", { length: 255 }).notNull().unique(), // 入库单号
    warehouseId: integer("warehouse_id").notNull().references(() => warehouses.id), // 仓库ID
    totalWeight: decimal("total_weight", { precision: 10, scale: 3 }).notNull(), // 总重量
    totalVolume: decimal("total_volume", { precision: 10, scale: 6 }).notNull(), // 总体积
    createdBy: integer("created_by").notNull().references(() => users.id), // 创建人
    createdAt: timestamp("created_at").defaultNow().notNull(), // 创建时间
    status: varchar("status", { length: 50 }).notNull().default("pending"), // 状态：待处理、已完成、已取消
    orderType: orderTypeEnum("order_type").default("purchase"), // 入库单类型：采购入库、退货入库、调拨入库、生产入库
    notes: text("notes") // 备注
  };
});

export const insertInboundOrderSchema = createInsertSchema(inboundOrders).pick({
  orderNumber: true,
  warehouseId: true,
  totalWeight: true,
  totalVolume: true,
  createdBy: true,
  status: true,
  orderType: true,
  notes: true,
}).omit({ createdBy: true }).extend({ 
  createdBy: z.number().optional() 
});

export type InsertInboundOrder = z.infer<typeof insertInboundOrderSchema>;
export type InboundOrder = typeof inboundOrders.$inferSelect;

// 入库单明细
export const inboundOrderItems = pgTable("inbound_order_items", {
  id: serial("id").primaryKey(),
  inboundOrderId: integer("inbound_order_id").notNull().references(() => inboundOrders.id), // 入库单ID
  productId: integer("product_id").notNull().references(() => products.id), // 商品ID
  productName: varchar("product_name", { length: 255 }).notNull(), // 商品名称
  barcode: varchar("barcode", { length: 255 }).notNull(), // 条形码
  uniqueCode: varchar("unique_code", { length: 50 }), // 唯一码
  externalOrderNumber: varchar("external_order_number", { length: 255 }), // 外部订单号
  quantity: integer("quantity").notNull(), // 数量
  packageCount: integer("package_count").notNull(), // 件数
  weight: decimal("weight", { precision: 10, scale: 3 }).notNull(), // 重量
  volume: decimal("volume", { precision: 10, scale: 6 }).notNull(), // 体积
  remark: text("remark"), // 备注
});

export const insertInboundOrderItemSchema = createInsertSchema(inboundOrderItems).pick({
  inboundOrderId: true,
  productId: true,
  productName: true,
  barcode: true,
  uniqueCode: true,
  externalOrderNumber: true,
  quantity: true,
  packageCount: true,
  weight: true,
  volume: true,
  remark: true,
});

export type InsertInboundOrderItem = z.infer<typeof insertInboundOrderItemSchema>;
export type InboundOrderItem = typeof inboundOrderItems.$inferSelect;

// 出库单
export const outboundOrders = pgTable("outbound_orders", (table) => {
  return {
    id: serial("id").primaryKey(),
    orderNumber: varchar("order_number", { length: 255 }).notNull().unique(), // 出库单号
    warehouseId: integer("warehouse_id").notNull().references(() => warehouses.id), // 仓库ID
    totalWeight: decimal("total_weight", { precision: 10, scale: 3 }).notNull(), // 总重量
    totalVolume: decimal("total_volume", { precision: 10, scale: 6 }).notNull(), // 总体积
    createdBy: integer("created_by").notNull().references(() => users.id), // 创建人
    createdAt: timestamp("created_at").defaultNow().notNull(), // 创建时间
    status: varchar("status", { length: 50 }).notNull().default("pending"), // 状态：待处理、已完成、已取消
    orderType: orderTypeEnum("order_type").default("sale"), // 出库单类型：销售出库、退货出库、调拨出库、报废出库
    destinationType: destinationTypeEnum("destination_type").default("customer"), // 目的地类型：客户、零售商、批发商、调拨仓库、供应商
    notes: text("notes") // 备注
  };
});

export const insertOutboundOrderSchema = createInsertSchema(outboundOrders).pick({
  orderNumber: true,
  warehouseId: true,
  totalWeight: true,
  totalVolume: true,
  createdBy: true,
  status: true,
  orderType: true,
  destinationType: true,
  notes: true,
}).omit({ createdBy: true }).extend({ 
  createdBy: z.number().optional() 
});

export type InsertOutboundOrder = z.infer<typeof insertOutboundOrderSchema>;
export type OutboundOrder = typeof outboundOrders.$inferSelect;

// 出库单明细
export const outboundOrderItems = pgTable("outbound_order_items", {
  id: serial("id").primaryKey(),
  outboundOrderId: integer("outbound_order_id").notNull().references(() => outboundOrders.id), // 出库单ID
  productId: integer("product_id").notNull().references(() => products.id), // 商品ID
  productName: varchar("product_name", { length: 255 }).notNull(), // 商品名称
  barcode: varchar("barcode", { length: 255 }).notNull(), // 条形码
  uniqueCode: varchar("unique_code", { length: 50 }), // 唯一码
  externalOrderNumber: varchar("external_order_number", { length: 255 }), // 外部订单号
  quantity: integer("quantity").notNull(), // 数量
  packageCount: integer("package_count").notNull(), // 件数
  weight: decimal("weight", { precision: 10, scale: 3 }).notNull(), // 重量
  volume: decimal("volume", { precision: 10, scale: 6 }).notNull(), // 体积
  remark: text("remark"), // 备注
});

export const insertOutboundOrderItemSchema = createInsertSchema(outboundOrderItems).pick({
  outboundOrderId: true,
  productId: true,
  productName: true,
  barcode: true,
  uniqueCode: true,
  externalOrderNumber: true,
  quantity: true,
  packageCount: true,
  weight: true,
  volume: true,
  remark: true,
});

export type InsertOutboundOrderItem = z.infer<typeof insertOutboundOrderItemSchema>;
export type OutboundOrderItem = typeof outboundOrderItems.$inferSelect;

// 电商平台产品表
export const ecommerceProducts = pgTable("ecommerce_products", {
  id: serial("id").primaryKey(), // 电商平台上的产品ID
  platformCode: varchar("platform_code", { length: 255 }).notNull(), // 电商平台上的产品编码
  platformName: varchar("platform_name", { length: 255 }).notNull(), // 电商平台上的产品名称
  platformCategory: varchar("platform_category", { length: 255 }), // 电商平台上的产品分类
  price: decimal("price", { precision: 10, scale: 2 }), // 价格
  stock: integer("stock"), // 库存
  matchedCode: varchar("matched_code", { length: 255 }).notNull(), // 匹配后的编码
  matchedProductId: integer("matched_product_id").references(() => products.id), // 匹配的系统产品ID
  lastUpdated: timestamp("last_updated").defaultNow().notNull(), // 最后更新时间
  platformSource: varchar("platform_source", { length: 50 }).notNull(), // 来源平台
  additionalInfo: text("additional_info"), // 额外信息（JSON格式）
});

export const insertEcommerceProductSchema = createInsertSchema(ecommerceProducts).pick({
  platformCode: true,
  platformName: true,
  platformCategory: true,
  price: true,
  stock: true,
  matchedCode: true,
  matchedProductId: true,
  platformSource: true,
  additionalInfo: true,
});

export type InsertEcommerceProduct = z.infer<typeof insertEcommerceProductSchema>;
export type EcommerceProduct = typeof ecommerceProducts.$inferSelect;

// API集成配置表
export const apiConfigurations = pgTable("api_configurations", {
  id: serial("id").primaryKey(),
  name: varchar("name", { length: 255 }).notNull(), // 配置名称
  platformType: varchar("platform_type", { length: 50 }).notNull(), // 平台类型 (Kaspi/Ozon/WB/Uzum)
  storeName: varchar("store_name", { length: 255 }).notNull(), // 店铺名称
  apiKey: varchar("api_key", { length: 255 }), // API密钥
  apiSecret: varchar("api_secret", { length: 255 }), // API密钥
  apiEndpoint: varchar("api_endpoint", { length: 255 }).notNull(), // API端点
  isActive: boolean("is_active").default(true), // 是否激活
  lastSyncTime: timestamp("last_sync_time"), // 最后同步时间
  teamId: integer("team_id").references(() => teams.id), // 关联的团队ID
  warehouseId: integer("warehouse_id").references(() => warehouses.id), // 关联的仓库ID
  createdAt: timestamp("created_at").defaultNow().notNull(), // 创建时间
  updatedAt: timestamp("updated_at").defaultNow().notNull(), // 更新时间
  config: text("config"), // 其他配置（JSON格式）
});

export const insertApiConfigurationSchema = createInsertSchema(apiConfigurations).pick({
  name: true,
  platformType: true,
  storeName: true,
  apiKey: true,
  apiSecret: true,
  apiEndpoint: true,
  isActive: true,
  teamId: true,
  warehouseId: true,
  config: true,
});

export type InsertApiConfiguration = z.infer<typeof insertApiConfigurationSchema>;
export type ApiConfiguration = typeof apiConfigurations.$inferSelect;

// 平台订单状态枚举
export const platformOrderStatusEnum = pgEnum("platform_order_status", [
  "new", // 新订单
  "processing", // 处理中
  "shipped", // 已发货
  "delivered", // 已送达
  "cancelled", // 已取消
  "returned" // 已退回
]);

// 平台订单表 - 保存从各电商平台API获取的原始订单数据
export const platformOrders = pgTable("platform_orders", {
  id: serial("id").primaryKey(),
  platformId: varchar("platform_id", { length: 255 }).notNull(), // 平台订单ID
  platformType: varchar("platform_type", { length: 50 }).notNull(), // 平台类型 (Kaspi/Ozon/WB/Uzum)
  apiConfigId: integer("api_config_id").notNull().references(() => apiConfigurations.id), // API配置ID
  orderDate: timestamp("order_date").notNull(), // 订单日期
  customerName: varchar("customer_name", { length: 255 }), // 客户名称
  customerPhone: varchar("customer_phone", { length: 50 }), // 客户电话
  deliveryAddress: text("delivery_address"), // 送货地址
  orderStatus: platformOrderStatusEnum("new"), // 订单状态, 默认为"new"
  totalAmount: decimal("total_amount", { precision: 10, scale: 2 }).notNull(), // 订单总金额
  paymentMethod: varchar("payment_method", { length: 50 }), // 支付方式
  rawData: text("raw_data"), // 原始订单数据（JSON格式）
  processedAt: timestamp("processed_at"), // 处理日期（生成出入库单的日期）
  outboundOrderId: integer("outbound_order_id").references(() => outboundOrders.id), // 关联的出库单ID
  createdAt: timestamp("created_at").defaultNow().notNull(), // 创建时间（数据同步时间）
  updatedAt: timestamp("updated_at").defaultNow().notNull(), // 更新时间
});

export const insertPlatformOrderSchema = createInsertSchema(platformOrders).pick({
  platformId: true,
  platformType: true,
  apiConfigId: true,
  orderDate: true,
  customerName: true,
  customerPhone: true,
  deliveryAddress: true,
  orderStatus: true,
  totalAmount: true,
  paymentMethod: true,
  rawData: true,
  processedAt: true,
  outboundOrderId: true,
});

export type InsertPlatformOrder = z.infer<typeof insertPlatformOrderSchema>;
export type PlatformOrder = typeof platformOrders.$inferSelect;

// 平台订单项目表 - 保存订单明细
export const platformOrderItems = pgTable("platform_order_items", {
  id: serial("id").primaryKey(),
  platformOrderId: integer("platform_order_id").notNull().references(() => platformOrders.id), // 平台订单ID
  platformItemId: varchar("platform_item_id", { length: 255 }), // 平台订单项目ID
  platformProductId: varchar("platform_product_id", { length: 255 }).notNull(), // 平台商品ID
  platformProductCode: varchar("platform_product_code", { length: 255 }).notNull(), // 平台商品编码
  platformProductName: varchar("platform_product_name", { length: 255 }).notNull(), // 平台商品名称
  matchedCode: varchar("matched_code", { length: 255 }).notNull(), // 匹配后的编码
  matchedProductId: integer("matched_product_id").references(() => products.id), // 匹配的系统产品ID
  quantity: integer("quantity").notNull(), // 数量
  unitPrice: decimal("unit_price", { precision: 10, scale: 2 }).notNull(), // 单价
  totalPrice: decimal("total_price", { precision: 10, scale: 2 }).notNull(), // 总价
  hasBeenProcessed: boolean("has_been_processed").default(false), // 是否已处理
  rawData: text("raw_data"), // 原始项目数据（JSON格式）
  createdAt: timestamp("created_at").defaultNow().notNull(), // 创建时间
});

export const insertPlatformOrderItemSchema = createInsertSchema(platformOrderItems).pick({
  platformOrderId: true,
  platformItemId: true,
  platformProductId: true,
  platformProductCode: true,
  platformProductName: true,
  matchedCode: true,
  matchedProductId: true,
  quantity: true,
  unitPrice: true,
  totalPrice: true,
  hasBeenProcessed: true,
  rawData: true,
});

export type InsertPlatformOrderItem = z.infer<typeof insertPlatformOrderItemSchema>;
export type PlatformOrderItem = typeof platformOrderItems.$inferSelect;

// 商品匹配规则表 - 保存手动匹配的规则
export const productMatchingRules = pgTable("product_matching_rules", {
  id: serial("id").primaryKey(),
  platformType: varchar("platform_type", { length: 50 }).notNull(), // 平台类型 (Kaspi/Ozon/WB/Uzum)
  platformProductCode: varchar("platform_product_code", { length: 255 }).notNull(), // 平台商品编码
  platformProductId: varchar("platform_product_id", { length: 255 }), // 平台商品ID（可选）
  platformProductName: varchar("platform_product_name", { length: 255 }), // 平台商品名称（可选）
  matchedCode: varchar("matched_code", { length: 255 }).notNull(), // 匹配后的编码
  matchedProductId: integer("matched_product_id").notNull().references(() => products.id), // 匹配的系统产品ID
  confidence: decimal("confidence", { precision: 5, scale: 2 }).default("1.00"), // 匹配置信度，默认100%
  apiConfigId: integer("api_config_id").references(() => apiConfigurations.id), // 关联的API配置（店铺）
  matchMethod: matchMethodEnum("manual"), // 匹配方式：手动/自动/模糊
  lastUsedAt: timestamp("last_used_at"), // 上次使用时间
  createdBy: integer("created_by").notNull().references(() => users.id), // 创建人
  createdAt: timestamp("created_at").defaultNow().notNull(), // 创建时间
  updatedAt: timestamp("updated_at").defaultNow().notNull(), // 更新时间
  isActive: boolean("is_active").default(true), // 是否有效
}, (table) => {
  return {
    // 不再使用唯一索引，允许同一个平台商品代码匹配到多个系统商品
    platformCodeIdx: index("platform_code_idx").on(table.platformType, table.platformProductCode),
    matchedProductIdx: index("matched_product_idx").on(table.matchedProductId),
  };
});

export const insertProductMatchingRuleSchema = createInsertSchema(productMatchingRules).pick({
  platformType: true,
  platformProductCode: true,
  platformProductId: true,
  platformProductName: true,
  matchedCode: true,
  matchedProductId: true,
  confidence: true,
  apiConfigId: true,
  matchMethod: true,
  lastUsedAt: true,
  createdBy: true,
  isActive: true,
});

export type InsertProductMatchingRule = z.infer<typeof insertProductMatchingRuleSchema>;
export type ProductMatchingRule = typeof productMatchingRules.$inferSelect;

// 预审核订单状态枚举
export const preAuditOrderStatusEnum = pgEnum("pre_audit_order_status", [
  "draft", // 草稿
  "pending", // 待审核
  "approved", // 已审核
  "rejected" // 已拒绝
]);

// 预审核出入库单表 - 保存等待审核的出入库单信息
export const preAuditOrders = pgTable("pre_audit_orders", {
  id: serial("id").primaryKey(),
  orderNumber: varchar("order_number", { length: 255 }).notNull().unique(), // 预生成单号
  orderType: operationTypeEnum("inbound"), // 单据类型: 入库/出库 默认为入库
  platformType: varchar("platform_type", { length: 50 }).notNull(), // 平台类型
  storeName: varchar("store_name", { length: 255 }).notNull(), // 店铺名称
  warehouseId: integer("warehouse_id").notNull().references(() => warehouses.id), // 仓库ID
  orderDate: timestamp("order_date").notNull(), // 订单日期
  status: preAuditOrderStatusEnum("pending"), // 状态: 待审核/已审核/已拒绝
  createdBy: integer("created_by").notNull().references(() => users.id), // 创建人
  approvedBy: integer("approved_by").references(() => users.id), // 审核人
  approvedAt: timestamp("approved_at"), // 审核时间
  teamId: integer("team_id").references(() => teams.id), // 关联的团队ID
  totalItems: integer("total_items").notNull(), // 商品总数量
  totalUnmatchedItems: integer("total_unmatched_items").notNull(), // 未匹配商品数量
  resultOrderId: integer("result_order_id"), // 最终生成的出入库单ID
  createdAt: timestamp("created_at").defaultNow().notNull(), // 创建时间
  updatedAt: timestamp("updated_at").defaultNow().notNull(), // 更新时间
  notes: text("notes"), // 备注
});

export const insertPreAuditOrderSchema = createInsertSchema(preAuditOrders).pick({
  orderNumber: true,
  orderType: true,
  platformType: true,
  storeName: true,
  warehouseId: true,
  orderDate: true,
  status: true,
  createdBy: true,
  approvedBy: true,
  approvedAt: true,
  teamId: true,
  totalItems: true,
  totalUnmatchedItems: true,
  resultOrderId: true,
  notes: true,
});

export type InsertPreAuditOrder = z.infer<typeof insertPreAuditOrderSchema>;
export type PreAuditOrder = typeof preAuditOrders.$inferSelect;

// 预审核出入库单明细表
export const preAuditOrderItems = pgTable("pre_audit_order_items", {
  id: serial("id").primaryKey(),
  preAuditOrderId: integer("pre_audit_order_id").notNull().references(() => preAuditOrders.id), // 预审核单ID
  platformProductCode: varchar("platform_product_code", { length: 255 }).notNull(), // 平台商品编码
  platformProductName: varchar("platform_product_name", { length: 255 }).notNull(), // 平台商品名称
  matchedCode: varchar("matched_code", { length: 255 }), // 匹配后的编码
  matchedProductId: integer("matched_product_id").references(() => products.id), // 匹配的系统产品ID
  quantity: integer("quantity").notNull(), // 数量
  packageCount: integer("package_count").notNull().default(1), // 件数
  isMatched: boolean("is_matched").default(false), // 是否已匹配
  matchedBy: integer("matched_by").references(() => users.id), // 匹配人
  matchedAt: timestamp("matched_at"), // 匹配时间
  createdAt: timestamp("created_at").defaultNow().notNull(), // 创建时间
  updatedAt: timestamp("updated_at").defaultNow().notNull(), // 更新时间
  notes: text("notes"), // 备注
});

export const insertPreAuditOrderItemSchema = createInsertSchema(preAuditOrderItems).pick({
  preAuditOrderId: true,
  platformProductCode: true,
  platformProductName: true,
  matchedCode: true,
  matchedProductId: true,
  quantity: true,
  packageCount: true,
  isMatched: true,
  matchedBy: true,
  matchedAt: true,
  notes: true,
});

export type InsertPreAuditOrderItem = z.infer<typeof insertPreAuditOrderItemSchema>;
export type PreAuditOrderItem = typeof preAuditOrderItems.$inferSelect;

// 仓库调拨单表
export const warehouseTransfers = pgTable("warehouse_transfers", {
  id: serial("id").primaryKey(),
  referenceNumber: varchar("reference_number", { length: 50 }).notNull().unique(), // 调拨单号
  sourceWarehouseId: integer("source_warehouse_id").notNull().references(() => warehouses.id), // 源仓库ID
  targetWarehouseId: integer("target_warehouse_id").notNull().references(() => warehouses.id), // 目标仓库ID
  totalItems: integer("total_items").notNull().default(0), // 总商品数量
  totalPackages: integer("total_packages").notNull().default(0), // 总件数
  totalWeight: decimal("total_weight", { precision: 10, scale: 3 }).notNull(), // 总重量
  totalVolume: decimal("total_volume", { precision: 10, scale: 6 }).notNull(), // 总体积
  status: varchar("status", { length: 50 }).notNull().default("pending"), // 状态：待处理、处理中、已完成、已取消
  createdBy: integer("created_by").notNull().references(() => users.id), // 创建人
  createdAt: timestamp("created_at").defaultNow().notNull(), // 创建时间
  completedAt: timestamp("completed_at"), // 完成时间
  outboundOrderId: integer("outbound_order_id").references(() => outboundOrders.id), // 出库单ID
  inboundOrderId: integer("inbound_order_id").references(() => inboundOrders.id), // 入库单ID
  notes: text("notes"), // 备注
  documentFilePath: varchar("document_file_path", { length: 255 }), // 底单文件路径
  documentFileName: varchar("document_file_name", { length: 255 }), // 底单文件名称
  documentFileType: varchar("document_file_type", { length: 50 }), // 底单文件类型
  documentUploadedAt: timestamp("document_uploaded_at"), // 底单上传时间
});

export const insertWarehouseTransferSchema = createInsertSchema(warehouseTransfers).pick({
  referenceNumber: true,
  sourceWarehouseId: true,
  targetWarehouseId: true,
  totalItems: true,
  totalPackages: true,
  totalWeight: true,
  totalVolume: true,
  status: true,
  createdBy: true,
  notes: true,
  documentFilePath: true,
  documentFileName: true,
  documentFileType: true,
  documentUploadedAt: true,
}).omit({ createdBy: true }).extend({ 
  createdBy: z.number().optional(),
  documentFile: z.instanceof(File).optional(), // 客户端文件对象
  items: z.array(z.object({
    productId: z.string(),
    uniqueCode: z.string().optional(),
    quantity: z.string(),
    packageCount: z.string(),
    weight: z.string(),
    volume: z.string(),
  }))
});

export type InsertWarehouseTransfer = z.infer<typeof insertWarehouseTransferSchema>;
export type WarehouseTransfer = typeof warehouseTransfers.$inferSelect;

// 仓库调拨单明细表
export const warehouseTransferItems = pgTable("warehouse_transfer_items", {
  id: serial("id").primaryKey(),
  transferId: integer("transfer_id").notNull().references(() => warehouseTransfers.id), // 调拨单ID
  productId: integer("product_id").notNull().references(() => products.id), // 商品ID
  uniqueCode: varchar("unique_code", { length: 50 }), // 唯一码
  quantity: integer("quantity").notNull(), // 数量
  packageCount: integer("package_count").notNull(), // 件数
  weight: decimal("weight", { precision: 10, scale: 3 }).notNull(), // 重量
  volume: decimal("volume", { precision: 10, scale: 6 }).notNull(), // 体积
  // status字段在数据库表中不存在，已移除
  remark: text("remark"), // 备注
});

export const insertWarehouseTransferItemSchema = createInsertSchema(warehouseTransferItems).pick({
  transferId: true,
  productId: true,
  uniqueCode: true,
  quantity: true,
  packageCount: true,
  weight: true,
  volume: true,
  // status字段在数据库表中不存在，已移除
  remark: true,
});

export type InsertWarehouseTransferItem = z.infer<typeof insertWarehouseTransferItemSchema>;
export type WarehouseTransferItem = typeof warehouseTransferItems.$inferSelect;

// 唯一码跟踪表
export const uniqueCodeTracking = pgTable("unique_code_tracking", {
  id: serial("id").primaryKey(),
  uniqueCode: varchar("unique_code", { length: 50 }).notNull().unique(), // 唯一码
  productId: integer("product_id").notNull().references(() => products.id), // 商品ID
  warehouseId: integer("warehouse_id").notNull().references(() => warehouses.id), // 仓库ID
  currentStatus: pgEnum("current_status", [
    "in_stock", "transferred", "sold", "returned", "scrapped"
  ])("in_stock"), // 当前状态
  quantity: integer("quantity").notNull().default(1), // 数量
  inboundOrderId: integer("inbound_order_id").references(() => inboundOrders.id), // 入库单ID
  inboundItemId: integer("inbound_item_id"), // 入库单明细ID
  outboundOrderId: integer("outbound_order_id").references(() => outboundOrders.id), // 出库单ID
  outboundItemId: integer("outbound_item_id"), // 出库单明细ID
  transferId: integer("transfer_id").references(() => warehouseTransfers.id), // 调拨单ID
  transferItemId: integer("transfer_item_id"), // 调拨单明细ID
  lastOperationType: pgEnum("last_operation_type", [
    "inbound", "outbound", "transfer", "adjust"
  ])("inbound"), // 最后操作类型
  lastOperationDate: timestamp("last_operation_date").notNull().defaultNow(), // 最后操作日期
  remark: text("remark"), // 备注
  createdAt: timestamp("created_at").notNull().defaultNow(), // 创建时间
  updatedAt: timestamp("updated_at").notNull().defaultNow(), // 更新时间
});

export const insertUniqueCodeTrackingSchema = createInsertSchema(uniqueCodeTracking).pick({
  uniqueCode: true,
  productId: true,
  warehouseId: true,
  currentStatus: true,
  quantity: true,
  inboundOrderId: true,
  inboundItemId: true,
  outboundOrderId: true,
  outboundItemId: true,
  transferId: true,
  transferItemId: true,
  lastOperationType: true,
  lastOperationDate: true,
  remark: true,
});

export type InsertUniqueCodeTracking = z.infer<typeof insertUniqueCodeTrackingSchema>;
export type UniqueCodeTracking = typeof uniqueCodeTracking.$inferSelect;

// 操作类型枚举
export const operationTypeHistoryEnum = pgEnum("operation_type", [
  "inbound", "outbound", "transfer_in", "transfer_out", "adjust"
]);

// 状态枚举
export const statusHistoryEnum = pgEnum("status_history", [
  "in_stock", "transferred", "sold", "returned", "scrapped"
]);

// 唯一码流转历史表
export const uniqueCodeHistory = pgTable("unique_code_history", {
  id: serial("id").primaryKey(),
  uniqueCode: varchar("unique_code", { length: 50 }).notNull(), // 唯一码
  productId: integer("product_id").notNull().references(() => products.id), // 商品ID
  warehouseId: integer("warehouse_id").notNull().references(() => warehouses.id), // 仓库ID
  operationType: operationTypeHistoryEnum("operation_type").notNull(), // 操作类型
  quantity: integer("quantity").notNull().default(1), // 数量
  orderId: integer("order_id"), // 单据ID
  orderItemId: integer("order_item_id"), // 单据明细ID
  transferId: integer("transfer_id"), // 调拨单ID
  transferItemId: integer("transfer_item_id"), // 调拨单明细ID
  oldStatus: statusHistoryEnum("old_status"), // 旧状态
  newStatus: statusHistoryEnum("new_status").notNull(), // 新状态
  operationDate: timestamp("operation_date").notNull().defaultNow(), // 操作日期
  userId: integer("user_id").references(() => users.id), // 操作用户ID
  remark: text("remark"), // 备注
});

export const insertUniqueCodeHistorySchema = createInsertSchema(uniqueCodeHistory).pick({
  uniqueCode: true,
  productId: true,
  warehouseId: true,
  operationType: true,
  quantity: true,
  orderId: true,
  orderItemId: true,
  transferId: true,
  transferItemId: true,
  oldStatus: true,
  newStatus: true,
  operationDate: true,
  userId: true,
  remark: true,
});

export type InsertUniqueCodeHistory = z.infer<typeof insertUniqueCodeHistorySchema>;
export type UniqueCodeHistory = typeof uniqueCodeHistory.$inferSelect;

