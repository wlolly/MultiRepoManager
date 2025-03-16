import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
// 使用fetch加载翻译文件，而不是直接导入
// 原路径：'../../public/locales/translations.json'

// 支持的语言列表
export const supportedLanguages = [
  { code: 'zh', name: '中文' },
  { code: 'en', name: 'English' },
  { code: 'ru', name: 'Русский' },
  { code: 'kk', name: 'Қазақша' },
  { code: 'uz', name: 'O\'zbek' }
];

// 支持的语言代码
const languageCodes = ['zh', 'en', 'ru', 'kk', 'uz'];

// 创建各语言的翻译资源
const resources: Record<string, { translation: Record<string, string> }> = {};

// 初始化各语言的资源对象
languageCodes.forEach(langCode => {
  resources[langCode] = { translation: {} };
});

// 处理翻译对象 - 确保处理所有嵌套结构和插值
function processTranslations(translationsData: Record<string, any>) {
  // 记录处理的翻译键数量
  let processedKeys = 0;
  let processedLangEntries = 0;
  let timeKeysProcessed = 0;

  // 遍历所有翻译键
  Object.entries(translationsData).forEach(([key, value]) => {
    // 确保value是一个对象
    if (value && typeof value === 'object') {
      processedKeys++;
      
      // 特别标记time.*相关的键以便调试
      if (key.startsWith('time.')) {
        timeKeysProcessed++;
        console.log(`处理时间相关翻译键: ${key}`, value);
      }
      
      // 为每种语言提取对应的翻译值
      languageCodes.forEach(langCode => {
        // 确保有该语言的翻译
        if (value[langCode] !== undefined) {
          const translationValue = value[langCode] as string;
          
          // 将翻译值添加到资源对象中
          resources[langCode].translation[key] = translationValue;
          processedLangEntries++;
        }
      });
    }
  });
  
  console.log(`处理了 ${processedKeys} 个翻译键，共 ${processedLangEntries} 条翻译条目`);
  console.log(`处理了 ${timeKeysProcessed} 个时间相关翻译键`);
}

// 异步加载翻译文件
async function loadTranslations() {
  try {
    // 首先尝试从API加载
    const apiResponse = await fetch('/api/translations');
    if (apiResponse.ok) {
      const translationsData = await apiResponse.json();
      console.log('从API加载翻译数据成功');
      
      // 处理从API获取的翻译数据
      processTranslations(translationsData);
      console.log('翻译资源处理完成，可用语言：', Object.keys(resources));
      
      // 加载翻译后重新初始化i18n
      initializeI18n();
      return;
    }
    
    // 如果API加载失败，尝试从静态文件加载
    console.log('从API加载翻译失败，尝试使用静态文件');
    const fileResponse = await fetch('/locales/translations.json');
    if (!fileResponse.ok) {
      throw new Error(`HTTP error! status: ${fileResponse.status}`);
    }
    
    const translationsData = await fileResponse.json();
    processTranslations(translationsData);
    console.log('从静态文件加载翻译资源成功，可用语言：', Object.keys(resources));
    
    // 打印前10个键的示例，便于调试
    if (resources.zh && resources.zh.translation) {
      const sampleKeys = Object.keys(resources.zh.translation).slice(0, 10);
      console.log('示例翻译键（中文）:', sampleKeys.map(key => `${key}: ${resources.zh.translation[key]}`));
    }
    
    // 加载翻译后重新初始化i18n
    initializeI18n();
  } catch (error) {
    console.error('加载或处理翻译资源时出错：', error);
  }
}

// 初始化i18next
function initializeI18n() {
  i18n
    .use(initReactI18next)
    .init({
      resources,
      fallbackLng: 'zh', // 默认语言为中文
      debug: false,
      interpolation: {
        escapeValue: false, // 不转义HTML
        format: function(value, format, lng) {
          // 支持数字格式化
          if (format === 'number' && !isNaN(value)) {
            return new Intl.NumberFormat(lng).format(value);
          }
          return value;
        }
      }
    });

  // 初始化 - 读取之前保存的语言设置，如果没有则默认使用中文
  const savedLanguage = localStorage.getItem('i18nextLng');
  if (savedLanguage && languageCodes.includes(savedLanguage)) {
    i18n.changeLanguage(savedLanguage);
    console.log(`已从本地存储加载语言: ${savedLanguage}`);
  } else {
    i18n.changeLanguage('zh');
    localStorage.setItem('i18nextLng', 'zh');
    console.log('默认使用中文');
  }
}

// 更改语言的函数
export const changeLanguage = (langCode: string) => {
  localStorage.setItem('i18nextLng', langCode);
  
  // 更改语言
  i18n.changeLanguage(langCode).then(() => {
    
    let message = '';
    switch(langCode) {
      case 'zh':
        message = '语言已设置为中文';
        break;
      case 'en':
        message = 'Language set to English';
        break;
      case 'ru':
        message = 'Язык установлен на русский';
        break;
      case 'kk':
        message = 'Тіл қазақ тіліне орнатылды';
        break;
      case 'uz':
        message = 'Til o\'zbek tiliga o\'rnatildi';
        break;
    }
    
    console.log(message, langCode);
  });
  
  return langCode;
};

// 兼容旧代码的函数
export const forceChineseLanguage = () => {
  return changeLanguage('zh');
};

// 初始调用，加载翻译文件
loadTranslations();

// 先初始化一个空i18n实例，后续会通过loadTranslations()异步更新
initializeI18n();

export default i18n;