import React, { useState, useEffect } from "react";
import { useTranslation } from "react-i18next";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { useToast } from "@/hooks/use-toast";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { AlertCircle, Database, RefreshCw, Check, X } from "lucide-react";
import { 
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Badge } from "@/components/ui/badge";

// 社交账号绑定组件
function SocialBindingSection() {
  const { t } = useTranslation();
  const { toast } = useToast();
  const [bindStatus, setBindStatus] = useState<{ bound: boolean, provider: string | null }>({ bound: false, provider: null });
  const [isLoading, setIsLoading] = useState(false);
  
  // 获取绑定状态
  useEffect(() => {
    const fetchBindingStatus = async () => {
      try {
        const response = await fetch('/api/auth/social-binding-status', {
          credentials: 'include'
        });
        
        if (response.ok) {
          const data = await response.json();
          setBindStatus(data);
        }
      } catch (error) {
        console.error('获取社交绑定状态错误:', error);
      }
    };
    
    fetchBindingStatus();
  }, []);
  
  // 模拟绑定社交账号
  const handleBindSocial = async (provider: string) => {
    try {
      setIsLoading(true);
      
      // 实际应用中应跳转到社交登录页面，这里仅为演示
      // window.location.href = `/api/auth/${provider}`;
      
      // 演示：直接调用API以模拟已获取授权码并绑定账号
      const response = await fetch('/api/auth/bind-social', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          provider,
          socialId: 'mock_' + provider + '_' + Date.now(),
          socialData: JSON.stringify({ name: 'Mock User' })
        }),
        credentials: 'include'
      });
      
      const data = await response.json();
      
      if (response.ok) {
        toast.success(t('settings.security.bindSuccessDescription', '您已成功绑定社交账号'), {
          title: t('settings.security.bindSuccess', '绑定成功')
        });
        
        // 更新状态
        setBindStatus({ bound: true, provider });
      } else {
        throw new Error(data.message || '绑定失败');
      }
    } catch (error) {
      console.error('绑定社交账号错误:', error);
      toast.error((error instanceof Error) ? error.message : '请稍后再试', {
        title: t('settings.security.bindFailed', '绑定失败')
      });
    } finally {
      setIsLoading(false);
    }
  };
  
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <p className="font-medium">{t('settings.security.wechatBinding', '微信绑定')}</p>
          <p className="text-sm text-gray-500">{t('settings.security.wechatBindingDescription', '绑定微信账号进行登录')}</p>
        </div>
        <div className="flex items-center">
          {bindStatus.bound && bindStatus.provider === 'wechat' ? (
            <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200 flex items-center">
              <Check className="h-3 w-3 mr-1" />
              {t('settings.security.bound', '已绑定')}
            </Badge>
          ) : (
            <Button 
              variant="outline" 
              size="sm"
              onClick={() => handleBindSocial('wechat')}
              disabled={isLoading || (bindStatus.bound && bindStatus.provider !== 'wechat')}
            >
              {isLoading ? t('settings.security.binding', '绑定中...') : t('settings.security.bind', '立即绑定')}
            </Button>
          )}
        </div>
      </div>
      
      <div className="flex items-center justify-between">
        <div>
          <p className="font-medium">{t('settings.security.whatsappBinding', 'WhatsApp绑定')}</p>
          <p className="text-sm text-gray-500">{t('settings.security.whatsappBindingDescription', '绑定WhatsApp账号进行登录')}</p>
        </div>
        <div className="flex items-center">
          {bindStatus.bound && bindStatus.provider === 'whatsapp' ? (
            <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200 flex items-center">
              <Check className="h-3 w-3 mr-1" />
              {t('settings.security.bound', '已绑定')}
            </Badge>
          ) : (
            <Button 
              variant="outline" 
              size="sm"
              onClick={() => handleBindSocial('whatsapp')}
              disabled={isLoading || (bindStatus.bound && bindStatus.provider !== 'whatsapp')}
            >
              {isLoading ? t('settings.security.binding', '绑定中...') : t('settings.security.bind', '立即绑定')}
            </Button>
          )}
        </div>
      </div>
      
      {bindStatus.bound && (
        <Alert className="mt-4 bg-blue-50 text-blue-700 border-blue-200">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>{t('settings.security.socialBindingNotice', '社交账号已绑定')}</AlertTitle>
          <AlertDescription>
            {t('settings.security.socialBindingNoticeDescription', '您的账号已绑定社交媒体，下次请使用社交媒体直接登录，将无法使用用户名密码登录。')}
          </AlertDescription>
        </Alert>
      )}
    </div>
  );
}

export default function Settings() {
  const { toast } = useToast();
  const [activeTab, setActiveTab] = useState("account");
  
  // Form values
  const [fullName, setFullName] = useState("Liu Yang");
  const [username, setUsername] = useState("liuyang");
  const [email, setEmail] = useState("liuyang@example.com");
  const [avatarUrl, setAvatarUrl] = useState("https://randomuser.me/api/portraits/men/1.jpg");
  
  // Notification settings
  const [emailNotifications, setEmailNotifications] = useState(true);
  const [repositoryActivity, setRepositoryActivity] = useState(true);
  const [teamActivity, setTeamActivity] = useState(true);
  const [securityAlerts, setSecurityAlerts] = useState(true);
  
  // Theme setting
  const [darkMode, setDarkMode] = useState(false);
  
  // Admin settings
  const [isAdmin, setIsAdmin] = useState(true); // 开发阶段默认为管理员
  const [isInitializing, setIsInitializing] = useState(false);
  
  const handleSaveProfile = (e: React.FormEvent) => {
    e.preventDefault();
    toast.success("Your profile information has been saved.", {
      title: "Profile updated"
    });
  };
  
  const handleChangePassword = (e: React.FormEvent) => {
    e.preventDefault();
    toast.success("Your password has been changed successfully.", {
      title: "Password updated"
    });
  };
  
  const handleSaveNotifications = () => {
    toast.success("Your notification preferences have been updated.", {
      title: "Notification settings saved"
    });
  };
  
  const handleSaveAppearance = () => {
    toast.success("Your appearance preferences have been updated.", {
      title: "Appearance settings saved"
    });
  };
  
  // 初始化测试数据
  const handleInitializeData = async () => {
    try {
      setIsInitializing(true);
      
      const response = await fetch('/api/admin/initialize-test-data', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        }
      });
      
      if (!response.ok) {
        throw new Error('初始化数据失败');
      }
      
      const data = await response.json();
      
      toast({
        title: "数据初始化成功",
        description: `已成功创建 ${data.warehouses || 0} 个仓库, ${data.products || 0} 个产品, ${data.inboundOrders || 0} 个入库单和 ${data.outboundOrders || 0} 个出库单`,
      });
    } catch (error) {
      toast({
        title: "初始化失败",
        description: error instanceof Error ? error.message : "未知错误",
        variant: "destructive"
      });
    } finally {
      setIsInitializing(false);
    }
  };

  const { t } = useTranslation();

  return (
    <>
      <div className="pb-5 border-b border-gray-200 mb-6">
        <h1 className="text-2xl font-bold text-gray-900">{t('settings.title', '系统设置')}</h1>
        <p className="mt-1 text-gray-500 text-sm">{t('settings.subtitle', '管理您的账户设置和偏好')}</p>
      </div>
      
      <div className="flex flex-col md:flex-row gap-6">
        <div className="w-full md:w-64 mb-6">
          <Tabs 
            defaultValue="account" 
            value={activeTab} 
            onValueChange={setActiveTab}
            orientation="vertical" 
            className="w-full"
          >
            <TabsList className="flex flex-row md:flex-col h-auto md:h-auto justify-start bg-transparent gap-2 w-full p-0">
              <TabsTrigger 
                value="account" 
                className="w-full justify-start px-3 py-2 data-[state=active]:bg-gray-100 data-[state=active]:shadow-none"
              >
                <i className="ri-user-line mr-2"></i>
                {t('settings.tabs.account', '账户信息')}
              </TabsTrigger>
              <TabsTrigger 
                value="security" 
                className="w-full justify-start px-3 py-2 data-[state=active]:bg-gray-100 data-[state=active]:shadow-none"
              >
                <i className="ri-lock-line mr-2"></i>
                {t('settings.tabs.security', '安全设置')}
              </TabsTrigger>
              <TabsTrigger 
                value="notifications" 
                className="w-full justify-start px-3 py-2 data-[state=active]:bg-gray-100 data-[state=active]:shadow-none"
              >
                <i className="ri-notification-line mr-2"></i>
                {t('settings.tabs.notifications', '通知设置')}
              </TabsTrigger>
              <TabsTrigger 
                value="appearance" 
                className="w-full justify-start px-3 py-2 data-[state=active]:bg-gray-100 data-[state=active]:shadow-none"
              >
                <i className="ri-palette-line mr-2"></i>
                {t('settings.tabs.appearance', '外观设置')}
              </TabsTrigger>
              {isAdmin && (
                <TabsTrigger 
                  value="admin" 
                  className="w-full justify-start px-3 py-2 data-[state=active]:bg-gray-100 data-[state=active]:shadow-none"
                >
                  <Database className="h-4 w-4 mr-2" />
                  {t('settings.tabs.admin', '管理员设置')}
                </TabsTrigger>
              )}
            </TabsList>
          </Tabs>
        </div>
        
        <div className="flex-1">
          {activeTab === "account" && (
            <Card>
              <CardHeader>
                <CardTitle>{t('settings.account.title', '账户信息设置')}</CardTitle>
                <CardDescription>
                  {t('settings.account.description', '更新您的账户信息和个人资料')}
                </CardDescription>
              </CardHeader>
              <CardContent>
                <form onSubmit={handleSaveProfile}>
                  <div className="space-y-6">
                    <div className="flex flex-col md:flex-row gap-4 items-start md:items-center">
                      <Avatar className="h-16 w-16">
                        <AvatarImage src={avatarUrl} alt={fullName} />
                        <AvatarFallback>{fullName.split(' ').map(n => n[0]).join('')}</AvatarFallback>
                      </Avatar>
                      <div>
                        <Label htmlFor="avatar" className="block mb-2">{t('settings.account.avatar', '头像')}</Label>
                        <Input 
                          id="avatar" 
                          type="url"
                          placeholder={t('settings.account.avatarUrl', '头像图片URL')}
                          value={avatarUrl}
                          onChange={e => setAvatarUrl(e.target.value)}
                          className="w-full md:w-96"
                        />
                      </div>
                    </div>
                    
                    <div className="grid gap-4 md:grid-cols-2">
                      <div className="space-y-2">
                        <Label htmlFor="fullName">{t('settings.account.fullName', '姓名')}</Label>
                        <Input 
                          id="fullName" 
                          value={fullName}
                          onChange={e => setFullName(e.target.value)}
                        />
                      </div>
                      
                      <div className="space-y-2">
                        <Label htmlFor="username">{t('settings.account.username', '用户名')}</Label>
                        <Input 
                          id="username" 
                          value={username}
                          onChange={e => setUsername(e.target.value)}
                        />
                      </div>
                    </div>
                    
                    <div className="space-y-2">
                      <Label htmlFor="email">{t('settings.account.email', '电子邮箱')}</Label>
                      <Input 
                        id="email" 
                        type="email"
                        value={email}
                        onChange={e => setEmail(e.target.value)}
                      />
                    </div>
                  </div>
                  
                  <div className="mt-6">
                    <Button type="submit">{t('settings.account.saveButton', '保存更改')}</Button>
                  </div>
                </form>
              </CardContent>
            </Card>
          )}
          
          {activeTab === "security" && (
            <Card>
              <CardHeader>
                <CardTitle>{t('settings.security.title', '安全设置')}</CardTitle>
                <CardDescription>
                  {t('settings.security.description', '管理您的密码和安全偏好')}
                </CardDescription>
              </CardHeader>
              <CardContent>
                <form onSubmit={handleChangePassword}>
                  <div className="space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="currentPassword">{t('settings.security.currentPassword', '当前密码')}</Label>
                      <Input id="currentPassword" type="password" />
                    </div>
                    
                    <div className="space-y-2">
                      <Label htmlFor="newPassword">{t('settings.security.newPassword', '新密码')}</Label>
                      <Input id="newPassword" type="password" />
                    </div>
                    
                    <div className="space-y-2">
                      <Label htmlFor="confirmPassword">{t('settings.security.confirmPassword', '确认新密码')}</Label>
                      <Input id="confirmPassword" type="password" />
                    </div>
                  </div>
                  
                  <div className="mt-6">
                    <Button type="submit">{t('settings.security.changePasswordButton', '修改密码')}</Button>
                  </div>
                </form>
                
                <div className="mt-8 pt-6 border-t border-gray-200">
                  <h3 className="text-lg font-medium mb-4">{t('settings.security.socialBinding', '社交账号绑定')}</h3>
                  <p className="text-gray-500 mb-4">
                    {t('settings.security.socialBindingDescription', '绑定社交账号以便更安全地登录系统')}
                  </p>
                  <SocialBindingSection />
                </div>
                
                <div className="mt-8 pt-6 border-t border-gray-200">
                  <h3 className="text-lg font-medium mb-4">{t('settings.security.twoFactorAuth', '双因素认证')}</h3>
                  <p className="text-gray-500 mb-4">
                    {t('settings.security.twoFactorDescription', '启用双因素认证为您的账户添加额外的安全层级')}
                  </p>
                  <Button variant="outline">{t('settings.security.enableTwoFactorButton', '启用双因素认证')}</Button>
                </div>
              </CardContent>
            </Card>
          )}
          
          {activeTab === "notifications" && (
            <Card>
              <CardHeader>
                <CardTitle>{t('settings.notifications.title', '通知偏好设置')}</CardTitle>
                <CardDescription>
                  {t('settings.notifications.description', '管理如何接收通知和提醒')}
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <h4 className="font-medium">{t('settings.notifications.emailNotifications', '电子邮件通知')}</h4>
                      <p className="text-gray-500 text-sm">{t('settings.notifications.emailNotificationsDescription', '接收重要更新的电子邮件通知')}</p>
                    </div>
                    <Switch 
                      checked={emailNotifications} 
                      onCheckedChange={setEmailNotifications} 
                    />
                  </div>
                  
                  <div className="flex items-center justify-between">
                    <div>
                      <h4 className="font-medium">{t('settings.notifications.repositoryActivity', '仓库活动')}</h4>
                      <p className="text-gray-500 text-sm">{t('settings.notifications.repositoryActivityDescription', '接收关于提交、分支和合并请求的通知')}</p>
                    </div>
                    <Switch 
                      checked={repositoryActivity} 
                      onCheckedChange={setRepositoryActivity} 
                    />
                  </div>
                  
                  <div className="flex items-center justify-between">
                    <div>
                      <h4 className="font-medium">{t('settings.notifications.teamActivity', '团队活动')}</h4>
                      <p className="text-gray-500 text-sm">{t('settings.notifications.teamActivityDescription', '关于团队成员变更的通知')}</p>
                    </div>
                    <Switch 
                      checked={teamActivity} 
                      onCheckedChange={setTeamActivity} 
                    />
                  </div>
                  
                  <div className="flex items-center justify-between">
                    <div>
                      <h4 className="font-medium">{t('settings.notifications.securityAlerts', '安全提醒')}</h4>
                      <p className="text-gray-500 text-sm">{t('settings.notifications.securityAlertsDescription', '重要安全更新和漏洞提醒')}</p>
                    </div>
                    <Switch 
                      checked={securityAlerts} 
                      onCheckedChange={setSecurityAlerts} 
                    />
                  </div>
                </div>
                
                <div className="mt-6">
                  <Button onClick={handleSaveNotifications}>{t('settings.notifications.saveButton', '保存偏好')}</Button>
                </div>
              </CardContent>
            </Card>
          )}
          
          {activeTab === "appearance" && (
            <Card>
              <CardHeader>
                <CardTitle>{t('settings.appearance.title', '外观设置')}</CardTitle>
                <CardDescription>
                  {t('settings.appearance.description', '自定义ELEMENT-5系统的外观')}
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <h4 className="font-medium">{t('settings.appearance.darkMode', '深色模式')}</h4>
                      <p className="text-gray-500 text-sm">{t('settings.appearance.darkModeDescription', '使用深色主题')}</p>
                    </div>
                    <Switch 
                      checked={darkMode} 
                      onCheckedChange={setDarkMode} 
                    />
                  </div>
                  
                  <div className="pt-6 border-t border-gray-200">
                    <h4 className="font-medium mb-3">{t('settings.appearance.language', '系统语言')}</h4>
                    <Select 
                      value={localStorage.getItem('i18nextLng') || 'zh'}
                      onValueChange={(lang) => {
                        import('@/i18n').then(({ changeLanguage }) => {
                          changeLanguage(lang);
                        });
                      }}
                    >
                      <SelectTrigger className="w-full">
                        <SelectValue placeholder={t('settings.appearance.selectLanguage', '选择语言')} />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="zh">{t('header.language.zh', '中文')}</SelectItem>
                        <SelectItem value="en">{t('header.language.en', 'English')}</SelectItem>
                        <SelectItem value="ru">{t('header.language.ru', 'Русский')}</SelectItem>
                        <SelectItem value="kk">{t('header.language.kk', 'Қазақша')}</SelectItem>
                        <SelectItem value="uz">{t('header.language.uz', 'O\'zbekcha')}</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                
                <div className="mt-6">
                  <Button onClick={handleSaveAppearance}>{t('settings.appearance.saveButton', '保存偏好')}</Button>
                </div>
              </CardContent>
            </Card>
          )}
          
          {activeTab === "admin" && isAdmin && (
            <Card>
              <CardHeader>
                <CardTitle>{t('settings.admin.title', '管理员设置')}</CardTitle>
                <CardDescription>
                  {t('settings.admin.description', '系统管理员专用功能')}
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-6">
                  <Alert className="mb-6">
                    <AlertCircle className="h-4 w-4 mr-2" />
                    <AlertTitle>{t('settings.admin.dataManagement', '数据管理')}</AlertTitle>
                    <AlertDescription>
                      {t('settings.admin.dataManagementDescription', '以下操作会修改系统数据，请谨慎操作')}
                    </AlertDescription>
                  </Alert>
                  
                  <div className="pt-4">
                    <h4 className="font-medium mb-2">{t('settings.admin.testData', '测试数据')}</h4>
                    <p className="text-gray-500 mb-4 text-sm">
                      {t('settings.admin.testDataDescription', '生成测试数据用于演示和测试。包括仓库、产品、入库单和出库单等')}
                    </p>
                    
                    <AlertDialog>
                      <AlertDialogTrigger asChild>
                        <Button 
                          variant="default"
                          className="mr-2"
                          disabled={isInitializing}
                        >
                          {isInitializing ? (
                            <>
                              <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
                              {t('settings.admin.initializing', '初始化中...')}
                            </>
                          ) : (
                            <>
                              <Database className="mr-2 h-4 w-4" />
                              {t('settings.admin.initializeData', '初始化测试数据')}
                            </>
                          )}
                        </Button>
                      </AlertDialogTrigger>
                      <AlertDialogContent>
                        <AlertDialogHeader>
                          <AlertDialogTitle>{t('settings.admin.confirmInitialize', '确认初始化测试数据')}</AlertDialogTitle>
                          <AlertDialogDescription>
                            {t('settings.admin.confirmInitializeDescription', '此操作将会生成测试数据，包括仓库、产品、入库单和出库单。用于系统的演示和测试。')}
                          </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel>{t('common.cancel', '取消')}</AlertDialogCancel>
                          <AlertDialogAction onClick={handleInitializeData}>
                            {t('settings.admin.confirmButton', '确认初始化')}
                          </AlertDialogAction>
                        </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </>
  );
}
