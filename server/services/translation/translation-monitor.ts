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
  
  // 存储告警历史
  private alertHistory: Array<{
    timestamp: Date;
    type: string;  // 'error_rate', 'response_time', 'consecutive_errors'
    value: number;
    threshold: number;
    message: string;
    actionTaken?: string;
  }> = [];
  
  // 连续错误计数器
  private consecutiveErrors: Record<RequestType, number> = {
    [RequestType.GET_ALL]: 0,
    [RequestType.GET_BY_LANGUAGE]: 0,
    [RequestType.UPSERT]: 0,
    [RequestType.DELETE]: 0,
    [RequestType.SYNC_TO_FILE]: 0,
    [RequestType.SYNC_TO_DB]: 0
  };
  
  // 服务降级状态
  private degraded: boolean = false;
  private lastAlertTime: number = 0;
  
  // 告警配置
  private monitorConfig = {
    errorRateThreshold: 0.01,         // 错误率阈值 (1%)
    responseTimeThreshold: 2000,      // 响应时间阈值 (毫秒)
    criticalErrorRate: 0.05,          // 严重错误率阈值 (5%)
    minRequestsForAlert: 20,          // 触发告警的最小请求数
    autoDegradation: true,            // 是否启用自动降级
    autoRollback: true,               // 是否启用自动回滚
    alertCooldown: 300000,            // 告警冷却时间 (毫秒)
    maxConsecutiveErrors: 5,          // 最大连续错误数
    logLevel: 'info'                  // 日志级别 (debug, info, warn, error)
  };
  
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
    
    if (success) {
      // 请求成功，重置连续错误计数
      this.consecutiveErrors[type] = 0;
    } else {
      // 请求失败，记录错误
      this.errorCount++;
      this.requestStats[type].errorCount++;
      
      // 更新连续错误计数器
      this.consecutiveErrors[type]++;
      
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
    // 检查是否处于告警冷却期
    const now = Date.now();
    if (now - this.lastAlertTime < this.monitorConfig.alertCooldown) {
      return;
    }
    
    // 检查总体错误率
    const errorRate = this.errorCount / this.requestCount;
    if (errorRate >= this.monitorConfig.errorRateThreshold && 
        this.requestCount >= this.monitorConfig.minRequestsForAlert) {
      this.triggerErrorRateAlert(errorRate);
    }
    
    // 检查特定类型的错误率
    const typeStats = this.requestStats[type];
    if (typeStats.requestCount >= this.monitorConfig.minRequestsForAlert) {
      const typeErrorRate = typeStats.errorCount / typeStats.requestCount;
      if (typeErrorRate >= this.monitorConfig.errorRateThreshold) {
        this.triggerTypeErrorRateAlert(type, typeErrorRate);
      }
    }
    
    // 检查平均响应时间
    const avgResponseTime = this.getAverageResponseTime();
    if (avgResponseTime > this.monitorConfig.responseTimeThreshold) {
      this.triggerResponseTimeAlert(avgResponseTime);
    }
    
    // 检查连续错误计数是否超过阈值
    if (this.consecutiveErrors[type] >= this.monitorConfig.maxConsecutiveErrors) {
      this.triggerConsecutiveErrorsAlert(type);
    }
    
    // 检查是否达到严重错误率，触发自动降级
    if (errorRate >= this.monitorConfig.criticalErrorRate && 
        this.monitorConfig.autoDegradation &&
        !this.degraded) {
      this.enableServiceDegradation(errorRate);
    }
  }
  
  /**
   * 触发错误率告警
   * @param errorRate 错误率
   */
  private triggerErrorRateAlert(errorRate: number): void {
    const message = `总体错误率达到${(errorRate * 100).toFixed(2)}%，超过阈值${(this.monitorConfig.errorRateThreshold * 100).toFixed(2)}%`;
    console.error(`[翻译监控告警] ${message}`);
    
    // 记录告警历史
    this.alertHistory.push({
      timestamp: new Date(),
      type: 'error_rate',
      value: errorRate,
      threshold: this.monitorConfig.errorRateThreshold,
      message
    });
    
    this.lastAlertTime = Date.now();
  }
  
  /**
   * 触发特定类型错误率告警
   * @param type 请求类型
   * @param errorRate 错误率
   */
  private triggerTypeErrorRateAlert(type: RequestType, errorRate: number): void {
    const message = `${type}请求错误率达到${(errorRate * 100).toFixed(2)}%，超过阈值${(this.monitorConfig.errorRateThreshold * 100).toFixed(2)}%`;
    console.error(`[翻译监控告警] ${message}`);
    
    // 记录告警历史
    this.alertHistory.push({
      timestamp: new Date(),
      type: `error_rate_${type}`,
      value: errorRate,
      threshold: this.monitorConfig.errorRateThreshold,
      message
    });
    
    this.lastAlertTime = Date.now();
  }
  
  /**
   * 触发响应时间告警
   * @param avgTime 平均响应时间
   */
  private triggerResponseTimeAlert(avgTime: number): void {
    const message = `平均响应时间达到${avgTime.toFixed(2)}ms，超过阈值${this.monitorConfig.responseTimeThreshold}ms`;
    console.error(`[翻译监控告警] ${message}`);
    
    // 记录告警历史
    this.alertHistory.push({
      timestamp: new Date(),
      type: 'response_time',
      value: avgTime,
      threshold: this.monitorConfig.responseTimeThreshold,
      message
    });
    
    this.lastAlertTime = Date.now();
  }
  
  /**
   * 触发连续错误告警
   * @param type 请求类型
   */
  private triggerConsecutiveErrorsAlert(type: RequestType): void {
    const message = `${type}请求连续出错${this.consecutiveErrors[type]}次，超过阈值${this.monitorConfig.maxConsecutiveErrors}次`;
    console.error(`[翻译监控告警] ${message}`);
    
    // 记录告警历史
    this.alertHistory.push({
      timestamp: new Date(),
      type: 'consecutive_errors',
      value: this.consecutiveErrors[type],
      threshold: this.monitorConfig.maxConsecutiveErrors,
      message
    });
    
    // 重置连续错误计数
    this.consecutiveErrors[type] = 0;
    this.lastAlertTime = Date.now();
  }
  
  /**
   * 启用服务降级
   * @param errorRate 当前错误率
   */
  private enableServiceDegradation(errorRate: number): void {
    this.degraded = true;
    const message = `自动启用服务降级：错误率达到${(errorRate * 100).toFixed(2)}%，超过严重阈值${(this.monitorConfig.criticalErrorRate * 100).toFixed(2)}%`;
    console.error(`[翻译监控系统] ${message}`);
    
    // 记录降级操作
    this.alertHistory.push({
      timestamp: new Date(),
      type: 'auto_degradation',
      value: errorRate,
      threshold: this.monitorConfig.criticalErrorRate,
      message,
      actionTaken: '自动启用服务降级模式'
    });
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
      this.monitorConfig.errorRateThreshold = threshold;
    }
  }
  
  /**
   * 设置响应时间告警阈值
   * @param threshold 阈值(毫秒)
   */
  public setResponseTimeThreshold(threshold: number): void {
    if (threshold > 0) {
      this.monitorConfig.responseTimeThreshold = threshold;
    }
  }
  
  /**
   * 获取告警历史
   * @param limit 最大数量
   * @returns 最近的告警历史
   */
  public getAlertHistory(limit: number = 10): Array<{
    timestamp: Date;
    type: string;
    value: number;
    threshold: number;
    message: string;
    actionTaken?: string;
  }> {
    return this.alertHistory.slice(-limit);
  }
  
  /**
   * 获取当前降级状态
   * @returns 是否启用了服务降级
   */
  public isDegraded(): boolean {
    return this.degraded;
  }
  
  /**
   * 禁用服务降级
   * @param reason 禁用原因
   */
  public disableServiceDegradation(reason: string): void {
    if (!this.degraded) return;
    
    this.degraded = false;
    console.log(`[翻译监控系统] 禁用服务降级: ${reason}`);
    
    // 记录操作
    this.alertHistory.push({
      timestamp: new Date(),
      type: 'degradation_disabled',
      value: 0,
      threshold: 0,
      message: `禁用服务降级: ${reason}`,
      actionTaken: '手动禁用服务降级模式'
    });
  }
  
  /**
   * 更新监控配置
   * @param config 新的配置选项
   */
  public updateConfig(config: Partial<typeof this.monitorConfig>): void {
    // 合并配置，仅更新提供的字段
    this.monitorConfig = { ...this.monitorConfig, ...config };
    console.log('[翻译监控] 监控配置已更新');
  }
  
  /**
   * 获取当前监控配置
   */
  public getConfig(): typeof this.monitorConfig {
    return { ...this.monitorConfig };
  }
}

// 导出单例实例
export const translationMonitor = TranslationMonitor.getInstance();