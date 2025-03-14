console.log('检查前端是否正常加载');

// 检查DOM是否已加载
document.addEventListener('DOMContentLoaded', function() {
  console.log('DOM已完全加载和解析');
  console.log('Root元素：', document.getElementById('root'));
});

// 检查窗口是否已完全加载
window.addEventListener('load', function() {
  console.log('页面已完全加载，包括所有依赖资源');
  console.log('Root元素（load）：', document.getElementById('root'));
  
  // 检查React是否已加载
  if (window.React) {
    console.log('React已加载');
  } else {
    console.log('React未加载');
  }
});

// 监听错误
window.addEventListener('error', function(event) {
  console.error('捕获到全局错误:', event.message);
  console.error('错误位置:', event.filename, 'line:', event.lineno, 'column:', event.colno);
  console.error('错误对象:', event.error);
});
