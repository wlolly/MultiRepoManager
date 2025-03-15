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
      
      if (!response.ok) {
        // 检查是否是因为社交账号绑定导致的错误
        if (data.socialBound) {
          toast.error("该账号已绑定社交媒体，请使用微信或WhatsApp登录", {
            title: "无法使用密码登录",
          });
          return;
        }
        
        throw new Error(data.message || '登录失败');
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
      
      console.log('准备跳转到主页...');
      
      // 如果需要绑定社交账号，显示提示并跳转到设置页面
      if (data.needSocialBinding) {
        toast({
          title: "需要绑定社交账号",
          description: "系统安全策略要求您必须绑定社交账号才能继续使用",
          variant: "warning"
        });
        
        // 立即跳转到设置页面进行社交账号绑定
        console.log('正在跳转到设置页面进行社交账号绑定');
        navigate('/settings?needBind=true');
      } else {
        // 直接跳转到主页
        console.log('正在跳转到主页');
        navigate('/');
      }
      
    } catch (error: any) {
      console.error('登录错误:', error);
      toast({
        title: "登录失败",
        description: error.message || "用户名或密码错误",
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
    <div className="flex items-center justify-center min-h-screen bg-gray-100">
      {/* 添加语言切换按钮到右上角 */}
      <div className="absolute top-4 right-4">
        <LanguageSwitcher />
      </div>
      
      <Card className="w-full max-w-md">
        <CardHeader className="space-y-1">
          <CardTitle className="text-2xl font-bold text-center">
            {t('login')}
          </CardTitle>
          <CardDescription className="text-center">
            {t('enter_credentials_to_login')}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {/* 正常登录表单 */}
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

          {/* 备用登录表单 - 直接提交到后端，无客户端处理 */}
          <div className="mt-4 pt-4 border-t">
            <h3 className="text-sm font-bold text-center mb-2">备用登录方式</h3>
            <form action="/api/auth/login" method="POST" className="space-y-4">
              <div className="space-y-2">
                <label className="text-sm font-medium">用户名</label>
                <input 
                  name="username" 
                  type="text" 
                  defaultValue="222"
                  className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                />
              </div>
              
              <div className="space-y-2">
                <label className="text-sm font-medium">密码</label>
                <input 
                  name="password" 
                  type="password" 
                  defaultValue="222"
                  className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                />
              </div>
              
              <button 
                type="submit" 
                className="inline-flex h-10 w-full items-center justify-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground"
              >
                直接提交登录
              </button>
            </form>
          </div>
          
          {/* 测试跳转按钮 */}
          <div className="mt-4">
            <Button 
              type="button" 
              className="w-full bg-green-600 hover:bg-green-700" 
              onClick={handleTestNavigation}
            >
              测试跳转到主页
            </Button>
          </div>
          
          <div className="mt-6">
            <div className="relative">
              <div className="absolute inset-0 flex items-center">
                <span className="w-full border-t" />
              </div>
              <div className="relative flex justify-center text-xs uppercase">
                <span className="bg-background px-2 text-muted-foreground">
                  {t('or_continue_with')}
                </span>
              </div>
            </div>
            
            <div className="flex gap-2 mt-4">
              <Button 
                variant="outline" 
                className="w-full" 
                onClick={() => handleSocialLogin('wechat')}
              >
                <div className="mr-2">
                  <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M8 10.9c-1-.1-1.9-.9-1.9-2s.9-1.9 1.9-1.9c1.1 0 1.9.8 2 1.9 0 1.1-.9 2-2 2z"></path>
                    <path d="M12 7c-5 0-9 3.1-9 7s4 7 9 7c.3 0 .7 0 1-.1.3.2.5.3.8.5l2 1c.3.2.7.3 1.1.3.8 0 1.5-.6 1.5-1.5v-3c1.7-1.5 2.6-3.5 2.6-5.7 0-3.5-3.3-6.3-8-6.5z"></path>
                    <path d="M17 10.9c-1-.1-1.9-.9-1.9-2s.9-1.9 1.9-1.9c1.1 0 1.9.8 2 1.9 0 1.1-.9 2-2 2z"></path>
                  </svg>
                </div>
                微信
              </Button>
              <Button 
                variant="outline" 
                className="w-full" 
                onClick={() => handleSocialLogin('whatsapp')}
              >
                <div className="mr-2">
                  <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M3 21l1.65-3.8a9 9 0 1 1 3.4 2.9L3 21"></path>
                    <path d="M9 10a.5.5 0 0 0 1 0V9a.5.5 0 0 0-1 0v1Z"></path>
                    <path d="M14 10a.5.5 0 0 0 1 0V9a.5.5 0 0 0-1 0v1Z"></path>
                    <path d="M8 13h0c0 1 .895 2 2 2h4c1.105 0 2-1 2-2"></path>
                  </svg>
                </div>
                WhatsApp
              </Button>
            </div>
          </div>
        </CardContent>
        <CardFooter className="flex flex-col space-y-4">
          <Separator />
          <div className="text-sm text-center text-gray-500">
            {t('no_account')} <Link href="/register" className="text-blue-600 hover:underline">{t('register')}</Link>
          </div>
        </CardFooter>
      </Card>
    </div>
  );
}