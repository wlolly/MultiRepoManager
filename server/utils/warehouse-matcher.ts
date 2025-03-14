/**
 * 仓库名称匹配工具
 * 用于处理外部API与系统内部仓库名称之间的映射
 */

// 仓库名称映射表，用于存储外部仓库名称到内部仓库ID的映射
// 这些映射可以通过管理界面进行配置
let warehouseNameMap: Map<string, number> = new Map();

/**
 * 初始化仓库名称映射，可从配置或数据库加载
 * @param mappings 名称到ID的映射
 */
export function initializeWarehouseMap(mappings: Record<string, number>) {
  warehouseNameMap = new Map(Object.entries(mappings));
}

/**
 * 添加一条仓库名称映射
 * @param externalName 外部API中的仓库名称
 * @param internalId 系统内部的仓库ID
 */
export function addWarehouseMapping(externalName: string, internalId: number) {
  warehouseNameMap.set(externalName, internalId);
}

/**
 * 根据外部仓库名称查找内部仓库ID
 * @param externalName 外部API中的仓库名称
 * @returns 匹配的内部仓库ID，如未找到则返回undefined
 */
export function findWarehouseIdByName(externalName: string): number | undefined {
  return warehouseNameMap.get(externalName);
}

/**
 * 检查是否有匹配的仓库
 * @param externalName 外部API中的仓库名称
 * @returns 是否找到匹配的仓库
 */
export function hasWarehouseMapping(externalName: string): boolean {
  return warehouseNameMap.has(externalName);
}

/**
 * 获取所有仓库映射
 * @returns 名称到ID的映射对象
 */
export function getAllWarehouseMappings(): Record<string, number> {
  return Object.fromEntries(warehouseNameMap.entries());
}

/**
 * 移除一条仓库名称映射
 * @param externalName 外部API中的仓库名称
 */
export function removeWarehouseMapping(externalName: string) {
  warehouseNameMap.delete(externalName);
}

/**
 * 根据相似度查找最匹配的仓库
 * 使用简单的字符串相似度算法，可以根据需要替换为更复杂的算法
 * @param externalName 外部API中的仓库名称
 * @param warehouseNames 所有内部仓库名称列表
 * @returns 最匹配的仓库名称，如相似度低于阈值则返回null
 */
export function findMostSimilarWarehouse(
  externalName: string,
  warehouseNames: {id: number, name: string}[]
): {id: number, name: string, similarity: number} | null {
  if (!externalName || warehouseNames.length === 0) return null;
  
  const threshold = 0.5; // 相似度阈值，可根据需要调整
  let bestMatch = null;
  let highestSimilarity = 0;
  
  for (const warehouse of warehouseNames) {
    const similarity = calculateStringSimilarity(
      externalName.toLowerCase(),
      warehouse.name.toLowerCase()
    );
    
    if (similarity > highestSimilarity) {
      highestSimilarity = similarity;
      bestMatch = {
        id: warehouse.id, 
        name: warehouse.name,
        similarity
      };
    }
  }
  
  return (bestMatch && bestMatch.similarity >= threshold) ? bestMatch : null;
}

/**
 * 计算两个字符串之间的相似度 (0-1)
 * 使用Levenshtein距离的简化计算方式
 */
function calculateStringSimilarity(str1: string, str2: string): number {
  if (str1 === str2) return 1.0;
  if (!str1 || !str2) return 0.0;
  
  // 标准化处理，移除空格、连字符等，以提高匹配准确度
  const normalizedStr1 = str1.replace(/[-\s_]/g, '').toLowerCase();
  const normalizedStr2 = str2.replace(/[-\s_]/g, '').toLowerCase();
  
  // 完全相等的情况
  if (normalizedStr1 === normalizedStr2) return 1.0;
  
  // 包含关系的情况
  if (normalizedStr1.includes(normalizedStr2) || normalizedStr2.includes(normalizedStr1)) {
    const lengthRatio = Math.min(normalizedStr1.length, normalizedStr2.length) / 
                        Math.max(normalizedStr1.length, normalizedStr2.length);
    return 0.7 + 0.3 * lengthRatio; // 基础分0.7，长度接近加分
  }
  
  // 计算编辑距离
  const distance = levenshteinDistance(normalizedStr1, normalizedStr2);
  const maxLength = Math.max(normalizedStr1.length, normalizedStr2.length);
  
  // 计算相似度，1表示完全相同，0表示完全不同
  return 1 - distance / maxLength;
}

/**
 * 计算Levenshtein距离
 * 衡量两个字符串之间的编辑距离
 */
function levenshteinDistance(str1: string, str2: string): number {
  const m = str1.length;
  const n = str2.length;
  
  // 创建距离矩阵
  const d: number[][] = Array(m + 1).fill(null).map(() => Array(n + 1).fill(0));
  
  // 初始化第一行和第一列
  for (let i = 0; i <= m; i++) d[i][0] = i;
  for (let j = 0; j <= n; j++) d[0][j] = j;
  
  // 填充矩阵
  for (let i = 1; i <= m; i++) {
    for (let j = 1; j <= n; j++) {
      const cost = str1[i-1] === str2[j-1] ? 0 : 1;
      d[i][j] = Math.min(
        d[i-1][j] + 1,       // 删除
        d[i][j-1] + 1,       // 插入
        d[i-1][j-1] + cost   // 替换或不操作
      );
    }
  }
  
  return d[m][n];
}