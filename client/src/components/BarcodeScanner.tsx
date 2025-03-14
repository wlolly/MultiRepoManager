import React, { useState, useRef, useEffect } from "react";
import { useTranslation } from "react-i18next";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Scan } from "lucide-react";

export interface BarcodeScannerProps {
  onBarcodeScanned?: (barcode: string) => void;
  onCodeDetected?: (barcode: string) => void;
  label?: string;
  placeholder?: string;
  initialValue?: string;
  uniqueCodeMode?: boolean;
}

export function BarcodeScanner({ 
  onBarcodeScanned, 
  onCodeDetected,
  label,
  placeholder,
  initialValue,
  uniqueCodeMode
}: BarcodeScannerProps) {
  const { t } = useTranslation();
  const [barcode, setBarcode] = useState<string>(initialValue || "");
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [scanning, setScanning] = useState<boolean>(false);
  
  // 使用摄像头扫描条形码
  const startScanning = async () => {
    setScanning(true);
    
    try {
      if (videoRef.current && navigator.mediaDevices?.getUserMedia) {
        const stream = await navigator.mediaDevices.getUserMedia({ 
          video: { facingMode: 'environment' } 
        });
        videoRef.current.srcObject = stream;
        videoRef.current.play();
      }
    } catch (error) {
      console.error("Error accessing camera:", error);
      setScanning(false);
    }
  };
  
  // 停止扫描
  const stopScanning = () => {
    if (videoRef.current && videoRef.current.srcObject) {
      const stream = videoRef.current.srcObject as MediaStream;
      const tracks = stream.getTracks();
      
      tracks.forEach(track => track.stop());
      videoRef.current.srcObject = null;
    }
    
    setScanning(false);
  };
  
  // 手动处理表单输入
  const handleManualInput = (e: React.FormEvent) => {
    e.preventDefault();
    if (barcode) {
      if (onBarcodeScanned) {
        onBarcodeScanned(barcode);
      }
      if (onCodeDetected) {
        onCodeDetected(barcode);
      }
      setBarcode("");
    }
  };
  
  // 扫码处理函数
  const processCodeResult = (code: string) => {
    if (code) {
      // 根据模式处理条码
      if (uniqueCodeMode) {
        // 在唯一码模式下，仅处理数字，最多5位
        const numericCode = code.replace(/\D/g, '').substring(0, 5);
        if (numericCode) {
          if (onBarcodeScanned) {
            onBarcodeScanned(numericCode);
          }
          if (onCodeDetected) {
            onCodeDetected(numericCode);
          }
        }
      } else {
        // 普通条码模式，保持原样
        if (onBarcodeScanned) {
          onBarcodeScanned(code);
        }
        if (onCodeDetected) {
          onCodeDetected(code);
        }
      }
      
      stopScanning();
    }
  };

  // 视频帧处理
  useEffect(() => {
    if (!scanning || !videoRef.current || !canvasRef.current) return;

    let animationFrameId: number;
    
    // 检测条码的函数
    const detect = () => {
      if (videoRef.current && videoRef.current.readyState === videoRef.current.HAVE_ENOUGH_DATA && canvasRef.current) {
        const video = videoRef.current;
        const canvas = canvasRef.current;
        const ctx = canvas.getContext('2d');
        
        if (ctx) {
          // 设置canvas尺寸与视频匹配
          canvas.width = video.videoWidth;
          canvas.height = video.videoHeight;
          
          // 绘制视频帧到canvas
          ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
          
          try {
            // 这里应该使用实际的条形码库进行检测
            // 如jsQR或zxing等，这里只是模拟
            // 在实际项目中，应该集成真实的条形码扫描库
            // const code = jsQR(imageData.data, canvas.width, canvas.height);
            
            // 模拟检测到条形码，真实情况下应该用库来实现
            const simulateCodeDetection = () => {
              // 模拟场景: 如果有初始值且扫描了至少2秒，则返回它作为结果
              if (initialValue && Date.now() - scanStartTime > 2000) {
                return initialValue;
              }
              return null;
            };
            
            const detectedCode = simulateCodeDetection();
            if (detectedCode) {
              processCodeResult(detectedCode);
              return; // 检测到后停止循环
            }
          } catch (error) {
            console.error("Error detecting barcode:", error);
          }
        }
      }
      
      // 继续下一帧检测
      animationFrameId = requestAnimationFrame(detect);
    };
    
    // 开始扫描的时间戳，用于模拟
    const scanStartTime = Date.now();
    
    // 启动检测循环
    animationFrameId = requestAnimationFrame(detect);
    
    // 清理函数
    return () => {
      if (animationFrameId) {
        cancelAnimationFrame(animationFrameId);
      }
    };
  }, [scanning, onBarcodeScanned, onCodeDetected, initialValue, uniqueCodeMode]);

  // 清理事件
  useEffect(() => {
    return () => {
      stopScanning();
    };
  }, []);
  
  return (
    <div className="space-y-4">
      {label && <div className="mb-2 font-medium">{label}</div>}
      {scanning ? (
        <>
          <div className="relative">
            <video 
              ref={videoRef} 
              className="w-full h-64 bg-black object-cover"
              playsInline
            />
            <canvas ref={canvasRef} className="hidden" />
            <div className="absolute inset-0 border-2 border-red-500 pointer-events-none" />
          </div>
          <Button onClick={stopScanning} variant="outline" className="w-full">
            {t('stop_scanning')}
          </Button>
        </>
      ) : (
        <>
          <form onSubmit={handleManualInput} className="flex gap-2">
            <Input
              type="text"
              value={barcode}
              onChange={(e) => setBarcode(e.target.value)}
              placeholder={placeholder || t('enter_barcode')}
              className="flex-1"
            />
            <Button type="submit">{t('submit')}</Button>
          </form>
          <Button onClick={startScanning} type="button" className="w-full">
            <Scan className="mr-2 h-4 w-4" />
            {t('scan_with_camera')}
          </Button>
        </>
      )}
    </div>
  );
}