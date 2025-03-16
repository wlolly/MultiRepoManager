/**
 * 翻译数据导入脚本
 * 将JSON文件中的翻译数据导入到数据库中
 */

import fs from 'fs';
import path from 'path';
import { db } from '../server/db';
import { translations, InsertTranslation } from '../shared/schema';
import { sql } from 'drizzle-orm';

// 翻译文件路径
const translationsFilePath = path.join(process.cwd(), 'public', 'locales', 'translations.json');

async function importTranslations() {
  try {
    console.log('开始导入翻译数据到数据库...');
    
    // 读取JSON文件
    const fileContent = fs.readFileSync(translationsFilePath, 'utf8');
    const translationsData = JSON.parse(fileContent);
    
    // 准备数据库插入
    const translationsToInsert: InsertTranslation[] = [];
    
    // 处理数据格式
    // 将 { key1: { zh: "值1", en: "Value1" } } 转换为 [{ key: "key1", language: "zh", value: "值1" }, ...]
    for (const key in translationsData) {
      const langValues = translationsData[key];
      
      for (const lang in langValues) {
        const value = langValues[lang];
        
        translationsToInsert.push({
          key,
          language: lang,
          value
        });
      }
    }
    
    console.log(`准备插入 ${translationsToInsert.length} 条翻译记录...`);
    
    // 批量插入数据
    const result = await db.insert(translations)
      .values(translationsToInsert)
      .onConflictDoUpdate({
        target: [translations.key, translations.language],
        set: { 
          value: sql`excluded.value`,
          updatedAt: new Date() 
        }
      });
    
    console.log(`成功导入翻译数据到数据库!`);
    return translationsToInsert.length;
  } catch (error) {
    console.error('导入翻译数据时出错:', error);
    throw error;
  }
}

// 直接执行导入
importTranslations()
  .then(count => {
    console.log(`导入完成，共 ${count} 条记录`);
    process.exit(0);
  })
  .catch(error => {
    console.error('导入失败:', error);
    process.exit(1);
  });