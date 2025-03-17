/**
 * 翻译服务输入验证工具
 * 负责验证翻译键、值和语言的格式与内容
 */
import { z } from 'zod';
import { SupportedLanguage, SUPPORTED_LANGUAGES } from './translation.service';

// 翻译键模式验证
// 要求使用点号分隔的小写字母、数字和下划线组合
// 例如: "common.button.submit", "user.profile.title"
export const translationKeySchema = z.string()
  .min(1, "翻译键不能为空")
  .regex(/^[a-z0-9_]+(\.[a-z0-9_]+)*$/i, "翻译键格式必须为点号分隔的标识符组合");

// 翻译语言验证
// 手动创建枚举值数组，避免只读数组类型问题
export const translationLanguageSchema = z.enum(['zh', 'en', 'ru', 'kk', 'uz']);

// 翻译值验证
// 检查是否包含无效的插值语法以及空值
export const translationValueSchema = z.string()
  .min(1, "翻译值不能为空")
  .refine(
    (val) => {
      // 检查插值语法是否匹配，例如: {name}, {count}
      const interpolationPattern = /\{([^{}]+)\}/g;
      const matches = val.match(interpolationPattern) || [];
      
      // 检查是否有未关闭的花括号
      const openBraces = (val.match(/\{/g) || []).length;
      const closeBraces = (val.match(/\}/g) || []).length;
      
      return openBraces === closeBraces;
    },
    {
      message: "翻译值包含无效的插值语法，请检查花括号是否配对"
    }
  );

// 中文翻译特定验证规则
export const chineseTranslationSchema = translationValueSchema.refine(
  (val) => /[\u4e00-\u9fa5]/.test(val),
  {
    message: "中文翻译必须包含至少一个汉字"
  }
);

// 英文翻译特定验证规则
export const englishTranslationSchema = translationValueSchema.refine(
  (val) => /[a-zA-Z]/.test(val),
  {
    message: "英文翻译必须包含至少一个英文字母"
  }
);

// 俄文翻译特定验证规则
export const russianTranslationSchema = translationValueSchema.refine(
  (val) => /[\u0400-\u04FF]/.test(val),
  {
    message: "俄文翻译必须包含至少一个西里尔字母"
  }
);

// 哈萨克文翻译特定验证规则
export const kazakhTranslationSchema = translationValueSchema.refine(
  (val) => /[\u0400-\u04FF\u0500-\u052F]/.test(val),
  {
    message: "哈萨克文翻译必须包含至少一个西里尔字母"
  }
);

// 乌兹别克文翻译特定验证规则
export const uzbekTranslationSchema = translationValueSchema.refine(
  (val) => /[\u0400-\u04FF\u0500-\u052F]/.test(val) || /[\u0100-\u017F]/.test(val),
  {
    message: "乌兹别克文翻译必须包含至少一个西里尔字母或拉丁扩展字母"
  }
);

// 获取特定语言的验证模式
export function getLanguageValidationSchema(language: string): z.ZodType<string> {
  switch (language) {
    case 'zh':
      return chineseTranslationSchema;
    case 'en':
      return englishTranslationSchema;
    case 'ru':
      return russianTranslationSchema;
    case 'kk':
      return kazakhTranslationSchema;
    case 'uz':
      return uzbekTranslationSchema;
    default:
      return translationValueSchema;
  }
}

// 完整的翻译条目验证模式
export const translationEntrySchema = z.object({
  key: translationKeySchema,
  language: translationLanguageSchema,
  value: translationValueSchema
});

// 翻译批量导入验证模式
export const translationBatchSchema = z.array(translationEntrySchema);

/**
 * 验证翻译键、语言和值是否符合规范
 * @param key 翻译键
 * @param language 语言代码
 * @param value 翻译值
 * @returns 验证结果对象，包含成功标志和可能的错误信息
 */
export function validateTranslation(key: string, language: string, value: string): {
  success: boolean;
  errors?: z.ZodIssue[];
} {
  // 第一步：基本验证（键、语言代码和一般性验证）
  const baseResult = translationEntrySchema.safeParse({ key, language, value });
  
  if (!baseResult.success) {
    return {
      success: false,
      errors: baseResult.error.issues
    };
  }
  
  // 第二步：特定语言验证
  if (SUPPORTED_LANGUAGES.includes(language as SupportedLanguage)) {
    const languageSchema = getLanguageValidationSchema(language);
    const languageResult = languageSchema.safeParse(value);
    
    if (!languageResult.success) {
      console.log(`[翻译验证] 特定语言验证失败: ${language}, 键: ${key}`);
      return {
        success: false,
        errors: languageResult.error.issues
      };
    }
  }
  
  // 所有验证通过
  return { success: true };
}

/**
 * 验证批量翻译数据
 * @param translations 翻译数据数组
 * @returns 验证结果对象，包含成功标志和可能的错误信息
 */
export function validateTranslationBatch(translations: { key: string; language: string; value: string }[]): {
  success: boolean;
  errors?: z.ZodIssue[];
  errorItem?: number; // 错误项的索引
} {
  // 第一步：基本验证所有项目
  const baseResult = translationBatchSchema.safeParse(translations);
  
  if (!baseResult.success) {
    return {
      success: false,
      errors: baseResult.error.issues
    };
  }
  
  // 第二步：逐项进行特定语言验证
  for (let i = 0; i < translations.length; i++) {
    const { key, language, value } = translations[i];
    
    if (SUPPORTED_LANGUAGES.includes(language as SupportedLanguage)) {
      const languageSchema = getLanguageValidationSchema(language);
      const languageResult = languageSchema.safeParse(value);
      
      if (!languageResult.success) {
        console.log(`[批量翻译验证] 项目 #${i+1} 语言验证失败: ${language}, 键: ${key}`);
        return {
          success: false,
          errors: languageResult.error.issues,
          errorItem: i
        };
      }
    }
  }
  
  // 所有验证通过
  return { success: true };
}

/**
 * 格式化验证错误信息为友好的提示文本
 * @param errors Zod验证错误
 * @returns 格式化后的错误信息
 */
export function formatValidationErrors(errors?: z.ZodIssue[]): string[] {
  if (!errors || errors.length === 0) {
    return [];
  }
  
  return errors.map(error => {
    const path = error.path.join('.');
    const prefix = path ? `${path}: ` : '';
    return `${prefix}${error.message}`;
  });
}

/**
 * 验证JSON格式的翻译数据结构
 * 检查结构是否符合预期格式，确保每个语言的所有翻译键都存在
 * @param translationJson JSON格式的翻译数据
 * @param requiredKeys 必需的翻译键列表（可选）
 * @returns 验证结果对象
 */
export function validateTranslationJson(
  translationJson: any, 
  requiredKeys: string[] = []
): { 
  valid: boolean; 
  missingKeys?: Record<string, string[]>; 
  invalidStructure?: boolean;
  errors?: string[];
} {
  // 定义JSON结构验证模式
  const translationJsonSchema = z.record(
    z.string(), // 键: 字符串
    z.record(
      translationLanguageSchema, // 语言: 语言枚举
      z.string().min(1) // 值: 非空字符串
    )
  );
  
  // 验证结构
  const structureResult = translationJsonSchema.safeParse(translationJson);
  if (!structureResult.success) {
    return {
      valid: false,
      invalidStructure: true,
      errors: formatValidationErrors(structureResult.error.issues)
    };
  }
  
  // 如果提供了必需键，则检查每个语言是否包含所有必需键
  if (requiredKeys.length > 0) {
    const missingKeys: Record<string, string[]> = {};
    
    // 检查每个语言
    for (const lang of SUPPORTED_LANGUAGES) {
      const missingForLang: string[] = [];
      
      // 检查每个必需键
      for (const key of requiredKeys) {
        const hasTranslation = translationJson[key] && 
                              translationJson[key][lang] && 
                              translationJson[key][lang].trim() !== '';
        
        if (!hasTranslation) {
          missingForLang.push(key);
        }
      }
      
      if (missingForLang.length > 0) {
        missingKeys[lang] = missingForLang;
      }
    }
    
    if (Object.keys(missingKeys).length > 0) {
      return {
        valid: false,
        missingKeys
      };
    }
  }
  
  // 所有验证通过
  return { valid: true };
}

/**
 * 验证特定语言的翻译集合是否符合语言特性验证规则
 * @param translations 键值对形式的翻译集合
 * @param language 语言代码
 * @returns 验证结果，包含无效键列表
 */
export function validateLanguageTranslations(
  translations: Record<string, string>,
  language: SupportedLanguage
): {
  valid: boolean;
  invalidKeys?: string[];
  errors?: string[];
} {
  const languageSchema = getLanguageValidationSchema(language);
  const invalidKeys: string[] = [];
  const errors: string[] = [];
  
  // 验证每个翻译值是否符合语言特性要求
  for (const [key, value] of Object.entries(translations)) {
    const result = languageSchema.safeParse(value);
    if (!result.success) {
      invalidKeys.push(key);
      errors.push(`键 "${key}" 的 ${language} 翻译无效: ${result.error.message}`);
    }
  }
  
  return {
    valid: invalidKeys.length === 0,
    invalidKeys: invalidKeys.length > 0 ? invalidKeys : undefined,
    errors: errors.length > 0 ? errors : undefined
  };
}