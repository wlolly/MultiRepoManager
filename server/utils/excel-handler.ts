/**
 * Excel处理工具
 * 处理仓库调拨单的Excel导入导出
 */
import * as XLSX from 'xlsx';
import path from 'path';
import fs from 'fs';
import { WarehouseTransfer, Product, Warehouse } from '@shared/schema';

// 确保上传目录存在
const TEMPLATE_DIR = './public/templates';
const EXPORT_DIR = './public/exports';

// 确保目录存在
if (!fs.existsSync(TEMPLATE_DIR)) {
  fs.mkdirSync(TEMPLATE_DIR, { recursive: true });
}
if (!fs.existsSync(EXPORT_DIR)) {
  fs.mkdirSync(EXPORT_DIR, { recursive: true });
}

/**
 * 创建仓库调拨单导入模板
 * @returns 模板文件路径
 */
export function createTransferImportTemplate(): string {
  // 表头定义 (中英文对照，方便用户理解)
  const headers = [
    '唯一码(Unique Code)', 
    '产品ID(Product ID)', 
    '产品名称(Product Name)', 
    '数量(Quantity)', 
    '件数(Package Count)', 
    '重量kg(Weight)', 
    '体积m³(Volume)',
    '备注(Remark)'
  ];
  
  // 示例数据
  const exampleData = [
    ['11111', '1', '高精度工业传感器', '10', '2', '5.5', '0.03', '示例数据，导入时请删除'],
    ['22222', '2', '工业电机', '5', '1', '15.0', '0.12', '示例数据，导入时请删除'],
    ['', '3', '电子元件套装', '50', '5', '2.5', '0.01', '示例数据，导入时请删除'],
    ['', '', '请在此处填写您的数据...', '', '', '', '', '']
  ];
  
  // 创建工作簿和工作表
  const wb = XLSX.utils.book_new();
  const ws = XLSX.utils.aoa_to_sheet([headers].concat(exampleData));
  
  // 设置列宽
  const colWidths = [10, 10, 30, 10, 10, 10, 10, 30];
  ws['!cols'] = colWidths.map(width => ({ width }));
  
  // 添加工作表到工作簿
  XLSX.utils.book_append_sheet(wb, ws, '仓库调拨单模板');
  
  // 添加说明工作表
  const instructionsData = [
    ['仓库调拨单导入说明'],
    [''],
    ['1. 请不要修改表格的结构或删除标题行'],
    ['2. 唯一码(Unique Code): 可选，产品的唯一标识码，1-5位数字'],
    ['3. 产品ID(Product ID): 必填，系统中的产品ID'],
    ['4. 产品名称(Product Name): 必填，请确保与系统中的产品名称匹配'],
    ['5. 数量(Quantity): 必填，调拨的产品数量，必须为正整数'],
    ['6. 件数(Package Count): 必填，调拨的包装件数，必须为正整数'],
    ['7. 重量kg(Weight): 选填，调拨商品的总重量，单位为千克'],
    ['8. 体积m³(Volume): 选填，调拨商品的总体积，单位为立方米'],
    ['9. 备注(Remark): 选填，关于此调拨项的备注信息'],
    [''],
    ['注意: 导入前请先删除示例数据行'],
    [''],
    ['若有任何问题，请联系系统管理员']
  ];
  
  const instructionsWs = XLSX.utils.aoa_to_sheet(instructionsData);
  instructionsWs['!cols'] = [{ width: 60 }];
  XLSX.utils.book_append_sheet(wb, instructionsWs, '导入说明');
  
  // 保存工作簿到文件
  const templateFilename = 'warehouse_transfer_template.xlsx';
  const templatePath = path.join(TEMPLATE_DIR, templateFilename);
  XLSX.writeFile(wb, templatePath);
  
  return templatePath;
}

/**
 * 解析导入的Excel文件
 * @param filePath Excel文件路径
 * @returns 解析后的调拨单项目数据
 */
export function parseTransferImportFile(filePath: string): {
  items: Array<{
    uniqueCode?: string;
    productId?: number;
    productName?: string;
    quantity: number;
    packageCount: number;
    weight?: number;
    volume?: number;
    remark?: string;
  }>;
  errors: string[];
} {
  try {
    // 读取Excel文件
    const workbook = XLSX.readFile(filePath);
    const sheetName = workbook.SheetNames[0];
    const worksheet = workbook.Sheets[sheetName];
    
    // 转换为JSON
    const rawData = XLSX.utils.sheet_to_json(worksheet);
    
    const items: Array<{
      uniqueCode?: string;
      productId?: number;
      productName?: string;
      quantity: number;
      packageCount: number;
      weight?: number;
      volume?: number;
      remark?: string;
    }> = [];
    
    const errors: string[] = [];
    let rowIndex = 2; // 开始于第2行，因为第1行是表头
    
    // 处理每一行数据
    for (const row of rawData) {
      const rowObj = row as Record<string, any>;
      rowIndex++;
      
      // 提取字段(处理可能的中英文字段名)
      const uniqueCode = rowObj['唯一码(Unique Code)'] || rowObj['唯一码'] || rowObj['Unique Code'] || '';
      const productId = rowObj['产品ID(Product ID)'] || rowObj['产品ID'] || rowObj['Product ID'] || '';
      const productName = rowObj['产品名称(Product Name)'] || rowObj['产品名称'] || rowObj['Product Name'] || '';
      const quantity = rowObj['数量(Quantity)'] || rowObj['数量'] || rowObj['Quantity'] || '';
      const packageCount = rowObj['件数(Package Count)'] || rowObj['件数'] || rowObj['Package Count'] || '';
      const weight = rowObj['重量kg(Weight)'] || rowObj['重量'] || rowObj['Weight'] || '';
      const volume = rowObj['体积m³(Volume)'] || rowObj['体积'] || rowObj['Volume'] || '';
      const remark = rowObj['备注(Remark)'] || rowObj['备注'] || rowObj['Remark'] || '';
      
      // 数据验证
      if (!productId && !productName) {
        if (Object.keys(rowObj).some(key => rowObj[key])) {
          errors.push(`第${rowIndex}行: 产品ID和产品名称不能同时为空`);
        }
        continue; // 跳过空行或无有效数据的行
      }
      
      if (!quantity) {
        errors.push(`第${rowIndex}行: 数量不能为空`);
        continue;
      }
      
      const parsedQuantity = parseInt(String(quantity));
      if (isNaN(parsedQuantity) || parsedQuantity <= 0) {
        errors.push(`第${rowIndex}行: 数量必须为正整数`);
        continue;
      }
      
      const parsedPackageCount = parseInt(String(packageCount)) || parsedQuantity;
      if (isNaN(parsedPackageCount) || parsedPackageCount <= 0) {
        errors.push(`第${rowIndex}行: 件数必须为正整数`);
        continue;
      }
      
      const parsedWeight = weight ? parseFloat(String(weight)) : undefined;
      if (weight && (isNaN(parsedWeight!) || parsedWeight! < 0)) {
        errors.push(`第${rowIndex}行: 重量必须为非负数`);
        continue;
      }
      
      const parsedVolume = volume ? parseFloat(String(volume)) : undefined;
      if (volume && (isNaN(parsedVolume!) || parsedVolume! < 0)) {
        errors.push(`第${rowIndex}行: 体积必须为非负数`);
        continue;
      }
      
      // 唯一码验证 (如果提供)
      if (uniqueCode && !/^\d{1,5}$/.test(String(uniqueCode))) {
        errors.push(`第${rowIndex}行: 唯一码必须为1-5位数字`);
      }
      
      // 添加到待处理项
      items.push({
        uniqueCode: uniqueCode ? String(uniqueCode) : undefined,
        productId: productId ? parseInt(String(productId)) : undefined,
        productName: productName ? String(productName) : undefined,
        quantity: parsedQuantity,
        packageCount: parsedPackageCount,
        weight: parsedWeight,
        volume: parsedVolume,
        remark: remark ? String(remark) : undefined
      });
    }
    
    return { items, errors };
  } catch (error) {
    return { 
      items: [], 
      errors: [`Excel文件解析失败: ${(error as Error).message}`] 
    };
  }
}

/**
 * 导出多个调拨单到Excel文件
 * @param transfers 调拨单数据列表
 * @returns 导出文件路径
 */
export function exportMultipleTransfersToExcel(transfers: Array<{
  id: number;
  referenceNumber: string;
  sourceWarehouseId: number;
  targetWarehouseId: number;
  createdAt: string;
  status: string;
  totalItems: number;
  totalWeight: number;
  totalVolume: number;
  totalPackages: number;
  notes?: string;
  sourceWarehouse: {
    id: number;
    name: string;
    location: string;
  };
  targetWarehouse: {
    id: number;
    name: string;
    location: string;
  };
  creator?: {
    id: number;
    username: string;
    fullName?: string;
  };
}>): string {
  // 创建工作簿
  const wb = XLSX.utils.book_new();
  
  // 准备数据
  const headers = [
    '调拨单号', '源仓库', '目标仓库', '状态', '总数量', '总件数', '总重量(kg)', '总体积(m³)', '创建日期', '创建人', '备注'
  ];
  
  const data = transfers.map(transfer => [
    transfer.referenceNumber,
    transfer.sourceWarehouse.name,
    transfer.targetWarehouse.name,
    transfer.status,
    transfer.totalItems,
    transfer.totalPackages,
    transfer.totalWeight,
    transfer.totalVolume,
    new Date(transfer.createdAt).toLocaleString('zh-CN'),
    transfer.creator?.fullName || transfer.creator?.username || '',
    transfer.notes || ''
  ]);
  
  // 创建工作表
  const ws = XLSX.utils.aoa_to_sheet([headers, ...data]);
  
  // 设置列宽
  ws['!cols'] = [
    { width: 15 }, { width: 15 }, { width: 15 }, { width: 10 }, 
    { width: 8 }, { width: 8 }, { width: 10 }, { width: 10 }, 
    { width: 20 }, { width: 15 }, { width: 30 }
  ];
  
  // 添加工作表到工作簿
  XLSX.utils.book_append_sheet(wb, ws, '调拨单列表');
  
  // 保存工作簿到文件
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  const filename = `transfers_export_${timestamp}.xlsx`;
  const filePath = path.join(EXPORT_DIR, filename);
  XLSX.writeFile(wb, filePath);
  
  return filePath;
}

/**
 * 创建仓库调拨单导出文件 (1C财务系统兼容格式)
 * @param transfer 调拨单数据
 * @param items 调拨单项目
 * @param sourceWarehouse 源仓库
 * @param targetWarehouse 目标仓库
 * @param products 商品数据
 * @returns 导出文件路径
 */
export function exportTransferToExcel(
  transfer: WarehouseTransfer,
  items: Array<{
    productId: number;
    uniqueCode?: string;
    quantity: number;
    packageCount: number;
    weight: number | string;
    volume: number | string;
    remark?: string;
    product?: {
      name: string;
      barcode: string;
      category?: string;
    }
  }>,
  sourceWarehouse: Warehouse,
  targetWarehouse: Warehouse,
  products: Record<number, Product>
): string {
  // 创建工作簿
  const wb = XLSX.utils.book_new();
  
  // 1. 调拨单基本信息工作表
  const headerData = [
    ['仓库调拨单', '', '', '', '', '', ''],
    ['', '', '', '', '', '', ''],
    ['调拨单号', transfer.referenceNumber, '', '创建日期', new Date(transfer.createdAt).toLocaleString('zh-CN'), '', ''],
    ['源仓库', sourceWarehouse.name, '', '目标仓库', targetWarehouse.name, '', ''],
    ['总数量', transfer.totalItems, '', '总件数', transfer.totalPackages, '', ''],
    ['总重量(kg)', transfer.totalWeight, '', '总体积(m³)', transfer.totalVolume, '', ''],
    ['状态', transfer.status, '', '备注', transfer.notes || '', '', ''],
    ['', '', '', '', '', '', ''],
  ];
  
  // 2. 调拨商品明细
  const itemsHeader = [
    ['序号', '唯一码', '产品ID', '产品名称', '产品条码', '产品分类', '数量', '件数', '重量(kg)', '体积(m³)', '备注']
  ];
  
  const itemsData = items.map((item, index) => {
    // 获取产品信息
    const product = products[item.productId] || item.product || { name: '未知产品', barcode: '' };
    
    return [
      index + 1,
      item.uniqueCode || '',
      item.productId,
      product.name,
      product.barcode,
      product.category || '',
      item.quantity,
      item.packageCount,
      typeof item.weight === 'string' ? parseFloat(item.weight) : item.weight,
      typeof item.volume === 'string' ? parseFloat(item.volume) : item.volume,
      item.remark || ''
    ];
  });
  
  // 3. 为1C财务系统添加特定格式的元数据
  const metaData = [
    ['#1C:TRANSFER', '', '', ''], // 1C标记，表明这是调拨数据
    ['VERSION', '1.0', '', ''], // 版本号
    ['SOURCE_WAREHOUSE', sourceWarehouse.id, sourceWarehouse.name, ''],
    ['TARGET_WAREHOUSE', targetWarehouse.id, targetWarehouse.name, ''],
    ['DOCUMENT_NUMBER', transfer.referenceNumber, '', ''],
    ['DOCUMENT_DATE', new Date(transfer.createdAt).toISOString().split('T')[0], '', ''],
    ['TOTAL_ITEMS', transfer.totalItems, '', ''],
    ['TOTAL_PACKAGES', transfer.totalPackages, '', ''],
    ['TOTAL_WEIGHT', transfer.totalWeight, '', ''],
    ['TOTAL_VOLUME', transfer.totalVolume, '', ''],
    ['STATUS', transfer.status, '', ''],
    ['', '', '', ''],
    ['#ITEMS_START', '', '', ''], // 项目数据起始标记
  ];
  
  // 4. 合并所有数据
  const allData = [
    ...headerData,
    ...itemsHeader,
    ...itemsData,
    ['', '', '', '', '', '', '', '', '', '', ''],
    ...metaData,
    ...itemsData.map(item => ['ITEM', ...item]),
    ['#ITEMS_END', '', '', ''], // 项目数据结束标记
  ];
  
  // 5. 创建工作表并设置列宽
  const ws = XLSX.utils.aoa_to_sheet(allData);
  ws['!cols'] = [
    { width: 8 }, { width: 10 }, { width: 10 }, { width: 30 }, 
    { width: 15 }, { width: 15 }, { width: 8 }, { width: 8 }, 
    { width: 10 }, { width: 10 }, { width: 25 }
  ];
  
  // 6. 添加工作表到工作簿
  XLSX.utils.book_append_sheet(wb, ws, '仓库调拨单');
  
  // 7. 保存工作簿到文件
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  const filename = `transfer_${transfer.referenceNumber}_${timestamp}.xlsx`;
  const filePath = path.join(EXPORT_DIR, filename);
  XLSX.writeFile(wb, filePath);
  
  return filePath;
}