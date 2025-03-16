import { useState, useRef } from "react";
import { useTranslation } from "react-i18next";
import { FileSpreadsheet, Upload, AlertTriangle, Loader2 } from "lucide-react";
import axios from "axios";
import { 
  Dialog, 
  DialogContent, 
  DialogDescription, 
  DialogFooter, 
  DialogHeader, 
  DialogTitle,
  DialogTrigger 
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Table, TableBody, TableCaption, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";

interface ImportTransferDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  warehouses: { id: number; name: string }[];
  onImportSuccess: () => void;
}

export function ImportTransferDialog({
  open,
  onOpenChange,
  warehouses = [],
  onImportSuccess
}: ImportTransferDialogProps) {
  const { t } = useTranslation();
  const { toast } = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [file, setFile] = useState<File | null>(null);
  const [isImporting, setIsImporting] = useState(false);
  const [sourceWarehouseId, setSourceWarehouseId] = useState<string>("");
  const [targetWarehouseId, setTargetWarehouseId] = useState<string>("");
  const [notes, setNotes] = useState<string>(t("warehouseTransfer.import_default_notes"));
  const [errors, setErrors] = useState<string[]>([]);
  const [previewItems, setPreviewItems] = useState<any[]>([]);
  
  // 重置状态
  const resetState = () => {
    setFile(null);
    setSourceWarehouseId("");
    setTargetWarehouseId("");
    setNotes(t("warehouseTransfer.import_default_notes"));
    setErrors([]);
    setPreviewItems([]);
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };
  
  // 文件选择变更处理
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setErrors([]);
    setPreviewItems([]);
    
    if (e.target.files && e.target.files[0]) {
      const selectedFile = e.target.files[0];
      setFile(selectedFile);
      
      // 验证文件类型
      const fileExtension = selectedFile.name.split('.').pop()?.toLowerCase();
      if (fileExtension !== 'xlsx' && fileExtension !== 'xls') {
        setErrors([t("warehouseTransfer.invalid_file_type")]);
        return;
      }
      
      // 验证文件大小
      if (selectedFile.size > 10 * 1024 * 1024) { // 10MB 限制
        setErrors([t("warehouseTransfer.file_too_large")]);
        return;
      }
      
      // 获取文件预览
      const formData = new FormData();
      formData.append('file', selectedFile);
      
      axios.post('/api/warehouse-transfers/preview', formData, {
        headers: {
          'Content-Type': 'multipart/form-data'
        }
      })
      .then(response => {
        if (response.data.items) {
          setPreviewItems(response.data.items);
        }
      })
      .catch(error => {
        console.error('Preview error:', error);
        if (error.response?.data?.errors) {
          setErrors(Array.isArray(error.response.data.errors) 
            ? error.response.data.errors 
            : [error.response.data.errors]);
        } else {
          setErrors([t("warehouseTransfer.file_processing_error")]);
        }
      });
    }
  };
  
  // 导入文件处理
  const handleImport = async () => {
    // 验证必填字段
    if (!file) {
      toast({
        title: t("common.error"),
        description: t("warehouseTransfer.no_file_selected"),
        variant: "destructive"
      });
      return;
    }
    
    if (!sourceWarehouseId) {
      toast({
        title: t("common.error"),
        description: t("warehouseTransfer.no_source_warehouse"),
        variant: "destructive"
      });
      return;
    }
    
    if (!targetWarehouseId) {
      toast({
        title: t("common.error"),
        description: t("warehouseTransfer.no_target_warehouse"),
        variant: "destructive"
      });
      return;
    }
    
    // 源仓库和目标仓库不能相同
    if (sourceWarehouseId === targetWarehouseId) {
      toast({
        title: t("common.error"),
        description: t("warehouseTransfer.same_warehouse_error"),
        variant: "destructive"
      });
      return;
    }
    
    try {
      setIsImporting(true);
      
      const formData = new FormData();
      formData.append('file', file);
      formData.append('sourceWarehouseId', sourceWarehouseId);
      formData.append('targetWarehouseId', targetWarehouseId);
      formData.append('notes', notes);
      
      const response = await axios.post('/api/warehouse-transfers/import', formData, {
        headers: {
          'Content-Type': 'multipart/form-data'
        }
      });
      
      // 处理成功响应
      if (response.data.id) {
        toast({
          title: t("common.success"),
          description: t("warehouseTransfer.transfer_created", { ref: response.data.referenceNumber }),
        });
        
        // 重置表单并关闭对话框
        resetState();
        onOpenChange(false);
        onImportSuccess();
      } else {
        throw new Error(t("warehouseTransfer.import_failed"));
      }
    } catch (error) {
      console.error('Import error:', error);
      
      let errorMessage = t("warehouseTransfer.import_failed");
      
      // 处理错误响应
      if (
        error && 
        typeof error === 'object' && 
        'response' in error && 
        error.response && 
        typeof error.response === 'object' && 
        'data' in error.response && 
        error.response.data
      ) {
        // 提取错误信息
        if (error.response.data.errors && Array.isArray(error.response.data.errors)) {
          setErrors(error.response.data.errors);
          errorMessage = error.response.data.errors[0] || errorMessage;
        } else if (error.response.data.message) {
          errorMessage = error.response.data.message;
          setErrors([errorMessage]);
        }
      }
      
      // 使用useToast钩子返回的toast函数
      toast({
        title: t("common.error"),
        description: errorMessage
        // 移除了不支持的variant属性
      });
    } finally {
      setIsImporting(false);
    }
  };
  
  // 下载导入模板
  const handleDownloadTemplate = async () => {
    try {
      const response = await axios.get('/api/warehouse-transfers/template', {
        responseType: 'blob'
      });
      
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', 'warehouse_transfer_template.xlsx');
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
      
      toast({
        title: t("common.success"),
        description: t("warehouseTransfer.template_download_success"),
      });
    } catch (error) {
      console.error('Template download error:', error);
      // 使用useToast钩子返回的toast函数
      toast({
        title: t("common.error"),
        description: t("warehouseTransfer.template_download_error")
        // 移除了不支持的variant属性
      });
    }
  };
  
  // 触发文件选择
  const triggerFileSelect = () => {
    if (fileInputRef.current) {
      fileInputRef.current.click();
    }
  };
  
  return (
    <Dialog open={open} onOpenChange={(newOpen) => {
      if (!newOpen) {
        resetState();
      }
      onOpenChange(newOpen);
    }}>
      <DialogContent className="sm:max-w-[700px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileSpreadsheet className="h-5 w-5" />
            <span>{t("warehouseTransfer.import_transfer")}</span>
          </DialogTitle>
          <DialogDescription>
            {t("warehouseTransfer.import_description")}
          </DialogDescription>
        </DialogHeader>
        
        <div className="grid gap-4 py-4">
          {/* 仓库选择 */}
          <div className="grid grid-cols-2 gap-4">
            <div className="grid gap-2">
              <Label htmlFor="source-warehouse">
                {t("warehouseTransfer.source_warehouse")} <span className="text-red-500">*</span>
              </Label>
              <Select value={sourceWarehouseId} onValueChange={setSourceWarehouseId}>
                <SelectTrigger>
                  <SelectValue placeholder={t("warehouseTransfer.select_source_warehouse")} />
                </SelectTrigger>
                <SelectContent>
                  {warehouses.map((warehouse) => (
                    <SelectItem key={warehouse.id} value={warehouse.id.toString()}>
                      {warehouse.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            
            <div className="grid gap-2">
              <Label htmlFor="target-warehouse">
                {t("warehouseTransfer.target_warehouse")} <span className="text-red-500">*</span>
              </Label>
              <Select value={targetWarehouseId} onValueChange={setTargetWarehouseId}>
                <SelectTrigger>
                  <SelectValue placeholder={t("warehouseTransfer.select_target_warehouse")} />
                </SelectTrigger>
                <SelectContent>
                  {warehouses.map((warehouse) => (
                    <SelectItem 
                      key={warehouse.id} 
                      value={warehouse.id.toString()}
                      disabled={warehouse.id.toString() === sourceWarehouseId}
                    >
                      {warehouse.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          
          {/* 文件上传和备注 */}
          <div className="grid gap-2">
            <Label htmlFor="file">
              {t("warehouseTransfer.excel_file")} <span className="text-red-500">*</span>
            </Label>
            <div className="flex gap-2">
              <Input
                ref={fileInputRef}
                id="file"
                type="file"
                className="hidden"
                accept=".xlsx,.xls"
                onChange={handleFileChange}
              />
              <Button
                type="button"
                variant="outline"
                onClick={triggerFileSelect}
                className="w-full"
              >
                {file ? file.name : t("warehouseTransfer.select_file")}
              </Button>
              <Button
                type="button"
                variant="outline"
                onClick={handleDownloadTemplate}
              >
                {t("warehouseTransfer.download_template")}
              </Button>
            </div>
            {file && (
              <div className="text-sm text-gray-500">
                {t("warehouseTransfer.file_size")}: {(file.size / 1024).toFixed(2)} KB
              </div>
            )}
          </div>
          
          <div className="grid gap-2">
            <Label htmlFor="notes">{t("warehouseTransfer.notes")}</Label>
            <Textarea
              id="notes"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder={t("warehouseTransfer.import_notes_placeholder")}
              rows={3}
            />
          </div>
          
          {/* 错误提示 */}
          {errors.length > 0 && (
            <Alert variant="destructive">
              <AlertTriangle className="h-4 w-4" />
              <AlertTitle>{t("warehouseTransfer.import_errors")}</AlertTitle>
              <AlertDescription>
                <ul className="list-disc pl-5 mt-2">
                  {errors.map((error, index) => (
                    <li key={index}>{error}</li>
                  ))}
                </ul>
              </AlertDescription>
            </Alert>
          )}
          
          {/* 预览数据 */}
          {previewItems.length > 0 && (
            <div className="mt-4">
              <h3 className="text-lg font-medium mb-2">{t("warehouseTransfer.preview_data")}</h3>
              <div className="max-h-[300px] overflow-auto border rounded-md">
                <Table>
                  <TableCaption>{t("warehouseTransfer.preview_caption")}</TableCaption>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-[80px]">{t("warehouseTransfer.row")}</TableHead>
                      <TableHead>{t("warehouseTransfer.product_code")}</TableHead>
                      <TableHead>{t("warehouseTransfer.product_name")}</TableHead>
                      <TableHead className="text-right">{t("warehouseTransfer.quantity")}</TableHead>
                      <TableHead className="text-right">{t("warehouseTransfer.status")}</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {previewItems.map((item, index) => (
                      <TableRow key={index}>
                        <TableCell className="font-medium">{index + 1}</TableCell>
                        <TableCell>{item.productCode || item.barcode || '—'}</TableCell>
                        <TableCell>{item.name || '—'}</TableCell>
                        <TableCell className="text-right">{item.quantity || 0}</TableCell>
                        <TableCell className="text-right">
                          {item.valid !== false ? (
                            <Badge variant="outline" className="bg-green-50">
                              {t("warehouseTransfer.valid")}
                            </Badge>
                          ) : (
                            <Badge variant="destructive">
                              {t("warehouseTransfer.invalid")}
                            </Badge>
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
        
        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={isImporting}
          >
            {t("common.cancel")}
          </Button>
          <Button
            onClick={handleImport}
            disabled={isImporting || !file || !sourceWarehouseId || !targetWarehouseId || errors.length > 0}
          >
            {isImporting ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                {t("warehouseTransfer.importing")}
              </>
            ) : (
              <>
                <Upload className="mr-2 h-4 w-4" />
                {t("warehouseTransfer.import")}
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}