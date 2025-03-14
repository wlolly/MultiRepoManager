import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Breadcrumb, BreadcrumbItem, BreadcrumbLink, BreadcrumbList, BreadcrumbSeparator } from "@/components/ui/breadcrumb";
import { FileSpreadsheet, FileText, AlertCircle, Upload, ArrowLeft, Check } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Progress } from "@/components/ui/progress";
import { apiRequest, queryClient } from "@/lib/queryClient";

// 预览数据接口
interface ImportPreviewItem {
  row: number;
  productName: string;
  barcode: string;
  quantity: number;
  packageCount: number;
  weight: number;
  volume: number;
  status: string;
  matched: boolean;
}

// 仓库接口
interface Warehouse {
  id: number;
  name: string;
  location: string;
}

export default function WarehouseTransferImport() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [file, setFile] = useState<File | null>(null);
  const [importPreview, setImportPreview] = useState<ImportPreviewItem[]>([]);
  const [importErrors, setImportErrors] = useState<string[]>([]);
  const [isUploading, setIsUploading] = useState(false);
  const [isImporting, setIsImporting] = useState(false);
  const [sourceWarehouseId, setSourceWarehouseId] = useState<string>("");
  const [targetWarehouseId, setTargetWarehouseId] = useState<string>("");
  const [notes, setNotes] = useState<string>("");
  const [progress, setProgress] = useState<number>(0);
  const [uploadStatus, setUploadStatus] = useState<"idle" | "preview" | "importing" | "complete">("idle");
  
  // 加载仓库数据
  const { data: warehouses = [], isLoading: isLoadingWarehouses } = useQuery({
    queryKey: ['/api/warehouses'],
    enabled: true,
  });

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      setFile(e.target.files[0]);
      setImportPreview([]);
      setImportErrors([]);
    }
  };

  const handleUpload = async () => {
    if (!file) {
      toast({
        title: t("common.error"),
        description: t("warehouseTransfer.file_required"),
        variant: "destructive",
      });
      return;
    }

    setIsUploading(true);
    setImportErrors([]);

    const formData = new FormData();
    formData.append("file", file);

    try {
      const response = await apiRequest<{
        preview: ImportPreviewItem[];
        errors: string[];
      }>("/api/warehouse-transfers/preview-import", {
        method: "POST",
        body: formData,
      });

      if (response.errors && response.errors.length > 0) {
        setImportErrors(response.errors);
      }

      if (response.preview) {
        setImportPreview(response.preview);
      }
    } catch (error: any) {
      setImportErrors([error.message || t("warehouseTransfer.import_error")]);
    } finally {
      setIsUploading(false);
    }
  };

  // 更新进度效果
  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (uploadStatus === "importing") {
      interval = setInterval(() => {
        setProgress((prev) => {
          if (prev >= 95) {
            clearInterval(interval);
            return 95;
          }
          return prev + 5;
        });
      }, 300);
    }
    return () => {
      if (interval) clearInterval(interval);
    };
  }, [uploadStatus]);

  const importMutation = useMutation({
    mutationFn: async () => {
      if (!file) return;
      
      if (!sourceWarehouseId || !targetWarehouseId) {
        throw new Error(t("warehouseTransfer.select_warehouses"));
      }

      const formData = new FormData();
      formData.append("file", file);
      formData.append("sourceWarehouseId", sourceWarehouseId);
      formData.append("targetWarehouseId", targetWarehouseId);
      formData.append("notes", notes);

      setUploadStatus("importing");
      setProgress(5);

      return apiRequest<{ id: number; referenceNumber: string }>(
        "/api/warehouse-transfers/import",
        {
          method: "POST",
          body: formData,
        }
      );
    },
    onSuccess: (data) => {
      setProgress(100);
      setUploadStatus("complete");
      queryClient.invalidateQueries({queryKey: ['/api/warehouse-transfers']});
      toast({
        title: t("warehouseTransfer.import_success"),
        description: t("warehouseTransfer.import_success_details", {
          ref: data?.referenceNumber,
        }),
      });
      setTimeout(() => {
        navigate(`/warehouse-transfers`);
      }, 1500);
    },
    onError: (error: any) => {
      setUploadStatus("idle");
      setProgress(0);
      toast({
        title: t("common.error"),
        description: error.message || t("warehouseTransfer.import_error"),
        variant: "destructive",
      });
    },
  });

  const handleImport = () => {
    if (importErrors.length > 0) {
      toast({
        title: t("common.error"),
        description: t("warehouseTransfer.fix_errors_first"),
        variant: "destructive",
      });
      return;
    }

    if (importPreview.length === 0) {
      toast({
        title: t("common.error"),
        description: t("warehouseTransfer.no_preview_data"),
        variant: "destructive",
      });
      return;
    }

    if (!sourceWarehouseId || !targetWarehouseId) {
      toast({
        title: t("common.error"),
        description: t("warehouseTransfer.select_warehouses"),
        variant: "destructive",
      });
      return;
    }
    
    // 检查源仓库和目标仓库是否相同
    if (sourceWarehouseId === targetWarehouseId) {
      toast({
        title: t("common.error"),
        description: t("warehouseTransfer.same_warehouse_error"),
        variant: "destructive",
      });
      return;
    }

    importMutation.mutate();
  };

  const handleDownloadTemplate = async () => {
    try {
      const response = await fetch("/api/warehouse-transfers/template");
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = "warehouse_transfer_template.xlsx";
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    } catch (error) {
      toast({
        title: t("common.error"),
        description: t("warehouseTransfer.template_download_error"),
        variant: "destructive",
      });
    }
  };

  return (
    <div className="container mx-auto py-6">
      <div className="mb-6">
        <Breadcrumb>
          <BreadcrumbList>
            <BreadcrumbItem>
              <BreadcrumbLink href="/">{t("common.home")}</BreadcrumbLink>
            </BreadcrumbItem>
            <BreadcrumbSeparator />
            <BreadcrumbItem>
              <BreadcrumbLink href="/warehouse-transfers">
                {t("warehouseTransfer.title")}
              </BreadcrumbLink>
            </BreadcrumbItem>
            <BreadcrumbSeparator />
            <BreadcrumbItem>
              <BreadcrumbLink>{t("warehouseTransfer.import_from_excel")}</BreadcrumbLink>
            </BreadcrumbItem>
          </BreadcrumbList>
        </Breadcrumb>
      </div>

      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-2xl font-bold">{t("warehouseTransfer.import_from_excel")}</h1>
          <p className="text-muted-foreground">{t("warehouseTransfer.import_excel_description")}</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => navigate("/warehouse-transfers")}>
            <ArrowLeft className="mr-2 h-4 w-4" />
            {t("common.back")}
          </Button>
          <Button variant="outline" onClick={handleDownloadTemplate}>
            <FileSpreadsheet className="mr-2 h-4 w-4" />
            {t("warehouseTransfer.download_template")}
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>{t("warehouseTransfer.import_steps")}</CardTitle>
            <CardDescription>
              {t("warehouseTransfer.import_steps_description")}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {/* 导入步骤指南 */}
              <div className="bg-muted p-4 rounded-lg mb-4">
                <h3 className="font-medium mb-2">导入操作步骤：</h3>
                <ol className="list-decimal pl-5 space-y-1 text-sm">
                  <li>先下载
                    <Button 
                      variant="link" 
                      className="h-auto p-0 text-sm font-medium underline" 
                      onClick={handleDownloadTemplate}
                    >
                      导入模板
                    </Button>
                    并按格式填写
                  </li>
                  <li>上传填写好的Excel文件</li>
                  <li>系统将验证数据并显示预览</li>
                  <li>确认无误后点击"导入"完成操作</li>
                </ol>
                <div className="mt-2 text-xs text-muted-foreground">
                  <strong>注意：</strong> 导入的数据需要符合1C财务系统的格式要求，请确保数据准确性
                </div>
              </div>
              
              <div className="grid w-full max-w-sm items-center gap-1.5">
                <Label htmlFor="excel-file">{t("warehouseTransfer.excel_file")}</Label>
                <Input 
                  id="excel-file" 
                  type="file" 
                  accept=".xlsx,.xls" 
                  onChange={handleFileChange}
                />
                <div className="flex justify-between items-center mt-1">
                  <p className="text-xs text-muted-foreground">
                    {t("warehouseTransfer.supported_formats")}: .xlsx, .xls
                  </p>
                  <Button 
                    variant="secondary" 
                    size="sm" 
                    onClick={handleUpload}
                    disabled={!file || isUploading}
                    className="ml-2"
                  >
                    <FileSpreadsheet className="mr-2 h-4 w-4" />
                    {isUploading ? t("common.uploading") : t("warehouseTransfer.preview_data")}
                  </Button>
                </div>
              </div>
              
              {importErrors.length > 0 && (
                <Alert variant="destructive">
                  <AlertCircle className="h-4 w-4" />
                  <AlertTitle>{t("warehouseTransfer.import_errors")}</AlertTitle>
                  <AlertDescription>
                    <ul className="list-disc pl-4 mt-2">
                      {importErrors.map((error, index) => (
                        <li key={index}>{error}</li>
                      ))}
                    </ul>
                  </AlertDescription>
                </Alert>
              )}
              
              {/* 仓库选择 */}
              {importPreview.length > 0 && (
                <div className="grid gap-4 mt-6">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="source-warehouse">
                        {t("warehouseTransfer.source_warehouse")} <span className="text-red-500">*</span>
                      </Label>
                      <Select
                        value={sourceWarehouseId}
                        onValueChange={setSourceWarehouseId}
                        disabled={isImporting || isLoadingWarehouses}
                      >
                        <SelectTrigger id="source-warehouse">
                          <SelectValue placeholder={t("warehouseTransfer.select_warehouse")} />
                        </SelectTrigger>
                        <SelectContent>
                          {warehouses.map((warehouse: Warehouse) => (
                            <SelectItem key={warehouse.id} value={warehouse.id.toString()}>
                              {warehouse.name} ({warehouse.location})
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="target-warehouse">
                        {t("warehouseTransfer.target_warehouse")} <span className="text-red-500">*</span>
                      </Label>
                      <Select
                        value={targetWarehouseId}
                        onValueChange={setTargetWarehouseId}
                        disabled={isImporting || isLoadingWarehouses}
                      >
                        <SelectTrigger id="target-warehouse">
                          <SelectValue placeholder={t("warehouseTransfer.select_warehouse")} />
                        </SelectTrigger>
                        <SelectContent>
                          {warehouses.map((warehouse: Warehouse) => (
                            <SelectItem key={warehouse.id} value={warehouse.id.toString()}>
                              {warehouse.name} ({warehouse.location})
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="notes">{t("warehouseTransfer.notes")}</Label>
                    <textarea
                      id="notes"
                      className="w-full min-h-[80px] p-2 border rounded-md resize-y"
                      placeholder={t("warehouseTransfer.notes_placeholder")}
                      value={notes}
                      onChange={(e) => setNotes(e.target.value)}
                      disabled={isImporting}
                    />
                  </div>
                  
                  {/* 进度条 */}
                  {uploadStatus === "importing" && (
                    <div className="space-y-2">
                      <div className="flex justify-between items-center">
                        <Label>{t("warehouseTransfer.import_progress")}</Label>
                        <span className="text-sm text-muted-foreground">{progress}%</span>
                      </div>
                      <Progress value={progress} className="h-2" />
                    </div>
                  )}
                  
                  {uploadStatus === "complete" && (
                    <Alert className="bg-green-50 border-green-200">
                      <Check className="h-4 w-4 text-green-600" />
                      <AlertTitle className="text-green-800">{t("warehouseTransfer.import_success")}</AlertTitle>
                      <AlertDescription className="text-green-700">
                        {t("warehouseTransfer.import_complete_message")}
                      </AlertDescription>
                    </Alert>
                  )}
                </div>
              )}
              
              {importPreview.length > 0 && (
                <div className="mt-6">
                  <h3 className="text-lg font-medium mb-2">{t("warehouseTransfer.preview")}</h3>
                  <div className="max-h-[400px] overflow-auto border rounded-md">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead className="w-[60px]">{t("warehouseTransfer.row")}</TableHead>
                          <TableHead>{t("warehouseTransfer.product_name")}</TableHead>
                          <TableHead>{t("warehouseTransfer.barcode")}</TableHead>
                          <TableHead className="text-right">{t("warehouseTransfer.quantity")}</TableHead>
                          <TableHead className="text-right">{t("warehouseTransfer.packages")}</TableHead>
                          <TableHead className="text-right">{t("warehouseTransfer.weight")}</TableHead>
                          <TableHead className="text-right">{t("warehouseTransfer.volume")}</TableHead>
                          <TableHead>{t("warehouseTransfer.status")}</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {importPreview.map((item) => (
                          <TableRow 
                            key={item.row}
                            className={!item.matched ? "bg-muted/50" : undefined}
                          >
                            <TableCell>{item.row}</TableCell>
                            <TableCell>{item.productName}</TableCell>
                            <TableCell>{item.barcode}</TableCell>
                            <TableCell className="text-right">{item.quantity}</TableCell>
                            <TableCell className="text-right">{item.packageCount}</TableCell>
                            <TableCell className="text-right">{item.weight.toFixed(2)} kg</TableCell>
                            <TableCell className="text-right">{item.volume.toFixed(3)} m³</TableCell>
                            <TableCell>
                              {item.matched ? (
                                <span className="text-green-600">✓ {t("warehouseTransfer.matched")}</span>
                              ) : (
                                <span className="text-amber-600">⚠ {t("warehouseTransfer.not_matched")}</span>
                              )}
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                </div>
              )}
            </div>
          </CardContent>
          <CardFooter className="flex justify-end gap-2">
            <Button
              variant="outline"
              onClick={() => navigate("/warehouse-transfers")}
            >
              {t("common.cancel")}
            </Button>
            <Button
              onClick={handleImport}
              disabled={importPreview.length === 0 || importErrors.length > 0 || isImporting}
            >
              <Upload className="mr-2 h-4 w-4" />
              {isImporting ? t("common.importing") : t("warehouseTransfer.import")}
            </Button>
          </CardFooter>
        </Card>
      </div>
    </div>
  );
}