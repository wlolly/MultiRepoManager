import { useToast } from "../hooks/use-toast";

// 创建可导出的toast函数，解决toast调用问题
export function useToastFix() {
  const { toast } = useToast();
  
  const showToast = {
    success: (message: string) => {
      toast.success(message);
    },
    error: (message: string) => {
      toast.error(message);
    },
    warning: (message: string) => {
      toast.warning(message);
    },
    info: (message: string) => {
      toast.info(message);
    }
  };
  
  return showToast;
}

// 暴露一个简单的toast helper组件
export function ToastExample() {
  const toast = useToastFix();
  
  return (
    <div className="flex flex-col gap-2">
      <h2 className="text-lg font-semibold">Toast测试</h2>
      <div className="flex gap-2">
        <button 
          onClick={() => toast.success("成功提示")}
          className="px-3 py-1 bg-green-500 text-white rounded"
        >
          成功提示
        </button>
        <button 
          onClick={() => toast.error("错误提示")}
          className="px-3 py-1 bg-red-500 text-white rounded"
        >
          错误提示
        </button>
        <button 
          onClick={() => toast.warning("警告提示")}
          className="px-3 py-1 bg-yellow-500 text-white rounded"
        >
          警告提示
        </button>
        <button 
          onClick={() => toast.info("一般提示")}
          className="px-3 py-1 bg-blue-500 text-white rounded"
        >
          一般提示
        </button>
      </div>
    </div>
  );
}