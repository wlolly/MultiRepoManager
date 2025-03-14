// 为全局变量添加类型定义
interface Window {
  __TOAST_LISTENERS: Array<(state: any) => void>;
}