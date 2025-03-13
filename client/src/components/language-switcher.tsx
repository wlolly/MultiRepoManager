import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuLabel
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";
import { Globe } from "lucide-react";
import { supportedLanguages } from '@/i18n';
import { useToast } from "@/hooks/use-toast";

export function LanguageSwitcher() {
  const { t, i18n } = useTranslation();
  const [currentLanguage, setCurrentLanguage] = useState(i18n.language);
  const { toast } = useToast();

  // 监听语言变化
  useEffect(() => {
    const handleLanguageChanged = () => {
      setCurrentLanguage(i18n.language);
    };

    i18n.on('languageChanged', handleLanguageChanged);
    
    return () => {
      i18n.off('languageChanged', handleLanguageChanged);
    };
  }, [i18n]);

  const handleLanguageChange = (lng: string) => {
    import('@/i18n').then(({ changeLanguage }) => {
      const langCode = changeLanguage(lng);
      
      // 显示提示
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
      
      toast({
        title: message,
        description: "",
        duration: 2000
      });
    });
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
          <Globe className="h-4 w-4" />
          <span className="sr-only">{t('header.language.title', '切换语言')}</span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuLabel>{t('header.language.title', '切换语言')}</DropdownMenuLabel>
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