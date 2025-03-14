import React, { useState } from "react";
import { Sidebar } from "./sidebar";
import { Header } from "./header";
import { Sheet, SheetContent } from "@/components/ui/sheet";

interface LayoutProps {
  children: React.ReactNode;
  hideSidebar?: boolean; // 添加一个属性来控制是否显示侧边栏
}

export function Layout({ children, hideSidebar = false }: LayoutProps) {
  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState(false);

  const toggleMobileSidebar = () => {
    setIsMobileSidebarOpen(!isMobileSidebarOpen);
  };

  return (
    <div className="flex h-screen overflow-hidden">
      {/* 桌面侧边栏 */}
      <div className="hidden md:block">
        <Sidebar />
      </div>
      
      {/* Mobile Sidebar */}
      <Sheet open={isMobileSidebarOpen} onOpenChange={setIsMobileSidebarOpen}>
        <SheetContent side="left" className="p-0 w-64">
          <Sidebar />
        </SheetContent>
      </Sheet>
      
      {/* Main Content Area */}
      <div className="flex-1 flex flex-col overflow-hidden">
        <Header onMenuClick={toggleMobileSidebar} />
        
        {/* Page Content */}
        <main className="flex-1 overflow-y-auto bg-gray-100 p-4 sm:p-6 lg:p-8">
          {children}
        </main>
      </div>
    </div>
  );
}
