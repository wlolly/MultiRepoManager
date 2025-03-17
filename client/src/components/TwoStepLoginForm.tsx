import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { useLocation } from 'wouter';
import { useTranslation } from 'react-i18next';

import { Button } from '@/components/ui/button';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { useToast } from '@/hooks/use-toast';
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';

// 第一阶段登录表单验证模式
const credentialsSchema = z.object({
  username: z.string().min(1, { message: 'auth.username_required' }),
  password: z.string().min(1, { message: 'auth.password_required' }),
});

// 第二阶段验证码表单验证模式
const verificationSchema = z.object({
  code: z.string().length(6, { message: 'auth.verification_code_format' }),
});

type CredentialsFormValues = z.infer<typeof credentialsSchema>;
type VerificationFormValues = z.infer<typeof verificationSchema>;

interface TwoStepLoginFormProps {
  onLoginSuccess?: () => void;
}

export default function TwoStepLoginForm({ onLoginSuccess }: TwoStepLoginFormProps) {
  // 登录流程状态
  const [step, setStep] = useState<'credentials' | 'verification'>('credentials');
  const [isLoading, setIsLoading] = useState(false);
  const [verificationId, setVerificationId] = useState<string>('');
  const [username, setUsername] = useState<string>('');
  
  const [_, navigate] = useLocation();
  const { toast } = useToast();
  const { t } = useTranslation();

  // 第一阶段：用户凭据表单
  const credentialsForm = useForm<CredentialsFormValues>({
    resolver: zodResolver(credentialsSchema),
    defaultValues: {
      username: '',
      password: '',
    },
  });

  // 第二阶段：验证码表单
  const verificationForm = useForm<VerificationFormValues>({
    resolver: zodResolver(verificationSchema),
    defaultValues: {
      code: '',
    },
  });

  // 第一阶段表单提交：验证用户凭据
  const onCredentialsSubmit = async (values: CredentialsFormValues) => {
    setIsLoading(true);
    
    try {
      // 显示处理中提示
      toast({ 
        title: t('auth.verifying_credentials'),
        description: t('auth.please_wait'),
        type: "info"
      });
      
      console.log('提交用户凭据进行第一阶段验证');
      
      // 使用新的API端点进行第一阶段验证
      const response = await fetch('/api/auth/initiate-login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(values),
        credentials: 'include'
      });
      
      const data = await response.json();
      console.log('第一阶段验证响应:', data);
      
      if (data.success && data.verificationId) {
        // 保存验证ID，用于第二阶段验证
        setVerificationId(data.verificationId);
        setUsername(values.username);
        
        // 提示用户输入验证码
        toast({ 
          title: t('auth.verification_code_sent'),
          description: t('auth.please_enter_code'),
          type: "success"
        });
        
        // 进入第二阶段
        setStep('verification');
      } else {
        // 验证失败
        toast({ 
          title: t('auth.verification_failed'),
          description: data.message || t('auth.error_try_again'),
          type: "error"
        });
      }
    } catch (error) {
      console.error('第一阶段验证请求错误:', error);
      toast({
        title: t('auth.verification_failed'),
        description: t('auth.network_error'),
        type: "error"
      });
    } finally {
      setIsLoading(false);
    }
  };

  // 第二阶段表单提交：验证码验证
  const onVerificationSubmit = async (values: VerificationFormValues) => {
    setIsLoading(true);
    
    try {
      // 显示处理中提示
      toast({ 
        title: t('auth.verifying_code'),
        description: t('auth.please_wait'),
        type: "info"
      });
      
      console.log('提交验证码进行第二阶段验证');
      
      // 使用新的API端点进行第二阶段验证
      const response = await fetch('/api/auth/complete-login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          verificationId,
          code: values.code
        }),
        credentials: 'include'
      });
      
      const data = await response.json();
      console.log('第二阶段验证响应:', data);
      
      if (data.success && data.authenticated) {
        // 登录成功
        toast({ 
          title: t('auth.login_success'),
          description: t('auth.welcome_back', { username: data.user?.username || username }),
          type: "success"
        });
        
        // 保存用户数据
        if (data.user) {
          localStorage.setItem('currentUser', JSON.stringify({
            ...data.user,
            authenticated: true,
            realAuthenticated: true
          }));
        }
        
        // 保存会话ID
        if (data.sessionId) {
          localStorage.setItem('sessionId', data.sessionId);
        }
        
        // 调用成功回调或重定向
        if (onLoginSuccess) {
          onLoginSuccess();
        } else {
          // 重定向到首页
          window.location.href = '/';
        }
      } else {
        // 验证失败
        toast({ 
          title: t('auth.verification_failed'),
          description: data.message || t('auth.code_incorrect'),
          type: "error"
        });
      }
    } catch (error) {
      console.error('第二阶段验证请求错误:', error);
      toast({
        title: t('auth.verification_failed'),
        description: t('auth.network_error'),
        type: "error"
      });
    } finally {
      setIsLoading(false);
    }
  };

  // 返回第一阶段
  const handleBackToCredentials = () => {
    setStep('credentials');
    setVerificationId('');
  };

  // 渲染第一阶段：凭据输入表单
  const renderCredentialsForm = () => (
    <Form {...credentialsForm}>
      <form onSubmit={credentialsForm.handleSubmit(onCredentialsSubmit)} className="space-y-3">
        <FormField
          control={credentialsForm.control}
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
          control={credentialsForm.control}
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
            {isLoading ? t('auth.verifying') : t('auth.next')}
          </Button>
        </div>
      </form>
    </Form>
  );

  // 渲染第二阶段：验证码输入表单
  const renderVerificationForm = () => (
    <Form {...verificationForm}>
      <form onSubmit={verificationForm.handleSubmit(onVerificationSubmit)} className="space-y-3">
        <div className="text-center mb-4">
          <p className="text-sm text-gray-600">{t('auth.verification_code_sent_to_account')}</p>
          <p className="text-xs text-gray-500">{t('auth.code_expires_in', {minutes: 15})}</p>
        </div>
        
        <FormField
          control={verificationForm.control}
          name="code"
          render={({ field }) => (
            <FormItem className="space-y-1">
              <FormLabel className="text-xs font-medium">{t('auth.verification_code')}</FormLabel>
              <FormControl>
                <Input 
                  placeholder={t('auth.enter_verification_code')} 
                  {...field} 
                  className="h-9 text-sm text-center tracking-widest font-mono"
                  maxLength={6}
                />
              </FormControl>
              <FormMessage className="text-xs" />
            </FormItem>
          )}
        />
        
        <div className="flex flex-col space-y-2 mt-4">
          <Button type="submit" className="w-full h-9" disabled={isLoading}>
            {isLoading ? t('auth.verifying') : t('auth.login')}
          </Button>
          
          <Button 
            type="button" 
            variant="outline" 
            className="w-full h-9 text-xs" 
            onClick={handleBackToCredentials}
            disabled={isLoading}
          >
            {t('auth.back_to_credentials')}
          </Button>
        </div>
      </form>
    </Form>
  );

  return (
    <Card className="w-[360px] shadow-xl border-0 rounded-xl overflow-hidden bg-white/95 backdrop-blur-sm">
      <CardHeader className="space-y-1 pb-4 pt-6">
        <CardTitle className="text-xl font-bold text-center">
          {step === 'credentials' 
            ? t('auth.login') 
            : t('auth.verification')
          }
        </CardTitle>
        <CardDescription className="text-center text-xs">
          {step === 'credentials'
            ? t('auth.enter_credentials_to_login')
            : t('auth.enter_code_to_verify')
          }
        </CardDescription>
      </CardHeader>
      <CardContent className="px-6 py-2">
        {step === 'credentials'
          ? renderCredentialsForm()
          : renderVerificationForm()
        }
      </CardContent>
      <CardFooter className="px-6 py-4 flex flex-col space-y-4">
        <div className="text-xs text-center text-gray-500">
          {t('auth.secure_login_message')}
        </div>
      </CardFooter>
    </Card>
  );
}