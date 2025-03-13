/**
 * 产品编码匹配工具
 * 用于处理电商平台产品编码与系统内产品编码的匹配
 */

/**
 * 处理电商平台产品编码
 * 如果编码少于6个字符，直接返回
 * 如果编码多于6个字符，获取'_'后面的数字部分
 * @param platformCode 电商平台产品编码
 * @returns 处理后可用于匹配的编码
 */
export function processProductCode(platformCode: string): string {
  if (!platformCode) return '';
  
  // 如果编码长度少于6个字符，直接返回
  if (platformCode.length < 6) {
    return platformCode;
  }
  
  // 尝试查找'_'字符
  const underscoreIndex = platformCode.lastIndexOf('_');
  if (underscoreIndex === -1) {
    // 如果没有'_'字符，返回原编码
    return platformCode;
  }
  
  // 获取'_'后面的部分
  const codeAfterUnderscore = platformCode.substring(underscoreIndex + 1);
  
  // 检查'_'后面是否是数字
  if (/^\d+$/.test(codeAfterUnderscore)) {
    return codeAfterUnderscore;
  }
  
  // 如果'_'后面不是纯数字，则返回原编码
  return platformCode;
}

/**
 * 验证两个产品编码是否匹配
 * @param systemCode 系统内产品编码
 * @param processedPlatformCode 处理后的平台产品编码
 * @returns 是否匹配
 */
export function isProductCodeMatch(systemCode: string, processedPlatformCode: string): boolean {
  if (!systemCode || !processedPlatformCode) return false;
  
  // 处理系统内编码，去除可能的前缀
  const processedSystemCode = processProductCode(systemCode);
  
  // 比较处理后的编码
  return processedSystemCode === processedPlatformCode;
}

/**
 * 从API响应中提取产品编码
 * 不同平台可能有不同的字段名
 * @param item API响应中的单个产品项
 * @param platform 平台类型
 * @returns 提取的产品编码
 */
export function extractProductCodeFromApiItem(item: any, platform: string): string {
  if (!item) return '';
  
  switch (platform.toLowerCase()) {
    case 'taobao':
    case 'tmall':
      return item.item_id || item.num_iid || '';
    case 'jd':
      return item.sku || item.sku_id || '';
    case 'pdd':
      return item.goods_id || item.sku_id || '';
    case '1688':
      return item.offer_id || '';
    case 'kaspi':
      return item.masterProductId || item.productId || item.code || '';
    case 'uzum':
      return item.product_id || item.sku_id || item.external_id || item.id || '';
    default:
      // 尝试几个常见的字段名
      return item.product_id || item.sku || item.code || item.id || '';
  }
}