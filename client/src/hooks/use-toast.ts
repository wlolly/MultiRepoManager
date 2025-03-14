// 直接从toast-provider导入，避免循环引用
import { useToast as useToastInternal } from "@/components/ui/toast-provider";

export const useToast = useToastInternal;
