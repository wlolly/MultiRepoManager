# 仓库管理系统迁移清单

以下是从当前项目迁移到新Replit项目时需要包含的所有文件和目录。

## 核心目录
- [ ] `client/` - 前端React应用
- [ ] `server/` - 后端Express服务
- [ ] `shared/` - 共享的类型和模式定义
- [ ] `public/` - 静态资源
- [ ] `scripts/` - 辅助脚本

## 配置文件
- [ ] `.env` - 环境变量配置(包含数据库连接信息)
- [ ] `package.json` - 项目依赖和脚本
- [ ] `package-lock.json` - 依赖锁定文件
- [ ] `drizzle.config.ts` - Drizzle ORM配置
- [ ] `tsconfig.json` - TypeScript配置
- [ ] `vite.config.ts` - Vite构建配置
- [ ] `tailwind.config.ts` - Tailwind CSS配置
- [ ] `postcss.config.js` - PostCSS配置
- [ ] `theme.json` - UI主题配置

## 测试和辅助文件 (迁移包中提供)
- [ ] `test-server.js` - 测试服务器
- [ ] `test-frontend.jsx` - 测试前端组件
- [ ] `test.html` - 测试HTML页面
- [ ] `check-environment.js` - 环境检查脚本
- [ ] `setup.sh` - 环境设置脚本
- [ ] `README.md` - 迁移指南

## 迁移程序
1. 在Replit创建新项目
2. 上传或复制以上文件到新项目
3. 运行 `bash setup.sh` 准备环境
4. 安装依赖: `npm install`
5. 测试环境: `node check-environment.js`
6. 测试服务器: `node test-server.js`
7. 运行完整应用: `npm run dev`