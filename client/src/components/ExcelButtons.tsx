import { FileSpreadsheet, FileDown, FileUp } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useTranslation } from "react-i18next";

interface ExcelButtonsProps {
  onDownloadTemplate: () => void;
  onImport: () => void;
  onExport: () => void;
  className?: string;
  size?: "default" | "sm" | "lg" | "icon";
  tooltips?: {
    template?: string;
    import?: string;
    export?: string;
  };
}

export function ExcelButtons({ 
  onDownloadTemplate, 
  onImport, 
  onExport, 
  className = "",
  size = "default",
  tooltips 
}: ExcelButtonsProps) {
  const { t } = useTranslation();
  
  return (
    <div className={`flex gap-2 ${className}`}>
      <Button
        variant="outline"
        size={size}
        onClick={onDownloadTemplate}
        className="flex items-center"
        title={tooltips?.template || t("download_template_tooltip")}
      >
        <FileSpreadsheet className="mr-2 h-4 w-4" />
        {t("download_template")}
      </Button>
      <Button
        variant="outline"
        size={size}
        onClick={onImport}
        className="flex items-center"
        title={tooltips?.import || t("import_excel_tooltip")}
      >
        <FileUp className="mr-2 h-4 w-4" />
        {t("import_excel")}
      </Button>
      <Button
        variant="outline"
        size={size}
        onClick={onExport}
        className="flex items-center"
        title={tooltips?.export || t("export_excel_tooltip")}
      >
        <FileDown className="mr-2 h-4 w-4" />
        {t("export_excel")}
      </Button>
    </div>
  );
}

/**
 * 直接使用按钮组件的简化版Excel按钮组
 * 为解决仓库调拨页面按钮不显示问题
 */
export function SimpleExcelButtons({
  onDownloadTemplate,
  onImport,
  onExport,
  tooltips
}: {
  onDownloadTemplate: () => void;
  onImport: () => void;
  onExport: () => void;
  tooltips?: {
    template?: string;
    import?: string;
    export?: string;
  };
}) {
  const { t } = useTranslation();
  
  return (
    <div className="flex gap-2">
      <Button
        variant="outline"
        size="default"
        onClick={onDownloadTemplate}
        className="flex items-center"
        title={tooltips?.template}
      >
        <FileSpreadsheet className="mr-2 h-4 w-4" />
        {t("download_template")}
      </Button>
      <Button
        variant="outline"
        size="default"
        onClick={onImport}
        className="flex items-center"
        title={tooltips?.import}
      >
        <FileUp className="mr-2 h-4 w-4" />
        {t("import_excel")}
      </Button>
      <Button
        variant="outline"
        size="default"
        onClick={onExport}
        className="flex items-center"
        title={tooltips?.export}
      >
        <FileDown className="mr-2 h-4 w-4" />
        {t("export_excel")}
      </Button>
    </div>
  );
}