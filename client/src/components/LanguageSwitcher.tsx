import React from 'react';
import { useTranslation } from 'react-i18next';
import { useTranslationContext, supportedLanguages } from '../contexts/TranslationContext';
import { Button } from '@/components/ui/button';
import { Check, Globe } from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

/**
 * 语言切换组件
 * 提供下拉菜单方式的语言切换功能
 */
export function LanguageSwitcher() {
  const { t } = useTranslation();
  const { currentLanguage, changeLanguage } = useTranslationContext();

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" size="sm" className="h-8 gap-1">
          <Globe className="h-4 w-4" />
          <span className="hidden md:inline-block">
            {supportedLanguages.find(lang => lang.code === currentLanguage)?.name || '中文'}
          </span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuLabel>{t('select_language')}</DropdownMenuLabel>
        <DropdownMenuSeparator />
        {supportedLanguages.map((language) => (
          <DropdownMenuItem
            key={language.code}
            className="flex items-center justify-between gap-2 cursor-pointer"
            onClick={() => changeLanguage(language.code)}
          >
            <span>{language.name}</span>
            {currentLanguage === language.code && (
              <Check className="h-4 w-4 text-green-500" />
            )}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

/**
 * 简易语言切换器（用于移动设备或空间有限的区域）
 */
export function SimpleLanguageSwitcher() {
  const { currentLanguage, changeLanguage } = useTranslationContext();
  
  const handleToggleLanguage = () => {
    // 简单切换中英文
    const nextLang = currentLanguage === 'zh' ? 'en' : 'zh';
    changeLanguage(nextLang);
  };
  
  return (
    <Button 
      variant="ghost" 
      size="sm" 
      onClick={handleToggleLanguage}
      className="p-1 h-8 w-8"
    >
      <Globe className="h-4 w-4" />
    </Button>
  );
}

/**
 * 多语言状态徽章 - 显示当前使用的语言和翻译完成度
 */
export function LanguageStatusBadge() {
  const { currentLanguage, missingTranslationsCount } = useTranslationContext();
  const { t } = useTranslation();
  
  const currentLangName = supportedLanguages.find(lang => lang.code === currentLanguage)?.name || '中文';
  
  return (
    <div className="inline-flex items-center gap-1 px-2 py-1 text-xs rounded bg-blue-100 text-blue-800">
      <Globe className="h-3 w-3" />
      <span>{currentLangName}</span>
      {missingTranslationsCount > 0 && (
        <span className="text-yellow-600 ml-1">
          ({t('missing_translations')}: {missingTranslationsCount})
        </span>
      )}
    </div>
  );
}