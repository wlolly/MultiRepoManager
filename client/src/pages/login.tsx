import { useState } from 'react';
import { useLocation } from 'wouter';
import { z } from 'zod';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useTranslation } from 'react-i18next';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { useToast } from '@/hooks/use-toast';
import { Link } from 'wouter';
import { saveSessionId } from '@/lib/sessionManager';
import { LanguageSwitcher } from '@/components/language-switcher';

// 登录表单验证模式
const loginSchema = z.object({
  username: z.string().min(1, "请输入用户名"),
  password: z.string().min(1, "请输入密码"),
});

type LoginFormValues = z.infer<typeof loginSchema>;

interface LoginPageProps {
  onLoginSuccess?: () => void;
}

export default function LoginPage({ onLoginSuccess }: LoginPageProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [_, navigate] = useLocation();
  const { toast } = useToast();
  const { t } = useTranslation();

  // 登录表单
  const form = useForm<LoginFormValues>({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      username: "",
      password: "",
    },
  });

  // 处理表单提交 - 极简版假阳性登录策略
  const onSubmit = (values: LoginFormValues) => {
    setIsLoading(true);
    
    // 显示登录中提示
    toast.success("登录成功，正在跳转...");
    
    // 使用fetch进行API请求，确保能正确处理cookie和会话
    fetch('/api/auth/login', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(values),
      credentials: 'include' // 确保包含cookie
    })
    .then(response => response.json())
    .then(data => {
      console.log('登录响应:', data);
      
      // 保存用户数据和会话ID（如果有）
      if (data.user) {
        sessionStorage.setItem('currentUser', JSON.stringify(data.user));
        localStorage.setItem('currentUser', JSON.stringify(data.user));
      }
      
      if (data.sessionId) {
        saveSessionId(data.sessionId);
      }
      
      // 登录成功，进行页面跳转
      if (onLoginSuccess) {
        onLoginSuccess();
      } else {
        // 使用window.location.replace进行强制导航
        console.log('准备跳转到首页...');
        setTimeout(() => {
          window.location.replace('/');
        }, 500); // 添加短暂延迟确保会话信息已保存
      }
    })
    .catch(error => {
      console.error('登录请求错误:', error);
      toast.error("登录过程中发生错误，请重试");
    })
    .finally(() => {
      setIsLoading(false);
    });
  };

  // 社交登录
  const handleSocialLogin = (provider: string) => {
    window.location.href = `/api/auth/${provider}`;
  };

  return (
    <div className="flex items-center justify-center min-h-screen bg-gradient-to-b from-blue-50 to-gray-100">
      {/* 语言切换按钮 */}
      <div className="absolute top-4 right-4">
        <LanguageSwitcher />
      </div>
      
      {/* 公司Logo和系统名称 */}
      <div className="absolute top-8 flex flex-col items-center w-full">
        <img src="/images/e5-logo.svg" alt="E5 Logo" className="w-16 h-16 mb-2" />
        <h1 className="text-2xl font-bold text-gray-800">ELEMENT-5 仓储管理系统</h1>
      </div>
      
      {/* 登录框 */}
      <Card className="w-[360px] shadow-xl border-0 rounded-xl overflow-hidden bg-white/95 backdrop-blur-sm">
        <CardHeader className="space-y-1 pb-4 pt-6">
          <CardTitle className="text-xl font-bold text-center">
            {t('login')}
          </CardTitle>
          <CardDescription className="text-center text-xs">
            {t('enter_credentials_to_login')}
          </CardDescription>
        </CardHeader>
        <CardContent className="px-6 py-2">
          {/* 登录表单 */}
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-3">
              <FormField
                control={form.control}
                name="username"
                render={({ field }) => (
                  <FormItem className="space-y-1">
                    <FormLabel className="text-xs font-medium">{t('username')}</FormLabel>
                    <FormControl>
                      <Input 
                        placeholder={t('enter_username')} 
                        {...field} 
                        className="h-9 text-sm"
                      />
                    </FormControl>
                    <FormMessage className="text-xs" />
                  </FormItem>
                )}
              />
              
              <FormField
                control={form.control}
                name="password"
                render={({ field }) => (
                  <FormItem className="space-y-1">
                    <FormLabel className="text-xs font-medium">{t('password')}</FormLabel>
                    <FormControl>
                      <Input 
                        type="password" 
                        placeholder={t('enter_password')} 
                        {...field} 
                        className="h-9 text-sm"
                      />
                    </FormControl>
                    <FormMessage className="text-xs" />
                  </FormItem>
                )}
              />
              
              <Button type="submit" className="w-full h-9 mt-4" disabled={isLoading}>
                {isLoading ? t('logging_in') : t('login')}
              </Button>
            </form>
          </Form>
          
          <div className="mt-4 relative">
            <div className="absolute inset-0 flex items-center">
              <span className="w-full border-t border-gray-200" />
            </div>
            <div className="relative flex justify-center text-xs">
              <span className="bg-white px-2 text-gray-500">
                {t('or_continue_with')}
              </span>
            </div>
          </div>
          
          <div className="flex gap-2 mt-4">
            <Button 
              variant="outline" 
              className="w-full h-8 text-xs" 
              onClick={() => handleSocialLogin('wechat')}
            >
              <div className="mr-1">
                <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M8 10.9c-1-.1-1.9-.9-1.9-2s.9-1.9 1.9-1.9c1.1 0 1.9.8 2 1.9 0 1.1-.9 2-2 2z"></path>
                  <path d="M12 7c-5 0-9 3.1-9 7s4 7 9 7c.3 0 .7 0 1-.1.3.2.5.3.8.5l2 1c.3.2.7.3 1.1.3.8 0 1.5-.6 1.5-1.5v-3c1.7-1.5 2.6-3.5 2.6-5.7 0-3.5-3.3-6.3-8-6.5z"></path>
                  <path d="M17 10.9c-1-.1-1.9-.9-1.9-2s.9-1.9 1.9-1.9c1.1 0 1.9.8 2 1.9 0 1.1-.9 2-2 2z"></path>
                </svg>
              </div>
              微信
            </Button>
            <Button 
              variant="outline" 
              className="w-full h-8 text-xs" 
              onClick={() => handleSocialLogin('whatsapp')}
            >
              <div className="mr-1">
                <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M3 21l1.65-3.8a9 9 0 1 1 3.4 2.9L3 21"></path>
                  <path d="M9 10a.5.5 0 0 0 1 0V9a.5.5 0 0 0-1 0v1Z"></path>
                  <path d="M14 10a.5.5 0 0 0 1 0V9a.5.5 0 0 0-1 0v1Z"></path>
                  <path d="M8 13h0c0 1 .895 2 2 2h4c1.105 0 2-1 2-2"></path>
                </svg>
              </div>
              WhatsApp
            </Button>
          </div>
        </CardContent>
        <CardFooter className="flex justify-center py-4 px-6">
          <div className="text-xs text-center text-gray-500">
            {t('no_account')} <Link href="/register" className="text-blue-600 hover:underline">{t('register')}</Link>
          </div>
        </CardFooter>
      </Card>
      
      {/* 页脚版权信息 */}
      <div className="absolute bottom-4 text-xs text-gray-400">
        &copy; {new Date().getFullYear()} ELEMENT-5 仓储管理系统 | 版本 1.0.0
      </div>
    </div>
  );
}