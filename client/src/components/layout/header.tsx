import React, { useEffect, useState } from "react";
import { Link } from "wouter";
import { useTranslation } from "react-i18next";
import { Search, AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { LanguageSwitcher } from "../language-switcher";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { useToast } from "@/hooks/use-toast";
import { Badge } from "@/components/ui/badge";

interface HeaderProps {
  onMenuClick: () => void;
}

export function Header({ onMenuClick }: HeaderProps) {
  const { t } = useTranslation();
  const { addToast } = useToast();
  const [isGuestUser, setIsGuestUser] = useState(false);
  const [username, setUsername] = useState('用户');
  
  // 检查当前用户是否为访客用户
  useEffect(() => {
    try {
      const currentUserStr = localStorage.getItem('currentUser');
      if (currentUserStr) {
        const currentUser = JSON.parse(currentUserStr);
        setUsername(currentUser.username || '用户');
        
        // 检查是否为假阳性登录用户
        if (currentUser.fakePositive === true || currentUser.id === -1) {
          setIsGuestUser(true);
          
          // 给访客用户显示提示消息（仅显示一次）
          const guestNotified = sessionStorage.getItem('guest_notified');
          if (!guestNotified) {
            setTimeout(() => {
              toast.info("您当前以访客身份浏览，部分功能可能受限");
              sessionStorage.setItem('guest_notified', 'true');
            }, 1500);
          }
        }
      }
    } catch (error) {
      console.error('解析用户信息出错:', error);
    }
  }, [toast]);

  return (
    <header className="sticky top-0 z-30 flex h-14 items-center gap-4 border-b bg-background px-4 sm:px-6">
      <Button
        onClick={onMenuClick}
        variant="ghost"
        size="icon"
        className="md:hidden"
      >
        <svg
          xmlns="http://www.w3.org/2000/svg"
          width="24"
          height="24"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          className="h-6 w-6"
        >
          <line x1="4" x2="20" y1="12" y2="12" />
          <line x1="4" x2="20" y1="6" y2="6" />
          <line x1="4" x2="20" y1="18" y2="18" />
        </svg>
        <span className="sr-only">Toggle Menu</span>
      </Button>

      <div className="flex w-full items-center gap-2 md:ml-auto md:gap-4">
        <form className="ml-auto flex-1 sm:flex-initial">
          <div className="relative">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
            <input
              type="search"
              placeholder={t('search_placeholder')}
              className="w-full rounded-md border border-input bg-background py-2 pl-8 pr-4 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 sm:w-[300px] md:w-[200px] lg:w-[300px]"
            />
          </div>
        </form>

        <div className="flex items-center gap-2">
          {/* 访客用户标识 */}
          {isGuestUser && (
            <Badge variant="outline" className="gap-1 border-amber-500 text-amber-600">
              <AlertCircle className="h-3 w-3" />
              <span>访客模式</span>
            </Badge>
          )}
          
          <LanguageSwitcher />

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className="rounded-full border border-border"
              >
                <Avatar className="h-8 w-8">
                  <AvatarImage src="/avatar-user.png" alt="User" />
                  <AvatarFallback>{username ? username.charAt(0).toUpperCase() : 'U'}</AvatarFallback>
                </Avatar>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuLabel className="flex items-center gap-2">
                {t('my_account')}
                {isGuestUser && (
                  <Badge variant="outline" className="ml-1 text-xs border-amber-500 text-amber-600">
                    访客
                  </Badge>
                )}
              </DropdownMenuLabel>
              <DropdownMenuSeparator />
              
              {isGuestUser ? (
                <DropdownMenuItem asChild>
                  <Link to="/login" className="flex items-center gap-2">
                    <span>登录</span>
                    <Badge variant="secondary" className="ml-auto text-xs">获取完整功能</Badge>
                  </Link>
                </DropdownMenuItem>
              ) : (
                <>
                  <DropdownMenuItem asChild>
                    <Link to="/profile">{t('profile')}</Link>
                  </DropdownMenuItem>
                  <DropdownMenuItem asChild>
                    <Link to="/settings">{t('settings')}</Link>
                  </DropdownMenuItem>
                </>
              )}
              
              <DropdownMenuSeparator />
              <DropdownMenuItem asChild>
                <Link to="/login">{isGuestUser ? '登录' : t('logout')}</Link>
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
    </header>
  );
}