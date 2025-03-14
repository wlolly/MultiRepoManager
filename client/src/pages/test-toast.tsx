import { useState } from "react";
import { useTranslation } from "react-i18next";
import toast from "../lib/toast";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export default function TestToast() {
  const { t } = useTranslation();
  const [count, setCount] = useState(0);

  // 测试成功消息
  const showSuccessToast = () => {
    toast.success(t("操作成功完成"));
    setCount(prev => prev + 1);
  };

  // 测试错误消息
  const showErrorToast = () => {
    toast.error(t("操作失败，请重试"));
    setCount(prev => prev + 1);
  };

  // 测试警告消息
  const showWarningToast = () => {
    toast.warning(t("请注意，这是一个警告信息"));
    setCount(prev => prev + 1);
  };

  // 测试一般提示消息
  const showInfoToast = () => {
    toast.info(t("这是一条提示信息"));
    setCount(prev => prev + 1);
  };

  // 测试带参数的消息
  const showParameterizedToast = () => {
    toast.info(t("您已点击按钮 {{count}} 次", { count }));
    setCount(prev => prev + 1);
  };

  return (
    <div className="container mx-auto p-4">
      <h1 className="text-2xl font-bold mb-6">Toast通知系统测试</h1>
      
      <Card className="mb-6">
        <CardHeader>
          <CardTitle>测试各种类型的Toast消息</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-3">
            <Button onClick={showSuccessToast} variant="default">
              显示成功消息
            </Button>
            <Button onClick={showErrorToast} variant="destructive">
              显示错误消息
            </Button>
            <Button onClick={showWarningToast} variant="outline">
              显示警告消息
            </Button>
            <Button onClick={showInfoToast} variant="secondary">
              显示提示消息
            </Button>
            <Button onClick={showParameterizedToast} variant="default">
              带参数的消息 ({count})
            </Button>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Toast API使用说明</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="bg-gray-50 p-4 rounded border">
              <h3 className="text-md font-semibold mb-2">推荐用法</h3>
              <pre className="bg-slate-100 p-2 rounded text-sm overflow-auto">
                {`// 1. 导入toast
import toast from "../lib/toast";
import { useTranslation } from "react-i18next";

export default function MyComponent() {
  const { t } = useTranslation();
  
  // 2. 直接调用toast方法
  const handleAction = () => {
    try {
      // 执行某些操作...
      toast.success(t("操作成功"));
    } catch (error) {
      toast.error(t("操作失败"));
    }
  };
}`}
              </pre>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}