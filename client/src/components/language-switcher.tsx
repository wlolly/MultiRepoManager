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
    // 直接切换语言，使用内部翻译资源
    import('@/i18n').then(({ changeLanguage }) => {
      try {
        changeLanguage(lng);
        
        // 根据目标语言设置提示语言(已切换到该语言)
        const successMessages = {
          zh: { title: '语言已设置为中文', description: "语言已成功切换" },
          en: { title: 'Language set to English', description: "Language successfully changed" },
          ru: { title: 'Язык установлен на русский', description: "Язык успешно изменен" },
          kk: { title: 'Тіл қазақ тіліне орнатылды', description: "Тіл сәтті өзгертілді" },
          uz: { title: 'Til o\'zbek tiliga o\'rnatildi', description: "Til muvaffaqiyatli o'zgartirildi" }
        };
        
        // 显示成功提示，使用用户选择的语言
        toast({
          title: successMessages[lng as keyof typeof successMessages].title,
          description: successMessages[lng as keyof typeof successMessages].description,
          duration: 2000
        });
      } catch (error: any) {
        console.error("语言切换失败:", error);
        
        // 错误提示使用当前语言
        const errorMessages = {
          zh: { title: "语言切换失败", description: "无法加载翻译资源" },
          en: { title: "Language change failed", description: "Unable to load translation resources" },
          ru: { title: "Ошибка смены языка", description: "Не удалось загрузить ресурсы перевода" },
          kk: { title: "Тілді ауыстыру қатесі", description: "Аударма ресурстарын жүктеу мүмкін емес" },
          uz: { title: "Tilni o'zgartirish xatosi", description: "Tarjima resurslarini yuklab bo'lmadi" }
        };
        
        toast({
          title: errorMessages[lng as keyof typeof errorMessages].title,
          description: error.message || errorMessages[lng as keyof typeof errorMessages].description,
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