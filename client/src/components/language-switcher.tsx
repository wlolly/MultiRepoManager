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
import { supportedLanguages } from '@/i18n';

export function LanguageSwitcher() {
  const { t, i18n } = useTranslation();
  const currentLanguage = i18n.language;

  const handleLanguageChange = (lng: string) => {
    import('@/i18n').then(({ changeLanguage }) => {
      changeLanguage(lng);
    });
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
          <Globe className="h-4 w-4" />
          <span className="sr-only">切换语言</span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuItem 
          className={currentLanguage === 'zh' ? 'bg-accent' : ''} 
          onClick={() => handleLanguageChange('zh')}
        >
          中文
        </DropdownMenuItem>
        <DropdownMenuItem 
          className={currentLanguage === 'en' ? 'bg-accent' : ''} 
          onClick={() => handleLanguageChange('en')}
        >
          English
        </DropdownMenuItem>
        <DropdownMenuItem 
          className={currentLanguage === 'ru' ? 'bg-accent' : ''} 
          onClick={() => handleLanguageChange('ru')}
        >
          Русский
        </DropdownMenuItem>
        <DropdownMenuItem 
          className={currentLanguage === 'kk' ? 'bg-accent' : ''} 
          onClick={() => handleLanguageChange('kk')}
        >
          Қазақша
        </DropdownMenuItem>
        <DropdownMenuItem 
          className={currentLanguage === 'uz' ? 'bg-accent' : ''} 
          onClick={() => handleLanguageChange('uz')}
        >
          O'zbekcha
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}