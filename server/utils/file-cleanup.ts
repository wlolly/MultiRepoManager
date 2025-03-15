/**
 * 文件清理工具
 * 用于管理系统中的临时文件，确保不占用过多磁盘空间
 */

import fs from 'fs';
import path from 'path';

/**
 * 清理指定文件
 * @param filePath 要清理的文件路径
 */
export function cleanupFile(filePath: string): void {
  try {
    if (fs.existsSync(filePath)) {
      fs.unlinkSync(filePath);
      console.log(`临时文件已清理: ${filePath}`);
    }
  } catch (error) {
    console.error(`清理文件失败 ${filePath}:`, error);
  }
}

/**
 * 为Express响应下载添加文件清理功能
 * 在文件下载完成后自动清理临时文件
 * 
 * @param res Express响应对象
 * @param filePath 文件路径
 * @param filename 下载时显示的文件名称，可选
 */
export function downloadWithCleanup(res: any, filePath: string, filename?: string): void {
  const downloadName = filename || path.basename(filePath);
  
  // 发送文件并在完成后清理
  res.download(filePath, downloadName, (err: any) => {
    if (err) {
      console.error(`文件下载错误: ${downloadName}`, err);
    }
    
    // 无论成功或失败，都尝试删除临时文件
    cleanupFile(filePath);
  });
}

/**
 * 清理指定目录中超过指定时间的文件
 * @param directory 目录路径
 * @param maxAgeHours 最大保留时间(小时)
 * @param filePattern 文件名匹配模式(正则表达式)
 * @returns 清理的文件数量
 */
export function cleanupOldFiles(
  directory: string,
  maxAgeHours: number = 24,
  filePattern: RegExp = /.*\.(xlsx|csv|pdf|zip)$/
): number {
  try {
    // 确保目录存在
    if (!fs.existsSync(directory)) {
      console.log(`目录不存在: ${directory}`);
      return 0;
    }
    
    const files = fs.readdirSync(directory);
    const now = new Date().getTime();
    const maxAgeMs = maxAgeHours * 60 * 60 * 1000;
    let cleanedCount = 0;
    
    files.forEach(file => {
      // 跳过不匹配模式的文件
      if (!filePattern.test(file)) return;
      
      const filePath = path.join(directory, file);
      const stats = fs.statSync(filePath);
      
      // 计算文件年龄
      const fileAge = now - stats.mtime.getTime();
      
      // 如果文件超过最大年龄，则删除
      if (fileAge > maxAgeMs) {
        cleanupFile(filePath);
        cleanedCount++;
      }
    });
    
    return cleanedCount;
  } catch (error) {
    console.error(`清理旧文件失败:`, error);
    return 0;
  }
}

/**
 * 定期清理导出目录中的旧文件
 * @param exportDir 导出目录路径
 * @param intervalHours 清理间隔(小时)
 */
export function scheduleCleanup(exportDir: string = path.join(process.cwd(), 'public', 'exports'), intervalHours: number = 24): void {
  // 立即执行一次清理
  const cleanedCount = cleanupOldFiles(exportDir);
  console.log(`初始清理完成，删除了 ${cleanedCount} 个过期文件`);
  
  // 设置定期清理
  const intervalMs = intervalHours * 60 * 60 * 1000;
  setInterval(() => {
    const count = cleanupOldFiles(exportDir);
    if (count > 0) {
      console.log(`定期清理完成，删除了 ${count} 个过期文件`);
    }
  }, intervalMs);
}