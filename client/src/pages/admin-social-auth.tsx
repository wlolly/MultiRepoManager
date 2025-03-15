import React from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { queryClient } from '@/lib/queryClient';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Checkbox } from '@/components/ui/checkbox';
import { Spinner } from '@/components/ui/spinner';
import { useTranslation } from 'react-i18next';
import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';

// 社交认证配置验证模式
const socialAuthSchema = z.object({
  enabled: z.boolean().default(false),
  appId: z.string().optional(),
  appSecret: z.string().optional(),
  callbackUrl: z.string().optional()
});

type SocialAuthFormValues = z.infer<typeof socialAuthSchema>;

interface SocialAuthConfig {
  enabled: boolean;
  appId?: string;
  hasAppSecret: boolean;
  callbackUrl?: string;
  lastUpdated?: string;
  isValid: boolean;
}

interface SocialAuthConfigs {
  wechat: SocialAuthConfig;
  whatsapp: SocialAuthConfig;
}

function SocialConfigForm({ 
  platform, 
  config, 
  onSubmit 
}: { 
  platform: 'wechat' | 'whatsapp', 
  config: SocialAuthConfig, 
  onSubmit: (data: SocialAuthFormValues) => void 
}) {
  const { t } = useTranslation();
  
  // 初始化表单
  const form = useForm<SocialAuthFormValues>({
    resolver: zodResolver(socialAuthSchema),
    defaultValues: {
      enabled: config.enabled,
      appId: config.appId || '',
      appSecret: '',  // 不展示密钥，需要用户重新输入
      callbackUrl: config.callbackUrl || ''
    }
  });
  
  const watchEnabled = form.watch('enabled');
  
  const platformName = platform === 'wechat' ? '微信' : 'WhatsApp';
  
  // 表单提交处理
  const handleSubmit = (data: SocialAuthFormValues) => {
    onSubmit(data);
  };
  
  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(handleSubmit)}>
        <div className="space-y-4">
          <div className="flex items-center space-x-2">
            <FormField
              control={form.control}
              name="enabled"
              render={({ field }) => (
                <FormItem className="flex flex-row items-center space-x-3 space-y-0">
                  <FormControl>
                    <Checkbox
                      checked={field.value}
                      onCheckedChange={field.onChange}
                    />
                  </FormControl>
                  <FormLabel className="text-base">
                    {t('启用') + platformName + t('社交认证')}
                  </FormLabel>
                </FormItem>
              )}
            />
          </div>
          
          <FormField
            control={form.control}
            name="appId"
            render={({ field }) => (
              <FormItem>
                <FormLabel>{platformName} App ID</FormLabel>
                <FormControl>
                  <Input {...field} disabled={!watchEnabled} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          
          <FormField
            control={form.control}
            name="appSecret"
            render={({ field }) => (
              <FormItem>
                <FormLabel>{platformName} App Secret</FormLabel>
                <FormControl>
                  <Input 
                    {...field} 
                    type="password" 
                    placeholder={config.hasAppSecret ? "••••••••" : t('输入密钥')}
                    disabled={!watchEnabled} 
                  />
                </FormControl>
                {config.hasAppSecret && (
                  <FormDescription>
                    {t('已设置密钥，留空保持不变')}
                  </FormDescription>
                )}
                <FormMessage />
              </FormItem>
            )}
          />
          
          <FormField
            control={form.control}
            name="callbackUrl"
            render={({ field }) => (
              <FormItem>
                <FormLabel>{t('回调URL')}</FormLabel>
                <FormControl>
                  <Input {...field} disabled={!watchEnabled} />
                </FormControl>
                <FormDescription>
                  {t('请在社交平台开发者后台设置此回调地址')}
                </FormDescription>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>
        
        <Button 
          type="submit" 
          className="mt-4"
          disabled={!watchEnabled || form.formState.isSubmitting}
        >
          {form.formState.isSubmitting ? (
            <>
              <Spinner className="mr-2" />
              {t('保存中...')}
            </>
          ) : (
            t('保存配置')
          )}
        </Button>
      </form>
    </Form>
  );
}

export default function AdminSocialAuthConfig() {
  const { toast } = useToast();
  const { t } = useTranslation();
  
  // 获取社交认证配置
  const { data, isLoading, error } = useQuery({
    queryKey: ['/api/admin/social-auth-config'],
    refetchOnWindowFocus: false
  });
  
  // 更新微信配置
  const updateWechatConfig = useMutation({
    mutationFn: async (data: SocialAuthFormValues) => {
      const response = await fetch('/api/admin/social-auth-config/wechat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(data)
      });
      
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || '更新微信配置失败');
      }
      
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: t('更新成功'),
        description: t('微信认证配置已更新'),
        variant: 'default'
      });
      
      // 刷新配置数据
      queryClient.invalidateQueries({ queryKey: ['/api/admin/social-auth-config'] });
    },
    onError: (error: Error) => {
      toast({
        title: t('更新失败'),
        description: error.message || t('微信认证配置更新失败'),
        variant: 'destructive'
      });
    }
  });
  
  // 更新WhatsApp配置
  const updateWhatsappConfig = useMutation({
    mutationFn: async (data: SocialAuthFormValues) => {
      const response = await fetch('/api/admin/social-auth-config/whatsapp', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(data)
      });
      
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || '更新WhatsApp配置失败');
      }
      
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: t('更新成功'),
        description: t('WhatsApp认证配置已更新'),
        variant: 'default'
      });
      
      // 刷新配置数据
      queryClient.invalidateQueries({ queryKey: ['/api/admin/social-auth-config'] });
    },
    onError: (error: Error) => {
      toast({
        title: t('更新失败'),
        description: error.message || t('WhatsApp认证配置更新失败'),
        variant: 'destructive'
      });
    }
  });
  
  // 处理微信配置提交
  const handleWechatSubmit = (formData: SocialAuthFormValues) => {
    updateWechatConfig.mutate(formData);
  };
  
  // 处理WhatsApp配置提交
  const handleWhatsappSubmit = (formData: SocialAuthFormValues) => {
    updateWhatsappConfig.mutate(formData);
  };
  
  // 显示加载状态
  if (isLoading) {
    return (
      <div className="flex justify-center items-center h-[50vh]">
        <Spinner size="lg" />
        <span className="ml-2">{t('加载中...')}</span>
      </div>
    );
  }
  
  // 显示错误状态
  if (error) {
    return (
      <Card className="max-w-2xl mx-auto my-8">
        <CardHeader>
          <CardTitle>{t('错误')}</CardTitle>
          <CardDescription>{t('无法加载社交认证配置')}</CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-destructive">
            {(error as Error).message || t('发生未知错误')}
          </p>
        </CardContent>
        <CardFooter>
          <Button onClick={() => queryClient.invalidateQueries({ queryKey: ['/api/admin/social-auth-config'] })}>
            {t('重试')}
          </Button>
        </CardFooter>
      </Card>
    );
  }
  
  const configs: SocialAuthConfigs = data?.configs;
  
  return (
    <div className="container mx-auto py-6 space-y-6">
      <h1 className="text-3xl font-bold">{t('社交认证配置')}</h1>
      <p className="text-muted-foreground">
        {t('配置社交认证服务，使用户能够通过第三方社交账号登录系统。')}
      </p>
      
      <Tabs defaultValue="wechat" className="max-w-2xl w-full">
        <TabsList className="mb-4">
          <TabsTrigger value="wechat">{t('微信')}</TabsTrigger>
          <TabsTrigger value="whatsapp">WhatsApp</TabsTrigger>
        </TabsList>
        
        <TabsContent value="wechat">
          <Card>
            <CardHeader>
              <CardTitle>{t('微信认证配置')}</CardTitle>
              <CardDescription>
                {t('配置微信开放平台API凭据，以启用微信登录功能')}
              </CardDescription>
            </CardHeader>
            <CardContent>
              {configs?.wechat ? (
                <SocialConfigForm 
                  platform="wechat" 
                  config={configs.wechat} 
                  onSubmit={handleWechatSubmit} 
                />
              ) : (
                <p>{t('无法加载微信配置')}</p>
              )}
            </CardContent>
            <CardFooter className="flex justify-between border-t pt-4">
              <div className="text-sm text-muted-foreground">
                {configs?.wechat?.lastUpdated ? (
                  <span>{t('上次更新')}: {new Date(configs.wechat.lastUpdated).toLocaleString()}</span>
                ) : (
                  <span>{t('未设置')}</span>
                )}
              </div>
              <div className="text-sm">
                {configs?.wechat?.isValid ? (
                  <span className="text-green-500">{t('配置有效')}</span>
                ) : (
                  <span className="text-amber-500">{t('配置无效或不完整')}</span>
                )}
              </div>
            </CardFooter>
          </Card>
        </TabsContent>
        
        <TabsContent value="whatsapp">
          <Card>
            <CardHeader>
              <CardTitle>WhatsApp {t('认证配置')}</CardTitle>
              <CardDescription>
                {t('配置WhatsApp Business API凭据，以启用WhatsApp登录功能')}
              </CardDescription>
            </CardHeader>
            <CardContent>
              {configs?.whatsapp ? (
                <SocialConfigForm 
                  platform="whatsapp" 
                  config={configs.whatsapp} 
                  onSubmit={handleWhatsappSubmit} 
                />
              ) : (
                <p>{t('无法加载WhatsApp配置')}</p>
              )}
            </CardContent>
            <CardFooter className="flex justify-between border-t pt-4">
              <div className="text-sm text-muted-foreground">
                {configs?.whatsapp?.lastUpdated ? (
                  <span>{t('上次更新')}: {new Date(configs.whatsapp.lastUpdated).toLocaleString()}</span>
                ) : (
                  <span>{t('未设置')}</span>
                )}
              </div>
              <div className="text-sm">
                {configs?.whatsapp?.isValid ? (
                  <span className="text-green-500">{t('配置有效')}</span>
                ) : (
                  <span className="text-amber-500">{t('配置无效或不完整')}</span>
                )}
              </div>
            </CardFooter>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}