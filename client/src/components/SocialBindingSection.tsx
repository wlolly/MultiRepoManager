import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import { Loader2 } from 'lucide-react';
import axios from 'axios';

interface SocialAccountStatus {
  wechat: boolean;
  whatsapp: boolean;
  loading: boolean;
}

/**
 * 社交账号绑定组件
 * 显示用户当前绑定的社交账号状态，并提供绑定/解绑功能
 */
export default function SocialBindingSection() {
  const { t } = useTranslation();
  const { toast } = useToast();
  const [socialStatus, setSocialStatus] = useState<SocialAccountStatus>({
    wechat: false,
    whatsapp: false,
    loading: true
  });
  
  // 获取当前社交账号绑定状态
  useEffect(() => {
    const fetchSocialStatus = async () => {
      try {
        const response = await axios.get('/api/auth/social-binding-status');
        if (response.status === 200 && response.data) {
          setSocialStatus({
            wechat: response.data.wechat || false,
            whatsapp: response.data.whatsapp || false,
            loading: false
          });
        }
      } catch (error) {
        console.error('获取社交账号绑定状态失败:', error);
        setSocialStatus(prev => ({ ...prev, loading: false }));
        
        toast({
          title: t('settings.socialBinding.fetchError', '获取绑定状态失败'),
          description: t('settings.socialBinding.fetchErrorDesc', '无法获取您的社交账号绑定信息，请稍后再试'),
          variant: "destructive"
        });
      }
    };
    
    fetchSocialStatus();
  }, [toast, t]);
  
  // 处理社交账号绑定
  const handleBindSocial = (provider: string) => {
    // 保存当前URL，以便绑定完成后返回
    sessionStorage.setItem('returnAfterBinding', window.location.pathname);
    
    // 跳转到社交账号授权页面
    window.location.href = `/api/auth/bind/${provider}`;
  };
  
  // 处理社交账号解绑
  const handleUnbindSocial = async (provider: string) => {
    try {
      setSocialStatus(prev => ({ ...prev, loading: true }));
      
      const response = await axios.post('/api/auth/unbind', { provider });
      
      if (response.status === 200) {
        setSocialStatus(prev => ({
          ...prev,
          [provider]: false,
          loading: false
        }));
        
        toast({
          title: t('settings.socialBinding.unbindSuccess', '解绑成功'),
          description: t('settings.socialBinding.unbindSuccessDesc', `您的${provider === 'wechat' ? '微信' : 'WhatsApp'}账号已成功解绑`),
          variant: "default"
        });
      }
    } catch (error) {
      console.error(`解绑${provider}失败:`, error);
      setSocialStatus(prev => ({ ...prev, loading: false }));
      
      toast({
        title: t('settings.socialBinding.unbindError', '解绑失败'),
        description: t('settings.socialBinding.unbindErrorDesc', '无法解绑您的社交账号，请稍后再试'),
        variant: "destructive"
      });
    }
  };
  
  // 检查是否所有社交账号都已解绑
  const allUnbound = !socialStatus.wechat && !socialStatus.whatsapp;
  
  return (
    <div className="space-y-4">
      {socialStatus.loading ? (
        <div className="flex items-center justify-center py-4">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
          <span className="ml-2">{t('settings.socialBinding.loading', '正在加载绑定状态...')}</span>
        </div>
      ) : (
        <>
          <Card className="p-4 border-2 border-gray-200">
            <div className="flex items-center justify-between">
              <div className="flex items-center">
                <div className="p-2 bg-gray-100 rounded-full">
                  <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M8 10.9c-1-.1-1.9-.9-1.9-2s.9-1.9 1.9-1.9c1.1 0 1.9.8 2 1.9 0 1.1-.9 2-2 2z"></path>
                    <path d="M12 7c-5 0-9 3.1-9 7s4 7 9 7c.3 0 .7 0 1-.1.3.2.5.3.8.5l2 1c.3.2.7.3 1.1.3.8 0 1.5-.6 1.5-1.5v-3c1.7-1.5 2.6-3.5 2.6-5.7 0-3.5-3.3-6.3-8-6.5z"></path>
                    <path d="M17 10.9c-1-.1-1.9-.9-1.9-2s.9-1.9 1.9-1.9c1.1 0 1.9.8 2 1.9 0 1.1-.9 2-2 2z"></path>
                  </svg>
                </div>
                <div className="ml-4">
                  <h4 className="text-base font-medium">
                    {t('settings.socialBinding.wechatTitle', '微信账号')}
                  </h4>
                  <p className="text-sm text-gray-500">
                    {socialStatus.wechat 
                      ? t('settings.socialBinding.bound', '已绑定') 
                      : t('settings.socialBinding.notBound', '未绑定')}
                  </p>
                </div>
              </div>
              
              {socialStatus.wechat ? (
                <Button 
                  variant="outline" 
                  onClick={() => handleUnbindSocial('wechat')}
                  disabled={socialStatus.loading || (allUnbound && !socialStatus.wechat)}
                >
                  {t('settings.socialBinding.unbind', '解除绑定')}
                </Button>
              ) : (
                <Button 
                  variant="default" 
                  onClick={() => handleBindSocial('wechat')}
                  disabled={socialStatus.loading}
                >
                  {t('settings.socialBinding.bind', '立即绑定')}
                </Button>
              )}
            </div>
          </Card>
          
          <Card className="p-4 border-2 border-gray-200">
            <div className="flex items-center justify-between">
              <div className="flex items-center">
                <div className="p-2 bg-gray-100 rounded-full">
                  <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M3 21l1.65-3.8a9 9 0 1 1 3.4 2.9L3 21"></path>
                    <path d="M9 10a.5.5 0 0 0 1 0V9a.5.5 0 0 0-1 0v1Z"></path>
                    <path d="M14 10a.5.5 0 0 0 1 0V9a.5.5 0 0 0-1 0v1Z"></path>
                    <path d="M8 13h0c0 1 .895 2 2 2h4c1.105 0 2-1 2-2"></path>
                  </svg>
                </div>
                <div className="ml-4">
                  <h4 className="text-base font-medium">
                    {t('settings.socialBinding.whatsappTitle', 'WhatsApp账号')}
                  </h4>
                  <p className="text-sm text-gray-500">
                    {socialStatus.whatsapp 
                      ? t('settings.socialBinding.bound', '已绑定') 
                      : t('settings.socialBinding.notBound', '未绑定')}
                  </p>
                </div>
              </div>
              
              {socialStatus.whatsapp ? (
                <Button 
                  variant="outline" 
                  onClick={() => handleUnbindSocial('whatsapp')}
                  disabled={socialStatus.loading || (allUnbound && !socialStatus.whatsapp)}
                >
                  {t('settings.socialBinding.unbind', '解除绑定')}
                </Button>
              ) : (
                <Button 
                  variant="default" 
                  onClick={() => handleBindSocial('whatsapp')}
                  disabled={socialStatus.loading}
                >
                  {t('settings.socialBinding.bind', '立即绑定')}
                </Button>
              )}
            </div>
          </Card>
          
          <div className="mt-2 text-sm text-gray-500">
            <p>{t('settings.socialBinding.requirement', '注意: 系统安全策略要求您必须至少绑定一个社交账号')}</p>
            {allUnbound && (
              <p className="text-red-500 mt-1">
                {t('settings.socialBinding.warning', '警告: 您当前没有绑定任何社交账号，这可能会导致您无法登录系统')}
              </p>
            )}
          </div>
        </>
      )}
    </div>
  );
}