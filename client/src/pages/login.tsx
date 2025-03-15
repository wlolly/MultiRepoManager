import { useState } from 'react';
import { useNavigate } from 'wouter';
import { z } from 'zod';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useTranslation } from 'react-i18next';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useToast } from '@/hooks/use-toast';
import { useQueryClient } from '@tanstack/react-query';
import { Separator } from '@/components/ui/separator';

// 登录表单验证模式
const loginSchema = z.object({
  username: z.string().min(3, "用户名至少3个字符"),
  password: z.string().min(6, "密码至少6个字符"),
});

// 社交媒体登录按钮
const SocialLoginButton = ({ 
  icon, 
  title, 
  onClick, 
  provider 
}: { 
  icon: string; 
  title: string; 
  onClick: () => void; 
  provider: 'wechat' | 'whatsapp';
}) => {
  const bgColor = provider === 'wechat' ? 'bg-[#07C160]' : 'bg-[#25D366]';
  
  return (
    <Button 
      className={`w-full ${bgColor} hover:opacity-90 text-white`}
      onClick={onClick}
    >
      <i className={icon + " mr-2 text-lg"}></i>
      {title}
    </Button>
  );
};

export default function LoginPage() {
  const [isLoading, setIsLoading] = useState(false);
  const [activeTab, setActiveTab] = useState('account');
  const [_, navigate] = useNavigate();
  const { toast } = useToast();
  const { t } = useTranslation();
  const queryClient = useQueryClient();

  // 登录表单
  const form = useForm<z.infer<typeof loginSchema>>({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      username: "",
      password: "",
    },
  });

  // 处理表单提交
  const onSubmit = async (values: z.infer<typeof loginSchema>) => {
    try {
      setIsLoading(true);
      
      const response = await fetch('/api/auth/login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(values),
      });
      
      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.message || '登录失败');
      }
      
      // 登录成功后重置查询缓存，刷新权限等信息
      queryClient.invalidateQueries();
      
      toast({
        title: "登录成功",
        description: "欢迎回来！正在跳转...",
      });
      
      // 跳转到首页
      setTimeout(() => {
        navigate('/');
      }, 1000);
      
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "登录失败",
        description: error.message || "请检查用户名和密码",
      });
    } finally {
      setIsLoading(false);
    }
  };

  // 社交媒体登录处理
  const handleSocialLogin = async (provider: 'wechat' | 'whatsapp') => {
    try {
      setIsLoading(true);
      
      const response = await fetch(`/api/auth/${provider}`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      });
      
      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.message || `${provider} 登录失败`);
      }
      
      // 重定向到社交媒体授权页面
      window.location.href = data.authUrl;
      
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: `${provider === 'wechat' ? '微信' : 'WhatsApp'} 登录失败`,
        description: error.message || "请稍后再试",
      });
      setIsLoading(false);
    }
  };

  return (
    <div className="flex items-center justify-center min-h-screen bg-gray-100">
      <Card className="w-full max-w-md">
        <CardHeader className="space-y-1">
          <CardTitle className="text-2xl font-bold text-center">
            {t('login_to_system')}
          </CardTitle>
          <CardDescription className="text-center">
            {t('select_login_method')}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Tabs defaultValue="account" value={activeTab} onValueChange={setActiveTab}>
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="account">{t('account_login')}</TabsTrigger>
              <TabsTrigger value="social">{t('social_login')}</TabsTrigger>
            </TabsList>
            
            <TabsContent value="account">
              <Form {...form}>
                <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                  <FormField
                    control={form.control}
                    name="username"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>{t('username')}</FormLabel>
                        <FormControl>
                          <Input placeholder={t('enter_username')} {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  
                  <FormField
                    control={form.control}
                    name="password"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>{t('password')}</FormLabel>
                        <FormControl>
                          <Input type="password" placeholder={t('enter_password')} {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  
                  <Button type="submit" className="w-full" disabled={isLoading}>
                    {isLoading ? t('logging_in') : t('login')}
                  </Button>
                </form>
              </Form>
            </TabsContent>
            
            <TabsContent value="social" className="space-y-4">
              <div className="space-y-2">
                <SocialLoginButton
                  icon="ri-wechat-fill"
                  title={t('login_with_wechat')}
                  onClick={() => handleSocialLogin('wechat')}
                  provider="wechat"
                />
                
                <SocialLoginButton
                  icon="ri-whatsapp-fill"
                  title={t('login_with_whatsapp')}
                  onClick={() => handleSocialLogin('whatsapp')}
                  provider="whatsapp"
                />
              </div>
            </TabsContent>
          </Tabs>
        </CardContent>
        <CardFooter className="flex flex-col space-y-4">
          <Separator />
          <p className="text-sm text-center text-gray-500">
            {t('login_help_text')}
          </p>
        </CardFooter>
      </Card>
    </div>
  );
}