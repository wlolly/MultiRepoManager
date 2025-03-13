import { useState } from "react";
import { Layout } from "@/components/layout/layout";
import { useQuery, useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { useTranslation } from "react-i18next";

// UI组件
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
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Skeleton } from "@/components/ui/skeleton";
import { PlusCircle, Edit, Trash2, Search, FileBox, PackageOpen } from "lucide-react";
import { z } from "zod";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";

// 仓库类型定义
interface Warehouse {
  id: number;
  name: string;
  location: string;
  capacity: number;
  createdAt: string;
}

// 创建仓库的表单验证Schema
const createWarehouseSchema = z.object({
  name: z.string().min(1, "仓库名称不能为空"),
  location: z.string().min(1, "仓库地址不能为空"),
  capacity: z.number().min(0, "容量不能为负数"),
});

type CreateWarehouseFormValues = z.infer<typeof createWarehouseSchema>;

// 创建仓库对话框组件
function CreateWarehouseDialog({ open, onOpenChange }: { open: boolean; onOpenChange: (open: boolean) => void }) {
  const { t } = useTranslation();
  const { toast } = useToast();
  
  const form = useForm<CreateWarehouseFormValues>({
    resolver: zodResolver(createWarehouseSchema),
    defaultValues: {
      name: "",
      location: "",
      capacity: 0,
    }
  });
  
  const { mutate, isPending } = useMutation({
    mutationFn: (data: CreateWarehouseFormValues) => 
      apiRequest(
        "POST",
        "/api/warehouses",
        data
      ),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/warehouses'] });
      toast({
        title: t('warehouse_created'),
        description: t('warehouse_created_description')
      });
      form.reset();
      onOpenChange(false);
    },
    onError: (error) => {
      toast({
        title: t('warehouse_creation_failed'),
        description: String(error),
        variant: "destructive"
      });
    }
  });
  
  const onSubmit = (data: CreateWarehouseFormValues) => {
    mutate(data);
  };
  
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>{t('new_warehouse')}</DialogTitle>
          <DialogDescription>
            {t('new_warehouse_description')}
          </DialogDescription>
        </DialogHeader>
        
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4 py-2">
          <div className="space-y-2">
            <Label htmlFor="name">{t('name')} *</Label>
            <Input
              id="name"
              {...form.register("name")}
              placeholder={t('warehouse_name_placeholder')}
            />
            {form.formState.errors.name && (
              <p className="text-sm text-red-500">{form.formState.errors.name.message}</p>
            )}
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="location">{t('location')} *</Label>
            <Input
              id="location"
              {...form.register("location")}
              placeholder={t('warehouse_location_placeholder')}
            />
            {form.formState.errors.location && (
              <p className="text-sm text-red-500">{form.formState.errors.location.message}</p>
            )}
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="capacity">{t('capacity')} (m³) *</Label>
            <Input
              id="capacity"
              type="number"
              step="0.01"
              {...form.register("capacity", { valueAsNumber: true })}
              placeholder="0.00"
            />
            {form.formState.errors.capacity && (
              <p className="text-sm text-red-500">{form.formState.errors.capacity.message}</p>
            )}
          </div>
          
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              {t('cancel')}
            </Button>
            <Button type="submit" disabled={isPending}>
              {isPending ? t('creating') + '...' : t('create')}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

// 仓库卡片组件
function WarehouseCard({ warehouse }: { warehouse: Warehouse }) {
  const { t } = useTranslation();
  
  return (
    <Card className="h-full flex flex-col">
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <span>{warehouse.name}</span>
          <div className="flex space-x-2">
            <Button variant="ghost" size="icon">
              <Edit className="h-4 w-4" />
            </Button>
          </div>
        </CardTitle>
        <CardDescription>{warehouse.location}</CardDescription>
      </CardHeader>
      <CardContent className="flex-grow space-y-4">
        <div className="flex items-center justify-between">
          <span className="text-sm text-muted-foreground">{t('capacity')}:</span>
          <span className="font-medium">{warehouse.capacity} m³</span>
        </div>
        <div className="flex items-center justify-between">
          <span className="text-sm text-muted-foreground">{t('created_at')}:</span>
          <span className="text-sm">{new Date(warehouse.createdAt).toLocaleDateString()}</span>
        </div>
      </CardContent>
      <CardFooter className="flex justify-between">
        <Button variant="outline" className="w-full" size="sm">
          <FileBox className="mr-2 h-4 w-4" />
          {t('view_inventory')}
        </Button>
      </CardFooter>
    </Card>
  );
}

// 仓库列表组件
function WarehouseGrid({ warehouses, isLoading }: { warehouses: Warehouse[]; isLoading: boolean }) {
  const { t } = useTranslation();
  
  if (isLoading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {[1, 2, 3].map((i) => (
          <Card key={i} className="h-[200px]">
            <CardHeader>
              <Skeleton className="h-6 w-3/4" />
              <Skeleton className="h-4 w-1/2" />
            </CardHeader>
            <CardContent className="space-y-4">
              <Skeleton className="h-4 w-full" />
              <Skeleton className="h-4 w-full" />
            </CardContent>
            <CardFooter>
              <Skeleton className="h-8 w-full" />
            </CardFooter>
          </Card>
        ))}
      </div>
    );
  }
  
  if (!warehouses.length) {
    return (
      <div className="flex flex-col items-center justify-center py-10">
        <PackageOpen className="h-16 w-16 text-muted-foreground mb-4" />
        <h3 className="text-lg font-medium">{t('no_warehouses')}</h3>
        <p className="text-sm text-muted-foreground mt-1">
          {t('no_warehouses_description')}
        </p>
      </div>
    );
  }
  
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
      {warehouses.map((warehouse) => (
        <WarehouseCard key={warehouse.id} warehouse={warehouse} />
      ))}
    </div>
  );
}

// 仓库列表视图组件
function WarehouseTable({ warehouses, isLoading }: { warehouses: Warehouse[]; isLoading: boolean }) {
  const { t } = useTranslation();
  
  if (isLoading) {
    return (
      <div className="w-full">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>{t('name')}</TableHead>
              <TableHead>{t('location')}</TableHead>
              <TableHead>{t('capacity')}</TableHead>
              <TableHead>{t('created_at')}</TableHead>
              <TableHead className="text-right">{t('actions')}</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {[1, 2, 3, 4].map((i) => (
              <TableRow key={i}>
                <TableCell><Skeleton className="h-4 w-[100px]" /></TableCell>
                <TableCell><Skeleton className="h-4 w-[150px]" /></TableCell>
                <TableCell><Skeleton className="h-4 w-[80px]" /></TableCell>
                <TableCell><Skeleton className="h-4 w-[100px]" /></TableCell>
                <TableCell className="text-right"><Skeleton className="h-8 w-[100px] ml-auto" /></TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    );
  }
  
  if (!warehouses.length) {
    return (
      <div className="flex flex-col items-center justify-center py-10">
        <PackageOpen className="h-16 w-16 text-muted-foreground mb-4" />
        <h3 className="text-lg font-medium">{t('no_warehouses')}</h3>
        <p className="text-sm text-muted-foreground mt-1">
          {t('no_warehouses_description')}
        </p>
      </div>
    );
  }
  
  return (
    <div className="w-full">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>{t('name')}</TableHead>
            <TableHead>{t('location')}</TableHead>
            <TableHead>{t('capacity')}</TableHead>
            <TableHead>{t('created_at')}</TableHead>
            <TableHead className="text-right">{t('actions')}</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {warehouses.map((warehouse) => (
            <TableRow key={warehouse.id}>
              <TableCell className="font-medium">{warehouse.name}</TableCell>
              <TableCell>{warehouse.location}</TableCell>
              <TableCell>{warehouse.capacity} m³</TableCell>
              <TableCell>{new Date(warehouse.createdAt).toLocaleDateString()}</TableCell>
              <TableCell className="text-right">
                <div className="flex justify-end space-x-2">
                  <Button variant="ghost" size="icon">
                    <FileBox className="h-4 w-4" />
                  </Button>
                  <Button variant="ghost" size="icon">
                    <Edit className="h-4 w-4" />
                  </Button>
                  <Button variant="ghost" size="icon" className="text-red-500 hover:text-red-700">
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}

// 主页面组件
export default function Warehouses() {
  const { t } = useTranslation();
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [viewMode, setViewMode] = useState<"grid" | "table">("grid");
  
  const {
    data: warehouses = [],
    isLoading,
  } = useQuery({
    queryKey: ['/api/warehouses'],
    select: (data) => data as Warehouse[]
  });
  
  return (
    <Layout>
      <div className="container mx-auto py-6 space-y-6">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">{t('warehouses')}</h1>
            <p className="text-muted-foreground">
              {t('warehouses_description')}
            </p>
          </div>
          
          <div className="flex items-center space-x-2">
            <div className="hidden md:flex">
              <Button
                variant={viewMode === "grid" ? "default" : "outline"}
                size="sm"
                onClick={() => setViewMode("grid")}
                className="rounded-r-none"
              >
                {t('grid_view')}
              </Button>
              <Button
                variant={viewMode === "table" ? "default" : "outline"}
                size="sm"
                onClick={() => setViewMode("table")}
                className="rounded-l-none"
              >
                {t('list_view')}
              </Button>
            </div>
            
            <Button onClick={() => setCreateDialogOpen(true)}>
              <PlusCircle className="mr-2 h-4 w-4" />
              {t('new_warehouse')}
            </Button>
          </div>
        </div>
        
        <Separator className="my-6" />
        
        <div className="flex justify-between items-center mb-6">
          <div className="relative w-full max-w-sm">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              type="search"
              placeholder={t('search_warehouses')}
              className="pl-8"
            />
          </div>
        </div>
        
        {viewMode === "grid" ? (
          <WarehouseGrid warehouses={warehouses} isLoading={isLoading} />
        ) : (
          <WarehouseTable warehouses={warehouses} isLoading={isLoading} />
        )}
      </div>
      
      <CreateWarehouseDialog open={createDialogOpen} onOpenChange={setCreateDialogOpen} />
    </Layout>
  );
}