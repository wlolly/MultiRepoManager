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
  // 如果编码为空，返回空字符串
  if (!platformCode) return '';
  
  // 如果编码包含下划线，尝试提取下划线后的数字部分
  if (platformCode.includes('_')) {
    const parts = platformCode.split('_');
    // 如果下划线后面有内容，返回最后一部分
    if (parts.length > 1) {
      const lastPart = parts[parts.length - 1];
      // 如果最后一部分是数字或数字开头，则返回它
      if (/^\d/.test(lastPart)) {
        return lastPart;
      }
    }
  }
  
  // 尝试提取纯数字部分
  const numbers = platformCode.match(/\d+/g);
  if (numbers && numbers.length > 0) {
    // 返回最长的数字序列
    return numbers.reduce((a, b) => a.length > b.length ? a : b);
  }
  
  // 如果编码少于6个字符，直接返回
  if (platformCode.length < 6) {
    return platformCode;
  }
  
  // 默认返回修剪后的原始编码（去掉特殊字符和空格）
  return platformCode.replace(/[^a-zA-Z0-9]/g, '');
}

/**
 * 验证两个产品编码是否匹配
 * @param systemCode 系统内产品编码
 * @param processedPlatformCode 处理后的平台产品编码
 * @returns 是否匹配
 */
export function isProductCodeMatch(systemCode: string, processedPlatformCode: string): boolean {
  if (!systemCode || !processedPlatformCode) return false;
  
  // 处理系统内编码，去除特殊字符
  const normalizedSystemCode = systemCode.replace(/[^a-zA-Z0-9]/g, '');
  
  // 完全匹配
  if (normalizedSystemCode === processedPlatformCode) {
    return true;
  }
  
  // 检查系统编码是否包含平台编码
  if (normalizedSystemCode.includes(processedPlatformCode)) {
    return true;
  }
  
  // 检查平台编码是否包含系统编码
  if (processedPlatformCode.includes(normalizedSystemCode)) {
    return true;
  }
  
  // 提取系统编码中的数字部分
  const systemNumbers = normalizedSystemCode.match(/\d+/g);
  if (systemNumbers && systemNumbers.length > 0) {
    // 检查系统编码中的任何数字序列是否匹配平台编码
    return systemNumbers.some(num => num === processedPlatformCode);
  }
  
  return false;
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
    case 'shopify':
      return item.sku || item.variant_id?.toString() || '';
      
    case 'woocommerce':
      return item.sku || item.id?.toString() || '';
      
    case 'magento':
      return item.sku || '';
      
    case 'aliexpress':
      return item.product_id?.toString() || item.sku || '';
      
    case 'taobao':
    case 'tmall':
      return item.num_iid?.toString() || item.outer_id || '';
      
    case 'amazon':
      return item.seller_sku || item.asin || '';
      
    case 'ebay':
      return item.sku || item.item_id?.toString() || '';
      
    case 'jd':
      return item.sku?.toString() || item.product_id?.toString() || '';
      
    case 'pinduoduo':
      return item.goods_id?.toString() || item.sku_id?.toString() || '';
      
    default:
      // 尝试常见的编码字段名称
      return item.sku || 
             item.product_code || 
             item.productCode || 
             item.item_code || 
             item.itemCode || 
             item.product_id?.toString() || 
             item.productId?.toString() || 
             item.id?.toString() || 
             '';
  }
}