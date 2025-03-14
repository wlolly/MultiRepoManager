/**
 * 全局Toast工具
 * 提供统一的Toast消息接口，解决toast调用错误问题
 */

// 全局toast方法
// 这会暴露一个与window.toast兼容的全局toast对象

// 定义toast配置接口
interface ToastOptions {
  title?: string;
  description?: string;
  variant?: 'default' | 'destructive';
  duration?: number;
}

// 创建主toast函数和包含快捷方法的对象
export const toast = Object.assign(
  // 主toast函数
  (options: ToastOptions | string) => {
    if (typeof window === 'undefined' || !(window as any).__TOAST_LISTENERS) return;
    
    // 处理字符串参数
    if (typeof options === 'string') {
      options = { description: options };
    }
    
    // 触发toast事件
    (window as any).__TOAST_LISTENERS.forEach((listener: Function) => {
      listener(options);
    });
  },
  // 快捷方法
  {
    success: (message: string) => {
      if (typeof window !== 'undefined' && (window as any).toast) {
        (window as any).toast.success(message);
      } else if (typeof window !== 'undefined' && (window as any).__TOAST_LISTENERS) {
        (window as any).__TOAST_LISTENERS.forEach((listener: Function) => {
          listener({ description: message, variant: 'default' });
        });
      }
    },
    error: (message: string) => {
      if (typeof window !== 'undefined' && (window as any).toast) {
        (window as any).toast.error(message);
      } else if (typeof window !== 'undefined' && (window as any).__TOAST_LISTENERS) {
        (window as any).__TOAST_LISTENERS.forEach((listener: Function) => {
          listener({ description: message, variant: 'destructive' });
        });
      }
    },
    warning: (message: string) => {
      if (typeof window !== 'undefined' && (window as any).toast) {
        (window as any).toast.warning(message);
      } else if (typeof window !== 'undefined' && (window as any).__TOAST_LISTENERS) {
        (window as any).__TOAST_LISTENERS.forEach((listener: Function) => {
          listener({ description: message, variant: 'default' });
        });
      }
    },
    info: (message: string) => {
      if (typeof window !== 'undefined' && (window as any).toast) {
        (window as any).toast.info(message);
      } else if (typeof window !== 'undefined' && (window as any).__TOAST_LISTENERS) {
        (window as any).__TOAST_LISTENERS.forEach((listener: Function) => {
          listener({ description: message, variant: 'default' });
        });
      }
    }
  }
);

// 导出默认对象
export default toast;