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

export default function Users() {
  const [activeTab, setActiveTab] = useState("users");
  const [userDialogOpen, setUserDialogOpen] = useState(false);
  const [teamDialogOpen, setTeamDialogOpen] = useState(false);

  // Fetch users
  const { data: users, isLoading: isLoadingUsers } = useQuery({
    queryKey: ["/api/users"],
  });

  // Fetch teams
  const { data: teams, isLoading: isLoadingTeams } = useQuery({
    queryKey: ["/api/teams"],
  });

  return (
    <Layout>
      <div className="pb-5 border-b border-gray-200 mb-6 flex flex-col sm:flex-row justify-between items-start sm:items-center">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Users & Teams</h1>
          <p className="mt-1 text-gray-500 text-sm">Manage users and team access</p>
        </div>
        <div className="mt-4 sm:mt-0 flex space-x-3">
          {activeTab === "users" ? (
            <Button onClick={() => setUserDialogOpen(true)}>
              <i className="ri-user-add-line mr-2"></i> Add User
            </Button>
          ) : (
            <Button onClick={() => setTeamDialogOpen(true)}>
              <i className="ri-team-line mr-2"></i> Create Team
            </Button>
          )}
        </div>
      </div>

      <Tabs defaultValue="users" value={activeTab} onValueChange={setActiveTab} className="mb-6">
        <TabsList className="grid w-full max-w-md grid-cols-2">
          <TabsTrigger value="users">Users</TabsTrigger>
          <TabsTrigger value="teams">Teams</TabsTrigger>
        </TabsList>
        <TabsContent value="users">
          <Card>
            <CardHeader>
              <CardTitle>System Users</CardTitle>
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
                      <TableHead>User</TableHead>
                      <TableHead>Username</TableHead>
                      <TableHead className="hidden md:table-cell">Created</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {users && users.length > 0 ? (
                      users.map((user: any) => (
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
                          No users found
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
              <CardTitle>Teams</CardTitle>
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
                    teams.map((team: any) => (
                      <Card key={team.id}>
                        <CardHeader>
                          <CardTitle>{team.name}</CardTitle>
                        </CardHeader>
                        <CardContent>
                          <p className="text-sm text-gray-500">{team.description || "No description"}</p>
                        </CardContent>
                        <CardFooter>
                          <Button variant="outline" className="w-full">
                            <i className="ri-team-line mr-2"></i> Manage Team
                          </Button>
                        </CardFooter>
                      </Card>
                    ))
                  ) : (
                    <div className="col-span-full text-center p-8 border rounded-md">
                      <p>No teams available</p>
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
            <DialogTitle>Add New User</DialogTitle>
            <DialogDescription>Create a new user account in the system.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="grid grid-cols-4 items-center gap-4">
              <label htmlFor="username" className="text-right text-sm font-medium">
                Username
              </label>
              <Input id="username" className="col-span-3" />
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <label htmlFor="fullName" className="text-right text-sm font-medium">
                Full Name
              </label>
              <Input id="fullName" className="col-span-3" />
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <label htmlFor="password" className="text-right text-sm font-medium">
                Password
              </label>
              <Input id="password" type="password" className="col-span-3" />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setUserDialogOpen(false)}>
              Cancel
            </Button>
            <Button>Create User</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Create Team Dialog */}
      <Dialog open={teamDialogOpen} onOpenChange={setTeamDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Create Team</DialogTitle>
            <DialogDescription>Create a new team to collaborate on repositories.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="grid grid-cols-4 items-center gap-4">
              <label htmlFor="teamName" className="text-right text-sm font-medium">
                Team Name
              </label>
              <Input id="teamName" className="col-span-3" />
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <label htmlFor="description" className="text-right text-sm font-medium">
                Description
              </label>
              <Input id="description" className="col-span-3" />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setTeamDialogOpen(false)}>
              Cancel
            </Button>
            <Button>Create Team</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Layout>
  );
}
