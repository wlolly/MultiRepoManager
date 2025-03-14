/**
 * 修复产品ID解析问题的脚本
 * 这个脚本会修改存储文件中的platformProductCode和platformProductId引用
 * 并替换为正确的platformCode和platformId
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

// 获取当前文件的目录路径
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// 要修改的文件路径
const filePath = path.join(__dirname, 'server', 'storage.ts');

// 读取文件内容
let content = fs.readFileSync(filePath, 'utf8');

// 替换所有platformProductCode为platformCode
content = content.replace(/platformProductCode/g, 'platformCode');

// 替换所有platformProductId为platformId
content = content.replace(/platformProductId/g, 'platformId');

// 移除所有isMatched不存在的属性
content = content.replace(/isMatched: (true|false)/g, 'matchedProductId: $1 ? matchedProducts[0].id : null');

// 保存修改后的文件
fs.writeFileSync(filePath, content);

console.log('文件修改完成，产品ID解析问题已修复');