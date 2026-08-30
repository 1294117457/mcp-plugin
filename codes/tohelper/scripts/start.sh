#!/bin/bash
# Node-Task 系统启动脚本

set -e

echo "=========================================="
echo "  Node-Task 系统启动脚本"
echo "=========================================="
echo ""

# 1. 检查目录
echo "[1/4] 检查目录..."
if [ ! -d "/home/dustp/codes/mcp-plugin/codes/tohelper" ]; then
    echo "❌ 错误：tohelper 目录不存在"
    exit 1
fi

if [ ! -d "/home/dustp/codes/deepseek-harness" ]; then
    echo "❌ 错误：deepseek-harness 目录不存在"
    exit 1
fi
echo "✅ 目录检查通过"
echo ""

# 2. 编译 tohelper
echo "[2/4] 编译 tohelper..."
cd /home/dustp/codes/mcp-plugin/codes/tohelper
npm run build
if [ $? -ne 0 ]; then
    echo "❌ 错误：编译失败"
    exit 1
fi
echo "✅ 编译成功"
echo ""

# 3. 检查编译产物
echo "[3/4] 检查编译产物..."
if [ ! -f "dist/client.js" ]; then
    echo "❌ 错误：dist/client.js 不存在"
    exit 1
fi
echo "✅ 编译产物存在"
echo ""

# 4. 启动 dsh
echo "[4/4] 启动 dsh..."
echo "提示：使用 Ctrl+C 停止服务"
echo ""
cd /home/dustp/codes/deepseek-harness
pnpm dsh web --patch "/home/dustp/codes/mcp-plugin/codes/tohelper/cordis.patch.yml"
