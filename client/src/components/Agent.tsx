
import { useState, useEffect } from 'react';
import axios from 'axios';

export function Agent() {
  const [messages, setMessages] = useState<{role: string, content: string}[]>([]);
  const [input, setInput] = useState('');

  const sendMessage = async () => {
    if (!input.trim()) return;
    
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
    }
  };

  return (
    <div className="fixed bottom-4 right-4 w-96 bg-white shadow-lg rounded-lg p-4">
      <div className="h-64 overflow-y-auto mb-4">
        {messages.map((msg, i) => (
          <div key={i} className={`mb-2 ${msg.role === 'user' ? 'text-right' : ''}`}>
            <div className={`inline-block p-2 rounded ${
              msg.role === 'user' ? 'bg-blue-500 text-white' : 'bg-gray-100'
            }`}>
              {msg.content}
            </div>
          </div>
        ))}
      </div>
      <div className="flex gap-2">
        <input
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyPress={(e) => e.key === 'Enter' && sendMessage()}
          className="flex-1 p-2 border rounded"
          placeholder="输入消息..."
        />
        <button 
          onClick={sendMessage}
          className="px-4 py-2 bg-blue-500 text-white rounded"
        >
          发送
        </button>
      </div>
    </div>
  );
}

  return (
    <div className="fixed bottom-4 right-4 w-96 bg-white shadow-lg rounded-lg p-4">
      <div className="h-64 overflow-y-auto mb-4">
        {messages.map((msg, i) => (
          <div key={i} className={`mb-2 ${msg.role === 'user' ? 'text-right' : ''}`}>
            <div className={`inline-block p-2 rounded ${
              msg.role === 'user' ? 'bg-primary text-white' : 'bg-secondary'
            }`}>
              {msg.content}
            </div>
          </div>
        ))}
      </div>
      <div className="flex gap-2">
        <input
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyPress={(e) => e.key === 'Enter' && sendMessage()}
          className="flex-1 p-2 border rounded"
          placeholder="输入消息..."
        />
        <button 
          onClick={sendMessage}
          className="px-4 py-2 bg-primary text-white rounded"
        >
          发送
        </button>
      </div>
    </div>
  );
}
