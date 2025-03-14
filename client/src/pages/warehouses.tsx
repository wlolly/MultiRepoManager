import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import { z } from "zod";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useToast } from "@/hooks/use-toast";
import { queryClient, apiRequest } from "@/lib/queryClient";
import * as XLSX from "xlsx";

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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useMobile } from "@/hooks/use-mobile";
import { formatDate } from "@/lib/utils";

// Icons
import {
  Building2,
  FileSpreadsheet,
  Filter,
  Loader2,
  MapPin,
  PackageOpen,
  PlusCircle,
  Search,
  X,
} from "lucide-react";

// Zod schema for creating warehouses
const createWarehouseSchema = z.object({
  name: z.string().min(2, {
    message: "Name must be at least 2 characters.",
  }),
  location: z.string().min(2, {
    message: "Location must be at least 2 characters.",
  }),
  capacity: z.coerce.number().positive({
    message: "Capacity must be a positive number.",
  }),
});

// Type for form values
type CreateWarehouseFormValues = z.infer<typeof createWarehouseSchema>;

// Type for Warehouse
interface Warehouse {
  id: number;
  name: string;
  location: string;
  capacity: number;
  createdAt: string;
}

// Create Warehouse Dialog
function CreateWarehouseDialog({ open, onOpenChange }: { open: boolean; onOpenChange: (open: boolean) => void }) {
  const { t } = useTranslation();
  const { toast } = useToast();
  
  // Form handling
  const form = useForm<CreateWarehouseFormValues>({
    resolver: zodResolver(createWarehouseSchema),
    defaultValues: {
      name: "",
      location: "",
      capacity: 100,
    },
  });
  
  // Create warehouse mutation
  const createWarehouseMutation = useMutation({
    mutationFn: async (data: CreateWarehouseFormValues) => {
      return await apiRequest("/api/warehouses", {
        method: "POST",
        body: JSON.stringify(data),
      });
    },
    onSuccess: () => {
      // Show success toast
      toast.success(t("warehouse_created_description"));
      
      // Reset form and close dialog
      form.reset();
      onOpenChange(false);
      
      // Refresh warehouses list
      queryClient.invalidateQueries({ queryKey: ["/api/warehouses"] });
    },
    onError: (error) => {
      console.error("Error creating warehouse:", error);
      toast.error(error.message || t("warehouse_creation_failed"));
    },
  });
  
  const onSubmit = (data: CreateWarehouseFormValues) => {
    createWarehouseMutation.mutate(data);
  };
  
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>{t("new_warehouse")}</DialogTitle>
          <DialogDescription>
            {t("new_warehouse_description")}
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
                      placeholder={t("warehouse_name_placeholder")} 
                      {...field} 
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            
            <FormField
              control={form.control}
              name="location"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{t("location")}</FormLabel>
                  <FormControl>
                    <Input 
                      placeholder={t("warehouse_location_placeholder")} 
                      {...field} 
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            
            <FormField
              control={form.control}
              name="capacity"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{t("capacity")}</FormLabel>
                  <FormControl>
                    <Input 
                      type="number" 
                      min="1"
                      {...field} 
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            
            <DialogFooter>
              <Button 
                type="submit" 
                disabled={createWarehouseMutation.isPending}
              >
                {createWarehouseMutation.isPending && (
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

// Warehouse Card component for grid view
function WarehouseCard({ warehouse }: { warehouse: Warehouse }) {
  const { t } = useTranslation();
  
  return (
    <Card className="overflow-hidden">
      <CardHeader className="pb-2">
        <CardTitle className="truncate text-lg font-bold">
          {warehouse.name}
        </CardTitle>
        <CardDescription className="flex items-center gap-1 text-xs">
          <MapPin className="h-3 w-3" />
          {warehouse.location}
        </CardDescription>
      </CardHeader>
      <CardContent className="pb-2">
        <div className="flex items-center justify-between">
          <span className="text-sm font-medium">
            {t("capacity")}: {warehouse.capacity}
          </span>
        </div>
      </CardContent>
      <CardFooter className="flex justify-between border-t p-3">
        <span className="text-xs text-muted-foreground">
          {t("created_at")}: {formatDate(warehouse.createdAt)}
        </span>
        <Button variant="outline" size="sm">
          {t("view_inventory")}
        </Button>
      </CardFooter>
    </Card>
  );
}

// Grid view for warehouses
function WarehouseGrid({ warehouses, isLoading }: { warehouses: Warehouse[]; isLoading: boolean }) {
  const { t } = useTranslation();
  
  if (isLoading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <Loader2 className="h-10 w-10 animate-spin text-primary" />
      </div>
    );
  }
  
  if (warehouses.length === 0) {
    return (
      <div className="flex h-64 flex-col items-center justify-center gap-2 text-center">
        <Building2 className="h-10 w-10 text-muted-foreground" />
        <h3 className="text-lg font-medium">{t("no_warehouses")}</h3>
        <p className="text-sm text-muted-foreground">
          {t("no_warehouses_description")}
        </p>
      </div>
    );
  }
  
  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4">
      {warehouses.map((warehouse) => (
        <WarehouseCard key={warehouse.id} warehouse={warehouse} />
      ))}
    </div>
  );
}

// Table view for warehouses
function WarehouseTable({ warehouses, isLoading }: { warehouses: Warehouse[]; isLoading: boolean }) {
  const { t } = useTranslation();
  
  if (isLoading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <Loader2 className="h-10 w-10 animate-spin text-primary" />
      </div>
    );
  }
  
  if (warehouses.length === 0) {
    return (
      <div className="flex h-64 flex-col items-center justify-center gap-2 text-center">
        <Building2 className="h-10 w-10 text-muted-foreground" />
        <h3 className="text-lg font-medium">{t("no_warehouses")}</h3>
        <p className="text-sm text-muted-foreground">
          {t("no_warehouses_description")}
        </p>
      </div>
    );
  }
  
  return (
    <div className="rounded-md border">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="w-[80px]">ID</TableHead>
            <TableHead>{t("name")}</TableHead>
            <TableHead>{t("location")}</TableHead>
            <TableHead className="text-right">{t("capacity")}</TableHead>
            <TableHead>{t("created_at")}</TableHead>
            <TableHead className="text-right">{t("actions")}</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {warehouses.map((warehouse) => (
            <TableRow key={warehouse.id}>
              <TableCell>{warehouse.id}</TableCell>
              <TableCell className="font-medium">{warehouse.name}</TableCell>
              <TableCell>{warehouse.location}</TableCell>
              <TableCell className="text-right">{warehouse.capacity}</TableCell>
              <TableCell>{formatDate(warehouse.createdAt)}</TableCell>
              <TableCell className="text-right">
                <Button variant="outline" size="sm">
                  {t("view_inventory")}
                </Button>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}

// Function to handle Excel export
function exportToExcel(warehouses: Warehouse[]) {
  // Create a worksheet from warehouses data
  const worksheet = XLSX.utils.json_to_sheet(warehouses);
  
  // Create a workbook and add the worksheet
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, "Warehouses");
  
  // Generate Excel file and trigger download
  XLSX.writeFile(workbook, "warehouses.xlsx");
}

// Function to handle Excel import
function handleExcelImport(event: React.ChangeEvent<HTMLInputElement>, onImport: (data: any[]) => void) {
  const file = event.target.files?.[0];
  if (!file) return;
  
  const reader = new FileReader();
  reader.onload = (e) => {
    const data = new Uint8Array(e.target?.result as ArrayBuffer);
    const workbook = XLSX.read(data, { type: 'array' });
    
    // Get first worksheet
    const worksheetName = workbook.SheetNames[0];
    const worksheet = workbook.Sheets[worksheetName];
    
    // Convert to JSON
    const jsonData = XLSX.utils.sheet_to_json(worksheet);
    
    // Pass data to callback
    onImport(jsonData);
    
    // Reset input
    event.target.value = '';
  };
  
  reader.readAsArrayBuffer(file);
}

// Main Warehouses component
export default function Warehouses() {
  const { t } = useTranslation();
  const isMobile = useMobile();
  const { toast } = useToast();
  const [searchQuery, setSearchQuery] = useState("");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [view, setView] = useState<"grid" | "table">("grid");
  
  // Fetch warehouses
  const { data: warehouses = [], isLoading } = useQuery<Warehouse[]>({
    queryKey: ["/api/warehouses"],
    queryFn: async () => {
      return await apiRequest<Warehouse[]>("/api/warehouses");
    },
  });
  
  // Filter warehouses based on search
  const filteredWarehouses = warehouses.filter((warehouse: Warehouse) => 
    warehouse.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    warehouse.location.toLowerCase().includes(searchQuery.toLowerCase())
  );
  
  // Handle import
  const handleImport = (data: any[]) => {
    // Create mutation for multiple warehouses
    const createWarehouses = async () => {
      try {
        const results = [];
        
        for (const item of data) {
          // Map Excel columns to warehouse fields
          const warehouseData = {
            name: item.name || item.Name || "",
            location: item.location || item.Location || "",
            capacity: parseInt(item.capacity || item.Capacity || "100"),
          };
          
          // Validate data
          const parsed = createWarehouseSchema.safeParse(warehouseData);
          if (!parsed.success) {
            console.warn("Invalid warehouse data:", warehouseData, parsed.error);
            continue;
          }
          
          // Create warehouse
          const response = await apiRequest("/api/warehouses", {
            method: "POST",
            body: JSON.stringify(parsed.data),
          });
          
          results.push(response);
        }
        
        return results;
      } catch (error) {
        console.error("Error importing warehouses:", error);
        throw error;
      }
    };
    
    // Execute import
    createWarehouses()
      .then((results) => {
        toast.success(`Imported ${results.length} warehouses.`);
        
        // Refresh warehouses list
        queryClient.invalidateQueries({ queryKey: ["/api/warehouses"] });
      })
      .catch((error) => {
        toast.error(error.message || "Excel Import Failed");
      });
  };
  
  return (
    <div className="container py-6">
      <div className="mb-6 flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">{t("warehouses")}</h1>
          <p className="text-muted-foreground">
            {t("warehouses_description")}
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => exportToExcel(filteredWarehouses)}>
            <FileSpreadsheet className="mr-2 h-4 w-4" />
            {t("export")}
          </Button>
          
          <div className="relative">
            <Input
              type="file"
              id="excel-import"
              className="hidden"
              accept=".xlsx,.xls"
              onChange={(e) => handleExcelImport(e, handleImport)}
            />
            <Button variant="outline" onClick={() => document.getElementById('excel-import')?.click()}>
              <FileSpreadsheet className="mr-2 h-4 w-4" />
              {t("import")}
            </Button>
          </div>
          
          <Button onClick={() => setDialogOpen(true)}>
            <PlusCircle className="mr-2 h-4 w-4" />
            {t("new_warehouse")}
          </Button>
        </div>
      </div>
      
      <div className="mb-4 grid grid-cols-1 gap-4 md:grid-cols-[1fr_auto]">
        <div className="relative">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder={t("search_warehouses")}
            className="pl-8"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
          {searchQuery && (
            <Button
              variant="ghost"
              size="sm"
              className="absolute right-1 top-1 h-6 w-6 rounded-full p-0"
              onClick={() => setSearchQuery("")}
            >
              <X className="h-4 w-4" />
              <span className="sr-only">Clear</span>
            </Button>
          )}
        </div>
        
        <div className="flex items-center space-x-2">
          <Button
            variant={view === "grid" ? "default" : "outline"}
            size="sm"
            className="h-9 px-3"
            onClick={() => setView("grid")}
          >
            Grid
          </Button>
          <Button
            variant={view === "table" ? "default" : "outline"}
            size="sm"
            className="h-9 px-3"
            onClick={() => setView("table")}
          >
            Table
          </Button>
        </div>
      </div>
      
      <div className="mt-6">
        {view === "grid" ? (
          <WarehouseGrid 
            warehouses={filteredWarehouses} 
            isLoading={isLoading} 
          />
        ) : (
          <WarehouseTable 
            warehouses={filteredWarehouses} 
            isLoading={isLoading} 
          />
        )}
      </div>
      
      <CreateWarehouseDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
      />
    </div>
  );
}