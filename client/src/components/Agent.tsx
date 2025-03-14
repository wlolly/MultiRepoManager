
import { useState, useRef, useEffect } from 'react';
import axios from 'axios';

export function Agent() {
  const [messages, setMessages] = useState<{role: string, content: string}[]>([]);
  const [input, setInput] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  
  // 防抖节流控制
  const debounceTimeout = useRef<NodeJS.Timeout>();
  const lastRequestTime = useRef<number>(0);
  const retryCount = useRef<number>(0);
  const requestCache = useRef<Map<string, {data: any, timestamp: number}>>(new Map());
  
  const MIN_REQUEST_INTERVAL = 2000; // 最小请求间隔2秒
  const CACHE_DURATION = 5000; // 缓存有效期5秒
  const MAX_RETRIES = 3; // 最大重试次数

  // 清理过期缓存
  useEffect(() => {
    const interval = setInterval(() => {
      const now = Date.now();
      for (const [key, value] of requestCache.current.entries()) {
        if (now - value.timestamp > CACHE_DURATION) {
          requestCache.current.delete(key);
        }
      }
    }, CACHE_DURATION);
    
    return () => clearInterval(interval);
  }, []);

  const sendMessage = async () => {
    if (!input.trim() || isProcessing) return;

    const now = Date.now();
    if (now - lastRequestTime.current < MIN_REQUEST_INTERVAL) {
      console.log('请求过于频繁，请稍后再试');
      return;
    }

    // 检查缓存
    const cacheKey = JSON.stringify({ input, messages });
    const cached = requestCache.current.get(cacheKey);
    if (cached && now - cached.timestamp < CACHE_DURATION) {
      console.log('使用缓存的响应');
      handleResponse(cached.data);
      return;
    }

    // 清除之前的定时器
    if (debounceTimeout.current) {
      clearTimeout(debounceTimeout.current);
    }

    setIsProcessing(true);
    lastRequestTime.current = now;
    retryCount.current = 0;

    const tryRequest = async () => {
      try {
        const response = await axios.post('/api/agent/query', {
          query: input,
          history: messages
        });

        // 缓存响应
        requestCache.current.set(cacheKey, {
          data: response.data,
          timestamp: now
        });

        handleResponse(response.data);
      } catch (error) {
        console.error('Agent query failed:', error);
        
        if (retryCount.current < MAX_RETRIES) {
          retryCount.current++;
          console.log(`重试请求 (${retryCount.current}/${MAX_RETRIES})`);
          await new Promise(resolve => setTimeout(resolve, 1000));
          return tryRequest();
        }

        setMessages(prev => [...prev, 
          { role: 'user', content: input },
          { role: 'assistant', content: '抱歉，处理请求时发生错误，请稍后重试。' }
        ]);
        setIsProcessing(false);
      }
    };

    await tryRequest();
  };

  const handleResponse = (responseData: any) => {
    // 检查响应是否包含错误提示
    if (responseData.error) {
      setMessages(prev => [...prev, 
        { role: 'user', content: input },
        { role: 'assistant', content: `错误: ${responseData.error}. 建议: 请检查输入是否正确，或稍后重试。` }
      ]);
      return;
    }
    
    // 检查响应是否需要特别提醒
    if (responseData.warning) {
      setMessages(prev => [...prev, 
        { role: 'user', content: input },
        { role: 'assistant', content: `提醒: ${responseData.warning}` }
      ]);
      return;
    }
    
    setMessages(prev => [...prev, 
      { role: 'user', content: input },
      { role: 'assistant', content: responseData.reply }
    ]);ges(prev => [...prev, 
      { role: 'user', content: input },
      { role: 'assistant', content: responseData.reply }
    ]);
    setInput('');
    setIsProcessing(false);
  };

  return (
    <div className="agent-container">
      <div className="messages-container">
        {messages.map((message, index) => (
          <div key={index} className={`message ${message.role}`}>
            {message.content}
          </div>
        ))}
      </div>
      <div className="input-container">
        <input
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyPress={(e) => e.key === 'Enter' && sendMessage()}
          placeholder="输入消息..."
          disabled={isProcessing}
        />
        <button 
          onClick={sendMessage}
          disabled={isProcessing || !input.trim()}
        >
          {isProcessing ? '处理中...' : '发送'}
        </button>
      </div>
    </div>
  );
}
