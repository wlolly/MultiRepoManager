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
  const result = translationEntrySchema.safeParse({ key, language, value });
  
  if (!result.success) {
    return {
      success: false,
      errors: result.error.issues
    };
  }
  
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
} {
  const result = translationBatchSchema.safeParse(translations);
  
  if (!result.success) {
    return {
      success: false,
      errors: result.error.issues
    };
  }
  
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