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
    <div className="flex h-screen overflow-hidden">
      {/* 桌面侧边栏 - 在md以上显示 */}
      <div className="hidden md:flex md:flex-shrink-0">
        <Sidebar />
      </div>
      
      {/* 移动侧边栏 - 点击菜单按钮时显示 */}
      <Sheet open={isMobileSidebarOpen} onOpenChange={setIsMobileSidebarOpen}>
        <SheetContent side="left" className="p-0 w-64">
          <Sidebar />
        </SheetContent>
      </Sheet>
      
      {/* 主内容区域 */}
      <div className="flex-1 flex flex-col overflow-hidden">
        <Header onMenuClick={toggleMobileSidebar} />
        
        <main className="flex-1 overflow-y-auto bg-gray-100 p-4 sm:p-6 lg:p-8">
          {children}
        </main>
      </div>
    </div>
  );
}
