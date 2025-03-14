// 简单的使用原有use-toast钩子，但不再导出自己的内部实现
// 这个文件是为了兼容现有代码，实际逻辑已经移到toast-context.tsx中
import { useToast as useToastContext, toast } from "./toast-context";

export { useToastContext as useToast, toast };