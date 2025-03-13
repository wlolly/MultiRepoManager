import React from "react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Tooltip, TooltipTrigger, TooltipContent, TooltipProvider } from "@/components/ui/tooltip";

interface User {
  id: number;
  username: string;
  fullName?: string;
  avatarUrl?: string;
}

interface AvatarGroupProps {
  users: User[];
  limit?: number;
  size?: "sm" | "md" | "lg";
}

export function AvatarGroup({ users, limit = 3, size = "md" }: AvatarGroupProps) {
  const visibleUsers = users.slice(0, limit);
  const remainingCount = users.length - limit;
  
  const getSizeClass = () => {
    switch (size) {
      case "sm": return "h-6 w-6";
      case "lg": return "h-10 w-10";
      default: return "h-8 w-8";
    }
  };
  
  const sizeClass = getSizeClass();
  
  return (
    <div className="flex -space-x-2">
      {visibleUsers.map((user) => (
        <TooltipProvider key={user.id}>
          <Tooltip>
            <TooltipTrigger asChild>
              <Avatar className={`${sizeClass} border-2 border-white`}>
                <AvatarImage src={user.avatarUrl} alt={user.fullName || user.username} />
                <AvatarFallback>
                  {user.fullName 
                    ? `${user.fullName.split(' ')[0][0]}${user.fullName.split(' ')[1]?.[0] || ''}`
                    : user.username.substring(0, 2).toUpperCase()}
                </AvatarFallback>
              </Avatar>
            </TooltipTrigger>
            <TooltipContent>
              <p>{user.fullName || user.username}</p>
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>
      ))}
      
      {remainingCount > 0 && (
        <div className={`${sizeClass} bg-gray-200 flex items-center justify-center rounded-full border-2 border-white text-xs text-gray-600 font-medium`}>
          +{remainingCount}
        </div>
      )}
    </div>
  );
}
