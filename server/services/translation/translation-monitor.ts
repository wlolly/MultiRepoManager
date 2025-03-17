/**
 * 翻译服务监控工具
 * 用于监控翻译服务的健康状态、错误率和性能
 */

// 监控指标接口
export interface TranslationMonitorMetrics {
  requestCount: number;      // 总请求数
  errorCount: number;        // 错误请求数
  errorRate: number;         // 错误率
  averageResponseTime: number; // 平均响应时间(毫秒)
  lastResetTime: Date;       // 上次重置时间
}

// 请求类型枚举
export enum RequestType {
  GET_ALL = 'get_all',
  GET_BY_LANGUAGE = 'get_by_language',
  UPSERT = 'upsert',
  DELETE = 'delete',
  SYNC_TO_FILE = 'sync_to_file',
  SYNC_TO_DB = 'sync_to_db'
}

// 翻译服务监控类 (单例模式)
export class TranslationMonitor {
  private static instance: TranslationMonitor;
  
  private errorCount: number = 0;
  private requestCount: number = 0;
  private lastResetTime: number = Date.now();
  private responseTimes: number[] = [];
  
  // 按请求类型划分的详细统计
  private requestStats: Record<RequestType, {
    requestCount: number;
    errorCount: number;
    responseTimes: number[];
  }> = {
    [RequestType.GET_ALL]: { requestCount: 0, errorCount: 0, responseTimes: [] },
    [RequestType.GET_BY_LANGUAGE]: { requestCount: 0, errorCount: 0, responseTimes: [] },
    [RequestType.UPSERT]: { requestCount: 0, errorCount: 0, responseTimes: [] },
    [RequestType.DELETE]: { requestCount: 0, errorCount: 0, responseTimes: [] },
    [RequestType.SYNC_TO_FILE]: { requestCount: 0, errorCount: 0, responseTimes: [] },
    [RequestType.SYNC_TO_DB]: { requestCount: 0, errorCount: 0, responseTimes: [] }
  };
  
  // 存储最近的错误信息
  private recentErrors: Array<{
    timestamp: Date;
    type: RequestType;
    message: string;
  }> = [];
  
  // 报警阈值
  private errorRateThreshold: number = 0.01; // 1%
  private responseTimeThreshold: number = 2000; // 2秒
  
  private constructor() {
    // 每小时重置计数
    setInterval(() => {
      this.resetCounters();
    }, 3600000); // 1小时
    
    console.log('[翻译监控] 监控服务已初始化');
  }
  
  /**
   * 获取单例实例
   */
  public static getInstance(): TranslationMonitor {
    if (!TranslationMonitor.instance) {
      TranslationMonitor.instance = new TranslationMonitor();
    }
    return TranslationMonitor.instance;
  }
  
  /**
   * 记录请求开始
   * @param type 请求类型
   * @returns 请求ID (用于计算响应时间)
   */
  public startRequest(type: RequestType): number {
    this.requestCount++;
    this.requestStats[type].requestCount++;
    return Date.now();
  }
  
  /**
   * 记录请求结束
   * @param type 请求类型
   * @param startTime 请求开始时间
   * @param success 是否成功
   * @param errorMessage 错误信息(可选)
   */
  public endRequest(type: RequestType, startTime: number, success: boolean, errorMessage?: string): void {
    const endTime = Date.now();
    const responseTime = endTime - startTime;
    
    // 记录响应时间
    this.responseTimes.push(responseTime);
    this.requestStats[type].responseTimes.push(responseTime);
    
    // 如果请求失败，记录错误
    if (!success) {
      this.errorCount++;
      this.requestStats[type].errorCount++;
      
      // 存储错误信息
      this.recentErrors.push({
        timestamp: new Date(),
        type,
        message: errorMessage || '未知错误'
      });
      
      // 保持最近错误列表在合理大小
      if (this.recentErrors.length > 100) {
        this.recentErrors.shift();
      }
      
      // 检查是否需要触发告警
      this.checkAlertThresholds(type);
    }
  }
  
  /**
   * 检查是否超过告警阈值
   * @param type 请求类型
   */
  private checkAlertThresholds(type: RequestType): void {
    // 检查总体错误率
    const errorRate = this.errorCount / this.requestCount;
    if (errorRate >= this.errorRateThreshold && this.requestCount >= 100) {
      this.triggerErrorRateAlert(errorRate);
    }
    
    // 检查特定类型的错误率
    const typeStats = this.requestStats[type];
    if (typeStats.requestCount >= 20) {
      const typeErrorRate = typeStats.errorCount / typeStats.requestCount;
      if (typeErrorRate >= this.errorRateThreshold) {
        this.triggerTypeErrorRateAlert(type, typeErrorRate);
      }
    }
    
    // 检查平均响应时间
    const avgResponseTime = this.getAverageResponseTime();
    if (avgResponseTime > this.responseTimeThreshold) {
      this.triggerResponseTimeAlert(avgResponseTime);
    }
  }
  
  /**
   * 触发错误率告警
   * @param errorRate 错误率
   */
  private triggerErrorRateAlert(errorRate: number): void {
    console.error(`[翻译监控告警] 总体错误率达到${(errorRate * 100).toFixed(2)}%，超过阈值${(this.errorRateThreshold * 100).toFixed(2)}%`);
    // 这里可以集成发送告警通知的逻辑
  }
  
  /**
   * 触发特定类型错误率告警
   * @param type 请求类型
   * @param errorRate 错误率
   */
  private triggerTypeErrorRateAlert(type: RequestType, errorRate: number): void {
    console.error(`[翻译监控告警] ${type}请求错误率达到${(errorRate * 100).toFixed(2)}%，超过阈值${(this.errorRateThreshold * 100).toFixed(2)}%`);
    // 这里可以集成发送告警通知的逻辑
  }
  
  /**
   * 触发响应时间告警
   * @param avgTime 平均响应时间
   */
  private triggerResponseTimeAlert(avgTime: number): void {
    console.error(`[翻译监控告警] 平均响应时间达到${avgTime.toFixed(2)}ms，超过阈值${this.responseTimeThreshold}ms`);
    // 这里可以集成发送告警通知的逻辑
  }
  
  /**
   * 获取平均响应时间
   * @returns 平均响应时间(毫秒)
   */
  private getAverageResponseTime(): number {
    if (this.responseTimes.length === 0) return 0;
    const sum = this.responseTimes.reduce((a, b) => a + b, 0);
    return sum / this.responseTimes.length;
  }
  
  /**
   * 重置计数器
   */
  private resetCounters(): void {
    this.errorCount = 0;
    this.requestCount = 0;
    this.responseTimes = [];
    this.lastResetTime = Date.now();
    
    // 重置各类型统计
    Object.keys(this.requestStats).forEach(key => {
      const type = key as RequestType;
      this.requestStats[type] = { requestCount: 0, errorCount: 0, responseTimes: [] };
    });
    
    console.log('[翻译监控] 计数器已重置');
  }
  
  /**
   * 获取监控指标
   * @returns 监控指标对象
   */
  public getMetrics(): TranslationMonitorMetrics {
    return {
      requestCount: this.requestCount,
      errorCount: this.errorCount,
      errorRate: this.requestCount > 0 ? this.errorCount / this.requestCount : 0,
      averageResponseTime: this.getAverageResponseTime(),
      lastResetTime: new Date(this.lastResetTime)
    };
  }
  
  /**
   * 获取特定类型的指标
   * @param type 请求类型
   * @returns 特定类型的监控指标
   */
  public getTypeMetrics(type: RequestType): {
    requestCount: number;
    errorCount: number;
    errorRate: number;
    averageResponseTime: number;
  } {
    const stats = this.requestStats[type];
    let avgTime = 0;
    
    if (stats.responseTimes.length > 0) {
      const sum = stats.responseTimes.reduce((a, b) => a + b, 0);
      avgTime = sum / stats.responseTimes.length;
    }
    
    return {
      requestCount: stats.requestCount,
      errorCount: stats.errorCount,
      errorRate: stats.requestCount > 0 ? stats.errorCount / stats.requestCount : 0,
      averageResponseTime: avgTime
    };
  }
  
  /**
   * 获取最近的错误
   * @param limit 最大数量
   * @returns 最近的错误列表
   */
  public getRecentErrors(limit: number = 10): Array<{
    timestamp: Date;
    type: RequestType;
    message: string;
  }> {
    return this.recentErrors.slice(-limit);
  }
  
  /**
   * 设置错误率告警阈值
   * @param threshold 阈值(0-1)
   */
  public setErrorRateThreshold(threshold: number): void {
    if (threshold >= 0 && threshold <= 1) {
      this.errorRateThreshold = threshold;
    }
  }
  
  /**
   * 设置响应时间告警阈值
   * @param threshold 阈值(毫秒)
   */
  public setResponseTimeThreshold(threshold: number): void {
    if (threshold > 0) {
      this.responseTimeThreshold = threshold;
    }
  }
}

// 导出单例实例
export const translationMonitor = TranslationMonitor.getInstance();