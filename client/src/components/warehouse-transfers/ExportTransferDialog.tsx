import { useState } from "react";
import { useTranslation } from "react-i18next";
import { FileSpreadsheet, Download, Loader2 } from "lucide-react";
import axios from "axios";
import { 
  Dialog, 
  DialogContent, 
  DialogDescription, 
  DialogFooter, 
  DialogHeader, 
  DialogTitle 
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { useToast } from "@/hooks/use-toast";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";

interface ExportTransferDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  transferId?: number;
  transferIds?: number[];
  referenceNumber?: string;
  onSuccess?: () => void;
}

export function ExportTransferDialog({
  open,
  onOpenChange,
  transferId,
  transferIds,
  referenceNumber,
  onSuccess
}: ExportTransferDialogProps) {
  const { t } = useTranslation();
  const { toast } = useToast();
  const [isExporting, setIsExporting] = useState(false);
  const [exportFormat, setExportFormat] = useState<"excel" | "pdf" | "1c">("excel");
  const [includeDetails, setIncludeDetails] = useState(true);
  const [includeImages, setIncludeImages] = useState(false);
  const [customFilename, setCustomFilename] = useState("");
  const [exportNotes, setExportNotes] = useState("");
  
  // 决定当前导出模式 - 单个调拨单或多个调拨单
  const isMultiExport = Boolean(transferIds && transferIds.length > 0);
  const title = isMultiExport 
    ? t("warehouseTransfer.export_multiple_transfers", { count: transferIds?.length || 0 })
    : t("warehouseTransfer.export_transfer", { ref: referenceNumber || "" });
  
  // 处理导出操作
  const handleExport = async () => {
    try {
      setIsExporting(true);
      
      // 构建导出参数
      const params = new URLSearchParams();
      if (includeDetails) params.append('includeDetails', 'true');
      if (includeImages) params.append('includeImages', 'true');
      if (exportNotes) params.append('notes', exportNotes);
      if (exportFormat) params.append('format', exportFormat);
      
      let response;
      
      // 根据导出模式选择不同的API端点
      if (isMultiExport && transferIds) {
        // 多个调拨单导出
        response = await axios.post('/api/warehouse-transfers/export-selected', 
          { 
            transferIds,
            includeDetails,
            includeImages,
            format: exportFormat,
            notes: exportNotes 
          },
          { responseType: 'blob' }
        );
      } else if (transferId) {
        // 单个调拨单导出
        response = await axios.get(`/api/warehouse-transfers/${transferId}/export?${params.toString()}`, {
          responseType: 'blob'
        });
      } else {
        throw new Error("无效的导出请求参数");
      }
      
      // 从响应头获取文件名或使用自定义文件名
      let filename = '';
      const contentDisposition = response.headers['content-disposition'];
      
      if (customFilename) {
        // 根据选择的格式设置文件扩展名
        const extension = exportFormat === 'pdf' ? '.pdf' : '.xlsx';
        filename = customFilename + extension;
      } else if (contentDisposition) {
        const filenameMatch = contentDisposition.match(/filename="?(.+?)"?$/);
        if (filenameMatch && filenameMatch[1]) {
          filename = filenameMatch[1];
        } else {
          // 默认文件名
          const dateStr = new Date().toISOString().split('T')[0];
          const prefix = isMultiExport ? 'transfers_export' : `transfer_${transferId}`;
          const extension = exportFormat === 'pdf' ? '.pdf' : '.xlsx';
          filename = `${prefix}_${dateStr}${extension}`;
        }
      }
      
      // 创建下载链接并触发下载
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', filename);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
      
      // 显示成功消息
      toast({
        title: t("common.success"),
        description: t("warehouseTransfer.export_success"),
      });
      
      // 关闭对话框
      onOpenChange(false);
      
      // 执行成功回调
      if (onSuccess) {
        onSuccess();
      }
      
    } catch (error) {
      console.error('Export error:', error);
      toast({
        title: t("common.error"),
        description: t("warehouseTransfer.export_failed"),
        variant: "destructive"
      });
    } finally {
      setIsExporting(false);
    }
  };
  
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileSpreadsheet className="h-5 w-5" />
            <span>{title}</span>
          </DialogTitle>
          <DialogDescription>
            {t("warehouseTransfer.export_description")}
          </DialogDescription>
        </DialogHeader>
        
        <div className="grid gap-4 py-4">
          {/* 导出格式选择 */}
          <div className="grid gap-2">
            <Label>{t("warehouseTransfer.export_format")}</Label>
            <RadioGroup
              value={exportFormat}
              onValueChange={(value) => setExportFormat(value as "excel" | "pdf" | "1c")}
              className="flex flex-col space-y-2"
            >
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="excel" id="format-excel" />
                <Label htmlFor="format-excel" className="cursor-pointer">
                  Excel (.xlsx)
                </Label>
              </div>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="pdf" id="format-pdf" />
                <Label htmlFor="format-pdf" className="cursor-pointer">
                  PDF (.pdf)
                </Label>
              </div>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="1c" id="format-1c" />
                <Label htmlFor="format-1c" className="cursor-pointer">
                  1C财务系统格式 (.xlsx)
                </Label>
              </div>
            </RadioGroup>
          </div>
          
          {/* 自定义文件名 */}
          <div className="grid gap-2">
            <Label>{t("warehouseTransfer.custom_filename")}</Label>
            <Input
              value={customFilename}
              onChange={(e) => setCustomFilename(e.target.value)}
              placeholder={t("warehouseTransfer.filename_placeholder")}
            />
          </div>
          
          {/* 导出选项 */}
          <div className="grid gap-2">
            <Label>{t("warehouseTransfer.export_options")}</Label>
            <div className="flex items-center space-x-2">
              <Checkbox 
                id="include-details" 
                checked={includeDetails}
                onCheckedChange={(checked) => setIncludeDetails(checked as boolean)}
              />
              <Label htmlFor="include-details" className="cursor-pointer">
                {t("warehouseTransfer.include_details")}
              </Label>
            </div>
            <div className="flex items-center space-x-2">
              <Checkbox 
                id="include-images" 
                checked={includeImages}
                onCheckedChange={(checked) => setIncludeImages(checked as boolean)}
              />
              <Label htmlFor="include-images" className="cursor-pointer">
                {t("warehouseTransfer.include_images")}
              </Label>
            </div>
          </div>
          
          {/* 导出备注 */}
          <div className="grid gap-2">
            <Label>{t("warehouseTransfer.export_notes")}</Label>
            <Textarea
              value={exportNotes}
              onChange={(e) => setExportNotes(e.target.value)}
              placeholder={t("warehouseTransfer.export_notes_placeholder")}
              rows={3}
            />
          </div>
        </div>
        
        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={isExporting}
          >
            {t("common.cancel")}
          </Button>
          <Button
            onClick={handleExport}
            disabled={isExporting}
          >
            {isExporting ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                {t("warehouseTransfer.exporting")}
              </>
            ) : (
              <>
                <Download className="mr-2 h-4 w-4" />
                {t("warehouseTransfer.export")}
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}