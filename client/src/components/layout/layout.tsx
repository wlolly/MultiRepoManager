import React, { useState } from "react";
import { Sidebar } from "./sidebar";
import { Header } from "./header";
import { Sheet, SheetContent } from "@/components/ui/sheet";

interface LayoutProps {
  children: React.ReactNode;
  hideSidebar?: boolean;
}

export function Layout({ children, hideSidebar = false }: LayoutProps) {
  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState(false);

  const toggleMobileSidebar = () => {
    setIsMobileSidebarOpen(!isMobileSidebarOpen);
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* 在大屏幕上，Sidebar组件已经固定定位了 */}
      {/* 所以这里只需要为移动端添加抽屉式侧边栏 */}
      <div className="md:pl-64">
      
        {/* 移动侧边栏 - 点击菜单按钮时显示 */}
        <Sheet open={isMobileSidebarOpen} onOpenChange={setIsMobileSidebarOpen}>
          <SheetContent side="left" className="p-0 w-64 md:hidden">
            <Sidebar />
          </SheetContent>
        </Sheet>
        
        {/* 主内容区域 */}
        <div className="flex flex-col min-h-screen">
          <Header onMenuClick={toggleMobileSidebar} />
          
          <main className="flex-1 overflow-y-auto bg-gray-100 p-4 sm:p-6 lg:p-8">
            {children}
          </main>
        </div>
      </div>
    </div>
  );
}
