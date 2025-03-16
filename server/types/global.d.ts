/**
 * 全局类型声明文件
 * 用于定义Node.js全局变量和接口
 */

declare global {
  namespace NodeJS {
    interface Global {
      /**
       * 会话存储对象
       * 用于在不同请求之间持久化会话ID
       */
      sessionStorage?: Record<string, string>;
    }
  }

  /**
   * 会话缓存 - 用于在服务器端缓存会话信息
   * 避免每次请求都生成新的会话ID
   */
  var sessionStorage: Record<string, string>;
}

export {};