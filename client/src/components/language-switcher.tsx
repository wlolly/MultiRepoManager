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
    // 获取界面显示的消息
    let message = '';
    switch(lng) {
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

    // 直接切换语言，使用内部翻译资源
    import('@/i18n').then(({ changeLanguage }) => {
      try {
        changeLanguage(lng);
        
        // 显示成功提示
        toast({
          title: message,
          description: "语言已成功切换",
          duration: 2000
        });
      } catch (error: any) {
        console.error("语言切换失败:", error);
        
        // 显示错误提示
        toast({
          title: "语言切换失败",
          description: error.message || "无法加载翻译资源",
          variant: "destructive",
          duration: 3000
        });
      }
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