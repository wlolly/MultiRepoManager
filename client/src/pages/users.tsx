import React, { useState } from "react";
import { Layout } from "@/components/layout/layout";
import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { useTranslation } from "react-i18next";

// 定义用户和团队类型
interface User {
  id: number;
  username: string;
  fullName?: string;
  avatarUrl?: string;
  createdAt: string;
}

interface Team {
  id: number;
  name: string;
  description?: string;
  ownerId: number;
  createdAt: string;
}

export default function Users() {
  const { t } = useTranslation();
  const [activeTab, setActiveTab] = useState("users");
  const [userDialogOpen, setUserDialogOpen] = useState(false);
  const [teamDialogOpen, setTeamDialogOpen] = useState(false);

  // Fetch users
  const { data: users = [] as User[], isLoading: isLoadingUsers } = useQuery<User[]>({
    queryKey: ["/api/users"],
  });

  // Fetch teams
  const { data: teams = [] as Team[], isLoading: isLoadingTeams } = useQuery<Team[]>({
    queryKey: ["/api/teams"],
  });

  return (
    <Layout>
      <div className="pb-5 border-b border-gray-200 mb-6 flex flex-col sm:flex-row justify-between items-start sm:items-center">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">{t('users.title', 'Users & Teams')}</h1>
          <p className="mt-1 text-gray-500 text-sm">{t('users.subtitle', 'Manage users and team access')}</p>
        </div>
        <div className="mt-4 sm:mt-0 flex space-x-3">
          {activeTab === "users" ? (
            <Button onClick={() => setUserDialogOpen(true)}>
              <i className="ri-user-add-line mr-2"></i> {t('users.addUser', 'Add User')}
            </Button>
          ) : (
            <Button onClick={() => setTeamDialogOpen(true)}>
              <i className="ri-team-line mr-2"></i> {t('users.createTeam', 'Create Team')}
            </Button>
          )}
        </div>
      </div>

      <Tabs defaultValue="users" value={activeTab} onValueChange={setActiveTab} className="mb-6">
        <TabsList className="grid w-full max-w-md grid-cols-2">
          <TabsTrigger value="users">{t('users.users', 'Users')}</TabsTrigger>
          <TabsTrigger value="teams">{t('users.teams', 'Teams')}</TabsTrigger>
        </TabsList>
        <TabsContent value="users">
          <Card>
            <CardHeader>
              <CardTitle>{t('users.systemUsers', 'System Users')}</CardTitle>
            </CardHeader>
            <CardContent>
              {isLoadingUsers ? (
                <div className="space-y-4">
                  {[1, 2, 3, 4].map((i) => (
                    <div key={i} className="flex items-center space-x-4">
                      <Skeleton className="h-12 w-12 rounded-full" />
                      <div className="space-y-2">
                        <Skeleton className="h-4 w-[200px]" />
                        <Skeleton className="h-4 w-[150px]" />
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>{t('users.user', 'User')}</TableHead>
                      <TableHead>{t('users.username', 'Username')}</TableHead>
                      <TableHead className="hidden md:table-cell">{t('users.created', 'Created')}</TableHead>
                      <TableHead className="text-right">{t('users.actions', 'Actions')}</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {users && users.length > 0 ? (
                      users.map((user: User) => (
                        <TableRow key={user.id}>
                          <TableCell>
                            <div className="flex items-center space-x-3">
                              <Avatar>
                                <AvatarImage src={user.avatarUrl} alt={user.fullName || user.username} />
                                <AvatarFallback>
                                  {user.fullName 
                                    ? `${user.fullName.split(' ')[0][0]}${user.fullName.split(' ')[1]?.[0] || ''}`
                                    : user.username.substring(0, 2).toUpperCase()}
                                </AvatarFallback>
                              </Avatar>
                              <span className="font-medium">{user.fullName || user.username}</span>
                            </div>
                          </TableCell>
                          <TableCell>{user.username}</TableCell>
                          <TableCell className="hidden md:table-cell">
                            {new Date(user.createdAt).toLocaleDateString()}
                          </TableCell>
                          <TableCell className="text-right">
                            <Button variant="ghost" size="sm">
                              <i className="ri-edit-line"></i>
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))
                    ) : (
                      <TableRow>
                        <TableCell colSpan={4} className="text-center py-8">
                          {t('users.noUsersFound', 'No users found')}
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>
        <TabsContent value="teams">
          <Card>
            <CardHeader>
              <CardTitle>{t('users.teams', 'Teams')}</CardTitle>
            </CardHeader>
            <CardContent>
              {isLoadingTeams ? (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {[1, 2, 3].map((i) => (
                    <Card key={i}>
                      <CardHeader>
                        <Skeleton className="h-5 w-3/4" />
                      </CardHeader>
                      <CardContent>
                        <Skeleton className="h-4 w-full" />
                      </CardContent>
                      <CardFooter>
                        <Skeleton className="h-8 w-full" />
                      </CardFooter>
                    </Card>
                  ))}
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {teams && teams.length > 0 ? (
                    teams.map((team: Team) => (
                      <Card key={team.id}>
                        <CardHeader>
                          <CardTitle>{team.name}</CardTitle>
                        </CardHeader>
                        <CardContent>
                          <p className="text-sm text-gray-500">{team.description || t('repositories.noDescription', 'No description')}</p>
                        </CardContent>
                        <CardFooter>
                          <Button variant="outline" className="w-full">
                            <i className="ri-team-line mr-2"></i> {t('users.manageTeam', 'Manage Team')}
                          </Button>
                        </CardFooter>
                      </Card>
                    ))
                  ) : (
                    <div className="col-span-full text-center p-8 border rounded-md">
                      <p>{t('repositories.noTeams', 'No teams available')}</p>
                    </div>
                  )}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Add User Dialog */}
      <Dialog open={userDialogOpen} onOpenChange={setUserDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t('users.addNewUser', 'Add New User')}</DialogTitle>
            <DialogDescription>{t('users.createNewUserDesc', 'Create a new user account in the system.')}</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="grid grid-cols-4 items-center gap-4">
              <label htmlFor="username" className="text-right text-sm font-medium">
                {t('users.username', 'Username')}
              </label>
              <Input id="username" className="col-span-3" />
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <label htmlFor="fullName" className="text-right text-sm font-medium">
                {t('users.fullName', 'Full Name')}
              </label>
              <Input id="fullName" className="col-span-3" />
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <label htmlFor="password" className="text-right text-sm font-medium">
                {t('users.password', 'Password')}
              </label>
              <Input id="password" type="password" className="col-span-3" />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setUserDialogOpen(false)}>
              {t('general.cancel', 'Cancel')}
            </Button>
            <Button>{t('users.createUser', 'Create User')}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Create Team Dialog */}
      <Dialog open={teamDialogOpen} onOpenChange={setTeamDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t('users.createTeam', 'Create Team')}</DialogTitle>
            <DialogDescription>{t('users.createTeamDesc', 'Create a new team to collaborate on repositories.')}</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="grid grid-cols-4 items-center gap-4">
              <label htmlFor="teamName" className="text-right text-sm font-medium">
                {t('users.teamName', 'Team Name')}
              </label>
              <Input id="teamName" className="col-span-3" />
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <label htmlFor="description" className="text-right text-sm font-medium">
                {t('general.description', 'Description')}
              </label>
              <Input id="description" className="col-span-3" />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setTeamDialogOpen(false)}>
              {t('general.cancel', 'Cancel')}
            </Button>
            <Button>{t('users.createTeam', 'Create Team')}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Layout>
  );
}
