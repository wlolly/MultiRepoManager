/**
 * 翻译路由
 * 处理翻译数据的API请求
 */
import { Router, Request, Response } from 'express';
import { z } from 'zod';
import { TranslationService, SupportedLanguage, SUPPORTED_LANGUAGES, TranslationObject } from '../services/translation/translation.service';
import { IStorage } from '../storage';
import { verifySession, isAdmin } from '../auth';

// 定义语言枚举值
const SupportedLanguagesEnum = z.enum(['zh', 'en', 'ru', 'kk', 'uz']);
type SupportedLanguagesType = z.infer<typeof SupportedLanguagesEnum>;

// 翻译操作验证模式
const TranslationUpsertSchema = z.object({
  key: z.string().min(1, "翻译键不能为空"),
  language: SupportedLanguagesEnum,
  value: z.string().min(1, "翻译值不能为空")
});

const TranslationDeleteSchema = z.object({
  key: z.string().min(1, "翻译键不能为空"),
  language: SupportedLanguagesEnum.optional()
});

// 完整性验证模式
const IntegrityCheckSchema = z.object({
  requiredKeys: z.array(z.string()).optional()
});

// 批量导入模式 - 整个翻译对象
const ImportTranslationsSchema = z.record(
  z.string(), // 键
  z.record(
    SupportedLanguagesEnum, // 语言
    z.string().min(1) // 值
  )
);

// 创建翻译路由
export function createTranslationRoutes(storage: IStorage) {
  const router = Router();
  const translationService = new TranslationService(storage);
  
  // 初始化翻译数据
  translationService.initializeTranslations().then(success => {
    if (success) {
      console.log('[翻译路由] 翻译数据初始化成功');
    } else {
      console.error('[翻译路由] 翻译数据初始化失败');
    }
  });
  
  // 获取翻译服务监控指标 (需要管理员权限)
  router.get('/monitor', verifySession, isAdmin, async (req: Request, res: Response) => {
    try {
      const metrics = await translationService.getMonitorMetrics();
      
      // 导入监控工具
      const { translationMonitor } = await import('../services/translation/translation-monitor');
      
      // 补充额外的监控信息
      const result = {
        ...metrics,
        alertHistory: translationMonitor.getAlertHistory(20),
        degraded: translationMonitor.isDegraded(),
        config: translationMonitor.getConfig()
      };
      
      res.json(result);
    } catch (error) {
      console.error('[翻译路由] 获取监控指标出错:', error);
      res.status(500).json({ error: '获取监控指标失败' });
    }
  });
  
  // 更新监控配置 (需要管理员权限)
  router.post('/monitor/config', verifySession, isAdmin, async (req: Request, res: Response) => {
    try {
      // 导入监控工具
      const { translationMonitor } = await import('../services/translation/translation-monitor');
      
      // 验证配置
      const configSchema = z.object({
        errorRateThreshold: z.number().min(0).max(1).optional(),
        responseTimeThreshold: z.number().min(100).optional(),
        criticalErrorRate: z.number().min(0).max(1).optional(),
        minRequestsForAlert: z.number().min(1).optional(),
        autoDegradation: z.boolean().optional(),
        autoRollback: z.boolean().optional(),
        alertCooldown: z.number().min(1000).optional(),
        maxConsecutiveErrors: z.number().min(1).optional(),
        logLevel: z.enum(['debug', 'info', 'warn', 'error']).optional()
      });
      
      const result = configSchema.safeParse(req.body);
      
      if (!result.success) {
        return res.status(400).json({ 
          error: '无效的配置数据', 
          details: result.error.format() 
        });
      }
      
      // 更新配置
      translationMonitor.updateConfig(result.data);
      
      res.json({ 
        success: true,
        message: '监控配置已更新',
        config: translationMonitor.getConfig()
      });
    } catch (error) {
      console.error('[翻译路由] 更新监控配置出错:', error);
      res.status(500).json({ error: '更新监控配置失败' });
    }
  });
  
  // 禁用服务降级 (需要管理员权限)
  router.post('/monitor/disable-degradation', verifySession, isAdmin, async (req: Request, res: Response) => {
    try {
      // 导入监控工具
      const { translationMonitor } = await import('../services/translation/translation-monitor');
      
      // 验证请求
      const schema = z.object({
        reason: z.string().min(1).max(200)
      });
      
      const result = schema.safeParse(req.body);
      
      if (!result.success) {
        return res.status(400).json({ 
          error: '无效的请求数据', 
          details: result.error.format() 
        });
      }
      
      const { reason } = result.data;
      
      // 检查是否已经降级
      if (!translationMonitor.isDegraded()) {
        return res.status(400).json({
          error: '服务没有处于降级状态'
        });
      }
      
      // 禁用降级
      translationMonitor.disableServiceDegradation(reason);
      
      res.json({
        success: true,
        message: '服务降级已禁用'
      });
    } catch (error) {
      console.error('[翻译路由] 禁用服务降级出错:', error);
      res.status(500).json({ error: '禁用服务降级失败' });
    }
  });
  
  // 获取所有翻译
  router.get('/', async (req: Request, res: Response) => {
    try {
      const translations = await translationService.getAllTranslations();
      res.json(translations);
    } catch (error) {
      console.error('[翻译路由] 获取所有翻译出错:', error);
      res.status(500).json({ error: '获取翻译数据失败' });
    }
  });
  
  // 获取指定语言的翻译
  router.get('/:language', async (req: Request, res: Response) => {
    try {
      const { language } = req.params;
      
      // 检查语言是否支持
      if (!SUPPORTED_LANGUAGES.includes(language as SupportedLanguage)) {
        return res.status(400).json({ error: `不支持的语言: ${language}` });
      }
      
      const translations = await translationService.getTranslationsByLanguage(language as SupportedLanguage);
      res.json(translations);
    } catch (error) {
      console.error('[翻译路由] 获取指定语言翻译出错:', error);
      res.status(500).json({ error: '获取翻译数据失败' });
    }
  });
  
  // 添加或更新翻译 (需要管理员权限)
  router.post('/', verifySession, isAdmin, async (req: Request, res: Response) => {
    try {
      const result = TranslationUpsertSchema.safeParse(req.body);
      
      if (!result.success) {
        return res.status(400).json({ error: '无效的请求数据', details: result.error.format() });
      }
      
      const { key, language, value } = result.data;
      const { success, errors } = await translationService.upsertTranslation(key, language, value);
      
      if (success) {
        res.json({ success: true, message: '翻译已更新' });
      } else {
        res.status(400).json({ 
          success: false, 
          error: '更新翻译失败', 
          details: errors || ['未知错误'] 
        });
      }
    } catch (error) {
      console.error('[翻译路由] 添加/更新翻译出错:', error);
      res.status(500).json({ error: '更新翻译失败' });
    }
  });
  
  // 删除翻译 (需要管理员权限)
  router.delete('/', verifySession, isAdmin, async (req: Request, res: Response) => {
    try {
      const result = TranslationDeleteSchema.safeParse(req.body);
      
      if (!result.success) {
        return res.status(400).json({ error: '无效的请求数据', details: result.error.format() });
      }
      
      const { key, language } = result.data;
      const success = await translationService.deleteTranslation(key, language);
      
      if (success) {
        res.json({ success: true, message: '翻译已删除' });
      } else {
        res.status(500).json({ error: '删除翻译失败' });
      }
    } catch (error) {
      console.error('[翻译路由] 删除翻译出错:', error);
      res.status(500).json({ error: '删除翻译失败' });
    }
  });
  
  // 从数据库同步到文件 (需要管理员权限)
  router.post('/sync-to-file', verifySession, isAdmin, async (req: Request, res: Response) => {
    try {
      const success = await translationService.syncTranslationsToFile();
      
      if (success) {
        res.json({ success: true, message: '翻译已同步到文件' });
      } else {
        res.status(500).json({ error: '同步翻译到文件失败' });
      }
    } catch (error) {
      console.error('[翻译路由] 同步翻译到文件出错:', error);
      res.status(500).json({ error: '同步翻译到文件失败' });
    }
  });
  
  // 从文件同步到数据库 (需要管理员权限)
  router.post('/sync-to-database', verifySession, isAdmin, async (req: Request, res: Response) => {
    try {
      const success = await translationService.syncTranslationsToDatabase();
      
      if (success) {
        res.json({ success: true, message: '翻译已同步到数据库' });
      } else {
        res.status(500).json({ error: '同步翻译到数据库失败' });
      }
    } catch (error) {
      console.error('[翻译路由] 同步翻译到数据库出错:', error);
      res.status(500).json({ error: '同步翻译到数据库失败' });
    }
  });
  
  // 验证翻译完整性 (需要管理员权限)
  router.post('/validate-integrity', verifySession, isAdmin, async (req: Request, res: Response) => {
    try {
      const result = IntegrityCheckSchema.safeParse(req.body);
      
      if (!result.success) {
        return res.status(400).json({ error: '无效的请求数据', details: result.error.format() });
      }
      
      const { requiredKeys } = result.data;
      const validationResult = await translationService.validateTranslationsIntegrity(requiredKeys);
      
      res.json({
        ...validationResult,
        message: validationResult.valid ? 
          '所有翻译完整性检查通过' : 
          '翻译完整性检查发现问题'
      });
    } catch (error) {
      console.error('[翻译路由] 验证翻译完整性出错:', error);
      res.status(500).json({ error: '验证翻译完整性失败' });
    }
  });
  
  // 批量导入翻译 (需要管理员权限)
  router.post('/import', verifySession, isAdmin, async (req: Request, res: Response) => {
    try {
      const result = ImportTranslationsSchema.safeParse(req.body);
      
      if (!result.success) {
        return res.status(400).json({ 
          error: '无效的翻译数据格式', 
          details: result.error.format() 
        });
      }
      
      const translations = result.data as TranslationObject;
      const importResult = await translationService.importTranslations(translations);
      
      if (importResult.success) {
        res.json({
          ...importResult,
          message: `成功导入${importResult.imported}个翻译`
        });
      } else {
        res.status(400).json({
          ...importResult,
          error: '部分或全部翻译导入失败'
        });
      }
    } catch (error) {
      console.error('[翻译路由] 批量导入翻译出错:', error);
      res.status(500).json({ error: '批量导入翻译失败', message: (error as Error).message });
    }
  });
  
  // 验证特定语言的翻译是否符合语言规则 (需要管理员权限)
  router.post('/validate-language/:language', verifySession, isAdmin, async (req: Request, res: Response) => {
    try {
      const { language } = req.params;
      
      // 检查语言是否支持
      if (!SUPPORTED_LANGUAGES.includes(language as SupportedLanguage)) {
        return res.status(400).json({ error: `不支持的语言: ${language}` });
      }
      
      // 获取语言的所有翻译
      const translations = await translationService.getTranslationsByLanguage(language as SupportedLanguage);
      
      // 引入验证工具
      const { validateLanguageTranslations } = await import('../services/translation/translation-validator');
      
      // 进行验证
      const validationResult = validateLanguageTranslations(translations, language as SupportedLanguage);
      
      res.json({
        ...validationResult,
        language,
        totalTranslations: Object.keys(translations).length,
        message: validationResult.valid ? 
          `所有${language}翻译验证通过` : 
          `${language}翻译验证发现${validationResult.invalidKeys?.length}个问题`
      });
    } catch (error) {
      console.error(`[翻译路由] 验证${req.params.language}语言翻译出错:`, error);
      res.status(500).json({ error: '验证语言翻译失败' });
    }
  });
  
  return router;
}

export default createTranslationRoutes;