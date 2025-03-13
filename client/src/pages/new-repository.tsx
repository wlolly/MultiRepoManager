import React from "react";
import { Layout } from "@/components/layout/layout";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { useLocation } from "wouter";

import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage
} from "@/components/ui/form";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Separator } from "@/components/ui/separator";

// Extend the schema with client-side validation
const createRepositorySchema = z.object({
  name: z.string().min(1, "Repository name is required").max(100).regex(/^[a-zA-Z0-9-_]+$/, {
    message: "Repository name can only contain letters, numbers, hyphens, and underscores",
  }),
  description: z.string().max(500).optional(),
  visibility: z.enum(["public", "private", "internal"]),
  language: z.enum(["javascript", "typescript", "python", "java", "go", "rust", "c", "cpp", "csharp", "php", "ruby", "swift", "kotlin", "other"]),
  ownerId: z.number(),
  gitignore: z.boolean().optional(),
  readme: z.boolean().optional(),
});

type FormValues = z.infer<typeof createRepositorySchema>;

export default function NewRepository() {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const [_, navigate] = useLocation();
  
  // Hardcoded current user ID (in a real app, this would come from authentication)
  const currentUserId = 1;

  const form = useForm<FormValues>({
    resolver: zodResolver(createRepositorySchema),
    defaultValues: {
      name: "",
      description: "",
      visibility: "public",
      language: "javascript",
      ownerId: currentUserId,
      gitignore: true,
      readme: true
    }
  });

  const createMutation = useMutation({
    mutationFn: (data: FormValues) => 
      apiRequest("POST", "/api/repositories", data),
    onSuccess: async (response) => {
      const repository = await response.json();
      toast({
        title: "Repository created",
        description: `Successfully created ${repository.name}`,
      });
      queryClient.invalidateQueries({ queryKey: ["/api/repositories"] });
      navigate(`/repository/${repository.id}`);
    },
    onError: (error) => {
      toast({
        title: "Failed to create repository",
        description: error.message,
        variant: "destructive"
      });
    }
  });

  const onSubmit = (data: FormValues) => {
    createMutation.mutate(data);
  };

  return (
    <Layout>
      <div className="pb-5 border-b border-gray-200 mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Create New Repository</h1>
        <p className="mt-1 text-gray-500 text-sm">Set up a new repository to store your code</p>
      </div>
      
      <div className="max-w-3xl mx-auto">
        <Card>
          <CardHeader>
            <CardTitle>Repository Information</CardTitle>
            <CardDescription>
              Enter the details for your new repository
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
                <FormField
                  control={form.control}
                  name="name"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Repository Name</FormLabel>
                      <FormControl>
                        <Input placeholder="my-awesome-project" {...field} />
                      </FormControl>
                      <FormDescription>
                        Choose a unique name for your repository. Use only letters, numbers, hyphens, and underscores.
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="description"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Description (optional)</FormLabel>
                      <FormControl>
                        <Textarea 
                          placeholder="Briefly describe your project" 
                          {...field} 
                          value={field.value || ""}
                        />
                      </FormControl>
                      <FormDescription>
                        A short description helps others understand your project.
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <FormField
                    control={form.control}
                    name="visibility"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Visibility</FormLabel>
                        <Select onValueChange={field.onChange} defaultValue={field.value}>
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="Select visibility" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value="public">Public</SelectItem>
                            <SelectItem value="private">Private</SelectItem>
                            <SelectItem value="internal">Internal</SelectItem>
                          </SelectContent>
                        </Select>
                        <FormDescription>
                          Controls who can see and access your repository.
                        </FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="language"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Primary Language</FormLabel>
                        <Select onValueChange={field.onChange} defaultValue={field.value}>
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="Select language" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value="javascript">JavaScript</SelectItem>
                            <SelectItem value="typescript">TypeScript</SelectItem>
                            <SelectItem value="python">Python</SelectItem>
                            <SelectItem value="java">Java</SelectItem>
                            <SelectItem value="go">Go</SelectItem>
                            <SelectItem value="rust">Rust</SelectItem>
                            <SelectItem value="cpp">C++</SelectItem>
                            <SelectItem value="csharp">C#</SelectItem>
                            <SelectItem value="php">PHP</SelectItem>
                            <SelectItem value="ruby">Ruby</SelectItem>
                            <SelectItem value="swift">Swift</SelectItem>
                            <SelectItem value="kotlin">Kotlin</SelectItem>
                            <SelectItem value="other">Other</SelectItem>
                          </SelectContent>
                        </Select>
                        <FormDescription>
                          The main programming language of your project.
                        </FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                <Separator />

                <div className="space-y-4">
                  <h3 className="text-md font-medium">Initialize Repository With</h3>
                  
                  <FormField
                    control={form.control}
                    name="readme"
                    render={({ field }) => (
                      <FormItem className="flex flex-row items-start space-x-3 space-y-0 rounded-md border p-4">
                        <FormControl>
                          <Checkbox
                            checked={field.value}
                            onCheckedChange={field.onChange}
                          />
                        </FormControl>
                        <div className="space-y-1 leading-none">
                          <FormLabel>Add a README file</FormLabel>
                          <FormDescription>
                            Create a README to describe your project and give important information.
                          </FormDescription>
                        </div>
                      </FormItem>
                    )}
                  />
                  
                  <FormField
                    control={form.control}
                    name="gitignore"
                    render={({ field }) => (
                      <FormItem className="flex flex-row items-start space-x-3 space-y-0 rounded-md border p-4">
                        <FormControl>
                          <Checkbox
                            checked={field.value}
                            onCheckedChange={field.onChange}
                          />
                        </FormControl>
                        <div className="space-y-1 leading-none">
                          <FormLabel>Add .gitignore</FormLabel>
                          <FormDescription>
                            Add a .gitignore file to exclude build artifacts and other common files.
                          </FormDescription>
                        </div>
                      </FormItem>
                    )}
                  />
                </div>

                <div className="flex justify-end space-x-3">
                  <Button 
                    type="button" 
                    variant="outline" 
                    onClick={() => navigate("/")}
                  >
                    Cancel
                  </Button>
                  <Button 
                    type="submit" 
                    disabled={createMutation.isPending}
                  >
                    {createMutation.isPending ? "Creating..." : "Create Repository"}
                  </Button>
                </div>
              </form>
            </Form>
          </CardContent>
        </Card>
      </div>
    </Layout>
  );
}
