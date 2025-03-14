/**
 * 环境检查脚本
 * 用于验证新的Replit项目环境是否正确设置
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { execSync } from 'child_process';
import dotenv from 'dotenv';

// 加载环境变量
dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// 控制台颜色
const colors = {
  reset: '\x1b[0m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  magenta: '\x1b[35m',
  cyan: '\x1b[36m',
  white: '\x1b[37m'
};

// 帮助函数
function logSuccess(message) {
  console.log(`${colors.green}✓ ${message}${colors.reset}`);
}

function logWarning(message) {
  console.log(`${colors.yellow}⚠ ${message}${colors.reset}`);
}

function logError(message) {
  console.log(`${colors.red}✗ ${message}${colors.reset}`);
}

function logInfo(message) {
  console.log(`${colors.blue}ℹ ${message}${colors.reset}`);
}

function logHeader(message) {
  console.log(`\n${colors.cyan}=== ${message} ===${colors.reset}\n`);
}

// 检查目录是否存在
function checkDirectoryExists(dir) {
  const fullPath = path.join(process.cwd(), dir);
  if (fs.existsSync(fullPath) && fs.statSync(fullPath).isDirectory()) {
    logSuccess(`${dir}/ 目录存在`);
    return true;
  } else {
    logError(`${dir}/ 目录不存在`);
    return false;
  }
}

// 检查文件是否存在
function checkFileExists(file) {
  const fullPath = path.join(process.cwd(), file);
  if (fs.existsSync(fullPath) && fs.statSync(fullPath).isFile()) {
    logSuccess(`${file} 文件存在`);
    return true;
  } else {
    logError(`${file} 文件不存在`);
    return false;
  }
}

// 检查环境变量
function checkEnvironmentVariables() {
  const requiredVars = ['DATABASE_URL'];
  const missing = [];

  for (const v of requiredVars) {
    if (!process.env[v]) {
      missing.push(v);
    }
  }

  if (missing.length === 0) {
    logSuccess('所有必需的环境变量已设置');
    return true;
  } else {
    logError(`缺少环境变量: ${missing.join(', ')}`);
    return false;
  }
}

// 检查NPM依赖
function checkDependencies() {
  try {
    const packageJson = JSON.parse(fs.readFileSync(path.join(process.cwd(), 'package.json'), 'utf8'));
    const requiredDeps = [
      'drizzle-orm', 'mysql2', 'express', 'react', 'react-dom', 'vite',
      'typescript', 'tailwindcss', '@tanstack/react-query', 'zod', 'wouter'
    ];
    
    const missing = [];
    for (const dep of requiredDeps) {
      if (!packageJson.dependencies[dep] && !packageJson.devDependencies[dep]) {
        missing.push(dep);
      }
    }

    if (missing.length === 0) {
      logSuccess('所有必需的依赖项已在package.json中声明');
      return true;
    } else {
      logError(`package.json中缺少依赖项: ${missing.join(', ')}`);
      return false;
    }
  } catch (error) {
    logError(`读取package.json时出错: ${error.message}`);
    return false;
  }
}

// 运行环境检查
async function runEnvironmentCheck() {
  logHeader('仓库管理系统环境检查');
  
  console.log('检查目录结构...');
  const directories = ['client', 'server', 'shared', 'public'];
  const dirResults = directories.map(checkDirectoryExists);
  
  console.log('\n检查配置文件...');
  const files = ['.env', 'package.json', 'drizzle.config.ts', 'tsconfig.json', 'vite.config.ts'];
  const fileResults = files.map(checkFileExists);
  
  console.log('\n检查环境变量...');
  const envResult = checkEnvironmentVariables();
  
  console.log('\n检查依赖项...');
  const depsResult = checkDependencies();
  
  // 总结
  logHeader('检查结果');
  
  const totalChecks = dirResults.length + fileResults.length + 1 + 1; // 目录 + 文件 + 环境变量 + 依赖
  const passedChecks = dirResults.filter(r => r).length +
                      fileResults.filter(r => r).length +
                      (envResult ? 1 : 0) +
                      (depsResult ? 1 : 0);
  
  const percentage = Math.round((passedChecks / totalChecks) * 100);
  
  if (percentage === 100) {
    logSuccess(`所有检查通过! (${passedChecks}/${totalChecks})`);
    console.log('\n您的环境已准备就绪，可以运行应用程序了。');
    console.log('使用 npm run dev 启动应用。');
  } else if (percentage >= 80) {
    logWarning(`大部分检查通过 (${passedChecks}/${totalChecks} - ${percentage}%)`);
    console.log('\n环境基本准备就绪，但有一些问题需要解决。');
    console.log('修复上述错误后，再次运行此脚本。');
  } else {
    logError(`许多检查未通过 (${passedChecks}/${totalChecks} - ${percentage}%)`);
    console.log('\n您的环境未准备就绪。请执行以下操作:');
    console.log('1. 确保所有必要的目录和文件已创建');
    console.log('2. 检查.env文件是否包含正确的环境变量');
    console.log('3. 运行 npm install 安装所有依赖');
    console.log('4. 修复上述错误后，再次运行此脚本');
  }
}

// 执行检查
runEnvironmentCheck().catch(error => {
  console.error('执行环境检查时发生错误:', error);
});