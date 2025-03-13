import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import HttpBackend from 'i18next-http-backend';

// 支持的语言列表
export const supportedLanguages = [
  { code: 'zh', name: '中文' },
  { code: 'en', name: 'English' },
  { code: 'ru', name: 'Русский' },
  { code: 'kk', name: 'Қазақша' },
  { code: 'uz', name: 'O\'zbek' }
];

// 使用后端加载翻译资源
i18n
  .use(HttpBackend) // 使用HTTP后端从JSON文件加载翻译
  .use(initReactI18next) // 将i18n传递给react-i18next
  .init({
    fallbackLng: 'zh', // 默认语言为中文
    ns: ['common'], // 命名空间
    defaultNS: 'common', // 默认命名空间
    debug: false,
    interpolation: {
      escapeValue: false, // 不转义HTML
    },
    backend: {
      loadPath: '/locales/{{lng}}/{{ns}}.json', // JSON文件路径
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

// 初始化
console.log("所有语言资源已加载");
  
// 读取之前保存的语言设置，如果没有则默认使用中文
const savedLanguage = localStorage.getItem('i18nextLng');
if (savedLanguage && ['zh', 'en', 'ru', 'kk', 'uz'].includes(savedLanguage)) {
  i18n.changeLanguage(savedLanguage);
  console.log(`已从本地存储加载语言: ${savedLanguage}`);
} else {
  i18n.changeLanguage('zh');
  localStorage.setItem('i18nextLng', 'zh');
  console.log('默认使用中文');
}

export default i18n;