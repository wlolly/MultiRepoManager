/**
 * Toast使用示例组件
 * 演示如何在其他组件中正确使用全局toast
 */

import React from 'react';
import toast from '../lib/toast';

/**
 * 在其他组件中，需要从lib/toast导入全局toast对象
 * 然后可以直接调用toast.success等方法显示消息
 */
export default function ToastUsageExample() {
  // 显示成功消息
  const showSuccessToast = () => {
    toast.success('操作成功完成');
  };

  // 显示错误消息
  const showErrorToast = () => {
    toast.error('操作失败，请重试');
  };

  // 显示警告消息
  const showWarningToast = () => {
    toast.warning('请注意，这是一个警告信息');
  };

  // 显示一般提示消息
  const showInfoToast = () => {
    toast.info('这是一条提示信息');
  };

  return (
    <div className="space-y-4">
      <h2 className="text-lg font-semibold">Toast使用示例</h2>
      <p className="text-sm text-gray-600">
        在组件中使用全局toast方法的示例，导入方式: <code className="bg-gray-100 p-1 rounded">import toast from '../lib/toast';</code>
      </p>
      
      <div className="flex flex-wrap gap-2">
        <button
          onClick={showSuccessToast}
          className="px-4 py-2 bg-green-500 text-white rounded hover:bg-green-600"
        >
          成功消息
        </button>
        <button
          onClick={showErrorToast}
          className="px-4 py-2 bg-red-500 text-white rounded hover:bg-red-600"
        >
          错误消息
        </button>
        <button
          onClick={showWarningToast}
          className="px-4 py-2 bg-yellow-500 text-white rounded hover:bg-yellow-600"
        >
          警告消息
        </button>
        <button
          onClick={showInfoToast}
          className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
        >
          提示消息
        </button>
      </div>
      
      <div className="bg-gray-50 p-4 rounded border">
        <h3 className="text-md font-semibold mb-2">使用说明</h3>
        <ol className="list-decimal list-inside space-y-1 text-sm">
          <li>从 <code className="bg-gray-100 p-1 rounded">../lib/toast</code> 导入toast对象</li>
          <li>使用 <code className="bg-gray-100 p-1 rounded">toast.success(消息)</code> 显示成功消息</li>
          <li>使用 <code className="bg-gray-100 p-1 rounded">toast.error(消息)</code> 显示错误消息</li>
          <li>使用 <code className="bg-gray-100 p-1 rounded">toast.warning(消息)</code> 显示警告消息</li>
          <li>使用 <code className="bg-gray-100 p-1 rounded">toast.info(消息)</code> 显示提示消息</li>
        </ol>
      </div>
    </div>
  );
}