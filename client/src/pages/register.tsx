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

// 注册表单验证模式
const registerSchema = z.object({
  username: z.string().min(3, "用户名至少3个字符"),
  fullName: z.string().min(2, "姓名至少2个字符"), 
  email: z.string().email("请输入有效的邮箱地址"),
  password: z.string().min(6, "密码至少6个字符"),
  confirmPassword: z.string().min(6, "确认密码至少6个字符"),
}).refine((data) => data.password === data.confirmPassword, {
  message: "两次密码输入不一致",
  path: ["confirmPassword"],
});

export default function RegisterPage() {
  const [isLoading, setIsLoading] = useState(false);
  const [_, navigate] = useLocation();
  const { toast } = useToast();
  const { t } = useTranslation();

  // 注册表单
  const form = useForm<z.infer<typeof registerSchema>>({
    resolver: zodResolver(registerSchema),
    defaultValues: {
      username: "",
      fullName: "",
      email: "",
      password: "",
      confirmPassword: "",
    },
  });

  // 处理表单提交
  const onSubmit = async (values: z.infer<typeof registerSchema>) => {
    try {
      setIsLoading(true);
      
      const { confirmPassword, ...userData } = values;
      
      const response = await fetch('/api/auth/register', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(userData),
      });
      
      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.message || '注册失败');
      }
      
      toast({
        title: "注册成功",
        description: "请等待管理员审核账户",
      });
      
      // 跳转到登录页
      setTimeout(() => {
        navigate('/login');
      }, 2000);
      
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "注册失败",
        description: error.message || "请检查表单信息",
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex items-center justify-center min-h-screen bg-gray-100">
      <Card className="w-full max-w-md">
        <CardHeader className="space-y-1">
          <CardTitle className="text-2xl font-bold text-center">
            {t('register_account')}
          </CardTitle>
          <CardDescription className="text-center">
            {t('enter_details_to_register')}
          </CardDescription>
        </CardHeader>
        <CardContent>
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
                name="fullName"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t('full_name')}</FormLabel>
                    <FormControl>
                      <Input placeholder={t('enter_full_name')} {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <FormField
                control={form.control}
                name="email"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t('email')}</FormLabel>
                    <FormControl>
                      <Input type="email" placeholder={t('enter_email')} {...field} />
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
              
              <FormField
                control={form.control}
                name="confirmPassword"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t('confirm_password')}</FormLabel>
                    <FormControl>
                      <Input type="password" placeholder={t('confirm_your_password')} {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <Button type="submit" className="w-full" disabled={isLoading}>
                {isLoading ? t('registering') : t('register')}
              </Button>
            </form>
          </Form>
        </CardContent>
        <CardFooter className="flex flex-col space-y-4">
          <Separator />
          <div className="text-sm text-center text-gray-500">
            {t('already_have_account')} <Link href="/login" className="text-blue-600 hover:underline">{t('login')}</Link>
          </div>
        </CardFooter>
      </Card>
    </div>
  );
}