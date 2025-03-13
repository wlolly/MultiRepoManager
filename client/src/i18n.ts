import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import translations from '../../public/locales/translations.json';

// 支持的语言列表
export const supportedLanguages = [
  { code: 'zh', name: '中文' },
  { code: 'en', name: 'English' },
  { code: 'ru', name: 'Русский' },
  { code: 'kk', name: 'Қазақша' },
  { code: 'uz', name: 'O\'zbek' }
];

// 定义翻译文件的类型
type TranslationsType = Record<string, Record<string, string>>;

// 从translations.json生成各语言的资源对象
const resources: Record<string, { translation: Record<string, string> }> = {};

// 支持的语言代码
const languageCodes = ['zh', 'en', 'ru', 'kk', 'uz'];

// 为每种语言生成翻译资源
languageCodes.forEach(langCode => {
  resources[langCode] = {
    translation: {}
  };
  
  // 遍历所有翻译键，为每种语言提取对应的翻译
  Object.keys(translations).forEach(key => {
    const translationObj = translations as TranslationsType;
    if (translationObj[key] && translationObj[key][langCode]) {
      resources[langCode].translation[key] = translationObj[key][langCode];
    }
  });
});

// 初始化i18next
i18n
  .use(initReactI18next)
  .init({
    resources,
    fallbackLng: 'zh', // 默认语言为中文
    debug: false,
    interpolation: {
      escapeValue: false, // 不转义HTML
    }
  });

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

export default i18n;