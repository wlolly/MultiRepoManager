import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { useTranslation } from 'react-i18next';
import i18n from '../i18n';

// 支持的语言列表
export const supportedLanguages = [
  { code: 'zh', name: '中文' },
  { code: 'en', name: 'English' },
  { code: 'ru', name: 'Русский' },
  { code: 'kk', name: 'Қазақша' },
  { code: 'uz', name: 'O\'zbekcha' }
];

// 翻译上下文接口
interface TranslationContextType {
  currentLanguage: string;
  changeLanguage: (lang: string) => Promise<void>;
  isLoading: boolean;
  translationMap: Record<string, Record<string, string>>;
  getMissingTranslationsCount: (lang: string) => number;
  missingTranslationsCount: number;
}

// 创建上下文
const TranslationContext = createContext<TranslationContextType | undefined>(undefined);

// 导出上下文提供者组件
export const TranslationProvider = ({ children }: { children: ReactNode }) => {
  const { t } = useTranslation();
  const [currentLanguage, setCurrentLanguage] = useState(i18n.language);
  const [isLoading, setIsLoading] = useState(false);
  const [translationMap, setTranslationMap] = useState<Record<string, Record<string, string>>>({});
  const [missingTranslationsCount, setMissingTranslationsCount] = useState(0);

  // 加载翻译数据 - 从数据库API加载
  useEffect(() => {
    const loadTranslations = async () => {
      try {
        // 从数据库API加载翻译数据
        const response = await fetch('/api/translations');
        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }

        const data = await response.json();
        setTranslationMap(data);
        
        // 计算当前语言缺失的翻译数量
        const missingCount = getMissingTranslationsCount(currentLanguage);
        setMissingTranslationsCount(missingCount);
      } catch (error) {
        console.error('无法从数据库加载翻译数据:', error);
        
        // 出错时尝试从文件加载作为备份方案
        try {
          const backupResponse = await fetch('/locales/translations.json');
          const backupData = await backupResponse.json();
          console.log('使用备份文件加载翻译数据');
          setTranslationMap(backupData);
        } catch (backupError) {
          console.error('备份翻译数据也无法加载:', backupError);
        }
      }
    };
    
    loadTranslations();
  }, [currentLanguage]);

  // 切换语言
  const changeLanguage = async (lang: string) => {
    setIsLoading(true);
    try {
      await i18n.changeLanguage(lang);
      setCurrentLanguage(lang);
      // 计算新语言缺失的翻译数量
      const missingCount = getMissingTranslationsCount(lang);
      setMissingTranslationsCount(missingCount);
      
      // 保存语言偏好到本地存储
      localStorage.setItem('i18nextLng', lang);
    } catch (error) {
      console.error('语言切换失败:', error);
    } finally {
      setIsLoading(false);
    }
  };

  // 获取指定语言缺失的翻译数量
  const getMissingTranslationsCount = (lang: string): number => {
    if (!translationMap || Object.keys(translationMap).length === 0) {
      return 0;
    }
    
    // 以英文为基准，计算其他语言缺失的翻译
    const baseLanguage = 'en';
    const baseKeys = Object.keys(translationMap[baseLanguage] || {});
    const targetKeys = Object.keys(translationMap[lang] || {});
    
    // 如果目标语言未定义，则所有翻译都缺失
    if (!translationMap[lang]) {
      return baseKeys.length;
    }
    
    // 计算缺失的翻译键数量
    let missingCount = 0;
    for (const key of baseKeys) {
      if (!translationMap[lang][key]) {
        missingCount++;
      }
    }
    
    return missingCount;
  };

  return (
    <TranslationContext.Provider
      value={{
        currentLanguage,
        changeLanguage,
        isLoading,
        translationMap,
        getMissingTranslationsCount,
        missingTranslationsCount
      }}
    >
      {children}
    </TranslationContext.Provider>
  );
};

// 导出使用翻译上下文的钩子
export const useTranslationContext = () => {
  const context = useContext(TranslationContext);
  if (context === undefined) {
    throw new Error('useTranslationContext必须在TranslationProvider内部使用');
  }
  return context;
};

// 语言选择器组件
export const LanguageSelector = ({ className }: { className?: string }) => {
  const { currentLanguage, changeLanguage } = useTranslationContext();
  
  return (
    <select
      value={currentLanguage}
      onChange={(e) => changeLanguage(e.target.value)}
      className={className}
    >
      {supportedLanguages.map((lang) => (
        <option key={lang.code} value={lang.code}>
          {lang.name}
        </option>
      ))}
    </select>
  );
};

// 翻译状态组件
export const TranslationStatus = () => {
  const { currentLanguage, missingTranslationsCount, translationMap } = useTranslationContext();
  const { t } = useTranslation();
  
  // 如果翻译数据未加载，显示加载中
  if (!translationMap || Object.keys(translationMap).length === 0) {
    return <div>{t('loading_translations')}</div>;
  }
  
  // 计算翻译完成百分比
  const baseLanguage = 'en';
  const totalTranslations = Object.keys(translationMap[baseLanguage] || {}).length;
  const completionPercentage = totalTranslations > 0
    ? Math.round(((totalTranslations - missingTranslationsCount) / totalTranslations) * 100)
    : 100;
  
  return (
    <div className="p-4 bg-gray-100 rounded">
      <h3 className="text-lg font-medium">{t('translation_status')}</h3>
      <p>
        {t('current_language')}: <strong>{supportedLanguages.find(l => l.code === currentLanguage)?.name}</strong>
      </p>
      <p>
        {t('translation_completion')}: <strong>{completionPercentage}%</strong>
      </p>
      {missingTranslationsCount > 0 && (
        <p className="text-yellow-600">
          {t('missing_translations')}: <strong>{missingTranslationsCount}</strong>
        </p>
      )}
    </div>
  );
};