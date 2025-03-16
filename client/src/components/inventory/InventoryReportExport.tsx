import { useState } from "react";
import { useTranslation } from "react-i18next";
import { FileSpreadsheet, Download, Loader2, CalendarDays, Filter } from "lucide-react";
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
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { toast } from "@/hooks/use-toast";
import { format } from "date-fns";

interface InventoryReportExportProps {
  warehouseOptions: { id: number; name: string }[];
  categoryOptions: string[];
  triggerText?: string;
}

export function InventoryReportExport({
  warehouseOptions = [],
  categoryOptions = [],
  triggerText
}: InventoryReportExportProps) {
  const { t } = useTranslation();
  const [open, setOpen] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  
  // 报表参数
  const [reportType, setReportType] = useState<"inventory" | "movement" | "summary">("inventory");
  const [warehouseId, setWarehouseId] = useState<string>("all");
  const [categories, setCategories] = useState<string[]>([]);
  const [dateRange, setDateRange] = useState<"today" | "week" | "month" | "custom">("month");
  const [startDate, setStartDate] = useState<string>(format(new Date(Date.now() - 30 * 24 * 60 * 60 * 1000), "yyyy-MM-dd"));
  const [endDate, setEndDate] = useState<string>(format(new Date(), "yyyy-MM-dd"));
  const [includeImages, setIncludeImages] = useState(false);
  const [includePrices, setIncludePrices] = useState(true);
  const [exportFormat, setExportFormat] = useState<"excel" | "pdf" | "csv">("excel");
  const [customFilename, setCustomFilename] = useState("");
  
  // 选择或取消选择全部分类
  const handleSelectAllCategories = (checked: boolean) => {
    if (checked) {
      setCategories(categoryOptions);
    } else {
      setCategories([]);
    }
  };
  
  // 处理分类选择变更
  const handleCategoryChange = (category: string, checked: boolean) => {
    if (checked) {
      setCategories(prev => [...prev, category]);
    } else {
      setCategories(prev => prev.filter(c => c !== category));
    }
  };
  
  // 根据报表类型获取标题
  const getReportTitle = () => {
    switch (reportType) {
      case "inventory":
        return t("reports.current_inventory_report");
      case "movement":
        return t("reports.inventory_movement_report");
      case "summary":
        return t("reports.inventory_summary_report");
      default:
        return t("reports.inventory_report");
    }
  };
  
  // 处理日期范围变更
  const handleDateRangeChange = (value: "today" | "week" | "month" | "custom") => {
    setDateRange(value);
    
    const today = new Date();
    
    switch (value) {
      case "today":
        setStartDate(format(today, "yyyy-MM-dd"));
        setEndDate(format(today, "yyyy-MM-dd"));
        break;
      case "week":
        const weekStart = new Date(today);
        weekStart.setDate(today.getDate() - today.getDay());
        setStartDate(format(weekStart, "yyyy-MM-dd"));
        setEndDate(format(today, "yyyy-MM-dd"));
        break;
      case "month":
        const monthStart = new Date(today.getFullYear(), today.getMonth(), 1);
        setStartDate(format(monthStart, "yyyy-MM-dd"));
        setEndDate(format(today, "yyyy-MM-dd"));
        break;
      // "custom"的情况保持当前选择的日期
    }
  };
  
  // 导出报表
  const handleExport = async () => {
    try {
      setIsExporting(true);
      
      // 构建请求参数
      const params = new URLSearchParams();
      params.append('reportType', reportType);
      params.append('warehouseId', warehouseId);
      params.append('format', exportFormat);
      params.append('startDate', startDate);
      params.append('endDate', endDate);
      
      if (includePrices) params.append('includePrices', 'true');
      if (includeImages) params.append('includeImages', 'true');
      if (customFilename) params.append('filename', customFilename);
      
      // 添加分类过滤器
      categories.forEach(category => {
        params.append('categories[]', category);
      });
      
      // 发送请求
      const response = await axios.get(`/api/inventory/reports/export?${params.toString()}`, {
        responseType: 'blob'
      });
      
      // 从响应头获取文件名
      let filename = '';
      const contentDisposition = response.headers['content-disposition'];
      
      if (customFilename) {
        // 自定义文件名
        const extension = exportFormat === 'pdf' ? '.pdf' : exportFormat === 'csv' ? '.csv' : '.xlsx';
        filename = customFilename + extension;
      } else if (contentDisposition) {
        // 从响应头中提取文件名
        const filenameMatch = contentDisposition.match(/filename="?(.+?)"?$/);
        if (filenameMatch && filenameMatch[1]) {
          filename = filenameMatch[1];
        } else {
          // 默认文件名
          const dateStr = format(new Date(), "yyyy-MM-dd");
          const extension = exportFormat === 'pdf' ? '.pdf' : exportFormat === 'csv' ? '.csv' : '.xlsx';
          filename = `${reportType}_report_${dateStr}${extension}`;
        }
      }
      
      // 创建下载链接
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', filename);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
      
      // 显示成功消息并关闭对话框
      toast({
        title: t("common.success"),
        description: t("reports.export_success"),
      });
      
      setOpen(false);
    } catch (error) {
      console.error("Export error:", error);
      
      toast({
        title: t("common.error"),
        description: t("reports.export_failed"),
        variant: "destructive"
      });
    } finally {
      setIsExporting(false);
    }
  };
  
  return (
    <>
      <DialogTrigger asChild>
        <Button
          variant="outline"
          onClick={() => setOpen(true)}
          className="gap-2"
        >
          <FileSpreadsheet className="h-4 w-4" />
          {triggerText || t("reports.export_inventory_report")}
        </Button>
      </DialogTrigger>
      
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="sm:max-w-[700px]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <FileSpreadsheet className="h-5 w-5" />
              <span>{getReportTitle()}</span>
            </DialogTitle>
            <DialogDescription>
              {t("reports.export_description")}
            </DialogDescription>
          </DialogHeader>
          
          <div className="grid gap-6 py-4">
            {/* 报表类型 */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm">
                  {t("reports.report_type")}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <RadioGroup
                  value={reportType}
                  onValueChange={(value) => setReportType(value as "inventory" | "movement" | "summary")}
                  className="flex flex-col space-y-1"
                >
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="inventory" id="inventory" />
                    <Label htmlFor="inventory" className="cursor-pointer">
                      {t("reports.current_inventory")}
                    </Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="movement" id="movement" />
                    <Label htmlFor="movement" className="cursor-pointer">
                      {t("reports.inventory_movement")}
                    </Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="summary" id="summary" />
                    <Label htmlFor="summary" className="cursor-pointer">
                      {t("reports.inventory_summary")}
                    </Label>
                  </div>
                </RadioGroup>
              </CardContent>
            </Card>
            
            {/* 过滤选项 */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* 仓库选择 */}
              <div>
                <Label htmlFor="warehouse">{t("reports.warehouse")}</Label>
                <Select
                  value={warehouseId}
                  onValueChange={setWarehouseId}
                >
                  <SelectTrigger className="mt-1">
                    <SelectValue placeholder={t("reports.select_warehouse")} />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">{t("reports.all_warehouses")}</SelectItem>
                    {warehouseOptions.map((warehouse) => (
                      <SelectItem key={warehouse.id} value={warehouse.id.toString()}>
                        {warehouse.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              
              {/* 日期范围选择 */}
              <div>
                <Label>{t("reports.date_range")}</Label>
                <Select
                  value={dateRange}
                  onValueChange={(value) => handleDateRangeChange(value as "today" | "week" | "month" | "custom")}
                >
                  <SelectTrigger className="mt-1">
                    <SelectValue placeholder={t("reports.select_date_range")} />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="today">{t("reports.today")}</SelectItem>
                    <SelectItem value="week">{t("reports.this_week")}</SelectItem>
                    <SelectItem value="month">{t("reports.this_month")}</SelectItem>
                    <SelectItem value="custom">{t("reports.custom_range")}</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            
            {/* 自定义日期范围 */}
            {dateRange === "custom" && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="start-date">{t("reports.start_date")}</Label>
                  <Input
                    id="start-date"
                    type="date"
                    value={startDate}
                    onChange={(e) => setStartDate(e.target.value)}
                    className="mt-1"
                  />
                </div>
                <div>
                  <Label htmlFor="end-date">{t("reports.end_date")}</Label>
                  <Input
                    id="end-date"
                    type="date"
                    value={endDate}
                    onChange={(e) => setEndDate(e.target.value)}
                    className="mt-1"
                  />
                </div>
              </div>
            )}
            
            {/* 分类选择 */}
            {categoryOptions.length > 0 && (
              <div>
                <div className="flex justify-between items-center mb-2">
                  <Label>{t("reports.categories")}</Label>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleSelectAllCategories(categories.length < categoryOptions.length)}
                  >
                    {categories.length < categoryOptions.length
                      ? t("reports.select_all")
                      : t("reports.deselect_all")}
                  </Button>
                </div>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-2 max-h-[200px] overflow-y-auto border rounded-md p-3">
                  {categoryOptions.map((category) => (
                    <div key={category} className="flex items-center space-x-2">
                      <Checkbox
                        id={`category-${category}`}
                        checked={categories.includes(category)}
                        onCheckedChange={(checked) => 
                          handleCategoryChange(category, checked as boolean)
                        }
                      />
                      <Label
                        htmlFor={`category-${category}`}
                        className="cursor-pointer text-sm"
                      >
                        {category}
                      </Label>
                    </div>
                  ))}
                </div>
              </div>
            )}
            
            {/* 导出选项 */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* 导出格式 */}
              <div>
                <Label>{t("reports.export_format")}</Label>
                <RadioGroup
                  value={exportFormat}
                  onValueChange={(value) => setExportFormat(value as "excel" | "pdf" | "csv")}
                  className="flex flex-col space-y-1 mt-1"
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
                    <RadioGroupItem value="csv" id="format-csv" />
                    <Label htmlFor="format-csv" className="cursor-pointer">
                      CSV (.csv)
                    </Label>
                  </div>
                </RadioGroup>
              </div>
              
              {/* 其他选项 */}
              <div>
                <Label>{t("reports.additional_options")}</Label>
                <div className="space-y-2 mt-2">
                  <div className="flex items-center space-x-2">
                    <Checkbox
                      id="include-prices"
                      checked={includePrices}
                      onCheckedChange={(checked) => setIncludePrices(checked as boolean)}
                    />
                    <Label htmlFor="include-prices" className="cursor-pointer">
                      {t("reports.include_prices")}
                    </Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Checkbox
                      id="include-images"
                      checked={includeImages}
                      onCheckedChange={(checked) => setIncludeImages(checked as boolean)}
                    />
                    <Label htmlFor="include-images" className="cursor-pointer">
                      {t("reports.include_images")}
                    </Label>
                  </div>
                </div>
              </div>
            </div>
            
            {/* 自定义文件名 */}
            <div>
              <Label htmlFor="custom-filename">{t("reports.custom_filename")}</Label>
              <Input
                id="custom-filename"
                value={customFilename}
                onChange={(e) => setCustomFilename(e.target.value)}
                placeholder={t("reports.filename_placeholder")}
                className="mt-1"
              />
            </div>
          </div>
          
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setOpen(false)}
              disabled={isExporting}
            >
              {t("common.cancel")}
            </Button>
            <Button
              onClick={handleExport}
              disabled={isExporting || (dateRange === "custom" && (!startDate || !endDate))}
            >
              {isExporting ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  {t("reports.generating")}
                </>
              ) : (
                <>
                  <Download className="mr-2 h-4 w-4" />
                  {t("reports.export")}
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}