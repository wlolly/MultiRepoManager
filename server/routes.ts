import express, { type Express, Request, Response } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
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
  insertApiConfigurationSchema
} from "@shared/schema";
import { z } from "zod";
import { fromZodError } from "zod-validation-error";

export async function registerRoutes(app: Express): Promise<Server> {
  const apiRouter = express.Router();
  
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
  
  apiRouter.get("/products", async (req, res) => {
    try {
      // Build filter object based on query parameters
      const filter: { warehouseId?: number, category?: string } = {};
      
      // Check for warehouse filter
      if (req.query.warehouseId) {
        filter.warehouseId = parseInt(req.query.warehouseId as string);
      }
      
      // Check for category filter
      if (req.query.category) {
        filter.category = req.query.category as string;
      }
      
      // Get products with applied filters
      const products = await storage.getProducts(Object.keys(filter).length > 0 ? filter : undefined);
      res.json(products);
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
      // 获取调拨单列表
      // 实际中这里应该从数据库查询调拨单
      // 由于我们尚未实现仓库调拨的存储方法，这里返回一个空数组
      res.json([]);
    } catch (err) {
      handleZodError(err, res);
    }
  });

  apiRouter.post("/warehouse-transfers", async (req, res) => {
    try {
      const { sourceWarehouseId, targetWarehouseId, notes, items } = req.body;
      
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
      
      // 1. 创建出库单
      const outboundOrderNumber = `OUT-TRANSFER-${Date.now()}`;
      
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
      const inboundOrderNumber = `IN-TRANSFER-${Date.now()}`;
      
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
            externalOrderNumber: `TRANSFER-${Date.now()}`,
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
            externalOrderNumber: `TRANSFER-${Date.now()}`,
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
      
      // 4. 返回创建的数据
      res.status(201).json({
        message: "仓库调拨创建成功" + (errorMessages.length > 0 ? "，但有部分商品处理失败" : ""),
        referenceNumber: `TRANSFER-${Date.now()}`,
        sourceWarehouseId: parsedSourceWarehouseId,
        targetWarehouseId: parsedTargetWarehouseId,
        errors: errorMessages.length > 0 ? errorMessages : undefined,
        outboundOrder,
        inboundOrder,
        outboundItems,
        inboundItems
      });
    } catch (err) {
      console.error("创建仓库调拨失败:", err);
      handleZodError(err, res);
    }
  });

  apiRouter.get("/warehouse-transfers/stats", async (req, res) => {
    try {
      // 实际中这里应该从数据库获取统计数据
      // 由于我们尚未实现仓库调拨的存储方法，这里返回模拟数据
      res.json({
        totalTransfers: 0,
        pendingTransfers: 0,
        completedTransfers: 0,
        totalWeight: 0,
        totalVolume: 0,
        recentTransfers: 0
      });
    } catch (err) {
      handleZodError(err, res);
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
      const stats = await storage.getRepositoryStats();
      res.json(stats);
    } catch (err) {
      handleZodError(err, res);
    }
  });

  // Mount the API router
  app.use("/api", apiRouter);

  const httpServer = createServer(app);
  return httpServer;
}
