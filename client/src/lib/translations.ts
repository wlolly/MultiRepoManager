/**
 * 国际化工具库
 * 提供翻译辅助函数，方便在应用中使用
 */
import i18n from 'i18next';
import translations from '../../../public/locales/translations.json';

/**
 * 仓库调拨相关翻译键
 */
export const warehouseTransferKeys = {
  title: 'warehouse_transfers_title',
  create: 'create_transfer',
  detail: 'transfer_detail',
  status: 'transfer_status',
  source: 'source_warehouse',
  target: 'target_warehouse',
  items: 'transfer_items',
  totalItems: 'total_items',
  totalWeight: 'total_weight',
  totalVolume: 'total_volume',
  totalPackages: 'total_packages',
  referenceNumber: 'reference_number',
  pending: 'status_pending',
  processing: 'status_processing',
  completed: 'status_completed',
  cancelled: 'status_cancelled',
  execute: 'execute_transfer',
  cancel: 'cancel_transfer',
  product: 'product',
  quantity: 'quantity',
  weight: 'weight',
  volume: 'volume',
  createdBy: 'created_by',
  createdAt: 'created_at',
  notes: 'notes',
  totalTransfers: 'total_transfers',
  pendingTransfers: 'pending_transfers',
  completedTransfers: 'completed_transfers',
  filterByWarehouse: 'filter_by_warehouse',
  allWarehouses: 'all_warehouses',
  transferHistory: 'transfer_history',
  confirmExecute: 'confirm_execute_transfer',
  confirmCancel: 'confirm_cancel_transfer',
  executeSuccess: 'transfer_executed_successfully',
  cancelSuccess: 'transfer_cancelled_successfully',
  
  // 以下是在optimized-index.tsx中用到的额外键
  statusPending: 'status_pending',
  statusInTransit: 'status_processing', // 使用处理中作为运输中状态
  statusCompleted: 'status_completed',
  statusCancelled: 'status_cancelled',
  recent: 'recent_transfers',
  newTransfer: 'new_transfer',
  exportExcel: 'export_excel',
  filterByStatus: 'filter_by_status',
  allStatuses: 'all_statuses',
  noTransfersFound: 'no_transfers_found',
  fromWarehouse: 'from_warehouse',
  toWarehouse: 'to_warehouse',
  actions: 'actions'
};

/**
 * 检查翻译键是否存在
 * @param key 翻译键
 * @returns 是否存在
 */
export function hasTranslationKey(key: string): boolean {
  return !!translations[key];
}

/**
 * 获取所有翻译键
 * @returns 翻译键列表
 */
export function getAllTranslationKeys(): string[] {
  return Object.keys(translations);
}

/**
 * 检查指定语言是否有该翻译键的翻译
 * @param key 翻译键
 * @param lang 语言代码
 * @returns 是否有翻译
 */
export function hasTranslationForLang(key: string, lang: string): boolean {
  return !!translations[key]?.[lang];
}

/**
 * 导出翻译文本
 * @param lang 语言代码
 * @returns 该语言的所有翻译
 */
export function exportTranslationsForLang(lang: string): Record<string, string> {
  const result: Record<string, string> = {};
  
  Object.entries(translations).forEach(([key, value]) => {
    if (value && typeof value === 'object' && lang in value) {
      result[key] = value[lang];
    }
  });
  
  return result;
}

/**
 * 计算翻译完成情况
 * @returns 各语言的翻译完成情况
 */
export function getTranslationStats(): Record<string, { total: number, completed: number, percentage: number }> {
  const stats: Record<string, { total: number, completed: number, percentage: number }> = {};
  const totalKeys = Object.keys(translations).length;
  
  // 支持的语言
  const languages = ['zh', 'en', 'ru', 'kk', 'uz'];
  
  languages.forEach(lang => {
    let completed = 0;
    
    Object.values(translations).forEach(value => {
      if (value && typeof value === 'object' && lang in value && value[lang]) {
        completed++;
      }
    });
    
    const percentage = totalKeys > 0 ? Math.round((completed / totalKeys) * 100) : 0;
    
    stats[lang] = {
      total: totalKeys,
      completed,
      percentage
    };
  });
  
  return stats;
}

/**
 * 获取缺失翻译的键
 * @param lang 语言代码
 * @returns 缺失翻译的键列表
 */
export function getMissingTranslations(lang: string): string[] {
  const missing: string[] = [];
  
  Object.entries(translations).forEach(([key, value]) => {
    if (!value || typeof value !== 'object' || !(lang in value) || !value[lang]) {
      missing.push(key);
    }
  });
  
  return missing;
}

/**
 * 生成调试日志
 * 记录当前语言状态和翻译统计信息
 */
export function logTranslationDebug(): void {
  console.log('=== 翻译调试信息 ===');
  console.log('当前语言:', i18n.language);
  console.log('支持的语言:', i18n.languages);
  console.log('翻译统计:', getTranslationStats());
  
  // 检查常用翻译键
  const commonKeys = ['app_name', 'login', 'logout', 'dashboard', 'settings'];
  console.log('常用翻译键检查:');
  commonKeys.forEach(key => {
    console.log(`- ${key}: ${hasTranslationKey(key) ? '存在' : '不存在'}`);
    if (hasTranslationKey(key)) {
      console.log(`  中文: ${hasTranslationForLang(key, 'zh') ? '✓' : '✗'}`);
      console.log(`  英文: ${hasTranslationForLang(key, 'en') ? '✓' : '✗'}`);
    }
  });
}

/**
 * 根据当前语言获取正确的日期格式
 * @param date 日期对象
 * @returns 格式化的日期字符串
 */
export function getLocalizedDate(date: Date): string {
  const lang = i18n.language || 'zh';
  
  // 不同语言的日期格式
  const options: Intl.DateTimeFormatOptions = { 
    year: 'numeric', 
    month: 'long', 
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  };
  
  return new Intl.DateTimeFormat(lang, options).format(date);
}

/**
 * 根据当前语言获取数字格式
 * @param num 数字
 * @param options 格式化选项
 * @returns 格式化的数字字符串
 */
export function getLocalizedNumber(
  num: number, 
  options: Intl.NumberFormatOptions = {}
): string {
  const lang = i18n.language || 'zh';
  return new Intl.NumberFormat(lang, options).format(num);
}