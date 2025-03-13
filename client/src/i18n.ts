import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import HttpApi from 'i18next-http-backend';
import zhTranslation from '../../public/locales/zh/common.json';

// 直接加载中文翻译文件
const resources = {
  zh: {
    common: zhTranslation
  }
};

i18n
  .use(HttpApi)
  .use(initReactI18next)
  .init({
    lng: 'zh', // 默认使用中文
    fallbackLng: 'en', // 如果当前语言没有对应的翻译，则使用英文
    supportedLngs: ['zh', 'en', 'ru', 'kk', 'uz'], // 支持的语言列表 
    resources, // 直接使用加载的资源
    interpolation: {
      escapeValue: false // 不转义插值
    },
    backend: {
      loadPath: '/locales/{{lng}}/{{ns}}.json', // 翻译文件路径
    },
    ns: ['common'], // 使用的命名空间
    defaultNS: 'common', // 默认命名空间
    react: {
      useSuspense: false, // 不使用React.Suspense
    },
    detection: {
      order: ['cookie', 'localStorage'],
      caches: ['cookie', 'localStorage'],
    }
  });

// 强制设置为中文
if (i18n.language !== 'zh') {
  i18n.changeLanguage('zh');
}

// 创建一个强制设置语言的函数，可以在应用中调用
export const forceChineseLanguage = () => {
  localStorage.setItem('i18nextLng', 'zh');
  i18n.changeLanguage('zh');
};

export default i18n;