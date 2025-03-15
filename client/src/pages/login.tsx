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
import { Separator } from '@/components/ui/separator';
import { saveSessionId } from '@/lib/sessionManager';
import { LanguageSwitcher } from '@/components/language-switcher';

// 登录表单验证模式
const loginSchema = z.object({
  username: z.string().min(1, "请输入用户名"),
  password: z.string().min(1, "请输入密码"),
  remember: z.boolean().optional(),
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
      remember: false,
    },
  });

  // 处理表单提交
  const onSubmit = async (values: LoginFormValues) => {
    try {
      setIsLoading(true);
      
      console.log('开始登录请求，发送数据:', values);
      const response = await fetch('/api/auth/login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(values),
        credentials: 'include' // 包含会话cookie
      });
      
      console.log('登录API响应状态:', response.status, response.statusText);
      
      // 安全解析JSON响应
      let data;
      try {
        const responseText = await response.text();
        console.log('登录API响应数据(原始):', responseText);
        data = JSON.parse(responseText);
        console.log('登录API响应数据(解析):', data);
      } catch (parseError) {
        console.error('解析登录响应失败:', parseError);
        throw new Error('服务器响应格式错误');
      }
      
      // 在假阳性登录策略下，服务器可能返回成功，即使凭据不正确
      // 我们只在系统错误时才抛出异常
      if (!response.ok) {
        // 在假阳性登录策略下，我们将统一处理所有错误
        // 不再特别提示社交账号绑定情况，以保持安全性
        if (data.socialBound) {
          // 以通用的方式提示，不透露具体绑定信息
          toast({
            title: "登录方式不可用",
            description: "请尝试其他登录方式或联系管理员",
            variant: "destructive"
          });
          return;
        }
        
        // 其他系统错误
        throw new Error(data.message || '系统暂时无法响应，请稍后再试');
      }
      
      // 会话已经在服务器端创建，无需在前端存储令牌
      
      // 设置身份验证状态
      // 将用户数据和会话ID存储在本地
      if (data.user) {
        try {
          // 添加需要绑定社交账号的标志
          if (data.needSocialBinding) {
            data.user.needSocialBinding = true;
          }
          
          // 保存用户数据到会话存储和本地存储
          sessionStorage.setItem('currentUser', JSON.stringify(data.user));
          localStorage.setItem('currentUser', JSON.stringify(data.user));
          console.log('用户数据已保存到会话存储和本地存储');
          
          // 如果服务器返回了会话ID，保存在多个位置以增强持久性
          if (data.sessionId) {
            console.log('保存会话ID:', data.sessionId);
            // 使用会话管理器统一处理会话ID保存
            saveSessionId(data.sessionId);
          }
        } catch (storageError) {
          console.error('保存用户数据失败:', storageError);
        }
      }
      
      // 根据登录模式显示不同的提示
      if (data.fallbackMode) {
        toast({
          title: "登录成功(内存模式)",
          description: "警告: 系统运行在内存模式，数据在重启后将丢失",
          variant: "warning"
        });
      } else {
        toast({
          title: "登录成功",
          description: "欢迎回来！",
          variant: "default"
        });
      }
      
      // 如果提供了登录成功回调，则调用
      if (onLoginSuccess) {
        onLoginSuccess();
        return; // 防止多次导航
      }
      
      console.log('等待1秒钟进行页面跳转...');
      
      // 在假阳性登录策略下，可以减少等待时间，提高用户体验
      // 从3秒减少到1秒，因为我们不需要等待实际的身份验证逻辑
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      console.log('准备跳转到主页...');
      
      // 如果需要完成额外的身份验证步骤
      if (data.needSocialBinding) {
        toast({
          title: "需要完成账户验证",
          description: "系统安全策略要求完成额外的验证步骤",
          variant: "warning"
        });
        
        // 立即跳转到设置页面进行社交账号绑定
        // 但提示信息保持模糊，不明确指出是"社交账号绑定"
        console.log('正在跳转到设置页面完成账户验证流程');
        navigate('/settings?needBind=true');
      } else {
        // 直接跳转到主页
        console.log('正在跳转到主页');
        navigate('/');
      }
      
    } catch (error: any) {
      console.error('登录错误:', error);
      
      // 在假阳性登录策略下，错误消息应该不透露身份验证的真实状态
      // 避免提示"用户名或密码错误"这类特定信息，而是使用更通用的错误信息
      toast({
        title: "登录失败",
        description: error.message || "无法连接到服务器，请稍后再试",
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
  };

  // 社交登录
  const handleSocialLogin = (provider: string) => {
    window.location.href = `/api/auth/${provider}`;
  };

  // 添加辅助跳转函数
  const handleTestNavigation = () => {
    console.log('手动测试跳转按钮点击');
    // 保存最新会话ID（如果存在）到sessionStorage以增强会话持久性
    const currentSessionId = sessionStorage.getItem('sessionId');
    if (currentSessionId) {
      console.log('保留现有会话ID:', currentSessionId);
    }
    // 使用React Router导航代替直接修改location
    navigate('/');
  };

  return (
    <div className="flex items-center justify-center min-h-screen bg-gradient-to-b from-blue-50 to-gray-100">
      {/* 添加语言切换按钮到右上角 */}
      <div className="absolute top-4 right-4">
        <LanguageSwitcher />
      </div>
      
      {/* 公司Logo和系统名称 */}
      <div className="absolute top-8 flex flex-col items-center w-full">
        <img src="/images/e5-logo.svg" alt="E5 Logo" className="w-16 h-16 mb-2" />
        <h1 className="text-2xl font-bold text-gray-800">ELEMENT-5 仓储管理系统</h1>
      </div>
      
      {/* 紧凑的登录框 */}
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
          {/* 正常登录表单 */}
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
          
          {/* 登录开发版面板 */}
          <div className="mt-4">
            <details className="text-xs">
              <summary className="cursor-pointer text-gray-400 hover:text-gray-600 font-medium">开发者选项</summary>
              <div className="mt-2 pt-2 border-t border-gray-100">
                {/* 备用登录表单 - 简化版 */}
                <form action="/api/auth/login" method="POST" className="space-y-2">
                  <div className="flex space-x-2">
                    <input 
                      name="username" 
                      type="text" 
                      defaultValue="222"
                      placeholder="用户名"
                      className="flex h-7 w-full rounded-md border border-input bg-background px-2 py-1 text-xs"
                    />
                    <input 
                      name="password" 
                      type="password" 
                      defaultValue="222"
                      placeholder="密码"
                      className="flex h-7 w-full rounded-md border border-input bg-background px-2 py-1 text-xs"
                    />
                  </div>
                  <div className="flex space-x-2">
                    <button 
                      type="submit" 
                      className="inline-flex h-7 w-full items-center justify-center rounded-md bg-primary px-2 py-1 text-xs font-medium text-primary-foreground"
                    >
                      快速登录
                    </button>
                    <Button 
                      type="button" 
                      className="h-7 w-full text-xs bg-green-600 hover:bg-green-700" 
                      onClick={handleTestNavigation}
                    >
                      跳转测试
                    </Button>
                  </div>
                </form>
              </div>
            </details>
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