import React, { useState } from "react";
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
  
  const handleSaveProfile = (e: React.FormEvent) => {
    e.preventDefault();
    toast({
      title: "Profile updated",
      description: "Your profile information has been saved.",
    });
  };
  
  const handleChangePassword = (e: React.FormEvent) => {
    e.preventDefault();
    toast({
      title: "Password updated",
      description: "Your password has been changed successfully.",
    });
  };
  
  const handleSaveNotifications = () => {
    toast({
      title: "Notification settings saved",
      description: "Your notification preferences have been updated.",
    });
  };
  
  const handleSaveAppearance = () => {
    toast({
      title: "Appearance settings saved",
      description: "Your appearance preferences have been updated.",
    });
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
        </div>
      </div>
    </>
  );
}
