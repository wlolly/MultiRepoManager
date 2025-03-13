import { languageEnum } from "@shared/schema";

// This is a simplified language detector for demonstration
// In a real application, you might use a library like 'linguist' or 'github-linguist'
export function detectLanguage(files: string[]): string {
  // Count file extensions
  const extensionCount: Record<string, number> = {};
  
  files.forEach(file => {
    const extension = file.split('.').pop()?.toLowerCase() || '';
    if (extension) {
      extensionCount[extension] = (extensionCount[extension] || 0) + 1;
    }
  });
  
  // Map common extensions to languages
  const extensionToLanguage: Record<string, string> = {
    'js': 'javascript',
    'jsx': 'javascript',
    'ts': 'typescript',
    'tsx': 'typescript',
    'py': 'python',
    'java': 'java',
    'go': 'go',
    'rs': 'rust',
    'c': 'c',
    'cpp': 'cpp',
    'cc': 'cpp',
    'cs': 'csharp',
    'php': 'php',
    'rb': 'ruby',
    'swift': 'swift',
    'kt': 'kotlin'
  };
  
  // Find the most common extension
  let maxCount = 0;
  let mostCommonExtension = '';
  
  for (const [extension, count] of Object.entries(extensionCount)) {
    if (count > maxCount) {
      maxCount = count;
      mostCommonExtension = extension;
    }
  }
  
  // Map to language
  const language = extensionToLanguage[mostCommonExtension] || 'other';
  
  // Ensure it's in our enum values
  return Object.values(languageEnum.enumValues).includes(language) ? language : 'other';
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
