#!/bin/bash

# 仓库管理系统 - 迁移脚本
echo "==================================================="
echo "仓库管理系统迁移脚本"
echo "==================================================="
echo ""

# 检查环境变量
echo "正在检查环境变量..."
if [ ! -f .env ]; then
  echo "创建 .env 文件..."
  echo 'DATABASE_URL="mysql://root:%40Hzca1575%40@77.243.80.129:3307/wlolly"' > .env
  echo "✅ .env 文件已创建"
else
  echo "✅ .env 文件已存在"
fi

# 检查目录结构
echo ""
echo "正在检查目录结构..."
for dir in client server shared public scripts; do
  if [ ! -d "$dir" ]; then
    echo "创建 $dir 目录..."
    mkdir -p $dir
    echo "✅ $dir 目录已创建"
  else
    echo "✅ $dir 目录已存在"
  fi
done

# 创建测试页面
echo ""
echo "正在创建测试页面..."
if [ ! -d public ]; then
  mkdir -p public
fi

cp migration-package/test.html public/test.html
echo "✅ 测试页面已创建"

# 检查package.json
echo ""
echo "正在检查package.json..."
if [ ! -f package.json ]; then
  echo "⚠️ 未找到package.json文件"
  echo "您需要从原始项目中复制package.json文件"
else
  echo "✅ package.json文件已存在"
fi

# 环境就绪提示
echo ""
echo "==================================================="
echo "迁移准备就绪！"
echo "==================================================="
echo ""
echo "请确保以下文件和目录已正确迁移:"
echo "- client/ 目录 (前端代码)"
echo "- server/ 目录 (后端代码)"
echo "- shared/ 目录 (共享类型和模式)"
echo "- 所有配置文件 (.env, package.json, etc.)"
echo ""
echo "迁移后，请运行以下命令:"
echo "1. npm install          # 安装依赖"
echo "2. node test-server.js  # 测试服务器"
echo "3. npm run dev          # 启动完整应用"
echo ""
echo "如果遇到任何问题，请参考 README.md 文件"
echo "==================================================="