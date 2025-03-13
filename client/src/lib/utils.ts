import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatDate(date: Date | string): string {
  if (typeof date === 'string') {
    date = new Date(date);
  }
  
  return new Intl.DateTimeFormat('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  }).format(date);
}

export function truncate(str: string, length = 100): string {
  if (!str) return '';
  return str.length > length ? `${str.substring(0, length)}...` : str;
}

export function getLanguageColor(language: string): string {
  const colorMap: Record<string, string> = {
    'javascript': '#f1e05a', // Yellow
    'typescript': '#3178c6', // Blue
    'python': '#3572A5',     // Blue
    'java': '#b07219',       // Brown/Orange
    'go': '#00ADD8',         // Cyan
    'rust': '#dea584',       // Rust
    'c': '#555555',          // Dark Gray
    'cpp': '#f34b7d',        // Pink
    'csharp': '#178600',     // Green
    'php': '#4F5D95',        // Purple
    'ruby': '#701516',       // Dark Red
    'swift': '#ffac45',      // Orange
    'kotlin': '#A97BFF',     // Purple
    'other': '#8b8b8b'       // Gray
  };
  
  return colorMap[language] || colorMap.other;
}
