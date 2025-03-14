// 检查产品表中的数据，看哪些ID可用
import { config } from 'dotenv';
import { createConnection } from 'mysql2/promise';
import { fileURLToPath } from 'url';
import { dirname, resolve } from 'path';

// 获取当前文件的目录
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// 加载环境变量
config({ path: resolve(__dirname, '../.env') });

async function main() {
  try {
    console.log('数据库连接URL:', process.env.DATABASE_URL);
    
    // 从环境变量的数据库URL解析连接信息
    const url = new URL(process.env.DATABASE_URL);
    const user = url.username;
    const password = decodeURIComponent(url.password);
    const host = url.hostname;
    const port = url.port;
    const database = url.pathname.substring(1);
    
    console.log(`连接数据库:${host}:${port}/${database} (用户:${user})`);
    
    // 创建数据库连接
    const connection = await createConnection({
      host,
      port,
      user,
      password,
      database
    });
    
    // 查询产品表数据
    console.log('查询产品表数据...');
    const [rows] = await connection.query('SELECT id, name, barcode FROM products');
    
    console.log('产品表数据:');
    if (rows.length === 0) {
      console.log('产品表中没有数据');
    } else {
      console.table(rows);
    }
    
    // 关闭连接
    await connection.end();
    
  } catch (error) {
    console.error('脚本执行出错:', error);
  }
}

// 执行主函数
main().then(() => {
  console.log('脚本执行完毕');
}).catch((error) => {
  console.error('脚本执行失败:', error);
});