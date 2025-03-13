import React from 'react';
import { useTranslation } from 'react-i18next';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";
import { Globe } from "lucide-react";

export function LanguageSwitcher() {
  const { t, i18n } = useTranslation();
  const currentLanguage = i18n.language;

  const changeLanguage = (lng: string) => {
    i18n.changeLanguage(lng);
    // 可选：将所选语言保存到localStorage
    localStorage.setItem('i18nextLng', lng);
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
          <Globe className="h-4 w-4" />
          <span className="sr-only">{t('header.language.title')}</span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuItem 
          className={currentLanguage === 'zh' ? 'bg-accent' : ''} 
          onClick={() => changeLanguage('zh')}
        >
          {t('header.language.zh')} (中文)
        </DropdownMenuItem>
        <DropdownMenuItem 
          className={currentLanguage === 'en' ? 'bg-accent' : ''} 
          onClick={() => changeLanguage('en')}
        >
          {t('header.language.en')} (English)
        </DropdownMenuItem>
        <DropdownMenuItem 
          className={currentLanguage === 'ru' ? 'bg-accent' : ''} 
          onClick={() => changeLanguage('ru')}
        >
          {t('header.language.ru')} (Русский)
        </DropdownMenuItem>
        <DropdownMenuItem 
          className={currentLanguage === 'kk' ? 'bg-accent' : ''} 
          onClick={() => changeLanguage('kk')}
        >
          {t('header.language.kk')} (Қазақша)
        </DropdownMenuItem>
        <DropdownMenuItem 
          className={currentLanguage === 'uz' ? 'bg-accent' : ''} 
          onClick={() => changeLanguage('uz')}
        >
          {t('header.language.uz')} (O'zbekcha)
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}