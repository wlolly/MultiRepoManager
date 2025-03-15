import express, { type Express, Request, Response, NextFunction } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { memStorage, useFallbackStorage } from "./db";
import { getUserPagePermissions, getUserWarehousePermissions } from "./middleware/permission-middleware";
import { 
  insertUserSchema, 
  insertRepositorySchema, 
  insertTeamSchema,
  insertTeamMemberSchema,
  insertTeamRepositorySchema,
  insertActivitySchema,
  insertWarehouseSchema,
  insertProductSchema,
  insertInboundOrderSchema,
  insertOutboundOrderSchema,
  insertInboundOrderItemSchema,
  insertOutboundOrderItemSchema,
  insertEcommerceProductSchema,
  insertApiConfigurationSchema,
  insertWarehouseTransferSchema
} from "@shared/schema";
import { z } from "zod";
import { fromZodError } from "zod-validation-error";
import multer from "multer";
import path from "path";
import fs from "fs";
import passport from "passport";
import { 
  initializePassport, 
  verifySession, 
  isAdmin,
  registerUser,
  handleSocialCallback,
  getCurrentUser,
  logout,
  activateUser,
  updateUserRole,
  bindSocialAccount,
  getSocialBindingStatus
} from "./auth";
import { 
  createTransferImportTemplate, 
  parseTransferImportFile, 
  exportTransferToExcel,
  exportMultipleTransfersToExcel
} from "./utils/excel-handler";
import {
  createProductImportTemplate,
  parseProductImportFile,
  exportProductsToExcel
} from "./utils/excel-products";
import {
  downloadWithCleanup,
  cleanupFile,
  cleanupOldFiles
} from "./utils/file-cleanup";

export async function registerRoutes(app: Express): Promise<Server> {
  const apiRouter = express.Router();
  
  // 配置multer用于文件上传
  // 确保上传目录存在
  if (!fs.existsSync('./public/uploads')) {
    fs.mkdirSync('./public/uploads', { recursive: true });
  }
  
  // 健康检查API端点
  apiRouter.get("/health", (req, res) => {
    res.json({
      status: "ok",
      serverTime: new Date().toISOString(),
      version: "1.0.0"
    });
  });
  
  // 配置存储
  const multerStorage = multer.diskStorage({
    destination: function (req, file, cb) {
      cb(null, './public/uploads')
    },
    filename: function (req, file, cb) {
      // 生成文件名：时间戳-原始文件名
      const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
      const extension = path.extname(file.originalname);
      cb(null, uniqueSuffix + extension);
    }
  });
  
  // 文件类型过滤器
  const fileFilter = (req: any, file: Express.Multer.File, cb: multer.FileFilterCallback) => {
    // 接受图片、PDF和Excel文件
    if (
      file.mimetype.startsWith('image/') || 
      file.mimetype === 'application/pdf' ||
      file.mimetype === 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' ||
      file.mimetype === 'application/vnd.ms-excel'
    ) {
      cb(null, true);
    } else {
      cb(new Error('不支持的文件类型，仅支持图片、PDF和Excel文件'));
    }
  };
  
  // 创建multer实例
  const upload = multer({ 
    storage: multerStorage,
    fileFilter: fileFilter,
    limits: {
      fileSize: 5 * 1024 * 1024 // 限制文件大小为5MB
    }
  });
  
  // Error handling middleware
  const handleZodError = (err: unknown, res: Response) => {
    if (err instanceof z.ZodError) {
      return res.status(400).json({ 
        message: "Validation error", 
        errors: fromZodError(err) 
      });
    }
    
    console.error(err);
    return res.status(500).json({ message: "Internal server error" });
  };

  // 初始化Passport认证
  initializePassport();
  app.use(passport.initialize());
  app.use(passport.session());
  
  // 调试会话初始化
  app.use((req, res, next) => {
    // 会话调试记录
    if (req.path.startsWith('/api/auth')) {
      console.log(`请求路径: ${req.path}, 会话ID: ${req.sessionID || '无'}, 已认证: ${req.isAuthenticated ? req.isAuthenticated() : '未知'}`);
    }
    next();
  });

  // 认证路由
  // 登录接口
  apiRouter.post("/auth/login", (req, res, next) => {
    console.log(`尝试登录: 用户名=${req.body.username}, 内存存储模式=${useFallbackStorage ? '开启' : '关闭'}`);
    
    passport.authenticate('local', (err, user, info) => {
      if (err) {
        console.error('登录认证错误:', err);
        return res.status(500).json({
          message: '登录过程中发生错误，请稍后再试',
          success: false,
          error: err.message
        });
      }
      
      if (!user) {
        console.log(`登录失败: ${info?.message || '认证失败'}`);
        return res.status(401).json({
          message: info?.message || '认证失败',
          success: false,
          socialBound: info?.socialBound || false
        });
      }
      
      console.log(`用户 ${user.username} 认证成功，准备创建会话`);
      
      // 使用req.login()登录会话
      req.login(user, (err) => {
        if (err) {
          console.error('会话登录错误:', err);
          return res.status(500).json({ 
            message: '会话创建失败', 
            success: false,
            error: err.message
          });
        }
        
        console.log(`用户 ${user.username} 会话创建成功`);
        
        // 返回成功响应
        return res.json({
          message: '登录成功',
          success: true,
          fallbackMode: useFallbackStorage,
          user: {
            id: user.id,
            username: user.username,
            fullName: user.fullName,
            role: user.role,
            avatarUrl: user.avatarUrl
          }
        });
      });
    })(req, res, next);
  });

  // 注册接口
  apiRouter.post("/auth/register", registerUser);
  
  // 获取当前用户信息
  apiRouter.get("/auth/me", verifySession, getCurrentUser);
  apiRouter.get("/auth/current-user", getCurrentUser); // 不加验证，允许检查会话状态
  
  // 登出接口
  apiRouter.post("/auth/logout", verifySession, logout);
  
  // 社交账号绑定相关接口
  apiRouter.post("/auth/bind-social", verifySession, bindSocialAccount);
  apiRouter.get("/auth/social-binding-status", verifySession, getSocialBindingStatus);
  
  // WeChat 登录
  apiRouter.get('/auth/wechat', passport.authenticate('wechat'));
  
  // WeChat 回调
  apiRouter.get('/auth/wechat/callback', 
    passport.authenticate('wechat', { session: false, failureRedirect: '/login?error=wechat_login_failed' }),
    (req, res) => handleSocialCallback('wechat', req, res)
  );

  // WhatsApp 登录
  apiRouter.get('/auth/whatsapp', passport.authenticate('whatsapp'));
  
  // WhatsApp 回调
  apiRouter.get('/auth/whatsapp/callback', 
    passport.authenticate('whatsapp', { session: false, failureRedirect: '/login?error=whatsapp_login_failed' }),
    (req, res) => handleSocialCallback('whatsapp', req, res)
  );

  // 管理员接口 - 激活用户
  apiRouter.post('/auth/users/:id/activate', verifySession, isAdmin, activateUser);
  
  // 管理员接口 - 更改用户角色
  apiRouter.post('/auth/users/:id/role', verifySession, isAdmin, updateUserRole);

  // 权限管理接口 - 获取页面权限
  apiRouter.get('/permissions/pages', async (req, res) => {
    try {
      // 检查是否已登录
      if (!req.user) {
        return res.status(401).json({ message: '未登录' });
      }
      
      const userId = (req.user as any).id;
      const permissions = await getUserPagePermissions(userId);
      res.json(permissions);
    } catch (error) {
      console.error('获取页面权限错误:', error);
      res.status(500).json({ message: '获取权限失败' });
    }
  });

  // 权限管理接口 - 获取仓库权限
  apiRouter.get('/permissions/warehouses', async (req, res) => {
    try {
      // 检查是否已登录
      if (!req.user) {
        return res.status(401).json({ message: '未登录' });
      }
      
      const userId = (req.user as any).id;
      const permissions = await getUserWarehousePermissions(userId);
      res.json(permissions);
    } catch (error) {
      console.error('获取仓库权限错误:', error);
      res.status(500).json({ message: '获取权限失败' });
    }
  });

  // User routes
  apiRouter.get("/users", async (req, res) => {
    try {
      const users = await storage.getUsers();
      res.json(users);
    } catch (err) {
      handleZodError(err, res);
    }
  });
  
  apiRouter.get("/users/:id", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const user = await storage.getUser(id);
      
      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }
      
      res.json(user);
    } catch (err) {
      handleZodError(err, res);
    }
  });
  
  apiRouter.post("/users", async (req, res) => {
    try {
      const userData = insertUserSchema.parse(req.body);
      const user = await storage.createUser(userData);
      res.status(201).json(user);
    } catch (err) {
      handleZodError(err, res);
    }
  });

  // Repository routes
  apiRouter.get("/repositories", async (req, res) => {
    try {
      const filters = {
        ownerId: req.query.ownerId ? parseInt(req.query.ownerId as string) : undefined,
        language: req.query.language as string | undefined,
        visibility: req.query.visibility as string | undefined
      };
      
      const repositories = await storage.getRepositories(filters);
      res.json(repositories);
    } catch (err) {
      handleZodError(err, res);
    }
  });
  
  apiRouter.get("/repositories/:id", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const repository = await storage.getRepository(id);
      
      if (!repository) {
        return res.status(404).json({ message: "Repository not found" });
      }
      
      // Increment view count
      await storage.updateRepository(id, { 
        viewCount: (repository.viewCount || 0) + 1 
      });
      
      res.json(repository);
    } catch (err) {
      handleZodError(err, res);
    }
  });
  
  apiRouter.post("/repositories", async (req, res) => {
    try {
      const repositoryData = insertRepositorySchema.parse(req.body);
      const repository = await storage.createRepository(repositoryData);
      res.status(201).json(repository);
    } catch (err) {
      handleZodError(err, res);
    }
  });
  
  apiRouter.patch("/repositories/:id", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const repository = await storage.getRepository(id);
      
      if (!repository) {
        return res.status(404).json({ message: "Repository not found" });
      }
      
      const updateData = req.body;
      const updatedRepository = await storage.updateRepository(id, updateData);
      res.json(updatedRepository);
    } catch (err) {
      handleZodError(err, res);
    }
  });

  // Team routes
  apiRouter.get("/teams", async (req, res) => {
    try {
      const teams = await storage.getTeams();
      res.json(teams);
    } catch (err) {
      handleZodError(err, res);
    }
  });
  
  apiRouter.get("/teams/:id", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const team = await storage.getTeam(id);
      
      if (!team) {
        return res.status(404).json({ message: "Team not found" });
      }
      
      res.json(team);
    } catch (err) {
      handleZodError(err, res);
    }
  });
  
  apiRouter.post("/teams", async (req, res) => {
    try {
      const teamData = insertTeamSchema.parse(req.body);
      const team = await storage.createTeam(teamData);
      res.status(201).json(team);
    } catch (err) {
      handleZodError(err, res);
    }
  });
  
  apiRouter.get("/teams/:id/members", async (req, res) => {
    try {
      const teamId = parseInt(req.params.id);
      const teamMembers = await storage.getTeamMembers(teamId);
      
      // Get full user data for each member
      const membersWithUserData = await Promise.all(
        teamMembers.map(async (member) => {
          const user = await storage.getUser(member.userId);
          return { ...member, user };
        })
      );
      
      res.json(membersWithUserData);
    } catch (err) {
      handleZodError(err, res);
    }
  });
  
  apiRouter.post("/teams/:id/members", async (req, res) => {
    try {
      const teamId = parseInt(req.params.id);
      const memberData = insertTeamMemberSchema.parse({
        ...req.body,
        teamId
      });
      
      const teamMember = await storage.addTeamMember(memberData);
      res.status(201).json(teamMember);
    } catch (err) {
      handleZodError(err, res);
    }
  });
  
  apiRouter.delete("/teams/:teamId/members/:userId", async (req, res) => {
    try {
      const teamId = parseInt(req.params.teamId);
      const userId = parseInt(req.params.userId);
      
      await storage.removeTeamMember(teamId, userId);
      res.status(204).end();
    } catch (err) {
      handleZodError(err, res);
    }
  });
  
  apiRouter.get("/teams/:id/repositories", async (req, res) => {
    try {
      const teamId = parseInt(req.params.id);
      const teamRepositories = await storage.getTeamRepositories(teamId);
      
      // Get full repository data for each team repository
      const repositoriesWithData = await Promise.all(
        teamRepositories.map(async (tr) => {
          const repository = await storage.getRepository(tr.repositoryId);
          return { ...tr, repository };
        })
      );
      
      res.json(repositoriesWithData);
    } catch (err) {
      handleZodError(err, res);
    }
  });
  
  apiRouter.post("/teams/:id/repositories", async (req, res) => {
    try {
      const teamId = parseInt(req.params.id);
      const repositoryData = insertTeamRepositorySchema.parse({
        ...req.body,
        teamId
      });
      
      const teamRepository = await storage.addTeamRepository(repositoryData);
      res.status(201).json(teamRepository);
    } catch (err) {
      handleZodError(err, res);
    }
  });

  // Activity routes
  apiRouter.get("/activities", async (req, res) => {
    try {
      const repositoryId = req.query.repositoryId 
        ? parseInt(req.query.repositoryId as string) 
        : undefined;
      
      const limit = req.query.limit 
        ? parseInt(req.query.limit as string) 
        : undefined;
      
      const activities = await storage.getActivities(repositoryId, limit);
      
      // Get user data for each activity
      const activitiesWithUserData = await Promise.all(
        activities.map(async (activity) => {
          const user = await storage.getUser(activity.userId);
          const repository = await storage.getRepository(activity.repositoryId);
          return { 
            ...activity, 
            user,
            repository: repository ? { 
              id: repository.id,
              name: repository.name 
            } : undefined
          };
        })
      );
      
      res.json(activitiesWithUserData);
    } catch (err) {
      handleZodError(err, res);
    }
  });
  
  apiRouter.post("/activities", async (req, res) => {
    try {
      const activityData = insertActivitySchema.parse(req.body);
      const activity = await storage.createActivity(activityData);
      res.status(201).json(activity);
    } catch (err) {
      handleZodError(err, res);
    }
  });

  // Warehouse routes
  apiRouter.get("/warehouses", async (req, res) => {
    try {
      const warehouses = await storage.getWarehouses();
      res.json(warehouses);
    } catch (err) {
      handleZodError(err, res);
    }
  });

  apiRouter.get("/warehouses/:id", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const warehouse = await storage.getWarehouse(id);
      
      if (!warehouse) {
        return res.status(404).json({ error: "Warehouse not found" });
      }
      
      res.json(warehouse);
    } catch (err) {
      handleZodError(err, res);
    }
  });

  apiRouter.post("/warehouses", async (req, res) => {
    try {
      const warehouseData = insertWarehouseSchema.parse(req.body);
      const warehouse = await storage.createWarehouse(warehouseData);
      res.status(201).json(warehouse);
    } catch (err) {
      handleZodError(err, res);
    }
  });

  apiRouter.patch("/warehouses/:id", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const warehouseData = req.body;
      
      const updatedWarehouse = await storage.updateWarehouse(id, warehouseData);
      
      if (!updatedWarehouse) {
        return res.status(404).json({ error: "Warehouse not found" });
      }
      
      res.json(updatedWarehouse);
    } catch (err) {
      handleZodError(err, res);
    }
  });

  // Products routes
  // 获取产品统计信息
  apiRouter.get("/products/stats", async (req, res) => {
    try {
      const stats = await storage.getProductsStats();
      res.json(stats);
    } catch (err) {
      console.error("Error getting product stats:", err);
      handleZodError(err, res);
    }
  });
  
  // 产品搜索路由 - 必须放在产品id路由之前
  apiRouter.get("/products/search", async (req, res) => {
    try {
      const query = req.query.q as string;
      
      if (!query || query.trim() === '') {
        return res.json([]);
      }
      
      // 获取所有产品
      const products = await storage.getProducts();
      
      // 在内存中过滤符合搜索条件的产品
      const searchQuery = query.toLowerCase();
      const matchedProducts = products.filter(product => {
        // 模糊匹配产品名称
        const nameMatch = product.name.toLowerCase().includes(searchQuery);
        
        // 模糊匹配唯一码
        const uniqueCodeMatch = product.uniqueCode && 
          product.uniqueCode.toLowerCase().includes(searchQuery);
        
        // 模糊匹配条形码
        const barcodeMatch = product.barcode.toLowerCase().includes(searchQuery);
        
        return nameMatch || uniqueCodeMatch || barcodeMatch;
      });
      
      console.log(`搜索产品: "${query}", 找到 ${matchedProducts.length} 个匹配项`);
      
      res.json(matchedProducts);
    } catch (err) {
      console.error("Error searching products:", err);
      handleZodError(err, res);
    }
  });
  
  apiRouter.get("/products", async (req, res) => {
    try {
      // Build filter object based on query parameters
      const filter: { warehouseId?: number, category?: string, query?: string } = {};
      
      // Check for warehouse filter
      if (req.query.warehouseId) {
        filter.warehouseId = parseInt(req.query.warehouseId as string);
      }
      
      // Check for category filter
      if (req.query.category) {
        filter.category = req.query.category as string;
      }
      
      // Check for search query (for name, barcode, or uniqueCode partial match)
      if (req.query.query) {
        filter.query = req.query.query as string;
      }
      
      // Get products with applied filters
      const products = await storage.getProducts(Object.keys(filter).length > 0 ? filter : undefined);
      
      // If search query is provided, filter results in memory for partial matches
      let filteredProducts = products;
      if (filter.query) {
        const query = filter.query.toLowerCase();
        filteredProducts = products.filter(product => {
          // 模糊匹配产品名称
          const nameMatch = product.name.toLowerCase().includes(query);
          
          // 模糊匹配唯一码
          const uniqueCodeMatch = product.uniqueCode && 
            product.uniqueCode.toLowerCase().includes(query);
          
          // 模糊匹配条形码
          const barcodeMatch = product.barcode.toLowerCase().includes(query);
          
          return nameMatch || uniqueCodeMatch || barcodeMatch;
        });
      }
      
      res.json(filteredProducts);
    } catch (err) {
      handleZodError(err, res);
    }
  });

  apiRouter.get("/products/:id", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const product = await storage.getProduct(id);
      
      if (!product) {
        return res.status(404).json({ error: "Product not found" });
      }
      
      res.json(product);
    } catch (err) {
      handleZodError(err, res);
    }
  });

  apiRouter.post("/products", async (req, res) => {
    try {
      const productData = insertProductSchema.parse(req.body);
      const product = await storage.createProduct(productData);
      res.status(201).json(product);
    } catch (err) {
      handleZodError(err, res);
    }
  });

  apiRouter.patch("/products/:id", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const productData = req.body;
      
      const updatedProduct = await storage.updateProduct(id, productData);
      
      if (!updatedProduct) {
        return res.status(404).json({ error: "Product not found" });
      }
      
      res.json(updatedProduct);
    } catch (err) {
      handleZodError(err, res);
    }
  });

  // Excel导入/导出相关路由
  // 创建产品Excel导入模板
  apiRouter.get("/products/excel/template", async (req, res) => {
    try {
      const templatePath = createProductImportTemplate();
      
      // 确保目录和文件存在
      if (fs.existsSync(templatePath)) {
        downloadWithCleanup(res, templatePath, "product_import_template.xlsx");
      } else {
        res.status(500).json({ error: "模板文件创建失败" });
      }
    } catch (err) {
      console.error("创建Excel模板出错:", err);
      res.status(500).json({ error: "创建Excel模板失败", details: (err as Error).message });
    }
  });

  // 导出产品数据到Excel
  apiRouter.get("/products/excel/export", async (req, res) => {
    try {
      // 获取过滤条件
      const filter: { warehouseId?: number, category?: string } = {};
      
      if (req.query.warehouseId) {
        filter.warehouseId = parseInt(req.query.warehouseId as string);
      }
      
      if (req.query.category) {
        filter.category = req.query.category as string;
      }
      
      // 获取产品数据
      const products = await storage.getProducts(Object.keys(filter).length > 0 ? filter : undefined);
      
      // 获取所有仓库，用于在Excel中显示仓库名称
      const warehouses = await storage.getWarehouses();
      const warehouseMap: Record<number, string> = {};
      
      warehouses.forEach(warehouse => {
        warehouseMap[warehouse.id] = warehouse.name;
      });
      
      // 导出为Excel
      const excelPath = await exportProductsToExcel(products, warehouseMap);
      
      // 设置下载文件名
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
      const filename = `products_export_${timestamp}.xlsx`;
      
      // 确保文件存在
      if (fs.existsSync(excelPath)) {
        downloadWithCleanup(res, excelPath, filename);
      } else {
        res.status(500).json({ error: "导出文件创建失败" });
      }
    } catch (err) {
      console.error("导出产品数据出错:", err);
      res.status(500).json({ error: "导出产品数据失败" });
    }
  });

  // 导入产品数据（从Excel）
  apiRouter.post("/products/excel/import", upload.single('file'), async (req, res) => {
    try {
      // 检查是否上传了文件
      if (!req.file) {
        return res.status(400).json({ error: "未上传文件" });
      }
      
      // 解析Excel文件
      const parsedData = await parseProductImportFile(req.file.path);
      
      // 处理解析结果
      if (parsedData.errors.length > 0) {
        return res.status(400).json({
          success: false,
          errors: parsedData.errors,
          message: "Excel文件解析出现错误"
        });
      }
      
      // 导入产品到数据库
      const importResults = {
        success: true,
        created: 0,
        updated: 0,
        errors: [] as string[],
        products: [] as any[]
      };
      
      for (const productData of parsedData.products) {
        try {
          // 检查是否存在相同条形码的产品
          const existingProduct = await storage.getProductByBarcode(productData.barcode);
          
          if (existingProduct) {
            // 更新现有产品
            // 处理数字和字符串字段转换
            const updateData = {
              ...productData,
              price: String(productData.price),
              cost: String(productData.cost),
              singleLengthCm: String(productData.singleLengthCm),
              singleWidthCm: String(productData.singleWidthCm),
              singleHeightCm: String(productData.singleHeightCm),
              singleWeightKg: String(productData.singleWeightKg),
              bulkLengthCm: productData.bulkLengthCm ? String(productData.bulkLengthCm) : undefined,
              bulkWidthCm: productData.bulkWidthCm ? String(productData.bulkWidthCm) : undefined,
              bulkHeightCm: productData.bulkHeightCm ? String(productData.bulkHeightCm) : undefined,
              bulkWeightKg: productData.bulkWeightKg ? String(productData.bulkWeightKg) : undefined
            };
            
            const updated = await storage.updateProduct(existingProduct.id, updateData);
            if (updated) {
              importResults.updated++;
              importResults.products.push(updated);
            } else {
              importResults.errors.push(`无法更新产品: ${productData.name} (${productData.barcode})`);
            }
          } else {
            // 创建新产品
            // 处理数字和字符串字段转换
            const createData = {
              ...productData,
              price: String(productData.price),
              cost: String(productData.cost),
              singleLengthCm: String(productData.singleLengthCm),
              singleWidthCm: String(productData.singleWidthCm),
              singleHeightCm: String(productData.singleHeightCm),
              singleWeightKg: String(productData.singleWeightKg),
              bulkLengthCm: productData.bulkLengthCm ? String(productData.bulkLengthCm) : undefined,
              bulkWidthCm: productData.bulkWidthCm ? String(productData.bulkWidthCm) : undefined,
              bulkHeightCm: productData.bulkHeightCm ? String(productData.bulkHeightCm) : undefined,
              bulkWeightKg: productData.bulkWeightKg ? String(productData.bulkWeightKg) : undefined
            };
            
            const created = await storage.createProduct(createData);
            importResults.created++;
            importResults.products.push(created);
          }
        } catch (error) {
          importResults.errors.push(`处理产品时出错 ${productData.name}: ${(error as Error).message}`);
        }
      }
      
      res.json(importResults);
    } catch (err) {
      console.error("导入产品数据出错:", err);
      res.status(500).json({ error: "导入产品数据失败", details: (err as Error).message });
    }
  });
  
  // Inbound orders routes
  apiRouter.get("/inbound-orders", async (req, res) => {
    try {
      const filter = {
        warehouseId: req.query.warehouseId 
          ? parseInt(req.query.warehouseId as string) 
          : undefined,
        status: req.query.status as string | undefined
      };
      
      const inboundOrders = await storage.getInboundOrders(filter);
      res.json(inboundOrders);
    } catch (err) {
      handleZodError(err, res);
    }
  });
  
  apiRouter.get("/inbound-orders/:id", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const inboundOrder = await storage.getInboundOrder(id);
      
      if (!inboundOrder) {
        return res.status(404).json({ error: "Inbound order not found" });
      }
      
      // Get items for this order
      const items = await storage.getInboundOrderItems(id);
      
      res.json({ ...inboundOrder, items });
    } catch (err) {
      handleZodError(err, res);
    }
  });
  
  // Agent handling route
  apiRouter.post("/agent/query", async (req, res) => {
    try {
      const { query, history } = req.body;
      console.log("[Agent] Received query:", query);
      console.log("[Agent] Chat history:", history);
      
      // TODO: 将聊天记录和查询发送给实际的 Agent 处理
      const response = {
        success: true,
        reply: `我已收到您的消息: ${query}`,
        timestamp: new Date().toISOString()
      };
      
      console.log("[Agent] Sending response:", response);
      res.json(response);
    } catch (err) {
      console.error("[Agent] Error:", err);
      res.status(500).json({
        success: false,
        error: "Failed to process agent request"
      });
    }
  });

  apiRouter.post("/inbound-orders", async (req, res) => {
    try {
      // 增加必要的字段
      const { orderNumber, warehouseId, notes, status, orderType = "purchase", items = [] } = req.body;
      
      // 验证orderType是否为有效的枚举值
      const validOrderTypes = ["purchase", "return", "transfer", "production"];
      const validatedOrderType = validOrderTypes.includes(orderType) ? orderType : "purchase";
      
      // 计算总重量和总体积
      let totalWeight = 0;
      let totalVolume = 0;
      
      if (items && items.length > 0) {
        items.forEach((item: any) => {
          totalWeight += parseFloat(item.weight || "0");
          totalVolume += parseFloat(item.volume || "0");
        });
      }
      
      // 修改入库单数据，处理用户ID问题
      const inboundOrderData = {
        orderNumber,
        warehouseId,
        totalWeight: totalWeight.toString(),
        totalVolume: totalVolume.toString(),
        createdBy: 1, // 假定用户ID，未来应该从请求或会话中获取
        status: status || "pending",
        notes,
        orderType: validatedOrderType
      };
      
      const inboundOrder = await storage.createInboundOrder(inboundOrderData);
      
      // 添加明细项
      const createdItems = [];
      if (items && items.length > 0) {
        for (const item of items) {
          // 获取产品信息来填充必要的字段
          const product = await storage.getProduct(parseInt(item.productId));
          if (!product) {
            console.warn(`Invalid product ID: ${item.productId}, skipping`);
            continue;
          }
          
          const itemData = {
            inboundOrderId: inboundOrder.id,
            productId: parseInt(item.productId),
            productName: product.name,
            barcode: product.barcode,
            externalOrderNumber: item.externalOrderNumber || null,
            quantity: parseInt(item.quantity),
            packageCount: parseInt(item.packageCount || item.quantity),
            weight: item.weight || "0",
            volume: item.volume || "0",
            remark: item.remark || null
          };
          
          const createdItem = await storage.createInboundOrderItem(itemData);
          createdItems.push(createdItem);
        }
      }
      
      res.status(201).json({
        ...inboundOrder,
        items: createdItems
      });
    } catch (err) {
      console.error("创建入库单错误:", err);
      handleZodError(err, res);
    }
  });
  
  apiRouter.patch("/inbound-orders/:id", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const inboundOrderData = req.body;
      
      const updatedInboundOrder = await storage.updateInboundOrder(id, inboundOrderData);
      
      if (!updatedInboundOrder) {
        return res.status(404).json({ error: "Inbound order not found" });
      }
      
      res.json(updatedInboundOrder);
    } catch (err) {
      handleZodError(err, res);
    }
  });
  
  // Inbound order items routes
  apiRouter.get("/inbound-orders/:orderId/items", async (req, res) => {
    try {
      const orderId = parseInt(req.params.orderId);
      const items = await storage.getInboundOrderItems(orderId);
      res.json(items);
    } catch (err) {
      handleZodError(err, res);
    }
  });
  
  apiRouter.post("/inbound-orders/:orderId/items", async (req, res) => {
    try {
      const orderId = parseInt(req.params.orderId);
      const itemData = insertInboundOrderItemSchema.parse({
        ...req.body,
        inboundOrderId: orderId
      });
      
      const item = await storage.createInboundOrderItem(itemData);
      res.status(201).json(item);
    } catch (err) {
      handleZodError(err, res);
    }
  });
  
  apiRouter.patch("/inbound-order-items/:id", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const itemData = req.body;
      
      const updatedItem = await storage.updateInboundOrderItem(id, itemData);
      
      if (!updatedItem) {
        return res.status(404).json({ error: "Inbound order item not found" });
      }
      
      res.json(updatedItem);
    } catch (err) {
      handleZodError(err, res);
    }
  });
  
  apiRouter.delete("/inbound-order-items/:id", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      await storage.deleteInboundOrderItem(id);
      res.status(204).end();
    } catch (err) {
      handleZodError(err, res);
    }
  });
  
  // Outbound orders routes
  apiRouter.get("/outbound-orders", async (req, res) => {
    try {
      const filter = {
        warehouseId: req.query.warehouseId 
          ? parseInt(req.query.warehouseId as string) 
          : undefined,
        status: req.query.status as string | undefined
      };
      
      const outboundOrders = await storage.getOutboundOrders(filter);
      res.json(outboundOrders);
    } catch (err) {
      handleZodError(err, res);
    }
  });
  
  apiRouter.get("/outbound-orders/:id", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const outboundOrder = await storage.getOutboundOrder(id);
      
      if (!outboundOrder) {
        return res.status(404).json({ error: "Outbound order not found" });
      }
      
      // Get items for this order
      const items = await storage.getOutboundOrderItems(id);
      
      res.json({ ...outboundOrder, items });
    } catch (err) {
      handleZodError(err, res);
    }
  });
  
  apiRouter.post("/outbound-orders", async (req, res) => {
    try {
      // 增加必要的字段
      const { orderNumber, warehouseId, notes, status, orderType = "sale", destinationType = "customer", items = [] } = req.body;
      
      // 验证orderType是否为有效的枚举值
      const validOrderTypes = ["sale", "return", "transfer", "scrap"];
      const validatedOrderType = validOrderTypes.includes(orderType) ? orderType : "sale";
      
      // 验证destinationType是否为有效的枚举值
      const validDestinationTypes = ["customer", "retail", "wholesale", "transfer", "supplier"];
      const validatedDestinationType = validDestinationTypes.includes(destinationType) ? destinationType : "customer";
      
      // 计算总重量和总体积
      let totalWeight = 0;
      let totalVolume = 0;
      
      if (items && items.length > 0) {
        items.forEach((item: any) => {
          totalWeight += parseFloat(item.weight || "0");
          totalVolume += parseFloat(item.volume || "0");
        });
      }
      
      const outboundOrderData = {
        orderNumber,
        warehouseId,
        totalWeight: totalWeight.toString(),
        totalVolume: totalVolume.toString(),
        createdBy: 1, // 假设用户ID为1
        status: status || "pending",
        notes,
        orderType: validatedOrderType,
        destinationType: validatedDestinationType
      };
      
      const outboundOrder = await storage.createOutboundOrder(outboundOrderData);
      
      // 添加明细项
      const createdItems = [];
      if (items && items.length > 0) {
        for (const item of items) {
          // 获取产品信息来填充必要的字段
          const product = await storage.getProduct(parseInt(item.productId));
          if (!product) {
            console.warn(`Invalid product ID: ${item.productId}, skipping`);
            continue;
          }
          
          const itemData = {
            outboundOrderId: outboundOrder.id,
            productId: parseInt(item.productId),
            productName: product.name,
            barcode: product.barcode,
            externalOrderNumber: item.externalOrderNumber || null,
            quantity: parseInt(item.quantity),
            packageCount: parseInt(item.packageCount || item.quantity),
            weight: item.weight || "0",
            volume: item.volume || "0",
            remark: item.remark || null
          };
          
          const createdItem = await storage.createOutboundOrderItem(itemData);
          createdItems.push(createdItem);
        }
      }
      
      res.status(201).json({
        ...outboundOrder,
        items: createdItems
      });
    } catch (err) {
      console.error("创建出库单错误:", err);
      handleZodError(err, res);
    }
  });
  
  apiRouter.patch("/outbound-orders/:id", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const outboundOrderData = req.body;
      
      const updatedOutboundOrder = await storage.updateOutboundOrder(id, outboundOrderData);
      
      if (!updatedOutboundOrder) {
        return res.status(404).json({ error: "Outbound order not found" });
      }
      
      res.json(updatedOutboundOrder);
    } catch (err) {
      handleZodError(err, res);
    }
  });
  
  // Combined inbound order with items creation endpoint
  apiRouter.post("/inbound-orders/with-items", async (req, res) => {
    try {
      // 解析请求体中的数据
      const { 
        orderNumber, 
        warehouseId, 
        notes, 
        status, 
        orderType = "purchase", 
        items = [] 
      } = req.body;
      
      // 验证orderType是否为有效的枚举值
      const validOrderTypes = ["purchase", "return", "transfer", "production"];
      const validatedOrderType = validOrderTypes.includes(orderType) ? orderType : "purchase";
      
      // 计算总重量和总体积
      let totalWeight = 0;
      let totalVolume = 0;
      
      if (items && items.length > 0) {
        items.forEach((item: any) => {
          totalWeight += parseFloat(item.weight || "0");
          totalVolume += parseFloat(item.volume || "0");
        });
      }
      
      // 创建入库单基本数据
      const inboundOrderData = {
        orderNumber,
        warehouseId,
        totalWeight: totalWeight.toString(),
        totalVolume: totalVolume.toString(),
        createdBy: 1, // 假设用户ID为1，实际应从会话或请求中获取
        status: status || "pending",
        notes,
        orderType: validatedOrderType
      };
      
      // 使用事务确保数据一致性
      try {
        // 创建入库单
        const inboundOrder = await storage.createInboundOrder(inboundOrderData);
        
        // 添加明细项
        const createdItems = [];
        if (items && items.length > 0) {
          for (const item of items) {
            const itemData = {
              inboundOrderId: inboundOrder.id,
              productId: parseInt(item.productId),
              productName: item.productName,
              barcode: item.barcode,
              externalOrderNumber: item.externalOrderNumber || null,
              quantity: parseInt(item.quantity),
              packageCount: parseInt(item.packageCount || item.quantity),
              weight: item.weight || "0",
              volume: item.volume || "0",
              remark: item.remark || null
            };
            
            const createdItem = await storage.createInboundOrderItem(itemData);
            createdItems.push(createdItem);
          }
        }
        
        res.status(201).json({
          ...inboundOrder,
          items: createdItems
        });
      } catch (error) {
        console.error("创建入库单及明细项失败:", error);
        throw error;
      }
    } catch (err) {
      console.error("处理入库单请求错误:", err);
      handleZodError(err, res);
    }
  });

  // Combined outbound order with items creation endpoint
  apiRouter.post("/outbound-orders/with-items", async (req, res) => {
    try {
      // 解析请求体中的数据
      const { 
        orderNumber, 
        warehouseId, 
        notes, 
        status, 
        orderType = "sale", 
        destinationType = "customer", 
        items = [] 
      } = req.body;
      
      // 验证orderType是否为有效的枚举值
      const validOrderTypes = ["sale", "return", "transfer", "scrap"];
      const validatedOrderType = validOrderTypes.includes(orderType) ? orderType : "sale";
      
      // 验证destinationType是否为有效的枚举值
      const validDestinationTypes = ["customer", "retail", "wholesale", "transfer", "supplier", "other"];
      const validatedDestinationType = validDestinationTypes.includes(destinationType) ? destinationType : "customer";
      
      // 计算总重量和总体积
      let totalWeight = 0;
      let totalVolume = 0;
      
      if (items && items.length > 0) {
        items.forEach((item: any) => {
          totalWeight += parseFloat(item.weight || "0");
          totalVolume += parseFloat(item.volume || "0");
        });
      }
      
      // 创建出库单基本数据
      const outboundOrderData = {
        orderNumber,
        warehouseId,
        totalWeight: totalWeight.toString(),
        totalVolume: totalVolume.toString(),
        createdBy: 1, // 假设用户ID为1，实际应从会话或请求中获取
        status: status || "pending",
        notes,
        orderType: validatedOrderType,
        destinationType: validatedDestinationType
      };
      
      // 使用事务确保数据一致性
      try {
        // 检查库存是否足够
        for (const item of items) {
          const productId = parseInt(item.productId);
          if (isNaN(productId)) {
            return res.status(400).json({ error: `无效的商品ID: ${item.productId}` });
          }
          
          const product = await storage.getProduct(productId);
          if (!product) {
            return res.status(400).json({ error: `商品不存在: ${item.productName}` });
          }
          
          // 注意: 这里可能需要检查product.stock是否存在，但我们先不处理这个问题
          // 因为这部分在实际操作中可能会被注释掉
          /*
          if (product.stock < item.quantity) {
            return res.status(400).json({ 
              error: `库存不足: ${item.productName}`, 
              details: {
                product: item.productName,
                required: item.quantity,
                available: product.stock
              }
            });
          }
          */
        }
        
        // 创建出库单
        const outboundOrder = await storage.createOutboundOrder(outboundOrderData);
        
        // 添加明细项
        const createdItems = [];
        if (items && items.length > 0) {
          for (const item of items) {
            const itemData = {
              outboundOrderId: outboundOrder.id,
              productId: parseInt(item.productId),
              productName: item.productName,
              barcode: item.barcode,
              externalOrderNumber: item.externalOrderNumber || null,
              quantity: parseInt(item.quantity),
              packageCount: parseInt(item.packageCount || item.quantity),
              weight: item.weight || "0",
              volume: item.volume || "0",
              remark: item.remark || null
            };
            
            const createdItem = await storage.createOutboundOrderItem(itemData);
            createdItems.push(createdItem);
            
            // 更新库存 (实际系统可能在确认出库或其他流程中更新库存)
            // 这里仅作示例，实际系统应考虑多因素决定何时更新库存
            // await storage.updateProduct(item.productId, {
            //   stock: product.stock - item.quantity
            // });
          }
        }
        
        res.status(201).json({
          ...outboundOrder,
          items: createdItems
        });
      } catch (error) {
        console.error("创建出库单及明细项失败:", error);
        throw error;
      }
    } catch (err) {
      console.error("处理出库单请求错误:", err);
      handleZodError(err, res);
    }
  });

  // 高级出库单创建 - 支持文件上传和更多元数据
  apiRouter.post("/outbound-orders/advanced", upload.single('document'), async (req, res) => {
    try {
      // 解析请求体（注意：由于使用multer，对于multipart/form-data请求，
      // JSON数据需要作为字符串传入，因此需要解析items字段）
      const { 
        orderNumber, 
        warehouseId, 
        status, 
        orderType = "sale", 
        destinationType = "customer", 
        notes 
      } = req.body;
      
      let items = req.body.items;
      
      // 如果items是字符串，则解析为JSON对象
      if (typeof items === 'string') {
        try {
          items = JSON.parse(items);
        } catch (parseError) {
          return res.status(400).json({ error: "无效的商品列表格式" });
        }
      }
      
      // 验证仓库ID
      const parsedWarehouseId = parseInt(warehouseId);
      
      if (isNaN(parsedWarehouseId)) {
        return res.status(400).json({ error: "无效的仓库ID" });
      }
      
      // 验证商品列表
      if (!items || !Array.isArray(items) || items.length === 0) {
        return res.status(400).json({ error: "出库单必须包含至少一个商品" });
      }
      
      // 验证orderType是否为有效的枚举值
      const validOrderTypes = ["sale", "return", "transfer", "scrap"];
      const validatedOrderType = validOrderTypes.includes(orderType) ? orderType : "sale";
      
      // 验证destinationType是否为有效的枚举值
      const validDestinationTypes = ["customer", "retail", "wholesale", "transfer", "supplier", "other"];
      const validatedDestinationType = validDestinationTypes.includes(destinationType) ? destinationType : "customer";
      
      // 验证并处理商品列表
      const processedItems = items.map(item => {
        // 安全地转换数字字段
        const weight = (typeof item.weight === 'number') ? item.weight.toString() : (item.weight || "0");
        const volume = (typeof item.volume === 'number') ? item.volume.toString() : (item.volume || "0");
        const quantity = item.quantity ? parseInt(item.quantity) : 0;
        const packageCount = item.packageCount ? parseInt(item.packageCount) : quantity;
        
        return {
          ...item,
          weight,
          volume,
          quantity,
          packageCount
        };
      });
      
      // 计算总重量和体积
      const totalWeight = processedItems
        .reduce((sum, item) => sum + parseFloat(item.weight), 0)
        .toString();
        
      const totalVolume = processedItems
        .reduce((sum, item) => sum + parseFloat(item.volume), 0)
        .toString();
      
      // 获取底单文件信息（如果有上传）
      let documentFilePath = null;
      let documentFileName = null;
      let documentFileType = null;
      let documentUploadedAt = null;
      
      if (req.file) {
        documentFilePath = req.file.path;
        documentFileName = req.file.originalname;
        documentFileType = req.file.mimetype;
        documentUploadedAt = new Date();
        
        console.log("文件上传成功:", {
          path: documentFilePath,
          name: documentFileName,
          type: documentFileType
        });
      }
      
      // 创建出库单基本数据
      const outboundOrderData = {
        orderNumber,
        warehouseId: parsedWarehouseId,
        totalWeight,
        totalVolume,
        createdBy: 1, // 假设用户ID为1，实际应从会话或请求中获取
        status: status || "pending",
        notes: notes || "",
        orderType: validatedOrderType,
        destinationType: validatedDestinationType,
        documentFilePath,
        documentFileName,
        documentFileType,
        documentUploadedAt
      };
      
      try {
        // 创建出库单
        const outboundOrder = await storage.createOutboundOrder(outboundOrderData);
        
        // 添加明细项
        const createdItems = [];
        const errorMessages = [];
        
        for (const item of processedItems) {
          try {
            // 解析产品ID
            const productId = parseInt(item.productId);
            if (isNaN(productId)) {
              errorMessages.push(`产品ID "${item.productId}" 无效，已跳过`);
              continue;
            }
            
            // 获取产品信息以填充必要字段
            const product = await storage.getProduct(productId);
            if (!product) {
              errorMessages.push(`未找到ID为 ${productId} 的产品，已跳过`);
              continue;
            }
            
            // 添加出库单明细
            const outboundItem = await storage.createOutboundOrderItem({
              outboundOrderId: outboundOrder.id,
              productId,
              productName: product.name,
              barcode: product.barcode,
              quantity: item.quantity,
              packageCount: item.packageCount,
              externalOrderNumber: item.externalOrderNumber || null,
              weight: item.weight,
              volume: item.volume,
              remark: item.remark || null
            });
            
            createdItems.push(outboundItem);
          } catch (itemError) {
            console.error("处理出库单商品失败:", itemError);
            errorMessages.push(`处理商品失败: ${(itemError as Error).message}`);
          }
        }
        
        // 返回创建的数据
        res.status(201).json({
          message: "出库单创建成功" + (errorMessages.length > 0 ? "，但有部分商品处理失败" : ""),
          orderNumber,
          documentUploaded: !!req.file,
          errors: errorMessages.length > 0 ? errorMessages : undefined,
          outboundOrder,
          items: createdItems
        });
      } catch (error) {
        console.error("创建出库单记录失败:", error);
        throw error;
      }
    } catch (err) {
      console.error("处理高级出库单请求错误:", err);
      handleZodError(err, res);
    }
  });

  // Outbound order items routes
  apiRouter.get("/outbound-orders/:orderId/items", async (req, res) => {
    try {
      const orderId = parseInt(req.params.orderId);
      const items = await storage.getOutboundOrderItems(orderId);
      res.json(items);
    } catch (err) {
      handleZodError(err, res);
    }
  });
  
  apiRouter.post("/outbound-orders/:orderId/items", async (req, res) => {
    try {
      const orderId = parseInt(req.params.orderId);
      const itemData = insertOutboundOrderItemSchema.parse({
        ...req.body,
        outboundOrderId: orderId
      });
      
      const item = await storage.createOutboundOrderItem(itemData);
      res.status(201).json(item);
    } catch (err) {
      handleZodError(err, res);
    }
  });
  
  apiRouter.patch("/outbound-order-items/:id", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const itemData = req.body;
      
      const updatedItem = await storage.updateOutboundOrderItem(id, itemData);
      
      if (!updatedItem) {
        return res.status(404).json({ error: "Outbound order item not found" });
      }
      
      res.json(updatedItem);
    } catch (err) {
      handleZodError(err, res);
    }
  });
  
  apiRouter.delete("/outbound-order-items/:id", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      await storage.deleteOutboundOrderItem(id);
      res.status(204).end();
    } catch (err) {
      handleZodError(err, res);
    }
  });
  
  // E-commerce API configuration routes
  apiRouter.get("/api-configurations", async (req, res) => {
    try {
      const configs = await storage.getApiConfigurations();
      res.json(configs);
    } catch (err) {
      handleZodError(err, res);
    }
  });
  
  apiRouter.get("/api-configurations/:id", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const config = await storage.getApiConfiguration(id);
      
      if (!config) {
        return res.status(404).json({ error: "API configuration not found" });
      }
      
      res.json(config);
    } catch (err) {
      handleZodError(err, res);
    }
  });
  
  apiRouter.post("/api-configurations", async (req, res) => {
    try {
      const configData = insertApiConfigurationSchema.parse(req.body);
      const config = await storage.createApiConfiguration(configData);
      res.status(201).json(config);
    } catch (err) {
      handleZodError(err, res);
    }
  });
  
  apiRouter.patch("/api-configurations/:id", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const configData = req.body;
      
      const updatedConfig = await storage.updateApiConfiguration(id, configData);
      
      if (!updatedConfig) {
        return res.status(404).json({ error: "API configuration not found" });
      }
      
      res.json(updatedConfig);
    } catch (err) {
      handleZodError(err, res);
    }
  });

  // 电商平台产品相关路由
  // 匹配电商平台产品与系统产品
  apiRouter.get("/ecommerce-products/match", async (req, res) => {
    try {
      const { platformSource } = req.query;
      
      if (!platformSource || typeof platformSource !== 'string') {
        return res.status(400).json({ error: "Platform source is required" });
      }
      
      const matchResult = await storage.matchPlatformProducts(platformSource);
      res.json(matchResult);
    } catch (err) {
      console.error("Error matching platform products:", err);
      res.status(500).json({ error: "Error matching platform products" });
    }
  });
  
  // 获取电商平台产品列表
  apiRouter.get("/ecommerce-products", async (req, res) => {
    try {
      const { platformSource, matchedProductId } = req.query;
      const filter: { platformSource?: string, matchedProductId?: number } = {};
      
      if (platformSource && typeof platformSource === 'string') {
        filter.platformSource = platformSource;
      }
      
      if (matchedProductId && typeof matchedProductId === 'string') {
        const id = parseInt(matchedProductId);
        if (!isNaN(id)) {
          filter.matchedProductId = id;
        }
      }
      
      const products = await storage.getEcommerceProducts(filter);
      res.json(products);
    } catch (err) {
      console.error("Error getting ecommerce products:", err);
      res.status(500).json({ error: "Error getting ecommerce products" });
    }
  });
  
  // Excel import/export routes
  // Import products from Excel
  apiRouter.post("/import/products", async (req, res) => {
    try {
      // Excel data will be sent in the request body as JSON
      const { data } = req.body;
      
      if (!Array.isArray(data) || data.length === 0) {
        return res.status(400).json({ error: "Invalid Excel data format" });
      }
      
      const importedProducts = [];
      
      for (const row of data) {
        try {
          // Map Excel columns to product fields
          const productData = {
            name: row.name || row['Product Name'] || "",
            description: row.description || row['Description'] || "",
            barcode: row.barcode || row['Barcode'] || "",
            category: row.category || row['Category'] || "",
            stock: parseInt(row.stock || row['Stock'] || "0"),
            price: parseFloat(row.price || row['Price'] || "0"),
            cost: parseFloat(row.cost || row['Cost'] || "0"),
            singleLengthCm: parseFloat(row.singleLengthCm || row['Length (cm)'] || "0"),
            singleWidthCm: parseFloat(row.singleWidthCm || row['Width (cm)'] || "0"),
            singleHeightCm: parseFloat(row.singleHeightCm || row['Height (cm)'] || "0"),
            singleWeightKg: parseFloat(row.singleWeightKg || row['Weight (kg)'] || "0"),
            bulkLengthCm: parseFloat(row.bulkLengthCm || row['Bulk Length (cm)'] || "0"),
            bulkWidthCm: parseFloat(row.bulkWidthCm || row['Bulk Width (cm)'] || "0"),
            bulkHeightCm: parseFloat(row.bulkHeightCm || row['Bulk Height (cm)'] || "0"),
            bulkWeightKg: parseFloat(row.bulkWeightKg || row['Bulk Weight (kg)'] || "0"),
          };
          
          // Create product
          const product = await storage.createProduct(productData);
          importedProducts.push(product);
        } catch (error) {
          console.error("Error importing row:", error, row);
          // Continue with next row even if there's an error
        }
      }
      
      res.status(201).json({ 
        message: `Successfully imported ${importedProducts.length} products`,
        importedProducts
      });
    } catch (err) {
      handleZodError(err, res);
    }
  });
  
  // Import inbound orders from Excel
  apiRouter.post("/import/inbound-orders", async (req, res) => {
    try {
      const { data, warehouseId } = req.body;
      
      if (!Array.isArray(data) || data.length === 0) {
        return res.status(400).json({ error: "Invalid Excel data format" });
      }
      
      if (!warehouseId) {
        return res.status(400).json({ error: "Warehouse ID is required" });
      }
      
      // 计算总重量和总体积
      let totalWeight = 0;
      let totalVolume = 0;
      
      // Create a new inbound order
      const orderNumber = `IN-${Date.now()}`;
      
      // 验证orderType是否为有效的枚举值
      const validOrderTypes = ["purchase", "return", "transfer", "production"];
      const validatedOrderType = validOrderTypes.includes("purchase") ? "purchase" : "purchase";
      
      const inboundOrderData = {
        orderNumber,
        warehouseId: parseInt(warehouseId),
        totalWeight: "0", // 初始值，后面会更新
        totalVolume: "0", // 初始值，后面会更新 
        createdBy: 1, // 默认用户ID
        status: "pending",
        orderType: validatedOrderType, // 默认为采购入库
        notes: "Imported from Excel",
      };
      
      const inboundOrder = await storage.createInboundOrder(inboundOrderData);
      const importedItems = [];
      
      // Add items from Excel
      for (const row of data) {
        try {
          // Try to find product by barcode
          const barcode = row.barcode || row['Barcode'];
          let productId = row.productId || row['Product ID'];
          
          if (!productId && barcode) {
            const product = await storage.getProductByBarcode(barcode);
            if (product) {
              productId = product.id;
            }
          }
          
          if (!productId) {
            console.warn("Skipping row without product ID or matching barcode:", row);
            continue;
          }
          
          // 获取产品信息以计算重量体积
          const product = await storage.getProduct(parseInt(productId));
          if (!product) {
            console.warn("Skipping row with invalid product ID:", productId);
            continue;
          }
          
          const quantity = parseInt(row.quantity || row['Quantity'] || "0");
          const weight = product.singleWeightKg * quantity;
          const volume = product.singleVolumeM3 * quantity;
          
          // 累加总重量和体积
          totalWeight += weight;
          totalVolume += volume;
          
          // Map Excel columns to order item fields
          const itemData = {
            inboundOrderId: inboundOrder.id,
            productId: parseInt(productId),
            productName: product.name,
            barcode: product.barcode,
            quantity: quantity,
            packageCount: parseInt(row.packageCount || row['Package Count'] || quantity),
            externalOrderNumber: row.externalOrderNumber || row['External Order Number'] || null,
            weight: weight.toString(),
            volume: volume.toString(),
            remark: row.remark || row['Remark'] || null
          };
          
          // Create order item
          const item = await storage.createInboundOrderItem(itemData);
          importedItems.push(item);
        } catch (error) {
          console.error("Error importing item row:", error, row);
          // Continue with next row even if there's an error
        }
      }
      
      // 更新入库单总重量和体积
      if (importedItems.length > 0) {
        await storage.updateInboundOrder(inboundOrder.id, {
          totalWeight: totalWeight.toString(),
          totalVolume: totalVolume.toString()
        });
      }
      
      res.status(201).json({ 
        message: `Successfully created inbound order with ${importedItems.length} items`,
        inboundOrder: {
          ...inboundOrder,
          totalWeight: totalWeight.toString(),
          totalVolume: totalVolume.toString()
        },
        items: importedItems
      });
    } catch (err) {
      console.error("导入入库单失败:", err);
      handleZodError(err, res);
    }
  });
  
  // Import outbound orders from Excel
  apiRouter.post("/import/outbound-orders", async (req, res) => {
    try {
      const { data, warehouseId } = req.body;
      
      if (!Array.isArray(data) || data.length === 0) {
        return res.status(400).json({ error: "Invalid Excel data format" });
      }
      
      if (!warehouseId) {
        return res.status(400).json({ error: "Warehouse ID is required" });
      }
      
      // 计算总重量和总体积
      let totalWeight = 0;
      let totalVolume = 0;
      
      // Create a new outbound order
      const orderNumber = `OUT-${Date.now()}`;
      
      // 验证orderType和destinationType是否为有效的枚举值
      const validOrderTypes = ["sale", "return", "transfer", "scrap"];
      const validatedOrderType = validOrderTypes.includes("sale") ? "sale" : "sale";
      
      const validDestinationTypes = ["customer", "retail", "wholesale", "transfer", "supplier"];
      const validatedDestinationType = validDestinationTypes.includes("customer") ? "customer" : "customer";
      
      const outboundOrderData = {
        orderNumber,
        warehouseId: parseInt(warehouseId),
        totalWeight: "0", // 初始值，后面会更新
        totalVolume: "0", // 初始值，后面会更新
        createdBy: 1, // 默认用户ID
        status: "pending",
        orderType: validatedOrderType, // 默认为销售出库
        destinationType: validatedDestinationType, // 默认为客户
        notes: "Imported from Excel",
      };
      
      const outboundOrder = await storage.createOutboundOrder(outboundOrderData);
      const importedItems = [];
      
      // Add items from Excel
      for (const row of data) {
        try {
          // Try to find product by barcode
          const barcode = row.barcode || row['Barcode'];
          let productId = row.productId || row['Product ID'];
          
          if (!productId && barcode) {
            const product = await storage.getProductByBarcode(barcode);
            if (product) {
              productId = product.id;
            }
          }
          
          if (!productId) {
            console.warn("Skipping row without product ID or matching barcode:", row);
            continue;
          }
          
          // 获取产品信息以计算重量体积
          const product = await storage.getProduct(parseInt(productId));
          if (!product) {
            console.warn("Skipping row with invalid product ID:", productId);
            continue;
          }
          
          const quantity = parseInt(row.quantity || row['Quantity'] || "0");
          const weight = product.singleWeightKg * quantity;
          const volume = product.singleVolumeM3 * quantity;
          
          // 累加总重量和体积
          totalWeight += weight;
          totalVolume += volume;
          
          // Map Excel columns to order item fields
          const itemData = {
            outboundOrderId: outboundOrder.id,
            productId: parseInt(productId),
            productName: product.name,
            barcode: product.barcode,
            quantity: quantity,
            packageCount: parseInt(row.packageCount || row['Package Count'] || quantity),
            externalOrderNumber: row.externalOrderNumber || row['External Order Number'] || null,
            weight: weight.toString(),
            volume: volume.toString(),
            remark: row.remark || row['Remark'] || null
          };
          
          // Create order item
          const item = await storage.createOutboundOrderItem(itemData);
          importedItems.push(item);
        } catch (error) {
          console.error("Error importing item row:", error, row);
          // Continue with next row even if there's an error
        }
      }
      
      // 更新出库单总重量和体积
      if (importedItems.length > 0) {
        await storage.updateOutboundOrder(outboundOrder.id, {
          totalWeight: totalWeight.toString(),
          totalVolume: totalVolume.toString()
        });
      }
      
      res.status(201).json({ 
        message: `Successfully created outbound order with ${importedItems.length} items`,
        outboundOrder: {
          ...outboundOrder,
          totalWeight: totalWeight.toString(),
          totalVolume: totalVolume.toString()
        },
        items: importedItems
      });
    } catch (err) {
      console.error("导入出库单失败:", err);
      handleZodError(err, res);
    }
  });

  // 仓库调拨相关路由
  apiRouter.get("/warehouse-transfers", async (req, res) => {
    try {
      // 获取查询参数
      const sourceWarehouseId = req.query.sourceWarehouseId ? parseInt(req.query.sourceWarehouseId as string) : undefined;
      const targetWarehouseId = req.query.targetWarehouseId ? parseInt(req.query.targetWarehouseId as string) : undefined;
      const status = req.query.status as string | undefined;
      
      // 从数据库查询调拨单列表
      const transfers = await storage.getWarehouseTransfers({
        sourceWarehouseId,
        targetWarehouseId,
        status
      });
      
      // 返回数据
      res.json(transfers);
    } catch (err) {
      console.error("获取仓库调拨列表失败:", err);
      handleZodError(err, res);
    }
  });

  // 处理调拨单文件上传
  apiRouter.post("/warehouse-transfers", upload.single('document'), async (req, res) => {
    try {
      // 解析请求体（注意：由于使用multer，对于multipart/form-data请求，
      // JSON数据需要作为字符串传入，因此需要解析items字段）
      const { sourceWarehouseId, targetWarehouseId, notes } = req.body;
      let items = req.body.items;
      
      // 如果items是字符串，则解析为JSON对象
      if (typeof items === 'string') {
        try {
          items = JSON.parse(items);
        } catch (parseError) {
          return res.status(400).json({ error: "无效的商品列表格式" });
        }
      }
      
      // 验证仓库ID
      const parsedSourceWarehouseId = parseInt(sourceWarehouseId);
      const parsedTargetWarehouseId = parseInt(targetWarehouseId);
      
      if (isNaN(parsedSourceWarehouseId) || isNaN(parsedTargetWarehouseId)) {
        return res.status(400).json({ error: "无效的仓库ID" });
      }
      
      if (parsedSourceWarehouseId === parsedTargetWarehouseId) {
        return res.status(400).json({ error: "源仓库和目标仓库不能相同" });
      }
      
      // 验证商品列表
      if (!items || !Array.isArray(items) || items.length === 0) {
        return res.status(400).json({ error: "调拨单必须包含至少一个商品" });
      }
      
      // 验证并处理商品列表
      const processedItems = items.map(item => {
        // 安全地转换数字字段
        const weight = (typeof item.weight === 'number') ? item.weight.toString() : (item.weight || "0");
        const volume = (typeof item.volume === 'number') ? item.volume.toString() : (item.volume || "0");
        const quantity = item.quantity ? parseInt(item.quantity) : 0;
        const packageCount = item.packageCount ? parseInt(item.packageCount) : quantity;
        
        return {
          ...item,
          weight,
          volume,
          quantity,
          packageCount
        };
      });
      
      // 生成调拨单号
      const referenceNumber = `TRANSFER-${Date.now()}`;
      
      // 1. 创建出库单
      const outboundOrderNumber = `OUT-${referenceNumber}`;
      
      // 验证orderType和destinationType是否为有效的枚举值
      const validOutboundOrderTypes = ["sale", "return", "transfer", "scrap"];
      const validatedOutboundOrderType = validOutboundOrderTypes.includes("transfer") ? "transfer" : "transfer";
      
      const validDestinationTypes = ["customer", "retail", "wholesale", "transfer", "supplier"];
      const validatedDestinationType = validDestinationTypes.includes("transfer") ? "transfer" : "transfer";
      
      // 计算总重量和体积
      const totalWeight = processedItems
        .reduce((sum, item) => sum + parseFloat(item.weight), 0)
        .toString();
        
      const totalVolume = processedItems
        .reduce((sum, item) => sum + parseFloat(item.volume), 0)
        .toString();
      
      const outboundOrderData = {
        orderNumber: outboundOrderNumber,
        warehouseId: parsedSourceWarehouseId,
        totalWeight,
        totalVolume,
        createdBy: 1, // 假设用户ID为1
        status: "pending",
        orderType: validatedOutboundOrderType as any, // 类型强制转换以解决TypeScript错误
        notes: notes || "仓库调拨出库单",
        destinationType: validatedDestinationType as any // 类型强制转换以解决TypeScript错误
      };
      
      const outboundOrder = await storage.createOutboundOrder(outboundOrderData);
      
      // 2. 创建入库单
      const inboundOrderNumber = `IN-${referenceNumber}`;
      
      // 验证orderType是否为有效的枚举值
      const validInboundOrderTypes = ["purchase", "return", "transfer", "production"];
      const validatedInboundOrderType = validInboundOrderTypes.includes("transfer") ? "transfer" : "transfer";
      
      const inboundOrderData = {
        orderNumber: inboundOrderNumber,
        warehouseId: parsedTargetWarehouseId,
        totalWeight,
        totalVolume,
        createdBy: 1, // 假设用户ID为1
        status: "pending",
        orderType: validatedInboundOrderType as any, // 类型强制转换以解决TypeScript错误
        notes: notes || "仓库调拨入库单"
      };
      
      const inboundOrder = await storage.createInboundOrder(inboundOrderData);
      
      // 3. 为出库单和入库单添加明细项
      const outboundItems = [];
      const inboundItems = [];
      const errorMessages = [];
      
      for (const item of processedItems) {
        try {
          // 解析产品ID
          const productId = parseInt(item.productId);
          if (isNaN(productId)) {
            errorMessages.push(`产品ID "${item.productId}" 无效，已跳过`);
            continue;
          }
          
          // 获取产品信息以填充必要字段
          const product = await storage.getProduct(productId);
          if (!product) {
            errorMessages.push(`未找到ID为 ${productId} 的产品，已跳过`);
            continue;
          }
  
          // 添加出库单明细
          const outboundItem = await storage.createOutboundOrderItem({
            outboundOrderId: outboundOrder.id,
            productId,
            productName: product.name,
            barcode: product.barcode,
            quantity: item.quantity,
            packageCount: item.packageCount,
            externalOrderNumber: referenceNumber,
            weight: item.weight,
            volume: item.volume,
            remark: "调拨出库"
          });
          outboundItems.push(outboundItem);
          
          // 添加入库单明细
          const inboundItem = await storage.createInboundOrderItem({
            inboundOrderId: inboundOrder.id,
            productId,
            productName: product.name,
            barcode: product.barcode,
            quantity: item.quantity,
            packageCount: item.packageCount,
            externalOrderNumber: referenceNumber,
            weight: item.weight,
            volume: item.volume,
            remark: "调拨入库"
          });
          inboundItems.push(inboundItem);
        } catch (itemError) {
          console.error("处理调拨商品失败:", itemError);
          errorMessages.push(`处理商品失败: ${(itemError as Error).message}`);
        }
      }
      
      // 4. 处理上传的文件信息
      let documentFilePath = null;
      let documentFileName = null;
      let documentFileType = null;
      let documentUploadedAt = null;
      
      if (req.file) {
        documentFilePath = req.file.path;
        documentFileName = req.file.originalname;
        documentFileType = req.file.mimetype;
        documentUploadedAt = new Date();
        
        console.log("文件上传成功:", {
          path: documentFilePath,
          name: documentFileName,
          type: documentFileType
        });
      }
      
      // 5. 创建调拨单记录
      try {
        const warehouseTransferData = {
          referenceNumber,
          sourceWarehouseId: parsedSourceWarehouseId,
          targetWarehouseId: parsedTargetWarehouseId,
          totalItems: processedItems.reduce((sum, item) => sum + item.quantity, 0),
          totalPackages: processedItems.reduce((sum, item) => sum + item.packageCount, 0),
          totalWeight,
          totalVolume,
          status: "pending",
          notes: notes || "",
          outboundOrderId: outboundOrder.id,
          inboundOrderId: inboundOrder.id,
          documentFilePath,
          documentFileName,
          documentFileType,
          documentUploadedAt
        };
        
        const warehouseTransfer = await storage.createWarehouseTransfer(warehouseTransferData);
        
        // 6. 返回创建的数据
        res.status(201).json({
          message: "仓库调拨创建成功" + (errorMessages.length > 0 ? "，但有部分商品处理失败" : ""),
          referenceNumber,
          warehouseTransfer,
          sourceWarehouseId: parsedSourceWarehouseId,
          targetWarehouseId: parsedTargetWarehouseId,
          errors: errorMessages.length > 0 ? errorMessages : undefined,
          outboundOrder,
          inboundOrder,
          outboundItems,
          inboundItems,
          documentUploaded: !!req.file
        });
      } catch (transferError) {
        console.error("创建调拨单记录失败:", transferError);
        
        // 即使调拨单创建失败，仍然返回出入库单信息，便于前端处理
        res.status(201).json({
          message: "仓库调拨部分完成，出入库单已创建，但调拨单记录创建失败",
          referenceNumber,
          sourceWarehouseId: parsedSourceWarehouseId,
          targetWarehouseId: parsedTargetWarehouseId,
          error: (transferError as Error).message,
          errors: errorMessages.length > 0 ? errorMessages : undefined,
          outboundOrder,
          inboundOrder,
          outboundItems,
          inboundItems,
          documentUploaded: !!req.file
        });
      }
    } catch (err) {
      console.error("创建仓库调拨失败:", err);
      handleZodError(err, res);
    }
  });

  apiRouter.get("/warehouse-transfers/stats", async (req, res) => {
    try {
      // 从数据库获取统计数据
      const stats = await storage.getWarehouseTransferStats();
      
      // 返回调拨单统计数据
      res.json(stats);
    } catch (err) {
      console.error("获取仓库调拨统计数据失败:", err);
      handleZodError(err, res);
    }
  });
  
  // Excel模板下载路由
  apiRouter.get("/warehouse-transfers/template", async (req, res) => {
    try {
      // 创建模板文件 (使用await等待文件写入完成)
      const templatePath = await createTransferImportTemplate();
      
      // 发送文件给客户端
      downloadWithCleanup(res, templatePath, "warehouse_transfer_template.xlsx");
    } catch (err) {
      console.error("创建模板文件失败:", err);
      res.status(500).json({ message: "创建模板文件失败", error: err.message });
    }
  });
  
  // Excel预览路由 - 解析Excel但不导入数据
  apiRouter.post("/warehouse-transfers/preview-import", upload.single('file'), async (req, res) => {
    try {
      if (!req.file) {
        return res.status(400).json({ message: "请上传Excel文件" });
      }
      
      // 解析导入的Excel文件，并通过storage验证唯一码
      const { items, errors, warnings, matchedCount, unmatchedCount } = await parseTransferImportFile(req.file.path, storage);
      
      // 处理预览数据，添加匹配信息
      const preview = await Promise.all(items.map(async (item, index) => {
        // 如果已经直接匹配到了产品（通过唯一码）
        if (item.matched && item.matchedProduct) {
          const product = item.matchedProduct;
          return {
            row: index + 2, // 从Excel的第2行开始（第1行是表头）
            uniqueCode: item.uniqueCode || '',
            productId: product.id,
            productName: product.name,
            barcode: product.barcode,
            quantity: item.quantity,
            packageCount: item.packageCount,
            weight: item.weight || (product.singleWeightKg * item.quantity),
            volume: item.volume || (product.singleVolumeM3 * item.quantity),
            status: '已匹配 (唯一码)',
            matched: true,
            matchSource: '唯一码'
          };
        } 
        // 否则，检查是否有产品ID可以匹配
        else if (item.productId) {
          try {
            const product = await storage.getProduct(item.productId);
            if (product) {
              return {
                row: index + 2,
                uniqueCode: item.uniqueCode || '',
                productId: product.id,
                productName: product.name,
                barcode: product.barcode,
                quantity: item.quantity,
                packageCount: item.packageCount,
                weight: item.weight || (product.singleWeightKg * item.quantity),
                volume: item.volume || (product.singleVolumeM3 * item.quantity),
                status: '已匹配 (产品ID)',
                matched: true,
                matchSource: '产品ID'
              };
            }
          } catch (error) {
            console.warn(`获取产品ID ${item.productId} 失败:`, error);
          }
        }
        
        // 未匹配到产品的情况
        return {
          row: index + 2,
          uniqueCode: item.uniqueCode || '',
          productId: item.productId,
          productName: item.productName || '未知产品',
          barcode: '',
          quantity: item.quantity,
          packageCount: item.packageCount,
          weight: item.weight || 0,
          volume: item.volume || 0,
          status: '未匹配',
          matched: false,
          matchSource: '无'
        };
      }));
      
      // 返回预览数据
      res.status(200).json({
        preview,
        errors,
        warnings,
        stats: {
          matchedCount,
          unmatchedCount,
          totalCount: items.length
        }
      });
      
    } catch (err) {
      console.error("预览Excel文件失败:", err);
      res.status(500).json({ message: "预览Excel文件失败", error: err.message });
    }
  });
  
  // Excel导入路由 - 使用multer处理文件上传并创建调拨单
  apiRouter.post("/warehouse-transfers/import", upload.single('file'), async (req, res) => {
    try {
      if (!req.file) {
        return res.status(400).json({ message: "请上传Excel文件" });
      }
      
      // 获取源仓库和目标仓库ID
      const sourceWarehouseId = parseInt(req.body.sourceWarehouseId);
      const targetWarehouseId = parseInt(req.body.targetWarehouseId);
      const notes = req.body.notes || '';
      
      if (isNaN(sourceWarehouseId) || isNaN(targetWarehouseId)) {
        return res.status(400).json({ message: "请提供有效的源仓库和目标仓库ID" });
      }
      
      // 解析导入的Excel文件，使用storage进行产品验证
      const { items, errors, warnings, matchedCount, unmatchedCount } = await parseTransferImportFile(req.file.path, storage);
      
      // 如果有验证错误，返回错误信息
      if (errors.length > 0) {
        return res.status(400).json({ 
          message: "导入文件包含错误",
          errors,
          warnings,
          matchedCount,
          unmatchedCount,
          itemsCount: items.length,
          // 如果有有效的项目，一并返回
          items: items.length > 0 ? items : undefined
        });
      }
      
      // 计算总数据
      let totalWeight = 0;
      let totalVolume = 0;
      let totalItems = items.length;
      let totalPackages = 0;
      
      items.forEach(item => {
        totalPackages += item.packageCount;
        if (item.weight) totalWeight += item.weight;
        if (item.volume) totalVolume += item.volume;
      });
      
      // 创建调拨单
      const transfer = await storage.createWarehouseTransfer({
        sourceWarehouseId,
        targetWarehouseId,
        totalItems,
        totalPackages,
        totalWeight: totalWeight.toString(),
        totalVolume: totalVolume.toString(),
        status: "pending",
        notes,
        createdBy: 1, // 默认用户ID
      });
      
      // 添加调拨单项目
      for (const item of items) {
        // 如果有匹配的产品（通过唯一码或产品ID）
        if ((item.matched && item.matchedProduct) || item.productId) {
          let productId: number;
          
          // 如果是通过唯一码匹配的，使用匹配产品的ID
          if (item.matched && item.matchedProduct) {
            productId = item.matchedProduct.id;
          } else if (item.productId) {
            productId = item.productId;
          } else {
            console.warn("跳过无效产品ID的调拨项目");
            continue; // 跳过无效的项目
          }
          
          await storage.createWarehouseTransferItem({
            transferId: transfer.id,
            productId: productId,
            quantity: item.quantity,
            packageCount: item.packageCount,
            weight: item.weight ? item.weight.toString() : "0",
            volume: item.volume ? item.volume.toString() : "0",
            uniqueCode: item.uniqueCode,
            remark: item.remark || `通过${item.matched ? '唯一码' : '产品ID'}匹配`
          });
        }
      }
      
      // 返回创建的调拨单信息
      res.status(201).json({
        message: "成功创建仓库调拨单",
        id: transfer.id,
        referenceNumber: transfer.referenceNumber,
        totalItems,
        status: transfer.status
      });
      
    } catch (err) {
      console.error("导入Excel文件失败:", err);
      const errorMessage = err instanceof Error ? err.message : String(err);
      res.status(500).json({ message: "导入Excel文件失败", error: errorMessage });
    }
  });
  
  // Excel导出路由
  // 导出所有调拨单到Excel
  // 导出多个选定的调拨单（根据ID列表）
  apiRouter.post("/warehouse-transfers/export-selected", async (req, res) => {
    try {
      const { transferIds } = req.body;
      
      if (!transferIds || !Array.isArray(transferIds) || transferIds.length === 0) {
        return res.status(400).json({ error: "No transfer IDs provided" });
      }
      
      // 获取所有请求的调拨单
      const transfers = [];
      for (const id of transferIds) {
        const transfer = await storage.getWarehouseTransfer(parseInt(id));
        if (transfer) {
          // 获取源仓库和目标仓库信息
          const sourceWarehouse = await storage.getWarehouse(transfer.sourceWarehouseId);
          const targetWarehouse = await storage.getWarehouse(transfer.targetWarehouseId);
          
          // 获取调拨单明细
          const items = await storage.getWarehouseTransferItems(transfer.id);
          
          // 将调拨单和相关信息添加到导出列表
          transfers.push({
            transfer,
            sourceWarehouse,
            targetWarehouse,
            items
          });
        }
      }
      
      if (transfers.length === 0) {
        return res.status(404).json({ error: "No valid transfers found" });
      }
      
      try {
        // 使用excel-handler导出多个调拨单(异步)
        const filePath = await exportMultipleTransfersToExcel(transfers);
        
        // 生成导出文件名
        const dateStr = new Date().toISOString().split('T')[0];
        const filename = `transfers_export_${dateStr}.xlsx`;
        
        // 使用文件清理工具处理下载和清理
        downloadWithCleanup(res, filePath, filename);
      } catch (exportError) {
        console.error("Export error:", exportError);
        return res.status(500).json({ error: "导出文件生成失败" });
      }
    } catch (error) {
      console.error("Error exporting selected transfers:", error);
      res.status(500).json({ error: "Failed to export transfers" });
    }
  });

  apiRouter.get("/warehouse-transfers/export-all", async (req, res) => {
    try {
      console.log("正在处理批量导出调拨单请求", req.query);
      
      let transfers = [];
      
      // 判断是否提供了多个订单ID（使用ids参数）
      if (req.query.ids) {
        // 解析传入的ids数组
        const ids = (req.query.ids as string).split(',').map(id => parseInt(id.trim()));
        console.log(`正在按ID列表导出 ${ids.length} 条调拨单`, ids);
        
        // 获取多个指定ID的调拨单
        const transferPromises = ids.map(id => storage.getWarehouseTransfer(id));
        const transferResults = await Promise.all(transferPromises);
        
        // 过滤掉未找到的调拨单
        transfers = transferResults.filter(transfer => transfer !== undefined) as any[];
      } else {
        // 构建过滤参数 (与前端页面筛选相同)
        const filter: any = {};
        
        // 状态过滤
        if (req.query.status) {
          filter.status = req.query.status as string;
        }
        
        // 仓库过滤 (源仓库或目标仓库)
        if (req.query.warehouseId) {
          const warehouseId = parseInt(req.query.warehouseId as string);
          // 简化处理，实际应该用OR条件查询两个字段
          filter.sourceWarehouseId = warehouseId;
        }
        
        // 获取调拨单列表
        transfers = await storage.getWarehouseTransfers(filter);
      }
      
      console.log(`找到 ${transfers.length} 条符合条件的调拨单记录`);
      
      // 获取每个调拨单的源仓库和目标仓库信息
      const transfersWithWarehouseInfo = await Promise.all(
        transfers.map(async transfer => {
          // 获取源仓库和目标仓库
          const sourceWarehouse = await storage.getWarehouse(transfer.sourceWarehouseId);
          const targetWarehouse = await storage.getWarehouse(transfer.targetWarehouseId);
          
          // 获取创建人信息
          const creator = await storage.getUser(transfer.createdBy);
          
          return {
            ...transfer,
            sourceWarehouse: sourceWarehouse || { id: transfer.sourceWarehouseId, name: '未知仓库', location: '' },
            targetWarehouse: targetWarehouse || { id: transfer.targetWarehouseId, name: '未知仓库', location: '' },
            creator: creator || undefined
          };
        })
      );
      
      try {
        // 导出到Excel(异步)
        const excelFilePath = await exportMultipleTransfersToExcel(transfersWithWarehouseInfo);
        
        // 生成导出文件名
        const dateStr = new Date().toISOString().split('T')[0];
        const filename = `transfers_export_${dateStr}.xlsx`;
        
        // 使用文件清理工具处理下载和清理
        downloadWithCleanup(res, excelFilePath, filename);
      } catch (exportError) {
        console.error("导出Excel文件生成失败:", exportError);
        return res.status(500).json({ error: "导出Excel文件生成失败" });
      }
      
    } catch (err) {
      console.error("批量导出Excel文件失败:", err);
      const errorMessage = err instanceof Error ? err.message : String(err);
      res.status(500).json({ message: "批量导出Excel文件失败", error: errorMessage });
    }
  });

  apiRouter.get("/warehouse-transfers/:id/export", async (req, res) => {
    try {
      const transferId = parseInt(req.params.id);
      const transfer = await storage.getWarehouseTransfer(transferId);
      
      if (!transfer) {
        return res.status(404).json({ message: "调拨单不存在" });
      }
      
      // 获取调拨单项目
      const items = await storage.getWarehouseTransferItems(transferId);
      
      // 获取源仓库和目标仓库
      const sourceWarehouse = await storage.getWarehouse(transfer.sourceWarehouseId);
      const targetWarehouse = await storage.getWarehouse(transfer.targetWarehouseId);
      
      if (!sourceWarehouse || !targetWarehouse) {
        return res.status(400).json({ message: "仓库信息不完整" });
      }
      
      // 获取所有相关商品
      const productIds = items.map(item => item.productId);
      const productPromises = productIds.map(id => storage.getProduct(id));
      const productsArray = await Promise.all(productPromises);
      
      // 转换为对象，以便于通过ID查找
      const products: Record<number, any> = {};
      productsArray.forEach(product => {
        if (product) {
          products[product.id] = product;
        }
      });
      
      // 导出Excel文件（使用await等待导出完成）
      const filePath = await exportTransferToExcel(
        transfer, 
        items, 
        sourceWarehouse, 
        targetWarehouse, 
        products
      );
      
      // 生成文件名
      const filename = `transfer_${transfer.referenceNumber}.xlsx`;
      
      // 使用文件清理工具处理下载和清理
      downloadWithCleanup(res, filePath, filename);
      
    } catch (err) {
      console.error("导出Excel文件失败:", err);
      const errorMessage = err instanceof Error ? err.message : String(err);
      res.status(500).json({ message: "导出Excel文件失败", error: errorMessage });
    }
  });

  // 入库单统计路由
  apiRouter.get("/inbound-orders/stats", async (req, res) => {
    try {
      // 获取入库单数据进行统计
      const orders = await storage.getInboundOrders();
      
      // 计算统计数据
      const totalOrders = orders.length;
      const pendingOrders = orders.filter(order => order.status === "pending").length;
      const completedOrders = orders.filter(order => order.status === "completed").length;
      
      // 计算总重量和总体积
      const totalWeight = orders.reduce((sum: number, order) => sum + (parseFloat(order.totalWeight as string) || 0), 0);
      const totalVolume = orders.reduce((sum: number, order) => sum + (parseFloat(order.totalVolume as string) || 0), 0);
      
      // 订单类型分布
      const orderTypes = ['purchase', 'return', 'transfer'];
      const orderTypeDistribution = orderTypes.map(type => {
        const count = orders.filter(order => order.orderType === type).length;
        return {
          type,
          count,
          percentage: totalOrders > 0 ? (count / totalOrders) * 100 : 0
        };
      });
      
      res.json({
        totalOrders,
        pendingOrders,
        completedOrders,
        totalWeight,
        totalVolume,
        orderTypeDistribution
      });
    } catch (err) {
      handleZodError(err, res);
    }
  });
  
  // 出库单统计路由
  apiRouter.get("/outbound-orders/stats", async (req, res) => {
    try {
      // 获取出库单数据进行统计
      const orders = await storage.getOutboundOrders();
      
      // 计算统计数据
      const totalOrders = orders.length;
      const pendingOrders = orders.filter(order => order.status === "pending").length;
      const completedOrders = orders.filter(order => order.status === "completed").length;
      
      // 计算总重量和总体积
      const totalWeight = orders.reduce((sum: number, order) => sum + (parseFloat(order.totalWeight as string) || 0), 0);
      const totalVolume = orders.reduce((sum: number, order) => sum + (parseFloat(order.totalVolume as string) || 0), 0);
      
      // 订单类型分布
      const orderTypes = ['sale', 'return', 'transfer'];
      const orderTypeDistribution = orderTypes.map(type => {
        const count = orders.filter(order => order.orderType === type).length;
        return {
          type,
          count,
          percentage: totalOrders > 0 ? (count / totalOrders) * 100 : 0
        };
      });
      
      // 目的地类型分布
      const destinationTypes = ['customer', 'retail', 'wholesale', 'transfer'];
      const destinationTypeDistribution = destinationTypes.map(type => {
        const count = orders.filter(order => order.destinationType === type).length;
        return {
          type,
          count,
          percentage: totalOrders > 0 ? (count / totalOrders) * 100 : 0
        };
      });
      
      res.json({
        totalOrders,
        pendingOrders,
        completedOrders,
        totalWeight,
        totalVolume,
        orderTypeDistribution,
        destinationTypeDistribution
      });
    } catch (err) {
      handleZodError(err, res);
    }
  });

  // 仓库名称映射相关API
  apiRouter.get("/warehouse-mappings", async (req, res) => {
    try {
      const warehouseMatcher = await import('./utils/warehouse-matcher');
      const mappings = warehouseMatcher.getAllWarehouseMappings();
      res.json(mappings);
    } catch (err) {
      console.error("获取仓库映射失败:", err);
      handleZodError(err, res);
    }
  });
  
  apiRouter.post("/warehouse-mappings", async (req, res) => {
    try {
      const { externalName, internalId } = req.body;
      
      if (!externalName || !internalId) {
        return res.status(400).json({ error: "外部仓库名称和内部仓库ID都是必填项" });
      }
      
      const warehouseMatcher = await import('./utils/warehouse-matcher');
      warehouseMatcher.addWarehouseMapping(externalName, parseInt(internalId));
      
      res.status(201).json({ 
        message: "仓库映射添加成功",
        externalName,
        internalId
      });
    } catch (err) {
      console.error("添加仓库映射失败:", err);
      handleZodError(err, res);
    }
  });
  
  apiRouter.delete("/warehouse-mappings/:externalName", async (req, res) => {
    try {
      const { externalName } = req.params;
      
      const warehouseMatcher = await import('./utils/warehouse-matcher');
      warehouseMatcher.removeWarehouseMapping(externalName);
      
      res.status(204).end();
    } catch (err) {
      console.error("删除仓库映射失败:", err);
      handleZodError(err, res);
    }
  });
  
  apiRouter.post("/warehouse-mappings/suggestion", async (req, res) => {
    try {
      const { externalName } = req.body;
      
      if (!externalName) {
        return res.status(400).json({ error: "外部仓库名称是必填项" });
      }
      
      // 获取所有仓库
      const warehouses = await storage.getWarehouses();
      
      const warehouseMatcher = await import('./utils/warehouse-matcher');
      const suggestion = warehouseMatcher.findMostSimilarWarehouse(
        externalName,
        warehouses.map(w => ({ id: w.id, name: w.name }))
      );
      
      res.json({
        externalName,
        suggestion
      });
    } catch (err) {
      console.error("获取仓库匹配建议失败:", err);
      handleZodError(err, res);
    }
  });

  // Stats routes
  apiRouter.get("/stats/language-distribution", async (req, res) => {
    try {
      const distribution = await storage.getLanguageDistribution();
      res.json(distribution);
    } catch (err) {
      handleZodError(err, res);
    }
  });
  
  apiRouter.get("/stats", async (req, res) => {
    try {
      // 获取代码仓库统计信息
      const repoStats = await storage.getRepositoryStats();
      
      // 获取产品统计信息
      const productStats = await storage.getProductsStats();
      
      // 合并统计信息
      const combinedStats = {
        ...repoStats,
        ...productStats,
        // 增加仓库系统相关统计
        totalWarehouses: (await storage.getWarehouses()).length
      };
      
      res.json(combinedStats);
    } catch (err) {
      console.error("Error getting combined stats:", err);
      handleZodError(err, res);
    }
  });
  
  // 导出入库单Excel
  apiRouter.get("/inbound-orders/export/:id", async (req, res) => {
    try {
      const orderId = parseInt(req.params.id);
      const order = await storage.getInboundOrder(orderId);
      
      if (!order) {
        return res.status(404).json({ message: "入库单不存在" });
      }
      
      // 获取入库单项目
      const items = await storage.getInboundOrderItems(orderId);
      
      // 获取仓库信息
      const warehouse = await storage.getWarehouse(order.warehouseId);
      
      if (!warehouse) {
        return res.status(400).json({ message: "仓库信息不完整" });
      }
      
      // 导出Excel文件
      const exceljs = require("exceljs");
      const workbook = new exceljs.Workbook();
      const worksheet = workbook.addWorksheet("入库单");
      
      // 添加标题行
      worksheet.addRow(["入库单号", "仓库", "状态", "创建时间", "总重量(kg)", "总体积(m³)"]);
      
      // 添加入库单信息
      worksheet.addRow([
        order.orderNumber,
        warehouse.name,
        order.status,
        new Date(order.createdAt).toLocaleString(),
        order.totalWeight,
        order.totalVolume
      ]);
      
      // 添加空行
      worksheet.addRow([]);
      
      // 添加项目标题行
      worksheet.addRow(["产品名称", "条码", "唯一码", "数量", "包装数", "重量(kg)", "体积(m³)", "外部订单号", "备注"]);
      
      // 添加项目数据
      for (const item of items) {
        worksheet.addRow([
          item.productName,
          item.barcode,
          item.uniqueCode || "",
          item.quantity,
          item.packageCount,
          item.weight,
          item.volume,
          item.externalOrderNumber || "",
          item.remark || ""
        ]);
      }
      
      // 设置宽度
      worksheet.columns.forEach(column => {
        column.width = 20;
      });
      
      // 生成文件路径
      const filePath = path.join(process.cwd(), "public", "exports", `inbound_order_${order.orderNumber}_${new Date().toISOString().replace(/:/g, "-")}.xlsx`);
      
      // 确保导出目录存在
      const dirname = path.dirname(filePath);
      if (!fs.existsSync(dirname)) {
        fs.mkdirSync(dirname, { recursive: true });
      }
      
      // 写入文件
      await workbook.xlsx.writeFile(filePath);
      
            // 生成文件名
      const filename = path.basename(filePath);
      
      // 使用文件清理工具处理下载和清理
      downloadWithCleanup(res, filePath, filename);
      
    } catch (err) {
      console.error("导出Excel文件失败:", err);
      const errorMessage = err instanceof Error ? err.message : String(err);
      res.status(500).json({ message: "导出Excel文件失败", error: errorMessage });
    }
  });
  
  // 批量导出入库单Excel
  apiRouter.get("/inbound-orders/export-batch", async (req, res) => {
    try {
      console.log("正在处理批量导出入库单请求", req.query);
      
      let orders = [];
      
      // 判断是否提供了多个订单ID
      if (req.query.ids) {
        // 解析传入的ids数组
        const ids = (req.query.ids as string).split(',').map(id => parseInt(id.trim()));
        console.log(`正在按ID列表导出 ${ids.length} 条入库单`, ids);
        
        // 获取多个指定ID的入库单
        const orderPromises = ids.map(id => storage.getInboundOrder(id));
        const orderResults = await Promise.all(orderPromises);
        
        // 过滤掉未找到的入库单
        orders = orderResults.filter(order => order !== undefined) as any[];
      } else {
        // 构建过滤参数
        const filter: any = {};
        
        // 状态过滤
        if (req.query.status) {
          filter.status = req.query.status as string;
        }
        
        // 仓库过滤
        if (req.query.warehouseId) {
          filter.warehouseId = parseInt(req.query.warehouseId as string);
        }
        
        // 获取入库单列表
        orders = await storage.getInboundOrders(filter);
      }
      
      console.log(`找到 ${orders.length} 条符合条件的入库单记录`);
      
      if (orders.length === 0) {
        return res.status(404).json({ message: "未找到符合条件的入库单" });
      }
      
      // 导出Excel文件
      const exceljs = require("exceljs");
      const workbook = new exceljs.Workbook();
      const worksheet = workbook.addWorksheet("入库单列表");
      
      // 添加标题行
      worksheet.addRow(["入库单号", "仓库", "状态", "创建时间", "总重量(kg)", "总体积(m³)", "订单类型", "备注"]);
      
      // 添加每个入库单的信息
      for (const order of orders) {
        // 获取仓库信息
        const warehouse = await storage.getWarehouse(order.warehouseId);
        const warehouseName = warehouse ? warehouse.name : '未知仓库';
        
        worksheet.addRow([
          order.orderNumber,
          warehouseName,
          order.status,
          new Date(order.createdAt).toLocaleString(),
          order.totalWeight,
          order.totalVolume,
          order.orderType || '',
          order.notes || ''
        ]);
      }
      
      // 为每个入库单创建单独的工作表，包含详细信息
      for (const order of orders) {
        const orderWorksheet = workbook.addWorksheet(`入库单-${order.orderNumber}`);
        
        // 获取仓库信息
        const warehouse = await storage.getWarehouse(order.warehouseId);
        const warehouseName = warehouse ? warehouse.name : '未知仓库';
        
        // 添加入库单标题行
        orderWorksheet.addRow(["入库单号", "仓库", "状态", "创建时间", "总重量(kg)", "总体积(m³)"]);
        
        // 添加入库单信息
        orderWorksheet.addRow([
          order.orderNumber,
          warehouseName,
          order.status,
          new Date(order.createdAt).toLocaleString(),
          order.totalWeight,
          order.totalVolume
        ]);
        
        // 添加空行
        orderWorksheet.addRow([]);
        
        // 获取入库单项目
        const items = await storage.getInboundOrderItems(order.id);
        
        // 添加项目标题行
        orderWorksheet.addRow(["产品名称", "条码", "唯一码", "数量", "包装数", "重量(kg)", "体积(m³)", "外部订单号", "备注"]);
        
        // 添加项目数据
        for (const item of items) {
          orderWorksheet.addRow([
            item.productName,
            item.barcode,
            item.uniqueCode || "", 
            item.quantity,
            item.packageCount,
            item.weight,
            item.volume,
            item.externalOrderNumber || "",
            item.remark || ""
          ]);
        }
        
        // 设置宽度
        orderWorksheet.columns.forEach(column => {
          column.width = 20;
        });
      }
      
      // 设置主工作表宽度
      worksheet.columns.forEach(column => {
        column.width = 20;
      });
      
      // 生成文件路径
      const timestamp = new Date().toISOString().replace(/:/g, "-");
      const filePath = path.join(process.cwd(), "public", "exports", `inbound_orders_batch_${timestamp}.xlsx`);
      
      // 确保导出目录存在
      const dirname = path.dirname(filePath);
      if (!fs.existsSync(dirname)) {
        fs.mkdirSync(dirname, { recursive: true });
      }
      
      // 写入文件
      await workbook.xlsx.writeFile(filePath);
      
            // 生成文件名
      const filename = path.basename(filePath);
      
      // 使用文件清理工具处理下载和清理
      downloadWithCleanup(res, filePath, filename);
      
    } catch (err) {
      console.error("批量导出Excel文件失败:", err);
      const errorMessage = err instanceof Error ? err.message : String(err);
      res.status(500).json({ message: "批量导出Excel文件失败", error: errorMessage });
    }
  });
  
  // 导出出库单Excel
  apiRouter.get("/outbound-orders/export/:id", async (req, res) => {
    try {
      const orderId = parseInt(req.params.id);
      const order = await storage.getOutboundOrder(orderId);
      
      if (!order) {
        return res.status(404).json({ message: "出库单不存在" });
      }
      
      // 获取出库单项目
      const items = await storage.getOutboundOrderItems(orderId);
      
      // 获取仓库信息
      const warehouse = await storage.getWarehouse(order.warehouseId);
      
      if (!warehouse) {
        return res.status(400).json({ message: "仓库信息不完整" });
      }
      
      // 导出Excel文件
      const exceljs = require("exceljs");
      const workbook = new exceljs.Workbook();
      const worksheet = workbook.addWorksheet("出库单");
      
      // 添加标题行
      worksheet.addRow(["出库单号", "仓库", "状态", "创建时间", "总重量(kg)", "总体积(m³)"]);
      
      // 添加出库单信息
      worksheet.addRow([
        order.orderNumber,
        warehouse.name,
        order.status,
        new Date(order.createdAt).toLocaleString(),
        order.totalWeight,
        order.totalVolume
      ]);
      
      // 添加空行
      worksheet.addRow([]);
      
      // 添加项目标题行
      worksheet.addRow(["产品名称", "条码", "唯一码", "数量", "包装数", "重量(kg)", "体积(m³)", "外部订单号", "备注"]);
      
      // 添加项目数据
      for (const item of items) {
        worksheet.addRow([
          item.productName,
          item.barcode,
          item.uniqueCode || "",
          item.quantity,
          item.packageCount,
          item.weight,
          item.volume,
          item.externalOrderNumber || "",
          item.remark || ""
        ]);
      }
      
      // 设置宽度
      worksheet.columns.forEach(column => {
        column.width = 20;
      });
      
      // 生成文件路径
      const filePath = path.join(process.cwd(), "public", "exports", `outbound_order_${order.orderNumber}_${new Date().toISOString().replace(/:/g, "-")}.xlsx`);
      
      // 确保导出目录存在
      const dirname = path.dirname(filePath);
      if (!fs.existsSync(dirname)) {
        fs.mkdirSync(dirname, { recursive: true });
      }
      
      // 写入文件
      await workbook.xlsx.writeFile(filePath);
      
            // 生成文件名
      const filename = path.basename(filePath);
      
      // 使用文件清理工具处理下载和清理
      downloadWithCleanup(res, filePath, filename);
      
    } catch (err) {
      console.error("导出Excel文件失败:", err);
      const errorMessage = err instanceof Error ? err.message : String(err);
      res.status(500).json({ message: "导出Excel文件失败", error: errorMessage });
    }
  });
  
  // 批量导出出库单Excel
  apiRouter.get("/outbound-orders/export-batch", async (req, res) => {
    try {
      console.log("正在处理批量导出出库单请求", req.query);
      
      let orders = [];
      
      // 判断是否提供了多个订单ID
      if (req.query.ids) {
        // 解析传入的ids数组
        const ids = (req.query.ids as string).split(',').map(id => parseInt(id.trim()));
        console.log(`正在按ID列表导出 ${ids.length} 条出库单`, ids);
        
        // 获取多个指定ID的出库单
        const orderPromises = ids.map(id => storage.getOutboundOrder(id));
        const orderResults = await Promise.all(orderPromises);
        
        // 过滤掉未找到的出库单
        orders = orderResults.filter(order => order !== undefined) as any[];
      } else {
        // 构建过滤参数
        const filter: any = {};
        
        // 状态过滤
        if (req.query.status) {
          filter.status = req.query.status as string;
        }
        
        // 仓库过滤
        if (req.query.warehouseId) {
          filter.warehouseId = parseInt(req.query.warehouseId as string);
        }
        
        // 获取出库单列表
        orders = await storage.getOutboundOrders(filter);
      }
      
      console.log(`找到 ${orders.length} 条符合条件的出库单记录`);
      
      if (orders.length === 0) {
        return res.status(404).json({ message: "未找到符合条件的出库单" });
      }
      
      // 导出Excel文件
      const exceljs = require("exceljs");
      const workbook = new exceljs.Workbook();
      const worksheet = workbook.addWorksheet("出库单列表");
      
      // 添加标题行
      worksheet.addRow(["出库单号", "仓库", "状态", "创建时间", "总重量(kg)", "总体积(m³)", "订单类型", "目的地类型", "备注"]);
      
      // 添加每个出库单的信息
      for (const order of orders) {
        // 获取仓库信息
        const warehouse = await storage.getWarehouse(order.warehouseId);
        const warehouseName = warehouse ? warehouse.name : '未知仓库';
        
        worksheet.addRow([
          order.orderNumber,
          warehouseName,
          order.status,
          new Date(order.createdAt).toLocaleString(),
          order.totalWeight,
          order.totalVolume,
          order.orderType || '',
          order.destinationType || '',
          order.notes || ''
        ]);
      }
      
      // 为每个出库单创建单独的工作表，包含详细信息
      for (const order of orders) {
        const orderWorksheet = workbook.addWorksheet(`出库单-${order.orderNumber}`);
        
        // 获取仓库信息
        const warehouse = await storage.getWarehouse(order.warehouseId);
        const warehouseName = warehouse ? warehouse.name : '未知仓库';
        
        // 添加出库单标题行
        orderWorksheet.addRow(["出库单号", "仓库", "状态", "创建时间", "总重量(kg)", "总体积(m³)"]);
        
        // 添加出库单信息
        orderWorksheet.addRow([
          order.orderNumber,
          warehouseName,
          order.status,
          new Date(order.createdAt).toLocaleString(),
          order.totalWeight,
          order.totalVolume
        ]);
        
        // 添加空行
        orderWorksheet.addRow([]);
        
        // 获取出库单项目
        const items = await storage.getOutboundOrderItems(order.id);
        
        // 添加项目标题行
        orderWorksheet.addRow(["产品名称", "条码", "唯一码", "数量", "包装数", "重量(kg)", "体积(m³)", "外部订单号", "备注"]);
        
        // 添加项目数据
        for (const item of items) {
          orderWorksheet.addRow([
            item.productName,
            item.barcode,
            item.uniqueCode || "",
            item.quantity,
            item.packageCount,
            item.weight,
            item.volume,
            item.externalOrderNumber || "",
            item.remark || ""
          ]);
        }
        
        // 设置宽度
        orderWorksheet.columns.forEach(column => {
          column.width = 20;
        });
      }
      
      // 设置主工作表宽度
      worksheet.columns.forEach(column => {
        column.width = 20;
      });
      
      // 生成文件路径
      const timestamp = new Date().toISOString().replace(/:/g, "-");
      const filePath = path.join(process.cwd(), "public", "exports", `outbound_orders_batch_${timestamp}.xlsx`);
      
      // 确保导出目录存在
      const dirname = path.dirname(filePath);
      if (!fs.existsSync(dirname)) {
        fs.mkdirSync(dirname, { recursive: true });
      }
      
      // 写入文件
      await workbook.xlsx.writeFile(filePath);
      
            // 生成文件名
      const filename = path.basename(filePath);
      
      // 使用文件清理工具处理下载和清理
      downloadWithCleanup(res, filePath, filename);
      
    } catch (err) {
      console.error("批量导出Excel文件失败:", err);
      const errorMessage = err instanceof Error ? err.message : String(err);
      res.status(500).json({ message: "批量导出Excel文件失败", error: errorMessage });
    }
  });
  
  // 唯一码跟踪路由
  // 获取唯一码跟踪记录
  apiRouter.get("/unique-code/:code", async (req, res) => {
    try {
      const uniqueCode = req.params.code;
      const tracking = await storage.getUniqueCodeTracking(uniqueCode);
      
      if (!tracking) {
        return res.status(404).json({ message: "唯一码不存在" });
      }
      
      res.json(tracking);
    } catch (err) {
      console.error("获取唯一码跟踪记录失败:", err);
      const errorMessage = err instanceof Error ? err.message : String(err);
      res.status(500).json({ message: "获取唯一码跟踪记录失败", error: errorMessage });
    }
  });
  
  // 获取唯一码历史记录
  apiRouter.get("/unique-code/:code/history", async (req, res) => {
    try {
      const uniqueCode = req.params.code;
      const history = await storage.getUniqueCodeHistory(uniqueCode);
      
      res.json(history);
    } catch (err) {
      console.error("获取唯一码历史记录失败:", err);
      const errorMessage = err instanceof Error ? err.message : String(err);
      res.status(500).json({ message: "获取唯一码历史记录失败", error: errorMessage });
    }
  });
  
  // 验证唯一码是否可用
  apiRouter.get("/unique-code/:code/verify", async (req, res) => {
    try {
      const uniqueCode = req.params.code;
      const warehouseId = req.query.warehouseId ? parseInt(req.query.warehouseId as string) : undefined;
      
      if (warehouseId && isNaN(warehouseId)) {
        return res.status(400).json({ message: "无效的仓库ID" });
      }
      
      const isAvailable = warehouseId 
        ? await storage.verifyUniqueCodeAvailable(uniqueCode, warehouseId)
        : !!(await storage.getUniqueCodeTracking(uniqueCode));
      
      res.json({ isAvailable });
    } catch (err) {
      console.error("验证唯一码失败:", err);
      const errorMessage = err instanceof Error ? err.message : String(err);
      res.status(500).json({ message: "验证唯一码失败", error: errorMessage });
    }
  });
  
  // 按产品ID获取唯一码列表
  apiRouter.get("/products/:id/unique-codes", async (req, res) => {
    try {
      const productId = parseInt(req.params.id);
      
      if (isNaN(productId)) {
        return res.status(400).json({ message: "无效的产品ID" });
      }
      
      const trackingList = await storage.getUniqueCodeTrackingByProduct(productId);
      res.json(trackingList);
    } catch (err) {
      console.error("获取产品唯一码列表失败:", err);
      const errorMessage = err instanceof Error ? err.message : String(err);
      res.status(500).json({ message: "获取产品唯一码列表失败", error: errorMessage });
    }
  });
  
  // 按仓库ID获取唯一码列表
  apiRouter.get("/warehouses/:id/unique-codes", async (req, res) => {
    try {
      const warehouseId = parseInt(req.params.id);
      
      if (isNaN(warehouseId)) {
        return res.status(400).json({ message: "无效的仓库ID" });
      }
      
      const trackingList = await storage.getUniqueCodeTrackingByWarehouse(warehouseId);
      res.json(trackingList);
    } catch (err) {
      console.error("获取仓库唯一码列表失败:", err);
      const errorMessage = err instanceof Error ? err.message : String(err);
      res.status(500).json({ message: "获取仓库唯一码列表失败", error: errorMessage });
    }
  });
  
  // 生成唯一码报告
  apiRouter.get("/unique-code-report", async (req, res) => {
    try {
      const filter: { 
        productId?: number, 
        warehouseId?: number, 
        status?: string, 
        startDate?: Date, 
        endDate?: Date 
      } = {};
      
      if (req.query.productId) {
        filter.productId = parseInt(req.query.productId as string);
      }
      
      if (req.query.warehouseId) {
        filter.warehouseId = parseInt(req.query.warehouseId as string);
      }
      
      if (req.query.status) {
        filter.status = req.query.status as string;
      }
      
      if (req.query.startDate) {
        filter.startDate = new Date(req.query.startDate as string);
      }
      
      if (req.query.endDate) {
        filter.endDate = new Date(req.query.endDate as string);
      }
      
      const report = await storage.generateUniqueCodeReport(filter);
      res.json(report);
    } catch (err) {
      console.error("生成唯一码报告失败:", err);
      const errorMessage = err instanceof Error ? err.message : String(err);
      res.status(500).json({ message: "生成唯一码报告失败", error: errorMessage });
    }
  });
  
  // 唯一码入库操作
  apiRouter.post("/unique-code/inbound", async (req, res) => {
    try {
      const { uniqueCode, productId, warehouseId, inboundOrderId, inboundItemId, userId } = req.body;
      
      if (!uniqueCode || !productId || !warehouseId || !inboundOrderId || !inboundItemId || !userId) {
        return res.status(400).json({ message: "缺少必要参数" });
      }
      
      const result = await storage.registerUniqueCodeInbound(
        uniqueCode,
        parseInt(productId),
        parseInt(warehouseId),
        parseInt(inboundOrderId),
        parseInt(inboundItemId),
        parseInt(userId)
      );
      
      res.json(result);
    } catch (err) {
      console.error("唯一码入库操作失败:", err);
      const errorMessage = err instanceof Error ? err.message : String(err);
      res.status(500).json({ message: "唯一码入库操作失败", error: errorMessage });
    }
  });
  
  // 唯一码出库操作
  apiRouter.post("/unique-code/outbound", async (req, res) => {
    try {
      const { uniqueCode, outboundOrderId, outboundItemId, userId } = req.body;
      
      if (!uniqueCode || !outboundOrderId || !outboundItemId || !userId) {
        return res.status(400).json({ message: "缺少必要参数" });
      }
      
      const result = await storage.registerUniqueCodeOutbound(
        uniqueCode,
        parseInt(outboundOrderId),
        parseInt(outboundItemId),
        parseInt(userId)
      );
      
      if (!result) {
        return res.status(404).json({ message: "唯一码不存在或无法出库" });
      }
      
      res.json(result);
    } catch (err) {
      console.error("唯一码出库操作失败:", err);
      const errorMessage = err instanceof Error ? err.message : String(err);
      res.status(500).json({ message: "唯一码出库操作失败", error: errorMessage });
    }
  });
  
  // 唯一码调拨操作
  apiRouter.post("/unique-code/transfer", async (req, res) => {
    try {
      const { uniqueCode, sourceWarehouseId, targetWarehouseId, transferId, transferItemId, userId } = req.body;
      
      if (!uniqueCode || !sourceWarehouseId || !targetWarehouseId || !transferId || !transferItemId || !userId) {
        return res.status(400).json({ message: "缺少必要参数" });
      }
      
      const result = await storage.registerUniqueCodeTransfer(
        uniqueCode,
        parseInt(sourceWarehouseId),
        parseInt(targetWarehouseId),
        parseInt(transferId),
        parseInt(transferItemId),
        parseInt(userId)
      );
      
      if (!result) {
        return res.status(404).json({ message: "唯一码不存在或无法调拨" });
      }
      
      res.json(result);
    } catch (err) {
      console.error("唯一码调拨操作失败:", err);
      const errorMessage = err instanceof Error ? err.message : String(err);
      res.status(500).json({ message: "唯一码调拨操作失败", error: errorMessage });
    }
  });
  
  // 唯一码跟踪逻辑继续
  
  // 检查用户是否有特定页面权限
  apiRouter.get("/permissions/check-page/:pageName", async (req, res) => {
    try {
      // 临时解决方案：使用默认用户ID 1 (演示用户)
      // 实际生产环境应该从 req.session.userId 获取
      const userId = 1; // 默认为演示用户
      const pageName = req.params.pageName;
      
      if (!pageName) {
        return res.status(400).json({ error: "请提供页面名称" });
      }
      
      const permissions = await getUserPagePermissions(userId);
      const hasPermission = permissions[pageName] === true;
      
      res.json({ pageName, hasPermission });
    } catch (err) {
      console.error("检查页面权限错误:", err);
      res.status(500).json({ error: "检查权限时发生错误", details: String(err) });
    }
  });
  
  // 检查用户是否有特定仓库权限
  apiRouter.get("/permissions/check-warehouse/:warehouseId", async (req, res) => {
    try {
      // 临时解决方案：使用默认用户ID 1 (演示用户)
      // 实际生产环境应该从 req.session.userId 获取
      const userId = 1; // 默认为演示用户
      const warehouseId = parseInt(req.params.warehouseId);
      const checkManage = req.query.checkManage === 'true';
      
      if (isNaN(warehouseId)) {
        return res.status(400).json({ error: "请提供有效的仓库ID" });
      }
      
      // 从数据库获取权限
      const dbPermissions = await getUserWarehousePermissions(userId);
      
      // 限制用户只能访问ID为1和2的仓库
      const allowedWarehouseIds = [1, 2];
      const hasWarehousePermission = allowedWarehouseIds.includes(warehouseId);
      
      let warehousePermission = { canView: false, canManage: false };
      
      // 如果在允许的仓库列表中，使用数据库的权限信息
      if (hasWarehousePermission && dbPermissions[warehouseId]) {
        warehousePermission = dbPermissions[warehouseId];
      }
      
      const hasPermission = checkManage ? warehousePermission.canManage : warehousePermission.canView;
      
      res.json({ 
        warehouseId, 
        hasPermission,
        permissionType: checkManage ? 'manage' : 'view'
      });
    } catch (err) {
      console.error("检查仓库权限错误:", err);
      res.status(500).json({ error: "检查权限时发生错误", details: String(err) });
    }
  });

  // 管理员专用接口 - 初始化测试数据
  apiRouter.post("/admin/initialize-test-data", async (req, res) => {
    try {
      const warehouseNames = ['上海仓库', '北京仓库', '广州仓库', '深圳仓库'];
      const warehouseLocations = ['上海市浦东新区', '北京市朝阳区', '广州市天河区', '深圳市南山区'];
      const capacities = ['5000', '8000', '6000', '4000'];
      
      // 创建仓库
      const warehouses = [];
      for (let i = 0; i < warehouseNames.length; i++) {
        try {
          const warehouse = await storage.createWarehouse({
            name: warehouseNames[i],
            location: warehouseLocations[i],
            capacity: capacities[i]
          });
          warehouses.push(warehouse);
        } catch (error) {
          console.error(`创建仓库 ${warehouseNames[i]} 失败:`, error);
        }
      }
      
      // 创建产品
      const productData = [
        { name: '手机壳', barcode: 'P00001', singleLengthCm: '15', singleWidthCm: '8', singleHeightCm: '1', singleWeightKg: '0.05', uniqueCode: 'UC00001' },
        { name: '保护膜', barcode: 'P00002', singleLengthCm: '15', singleWidthCm: '8', singleHeightCm: '0.1', singleWeightKg: '0.01', uniqueCode: 'UC00002' },
        { name: '充电器', barcode: 'P00003', singleLengthCm: '10', singleWidthCm: '5', singleHeightCm: '5', singleWeightKg: '0.2', uniqueCode: 'UC00003' },
        { name: '数据线', barcode: 'P00004', singleLengthCm: '100', singleWidthCm: '2', singleHeightCm: '2', singleWeightKg: '0.05', uniqueCode: 'UC00004' },
        { name: '耳机', barcode: 'P00005', singleLengthCm: '5', singleWidthCm: '5', singleHeightCm: '2', singleWeightKg: '0.03', uniqueCode: 'UC00005' },
        { name: '手机', barcode: 'P00006', singleLengthCm: '15', singleWidthCm: '7', singleHeightCm: '1', singleWeightKg: '0.2', uniqueCode: 'UC00006' },
        { name: '平板电脑', barcode: 'P00007', singleLengthCm: '25', singleWidthCm: '18', singleHeightCm: '1', singleWeightKg: '0.5', uniqueCode: 'UC00007' },
        { name: '笔记本电脑', barcode: 'P00008', singleLengthCm: '35', singleWidthCm: '25', singleHeightCm: '2', singleWeightKg: '2', uniqueCode: 'UC00008' }
      ];
      
      const productPromises = [];
      for (let product of productData) {
        // 计算体积，转换为立方米
        const singleVolumeM3 = (
          parseFloat(product.singleLengthCm) * 
          parseFloat(product.singleWidthCm) * 
          parseFloat(product.singleHeightCm) / 
          1000000
        ).toFixed(6);
        
        // 设置整件包装数据（示例：整件包装为10个单品）
        const bulkLengthCm = (parseFloat(product.singleLengthCm) * 2).toFixed(2);
        const bulkWidthCm = (parseFloat(product.singleWidthCm) * 2).toFixed(2);
        const bulkHeightCm = (parseFloat(product.singleHeightCm) * 5).toFixed(2);
        const bulkWeightKg = (parseFloat(product.singleWeightKg) * 10).toFixed(2);
        const bulkVolumeM3 = (
          parseFloat(bulkLengthCm) * 
          parseFloat(bulkWidthCm) * 
          parseFloat(bulkHeightCm) / 
          1000000
        ).toFixed(6);
        
        productPromises.push(
          storage.createProduct({
            name: product.name,
            barcode: product.barcode,
            singleLengthCm: product.singleLengthCm,
            singleWidthCm: product.singleWidthCm,
            singleHeightCm: product.singleHeightCm,
            singleVolumeM3,
            singleWeightKg: product.singleWeightKg,
            bulkLengthCm,
            bulkWidthCm,
            bulkHeightCm,
            bulkWeightKg,
            bulkVolumeM3,
            uniqueCode: product.uniqueCode
          })
        );
      }
      
      const products = await Promise.all(productPromises);
      
      // 创建入库单
      const inboundOrders = [];
      for (let i = 0; i < 5; i++) {
        try {
          if (warehouses.length === 0) {
            console.log('没有可用的仓库，无法创建入库单');
            continue;
          }
          
          const warehouseId = warehouses[Math.floor(Math.random() * warehouses.length)].id;
          const orderNumber = `IN${new Date().getFullYear()}${String(new Date().getMonth() + 1).padStart(2, '0')}${String(Math.floor(Math.random() * 10000)).padStart(4, '0')}`;
          
          const orderType = "purchase"; // 使用明确的字符串字面量
          
          const inboundOrder = await storage.createInboundOrder({
            warehouseId,
            orderNumber,
            totalWeight: '0',
            totalVolume: '0',
            status: 'pending',
            createdBy: 1,
            orderType,
            notes: `测试入库单 #${i+1}`
          });
          
          inboundOrders.push(inboundOrder);
        } catch (error) {
          console.error(`创建入库单失败:`, error);
        }
      }
      
      // 为每个入库单添加明细
      const inboundItemPromises = [];
      for (const order of inboundOrders) {
        try {
          // 每个入库单添加1-3个产品
          const itemCount = Math.floor(Math.random() * 3) + 1;
          
          let totalWeight = 0;
          let totalVolume = 0;
          
          for (let i = 0; i < itemCount; i++) {
            if (products.length === 0) {
              console.log('没有可用的产品，无法创建入库单明细');
              continue;
            }
            
            const product = products[Math.floor(Math.random() * products.length)];
            const quantity = Math.floor(Math.random() * 100) + 1;
            const packageCount = Math.ceil(quantity / 10);
            
            // 计算重量和体积
            const weightValue = parseFloat(product.singleWeightKg) * quantity;
            const volumeValue = parseFloat(product.singleVolumeM3) * quantity;
            
            const weight = weightValue.toFixed(2);
            const volume = volumeValue.toFixed(6);
            
            // 累加总重量和总体积
            totalWeight += weightValue;
            totalVolume += volumeValue;
            
            try {
              const inboundItem = await storage.createInboundOrderItem({
                inboundOrderId: order.id,
                productId: product.id,
                productName: product.name,
                barcode: product.barcode,
                quantity,
                packageCount,
                weight,
                volume,
                externalOrderNumber: `PO${Math.floor(Math.random() * 10000).toString().padStart(4, '0')}`,
                remark: `入库备注 #${i+1}`
              });
              
              inboundItemPromises.push(inboundItem);
            } catch (error) {
              console.error(`创建入库单明细失败:`, error);
            }
          }
          
          // 更新入库单总数据
          if (inboundItemPromises.length > 0) {
            await storage.updateInboundOrder(order.id, {
              totalWeight: totalWeight.toFixed(2),
              totalVolume: totalVolume.toFixed(6)
            });
          }
        } catch (error) {
          console.error(`处理入库单 ${order.id} 的明细时出错:`, error);
        }
      }
      
      // 创建出库单
      const outboundOrders = [];
      const validOrderTypes = ["sale", "return", "transfer", "scrap"] as const;
      const validDestinationTypes = ["customer", "retail", "wholesale", "transfer", "supplier"] as const;
      
      for (let i = 0; i < 5; i++) {
        try {
          if (warehouses.length === 0) {
            console.log('没有可用的仓库，无法创建出库单');
            continue;
          }
          
          const warehouseId = warehouses[Math.floor(Math.random() * warehouses.length)].id;
          const orderNumber = `OUT${new Date().getFullYear()}${String(new Date().getMonth() + 1).padStart(2, '0')}${String(Math.floor(Math.random() * 10000)).padStart(4, '0')}`;
          
          // 使用类型安全的字面量类型
          const orderTypeIndex = Math.floor(Math.random() * validOrderTypes.length);
          const destinationTypeIndex = Math.floor(Math.random() * validDestinationTypes.length);
          
          const orderType = validOrderTypes[orderTypeIndex];
          const destinationType = validDestinationTypes[destinationTypeIndex];
          
          const outboundOrder = await storage.createOutboundOrder({
            warehouseId,
            orderNumber,
            totalWeight: '0',
            totalVolume: '0',
            status: 'pending',
            createdBy: 1,
            orderType,
            destinationType,
            notes: `测试出库单 #${i+1}`
          });
          
          outboundOrders.push(outboundOrder);
        } catch (error) {
          console.error(`创建出库单失败:`, error);
        }
      }
      
      // 为每个出库单添加明细
      const outboundItemPromises = [];
      for (const order of outboundOrders) {
        try {
          // 每个出库单添加1-3个产品
          const itemCount = Math.floor(Math.random() * 3) + 1;
          
          let totalWeight = 0;
          let totalVolume = 0;
          
          for (let i = 0; i < itemCount; i++) {
            if (products.length === 0) {
              console.log('没有可用的产品，无法创建出库单明细');
              continue;
            }
            
            const product = products[Math.floor(Math.random() * products.length)];
            const quantity = Math.floor(Math.random() * 50) + 1;
            const packageCount = Math.ceil(quantity / 10);
            
            // 计算重量和体积
            const weightValue = parseFloat(product.singleWeightKg) * quantity;
            const volumeValue = parseFloat(product.singleVolumeM3) * quantity;
            
            const weight = weightValue.toFixed(2);
            const volume = volumeValue.toFixed(6);
            
            // 累加总重量和总体积
            totalWeight += weightValue;
            totalVolume += volumeValue;
            
            try {
              const outboundItem = await storage.createOutboundOrderItem({
                outboundOrderId: order.id,
                productId: product.id,
                productName: product.name,
                barcode: product.barcode,
                quantity,
                packageCount,
                weight,
                volume,
                externalOrderNumber: `SO${Math.floor(Math.random() * 10000).toString().padStart(4, '0')}`,
                remark: `出库备注 #${i+1}`
              });
              
              outboundItemPromises.push(outboundItem);
            } catch (error) {
              console.error(`创建出库单明细失败:`, error);
            }
          }
          
          // 更新出库单总数据
          if (outboundItemPromises.length > 0) {
            await storage.updateOutboundOrder(order.id, {
              totalWeight: totalWeight.toFixed(2),
              totalVolume: totalVolume.toFixed(6)
            });
          }
        } catch (error) {
          console.error(`处理出库单 ${order.id} 的明细时出错:`, error);
        }
      }
      
      // 返回创建的数据统计
      res.json({
        warehouses: warehouses.length,
        products: products.length,
        inboundOrders: inboundOrders.length,
        outboundOrders: outboundOrders.length
      });
      
    } catch (err: any) {
      console.error('Error initializing test data:', err);
      
      // 确保错误对象有message属性
      const errorMessage = err && err.message ? err.message : '未知错误';
      res.status(500).json({ error: 'Failed to initialize test data', message: errorMessage });
    }
  });

  // Mount the API router
  app.use("/api", apiRouter);

  // 添加调试端点
  app.get('/api/debug', (req, res) => {
    res.json({
      status: 'ok',
      timestamp: new Date().toISOString(),
      environment: process.env.NODE_ENV || 'development',
      server: {
        platform: process.platform,
        nodejs: process.version
      }
    });
  });
  
  // 添加简单的HTML测试页面
  app.get('/test-page', (req, res) => {
    res.send(`
      <!DOCTYPE html>
      <html>
        <head>
          <title>服务器测试页面</title>
          <style>
            body { font-family: Arial, sans-serif; margin: 40px; line-height: 1.6; }
            h1 { color: #333; }
            .container { max-width: 800px; margin: 0 auto; }
            .box { border: 1px solid #ddd; padding: 20px; border-radius: 5px; margin-bottom: 20px; }
          </style>
        </head>
        <body>
          <div class="container">
            <h1>服务器测试页面</h1>
            <div class="box">
              <p>如果您能看到这个页面，表示服务器能够正确提供HTML内容。</p>
              <p>当前时间：${new Date().toLocaleString()}</p>
            </div>
            <script>
              console.log('测试页面已加载');
              document.body.insertAdjacentHTML('beforeend', 
                '<div class="box">JavaScript正常运行</div>');
            </script>
          </div>
        </body>
      </html>
    `);
  });

  const httpServer = createServer(app);
  return httpServer;
}
