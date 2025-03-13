import React from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { useLocation } from "wouter";

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
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

// Extend the schema with client-side validation
const createRepositorySchema = z.object({
  name: z.string().min(1, "Repository name is required").max(100).regex(/^[a-zA-Z0-9-_]+$/, {
    message: "Repository name can only contain letters, numbers, hyphens, and underscores",
  }),
  description: z.string().max(500).optional(),
  visibility: z.enum(["public", "private", "internal"]),
  language: z.enum(["javascript", "typescript", "python", "java", "go", "rust", "c", "cpp", "csharp", "php", "ruby", "swift", "kotlin", "other"]),
  ownerId: z.number()
});

type FormValues = z.infer<typeof createRepositorySchema>;

interface CreateRepositoryDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  currentUserId: number;
}

export function CreateRepositoryDialog({ open, onOpenChange, currentUserId }: CreateRepositoryDialogProps) {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const [_, navigate] = useLocation();

  const form = useForm<FormValues>({
    resolver: zodResolver(createRepositorySchema),
    defaultValues: {
      name: "",
      description: "",
      visibility: "public",
      language: "javascript",
      ownerId: currentUserId
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
      onOpenChange(false);
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
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Create New Repository</DialogTitle>
          <DialogDescription>
            Create a new repository to store your code and collaborate with others.
          </DialogDescription>
        </DialogHeader>

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
                    Choose a unique name for your repository
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
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="grid grid-cols-2 gap-4">
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
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <DialogFooter>
              <Button 
                type="button" 
                variant="outline" 
                onClick={() => onOpenChange(false)}
              >
                Cancel
              </Button>
              <Button 
                type="submit" 
                disabled={createMutation.isPending}
              >
                {createMutation.isPending ? "Creating..." : "Create Repository"}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
