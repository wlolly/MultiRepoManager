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
    // 获取对应语言的名称
    const languageName = t(`${lng === 'zh' ? 'chinese' : lng === 'en' ? 'english' : lng === 'ru' ? 'russian' : lng === 'kk' ? 'kazakh' : 'uzbek'}`);

    // 直接切换语言，使用内部翻译资源
    import('@/i18n').then(({ changeLanguage }) => {
      try {
        changeLanguage(lng);
        
        // 显示成功提示
        toast({
          title: lng === 'zh' ? '语言已设置为中文' :
                 lng === 'en' ? 'Language set to English' :
                 lng === 'ru' ? 'Язык установлен на русский' :
                 lng === 'kk' ? 'Тіл қазақ тіліне орнатылды' :
                                'Til o\'zbek tiliga o\'rnatildi',
          description: lng === 'zh' ? "语言已成功切换" :
                       lng === 'en' ? "Language successfully changed" :
                       lng === 'ru' ? "Язык успешно изменен" :
                       lng === 'kk' ? "Тіл сәтті өзгертілді" :
                                      "Til muvaffaqiyatli o'zgartirildi",
          duration: 2000
        });
      } catch (error: any) {
        console.error("语言切换失败:", error);
        
        // 显示错误提示
        toast({
          title: lng === 'zh' ? "语言切换失败" :
                 lng === 'en' ? "Language change failed" :
                 lng === 'ru' ? "Ошибка смены языка" :
                 lng === 'kk' ? "Тілді ауыстыру қатесі" :
                                "Tilni o'zgartirish xatosi",
          description: error.message || (
            lng === 'zh' ? "无法加载翻译资源" :
            lng === 'en' ? "Unable to load translation resources" :
            lng === 'ru' ? "Не удалось загрузить ресурсы перевода" :
            lng === 'kk' ? "Аударма ресурстарын жүктеу мүмкін емес" :
                          "Tarjima resurslarini yuklab bo'lmadi"
          ),
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
          <span className="sr-only">{t('language')}</span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuLabel>{t('language')}</DropdownMenuLabel>
        {supportedLanguages.map((lang) => (
          <DropdownMenuItem 
            key={lang.code}
            className={currentLanguage === lang.code ? 'bg-accent' : ''} 
            onClick={() => handleLanguageChange(lang.code)}
          >
            {lang.name}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}