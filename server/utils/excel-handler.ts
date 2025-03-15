/**
 * Excel处理工具
 * 处理仓库调拨单的Excel导入导出
 * 使用ExcelJS库统一处理Excel文件操作
 */
import ExcelJS from 'exceljs';
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
  // 创建新的工作簿
  const workbook = new ExcelJS.Workbook();
  workbook.creator = 'E5系统';
  workbook.lastModifiedBy = 'E5系统';
  workbook.created = new Date();
  workbook.modified = new Date();
  
  // 创建主工作表
  const worksheet = workbook.addWorksheet('仓库调拨单模板');
  
  // 定义列
  worksheet.columns = [
    { header: '唯一码(Unique Code)', key: 'uniqueCode', width: 15 },
    { header: '产品ID(Product ID)', key: 'productId', width: 15 },
    { header: '产品名称(Product Name)', key: 'productName', width: 30 },
    { header: '数量(Quantity)', key: 'quantity', width: 10 },
    { header: '件数(Package Count)', key: 'packageCount', width: 10 },
    { header: '重量kg(Weight)', key: 'weight', width: 10 },
    { header: '体积m³(Volume)', key: 'volume', width: 10 },
    { header: '备注(Remark)', key: 'remark', width: 30 }
  ];
  
  // 设置表头样式
  worksheet.getRow(1).font = { bold: true };
  worksheet.getRow(1).fill = {
    type: 'pattern',
    pattern: 'solid',
    fgColor: { argb: 'FFD9EAD3' }
  };
  
  // 添加示例数据
  const exampleData = [
    {
      uniqueCode: '11111',
      productId: 1,
      productName: '高精度工业传感器',
      quantity: 10,
      packageCount: 2,
      weight: 5.5,
      volume: 0.03,
      remark: '示例数据，导入时请删除'
    },
    {
      uniqueCode: '22222',
      productId: 2,
      productName: '工业电机',
      quantity: 5,
      packageCount: 1,
      weight: 15.0,
      volume: 0.12,
      remark: '示例数据，导入时请删除'
    },
    {
      uniqueCode: '',
      productId: 3,
      productName: '电子元件套装',
      quantity: 50,
      packageCount: 5,
      weight: 2.5,
      volume: 0.01,
      remark: '示例数据，导入时请删除'
    },
    {
      uniqueCode: '',
      productId: '',
      productName: '请在此处填写您的数据...',
      quantity: '',
      packageCount: '',
      weight: '',
      volume: '',
      remark: ''
    }
  ];
  
  // 添加示例数据行
  worksheet.addRows(exampleData);
  
  // 添加行边框
  for (let i = 2; i <= exampleData.length + 1; i++) {
    worksheet.getRow(i).eachCell({ includeEmpty: true }, cell => {
      cell.border = {
        top: { style: 'thin' },
        left: { style: 'thin' },
        bottom: { style: 'thin' },
        right: { style: 'thin' }
      };
    });
  }
  
  // 创建说明工作表
  const instructionSheet = workbook.addWorksheet('导入说明');
  instructionSheet.columns = [
    { header: '', key: 'instruction', width: 80 }
  ];
  
  // 添加说明内容
  const instructions = [
    { instruction: '仓库调拨单导入说明' },
    { instruction: '' },
    { instruction: '1. 请不要修改表格的结构或删除标题行' },
    { instruction: '2. 唯一码(Unique Code): 可选，产品的唯一标识码，1-5位数字' },
    { instruction: '3. 产品ID(Product ID): 必填，系统中的产品ID' },
    { instruction: '4. 产品名称(Product Name): 必填，请确保与系统中的产品名称匹配' },
    { instruction: '5. 数量(Quantity): 必填，调拨的产品数量，必须为正整数' },
    { instruction: '6. 件数(Package Count): 必填，调拨的包装件数，必须为正整数' },
    { instruction: '7. 重量kg(Weight): 选填，调拨商品的总重量，单位为千克' },
    { instruction: '8. 体积m³(Volume): 选填，调拨商品的总体积，单位为立方米' },
    { instruction: '9. 备注(Remark): 选填，关于此调拨项的备注信息' },
    { instruction: '' },
    { instruction: '注意: 导入前请先删除示例数据行' },
    { instruction: '' },
    { instruction: '若有任何问题，请联系系统管理员' }
  ];
  
  // 设置标题样式
  instructionSheet.getRow(1).font = { bold: true, size: 14 };
  
  // 添加说明行
  instructionSheet.addRows(instructions);
  
  // 保存工作簿
  const templateFilename = 'warehouse_transfer_template.xlsx';
  const templatePath = path.join(TEMPLATE_DIR, templateFilename);
  
  try {
    // 写入文件
    workbook.xlsx.writeFile(templatePath)
      .catch(err => {
        console.error('创建调拨单导入模板失败:', err);
      });
    
    return templatePath;
  } catch (err) {
    console.error('创建调拨单导入模板失败:', err);
    throw err;
  }
}

/**
 * 解析导入的Excel文件
 * @param filePath Excel文件路径
 * @param storage 存储接口，用于验证唯一码
 * @returns 解析后的调拨单项目数据
 */
export async function parseTransferImportFile(filePath: string, storage?: any): Promise<{
  items: Array<{
    uniqueCode?: string;
    productId?: number;
    productName?: string;
    quantity: number;
    packageCount: number;
    weight?: number;
    volume?: number;
    remark?: string;
    matched?: boolean; // 标记是否匹配到产品
    matchedProduct?: any; // 匹配到的产品信息
  }>;
  errors: string[];
  warnings: string[]; // 添加警告信息，不阻止导入但需要注意
  matchedCount: number; // 匹配到产品的数量
  unmatchedCount: number; // 未匹配到产品的数量
}> {
  try {
    // 读取Excel文件
    const workbook = new ExcelJS.Workbook();
    await workbook.xlsx.readFile(filePath);
    
    // 获取第一个工作表
    const worksheet = workbook.getWorksheet(1);
    if (!worksheet) {
      return {
        items: [],
        errors: ['工作表不存在'],
        warnings: [],
        matchedCount: 0,
        unmatchedCount: 0
      };
    }
    
    const items: Array<{
      uniqueCode?: string;
      productId?: number;
      productName?: string;
      quantity: number;
      packageCount: number;
      weight?: number;
      volume?: number;
      remark?: string;
      matched?: boolean;
      matchedProduct?: any;
    }> = [];
    
    const errors: string[] = [];
    const warnings: string[] = [];
    
    // 处理每一行数据
    let rowIndex = 1; // 从第1行开始，标题行是第1行
    
    worksheet.eachRow({ includeEmpty: false }, async (row, rowNumber) => {
      // 跳过标题行
      if (rowNumber === 1) return;
      
      rowIndex = rowNumber;
      
      // 获取行数据
      const uniqueCode = String(row.getCell(1).value || '').trim();
      const productId = String(row.getCell(2).value || '').trim();
      const productName = String(row.getCell(3).value || '').trim();
      const quantity = String(row.getCell(4).value || '').trim();
      const packageCount = String(row.getCell(5).value || '').trim();
      const weight = String(row.getCell(6).value || '').trim();
      const volume = String(row.getCell(7).value || '').trim();
      const remark = String(row.getCell(8).value || '').trim();
      
      // 数据验证
      if (!productId && !productName) {
        if (row.values && row.values.some(value => value !== undefined && value !== null && value !== '')) {
          errors.push(`第${rowIndex}行: 产品ID和产品名称不能同时为空`);
        }
        return; // 跳过空行或无有效数据的行
      }
      
      if (!quantity) {
        errors.push(`第${rowIndex}行: 数量不能为空`);
        return;
      }
      
      const parsedQuantity = parseInt(quantity);
      if (isNaN(parsedQuantity) || parsedQuantity <= 0) {
        errors.push(`第${rowIndex}行: 数量必须为正整数`);
        return;
      }
      
      const parsedPackageCount = packageCount ? parseInt(packageCount) : parsedQuantity;
      if (isNaN(parsedPackageCount) || parsedPackageCount <= 0) {
        errors.push(`第${rowIndex}行: 件数必须为正整数`);
        return;
      }
      
      const parsedWeight = weight ? parseFloat(weight) : undefined;
      if (weight && (isNaN(parsedWeight!) || parsedWeight! < 0)) {
        errors.push(`第${rowIndex}行: 重量必须为非负数`);
        return;
      }
      
      const parsedVolume = volume ? parseFloat(volume) : undefined;
      if (volume && (isNaN(parsedVolume!) || parsedVolume! < 0)) {
        errors.push(`第${rowIndex}行: 体积必须为非负数`);
        return;
      }
      
      // 唯一码验证 (如果提供)
      let matched = false;
      let matchedProduct = null;
      
      if (uniqueCode) {
        if (!/^\d{1,5}$/.test(uniqueCode)) {
          errors.push(`第${rowIndex}行: 唯一码必须为1-5位数字`);
        } else if (storage) {
          // 使用存储接口验证唯一码是否有效
          try {
            const product = await storage.getProductByUniqueCode(uniqueCode);
            if (product) {
              matched = true;
              matchedProduct = product;
              // 如果已提供产品名称与匹配到的产品不符，添加警告
              if (productName && product.name !== productName) {
                warnings.push(`第${rowIndex}行: 产品名称与唯一码匹配的产品名称不一致，将使用系统内产品信息`);
              }
            } else {
              errors.push(`第${rowIndex}行: 唯一码 "${uniqueCode}" 在系统中不存在`);
            }
          } catch (err) {
            console.error(`验证唯一码时出错:`, err);
            errors.push(`第${rowIndex}行: 验证唯一码时出错: ${(err as Error).message}`);
          }
        }
      } else {
        // 当没有提供唯一码时添加警告
        warnings.push(`第${rowIndex}行: 未提供唯一码，无法自动匹配产品`);
      }
      
      // 添加到待处理项
      items.push({
        uniqueCode: uniqueCode || undefined,
        productId: productId ? parseInt(productId) : (matchedProduct ? matchedProduct.id : undefined),
        productName: productName || (matchedProduct ? matchedProduct.name : undefined),
        quantity: parsedQuantity,
        packageCount: parsedPackageCount,
        weight: parsedWeight || (matchedProduct ? matchedProduct.singleWeightKg * parsedQuantity : undefined),
        volume: parsedVolume || (matchedProduct ? matchedProduct.singleVolumeM3 * parsedQuantity : undefined),
        remark: remark || undefined,
        matched,
        matchedProduct: matched ? matchedProduct : undefined
      });
    });
    
    // 等待所有异步验证完成
    await Promise.all(items.map(async (item) => {
      // 如果已经有唯一码匹配，则无需进一步验证
      if (item.matched) return;
      
      // 如果有产品ID但没有唯一码，尝试通过ID查找产品
      if (item.productId && storage) {
        try {
          const product = await storage.getProduct(item.productId);
          if (product) {
            item.matched = true;
            item.matchedProduct = product;
            if (item.productName && product.name !== item.productName) {
              warnings.push(`产品ID ${item.productId}: 产品名称不匹配，将使用系统内产品信息`);
            }
          }
        } catch (err) {
          console.error(`查找产品ID时出错:`, err);
        }
      }
    }));
    
    // 统计匹配和未匹配的项目数量
    const matchedCount = items.filter(item => item.matched).length;
    const unmatchedCount = items.length - matchedCount;
    
    return { 
      items, 
      errors, 
      warnings,
      matchedCount,
      unmatchedCount
    };
  } catch (error) {
    return { 
      items: [], 
      errors: [`Excel文件解析失败: ${(error as Error).message}`],
      warnings: [],
      matchedCount: 0,
      unmatchedCount: 0
    };
  }
}

/**
 * 导出多个调拨单到Excel文件
 * @param transfers 调拨单数据列表
 * @returns 导出文件路径
 */
export async function exportMultipleTransfersToExcel(transfers: Array<{
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
}>): Promise<string> {
  // 创建新的工作簿
  const workbook = new ExcelJS.Workbook();
  workbook.creator = 'E5系统';
  workbook.lastModifiedBy = 'E5系统';
  workbook.created = new Date();
  workbook.modified = new Date();
  
  // 创建工作表
  const worksheet = workbook.addWorksheet('调拨单列表');
  
  // 定义列
  worksheet.columns = [
    { header: '调拨单号', key: 'referenceNumber', width: 15 },
    { header: '源仓库', key: 'sourceWarehouse', width: 15 },
    { header: '目标仓库', key: 'targetWarehouse', width: 15 },
    { header: '状态', key: 'status', width: 10 },
    { header: '总数量', key: 'totalItems', width: 8 },
    { header: '总件数', key: 'totalPackages', width: 8 },
    { header: '总重量(kg)', key: 'totalWeight', width: 10 },
    { header: '总体积(m³)', key: 'totalVolume', width: 10 },
    { header: '创建日期', key: 'createdAt', width: 20 },
    { header: '创建人', key: 'creator', width: 15 },
    { header: '备注', key: 'notes', width: 30 }
  ];
  
  // 设置表头样式
  worksheet.getRow(1).font = { bold: true };
  worksheet.getRow(1).fill = {
    type: 'pattern',
    pattern: 'solid',
    fgColor: { argb: 'FFD9EAD3' }
  };
  
  // 添加数据
  transfers.forEach(transfer => {
    worksheet.addRow({
      referenceNumber: transfer.referenceNumber,
      sourceWarehouse: transfer.sourceWarehouse.name,
      targetWarehouse: transfer.targetWarehouse.name,
      status: transfer.status,
      totalItems: transfer.totalItems,
      totalPackages: transfer.totalPackages,
      totalWeight: transfer.totalWeight,
      totalVolume: transfer.totalVolume,
      createdAt: new Date(transfer.createdAt).toLocaleString('zh-CN'),
      creator: transfer.creator?.fullName || transfer.creator?.username || '',
      notes: transfer.notes || ''
    });
  });
  
  // 设置所有数据行的边框样式
  for (let i = 2; i <= transfers.length + 1; i++) {
    worksheet.getRow(i).eachCell({ includeEmpty: true }, cell => {
      cell.border = {
        top: { style: 'thin' },
        left: { style: 'thin' },
        bottom: { style: 'thin' },
        right: { style: 'thin' }
      };
    });
  }
  
  // 保存工作簿
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  const filename = `transfers_export_${timestamp}.xlsx`;
  const filePath = path.join(EXPORT_DIR, filename);
  
  // 写入文件
  await workbook.xlsx.writeFile(filePath);
  
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
export async function exportTransferToExcel(
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
): Promise<string> {
  // 创建新的工作簿
  const workbook = new ExcelJS.Workbook();
  workbook.creator = 'E5系统';
  workbook.lastModifiedBy = 'E5系统';
  workbook.created = new Date();
  workbook.modified = new Date();
  
  // 创建工作表
  const worksheet = workbook.addWorksheet('仓库调拨单');
  
  // 添加标题
  worksheet.mergeCells('A1:G1');
  const titleCell = worksheet.getCell('A1');
  titleCell.value = '仓库调拨单';
  titleCell.font = { bold: true, size: 16 };
  titleCell.alignment = { horizontal: 'center' };
  
  // 添加空行
  worksheet.addRow([]);
  
  // 添加调拨单基本信息
  worksheet.addRow(['调拨单号', transfer.referenceNumber, '', '创建日期', new Date(transfer.createdAt).toLocaleString('zh-CN')]);
  worksheet.addRow(['源仓库', sourceWarehouse.name, '', '目标仓库', targetWarehouse.name]);
  worksheet.addRow(['总数量', transfer.totalItems, '', '总件数', transfer.totalPackages]);
  worksheet.addRow(['总重量(kg)', transfer.totalWeight, '', '总体积(m³)', transfer.totalVolume]);
  worksheet.addRow(['状态', transfer.status, '', '备注', transfer.notes || '']);
  
  // 添加空行
  worksheet.addRow([]);
  
  // 添加明细表头
  const detailsHeaderRow = worksheet.addRow([
    '序号', '唯一码', '产品ID', '产品名称', '产品条码', '产品分类', 
    '数量', '件数', '重量(kg)', '体积(m³)', '备注'
  ]);
  
  // 设置明细表头样式
  detailsHeaderRow.eachCell((cell) => {
    cell.font = { bold: true };
    cell.fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FFFFD966' }
    };
    cell.border = {
      top: { style: 'thin' },
      left: { style: 'thin' },
      bottom: { style: 'thin' },
      right: { style: 'thin' }
    };
  });
  
  // 添加明细数据
  items.forEach((item, index) => {
    // 获取产品信息
    const product = products[item.productId] || item.product || { name: '未知产品', barcode: '' };
    
    const itemRow = worksheet.addRow([
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
    ]);
    
    // 设置明细行样式
    itemRow.eachCell((cell) => {
      cell.border = {
        top: { style: 'thin' },
        left: { style: 'thin' },
        bottom: { style: 'thin' },
        right: { style: 'thin' }
      };
    });
  });
  
  // 添加空行
  worksheet.addRow([]);
  
  // 添加1C财务系统兼容的元数据
  worksheet.addRow(['#1C:TRANSFER']); // 1C标记，表明这是调拨数据
  worksheet.addRow(['VERSION', '1.0']);
  worksheet.addRow(['SOURCE_WAREHOUSE', sourceWarehouse.id, sourceWarehouse.name]);
  worksheet.addRow(['TARGET_WAREHOUSE', targetWarehouse.id, targetWarehouse.name]);
  worksheet.addRow(['DOCUMENT_NUMBER', transfer.referenceNumber]);
  worksheet.addRow(['DOCUMENT_DATE', new Date(transfer.createdAt).toISOString().split('T')[0]]);
  worksheet.addRow(['TOTAL_ITEMS', transfer.totalItems]);
  worksheet.addRow(['TOTAL_PACKAGES', transfer.totalPackages]);
  worksheet.addRow(['TOTAL_WEIGHT', transfer.totalWeight]);
  worksheet.addRow(['TOTAL_VOLUME', transfer.totalVolume]);
  worksheet.addRow(['STATUS', transfer.status]);
  
  // 添加空行
  worksheet.addRow([]);
  
  // 添加项目数据起始标记
  worksheet.addRow(['#ITEMS_START']);
  
  // 再次以特定格式添加项目数据
  items.forEach((item, index) => {
    // 获取产品信息
    const product = products[item.productId] || item.product || { name: '未知产品', barcode: '' };
    
    worksheet.addRow([
      'ITEM',
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
    ]);
  });
  
  // 添加项目数据结束标记
  worksheet.addRow(['#ITEMS_END']);
  
  // 设置列宽
  worksheet.columns.forEach((column, index) => {
    let width = 10;
    switch (index) {
      case 0: // 序号/特殊标记列
        width = 8;
        break;
      case 1: // 唯一码
      case 2: // 产品ID
        width = 10;
        break;
      case 3: // 产品名称
        width = 30;
        break;
      case 4: // 产品条码
      case 5: // 产品分类
        width = 15;
        break;
      case 6: // 数量
      case 7: // 件数
        width = 8;
        break;
      case 8: // 重量
      case 9: // 体积
        width = 10;
        break;
      case 10: // 备注
        width = 25;
        break;
      default:
        width = 10;
    }
    column.width = width;
  });
  
  // 保存工作簿
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  const filename = `transfer_${transfer.referenceNumber}_${timestamp}.xlsx`;
  const filePath = path.join(EXPORT_DIR, filename);
  
  // 写入文件
  await workbook.xlsx.writeFile(filePath);
  
  return filePath;
}