import { useState } from "react";
import { useLocation } from "wouter";
import { useTranslation } from "react-i18next";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";

export default function DebugOutboundOrder() {
  const { t } = useTranslation();
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const [orderNumber, setOrderNumber] = useState(`OUT-${Date.now()}`);
  const [warehouseId, setWarehouseId] = useState("1");
  const [isLoading, setIsLoading] = useState(false);
  const [response, setResponse] = useState("");
  
  // 极简版出库单创建 - 用于调试API
  const handleSubmit = async () => {
    setIsLoading(true);
    setResponse("");
    
    try {
      // 创建最小化的出库单，仅包含必要字段
      const payload = {
        orderNumber,
        warehouseId: parseInt(warehouseId),
        totalWeight: "0",
        totalVolume: "0",
        status: "pending",
        orderType: "sale",
        destinationType: "customer",
        notes: "Debug order",
        items: []
      };
      
      console.log("发送数据:", JSON.stringify(payload, null, 2));
      
      const res = await fetch("/api/outbound-orders", {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify(payload),
        credentials: "include"
      });
      
      const text = await res.text();
      setResponse(`状态: ${res.status}\n\n响应:\n${text}`);
      
      if (res.ok) {
        const data = JSON.parse(text);
        toast({
          title: "成功",
          description: `出库单已创建，ID: ${data.id}`,
        });
      } else {
        toast({
          variant: "destructive",
          title: "错误",
          description: `创建失败: ${res.status}`,
        });
      }
    } catch (error: any) {
      console.error("错误:", error);
      setResponse(`错误:\n${error.message}`);
      
      toast({
        variant: "destructive",
        title: "错误",
        description: error.message,
      });
    } finally {
      setIsLoading(false);
    }
  };
  
  return (
    <div className="container mx-auto py-6">
      <Card className="max-w-2xl mx-auto">
        <CardHeader>
          <CardTitle>调试出库单创建</CardTitle>
          <CardDescription>简化的接口用于测试API</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="space-y-2">
            <Label htmlFor="orderNumber">订单编号</Label>
            <Input 
              id="orderNumber"
              value={orderNumber}
              onChange={(e) => setOrderNumber(e.target.value)}
            />
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="warehouseId">仓库ID</Label>
            <Input 
              id="warehouseId"
              value={warehouseId}
              onChange={(e) => setWarehouseId(e.target.value)}
            />
          </div>
          
          <Button 
            type="button" 
            onClick={handleSubmit}
            disabled={isLoading}
            className="w-full"
          >
            {isLoading ? "处理中..." : "创建出库单"}
          </Button>
          
          {response && (
            <div className="p-4 bg-gray-100 rounded-md overflow-auto max-h-[400px]">
              <pre className="text-sm whitespace-pre-wrap">{response}</pre>
            </div>
          )}
          
          <div className="flex justify-end">
            <Button 
              variant="outline" 
              onClick={() => setLocation("/outbound-orders")}
            >
              返回出库单列表
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}