/**
 * 全局Toast工具
 * 提供统一的Toast消息接口，解决toast调用错误问题
 */

// 全局toast方法
// 这会暴露一个与window.toast兼容的全局toast对象

export const toast = {
  success: (message: string) => {
    if (typeof window !== 'undefined' && (window as any).toast) {
      (window as any).toast.success(message);
    }
  },
  error: (message: string) => {
    if (typeof window !== 'undefined' && (window as any).toast) {
      (window as any).toast.error(message);
    }
  },
  warning: (message: string) => {
    if (typeof window !== 'undefined' && (window as any).toast) {
      (window as any).toast.warning(message);
    }
  },
  info: (message: string) => {
    if (typeof window !== 'undefined' && (window as any).toast) {
      (window as any).toast.info(message);
    }
  }
};

// 导出默认对象
export default toast;