import { Switch, Route } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import NotFound from "@/pages/not-found";
import Dashboard from "@/pages/dashboard";
import MyRepositories from "@/pages/my-repositories";
import TeamRepositories from "@/pages/team-repositories";
import Users from "@/pages/users";
import Settings from "@/pages/settings";
import Repository from "@/pages/repository/[id]";
import NewRepository from "@/pages/new-repository";
import Search from "@/pages/search";

function Router() {
  return (
    <Switch>
      <Route path="/" component={Dashboard} />
      <Route path="/my-repositories" component={MyRepositories} />
      <Route path="/team-repositories" component={TeamRepositories} />
      <Route path="/users" component={Users} />
      <Route path="/settings" component={Settings} />
      <Route path="/repository/:id" component={Repository} />
      <Route path="/new-repository" component={NewRepository} />
      <Route path="/search" component={Search} />
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <Router />
      <Toaster />
    </QueryClientProvider>
  );
}

export default App;
