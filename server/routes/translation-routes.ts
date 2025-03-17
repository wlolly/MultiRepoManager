/**
 * 翻译路由
 * 处理翻译数据的API请求
 */
import { Router, Request, Response } from 'express';
import { z } from 'zod';
import { TranslationService, SupportedLanguage, SUPPORTED_LANGUAGES } from '../services/translation/translation.service';
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
      res.json(metrics);
    } catch (error) {
      console.error('[翻译路由] 获取监控指标出错:', error);
      res.status(500).json({ error: '获取监控指标失败' });
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
  
  return router;
}

export default createTranslationRoutes;