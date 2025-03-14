import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import { z } from "zod";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "@/lib/toast";
import { queryClient, apiRequest } from "@/lib/queryClient";

// UI Components
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCaption,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { Textarea } from "@/components/ui/textarea";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { formatDate } from "@/lib/utils";

// Icons
import {
  Cloud,
  CloudOff,
  Globe,
  Import,
  Key,
  Loader2,
  Plus,
  RefreshCw,
  Server,
  Settings,
  ShoppingCart,
  TestTube,
  Trash2,
} from "lucide-react";

// Zod schema for API configuration
const apiConfigurationSchema = z.object({
  name: z.string().min(2, {
    message: "Name must be at least 2 characters.",
  }),
  platformSource: z.string().min(1, {
    message: "Platform source is required.",
  }),
  apiUrl: z.string().url({
    message: "Must be a valid URL.",
  }),
  apiKey: z.string().min(5, {
    message: "API key must be at least 5 characters.",
  }),
  secretKey: z.string().optional(),
  additionalParams: z.string().optional(),
  isActive: z.boolean().default(true),
});

// Type for form values
type ApiConfigurationFormValues = z.infer<typeof apiConfigurationSchema>;

// Type for API Configuration
interface ApiConfiguration {
  id: number;
  name: string;
  platformSource: string;
  apiUrl: string;
  apiKey: string;
  secretKey?: string;
  additionalParams?: string;
  isActive: boolean;
  createdAt: string;
  updatedAt?: string;
}

// Create API Configuration Dialog
function CreateApiConfigurationDialog({ 
  open, 
  onOpenChange 
}: { 
  open: boolean; 
  onOpenChange: (open: boolean) => void 
}) {
  const { t } = useTranslation();
  
  // Form handling
  const form = useForm<ApiConfigurationFormValues>({
    resolver: zodResolver(apiConfigurationSchema),
    defaultValues: {
      name: "",
      platformSource: "",
      apiUrl: "",
      apiKey: "",
      secretKey: "",
      additionalParams: "",
      isActive: true,
    },
  });
  
  // Create API configuration mutation
  const createApiConfigurationMutation = useMutation({
    mutationFn: async (data: ApiConfigurationFormValues) => {
      return await apiRequest("/api/api-configurations", {
        method: "POST",
        body: JSON.stringify(data),
      });
    },
    onSuccess: () => {
      // Show success toast
      toast.success(t("api_config_created_description"));
      
      // Reset form and close dialog
      form.reset();
      onOpenChange(false);
      
      // Refresh API configurations list
      queryClient.invalidateQueries({ queryKey: ["/api/api-configurations"] });
    },
    onError: (error) => {
      console.error("Error creating API configuration:", error);
      toast.error(error.message || t("api_config_creation_failed"));
    },
  });
  
  const onSubmit = (data: ApiConfigurationFormValues) => {
    createApiConfigurationMutation.mutate(data);
  };
  
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[600px]">
        <DialogHeader>
          <DialogTitle>{t("new_api_config")}</DialogTitle>
          <DialogDescription>
            {t("new_api_config_description")}
          </DialogDescription>
        </DialogHeader>
        
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{t("name")}</FormLabel>
                  <FormControl>
                    <Input 
                      placeholder={t("api_config_name_placeholder")} 
                      {...field} 
                    />
                  </FormControl>
                  <FormDescription>
                    {t("api_config_name_description")}
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />
            
            <FormField
              control={form.control}
              name="platformSource"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{t("platform_source")}</FormLabel>
                  <Select
                    onValueChange={field.onChange}
                    defaultValue={field.value}
                  >
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder={t("select_platform_source")} />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="kaspi">Kaspi</SelectItem>
                      <SelectItem value="uzum">Uzum</SelectItem>
                      <SelectItem value="wildberries">Wildberries</SelectItem>
                      <SelectItem value="ozon">Ozon</SelectItem>
                      <SelectItem value="custom">{t("custom")}</SelectItem>
                    </SelectContent>
                  </Select>
                  <FormDescription>
                    {t("platform_source_description")}
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />
            
            <FormField
              control={form.control}
              name="apiUrl"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{t("api_url")}</FormLabel>
                  <FormControl>
                    <Input 
                      placeholder="https://api.example.com/v1"
                      {...field} 
                    />
                  </FormControl>
                  <FormDescription>
                    {t("api_url_description")}
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />
            
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              <FormField
                control={form.control}
                name="apiKey"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t("api_key")}</FormLabel>
                    <FormControl>
                      <Input 
                        type="password" 
                        {...field} 
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <FormField
                control={form.control}
                name="secretKey"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t("secret_key")}</FormLabel>
                    <FormControl>
                      <Input 
                        type="password" 
                        {...field} 
                        value={field.value || ""} 
                      />
                    </FormControl>
                    <FormDescription>
                      {t("optional")}
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
            
            <FormField
              control={form.control}
              name="additionalParams"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{t("additional_params")}</FormLabel>
                  <FormControl>
                    <Textarea 
                      placeholder='{
  "shop_id": "12345",
  "seller_id": "seller123"
}'
                      {...field} 
                      value={field.value || ""}
                    />
                  </FormControl>
                  <FormDescription>
                    {t("additional_params_description")}
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />
            
            <FormField
              control={form.control}
              name="isActive"
              render={({ field }) => (
                <FormItem className="flex flex-row items-center justify-between rounded-lg border p-3 shadow-sm">
                  <div className="space-y-0.5">
                    <FormLabel>{t("active_status")}</FormLabel>
                    <FormDescription>
                      {t("active_status_description")}
                    </FormDescription>
                  </div>
                  <FormControl>
                    <input
                      type="checkbox"
                      checked={field.value}
                      onChange={field.onChange}
                      className="h-4 w-4 rounded border-gray-300 text-primary focus:ring-primary"
                    />
                  </FormControl>
                </FormItem>
              )}
            />
            
            <DialogFooter>
              <Button 
                type="submit" 
                disabled={createApiConfigurationMutation.isPending}
              >
                {createApiConfigurationMutation.isPending && (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                )}
                {t("create")}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}

// Function to test API connection
async function testApiConnection(config: ApiConfiguration): Promise<boolean> {
  try {
    const response = await apiRequest<{ success: boolean }>(`/api/api-configurations/${config.id}/test`, {
      method: "POST"
    });
    
    return response.success === true;
  } catch (error) {
    console.error("API connection test failed:", error);
    return false;
  }
}

// Function to sync products from e-commerce platform
async function syncProducts(config: ApiConfiguration): Promise<{
  success: boolean;
  message: string;
  stats?: {
    total: number;
    matched: number;
    unmatched: number;
  };
}> {
  try {
    const response = await apiRequest<{
      success: boolean;
      message: string;
      stats?: {
        total: number;
        matched: number;
        unmatched: number;
      };
    }>(`/api/api-configurations/${config.id}/sync`, {
      method: "POST"
    });
    
    return response;
  } catch (error: any) {
    console.error("Product sync failed:", error);
    return {
      success: false,
      message: error.message || "Product sync failed"
    };
  }
}

// Main API Configurations component
export default function ApiConfigurations() {
  const { t } = useTranslation();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [isTestingApi, setIsTestingApi] = useState<Record<number, boolean>>({});
  const [isSyncingProducts, setIsSyncingProducts] = useState<Record<number, boolean>>({});
  
  // Fetch API configurations
  const { data: apiConfigurations = [], isLoading } = useQuery<ApiConfiguration[]>({
    queryKey: ["/api/api-configurations"],
    queryFn: async () => {
      return await apiRequest<ApiConfiguration[]>("/api/api-configurations");
    }
  });
  
  // Function to handle API test
  const handleTestConnection = async (config: ApiConfiguration) => {
    // Set loading state for this config
    setIsTestingApi(prev => ({ ...prev, [config.id]: true }));
    
    try {
      const isSuccessful = await testApiConnection(config);
      
      // Show toast with result
      if (isSuccessful) {
        toast.success(t("api_test_successful_description"));
      } else {
        toast.error(t("api_test_failed_description"));
      }
    } catch (error: any) {
      console.error("Error testing API connection:", error);
      toast.error(error.message || t("api_test_error"));
    } finally {
      // Reset loading state
      setIsTestingApi(prev => ({ ...prev, [config.id]: false }));
    }
  };
  
  // Function to handle product sync
  const handleSyncProducts = async (config: ApiConfiguration) => {
    // Set loading state for this config
    setIsSyncingProducts(prev => ({ ...prev, [config.id]: true }));
    
    try {
      const result = await syncProducts(config);
      
      // Show toast with result
      if (result.success) {
        const message = result.stats 
          ? t("product_sync_stats", { 
              total: result.stats.total,
              matched: result.stats.matched,
              unmatched: result.stats.unmatched 
            })
          : t("product_sync_successful_description");
        toast.success(message);
      } else {
        toast.error(result.message || t("product_sync_failed_description"));
      }
    } catch (error: any) {
      console.error("Error syncing products:", error);
      toast.error(error.message || t("product_sync_error"));
    } finally {
      // Reset loading state
      setIsSyncingProducts(prev => ({ ...prev, [config.id]: false }));
    }
  };
  
  // Delete API configuration mutation
  const deleteApiConfigurationMutation = useMutation({
    mutationFn: async (id: number) => {
      return await apiRequest(`/api/api-configurations/${id}`, {
        method: "DELETE"
      });
    },
    onSuccess: () => {
      // Show success toast
      toast.success(t("api_config_deleted_description"));
      
      // Refresh API configurations list
      queryClient.invalidateQueries({ queryKey: ["/api/api-configurations"] });
    },
    onError: (error: any) => {
      console.error("Error deleting API configuration:", error);
      toast.error(error.message || t("api_config_deletion_failed"));
    },
  });
  
  // Function to handle delete
  const handleDelete = (config: ApiConfiguration) => {
    if (window.confirm(t("confirm_delete_api_config"))) {
      deleteApiConfigurationMutation.mutate(config.id);
    }
  };
  
  // Function to get platform icon
  const getPlatformIcon = (platformSource: string) => {
    switch (platformSource.toLowerCase()) {
      case "kaspi":
        return <ShoppingCart className="text-red-500" />;
      case "uzum":
        return <ShoppingCart className="text-purple-500" />;
      case "wildberries":
        return <ShoppingCart className="text-violet-500" />;
      case "ozon":
        return <ShoppingCart className="text-blue-500" />;
      default:
        return <Globe />;
    }
  };
  
  return (
    <div className="container py-6">
      <div className="mb-6 flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">{t("api_configurations")}</h1>
          <p className="text-muted-foreground">
            {t("api_configurations_description")}
          </p>
        </div>
        <Button onClick={() => setDialogOpen(true)}>
          <Plus className="mr-2 h-4 w-4" />
          {t("new_api_config")}
        </Button>
      </div>
      
      {isLoading ? (
        <div className="flex h-64 items-center justify-center">
          <Loader2 className="h-10 w-10 animate-spin text-primary" />
        </div>
      ) : apiConfigurations.length === 0 ? (
        <div className="flex h-64 flex-col items-center justify-center gap-2 text-center">
          <Server className="h-10 w-10 text-muted-foreground" />
          <h3 className="text-lg font-medium">{t("no_api_configs")}</h3>
          <p className="text-sm text-muted-foreground">
            {t("no_api_configs_description")}
          </p>
          <Button onClick={() => setDialogOpen(true)} className="mt-4">
            <Plus className="mr-2 h-4 w-4" />
            {t("add_first_api_config")}
          </Button>
        </div>
      ) : (
        <div className="rounded-md border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-[80px]">ID</TableHead>
                <TableHead>{t("name")}</TableHead>
                <TableHead>{t("platform")}</TableHead>
                <TableHead>{t("status")}</TableHead>
                <TableHead>{t("created_at")}</TableHead>
                <TableHead className="text-right">{t("actions")}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {apiConfigurations.map((config) => (
                <TableRow key={config.id}>
                  <TableCell>{config.id}</TableCell>
                  <TableCell className="font-medium">
                    <div className="flex items-center">
                      {getPlatformIcon(config.platformSource)}
                      <span className="ml-2">{config.name}</span>
                    </div>
                  </TableCell>
                  <TableCell>
                    <Badge variant={config.platformSource === "custom" ? "outline" : "default"}>
                      {config.platformSource}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    {config.isActive ? (
                      <Badge className="bg-green-100 text-green-800">
                        <Cloud className="mr-1 h-3 w-3" />
                        {t("active")}
                      </Badge>
                    ) : (
                      <Badge variant="outline" className="text-gray-500">
                        <CloudOff className="mr-1 h-3 w-3" />
                        {t("inactive")}
                      </Badge>
                    )}
                  </TableCell>
                  <TableCell>{formatDate(config.createdAt)}</TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-2">
                      <Button 
                        variant="outline" 
                        size="sm"
                        onClick={() => handleTestConnection(config)}
                        disabled={isTestingApi[config.id]}
                        className="h-8 px-2 lg:px-3"
                      >
                        {isTestingApi[config.id] ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                          <TestTube className="h-4 w-4 lg:mr-2" />
                        )}
                        <span className="hidden lg:inline">{t("test")}</span>
                      </Button>
                      
                      <Button 
                        variant="outline" 
                        size="sm"
                        onClick={() => handleSyncProducts(config)}
                        disabled={isSyncingProducts[config.id] || !config.isActive}
                        className="h-8 px-2 lg:px-3"
                      >
                        {isSyncingProducts[config.id] ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                          <RefreshCw className="h-4 w-4 lg:mr-2" />
                        )}
                        <span className="hidden lg:inline">{t("sync")}</span>
                      </Button>
                      
                      <Button 
                        variant="ghost" 
                        size="sm"
                        onClick={() => handleDelete(config)}
                        className="h-8 px-2 text-red-500 hover:bg-red-50 hover:text-red-600"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}
      
      <CreateApiConfigurationDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
      />
    </div>
  );
}