/**
 * 数据库表创建脚本
 * 用于直接创建数据库中的所有表结构
 */
import { drizzle } from 'drizzle-orm/postgres-js';
import { migrate } from 'drizzle-orm/postgres-js/migrator';
import postgres from 'postgres';
import * as schema from '../shared/schema';
import path from 'path';
import dotenv from 'dotenv';

// 加载环境变量
dotenv.config();

async function main() {
  console.log('开始创建数据库表...');
  
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) {
    console.error('错误: 未找到 DATABASE_URL 环境变量');
    process.exit(1);
  }
  
  try {
    // 创建数据库客户端
    const client = postgres(connectionString, { max: 1 });
    const db = drizzle(client, { schema });
    
    // 直接执行 SQL 来创建表
    console.log('开始创建数据库表...');
    
    // 创建用户相关表
    await client`
      CREATE TABLE IF NOT EXISTS "users" (
        "id" SERIAL PRIMARY KEY,
        "username" VARCHAR(255) NOT NULL UNIQUE,
        "password" VARCHAR(255),
        "full_name" VARCHAR(255),
        "email" VARCHAR(255),
        "avatar_url" VARCHAR(255),
        "phone_number" VARCHAR(50),
        "role" VARCHAR(20) NOT NULL DEFAULT 'user',
        "is_active" BOOLEAN DEFAULT true,
        "created_at" TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
        "updated_at" TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
        "last_login_at" TIMESTAMP WITH TIME ZONE,
        "social_id" VARCHAR(255),
        "user_source" VARCHAR(50) DEFAULT 'local',
        "social_data" TEXT,
        "ui_language" VARCHAR(10) DEFAULT 'zh'
      );
    `;
    
    // 创建存储库相关表
    await client`
      CREATE TABLE IF NOT EXISTS "repositories" (
        "id" SERIAL PRIMARY KEY,
        "name" VARCHAR(255) NOT NULL,
        "description" TEXT,
        "owner_id" INTEGER NOT NULL,
        "visibility" VARCHAR(20) NOT NULL DEFAULT 'private',
        "language" VARCHAR(50),
        "clone_url" VARCHAR(255),
        "branch_count" INTEGER DEFAULT 0,
        "contributor_count" INTEGER DEFAULT 0,
        "view_count" INTEGER DEFAULT 0,
        "created_at" TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
        "updated_at" TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY ("owner_id") REFERENCES "users"("id") ON DELETE CASCADE
      );
    `;
    
    // 创建团队相关表
    await client`
      CREATE TABLE IF NOT EXISTS "teams" (
        "id" SERIAL PRIMARY KEY,
        "name" VARCHAR(255) NOT NULL,
        "description" TEXT,
        "is_active" BOOLEAN DEFAULT true,
        "created_at" TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      );
    `;
    
    // 创建团队成员表
    await client`
      CREATE TABLE IF NOT EXISTS "team_members" (
        "id" SERIAL PRIMARY KEY,
        "team_id" INTEGER NOT NULL,
        "user_id" INTEGER NOT NULL,
        "is_admin" BOOLEAN DEFAULT false,
        FOREIGN KEY ("team_id") REFERENCES "teams"("id") ON DELETE CASCADE,
        FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE,
        UNIQUE ("team_id", "user_id")
      );
    `;
    
    // 创建团队页面权限表
    await client`
      CREATE TABLE IF NOT EXISTS "team_page_permissions" (
        "id" SERIAL PRIMARY KEY,
        "team_id" INTEGER NOT NULL,
        "page_name" VARCHAR(50) NOT NULL,
        "can_view" BOOLEAN DEFAULT true,
        "can_manage" BOOLEAN DEFAULT false,
        FOREIGN KEY ("team_id") REFERENCES "teams"("id") ON DELETE CASCADE,
        UNIQUE ("team_id", "page_name")
      );
    `;
    
    // 创建团队仓库权限表
    await client`
      CREATE TABLE IF NOT EXISTS "team_warehouse_permissions" (
        "id" SERIAL PRIMARY KEY,
        "team_id" INTEGER NOT NULL,
        "warehouse_id" INTEGER NOT NULL,
        "can_view" BOOLEAN DEFAULT true,
        "can_manage" BOOLEAN DEFAULT false,
        FOREIGN KEY ("team_id") REFERENCES "teams"("id") ON DELETE CASCADE,
        UNIQUE ("team_id", "warehouse_id")
      );
    `;
    
    // 创建团队仓库关联表
    await client`
      CREATE TABLE IF NOT EXISTS "team_repositories" (
        "id" SERIAL PRIMARY KEY,
        "team_id" INTEGER NOT NULL,
        "repository_id" INTEGER NOT NULL,
        FOREIGN KEY ("team_id") REFERENCES "teams"("id") ON DELETE CASCADE,
        FOREIGN KEY ("repository_id") REFERENCES "repositories"("id") ON DELETE CASCADE,
        UNIQUE ("team_id", "repository_id")
      );
    `;
    
    // 创建活动表
    await client`
      CREATE TABLE IF NOT EXISTS "activities" (
        "id" SERIAL PRIMARY KEY,
        "user_id" INTEGER NOT NULL,
        "repository_id" INTEGER NOT NULL,
        "type" VARCHAR(50) NOT NULL,
        "summary" TEXT NOT NULL,
        "details" TEXT,
        "branch" VARCHAR(255),
        "created_at" TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE,
        FOREIGN KEY ("repository_id") REFERENCES "repositories"("id") ON DELETE CASCADE
      );
    `;
    
    // 创建商品表
    await client`
      CREATE TABLE IF NOT EXISTS "products" (
        "id" SERIAL PRIMARY KEY,
        "name" VARCHAR(255) NOT NULL,
        "description" TEXT,
        "barcode" VARCHAR(100) UNIQUE,
        "unique_code" VARCHAR(100) UNIQUE,
        "category" VARCHAR(100),
        "stock" INTEGER DEFAULT 0,
        "price" DECIMAL(10, 2) DEFAULT 0,
        "cost" DECIMAL(10, 2) DEFAULT 0,
        "single_length_cm" VARCHAR(20),
        "single_width_cm" VARCHAR(20),
        "single_height_cm" VARCHAR(20),
        "single_volume_m3" VARCHAR(20),
        "single_weight_kg" VARCHAR(20),
        "bulk_length_cm" VARCHAR(20),
        "bulk_width_cm" VARCHAR(20),
        "bulk_height_cm" VARCHAR(20),
        "bulk_volume_m3" VARCHAR(20),
        "bulk_weight_kg" VARCHAR(20),
        "bulk_quantity" INTEGER,
        "created_at" TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
        "updated_at" TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      );
    `;
    
    // 创建仓库表
    await client`
      CREATE TABLE IF NOT EXISTS "warehouses" (
        "id" SERIAL PRIMARY KEY,
        "name" VARCHAR(255) NOT NULL,
        "location" VARCHAR(255) NOT NULL,
        "capacity" VARCHAR(50) NOT NULL,
        "created_at" TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      );
    `;
    
    // 创建入库单表
    await client`
      CREATE TABLE IF NOT EXISTS "inbound_orders" (
        "id" SERIAL PRIMARY KEY,
        "order_number" VARCHAR(50) NOT NULL UNIQUE,
        "warehouse_id" INTEGER NOT NULL,
        "status" VARCHAR(20) DEFAULT 'pending',
        "total_weight" VARCHAR(20) NOT NULL,
        "total_volume" VARCHAR(20) NOT NULL,
        "created_by" INTEGER NOT NULL,
        "order_type" VARCHAR(20),
        "notes" TEXT,
        "created_at" TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY ("warehouse_id") REFERENCES "warehouses"("id"),
        FOREIGN KEY ("created_by") REFERENCES "users"("id")
      );
    `;
    
    // 创建入库单明细表
    await client`
      CREATE TABLE IF NOT EXISTS "inbound_order_items" (
        "id" SERIAL PRIMARY KEY,
        "inbound_order_id" INTEGER NOT NULL,
        "product_id" INTEGER NOT NULL,
        "product_name" VARCHAR(255) NOT NULL,
        "barcode" VARCHAR(100) NOT NULL,
        "unique_code" VARCHAR(100),
        "quantity" INTEGER NOT NULL,
        "package_count" INTEGER NOT NULL,
        "weight" VARCHAR(20) NOT NULL,
        "volume" VARCHAR(20) NOT NULL,
        "external_order_number" VARCHAR(50),
        "remark" TEXT,
        FOREIGN KEY ("inbound_order_id") REFERENCES "inbound_orders"("id") ON DELETE CASCADE,
        FOREIGN KEY ("product_id") REFERENCES "products"("id")
      );
    `;
    
    // 创建出库单表
    await client`
      CREATE TABLE IF NOT EXISTS "outbound_orders" (
        "id" SERIAL PRIMARY KEY,
        "order_number" VARCHAR(50) NOT NULL UNIQUE,
        "warehouse_id" INTEGER NOT NULL,
        "status" VARCHAR(20) DEFAULT 'pending',
        "total_weight" VARCHAR(20) NOT NULL,
        "total_volume" VARCHAR(20) NOT NULL,
        "created_by" INTEGER NOT NULL,
        "order_type" VARCHAR(20),
        "destination_type" VARCHAR(20),
        "notes" TEXT,
        "created_at" TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY ("warehouse_id") REFERENCES "warehouses"("id"),
        FOREIGN KEY ("created_by") REFERENCES "users"("id")
      );
    `;
    
    // 创建出库单明细表
    await client`
      CREATE TABLE IF NOT EXISTS "outbound_order_items" (
        "id" SERIAL PRIMARY KEY,
        "outbound_order_id" INTEGER NOT NULL,
        "product_id" INTEGER NOT NULL,
        "product_name" VARCHAR(255) NOT NULL,
        "barcode" VARCHAR(100) NOT NULL,
        "unique_code" VARCHAR(100),
        "quantity" INTEGER NOT NULL,
        "package_count" INTEGER NOT NULL,
        "weight" VARCHAR(20) NOT NULL,
        "volume" VARCHAR(20) NOT NULL,
        "external_order_number" VARCHAR(50),
        "remark" TEXT,
        FOREIGN KEY ("outbound_order_id") REFERENCES "outbound_orders"("id") ON DELETE CASCADE,
        FOREIGN KEY ("product_id") REFERENCES "products"("id")
      );
    `;
    
    // 创建电商产品表
    await client`
      CREATE TABLE IF NOT EXISTS "ecommerce_products" (
        "id" SERIAL PRIMARY KEY,
        "platform_code" VARCHAR(100) NOT NULL,
        "platform_name" VARCHAR(255) NOT NULL,
        "platform_category" VARCHAR(100),
        "platform_source" VARCHAR(50) NOT NULL,
        "stock" INTEGER,
        "price" VARCHAR(50),
        "matched_code" VARCHAR(100),
        "matched_product_id" INTEGER,
        "additional_info" TEXT,
        "last_updated" TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY ("matched_product_id") REFERENCES "products"("id"),
        UNIQUE ("platform_code", "platform_source")
      );
    `;
    
    // 创建API配置表
    await client`
      CREATE TABLE IF NOT EXISTS "api_configurations" (
        "id" SERIAL PRIMARY KEY,
        "name" VARCHAR(100) NOT NULL,
        "platform_type" VARCHAR(50) NOT NULL,
        "store_name" VARCHAR(255) NOT NULL,
        "api_endpoint" VARCHAR(255) NOT NULL,
        "api_key" VARCHAR(255),
        "api_secret" VARCHAR(255),
        "config" TEXT,
        "warehouse_id" INTEGER,
        "team_id" INTEGER,
        "is_active" BOOLEAN DEFAULT true,
        "last_sync_time" TIMESTAMP WITH TIME ZONE,
        "created_at" TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
        "updated_at" TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY ("warehouse_id") REFERENCES "warehouses"("id"),
        FOREIGN KEY ("team_id") REFERENCES "teams"("id")
      );
    `;
    
    // 创建产品匹配规则表
    await client`
      CREATE TABLE IF NOT EXISTS "product_matching_rules" (
        "id" SERIAL PRIMARY KEY,
        "platform_source" VARCHAR(50) NOT NULL,
        "rule_type" VARCHAR(50) NOT NULL,
        "pattern" VARCHAR(255) NOT NULL,
        "replacement" VARCHAR(255),
        "priority" INTEGER DEFAULT 0,
        "is_active" BOOLEAN DEFAULT true,
        "created_by" INTEGER NOT NULL,
        "created_at" TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY ("created_by") REFERENCES "users"("id")
      );
    `;
    
    // 创建平台订单表
    await client`
      CREATE TABLE IF NOT EXISTS "platform_orders" (
        "id" SERIAL PRIMARY KEY,
        "platform_order_id" VARCHAR(100) NOT NULL,
        "platform_source" VARCHAR(50) NOT NULL,
        "order_time" TIMESTAMP WITH TIME ZONE NOT NULL,
        "customer_name" VARCHAR(255),
        "shipping_address" TEXT,
        "contact_phone" VARCHAR(50),
        "total_amount" DECIMAL(10, 2) NOT NULL,
        "order_status" VARCHAR(50) NOT NULL,
        "api_configuration_id" INTEGER NOT NULL,
        "warehouse_id" INTEGER,
        "outbound_order_id" INTEGER,
        "pre_audit_order_id" INTEGER,
        "last_updated" TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY ("api_configuration_id") REFERENCES "api_configurations"("id"),
        FOREIGN KEY ("warehouse_id") REFERENCES "warehouses"("id"),
        FOREIGN KEY ("outbound_order_id") REFERENCES "outbound_orders"("id"),
        UNIQUE ("platform_order_id", "platform_source")
      );
    `;
    
    // 创建平台订单项目表
    await client`
      CREATE TABLE IF NOT EXISTS "platform_order_items" (
        "id" SERIAL PRIMARY KEY,
        "platform_order_id" INTEGER NOT NULL,
        "platform_item_id" VARCHAR(100) NOT NULL,
        "platform_product_id" VARCHAR(100) NOT NULL,
        "product_name" VARCHAR(255) NOT NULL,
        "quantity" INTEGER NOT NULL,
        "unit_price" DECIMAL(10, 2) NOT NULL,
        "matched_product_id" INTEGER,
        "outbound_item_id" INTEGER,
        FOREIGN KEY ("platform_order_id") REFERENCES "platform_orders"("id") ON DELETE CASCADE,
        FOREIGN KEY ("matched_product_id") REFERENCES "products"("id"),
        UNIQUE ("platform_order_id", "platform_item_id")
      );
    `;
    
    // 创建预审核订单表
    await client`
      CREATE TABLE IF NOT EXISTS "pre_audit_orders" (
        "id" SERIAL PRIMARY KEY,
        "platform_order_id" VARCHAR(100) NOT NULL,
        "platform_source" VARCHAR(50) NOT NULL,
        "order_time" TIMESTAMP WITH TIME ZONE NOT NULL,
        "customer_name" VARCHAR(255),
        "shipping_address" TEXT,
        "contact_phone" VARCHAR(50),
        "total_amount" DECIMAL(10, 2) NOT NULL,
        "order_status" VARCHAR(50) NOT NULL DEFAULT 'pending',
        "api_configuration_id" INTEGER NOT NULL,
        "audited_by" INTEGER,
        "audited_at" TIMESTAMP WITH TIME ZONE,
        "audit_notes" TEXT,
        "created_at" TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY ("api_configuration_id") REFERENCES "api_configurations"("id"),
        FOREIGN KEY ("audited_by") REFERENCES "users"("id"),
        UNIQUE ("platform_order_id", "platform_source")
      );
    `;
    
    // 创建预审核订单项目表
    await client`
      CREATE TABLE IF NOT EXISTS "pre_audit_order_items" (
        "id" SERIAL PRIMARY KEY,
        "pre_audit_order_id" INTEGER NOT NULL,
        "platform_item_id" VARCHAR(100) NOT NULL,
        "platform_product_id" VARCHAR(100) NOT NULL,
        "product_name" VARCHAR(255) NOT NULL,
        "quantity" INTEGER NOT NULL,
        "unit_price" DECIMAL(10, 2) NOT NULL,
        "matched_product_id" INTEGER,
        "match_method" VARCHAR(20) DEFAULT 'auto',
        "audit_status" VARCHAR(20) DEFAULT 'pending',
        "audit_notes" TEXT,
        FOREIGN KEY ("pre_audit_order_id") REFERENCES "pre_audit_orders"("id") ON DELETE CASCADE,
        FOREIGN KEY ("matched_product_id") REFERENCES "products"("id"),
        UNIQUE ("pre_audit_order_id", "platform_item_id")
      );
    `;
    
    // 创建仓库调拨单表
    await client`
      CREATE TABLE IF NOT EXISTS "warehouse_transfers" (
        "id" SERIAL PRIMARY KEY,
        "reference_number" VARCHAR(50) NOT NULL UNIQUE,
        "source_warehouse_id" INTEGER NOT NULL,
        "target_warehouse_id" INTEGER NOT NULL,
        "status" VARCHAR(20) DEFAULT 'pending',
        "total_items" INTEGER NOT NULL,
        "total_packages" INTEGER NOT NULL,
        "total_weight" VARCHAR(20) NOT NULL,
        "total_volume" VARCHAR(20) NOT NULL,
        "notes" TEXT,
        "created_by" INTEGER NOT NULL,
        "created_at" TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
        "inbound_order_id" INTEGER,
        "outbound_order_id" INTEGER,
        "cancelled_by" INTEGER,
        "cancelled_at" TIMESTAMP WITH TIME ZONE,
        "completed_by" INTEGER,
        "completed_at" TIMESTAMP WITH TIME ZONE,
        "document_url" VARCHAR(255),
        "document_uploaded_at" TIMESTAMP WITH TIME ZONE,
        FOREIGN KEY ("source_warehouse_id") REFERENCES "warehouses"("id"),
        FOREIGN KEY ("target_warehouse_id") REFERENCES "warehouses"("id"),
        FOREIGN KEY ("created_by") REFERENCES "users"("id"),
        FOREIGN KEY ("cancelled_by") REFERENCES "users"("id"),
        FOREIGN KEY ("completed_by") REFERENCES "users"("id"),
        FOREIGN KEY ("inbound_order_id") REFERENCES "inbound_orders"("id"),
        FOREIGN KEY ("outbound_order_id") REFERENCES "outbound_orders"("id")
      );
    `;
    
    // 创建仓库调拨单明细表
    await client`
      CREATE TABLE IF NOT EXISTS "warehouse_transfer_items" (
        "id" SERIAL PRIMARY KEY,
        "transfer_id" INTEGER NOT NULL,
        "product_id" INTEGER NOT NULL,
        "unique_code" VARCHAR(100),
        "quantity" INTEGER NOT NULL,
        "package_count" INTEGER NOT NULL,
        "weight" VARCHAR(20) NOT NULL,
        "volume" VARCHAR(20) NOT NULL,
        "remark" TEXT,
        FOREIGN KEY ("transfer_id") REFERENCES "warehouse_transfers"("id") ON DELETE CASCADE,
        FOREIGN KEY ("product_id") REFERENCES "products"("id")
      );
    `;
    
    // 创建唯一码跟踪表
    await client`
      CREATE TABLE IF NOT EXISTS "unique_code_tracking" (
        "id" SERIAL PRIMARY KEY,
        "unique_code" VARCHAR(100) NOT NULL UNIQUE,
        "product_id" INTEGER NOT NULL,
        "warehouse_id" INTEGER NOT NULL,
        "inbound_order_id" INTEGER,
        "outbound_order_id" INTEGER,
        "current_warehouse_id" INTEGER NOT NULL,
        "transfer_id" INTEGER,
        "initial_warehouse_id" INTEGER NOT NULL,
        "status" VARCHAR(20) DEFAULT 'in_stock',
        "quantity" INTEGER DEFAULT 1,
        "remark" TEXT,
        "last_operation_id" INTEGER,
        "last_operation_item_id" INTEGER,
        "last_operation_type" VARCHAR(20),
        "last_operation_date" TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
        "last_operation_user_id" INTEGER,
        "created_at" TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
        "updated_at" TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY ("product_id") REFERENCES "products"("id"),
        FOREIGN KEY ("warehouse_id") REFERENCES "warehouses"("id"),
        FOREIGN KEY ("current_warehouse_id") REFERENCES "warehouses"("id"),
        FOREIGN KEY ("initial_warehouse_id") REFERENCES "warehouses"("id"),
        FOREIGN KEY ("inbound_order_id") REFERENCES "inbound_orders"("id"),
        FOREIGN KEY ("outbound_order_id") REFERENCES "outbound_orders"("id"),
        FOREIGN KEY ("transfer_id") REFERENCES "warehouse_transfers"("id"),
        FOREIGN KEY ("last_operation_user_id") REFERENCES "users"("id")
      );
    `;
    
    // 创建唯一码历史表
    await client`
      CREATE TABLE IF NOT EXISTS "unique_code_history" (
        "id" SERIAL PRIMARY KEY,
        "unique_code" VARCHAR(100) NOT NULL,
        "product_id" INTEGER NOT NULL,
        "warehouse_id" INTEGER NOT NULL,
        "operation_type" VARCHAR(20) NOT NULL,
        "operation_date" TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
        "operation_user_id" INTEGER,
        "reference_id" INTEGER,
        "reference_item_id" INTEGER,
        "new_status" VARCHAR(20) NOT NULL,
        "source_warehouse_id" INTEGER,
        "target_warehouse_id" INTEGER,
        "details" TEXT,
        "remark" TEXT,
        FOREIGN KEY ("product_id") REFERENCES "products"("id"),
        FOREIGN KEY ("warehouse_id") REFERENCES "warehouses"("id"),
        FOREIGN KEY ("operation_user_id") REFERENCES "users"("id"),
        FOREIGN KEY ("source_warehouse_id") REFERENCES "warehouses"("id"),
        FOREIGN KEY ("target_warehouse_id") REFERENCES "warehouses"("id")
      );
    `;

    console.log('数据库表创建完成');
    process.exit(0);
  } catch (error) {
    console.error('数据库表创建失败:', error);
    process.exit(1);
  }
}

main();