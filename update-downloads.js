const fs = require('fs');
const path = require('path');

// 文件路径
const filePath = path.join(__dirname, 'server/routes.ts');

// 读取文件内容
let content = fs.readFileSync(filePath, 'utf8');

// 定义要替换的模式
const pattern = /\/\/ 设置响应头\s+const filename = path\.basename\(filePath\);\s+res\.setHeader\('Content-Disposition', `attachment; filename="\${filename}"`\);\s+res\.setHeader\('Content-Type', 'application\/vnd\.openxmlformats-officedocument\.spreadsheetml\.sheet'\);\s+\/\/ 发送文件并在完成后清理临时文件\s+res\.download\(filePath, filename, \(err\) => \{\s+if \(err\) \{\s+console\.error\("Download error:", err\);\s+\}\s+\s+\/\/ 无论成功或失败，都尝试删除临时文件\s+try \{\s+fs\.unlinkSync\(filePath\);\s+\} catch \(e\) \{\s+console\.error\("Error deleting temporary file:", e\);\s+\}\s+\}\);/g;

// 替换为新代码
const replacement = `      // 生成文件名
      const filename = path.basename(filePath);
      
      // 使用文件清理工具处理下载和清理
      downloadWithCleanup(res, filePath, filename);`;

// 执行替换
content = content.replace(pattern, replacement);

// 替换产品模板下载
const templatePattern = /res\.download\(templatePath, 'product_import_template\.xlsx'\);/g;
const templateReplacement = 'downloadWithCleanup(res, templatePath, "product_import_template.xlsx");';
content = content.replace(templatePattern, templateReplacement);

// 替换调拨单模板下载
const transferTemplatePattern = /res\.download\(templatePath, 'warehouse_transfer_template\.xlsx'\);/g;
const transferTemplateReplacement = 'downloadWithCleanup(res, templatePath, "warehouse_transfer_template.xlsx");';
content = content.replace(transferTemplatePattern, transferTemplateReplacement);

// 将修改后的内容写回文件
fs.writeFileSync(filePath, content);

console.log('文件下载方法已更新完成!');
