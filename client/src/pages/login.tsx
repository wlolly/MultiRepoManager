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

  // 处理表单提交 - 标准登录策略
  const onSubmit = (values: LoginFormValues) => {
    setIsLoading(true);
    
    // 显示登录中提示
    toast({ 
      title: t('auth.logging_in'),
      description: t('auth.please_wait'),
      type: "success"
    });
    
    // 使用fetch进行API请求，确保能正确处理cookie和会话
    fetch('/api/auth/login', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(values),
      credentials: 'include' // 确保包含cookie
    })
    .then(response => {
      // 检查响应状态和头信息，帮助调试
      console.log(`登录响应状态: ${response.status} ${response.statusText}`);
      console.log('响应头:', {
        'x-session-authenticated': response.headers.get('x-session-authenticated'),
        'x-original-session-id': response.headers.get('x-original-session-id'),
      });
      return response.json();
    })
    .then(data => {
      console.log('登录响应数据:', data);
      
      // 记录登录结果，无需为特定用户做特殊处理
      console.log('用户登录结果：', {
        success: data.success,
        realAuthenticated: data.realAuthenticated,
        userInfo: data.user
      });
      
      // 保存用户数据和会话ID（如果有）
      if (data.user) {
        // 检查是否是真实认证用户或假阳性登录用户
        if (data.realAuthenticated === true) {
          console.log('用户真实认证成功:', data.user);
          // 真实认证用户，确保添加realAuthenticated标记
          const authUser = {
            ...data.user,
            realAuthenticated: true,
            fakePositive: false
          };
          sessionStorage.setItem('currentUser', JSON.stringify(authUser));
          localStorage.setItem('currentUser', JSON.stringify(authUser));
          toast({
            title: t('auth.login_success'),
            description: t('auth.redirecting'),
            type: "success"
          });
        } else if (data.fallbackMode || data.authenticated === false) {
          // 假阳性登录或访客用户
          const guestUser = {
            id: data.user?.id || -1,
            username: data.user?.username || values.username || t('auth.guest_user'),
            fullName: data.user?.fullName || values.username || t('auth.guest_user'),
            role: 'anonymous',
            userSource: 'local',
            fakePositive: true,
            realAuthenticated: false,
            accessLevel: 'limited'
          };
          console.log('创建假阳性登录用户:', guestUser);
          sessionStorage.setItem('currentUser', JSON.stringify(guestUser));
          localStorage.setItem('currentUser', JSON.stringify(guestUser));
          toast({
            title: t('auth.limited_mode_login'),
            description: t('auth.some_features_unavailable'),
            type: "warning"
          });
        } else {
          // 常规用户（确保包含realAuthenticated标志）
          const normalUser = {
            ...data.user,
            realAuthenticated: data.realAuthenticated || false
          };
          sessionStorage.setItem('currentUser', JSON.stringify(normalUser));
          localStorage.setItem('currentUser', JSON.stringify(normalUser));
          toast({
            title: t('auth.login_success'),
            description: t('auth.redirecting'),
            type: "success"
          });
        }
      }
      
      if (data.sessionId) {
        saveSessionId(data.sessionId);
      }
      
      // 登录成功，转到登录重定向页面
      if (onLoginSuccess) {
        onLoginSuccess();
      }
      
      // 使用重定向页面处理会话，而不是直接跳转到首页
      console.log('登录成功，重定向到登录重定向页面');
      window.location.href = '/login-redirect';
    })
    .catch(error => {
      console.error('登录请求错误:', error);
      toast({
        title: t('auth.login_failed'),
        description: t('auth.error_try_again'),
        type: "error"
      });
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
        <h1 className="text-2xl font-bold text-gray-800">{t('system_name')}</h1>
      </div>
      
      {/* 已经不需要手动跳转按钮 */}
      
      {/* 登录框 */}
      <Card className="w-[360px] shadow-xl border-0 rounded-xl overflow-hidden bg-white/95 backdrop-blur-sm">
        <CardHeader className="space-y-1 pb-4 pt-6">
          <CardTitle className="text-xl font-bold text-center">
            {t('auth.login')}
          </CardTitle>
          <CardDescription className="text-center text-xs">
            {t('auth.enter_credentials_to_login')}
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
                    <FormLabel className="text-xs font-medium">{t('auth.username')}</FormLabel>
                    <FormControl>
                      <Input 
                        placeholder={t('auth.enter_username')} 
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
                    <FormLabel className="text-xs font-medium">{t('auth.password')}</FormLabel>
                    <FormControl>
                      <Input 
                        type="password" 
                        placeholder={t('auth.enter_password')} 
                        {...field} 
                        className="h-9 text-sm"
                      />
                    </FormControl>
                    <FormMessage className="text-xs" />
                  </FormItem>
                )}
              />
              
              <div className="flex flex-col space-y-2 mt-4">
                <Button type="submit" className="w-full h-9" disabled={isLoading}>
                  {isLoading ? t('auth.logging_in') : t('auth.login')}
                </Button>
                
                {/* 访客登录按钮 */}
                <Button 
                  type="button" 
                  variant="outline" 
                  className="w-full h-9 text-sm" 
                  onClick={() => {
                    // 创建访客用户
                    const guestUser = {
                      id: -1,
                      username: t('auth.guest_user'),
                      fullName: t('auth.guest_user'),
                      role: 'anonymous',
                      userSource: 'local',
                      fakePositive: true,
                      realAuthenticated: false,
                      accessLevel: 'limited'
                    };
                    
                    // 保存访客用户信息
                    sessionStorage.setItem('currentUser', JSON.stringify(guestUser));
                    localStorage.setItem('currentUser', JSON.stringify(guestUser));
                    
                    // 显示提示
                    toast({
                      title: t('auth.guest_login_success'),
                      description: t('auth.some_features_unavailable'),
                      type: "success"
                    });
                    
                    // 重定向到首页
                    setTimeout(() => {
                      window.location.href = '/';
                    }, 500);
                  }}
                >
                  {t('auth.guest_login')}
                </Button>
                
                {/* 测试账号一键登录 - 临时开发用，可以在生产中删除 */}
                <Button 
                  type="button" 
                  variant="secondary" 
                  className="w-full h-9 text-sm mt-2 bg-amber-100 hover:bg-amber-200 text-amber-800" 
                  onClick={() => {
                    // 自动填充登录表单
                    form.setValue("username", "222");
                    form.setValue("password", "222");
                    
                    // 手动提交表单
                    form.handleSubmit(onSubmit)();
                  }}
                >
                  {t('auth.test_account_login')}
                </Button>
              </div>
            </form>
          </Form>
          
          <div className="mt-4 relative">
            <div className="absolute inset-0 flex items-center">
              <span className="w-full border-t border-gray-200" />
            </div>
            <div className="relative flex justify-center text-xs">
              <span className="bg-white px-2 text-gray-500">
                {t('auth.or_continue_with')}
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
              {t('auth.wechat')}
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
              {t('auth.whatsapp')}
            </Button>
          </div>
        </CardContent>
        <CardFooter className="flex justify-center py-4 px-6">
          <div className="text-xs text-center text-gray-500">
            {t('auth.no_account')} <Link href="/register" className="text-blue-600 hover:underline">{t('auth.register')}</Link>
          </div>
        </CardFooter>
      </Card>
      
      {/* 页脚版权信息 */}
      <div className="absolute bottom-4 text-xs text-gray-400">
        &copy; {new Date().getFullYear()} {t('auth.copyright_text')} | {t('auth.version')} 1.0.0
      </div>
    </div>
  );
}