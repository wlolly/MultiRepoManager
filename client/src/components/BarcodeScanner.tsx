import React, { useState, useRef, useEffect } from "react";
import { useTranslation } from "react-i18next";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Scan } from "lucide-react";

export interface BarcodeScannerProps {
  onBarcodeScanned?: (barcode: string) => void;
}

export function BarcodeScanner({ onBarcodeScanned }: BarcodeScannerProps) {
  const { t } = useTranslation();
  const [barcode, setBarcode] = useState<string>("");
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
    if (barcode && onBarcodeScanned) {
      onBarcodeScanned(barcode);
      setBarcode("");
    }
  };
  
  // 清理事件
  useEffect(() => {
    return () => {
      stopScanning();
    };
  }, []);
  
  return (
    <div className="space-y-4">
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
              placeholder={t('enter_barcode')}
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