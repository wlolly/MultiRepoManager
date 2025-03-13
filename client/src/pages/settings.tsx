import React, { useState } from "react";
import { Layout } from "@/components/layout/layout";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Switch } from "@/components/ui/switch";
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

  return (
    <Layout>
      <div className="pb-5 border-b border-gray-200 mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Settings</h1>
        <p className="mt-1 text-gray-500 text-sm">Manage your account settings and preferences</p>
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
                Account
              </TabsTrigger>
              <TabsTrigger 
                value="security" 
                className="w-full justify-start px-3 py-2 data-[state=active]:bg-gray-100 data-[state=active]:shadow-none"
              >
                <i className="ri-lock-line mr-2"></i>
                Security
              </TabsTrigger>
              <TabsTrigger 
                value="notifications" 
                className="w-full justify-start px-3 py-2 data-[state=active]:bg-gray-100 data-[state=active]:shadow-none"
              >
                <i className="ri-notification-line mr-2"></i>
                Notifications
              </TabsTrigger>
              <TabsTrigger 
                value="appearance" 
                className="w-full justify-start px-3 py-2 data-[state=active]:bg-gray-100 data-[state=active]:shadow-none"
              >
                <i className="ri-palette-line mr-2"></i>
                Appearance
              </TabsTrigger>
            </TabsList>
          </Tabs>
        </div>
        
        <div className="flex-1">
          {activeTab === "account" && (
            <Card>
              <CardHeader>
                <CardTitle>Account Settings</CardTitle>
                <CardDescription>
                  Update your account information and profile details
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
                        <Label htmlFor="avatar" className="block mb-2">Profile Picture</Label>
                        <Input 
                          id="avatar" 
                          type="url"
                          placeholder="URL for profile image" 
                          value={avatarUrl}
                          onChange={e => setAvatarUrl(e.target.value)}
                          className="w-full md:w-96"
                        />
                      </div>
                    </div>
                    
                    <div className="grid gap-4 md:grid-cols-2">
                      <div className="space-y-2">
                        <Label htmlFor="fullName">Full Name</Label>
                        <Input 
                          id="fullName" 
                          value={fullName}
                          onChange={e => setFullName(e.target.value)}
                        />
                      </div>
                      
                      <div className="space-y-2">
                        <Label htmlFor="username">Username</Label>
                        <Input 
                          id="username" 
                          value={username}
                          onChange={e => setUsername(e.target.value)}
                        />
                      </div>
                    </div>
                    
                    <div className="space-y-2">
                      <Label htmlFor="email">Email Address</Label>
                      <Input 
                        id="email" 
                        type="email"
                        value={email}
                        onChange={e => setEmail(e.target.value)}
                      />
                    </div>
                  </div>
                  
                  <div className="mt-6">
                    <Button type="submit">Save Changes</Button>
                  </div>
                </form>
              </CardContent>
            </Card>
          )}
          
          {activeTab === "security" && (
            <Card>
              <CardHeader>
                <CardTitle>Security Settings</CardTitle>
                <CardDescription>
                  Manage your password and security preferences
                </CardDescription>
              </CardHeader>
              <CardContent>
                <form onSubmit={handleChangePassword}>
                  <div className="space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="currentPassword">Current Password</Label>
                      <Input id="currentPassword" type="password" />
                    </div>
                    
                    <div className="space-y-2">
                      <Label htmlFor="newPassword">New Password</Label>
                      <Input id="newPassword" type="password" />
                    </div>
                    
                    <div className="space-y-2">
                      <Label htmlFor="confirmPassword">Confirm New Password</Label>
                      <Input id="confirmPassword" type="password" />
                    </div>
                  </div>
                  
                  <div className="mt-6">
                    <Button type="submit">Change Password</Button>
                  </div>
                </form>
                
                <div className="mt-8 pt-6 border-t border-gray-200">
                  <h3 className="text-lg font-medium mb-4">Two-Factor Authentication</h3>
                  <p className="text-gray-500 mb-4">
                    Add an extra layer of security to your account by enabling two-factor authentication.
                  </p>
                  <Button variant="outline">Enable 2FA</Button>
                </div>
              </CardContent>
            </Card>
          )}
          
          {activeTab === "notifications" && (
            <Card>
              <CardHeader>
                <CardTitle>Notification Preferences</CardTitle>
                <CardDescription>
                  Manage how you receive notifications and alerts
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <h4 className="font-medium">Email Notifications</h4>
                      <p className="text-gray-500 text-sm">Receive email notifications for important updates</p>
                    </div>
                    <Switch 
                      checked={emailNotifications} 
                      onCheckedChange={setEmailNotifications} 
                    />
                  </div>
                  
                  <div className="flex items-center justify-between">
                    <div>
                      <h4 className="font-medium">Repository Activity</h4>
                      <p className="text-gray-500 text-sm">Get notified about commits, branches, and pull requests</p>
                    </div>
                    <Switch 
                      checked={repositoryActivity} 
                      onCheckedChange={setRepositoryActivity} 
                    />
                  </div>
                  
                  <div className="flex items-center justify-between">
                    <div>
                      <h4 className="font-medium">Team Activity</h4>
                      <p className="text-gray-500 text-sm">Notifications about team membership changes</p>
                    </div>
                    <Switch 
                      checked={teamActivity} 
                      onCheckedChange={setTeamActivity} 
                    />
                  </div>
                  
                  <div className="flex items-center justify-between">
                    <div>
                      <h4 className="font-medium">Security Alerts</h4>
                      <p className="text-gray-500 text-sm">Important security updates and vulnerability alerts</p>
                    </div>
                    <Switch 
                      checked={securityAlerts} 
                      onCheckedChange={setSecurityAlerts} 
                    />
                  </div>
                </div>
                
                <div className="mt-6">
                  <Button onClick={handleSaveNotifications}>Save Preferences</Button>
                </div>
              </CardContent>
            </Card>
          )}
          
          {activeTab === "appearance" && (
            <Card>
              <CardHeader>
                <CardTitle>Appearance Settings</CardTitle>
                <CardDescription>
                  Customize how RepoManager looks for you
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <h4 className="font-medium">Dark Mode</h4>
                      <p className="text-gray-500 text-sm">Use the dark theme for the application</p>
                    </div>
                    <Switch 
                      checked={darkMode} 
                      onCheckedChange={setDarkMode} 
                    />
                  </div>
                  
                  <div className="pt-6 border-t border-gray-200">
                    <h4 className="font-medium mb-3">Language</h4>
                    <select className="w-full rounded-md border border-gray-300 p-2.5">
                      <option value="en">English</option>
                      <option value="zh">Chinese</option>
                      <option value="es">Spanish</option>
                      <option value="fr">French</option>
                    </select>
                  </div>
                </div>
                
                <div className="mt-6">
                  <Button onClick={handleSaveAppearance}>Save Preferences</Button>
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </Layout>
  );
}
