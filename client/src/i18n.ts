import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import HttpApi from 'i18next-http-backend';

i18n
  .use(HttpApi)
  .use(initReactI18next)
  .init({
    lng: 'zh', // 默认使用中文
    fallbackLng: 'en', // 如果当前语言没有对应的翻译，则使用英文
    supportedLngs: ['zh', 'en', 'ru', 'kk', 'uz'], // 支持的语言列表 
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
  });

export default i18n;