/**
 * 产品Excel处理工具
 * 处理产品数据的Excel导入导出
 */
import * as XLSX from 'xlsx';
import path from 'path';
import fs from 'fs';
import { Product } from '@shared/schema';

// 确保目录存在
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
 * 创建产品导入模板
 * @returns 模板文件路径
 */
export function createProductImportTemplate(): string {
  // 表头定义 (中英文对照，方便用户理解)
  const headers = [
    '产品名称(Product Name)', 
    '条形码(Barcode)', 
    '唯一码(Unique Code)',
    '分类(Category)', 
    '库存(Stock)', 
    '批发价(Wholesale Price)', 
    '代理价(Agent Price)',
    '描述(Description)',
    '单件长cm(Single Length)',
    '单件宽cm(Single Width)',
    '单件高cm(Single Height)',
    '单件重量kg(Single Weight)',
    '整件数量(Bulk Quantity)',
    '整件长cm(Bulk Length)',
    '整件宽cm(Bulk Width)',
    '整件高cm(Bulk Height)',
    '整件重量kg(Bulk Weight)',
    '所属仓库ID(Warehouse ID)'
  ];
  
  // 示例数据
  const exampleData = [
    ['高精度工业传感器', 'SENS12345', '11111', '电子设备', '100', '1200', '1000', '高精度工业用传感器，适用于各类自动化设备', '10', '5', '2', '0.5', '20', '30', '25', '15', '12', '1'],
    ['工业电机', 'MTR98765', '22222', '机械设备', '50', '3500', '3000', '中型工业电机，功率2.2kW', '25', '15', '15', '4.5', '5', '60', '40', '40', '25', '1'],
    ['电子元件套装', 'ELK45678', '33333', '电子配件', '200', '350', '280', '包含100种常用电子元件的套装', '20', '15', '10', '1.2', '10', '45', '35', '30', '15', '1'],
    ['请在此处填写您的数据...', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '']
  ];
  
  // 创建工作簿和工作表
  const wb = XLSX.utils.book_new();
  const ws = XLSX.utils.aoa_to_sheet([headers].concat(exampleData));
  
  // 设置列宽
  const colWidths = [30, 15, 15, 15, 10, 10, 10, 40, 10, 10, 10, 10, 10, 10, 10, 10, 10, 10];
  ws['!cols'] = colWidths.map(width => ({ width }));
  
  // 添加工作表到工作簿
  XLSX.utils.book_append_sheet(wb, ws, '产品数据模板');
  
  // 添加说明工作表
  const instructionsData = [
    ['产品数据导入说明'],
    [''],
    ['1. 请不要修改表格的结构或删除标题行'],
    ['2. 产品名称(Product Name): 必填，产品的名称'],
    ['3. 条形码(Barcode): 必填，产品的条形码'],
    ['4. 唯一码(Unique Code): 可选，产品的唯一标识码'],
    ['5. 分类(Category): 必填，产品所属的分类'],
    ['6. 库存(Stock): 必填，初始库存数量，必须为非负整数'],
    ['7. 批发价(Wholesale Price): 必填，产品的批发价格'],
    ['8. 代理价(Agent Price): 必填，产品的代理价格'],
    ['9. 描述(Description): 可选，产品的详细描述'],
    ['10. 单件长/宽/高cm: 必填，单个产品的尺寸，单位为厘米'],
    ['11. 单件重量kg: 必填，单个产品的重量，单位为千克'],
    ['12. 整件数量: 可选，每个包装内的产品数量，默认为1'],
    ['13. 整件长/宽/高cm: 可选，整件包装的尺寸，单位为厘米'],
    ['14. 整件重量kg: 可选，整件包装的重量，单位为千克'],
    ['15. 所属仓库ID: 必填，产品所属的仓库ID'],
    [''],
    ['注意: 导入前请先删除示例数据行'],
    [''],
    ['若有任何问题，请联系系统管理员']
  ];
  
  const instructionsWs = XLSX.utils.aoa_to_sheet(instructionsData);
  instructionsWs['!cols'] = [{ width: 60 }];
  XLSX.utils.book_append_sheet(wb, instructionsWs, '导入说明');
  
  // 保存工作簿到文件
  const templateFilename = 'product_import_template.xlsx';
  const templatePath = path.join(TEMPLATE_DIR, templateFilename);
  XLSX.writeFile(wb, templatePath);
  
  return templatePath;
}

/**
 * 解析导入的产品Excel文件
 * @param filePath Excel文件路径
 * @returns 解析后的产品数据和错误信息
 */
export function parseProductImportFile(filePath: string): {
  products: Array<{
    name: string;
    barcode: string;
    uniqueCode?: string;
    category: string;
    stock: number;
    price: number; // 批发价
    cost: number;  // 代理价
    description?: string;
    singleLengthCm: number;
    singleWidthCm: number;
    singleHeightCm: number;
    singleWeightKg: number;
    bulkQuantity?: number;
    bulkLengthCm?: number;
    bulkWidthCm?: number;
    bulkHeightCm?: number;
    bulkWeightKg?: number;
    warehouseId: number;
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
    
    const products: Array<{
      name: string;
      barcode: string;
      uniqueCode?: string;
      category: string;
      stock: number;
      price: number; // 批发价
      cost: number;  // 代理价
      description?: string;
      singleLengthCm: number;
      singleWidthCm: number;
      singleHeightCm: number;
      singleWeightKg: number;
      bulkQuantity?: number;
      bulkLengthCm?: number;
      bulkWidthCm?: number;
      bulkHeightCm?: number;
      bulkWeightKg?: number;
      warehouseId: number;
    }> = [];
    
    const errors: string[] = [];
    let rowIndex = 2; // 开始于第2行，因为第1行是表头
    
    // 处理每一行数据
    for (const row of rawData) {
      const rowObj = row as Record<string, any>;
      rowIndex++;
      
      // 提取字段(处理可能的中英文字段名)
      const name = rowObj['产品名称(Product Name)'] || rowObj['产品名称'] || rowObj['Product Name'] || '';
      const barcode = rowObj['条形码(Barcode)'] || rowObj['条形码'] || rowObj['Barcode'] || '';
      const uniqueCode = rowObj['唯一码(Unique Code)'] || rowObj['唯一码'] || rowObj['Unique Code'] || '';
      const category = rowObj['分类(Category)'] || rowObj['分类'] || rowObj['Category'] || '';
      const stock = rowObj['库存(Stock)'] || rowObj['库存'] || rowObj['Stock'] || '';
      const price = rowObj['批发价(Wholesale Price)'] || rowObj['批发价'] || rowObj['Wholesale Price'] || '';
      const cost = rowObj['代理价(Agent Price)'] || rowObj['代理价'] || rowObj['Agent Price'] || '';
      const description = rowObj['描述(Description)'] || rowObj['描述'] || rowObj['Description'] || '';
      
      const singleLengthCm = rowObj['单件长cm(Single Length)'] || rowObj['单件长cm'] || rowObj['Single Length'] || '';
      const singleWidthCm = rowObj['单件宽cm(Single Width)'] || rowObj['单件宽cm'] || rowObj['Single Width'] || '';
      const singleHeightCm = rowObj['单件高cm(Single Height)'] || rowObj['单件高cm'] || rowObj['Single Height'] || '';
      const singleWeightKg = rowObj['单件重量kg(Single Weight)'] || rowObj['单件重量kg'] || rowObj['Single Weight'] || '';
      
      const bulkQuantity = rowObj['整件数量(Bulk Quantity)'] || rowObj['整件数量'] || rowObj['Bulk Quantity'] || '';
      const bulkLengthCm = rowObj['整件长cm(Bulk Length)'] || rowObj['整件长cm'] || rowObj['Bulk Length'] || '';
      const bulkWidthCm = rowObj['整件宽cm(Bulk Width)'] || rowObj['整件宽cm'] || rowObj['Bulk Width'] || '';
      const bulkHeightCm = rowObj['整件高cm(Bulk Height)'] || rowObj['整件高cm'] || rowObj['Bulk Height'] || '';
      const bulkWeightKg = rowObj['整件重量kg(Bulk Weight)'] || rowObj['整件重量kg'] || rowObj['Bulk Weight'] || '';
      
      const warehouseId = rowObj['所属仓库ID(Warehouse ID)'] || rowObj['所属仓库ID'] || rowObj['Warehouse ID'] || '';
      
      // 基本数据验证
      if (!name) {
        if (Object.keys(rowObj).some(key => rowObj[key])) {
          errors.push(`第${rowIndex}行: 产品名称不能为空`);
        }
        continue; // 跳过空行或无有效数据的行
      }
      
      if (!barcode) {
        errors.push(`第${rowIndex}行: 条形码不能为空`);
        continue;
      }
      
      if (!category) {
        errors.push(`第${rowIndex}行: 分类不能为空`);
        continue;
      }
      
      // 数值字段验证
      const parsedStock = parseInt(String(stock));
      if (isNaN(parsedStock) || parsedStock < 0) {
        errors.push(`第${rowIndex}行: 库存必须为非负整数`);
        continue;
      }
      
      const parsedPrice = parseFloat(String(price));
      if (isNaN(parsedPrice) || parsedPrice < 0) {
        errors.push(`第${rowIndex}行: 批发价必须为非负数`);
        continue;
      }
      
      const parsedCost = parseFloat(String(cost));
      if (isNaN(parsedCost) || parsedCost < 0) {
        errors.push(`第${rowIndex}行: 代理价必须为非负数`);
        continue;
      }
      
      // 尺寸和重量验证
      const parsedSingleLengthCm = parseFloat(String(singleLengthCm));
      if (isNaN(parsedSingleLengthCm) || parsedSingleLengthCm <= 0) {
        errors.push(`第${rowIndex}行: 单件长度必须为正数`);
        continue;
      }
      
      const parsedSingleWidthCm = parseFloat(String(singleWidthCm));
      if (isNaN(parsedSingleWidthCm) || parsedSingleWidthCm <= 0) {
        errors.push(`第${rowIndex}行: 单件宽度必须为正数`);
        continue;
      }
      
      const parsedSingleHeightCm = parseFloat(String(singleHeightCm));
      if (isNaN(parsedSingleHeightCm) || parsedSingleHeightCm <= 0) {
        errors.push(`第${rowIndex}行: 单件高度必须为正数`);
        continue;
      }
      
      const parsedSingleWeightKg = parseFloat(String(singleWeightKg));
      if (isNaN(parsedSingleWeightKg) || parsedSingleWeightKg <= 0) {
        errors.push(`第${rowIndex}行: 单件重量必须为正数`);
        continue;
      }
      
      // 计算单件体积 (立方米)
      const singleVolumeM3 = (parsedSingleLengthCm * parsedSingleWidthCm * parsedSingleHeightCm) / 1000000; // 将cm³转换为m³
      
      // 可选字段处理
      const parsedBulkQuantity = bulkQuantity ? parseInt(String(bulkQuantity)) : undefined;
      if (bulkQuantity && (isNaN(parsedBulkQuantity!) || parsedBulkQuantity! <= 0)) {
        errors.push(`第${rowIndex}行: 整件数量必须为正整数`);
        continue;
      }
      
      // 整件尺寸和重量处理
      let parsedBulkLengthCm: number | undefined = undefined;
      let parsedBulkWidthCm: number | undefined = undefined;
      let parsedBulkHeightCm: number | undefined = undefined;
      let parsedBulkWeightKg: number | undefined = undefined;
      let bulkVolumeM3: number | undefined = undefined;
      
      // 如果提供了整件数据，验证并计算体积
      if (bulkLengthCm || bulkWidthCm || bulkHeightCm || bulkWeightKg) {
        parsedBulkLengthCm = bulkLengthCm ? parseFloat(String(bulkLengthCm)) : undefined;
        if (bulkLengthCm && (isNaN(parsedBulkLengthCm!) || parsedBulkLengthCm! <= 0)) {
          errors.push(`第${rowIndex}行: 整件长度必须为正数`);
          continue;
        }
        
        parsedBulkWidthCm = bulkWidthCm ? parseFloat(String(bulkWidthCm)) : undefined;
        if (bulkWidthCm && (isNaN(parsedBulkWidthCm!) || parsedBulkWidthCm! <= 0)) {
          errors.push(`第${rowIndex}行: 整件宽度必须为正数`);
          continue;
        }
        
        parsedBulkHeightCm = bulkHeightCm ? parseFloat(String(bulkHeightCm)) : undefined;
        if (bulkHeightCm && (isNaN(parsedBulkHeightCm!) || parsedBulkHeightCm! <= 0)) {
          errors.push(`第${rowIndex}行: 整件高度必须为正数`);
          continue;
        }
        
        parsedBulkWeightKg = bulkWeightKg ? parseFloat(String(bulkWeightKg)) : undefined;
        if (bulkWeightKg && (isNaN(parsedBulkWeightKg!) || parsedBulkWeightKg! <= 0)) {
          errors.push(`第${rowIndex}行: 整件重量必须为正数`);
          continue;
        }
        
        // 如果提供了所有整件尺寸，计算体积
        if (parsedBulkLengthCm && parsedBulkWidthCm && parsedBulkHeightCm) {
          bulkVolumeM3 = (parsedBulkLengthCm * parsedBulkWidthCm * parsedBulkHeightCm) / 1000000; // 将cm³转换为m³
        }
      }
      
      // 仓库ID验证
      const parsedWarehouseId = parseInt(String(warehouseId));
      if (isNaN(parsedWarehouseId) || parsedWarehouseId <= 0) {
        errors.push(`第${rowIndex}行: 所属仓库ID必须为正整数`);
        continue;
      }
      
      // 添加到产品列表
      products.push({
        name: String(name),
        barcode: String(barcode),
        uniqueCode: uniqueCode ? String(uniqueCode) : undefined,
        category: String(category),
        stock: parsedStock,
        price: parsedPrice,
        cost: parsedCost,
        description: description ? String(description) : undefined,
        singleLengthCm: parsedSingleLengthCm,
        singleWidthCm: parsedSingleWidthCm,
        singleHeightCm: parsedSingleHeightCm,
        singleWeightKg: parsedSingleWeightKg,
        singleVolumeM3: singleVolumeM3,
        bulkQuantity: parsedBulkQuantity,
        bulkLengthCm: parsedBulkLengthCm,
        bulkWidthCm: parsedBulkWidthCm,
        bulkHeightCm: parsedBulkHeightCm,
        bulkWeightKg: parsedBulkWeightKg,
        bulkVolumeM3: bulkVolumeM3,
        warehouseId: parsedWarehouseId
      });
    }
    
    return { products, errors };
  } catch (error) {
    return { 
      products: [], 
      errors: [`Excel文件解析失败: ${(error as Error).message}`] 
    };
  }
}

/**
 * 导出产品数据到Excel文件
 * @param products 产品数据列表
 * @param warehouses 仓库数据映射 (ID -> 名称)
 * @returns 导出文件路径
 */
export function exportProductsToExcel(
  products: Product[],
  warehouses: Record<number, string>
): string {
  // 创建工作簿
  const wb = XLSX.utils.book_new();
  
  // 表头
  const headers = [
    '产品ID', 
    '产品名称', 
    '条形码', 
    '唯一码',
    '分类', 
    '库存', 
    '批发价', 
    '代理价',
    '描述',
    '单件长(cm)',
    '单件宽(cm)',
    '单件高(cm)',
    '单件重量(kg)',
    '单件体积(m³)',
    '整件数量',
    '整件长(cm)',
    '整件宽(cm)',
    '整件高(cm)',
    '整件重量(kg)',
    '整件体积(m³)',
    '所属仓库',
    '创建时间',
    '更新时间'
  ];
  
  // 产品数据
  const data = products.map(product => [
    product.id,
    product.name,
    product.barcode,
    product.uniqueCode || '',
    product.category,
    product.stock,
    product.price,
    product.cost,
    product.description || '',
    product.singleLengthCm,
    product.singleWidthCm,
    product.singleHeightCm,
    product.singleWeightKg,
    product.singleVolumeM3,
    product.bulkQuantity || 1,
    product.bulkLengthCm || '',
    product.bulkWidthCm || '',
    product.bulkHeightCm || '',
    product.bulkWeightKg || '',
    product.bulkVolumeM3 || '',
    warehouses[product.warehouseId] || `仓库ID: ${product.warehouseId}`,
    new Date(product.createdAt).toLocaleString('zh-CN'),
    product.updatedAt ? new Date(product.updatedAt).toLocaleString('zh-CN') : ''
  ]);
  
  // 创建工作表
  const ws = XLSX.utils.aoa_to_sheet([headers].concat(data));
  
  // 设置列宽
  const colWidths = [
    { width: 8 },  // 产品ID
    { width: 30 }, // 产品名称
    { width: 15 }, // 条形码
    { width: 15 }, // 唯一码
    { width: 15 }, // 分类
    { width: 8 },  // 库存
    { width: 10 }, // 批发价
    { width: 10 }, // 代理价
    { width: 40 }, // 描述
    { width: 10 }, // 单件长
    { width: 10 }, // 单件宽
    { width: 10 }, // 单件高
    { width: 10 }, // 单件重量
    { width: 10 }, // 单件体积
    { width: 10 }, // 整件数量
    { width: 10 }, // 整件长
    { width: 10 }, // 整件宽
    { width: 10 }, // 整件高
    { width: 10 }, // 整件重量
    { width: 10 }, // 整件体积
    { width: 20 }, // 所属仓库
    { width: 20 }, // 创建时间
    { width: 20 }  // 更新时间
  ];
  
  ws['!cols'] = colWidths;
  
  // 添加工作表到工作簿
  XLSX.utils.book_append_sheet(wb, ws, '产品数据');
  
  // 添加分类统计工作表
  const categoryData = getCategoryStatistics(products);
  const categoryWs = XLSX.utils.aoa_to_sheet([
    ['分类', '产品数量', '总库存', '总批发价值', '总代理价值'],
    ...categoryData
  ]);
  
  categoryWs['!cols'] = [
    { width: 20 }, // 分类
    { width: 10 }, // 产品数量
    { width: 10 }, // 总库存
    { width: 15 }, // 总批发价值
    { width: 15 }  // 总代理价值
  ];
  
  XLSX.utils.book_append_sheet(wb, categoryWs, '分类统计');
  
  // 保存工作簿到文件
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  const filename = `products_export_${timestamp}.xlsx`;
  const filePath = path.join(EXPORT_DIR, filename);
  XLSX.writeFile(wb, filePath);
  
  return filePath;
}

/**
 * 统计产品分类数据
 * @param products 产品列表
 * @returns 分类统计数据
 */
function getCategoryStatistics(products: Product[]): any[][] {
  const categoryMap: Record<string, {
    count: number;
    stock: number;
    totalPrice: number;
    totalCost: number;
  }> = {};
  
  // 按分类统计
  for (const product of products) {
    const category = product.category;
    if (!categoryMap[category]) {
      categoryMap[category] = {
        count: 0,
        stock: 0,
        totalPrice: 0,
        totalCost: 0
      };
    }
    
    categoryMap[category].count++;
    categoryMap[category].stock += product.stock;
    categoryMap[category].totalPrice += product.stock * product.price;
    categoryMap[category].totalCost += product.stock * product.cost;
  }
  
  // 转换为数组
  return Object.entries(categoryMap).map(([category, stats]) => [
    category,
    stats.count,
    stats.stock,
    stats.totalPrice.toFixed(2),
    stats.totalCost.toFixed(2)
  ]);
}