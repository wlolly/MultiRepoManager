import { createContext, useContext, useReducer, ReactNode } from "react";

// 定义Toast类型
export type Toast = {
  id: string;
  title?: string;
  description?: string;
  type?: "default" | "success" | "error" | "warning";
  variant?: "default" | "destructive";
};

// 定义状态类型
type ToastState = {
  toasts: Toast[];
};

// 定义Action类型
type ToastAction =
  | { type: "ADD_TOAST"; toast: Toast }
  | { type: "REMOVE_TOAST"; id: string };

// 创建Context
export const ToastContext = createContext<{
  state: ToastState;
  addToast: (toast: Omit<Toast, "id">) => void;
  removeToast: (id: string) => void;
} | undefined>(undefined);

// 创建Reducer
const toastReducer = (state: ToastState, action: ToastAction): ToastState => {
  switch (action.type) {
    case "ADD_TOAST":
      return {
        ...state,
        toasts: [...state.toasts, action.toast],
      };
    case "REMOVE_TOAST":
      return {
        ...state,
        toasts: state.toasts.filter((t) => t.id !== action.id),
      };
    default:
      return state;
  }
};

// 创建Provider组件
export function ToastProvider({ children }: { children: ReactNode }) {
  const [state, dispatch] = useReducer(toastReducer, { toasts: [] });

  const addToast = (toast: Omit<Toast, "id">) => {
    const id = Math.random().toString(36).substring(2, 9);
    dispatch({ type: "ADD_TOAST", toast: { id, ...toast } });
  };

  const removeToast = (id: string) => {
    dispatch({ type: "REMOVE_TOAST", id });
  };

  // 设置全局访问
  if (typeof window !== "undefined") {
    (window as any).__TOAST_CONTEXT = { 
      addToast,
      removeToast,
      state
    };
    
    // 添加全局toast函数
    (window as any).toast = {
      success: (message: string) => {
        addToast({ title: "成功", description: message, type: "success" });
      },
      error: (message: string) => {
        addToast({ title: "错误", description: message, type: "error" });
      },
      warning: (message: string) => {
        addToast({ title: "警告", description: message, type: "warning" });
      },
      info: (message: string) => {
        addToast({ title: "提示", description: message, type: "default" });
      }
    };
  }

  return (
    <ToastContext.Provider value={{ state, addToast, removeToast }}>
      {children}
    </ToastContext.Provider>
  );
}

// 定义Toast函数类型
export interface ToastFunction {
  (props: {
    title?: string;
    description?: string;
    variant?: "default" | "destructive";
    type?: "default" | "success" | "error" | "warning";
  }): void;
  success: (message: string) => void;
  error: (message: string) => void;
  warning: (message: string) => void;
  info: (message: string) => void;
}

// 创建Hook
export function useToast() {
  const context = useContext(ToastContext);
  if (!context) {
    throw new Error("useToast must be used within a ToastProvider");
  }
  
  // 创建主toast函数
  const toast = ((props: {
    title?: string;
    description?: string;
    variant?: "default" | "destructive";
    type?: "default" | "success" | "error" | "warning";
  }) => {
    context.addToast({ 
      title: props.title, 
      description: props.description, 
      type: props.type || "default",
      variant: props.variant || "default" 
    });
  }) as ToastFunction;
  
  // 添加快捷方法
  toast.success = (message: string) => context.addToast({ 
    title: "成功", 
    description: message, 
    type: "success" 
  });
  
  toast.error = (message: string) => context.addToast({ 
    title: "错误", 
    description: message, 
    type: "error",
    variant: "destructive" 
  });
  
  toast.warning = (message: string) => context.addToast({ 
    title: "警告", 
    description: message, 
    type: "warning" 
  });
  
  toast.info = (message: string) => context.addToast({ 
    title: "提示", 
    description: message, 
    type: "default" 
  });
  
  // 返回完整的context加toast方法
  return {
    ...context,
    toast
  };
}