console.log('检查前端是否正常加载');

// 初始化加载计时器和状态
let loadingStartTime = Date.now();
let loadingStatus = 'pending'; // pending, waiting, completed, failed
let initialWaitTimer = null;
let dbWaitTimer = null;
let loadingProgressInterval = null;
let elapsedSeconds = 0;

// 更新加载状态提示
function updateLoadingStatus(message, color = 'inherit') {
  const statusElement = document.getElementById('loading-status');
  if (statusElement) {
    statusElement.textContent = message;
    statusElement.style.color = color;
  }
}

// 显示加载进度
function startLoadingProgress() {
  if (loadingProgressInterval) return;
  
  loadingStatus = 'waiting';
  updateLoadingStatus('正在等待数据库连接 (0秒)...');
  
  // 每秒更新计数器
  loadingProgressInterval = setInterval(() => {
    elapsedSeconds++;
    updateLoadingStatus(`正在等待数据库连接 (${elapsedSeconds}秒)...`);
    
    // 如果超过20秒，添加更多提示信息
    if (elapsedSeconds >= 20) {
      updateLoadingStatus(`数据库连接可能需要更长时间 (${elapsedSeconds}秒)...`, '#ff9900');
    }
    
    // 如果超过60秒，提示可能出现问题
    if (elapsedSeconds >= 60) {
      updateLoadingStatus(`数据库连接似乎遇到问题，应用将继续尝试连接 (${elapsedSeconds}秒)...`, '#ff6600');
    }
  }, 1000);
}

// 停止进度显示
function stopLoadingProgress() {
  if (loadingProgressInterval) {
    clearInterval(loadingProgressInterval);
    loadingProgressInterval = null;
  }
}

// 检查DOM是否已加载
document.addEventListener('DOMContentLoaded', function() {
  console.log('DOM已完全加载和解析');
  console.log('Root元素：', document.getElementById('root'));
  
  // 设置5秒钟的初始等待
  updateLoadingStatus('正在初始化应用程序...');
  initialWaitTimer = setTimeout(() => {
    console.log('开始5秒钟的初始等待时间...');
    startLoadingProgress();
    
    // 再给数据库5秒钟的额外时间
    dbWaitTimer = setTimeout(() => {
      // 如果仍未显示应用，可能数据库连接仍未就绪
      const rootElement = document.getElementById('root');
      if (rootElement && rootElement.children.length === 0) {
        console.log('5秒钟过后应用仍未显示，数据库可能仍在连接中...');
        updateLoadingStatus('数据库仍在连接中，请继续等待...');
      }
    }, 5000);
  }, 100);
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
  
  // 更新加载状态
  loadingStatus = 'failed';
  updateLoadingStatus(`加载过程中遇到错误: ${event.message}`, 'red');
});

// 监听应用已加载事件
window.addEventListener('app-loaded', function() {
  console.log('接收到应用已加载事件');
  loadingStatus = 'completed';
  
  // 清除所有计时器
  if (initialWaitTimer) clearTimeout(initialWaitTimer);
  if (dbWaitTimer) clearTimeout(dbWaitTimer);
  stopLoadingProgress();
  
  // 计算加载时间
  const loadingTime = ((Date.now() - loadingStartTime) / 1000).toFixed(2);
  console.log(`应用加载完成，总耗时: ${loadingTime}秒`);
});
