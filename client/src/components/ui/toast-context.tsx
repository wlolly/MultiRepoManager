import React, { createContext, useContext, useReducer, useEffect } from "react";
import { v4 as uuidv4 } from "uuid";

// 定义Toast的类型
export type ToastProps = {
  id: string;
  title?: string;
  description?: string;
  action?: React.ReactNode;
  variant?: "default" | "destructive";
  duration?: number;
  onOpenChange?: (open: boolean) => void;
};

// 定义Toast状态类型
export type ToastState = {
  toasts: ToastProps[];
};

// 定义Action类型
type ToastAction =
  | { type: "ADD_TOAST"; toast: Omit<ToastProps, "id"> }
  | { type: "UPDATE_TOAST"; toast: Partial<ToastProps> & { id: string } }
  | { type: "DISMISS_TOAST"; toastId?: string }
  | { type: "REMOVE_TOAST"; toastId?: string };

// 初始状态
const initialState: ToastState = {
  toasts: [],
};

// 创建Context
export const ToastContext = createContext<{
  state: ToastState;
  dispatch: React.Dispatch<ToastAction>;
}>({
  state: initialState,
  dispatch: () => null,
});

// 创建一个reducer函数
const toastReducer = (state: ToastState, action: ToastAction): ToastState => {
  switch (action.type) {
    case "ADD_TOAST":
      return {
        ...state,
        toasts: [
          ...state.toasts,
          { ...action.toast, id: uuidv4() },
        ],
      };
    case "UPDATE_TOAST":
      return {
        ...state,
        toasts: state.toasts.map((t) =>
          t.id === action.toast.id ? { ...t, ...action.toast } : t
        ),
      };
    case "DISMISS_TOAST":
      return {
        ...state,
        toasts: state.toasts.map((t) =>
          t.id === action.toastId || action.toastId === undefined
            ? { ...t, open: false }
            : t
        ),
      };
    case "REMOVE_TOAST":
      if (action.toastId === undefined) {
        return {
          ...state,
          toasts: [],
        };
      }
      return {
        ...state,
        toasts: state.toasts.filter((t) => t.id !== action.toastId),
      };
    default:
      return state;
  }
};

// 创建一个Provider组件
export const ToastProvider = ({ children }: { children: React.ReactNode }) => {
  const [state, dispatch] = useReducer(toastReducer, initialState);

  return (
    <ToastContext.Provider value={{ state, dispatch }}>
      {children}
    </ToastContext.Provider>
  );
};

// 创建一个自定义Hook
export const useToast = () => {
  const { state, dispatch } = useContext(ToastContext);

  if (!ToastContext) {
    throw new Error("useToast must be used within a ToastProvider");
  }

  const toast = ({
    title,
    description,
    variant,
    action,
    duration = 3000,
    ...props
  }: Omit<ToastProps, "id">) => {
    const id = uuidv4();
    
    dispatch({
      type: "ADD_TOAST",
      toast: {
        title,
        description,
        variant,
        action,
        duration,
        ...props,
      },
    });

    return {
      id,
      dismiss: () => dispatch({ type: "DISMISS_TOAST", toastId: id }),
      update: (props: Partial<ToastProps>) =>
        dispatch({
          type: "UPDATE_TOAST",
          toast: { ...props, id },
        }),
    };
  };

  return {
    state,
    toast,
    dismiss: (toastId?: string) => dispatch({ type: "DISMISS_TOAST", toastId }),
    remove: (toastId?: string) => dispatch({ type: "REMOVE_TOAST", toastId }),
  };
};

// toast函数简化使用
export const toast = ({
  title,
  description,
  variant,
  action,
  duration = 3000,
  ...props
}: Omit<ToastProps, "id">) => {
  // 如果window上有监听器，使用它们
  if (typeof window !== "undefined" && window.__TOAST_LISTENERS) {
    const id = uuidv4();
    window.__TOAST_LISTENERS.forEach((listener) => {
      listener({
        type: "ADD_TOAST",
        toast: {
          title,
          description,
          variant,
          action,
          duration,
          ...props,
        },
      });
    });

    return {
      id,
      dismiss: () => {
        window.__TOAST_LISTENERS.forEach((listener) => {
          listener({
            type: "DISMISS_TOAST",
            toastId: id,
          });
        });
      },
      update: (props: Partial<ToastProps>) => {
        window.__TOAST_LISTENERS.forEach((listener) => {
          listener({
            type: "UPDATE_TOAST",
            toast: { ...props, id },
          });
        });
      },
    };
  }

  console.warn("Toast was called outside of ToastProvider or without listeners");
  return {
    id: "",
    dismiss: () => {},
    update: () => {},
  };
};

// 监听器注册 - 使window全局对象能够接收toast事件
if (typeof window !== "undefined") {
  window.__TOAST_LISTENERS = window.__TOAST_LISTENERS || [];
}