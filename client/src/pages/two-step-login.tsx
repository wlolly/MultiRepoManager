/**
 * 双重验证登录页面
 * 作为登录流程的第二阶段，用于验证码验证
 */
import React, { useState, useEffect } from 'react';
import { useLocation, useRouter } from 'wouter';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { useToast } from '@/hooks/use-toast';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { useTranslation } from 'react-i18next';
import { useAuth } from '@/contexts/AuthContext';
import { useQuery } from '@tanstack/react-query';

// 验证码表单模型
const verificationFormSchema = z.object({
  verificationCode: z.string()
    .min(6, { message: "验证码长度至少6位" })
    .max(6, { message: "验证码长度最多6位" })
});

type VerificationFormValues = z.infer<typeof verificationFormSchema>;

export default function TwoStepLoginPage() {
  const { t } = useTranslation();
  const { toast } = useToast();
  const [, navigate] = useLocation();
  const [location] = useLocation();
  const { handleLoginComplete } = useAuth();
  const [loading, setLoading] = useState(false);
  const [verificationId, setVerificationId] = useState<string | null>(null);
  const [countdown, setCountdown] = useState(120); // 验证码有效期倒计时
  const [countdownActive, setCountdownActive] = useState(true);

  // 验证表单
  const form = useForm<VerificationFormValues>({
    resolver: zodResolver(verificationFormSchema),
    defaultValues: {
      verificationCode: '',
    }
  });

  // 从URL获取验证ID
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const vid = params.get('verificationId');
    if (vid) {
      setVerificationId(vid);
    } else {
      // 如果没有验证ID，返回登录页
      navigate('/login');
      toast({
        title: t('error'),
        description: t('invalid_verification_session'),
        variant: "destructive",
      });
    }
  }, [location, navigate, toast, t]);

  // 验证码倒计时
  useEffect(() => {
    let timer: NodeJS.Timeout;
    if (countdownActive && countdown > 0) {
      timer = setTimeout(() => {
        setCountdown(countdown - 1);
      }, 1000);
    } else if (countdown === 0) {
      setCountdownActive(false);
    }
    return () => {
      if (timer) clearTimeout(timer);
    };
  }, [countdown, countdownActive]);

  // 提交验证码
  const onSubmit = async (data: VerificationFormValues) => {
    if (!verificationId) {
      toast({
        title: t('error'),
        description: t('verification_id_missing'),
        variant: "destructive",
      });
      return;
    }

    setLoading(true);
    try {
      const response = await fetch('/api/auth/complete-login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        credentials: 'include',
        body: JSON.stringify({
          verificationId,
          verificationCode: data.verificationCode
        })
      });

      if (response.ok) {
        // 验证成功，处理登录状态并导航
        const result = await response.json();
        handleLoginComplete(result.user);
        toast({
          title: t('success'),
          description: t('login_successful'),
          variant: "default",
        });
        navigate('/');
      } else {
        // 处理验证错误
        const errorData = await response.json();
        toast({
          title: t('error'),
          description: errorData.message || t('verification_failed'),
          variant: "destructive",
        });
      }
    } catch (error) {
      console.error("验证过程中发生错误:", error);
      toast({
        title: t('error'),
        description: t('verification_system_error'),
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  // 重新发送验证码
  const resendVerificationCode = async () => {
    if (!verificationId) return;

    setLoading(true);
    try {
      const response = await fetch('/api/auth/resend-code', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        credentials: 'include',
        body: JSON.stringify({ verificationId })
      });

      if (response.ok) {
        // 重置倒计时
        setCountdown(120);
        setCountdownActive(true);
        toast({
          title: t('success'),
          description: t('verification_code_resent'),
          variant: "default",
        });
      } else {
        const errorData = await response.json();
        toast({
          title: t('error'),
          description: errorData.message || t('verification_resend_failed'),
          variant: "destructive",
        });
      }
    } catch (error) {
      console.error("重新发送验证码时发生错误:", error);
      toast({
        title: t('error'),
        description: t('verification_system_error'),
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  // 取消验证，返回登录页
  const cancelVerification = () => {
    navigate('/login');
  };

  return (
    <div className="flex items-center justify-center min-h-screen bg-gray-100 p-4">
      <Card className="w-full max-w-md shadow-lg">
        <CardHeader>
          <CardTitle className="text-2xl font-bold text-center">{t('verification_required')}</CardTitle>
          <CardDescription className="text-center">
            {t('verification_code_sent')}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
              <FormField
                control={form.control}
                name="verificationCode"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t('verification_code')}</FormLabel>
                    <FormControl>
                      <Input
                        {...field}
                        placeholder={t('enter_verification_code')}
                        type="text"
                        maxLength={6}
                        autoFocus
                        className="text-center text-lg tracking-widest"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <div className="text-sm text-center text-gray-500">
                {countdownActive ? (
                  <p>{t('verification_code_expires_in')}: {Math.floor(countdown / 60)}:{(countdown % 60).toString().padStart(2, '0')}</p>
                ) : (
                  <p>{t('verification_code_expired')}</p>
                )}
              </div>

              <div className="pt-2">
                <Button 
                  type="submit" 
                  className="w-full" 
                  disabled={loading}
                >
                  {loading ? t('verifying') : t('verify')}
                </Button>
              </div>
            </form>
          </Form>
        </CardContent>
        <CardFooter className="flex flex-col space-y-2">
          <div className="flex justify-between w-full">
            <Button
              variant="ghost"
              onClick={cancelVerification}
              disabled={loading}
              type="button"
            >
              {t('back_to_login')}
            </Button>
            <Button
              variant="outline"
              onClick={resendVerificationCode}
              disabled={loading || countdownActive}
              type="button"
            >
              {t('resend_code')}
            </Button>
          </div>
        </CardFooter>
      </Card>
    </div>
  );
};