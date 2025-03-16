import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useTranslationContext, supportedLanguages } from '../contexts/TranslationContext';
import { 
  getTranslationStats, 
  getMissingTranslations, 
  logTranslationDebug 
} from '../lib/translations';
import { Button } from '@/components/ui/button';
import { 
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

/**
 * 翻译调试面板组件
 * 用于开发环境中显示翻译状态和调试信息
 */
export default function TranslationDebugPanel() {
  const { t } = useTranslation();
  const { currentLanguage, changeLanguage, translationMap } = useTranslationContext();
  const [showMissingKeys, setShowMissingKeys] = useState(false);
  
  // 计算翻译统计信息
  const stats = getTranslationStats();
  
  // 获取当前语言缺失的翻译键
  const missingKeys = getMissingTranslations(currentLanguage);
  
  // 记录调试信息到控制台
  const handleLogDebug = () => {
    logTranslationDebug();
  };
  
  return (
    <Card className="w-full mt-4">
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <span>{t('translation_debug_title')}</span>
          <Button 
            size="sm" 
            variant="outline" 
            onClick={handleLogDebug}
          >
            {t('log_debug_info')}
          </Button>
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid gap-4">
          {/* 当前语言信息 */}
          <div className="flex items-center gap-2">
            <span className="font-medium">{t('current_language')}:</span>
            <Badge variant="secondary">
              {supportedLanguages.find(l => l.code === currentLanguage)?.name || '中文'}
            </Badge>
          </div>
          
          {/* 翻译完成状态 */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-2">
            {Object.entries(stats).map(([langCode, langStats]) => (
              <div 
                key={langCode} 
                className={`flex flex-col p-3 rounded border ${
                  langCode === currentLanguage 
                    ? 'bg-primary/10 border-primary' 
                    : 'bg-background border-border'
                }`}
              >
                <div className="flex items-center justify-between mb-1">
                  <span className="font-medium">
                    {supportedLanguages.find(l => l.code === langCode)?.name || langCode}
                  </span>
                  <Badge variant={langStats.percentage === 100 ? 'success' : langStats.percentage > 70 ? 'default' : 'destructive'}>
                    {langStats.percentage}%
                  </Badge>
                </div>
                <div className="text-xs text-muted-foreground">
                  {t('completed')}: {langStats.completed}/{langStats.total}
                </div>
                {langCode !== currentLanguage && (
                  <Button 
                    variant="ghost" 
                    size="sm" 
                    className="mt-2" 
                    onClick={() => changeLanguage(langCode)}
                  >
                    {t('switch_to_this_language')}
                  </Button>
                )}
              </div>
            ))}
          </div>
          
          {/* 缺失翻译键 */}
          {missingKeys.length > 0 && (
            <Accordion type="single" collapsible>
              <AccordionItem value="missing-keys">
                <AccordionTrigger>
                  <div className="flex items-center gap-2">
                    <span>{t('missing_translations')}</span>
                    <Badge variant="outline">{missingKeys.length}</Badge>
                  </div>
                </AccordionTrigger>
                <AccordionContent>
                  <div className="bg-muted p-3 rounded max-h-60 overflow-y-auto">
                    <ul className="list-disc pl-5 space-y-1">
                      {missingKeys.map(key => (
                        <li key={key} className="text-sm">
                          <code className="bg-muted-foreground/20 px-1 py-0.5 rounded text-xs">{key}</code>
                        </li>
                      ))}
                    </ul>
                  </div>
                </AccordionContent>
              </AccordionItem>
            </Accordion>
          )}
          
          {/* 工具按钮 */}
          <div className="flex items-center justify-end gap-2 mt-2">
            <Button 
              variant="secondary" 
              size="sm" 
              onClick={() => changeLanguage('zh')}
            >
              切换到中文
            </Button>
            <Button 
              variant="secondary" 
              size="sm" 
              onClick={() => changeLanguage('en')}
            >
              Switch to English
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}