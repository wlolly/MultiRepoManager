import React, { useState, useRef, useEffect } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { ScanLine, QrCode, Edit } from "lucide-react";

interface BarcodeScannerProps {
  onCodeDetected: (code: string) => void;
  label?: string;
  placeholder?: string;
  initialValue?: string;
  uniqueCodeMode?: boolean;
}

export function BarcodeScanner({
  onCodeDetected,
  label = "扫描或输入条码",
  placeholder = "请扫描或手动输入条码",
  initialValue = "",
  uniqueCodeMode = false
}: BarcodeScannerProps) {
  const [inputValue, setInputValue] = useState(initialValue);
  const [isScanning, setIsScanning] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();

  // 当扫描设备输入数据时，会快速输入完整的条码信息
  // 通常情况下，手动输入的速度不会那么快
  // 所以我们可以用输入速度来判断是否为扫描仪设备
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);
  const keypressTimesRef = useRef<number[]>([]);

  useEffect(() => {
    if (isScanning) {
      inputRef.current?.focus();
    }
  }, [isScanning]);

  // 判断是否是扫描枪输入
  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    try {
      const now = Date.now();
      // 安全地处理按键时间数组
      if (!Array.isArray(keypressTimesRef.current)) {
        keypressTimesRef.current = [];
      }
      
      keypressTimesRef.current.push(now);
      
      // 只保留最近的10次按键时间
      if (keypressTimesRef.current.length > 10) {
        keypressTimesRef.current.shift();
      }
      
      // 如果是唯一码模式，且输入了非数字字符，则不接受
      if (uniqueCodeMode && e.key !== 'Enter' && e.key !== 'Backspace' && e.key !== 'Tab' && 
          e.key !== 'ArrowLeft' && e.key !== 'ArrowRight' && (e.key < '0' || e.key > '9')) {
        e.preventDefault();
        return;
      }
      
      // 如果是唯一码模式，限制最大长度为5位数字
      if (uniqueCodeMode && /^\d$/.test(e.key) && inputRef.current && inputRef.current.value.length >= 5) {
        e.preventDefault();
        return;
      }
      
      // 如果按下回车键，并且输入速度快，可能是扫描枪
      if (e.key === 'Enter') {
        e.preventDefault();
        
        if (isScanning && inputRef.current && typeof inputRef.current.value === 'string') {
          const isScanner = isLikelyScanner();
          let value = inputRef.current.value.trim();
          
          // 如果是唯一码模式，确保只有数字
          if (uniqueCodeMode) {
            value = value.replace(/\D/g, '');
          }
          
          // 确保不是空值
          if (value) {
            onCodeDetected(value);
            toast({
              title: uniqueCodeMode ? "唯一码已扫描" : "条码已扫描",
              description: value,
            });
            setInputValue(value);
            // 扫描成功后，清空输入框准备下一次扫描
            if (isScanner && inputRef.current) {
              inputRef.current.value = '';
            }
          }
        }
      }
    } catch (error) {
      console.error("处理键盘输入时发生错误:", error);
    }
  };

  // 通过检查按键时间间隔判断是否是扫描枪输入
  const isLikelyScanner = (): boolean => {
    try {
      // 确保times是有效的数组
      const times = Array.isArray(keypressTimesRef.current) ? keypressTimesRef.current : [];
      
      // 至少需要3个按键时间来判断
      if (times.length < 3) return false;
      
      // 计算平均按键间隔
      let totalInterval = 0;
      for (let i = 1; i < times.length; i++) {
        const prev = times[i-1];
        const current = times[i];
        
        // 确保都是数字类型
        if (typeof prev === 'number' && typeof current === 'number') {
          totalInterval += current - prev;
        }
      }
      
      const avgInterval = totalInterval / (times.length - 1);
      
      // 扫描枪通常每次按键间隔在10-30ms之间
      return avgInterval < 50;
    } catch (error) {
      console.error("判断扫描枪输入时发生错误:", error);
      return false;
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    try {
      if (!isScanning) {
        // 如果是唯一码模式，只允许输入数字，并限制长度为1-5位
        if (uniqueCodeMode) {
          // 使用正则表达式匹配非数字字符，并替换为空字符串
          const numericValue = e.target.value.replace(/\D/g, '');
          // 确保唯一码不超过5位数字
          const validValue = numericValue.slice(0, 5);
          setInputValue(validValue);
          // 如果有非数字字符被替换或者超长被截断，更新输入框的值
          if (validValue !== e.target.value) {
            e.target.value = validValue;
          }
        } else {
          setInputValue(e.target.value);
        }
      }
    } catch (error) {
      console.error("处理输入框变化时发生错误:", error);
    }
  };

  const handleSubmit = () => {
    try {
      if (inputValue.trim()) {
        onCodeDetected(inputValue.trim());
        toast({
          title: uniqueCodeMode ? "唯一码已提交" : "条码已提交",
          description: inputValue,
        });
        if (isEditing) {
          setIsEditing(false);
        }
      }
    } catch (error) {
      console.error("提交表单时发生错误:", error);
    }
  };

  const startScanning = () => {
    try {
      setIsScanning(true);
      // 确保初始化为空数组
      keypressTimesRef.current = [];
      if (inputRef.current) {
        inputRef.current.value = '';
        inputRef.current.focus();
      }
      toast({
        title: uniqueCodeMode ? "开始扫描唯一码" : "开始扫描条码",
        description: "请使用扫描枪扫描条码",
      });
    } catch (error) {
      console.error("开始扫描时发生错误:", error);
      setIsScanning(false);
    }
  };

  const stopScanning = () => {
    try {
      setIsScanning(false);
    } catch (error) {
      console.error("停止扫描时发生错误:", error);
    }
  };

  const startEditing = () => {
    try {
      setIsEditing(true);
      setIsScanning(false);
      setTimeout(() => {
        if (inputRef.current) {
          inputRef.current.focus();
        }
      }, 0);
    } catch (error) {
      console.error("开始编辑时发生错误:", error);
      setIsEditing(false);
    }
  };

  return (
    <div className="space-y-2">
      <Label htmlFor="barcode-input">
        {label} {isScanning && <span className="text-blue-500">（扫描中...）</span>}
      </Label>
      <div className="flex items-center gap-2">
        <div className="relative flex-1">
          <Input
            id="barcode-input"
            ref={inputRef}
            type="text"
            placeholder={placeholder}
            value={isScanning || isEditing ? '' : inputValue}
            onChange={handleInputChange}
            onKeyDown={handleKeyDown}
            className="pr-10"
            readOnly={!isEditing && !isScanning}
            maxLength={uniqueCodeMode ? 5 : undefined}
            inputMode={uniqueCodeMode ? "numeric" : "text"}
          />
          {isScanning && (
            <div className="absolute inset-0 pointer-events-none">
              <div className="w-full h-0.5 bg-blue-500 animate-scan"></div>
            </div>
          )}
        </div>
        {isScanning ? (
          <Button variant="outline" onClick={stopScanning}>
            停止扫描
          </Button>
        ) : isEditing ? (
          <Button variant="outline" onClick={handleSubmit}>
            提交
          </Button>
        ) : (
          <>
            <Button variant="outline" onClick={startScanning}>
              <ScanLine className="w-4 h-4 mr-2" />
              扫描
            </Button>
            <Button variant="outline" onClick={startEditing}>
              <Edit className="w-4 h-4 mr-2" />
              编辑
            </Button>
          </>
        )}
      </div>
    </div>
  );
}

export default BarcodeScanner;