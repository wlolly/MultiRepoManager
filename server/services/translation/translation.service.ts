/**
 * 翻译服务
 * 负责在数据库和文件系统之间同步翻译数据
 * 提供获取和更新翻译文本的功能
 */
import fs from 'fs';
import path from 'path';
import { IStorage } from '../../storage';
import { Translation, InsertTranslation } from '../../../shared/schema';

// 支持的语言列表
export const SUPPORTED_LANGUAGES = ['zh', 'en', 'ru', 'kk', 'uz'] as const;

// 语言类型
export type SupportedLanguage = typeof SUPPORTED_LANGUAGES[number];

// 翻译对象接口
export interface TranslationObject {
  [key: string]: {
    [lang in SupportedLanguage]?: string;
  };
}

// 翻译键接口 - 单个键对应所有语言的翻译
export interface TranslationKey {
  key: string;
  translations: {
    [lang in SupportedLanguage]?: string;
  };
}

// 翻译服务类
export class TranslationService {
  // 翻译文件路径
  private translationsFilePath: string;
  
  // 构造函数
  constructor(private storage: IStorage) {
    this.translationsFilePath = path.join(process.cwd(), 'public', 'locales', 'translations.json');
  }

  /**
   * 获取所有翻译
   * @returns 翻译对象
   */
  async getAllTranslations(): Promise<TranslationObject> {
    // 引入监控工具
    const { translationMonitor, RequestType } = await import('./translation-monitor');
    const requestStartTime = translationMonitor.startRequest(RequestType.GET_ALL);
    
    try {
      // 尝试从数据库获取翻译
      const dbTranslations = await this.getAllTranslationsFromDB();
      if (dbTranslations && Object.keys(dbTranslations).length > 0) {
        console.log('[翻译服务] 从数据库获取到翻译数据，共', Object.keys(dbTranslations).length, '个键');
        translationMonitor.endRequest(RequestType.GET_ALL, requestStartTime, true);
        return dbTranslations;
      }
      
      // 如果数据库没有翻译或出错，从文件获取
      console.log('[翻译服务] 数据库没有翻译数据，尝试从文件加载');
      const fileTranslations = this.getAllTranslationsFromFile();
      translationMonitor.endRequest(RequestType.GET_ALL, requestStartTime, true);
      return fileTranslations;
    } catch (error) {
      console.error('[翻译服务] 获取所有翻译出错:', error);
      
      // 记录错误
      translationMonitor.endRequest(
        RequestType.GET_ALL,
        requestStartTime,
        false,
        (error as Error).message || '获取翻译数据失败'
      );
      
      // 出错时尝试从文件获取
      return this.getAllTranslationsFromFile();
    }
  }
  
  /**
   * 从文件获取所有翻译
   * @returns 翻译对象
   */
  getAllTranslationsFromFile(): TranslationObject {
    try {
      // 检查文件是否存在
      if (!fs.existsSync(this.translationsFilePath)) {
        console.error('[翻译服务] 翻译文件不存在:', this.translationsFilePath);
        return {};
      }
      
      // 读取并解析文件
      const fileContent = fs.readFileSync(this.translationsFilePath, 'utf8');
      const translations = JSON.parse(fileContent) as TranslationObject;
      
      console.log('[翻译服务] 从文件加载翻译数据成功，共', Object.keys(translations).length, '个键');
      return translations;
    } catch (error) {
      console.error('[翻译服务] 从文件获取翻译出错:', error);
      return {};
    }
  }
  
  /**
   * 从数据库获取所有翻译
   * @returns 翻译对象
   */
  async getAllTranslationsFromDB(): Promise<TranslationObject> {
    try {
      // 从数据库获取所有翻译
      const dbTranslations = await this.storage.getTranslations();
      
      // 将数据库格式转换为对象格式
      const translations: TranslationObject = {};
      
      // 遍历每条翻译记录
      dbTranslations.forEach((translation) => {
        // 如果键不存在，创建空对象
        if (!translations[translation.key]) {
          translations[translation.key] = {};
        }
        
        // 设置对应语言的翻译值
        if (SUPPORTED_LANGUAGES.includes(translation.language as SupportedLanguage)) {
          translations[translation.key][translation.language as SupportedLanguage] = translation.value;
        }
      });
      
      return translations;
    } catch (error) {
      console.error('[翻译服务] 从数据库获取翻译出错:', error);
      return {};
    }
  }
  
  /**
   * 获取指定语言的所有翻译
   * @param language 语言代码
   * @returns 翻译对象 {key: value}
   */
  async getTranslationsByLanguage(language: SupportedLanguage): Promise<Record<string, string>> {
    // 引入监控工具
    const { translationMonitor, RequestType } = await import('./translation-monitor');
    const requestStartTime = translationMonitor.startRequest(RequestType.GET_BY_LANGUAGE);
    
    try {
      // 获取所有翻译
      const translations = await this.getAllTranslations();
      const result: Record<string, string> = {};
      
      // 提取指定语言的翻译
      Object.keys(translations).forEach((key) => {
        if (translations[key][language]) {
          result[key] = translations[key][language] as string;
        }
      });
      
      translationMonitor.endRequest(RequestType.GET_BY_LANGUAGE, requestStartTime, true);
      return result;
    } catch (error) {
      console.error(`[翻译服务] 获取${language}语言翻译出错:`, error);
      
      // 记录错误
      translationMonitor.endRequest(
        RequestType.GET_BY_LANGUAGE,
        requestStartTime,
        false,
        (error as Error).message || `获取${language}语言翻译失败`
      );
      
      return {};
    }
  }
  
  /**
   * 将翻译同步到数据库
   * @returns 成功与否
   */
  async syncTranslationsToDatabase(): Promise<boolean> {
    // 引入监控工具
    const { translationMonitor, RequestType } = await import('./translation-monitor');
    const requestStartTime = translationMonitor.startRequest(RequestType.SYNC_TO_DB);
    
    try {
      console.log('[翻译服务] 开始同步翻译到数据库');
      
      // 从文件读取翻译
      const translations = this.getAllTranslationsFromFile();
      
      // 转换为数据库格式
      const dbTranslations: InsertTranslation[] = [];
      
      // 遍历所有键
      Object.keys(translations).forEach((key) => {
        // 遍历所有支持的语言
        SUPPORTED_LANGUAGES.forEach((language) => {
          if (translations[key][language]) {
            dbTranslations.push({
              key,
              language,
              value: translations[key][language] as string
            });
          }
        });
      });
      
      // 批量插入数据库
      const result = await this.storage.createTranslationsBatch(dbTranslations);
      
      console.log('[翻译服务] 同步翻译到数据库完成，共插入', result.length, '条记录');
      
      // 记录成功
      translationMonitor.endRequest(RequestType.SYNC_TO_DB, requestStartTime, true);
      return true;
    } catch (error) {
      console.error('[翻译服务] 同步翻译到数据库出错:', error);
      
      // 记录错误
      translationMonitor.endRequest(
        RequestType.SYNC_TO_DB,
        requestStartTime,
        false,
        (error as Error).message || '同步翻译到数据库失败'
      );
      
      return false;
    }
  }
  
  /**
   * 将翻译同步到文件
   * @returns 成功与否
   */
  async syncTranslationsToFile(): Promise<boolean> {
    // 引入监控工具
    const { translationMonitor, RequestType } = await import('./translation-monitor');
    const requestStartTime = translationMonitor.startRequest(RequestType.SYNC_TO_FILE);
    
    try {
      console.log('[翻译服务] 开始同步翻译到文件');
      
      // 从数据库获取翻译
      const translations = await this.getAllTranslationsFromDB();
      
      // 将翻译写入文件
      fs.writeFileSync(
        this.translationsFilePath,
        JSON.stringify(translations, null, 4),
        'utf8'
      );
      
      console.log('[翻译服务] 同步翻译到文件完成');
      
      // 记录成功
      translationMonitor.endRequest(RequestType.SYNC_TO_FILE, requestStartTime, true);
      return true;
    } catch (error) {
      console.error('[翻译服务] 同步翻译到文件出错:', error);
      
      // 记录错误
      translationMonitor.endRequest(
        RequestType.SYNC_TO_FILE,
        requestStartTime,
        false,
        (error as Error).message || '同步翻译到文件失败'
      );
      
      return false;
    }
  }
  
  /**
   * 添加或更新翻译
   * @param key 翻译键
   * @param language 语言
   * @param value 翻译值
   * @returns 成功与否，失败时包含错误信息
   */
  async upsertTranslation(key: string, language: SupportedLanguage, value: string): Promise<{success: boolean, errors?: string[]}> {
    // 引入监控工具
    const { translationMonitor, RequestType } = await import('./translation-monitor');
    const requestStartTime = translationMonitor.startRequest(RequestType.UPSERT);
    
    try {
      // 引入严格的输入验证
      const { validateTranslation, formatValidationErrors, getLanguageValidationSchema } = await import('./translation-validator');
      
      // 执行一般验证
      const validationResult = validateTranslation(key, language, value);
      
      if (!validationResult.success) {
        const errorMessages = formatValidationErrors(validationResult.errors);
        console.error('[翻译服务] 验证失败:', errorMessages);
        
        // 记录验证错误
        translationMonitor.endRequest(
          RequestType.UPSERT,
          requestStartTime,
          false,
          `验证失败: ${errorMessages.join(', ')}`
        );
        
        return { 
          success: false, 
          errors: errorMessages 
        };
      }
      
      // 特定语言验证 (已在validateTranslation中包含，但这里额外记录更详细信息)
      try {
        // 获取语言特定的验证模式
        const languageSchema = getLanguageValidationSchema(language);
        const languageResult = languageSchema.safeParse(value);
        
        if (!languageResult.success) {
          const errorMessages = formatValidationErrors(languageResult.error.issues);
          console.error(`[翻译服务] ${language}语言特定验证失败:`, errorMessages);
          
          // 记录验证错误
          translationMonitor.endRequest(
            RequestType.UPSERT,
            requestStartTime,
            false,
            `${language}语言特定验证失败: ${errorMessages.join(', ')}`
          );
          
          return { 
            success: false, 
            errors: errorMessages 
          };
        }
      } catch (validationError) {
        console.warn(`[翻译服务] 执行${language}语言特定验证时出错:`, validationError);
        // 继续执行，因为主验证已经通过
      }
      
      // 先查找是否已有此翻译
      const existingTranslation = await this.storage.getTranslationByKeyAndLanguage(key, language);
      
      if (existingTranslation) {
        // 更新已有翻译
        await this.storage.updateTranslation(existingTranslation.id, {
          value
        });
        console.log(`[翻译服务] 更新翻译: ${key} (${language})`);
      } else {
        // 添加新翻译
        await this.storage.createTranslation({
          key,
          language,
          value
        });
        console.log(`[翻译服务] 添加新翻译: ${key} (${language})`);
      }
      
      // 同步到文件
      await this.syncTranslationsToFile();
      
      // 记录成功
      translationMonitor.endRequest(RequestType.UPSERT, requestStartTime, true);
      return { success: true };
    } catch (error) {
      console.error('[翻译服务] 添加/更新翻译出错:', error);
      
      // 记录错误
      translationMonitor.endRequest(
        RequestType.UPSERT,
        requestStartTime,
        false,
        (error as Error).message || '添加/更新翻译失败'
      );
      
      return { 
        success: false,
        errors: [(error as Error).message || '未知错误'] 
      };
    }
  }
  
  /**
   * 删除翻译
   * @param key 翻译键
   * @param language 可选语言，不提供则删除所有语言的此键
   * @returns 成功与否
   */
  async deleteTranslation(key: string, language?: SupportedLanguage): Promise<boolean> {
    // 引入监控工具
    const { translationMonitor, RequestType } = await import('./translation-monitor');
    const requestStartTime = translationMonitor.startRequest(RequestType.DELETE);
    
    try {
      if (!key) {
        console.error('[翻译服务] 删除翻译参数无效');
        translationMonitor.endRequest(
          RequestType.DELETE,
          requestStartTime,
          false,
          '删除翻译参数无效'
        );
        return false;
      }
      
      if (language) {
        // 删除特定语言的翻译
        await this.storage.deleteTranslationByKeyAndLanguage(key, language);
        console.log(`[翻译服务] 删除翻译: ${key} (${language})`);
      } else {
        // 删除所有语言的此键翻译
        await this.storage.deleteTranslationByKey(key);
        console.log(`[翻译服务] 删除所有语言翻译: ${key}`);
      }
      
      // 同步到文件
      await this.syncTranslationsToFile();
      
      // 记录成功
      translationMonitor.endRequest(RequestType.DELETE, requestStartTime, true);
      return true;
    } catch (error) {
      console.error('[翻译服务] 删除翻译出错:', error);
      
      // 记录错误
      translationMonitor.endRequest(
        RequestType.DELETE,
        requestStartTime,
        false,
        (error as Error).message || '删除翻译失败'
      );
      
      return false;
    }
  }
  
  /**
   * 初始化数据库翻译表
   * 将文件中的翻译导入数据库
   * @returns 成功与否
   */
  async initializeTranslations(): Promise<boolean> {
    // 引入监控工具
    const { translationMonitor, RequestType } = await import('./translation-monitor');
    const requestStartTime = translationMonitor.startRequest(RequestType.SYNC_TO_DB);
    
    try {
      console.log('[翻译服务] 开始初始化翻译数据');
      
      // 检查数据库中是否已有翻译
      const dbTranslations = await this.storage.getTranslations();
      
      if (dbTranslations && dbTranslations.length > 0) {
        console.log('[翻译服务] 数据库已有翻译数据，跳过初始化');
        translationMonitor.endRequest(RequestType.SYNC_TO_DB, requestStartTime, true);
        return true;
      }
      
      // 从文件同步到数据库
      const result = await this.syncTranslationsToDatabase();
      translationMonitor.endRequest(RequestType.SYNC_TO_DB, requestStartTime, result);
      return result;
    } catch (error) {
      console.error('[翻译服务] 初始化翻译数据出错:', error);
      
      // 记录错误
      translationMonitor.endRequest(
        RequestType.SYNC_TO_DB,
        requestStartTime,
        false,
        (error as Error).message || '初始化翻译数据失败'
      );
      
      return false;
    }
  }
  
  /**
   * 获取翻译服务监控指标
   * @returns 监控指标
   */
  async getMonitorMetrics(): Promise<any> {
    const { translationMonitor } = await import('./translation-monitor');
    return {
      general: translationMonitor.getMetrics(),
      byType: {
        getAllTranslations: translationMonitor.getTypeMetrics(await (await import('./translation-monitor')).RequestType.GET_ALL),
        getByLanguage: translationMonitor.getTypeMetrics(await (await import('./translation-monitor')).RequestType.GET_BY_LANGUAGE),
        upsert: translationMonitor.getTypeMetrics(await (await import('./translation-monitor')).RequestType.UPSERT),
        delete: translationMonitor.getTypeMetrics(await (await import('./translation-monitor')).RequestType.DELETE),
        syncToFile: translationMonitor.getTypeMetrics(await (await import('./translation-monitor')).RequestType.SYNC_TO_FILE),
        syncToDb: translationMonitor.getTypeMetrics(await (await import('./translation-monitor')).RequestType.SYNC_TO_DB)
      },
      recentErrors: translationMonitor.getRecentErrors()
    };
  }

  /**
   * 验证翻译数据完整性
   * 检查所有必需键是否在所有语言中都有翻译
   * @param requiredKeys 必需的键列表（如果不提供，则使用所有键）
   * @returns 验证结果，包含缺失翻译的详细信息
   */
  async validateTranslationsIntegrity(requiredKeys?: string[]): Promise<{
    valid: boolean;
    missingTranslations?: Record<string, string[]>;
    untranslatedLanguages?: Record<string, number>;
    totalKeys: number;
    requiredKeys: number;
  }> {
    try {
      // 获取所有翻译
      const translations = await this.getAllTranslations();
      const allKeys = Object.keys(translations);
      const keysToCheck = requiredKeys || allKeys;
      
      // 统计每种语言缺失的翻译
      const missingTranslations: Record<string, string[]> = {};
      const untranslatedLanguages: Record<string, number> = {};
      
      // 对每种支持的语言进行检查
      for (const language of SUPPORTED_LANGUAGES) {
        const missingKeys: string[] = [];
        
        // 检查每个必需键
        for (const key of keysToCheck) {
          if (!translations[key] || !translations[key][language]) {
            missingKeys.push(key);
          }
        }
        
        // 记录缺失的键
        if (missingKeys.length > 0) {
          missingTranslations[language] = missingKeys;
          untranslatedLanguages[language] = missingKeys.length;
        }
      }
      
      return {
        valid: Object.keys(missingTranslations).length === 0,
        missingTranslations: Object.keys(missingTranslations).length > 0 ? missingTranslations : undefined,
        untranslatedLanguages: Object.keys(untranslatedLanguages).length > 0 ? untranslatedLanguages : undefined,
        totalKeys: allKeys.length,
        requiredKeys: keysToCheck.length
      };
    } catch (error) {
      console.error('[翻译服务] 验证翻译完整性出错:', error);
      return {
        valid: false,
        totalKeys: 0,
        requiredKeys: 0
      };
    }
  }
  
  /**
   * 批量导入翻译
   * @param translations 要导入的翻译数据
   * @returns 导入结果
   */
  async importTranslations(translations: TranslationObject): Promise<{
    success: boolean;
    imported: number;
    failed: number;
    errors?: string[];
  }> {
    // 引入监控工具
    const { translationMonitor, RequestType } = await import('./translation-monitor');
    const requestStartTime = translationMonitor.startRequest(RequestType.UPSERT);
    
    try {
      console.log('[翻译服务] 开始批量导入翻译');
      
      // 引入验证工具
      const { validateTranslationJson } = await import('./translation-validator');
      
      // 验证导入的翻译数据结构
      const validationResult = validateTranslationJson(translations);
      if (!validationResult.valid) {
        console.error('[翻译服务] 导入数据验证失败:', validationResult.errors);
        
        translationMonitor.endRequest(
          RequestType.UPSERT, 
          requestStartTime, 
          false, 
          `导入数据验证失败: ${validationResult.errors?.join(', ')}`
        );
        
        return {
          success: false,
          imported: 0,
          failed: 0,
          errors: validationResult.errors
        };
      }
      
      // 统计成功和失败的数量
      let imported = 0;
      let failed = 0;
      const errors: string[] = [];
      
      // 遍历所有键和语言
      for (const key of Object.keys(translations)) {
        for (const language of SUPPORTED_LANGUAGES) {
          // 只导入存在的翻译
          if (translations[key][language]) {
            const upsertResult = await this.upsertTranslation(
              key, 
              language as SupportedLanguage, 
              translations[key][language] as string
            );
            
            if (upsertResult.success) {
              imported++;
            } else {
              failed++;
              errors.push(`键 "${key}" 的 ${language} 翻译导入失败: ${upsertResult.errors?.join(', ') || '未知错误'}`);
            }
          }
        }
      }
      
      // 同步到文件
      await this.syncTranslationsToFile();
      
      console.log(`[翻译服务] 批量导入完成，成功: ${imported}, 失败: ${failed}`);
      
      // 记录结果
      translationMonitor.endRequest(
        RequestType.UPSERT, 
        requestStartTime, 
        failed === 0,
        failed > 0 ? `导入部分失败: ${failed}/${imported + failed}` : undefined
      );
      
      return {
        success: failed === 0,
        imported,
        failed,
        errors: errors.length > 0 ? errors : undefined
      };
    } catch (error) {
      console.error('[翻译服务] 批量导入翻译出错:', error);
      
      // 记录错误
      translationMonitor.endRequest(
        RequestType.UPSERT,
        requestStartTime,
        false,
        (error as Error).message || '批量导入翻译失败'
      );
      
      return {
        success: false,
        imported: 0,
        failed: 0,
        errors: [(error as Error).message || '未知错误']
      };
    }
  }
}

export default TranslationService;