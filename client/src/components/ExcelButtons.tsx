import { FileSpreadsheet, FileDown, FileUp } from "lucide-react";
import { Button } from "@/components/ui/button";

interface ExcelButtonsProps {
  onDownloadTemplate: () => void;
  onImport: () => void;
  onExport: () => void;
  className?: string;
}

export function ExcelButtons({ onDownloadTemplate, onImport, onExport, className = "" }: ExcelButtonsProps) {
  return (
    <div className={`flex gap-2 ${className}`}>
      <Button
        variant="outline"
        onClick={onDownloadTemplate}
        className="flex items-center"
      >
        <FileSpreadsheet className="mr-2 h-4 w-4" />
        下载模板
      </Button>
      <Button
        variant="outline"
        onClick={onImport}
        className="flex items-center"
      >
        <FileUp className="mr-2 h-4 w-4" />
        导入Excel
      </Button>
      <Button
        variant="outline"
        onClick={onExport}
        className="flex items-center"
      >
        <FileDown className="mr-2 h-4 w-4" />
        导出Excel
      </Button>
    </div>
  );
}