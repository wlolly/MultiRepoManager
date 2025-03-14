/**
 * 产品Excel处理工具 (使用ExcelJS库)
 * 处理产品数据的Excel导入导出
 */
import ExcelJS from 'exceljs';
import path from 'path';
import fs from 'fs';

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
  // 创建新的工作簿
  const workbook = new ExcelJS.Workbook();
  workbook.creator = 'E5系统';
  workbook.lastModifiedBy = 'E5系统';
  workbook.created = new Date();
  workbook.modified = new Date();
  
  // 创建工作表
  const worksheet = workbook.addWorksheet('产品导入模板');
  
  // 定义列
  worksheet.columns = [
    { header: '产品名称(Product Name)', key: 'name', width: 30 },
    { header: '条形码(Barcode)', key: 'barcode', width: 20 },
    { header: '唯一码(Unique Code)', key: 'uniqueCode', width: 20 },
    { header: '分类(Category)', key: 'category', width: 15 },
    { header: '库存(Stock)', key: 'stock', width: 10 },
    { header: '批发价(Wholesale Price)', key: 'price', width: 15 },
    { header: '代理价(Agent Price)', key: 'cost', width: 15 },
    { header: '描述(Description)', key: 'description', width: 30 },
    { header: '单件长cm(Single Length)', key: 'singleLengthCm', width: 15 },
    { header: '单件宽cm(Single Width)', key: 'singleWidthCm', width: 15 },
    { header: '单件高cm(Single Height)', key: 'singleHeightCm', width: 15 },
    { header: '单件重量kg(Single Weight)', key: 'singleWeightKg', width: 15 },
    { header: '整件数量(Bulk Quantity)', key: 'bulkQuantity', width: 15 },
    { header: '整件长cm(Bulk Length)', key: 'bulkLengthCm', width: 15 },
    { header: '整件宽cm(Bulk Width)', key: 'bulkWidthCm', width: 15 },
    { header: '整件高cm(Bulk Height)', key: 'bulkHeightCm', width: 15 },
    { header: '整件重量kg(Bulk Weight)', key: 'bulkWeightKg', width: 15 },
    { header: '仓库ID(Warehouse ID)', key: 'warehouseId', width: 15 }
  ];
  
  // 设置表头样式
  worksheet.getRow(1).font = { bold: true };
  worksheet.getRow(1).fill = {
    type: 'pattern',
    pattern: 'solid',
    fgColor: { argb: 'FFD9EAD3' }
  };
  
  // 添加示例数据
  worksheet.addRow({
    name: '示例产品',
    barcode: '123456789',
    uniqueCode: 'UNIQUE123',
    category: '电子产品',
    stock: 100,
    price: 199.99,
    cost: 150.00,
    description: '这是一个示例产品描述',
    singleLengthCm: 10,
    singleWidthCm: 5,
    singleHeightCm: 2,
    singleWeightKg: 0.5,
    bulkQuantity: 20,
    bulkLengthCm: 50,
    bulkWidthCm: 30,
    bulkHeightCm: 20,
    bulkWeightKg: 12,
    warehouseId: 1
  });
  
  // 添加说明工作表
  const instructionSheet = workbook.addWorksheet('填写说明');
  instructionSheet.columns = [
    { header: '字段', key: 'field', width: 20 },
    { header: '说明', key: 'description', width: 50 },
    { header: '必填', key: 'required', width: 10 },
    { header: '类型', key: 'type', width: 15 }
  ];
  
  // 设置说明表头样式
  instructionSheet.getRow(1).font = { bold: true };
  instructionSheet.getRow(1).fill = {
    type: 'pattern',
    pattern: 'solid',
    fgColor: { argb: 'FFFFD966' }
  };
  
  // 添加说明内容
  const instructions = [
    { field: '产品名称', description: '产品的名称', required: '是', type: '文本' },
    { field: '条形码', description: '产品的条形码，用于唯一标识产品', required: '是', type: '文本' },
    { field: '唯一码', description: '产品的唯一编码，可用于快速查找', required: '否', type: '文本' },
    { field: '分类', description: '产品所属的分类', required: '是', type: '文本' },
    { field: '库存', description: '产品的当前库存数量', required: '是', type: '数字' },
    { field: '批发价', description: '产品的批发价格', required: '是', type: '数字' },
    { field: '代理价', description: '产品的代理价格', required: '是', type: '数字' },
    { field: '描述', description: '产品的详细描述', required: '否', type: '文本' },
    { field: '单件长cm', description: '单个产品的长度（厘米）', required: '是', type: '数字' },
    { field: '单件宽cm', description: '单个产品的宽度（厘米）', required: '是', type: '数字' },
    { field: '单件高cm', description: '单个产品的高度（厘米）', required: '是', type: '数字' },
    { field: '单件重量kg', description: '单个产品的重量（千克）', required: '是', type: '数字' },
    { field: '整件数量', description: '一件包含的产品数量', required: '否', type: '数字' },
    { field: '整件长cm', description: '整件包装的长度（厘米）', required: '否', type: '数字' },
    { field: '整件宽cm', description: '整件包装的宽度（厘米）', required: '否', type: '数字' },
    { field: '整件高cm', description: '整件包装的高度（厘米）', required: '否', type: '数字' },
    { field: '整件重量kg', description: '整件包装的重量（千克）', required: '否', type: '数字' },
    { field: '仓库ID', description: '产品所属的仓库ID', required: '是', type: '数字' }
  ];
  
  instructionSheet.addRows(instructions);
  
  // 保存工作簿
  const filename = 'product_import_template.xlsx';
  const filePath = path.join(TEMPLATE_DIR, filename);
  
  // 确保目录存在
  if (!fs.existsSync(path.dirname(filePath))) {
    fs.mkdirSync(path.dirname(filePath), { recursive: true });
  }
  
  // 写入文件 - 使用同步方法确保文件在返回前已创建
  try {
    workbook.xlsx.writeFile(filePath);
    console.log(`产品导入模板已创建: ${filePath}`);
    return filePath;
  } catch (err) {
    console.error('创建产品导入模板失败:', err);
    throw err; // 抛出错误以便上层处理
  }
}

/**
 * 解析导入的Excel文件
 * @param filePath Excel文件路径
 * @returns 解析后的产品数据和错误信息
 */
export async function parseProductImportFile(filePath: string): Promise<{
  products: any[];
  errors: string[];
}> {
  try {
    // 从文件加载工作簿
    const workbook = new ExcelJS.Workbook();
    await workbook.xlsx.readFile(filePath);
    
    // 获取第一个工作表
    const worksheet = workbook.getWorksheet(1);
    if (!worksheet) {
      return {
        products: [],
        errors: ['工作表不存在']
      };
    }
    
    const products = [];
    const errors = [];
    
    // 跳过表头
    worksheet.eachRow({ includeEmpty: false }, (row, rowNumber) => {
      if (rowNumber === 1) return; // 跳过表头行
      
      try {
        // 获取行数据
        const rowData: any = {};
        row.eachCell({ includeEmpty: true }, (cell, colNumber) => {
          const header = worksheet.getRow(1).getCell(colNumber).value?.toString() || '';
          const headerKey = getFieldKeyFromHeader(header);
          if (headerKey) {
            rowData[headerKey] = cell.value;
          }
        });
        
        // 验证必填字段
        const requiredFields = ['name', 'barcode', 'category', 'stock', 'price', 'cost', 'singleLengthCm', 'singleWidthCm', 'singleHeightCm', 'singleWeightKg', 'warehouseId'];
        for (const field of requiredFields) {
          if (rowData[field] === undefined || rowData[field] === null || rowData[field] === '') {
            errors.push(`第${rowNumber}行: ${getHeaderNameFromKey(field)}字段必填`);
            return; // 跳过这一行
          }
        }
        
        // 数值字段验证
        const numberFields = ['stock', 'price', 'cost', 'singleLengthCm', 'singleWidthCm', 'singleHeightCm', 'singleWeightKg', 'bulkQuantity', 'bulkLengthCm', 'bulkWidthCm', 'bulkHeightCm', 'bulkWeightKg', 'warehouseId'];
        for (const field of numberFields) {
          if (rowData[field] !== undefined && rowData[field] !== null && rowData[field] !== '') {
            const value = Number(rowData[field]);
            if (isNaN(value) || value < 0) {
              errors.push(`第${rowNumber}行: ${getHeaderNameFromKey(field)}必须为有效的正数`);
              return; // 跳过这一行
            }
            rowData[field] = value;
          }
        }
        
        // 计算单件体积
        const singleVolumeM3 = (rowData.singleLengthCm * rowData.singleWidthCm * rowData.singleHeightCm) / 1000000; // 从立方厘米转换为立方米
        rowData.singleVolumeM3 = String(singleVolumeM3.toFixed(6));
        
        // 计算整件体积（如果有整件数据）
        if (rowData.bulkLengthCm && rowData.bulkWidthCm && rowData.bulkHeightCm) {
          const bulkVolumeM3 = (rowData.bulkLengthCm * rowData.bulkWidthCm * rowData.bulkHeightCm) / 1000000; // 从立方厘米转换为立方米
          rowData.bulkVolumeM3 = String(bulkVolumeM3.toFixed(6));
        }
        
        // 转换数值为字符串（适配数据库需求）
        rowData.price = String(rowData.price);
        rowData.cost = String(rowData.cost);
        rowData.singleLengthCm = String(rowData.singleLengthCm);
        rowData.singleWidthCm = String(rowData.singleWidthCm);
        rowData.singleHeightCm = String(rowData.singleHeightCm);
        rowData.singleWeightKg = String(rowData.singleWeightKg);
        
        if (rowData.bulkLengthCm) rowData.bulkLengthCm = String(rowData.bulkLengthCm);
        if (rowData.bulkWidthCm) rowData.bulkWidthCm = String(rowData.bulkWidthCm);
        if (rowData.bulkHeightCm) rowData.bulkHeightCm = String(rowData.bulkHeightCm);
        if (rowData.bulkWeightKg) rowData.bulkWeightKg = String(rowData.bulkWeightKg);
        if (rowData.bulkQuantity) rowData.bulkQuantity = Number(rowData.bulkQuantity);
        
        // 添加到产品列表
        products.push(rowData);
      } catch (error) {
        errors.push(`第${rowNumber}行解析出错: ${(error as Error).message}`);
      }
    });
    
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
export async function exportProductsToExcel(products: any[], warehouses: Record<number, string>): Promise<string> {
  // 创建新的工作簿
  const workbook = new ExcelJS.Workbook();
  workbook.creator = 'E5系统';
  workbook.lastModifiedBy = 'E5系统';
  workbook.created = new Date();
  workbook.modified = new Date();
  
  // 创建产品数据工作表
  const worksheet = workbook.addWorksheet('产品数据');
  
  // 定义列
  worksheet.columns = [
    { header: '产品ID', key: 'id', width: 10 },
    { header: '产品名称', key: 'name', width: 30 },
    { header: '条形码', key: 'barcode', width: 20 },
    { header: '唯一码', key: 'uniqueCode', width: 20 },
    { header: '分类', key: 'category', width: 15 },
    { header: '库存', key: 'stock', width: 10 },
    { header: '批发价', key: 'price', width: 15 },
    { header: '代理价', key: 'cost', width: 15 },
    { header: '描述', key: 'description', width: 30 },
    { header: '单件长(cm)', key: 'singleLengthCm', width: 15 },
    { header: '单件宽(cm)', key: 'singleWidthCm', width: 15 },
    { header: '单件高(cm)', key: 'singleHeightCm', width: 15 },
    { header: '单件重量(kg)', key: 'singleWeightKg', width: 15 },
    { header: '单件体积(m³)', key: 'singleVolumeM3', width: 15 },
    { header: '整件数量', key: 'bulkQuantity', width: 15 },
    { header: '整件长(cm)', key: 'bulkLengthCm', width: 15 },
    { header: '整件宽(cm)', key: 'bulkWidthCm', width: 15 },
    { header: '整件高(cm)', key: 'bulkHeightCm', width: 15 },
    { header: '整件重量(kg)', key: 'bulkWeightKg', width: 15 },
    { header: '整件体积(m³)', key: 'bulkVolumeM3', width: 15 },
    { header: '所属仓库', key: 'warehouse', width: 20 },
    { header: '创建时间', key: 'createdAt', width: 20 },
    { header: '更新时间', key: 'updatedAt', width: 20 }
  ];
  
  // 设置表头样式
  worksheet.getRow(1).font = { bold: true };
  worksheet.getRow(1).fill = {
    type: 'pattern',
    pattern: 'solid',
    fgColor: { argb: 'FFD9EAD3' }
  };
  
  // 添加产品数据
  for (const product of products) {
    worksheet.addRow({
      id: product.id,
      name: product.name,
      barcode: product.barcode,
      uniqueCode: product.uniqueCode || '',
      category: product.category,
      stock: product.stock,
      price: product.price,
      cost: product.cost,
      description: product.description || '',
      singleLengthCm: product.singleLengthCm,
      singleWidthCm: product.singleWidthCm,
      singleHeightCm: product.singleHeightCm,
      singleWeightKg: product.singleWeightKg,
      singleVolumeM3: product.singleVolumeM3,
      bulkQuantity: product.bulkQuantity || 1,
      bulkLengthCm: product.bulkLengthCm || '',
      bulkWidthCm: product.bulkWidthCm || '',
      bulkHeightCm: product.bulkHeightCm || '',
      bulkWeightKg: product.bulkWeightKg || '',
      bulkVolumeM3: product.bulkVolumeM3 || '',
      warehouse: warehouses[product.warehouseId] || `仓库ID: ${product.warehouseId}`,
      createdAt: formatDate(product.createdAt),
      updatedAt: product.updatedAt ? formatDate(product.updatedAt) : ''
    });
  }
  
  // 设置所有数据行的边框样式
  for (let i = 2; i <= products.length + 1; i++) {
    worksheet.getRow(i).eachCell({ includeEmpty: true }, cell => {
      cell.border = {
        top: { style: 'thin' },
        left: { style: 'thin' },
        bottom: { style: 'thin' },
        right: { style: 'thin' }
      };
    });
  }
  
  // 添加分类统计工作表
  const statsWorksheet = workbook.addWorksheet('分类统计');
  
  // 定义统计表列
  statsWorksheet.columns = [
    { header: '分类', key: 'category', width: 20 },
    { header: '产品数量', key: 'count', width: 15 },
    { header: '总库存', key: 'stock', width: 15 },
    { header: '总批发价值', key: 'totalPrice', width: 20 },
    { header: '总代理价值', key: 'totalCost', width: 20 }
  ];
  
  // 设置统计表头样式
  statsWorksheet.getRow(1).font = { bold: true };
  statsWorksheet.getRow(1).fill = {
    type: 'pattern',
    pattern: 'solid',
    fgColor: { argb: 'FFFFD966' }
  };
  
  // 计算分类统计数据
  const categoryStats = getCategoryStatistics(products);
  
  // 添加分类统计数据
  for (const stat of categoryStats) {
    statsWorksheet.addRow({
      category: stat.category,
      count: stat.count,
      stock: stat.stock,
      totalPrice: stat.totalPrice.toFixed(2),
      totalCost: stat.totalCost.toFixed(2)
    });
  }
  
  // 设置统计表格边框样式
  for (let i = 2; i <= categoryStats.length + 1; i++) {
    statsWorksheet.getRow(i).eachCell({ includeEmpty: true }, cell => {
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
  const filename = `products_export_${timestamp}.xlsx`;
  const filePath = path.join(EXPORT_DIR, filename);
  
  // 写入文件
  await workbook.xlsx.writeFile(filePath);
  console.log(`产品数据已导出: ${filePath}`);
  
  return filePath;
}

/**
 * 从Excel表头名称获取字段键
 * @param header 表头名称
 * @returns 字段键名
 */
function getFieldKeyFromHeader(header: string): string | null {
  // 提取头部字段中的英文名称
  if (!header) return null;
  const match = header.match(/\(([^)]+)\)/);
  
  if (match) {
    // 使用英文名称转换为小驼峰字段名
    const englishName = match[1];
    const words = englishName.split(' ');
    
    // 将英文名称转换为小驼峰命名
    if (words.length > 0) {
      const fieldName = words[0].toLowerCase() + words.slice(1).map(word => word.charAt(0).toUpperCase() + word.slice(1)).join('');
      return fieldName;
    }
    return null;
  }
  
  // 使用中文名称映射
  const headerMap: Record<string, string> = {
    '产品名称': 'name',
    '条形码': 'barcode',
    '唯一码': 'uniqueCode',
    '分类': 'category',
    '库存': 'stock',
    '批发价': 'price',
    '代理价': 'cost',
    '描述': 'description',
    '单件长cm': 'singleLengthCm',
    '单件宽cm': 'singleWidthCm',
    '单件高cm': 'singleHeightCm',
    '单件重量kg': 'singleWeightKg',
    '整件数量': 'bulkQuantity',
    '整件长cm': 'bulkLengthCm',
    '整件宽cm': 'bulkWidthCm',
    '整件高cm': 'bulkHeightCm',
    '整件重量kg': 'bulkWeightKg',
    '仓库ID': 'warehouseId'
  };
  
  // 清除可能的括号部分
  const cleanHeader = header.split('(')[0].trim();
  
  return headerMap[cleanHeader] || null;
}

/**
 * 从字段键名获取表头显示名称
 * @param key 字段键名
 * @returns 表头显示名称
 */
function getHeaderNameFromKey(key: string): string {
  const keyMap: Record<string, string> = {
    'name': '产品名称',
    'barcode': '条形码',
    'uniqueCode': '唯一码',
    'category': '分类',
    'stock': '库存',
    'price': '批发价',
    'cost': '代理价',
    'description': '描述',
    'singleLengthCm': '单件长cm',
    'singleWidthCm': '单件宽cm',
    'singleHeightCm': '单件高cm',
    'singleWeightKg': '单件重量kg',
    'bulkQuantity': '整件数量',
    'bulkLengthCm': '整件长cm',
    'bulkWidthCm': '整件宽cm',
    'bulkHeightCm': '整件高cm',
    'bulkWeightKg': '整件重量kg',
    'warehouseId': '仓库ID'
  };
  
  return keyMap[key] || key;
}

/**
 * 格式化日期为本地日期时间字符串
 * @param date 日期对象或日期字符串
 * @returns 格式化后的日期字符串
 */
function formatDate(date: Date | string): string {
  if (!date) return '';
  
  const dateObj = typeof date === 'string' ? new Date(date) : date;
  
  return dateObj.toLocaleString('zh-CN', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit'
  });
}

/**
 * 统计产品分类数据
 * @param products 产品列表
 * @returns 分类统计数据
 */
function getCategoryStatistics(products: any[]): Array<{
  category: string;
  count: number;
  stock: number;
  totalPrice: number;
  totalCost: number;
}> {
  const categoryMap: Record<string, { 
    count: number; 
    stock: number; 
    totalPrice: number; 
    totalCost: number; 
  }> = {};
  
  // 按分类统计
  for (const product of products) {
    const category = product.category || '未分类';
    
    if (!categoryMap[category]) {
      categoryMap[category] = {
        count: 0,
        stock: 0,
        totalPrice: 0,
        totalCost: 0
      };
    }
    
    const stock = typeof product.stock === 'number' ? product.stock : Number(product.stock) || 0;
    const price = typeof product.price === 'number' ? product.price : Number(product.price) || 0;
    const cost = typeof product.cost === 'number' ? product.cost : Number(product.cost) || 0;
    
    categoryMap[category].count++;
    categoryMap[category].stock += stock;
    categoryMap[category].totalPrice += stock * price;
    categoryMap[category].totalCost += stock * cost;
  }
  
  // 转换为数组
  return Object.entries(categoryMap).map(([category, stats]) => ({
    category,
    count: stats.count,
    stock: stats.stock,
    totalPrice: stats.totalPrice,
    totalCost: stats.totalCost
  }));
}