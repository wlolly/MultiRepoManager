import { mysqlTable, int, varchar, boolean, timestamp, mysqlEnum, decimal, text } from "drizzle-orm/mysql-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

// Define enums for the application
// UI languages enum (i18n)
export const uiLanguageEnum = mysqlEnum("ui_language", ["zh", "en", "ru", "kk", "uz"]); // 中文，英文，俄文，哈萨克文，乌兹别克文

// Repository visibility enum
export const visibilityEnum = mysqlEnum("visibility", ["public", "private", "internal"]);

// Programming languages enum
export const languageEnum = mysqlEnum("language", [
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
export const operationTypeEnum = mysqlEnum("operation_type", ["inbound", "outbound"]);

// Users table
export const users = mysqlTable("users", {
  id: int("id").primaryKey().autoincrement(),
  username: varchar("username", { length: 255 }).notNull().unique(),
  password: varchar("password", { length: 255 }).notNull(),
  fullName: varchar("full_name", { length: 255 }).notNull(),
  avatarUrl: varchar("avatar_url", { length: 255 }),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const insertUserSchema = createInsertSchema(users).pick({
  username: true,
  password: true,
  fullName: true,
  avatarUrl: true,
});

export type InsertUser = z.infer<typeof insertUserSchema>;
export type User = typeof users.$inferSelect;

// Repositories table
export const repositories = mysqlTable("repositories", {
  id: int("id").primaryKey().autoincrement(),
  name: varchar("name", { length: 255 }).notNull(),
  description: text("description"),
  ownerId: int("owner_id").notNull().references(() => users.id),
  visibility: mysqlEnum("visibility", ["public", "private", "internal"]).notNull().default("public"),
  language: mysqlEnum("language", ["javascript", "typescript", "python", "java", "go", "rust", "c", "cpp", "csharp", "php", "ruby", "swift", "kotlin", "other"]).default("other"),
  cloneUrl: varchar("clone_url", { length: 255 }),
  branchCount: int("branch_count").default(0),
  contributorCount: int("contributor_count").default(0),
  viewCount: int("view_count").default(0),
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
export const teams = mysqlTable("teams", {
  id: int("id").primaryKey().autoincrement(),
  name: varchar("name", { length: 255 }).notNull(),
  description: text("description"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const insertTeamSchema = createInsertSchema(teams).pick({
  name: true,
  description: true,
});

export type InsertTeam = z.infer<typeof insertTeamSchema>;
export type Team = typeof teams.$inferSelect;

// Team members (users in teams)
export const teamMembers = mysqlTable("team_members", {
  id: int("id").primaryKey().autoincrement(),
  teamId: int("team_id").notNull().references(() => teams.id),
  userId: int("user_id").notNull().references(() => users.id),
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
export const teamRepositories = mysqlTable("team_repositories", {
  id: int("id").primaryKey().autoincrement(),
  teamId: int("team_id").notNull().references(() => teams.id),
  repositoryId: int("repository_id").notNull().references(() => repositories.id),
});

export const insertTeamRepositorySchema = createInsertSchema(teamRepositories).pick({
  teamId: true,
  repositoryId: true,
});

export type InsertTeamRepository = z.infer<typeof insertTeamRepositorySchema>;
export type TeamRepository = typeof teamRepositories.$inferSelect;

// Activity table to track repository events
export const activities = mysqlTable("activities", {
  id: int("id").primaryKey().autoincrement(),
  repositoryId: int("repository_id").notNull().references(() => repositories.id),
  userId: int("user_id").notNull().references(() => users.id),
  type: mysqlEnum("type", [
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
  ]).notNull(),
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
export const products = mysqlTable("products", {
  id: int("id").primaryKey().autoincrement(), // 商品ID
  name: varchar("name", { length: 255 }).notNull(), // 商品名称
  barcode: varchar("barcode", { length: 255 }).notNull().unique(), // 条码
  singleLengthCm: decimal("single_length_cm", { precision: 10, scale: 2 }).notNull(), // 单件尺寸（长CM）
  singleWidthCm: decimal("single_width_cm", { precision: 10, scale: 2 }).notNull(), // 单件尺寸（宽CM）
  singleHeightCm: decimal("single_height_cm", { precision: 10, scale: 2 }).notNull(), // 单件尺寸（高CM）
  singleVolumeM3: decimal("single_volume_m3", { precision: 10, scale: 6 }).notNull(), // 单件立方（M3）
  singleWeightKg: decimal("single_weight_kg", { precision: 10, scale: 3 }).notNull(), // 单件重量（kg）
  bulkWidthCm: decimal("bulk_width_cm", { precision: 10, scale: 2 }).notNull(), // 整件尺寸（宽CM）
  bulkLengthCm: decimal("bulk_length_cm", { precision: 10, scale: 2 }).notNull(), // 整件尺寸（长CM）
  bulkHeightCm: decimal("bulk_height_cm", { precision: 10, scale: 2 }).notNull(), // 整件尺寸（高CM）
  bulkWeightKg: decimal("bulk_weight_kg", { precision: 10, scale: 3 }).notNull(), // 整件重量（kg）
  bulkVolumeM3: decimal("bulk_volume_m3", { precision: 10, scale: 6 }).notNull(), // 整件立方（M3）
  createdAt: timestamp("created_at").defaultNow().notNull(), // 创建时间
  updatedAt: timestamp("updated_at").defaultNow().notNull(), // 更新时间
});

export const insertProductSchema = createInsertSchema(products).pick({
  name: true,
  barcode: true,
  singleLengthCm: true,
  singleWidthCm: true,
  singleHeightCm: true,
  singleVolumeM3: true,
  singleWeightKg: true,
  bulkWidthCm: true,
  bulkLengthCm: true,
  bulkHeightCm: true,
  bulkWeightKg: true,
  bulkVolumeM3: true,
});

export type InsertProduct = z.infer<typeof insertProductSchema>;
export type Product = typeof products.$inferSelect;

// 操作类型枚举 (入库，出库)

// 仓库
export const warehouses = mysqlTable("warehouses", {
  id: int("id").primaryKey().autoincrement(),
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
export const inboundOrders = mysqlTable("inbound_orders", {
  id: int("id").primaryKey().autoincrement(),
  orderNumber: varchar("order_number", { length: 255 }).notNull().unique(), // 入库单号
  warehouseId: int("warehouse_id").notNull().references(() => warehouses.id), // 仓库ID
  totalWeight: decimal("total_weight", { precision: 10, scale: 3 }).notNull(), // 总重量
  totalVolume: decimal("total_volume", { precision: 10, scale: 6 }).notNull(), // 总体积
  createdBy: int("created_by").notNull().references(() => users.id), // 创建人
  createdAt: timestamp("created_at").defaultNow().notNull(), // 创建时间
  status: varchar("status", { length: 50 }).notNull().default("pending"), // 状态：待处理、已完成、已取消
  notes: text("notes"), // 备注
});

export const insertInboundOrderSchema = createInsertSchema(inboundOrders).pick({
  orderNumber: true,
  warehouseId: true,
  totalWeight: true,
  totalVolume: true,
  createdBy: true,
  status: true,
  notes: true,
});

export type InsertInboundOrder = z.infer<typeof insertInboundOrderSchema>;
export type InboundOrder = typeof inboundOrders.$inferSelect;

// 入库单明细
export const inboundOrderItems = mysqlTable("inbound_order_items", {
  id: int("id").primaryKey().autoincrement(),
  inboundOrderId: int("inbound_order_id").notNull().references(() => inboundOrders.id), // 入库单ID
  productId: int("product_id").notNull().references(() => products.id), // 商品ID
  quantity: int("quantity").notNull(), // 数量
  weight: decimal("weight", { precision: 10, scale: 3 }).notNull(), // 重量
  volume: decimal("volume", { precision: 10, scale: 6 }).notNull(), // 体积
});

export const insertInboundOrderItemSchema = createInsertSchema(inboundOrderItems).pick({
  inboundOrderId: true,
  productId: true,
  quantity: true,
  weight: true,
  volume: true,
});

export type InsertInboundOrderItem = z.infer<typeof insertInboundOrderItemSchema>;
export type InboundOrderItem = typeof inboundOrderItems.$inferSelect;

// 出库单
export const outboundOrders = mysqlTable("outbound_orders", {
  id: int("id").primaryKey().autoincrement(),
  orderNumber: varchar("order_number", { length: 255 }).notNull().unique(), // 出库单号
  warehouseId: int("warehouse_id").notNull().references(() => warehouses.id), // 仓库ID
  totalWeight: decimal("total_weight", { precision: 10, scale: 3 }).notNull(), // 总重量
  totalVolume: decimal("total_volume", { precision: 10, scale: 6 }).notNull(), // 总体积
  createdBy: int("created_by").notNull().references(() => users.id), // 创建人
  createdAt: timestamp("created_at").defaultNow().notNull(), // 创建时间
  status: varchar("status", { length: 50 }).notNull().default("pending"), // 状态：待处理、已完成、已取消
  notes: text("notes"), // 备注
});

export const insertOutboundOrderSchema = createInsertSchema(outboundOrders).pick({
  orderNumber: true,
  warehouseId: true,
  totalWeight: true,
  totalVolume: true,
  createdBy: true,
  status: true,
  notes: true,
});

export type InsertOutboundOrder = z.infer<typeof insertOutboundOrderSchema>;
export type OutboundOrder = typeof outboundOrders.$inferSelect;

// 出库单明细
export const outboundOrderItems = mysqlTable("outbound_order_items", {
  id: int("id").primaryKey().autoincrement(),
  outboundOrderId: int("outbound_order_id").notNull().references(() => outboundOrders.id), // 出库单ID
  productId: int("product_id").notNull().references(() => products.id), // 商品ID
  quantity: int("quantity").notNull(), // 数量
  weight: decimal("weight", { precision: 10, scale: 3 }).notNull(), // 重量
  volume: decimal("volume", { precision: 10, scale: 6 }).notNull(), // 体积
});

export const insertOutboundOrderItemSchema = createInsertSchema(outboundOrderItems).pick({
  outboundOrderId: true,
  productId: true,
  quantity: true,
  weight: true,
  volume: true,
});

export type InsertOutboundOrderItem = z.infer<typeof insertOutboundOrderItemSchema>;
export type OutboundOrderItem = typeof outboundOrderItems.$inferSelect;