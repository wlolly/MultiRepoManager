import express, { type Express, Request, Response } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { 
  insertUserSchema, 
  insertRepositorySchema, 
  insertTeamSchema,
  insertTeamMemberSchema,
  insertTeamRepositorySchema,
  insertActivitySchema
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
