import { useEffect } from "react";
import { useToast } from "./toast-provider";

export function Toaster() {
  const { state, removeToast } = useToast();
  const { toasts } = state;

  // 当toasts变化时，设置自动移除
  useEffect(() => {
    const timer = setTimeout(() => {
      if (toasts.length > 0) {
        removeToast(toasts[0].id);
      }
    }, 3000);

    return () => clearTimeout(timer);
  }, [toasts, removeToast]);

  if (toasts.length === 0) return null;

  return (
    <div className="fixed top-0 right-0 z-50 flex flex-col gap-2 p-4 max-w-sm w-full">
      {toasts.map((toast) => (
        <div 
          key={toast.id}
          className={`
            rounded-md p-4 shadow-md animate-in fade-in slide-in-from-right-5
            ${toast.type === "success" ? "bg-green-100 text-green-900" : 
              toast.type === "error" ? "bg-red-100 text-red-900" : 
              toast.type === "warning" ? "bg-yellow-100 text-yellow-900" : 
              "bg-gray-100 text-gray-900"}
          `}
        >
          {toast.title && (
            <h3 className="font-semibold">{toast.title}</h3>
          )}
          {toast.description && (
            <p className="text-sm mt-1">{toast.description}</p>
          )}
          <button 
            onClick={() => removeToast(toast.id)}
            className="absolute top-1 right-1 p-1 text-gray-500 hover:text-gray-700"
            aria-label="关闭"
          >
            ×
          </button>
        </div>
      ))}
    </div>
  );
}