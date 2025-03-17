import React, { useEffect, useState } from 'react';
import axios from 'axios';
import { getSessionId, saveSessionId } from '@/lib/sessionSyncHelper';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';

/**
 * 会话测试页面
 * 用于测试和诊断前后端会话同步问题
 */
export default function SessionTestPage() {
  const [frontendSessionId, setFrontendSessionId] = useState<string>('加载中...');
  const [backendSessionId, setBackendSessionId] = useState<string>('加载中...');
  const [statusInfo, setStatusInfo] = useState<any>(null);
  const [customSessionId, setCustomSessionId] = useState<string>('');
  const [syncHistory, setSyncHistory] = useState<string[]>([]);
  const { toast } = useToast();

  useEffect(() => {
    // 获取前端会话ID
    const sessionId = getSessionId();
    setFrontendSessionId(sessionId || '未设置');

    // 获取后端会话状态
    fetchSessionStatus();
  }, []);

  // 获取后端会话状态
  const fetchSessionStatus = async () => {
    try {
      const response = await axios.get('/api/session-status');
      setStatusInfo(response.data.sessionInfo);
      setBackendSessionId(response.data.sessionInfo.sessionID || '未设置');
      
      // 添加到历史记录
      addToHistory(`[${new Date().toLocaleTimeString()}] 获取会话状态: ${response.data.sessionInfo.sessionID}`);
    } catch (error) {
      console.error('获取会话状态失败:', error);
      toast({
        title: '获取会话状态失败',
        description: (error as any).message || '请检查网络连接',
        variant: 'destructive'
      });
    }
  };

  // 同步会话
  const syncSession = async () => {
    try {
      const idToSync = customSessionId || getSessionId();
      if (!idToSync) {
        toast({ 
          title: '无法同步会话', 
          description: '没有有效的会话ID可同步',
          variant: 'destructive'
        });
        return;
      }

      // 同步会话
      addToHistory(`[${new Date().toLocaleTimeString()}] 正在同步会话: ${idToSync}`);
      
      const response = await axios.get(`/api/sync-session?sessionId=${idToSync}`);
      
      if (response.data.success) {
        toast({
          title: '会话同步成功',
          description: `会话ID: ${response.data.sessionId}`,
          variant: 'default'
        });
        
        // 更新前端会话ID
        saveSessionId(response.data.sessionId);
        setFrontendSessionId(response.data.sessionId);
        
        // 重新获取会话状态
        setTimeout(fetchSessionStatus, 500);
        
        addToHistory(`[${new Date().toLocaleTimeString()}] 同步成功: ${response.data.sessionId}`);
      } else {
        toast({
          title: '会话同步失败',
          description: response.data.message,
          variant: 'destructive'
        });
        
        addToHistory(`[${new Date().toLocaleTimeString()}] 同步失败: ${response.data.message}`);
      }
    } catch (error) {
      console.error('同步会话失败:', error);
      toast({
        title: '同步会话失败',
        description: (error as any).message || '请检查网络连接',
        variant: 'destructive'
      });
      
      addToHistory(`[${new Date().toLocaleTimeString()}] 同步错误: ${(error as any).message}`);
    }
  };

  // 生成新会话
  const generateNewSession = () => {
    const newSessionId = generateRandomSessionId();
    setCustomSessionId(newSessionId);
    
    toast({
      title: '已生成新会话ID',
      description: `准备同步: ${newSessionId}`,
      variant: 'default'
    });
    
    addToHistory(`[${new Date().toLocaleTimeString()}] 生成新会话: ${newSessionId}`);
  };

  // 生成随机会话ID
  const generateRandomSessionId = () => {
    return Array.from({ length: 32 }, () => 
      Math.floor(Math.random() * 16).toString(16)
    ).join('');
  };

  // 添加到历史记录
  const addToHistory = (message: string) => {
    setSyncHistory(prev => [message, ...prev.slice(0, 9)]);
  };

  return (
    <div className="container py-8">
      <h1 className="text-3xl font-bold mb-8">会话同步测试工具</h1>
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>会话状态</CardTitle>
            <CardDescription>前端和后端会话状态信息</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div>
                <Label>前端会话ID</Label>
                <div className="mt-1 p-2 bg-muted rounded-md font-mono text-sm break-all">
                  {frontendSessionId}
                </div>
              </div>
              
              <div>
                <Label>后端会话ID</Label>
                <div className="mt-1 p-2 bg-muted rounded-md font-mono text-sm break-all">
                  {backendSessionId}
                </div>
              </div>
              
              <div className="pt-4">
                <Label>会话状态匹配</Label>
                <div className={`mt-1 p-2 rounded-md font-mono text-sm ${
                  frontendSessionId === backendSessionId 
                    ? 'bg-green-100 text-green-800' 
                    : 'bg-red-100 text-red-800'
                }`}>
                  {frontendSessionId === backendSessionId 
                    ? '✅ 会话已同步' 
                    : '❌ 会话不同步'}
                </div>
              </div>
            </div>
          </CardContent>
          <CardFooter>
            <Button onClick={fetchSessionStatus} variant="outline" className="w-full">
              刷新状态
            </Button>
          </CardFooter>
        </Card>
        
        <Card>
          <CardHeader>
            <CardTitle>同步操作</CardTitle>
            <CardDescription>执行会话同步</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div>
                <Label htmlFor="customSessionId">自定义会话ID (可选)</Label>
                <div className="flex space-x-2 mt-1">
                  <Input
                    id="customSessionId"
                    value={customSessionId}
                    onChange={(e) => setCustomSessionId(e.target.value)}
                    placeholder="输入会话ID或使用生成按钮"
                    className="font-mono"
                  />
                  <Button variant="outline" onClick={generateNewSession}>
                    生成
                  </Button>
                </div>
              </div>
            </div>
          </CardContent>
          <CardFooter className="flex flex-col space-y-2">
            <Button onClick={syncSession} className="w-full">
              同步会话
            </Button>
            <p className="text-xs text-muted-foreground">
              点击同步会使前端会话ID与后端一致
            </p>
          </CardFooter>
        </Card>
      </div>
      
      <Card className="mt-6">
        <CardHeader>
          <CardTitle>会话详细信息</CardTitle>
          <CardDescription>从服务器获取的会话详情</CardDescription>
        </CardHeader>
        <CardContent>
          {statusInfo ? (
            <pre className="bg-muted p-4 rounded-md overflow-auto text-xs">
              {JSON.stringify(statusInfo, null, 2)}
            </pre>
          ) : (
            <p className="text-muted-foreground">未获取会话详情</p>
          )}
        </CardContent>
      </Card>
      
      <Card className="mt-6">
        <CardHeader>
          <CardTitle>同步历史记录</CardTitle>
          <CardDescription>最近的会话同步操作</CardDescription>
        </CardHeader>
        <CardContent>
          {syncHistory.length > 0 ? (
            <ul className="space-y-1">
              {syncHistory.map((entry, index) => (
                <li key={index} className="text-sm font-mono bg-muted p-2 rounded-md">
                  {entry}
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-muted-foreground">暂无同步历史记录</p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}