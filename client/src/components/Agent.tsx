
import { useState } from 'react';
import axios from 'axios';

export function Agent() {
  const [messages, setMessages] = useState<{role: string, content: string}[]>([]);
  const [input, setInput] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);

  const sendMessage = async () => {
    if (!input.trim() || isProcessing) return;
    
    setIsProcessing(true);
    
    try {
      const response = await axios.post('/api/agent/query', {
        query: input,
        history: messages
      });
      
      setMessages(prev => [...prev, 
        { role: 'user', content: input },
        { role: 'assistant', content: response.data.reply }
      ]);
      setInput('');
    } catch (error) {
      console.error('Agent query failed:', error);
      setMessages(prev => [...prev, 
        { role: 'user', content: input },
        { role: 'assistant', content: '抱歉，处理请求时发生错误，请稍后重试。' }
      ]);
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="flex flex-col h-full">
      <div className="flex-1 overflow-auto p-4 space-y-4">
        {messages.map((message, index) => (
          <div
            key={index}
            className={`flex ${
              message.role === 'user' ? 'justify-end' : 'justify-start'
            }`}
          >
            <div
              className={`max-w-[80%] rounded-lg p-3 ${
                message.role === 'user'
                  ? 'bg-primary text-primary-foreground'
                  : 'bg-muted'
              }`}
            >
              {message.content}
            </div>
          </div>
        ))}
      </div>
      <div className="flex flex-col gap-2 p-4 border-t">
        {isProcessing && (
          <div className="text-sm text-gray-500 text-center">
            正在处理您的请求...
          </div>
        )}
        <div className="flex gap-2">
          <input
            type="text"
            value={input}
            disabled={isProcessing}
            onChange={(e) => setInput(e.target.value)}
            onKeyPress={(e) => e.key === 'Enter' && sendMessage()}
            className="flex-1 p-2 border rounded"
            placeholder="输入您的问题..."
          />
          <button 
            onClick={sendMessage}
            disabled={isProcessing}
            className={`px-4 py-2 bg-primary text-white rounded ${isProcessing ? 'opacity-50 cursor-not-allowed' : ''}`}
          >
            {isProcessing ? '处理中...' : '发送'}
          </button>
        </div>
      </div>
    </div>
  );
}
