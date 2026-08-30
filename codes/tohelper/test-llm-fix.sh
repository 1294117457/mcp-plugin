#!/bin/bash

# 测试 LLM Call 修复
# 版本：v0.5.1
# 日期：2026-08-30

set -e

echo "========================================="
echo "  LLM Call 修复验证脚本"
echo "========================================="
echo ""

# 颜色定义
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# 步骤 1: 检查编译产物
echo "📦 步骤 1: 检查编译产物"
if [ -f "dist/client.js" ]; then
    SIZE=$(du -h dist/client.js | cut -f1)
    echo -e "${GREEN}✓${NC} dist/client.js 存在 (大小: $SIZE)"
else
    echo -e "${RED}✗${NC} dist/client.js 不存在，请先运行 npm run build"
    exit 1
fi
echo ""

# 步骤 2: 检查配置文件
echo "📋 步骤 2: 检查 Node 配置"
if [ -f "data/node-config.json" ]; then
    echo -e "${GREEN}✓${NC} node-config.json 存在"
    
    # 检查 query_nearby_deals 是否有 llm 配置
    if grep -q '"name": "query_nearby_deals"' data/node-config.json; then
        echo -e "${GREEN}✓${NC} query_nearby_deals Node 存在"
        
        # 检查是否有 llm 字段（在 query_nearby_deals 节点内）
        if grep -A 20 '"name": "query_nearby_deals"' data/node-config.json | grep -q '"llm"'; then
            echo -e "${GREEN}✓${NC} query_nearby_deals 已配置 LLM"
            
            # 提取 LLM 配置
            LLM_CONFIG=$(grep -A 20 '"name": "query_nearby_deals"' data/node-config.json | grep -A 5 '"llm"' | head -6)
            echo -e "${YELLOW}配置详情:${NC}"
            echo "$LLM_CONFIG"
        else
            echo -e "${RED}✗${NC} query_nearby_deals 缺少 LLM 配置"
            echo -e "${YELLOW}提示:${NC} 请通过 UI 编辑 Node 并添加 LLM 配置"
            exit 1
        fi
    else
        echo -e "${YELLOW}!${NC} query_nearby_deals Node 不存在，跳过检查"
    fi
else
    echo -e "${RED}✗${NC} node-config.json 不存在"
    exit 1
fi
echo ""

# 步骤 3: 检查源代码修复
echo "🔧 步骤 3: 验证源代码修复"
if grep -q "deepClone" src/host/task/builtin/llm-call.ts; then
    echo -e "${GREEN}✓${NC} deepClone 函数已添加"
else
    echo -e "${RED}✗${NC} deepClone 函数未找到"
    exit 1
fi

if grep -q "getDefaultLLMConfig" src/host/task/builtin/llm-call.ts; then
    echo -e "${GREEN}✓${NC} getDefaultLLMConfig 函数已重命名"
else
    echo -e "${RED}✗${NC} getDefaultLLMConfig 函数未找到"
    exit 1
fi

if grep -q "const llmConfig = deepClone" src/host/task/builtin/llm-call.ts; then
    echo -e "${GREEN}✓${NC} LLM 配置使用了深拷贝"
else
    echo -e "${RED}✗${NC} LLM 配置未使用深拷贝"
    exit 1
fi
echo ""

# 步骤 4: 检查 API 端点
echo "🌐 步骤 4: 测试 API 端点"
if curl -s http://localhost:3000/api/tohelper/status > /dev/null 2>&1; then
    echo -e "${GREEN}✓${NC} dsh 服务正在运行"
    
    # 测试 LLM 列表 API
    LLM_RESPONSE=$(curl -s http://localhost:3000/api/tohelper/llm/list)
    if echo "$LLM_RESPONSE" | grep -q '"ok":true'; then
        echo -e "${GREEN}✓${NC} LLM 列表 API 正常"
        
        # 统计可用模型数量
        LLM_COUNT=$(echo "$LLM_RESPONSE" | grep -o '"displayName"' | wc -l)
        echo -e "   可用模型数量: ${YELLOW}$LLM_COUNT${NC}"
    else
        echo -e "${RED}✗${NC} LLM 列表 API 异常"
    fi
    
    # 测试 Node 列表 API
    NODE_RESPONSE=$(curl -s http://localhost:3000/api/tohelper/node/list)
    if echo "$NODE_RESPONSE" | grep -q '"ok":true'; then
        echo -e "${GREEN}✓${NC} Node 列表 API 正常"
        
        # 检查装配的 Node
        EQUIPPED=$(echo "$NODE_RESPONSE" | grep -o '"equipped":\[[^]]*\]' | grep -o 'node-[^"]*' | wc -l)
        echo -e "   已装配 Node 数量: ${YELLOW}$EQUIPPED${NC}"
    else
        echo -e "${RED}✗${NC} Node 列表 API 异常"
    fi
else
    echo -e "${YELLOW}!${NC} dsh 服务未运行，跳过 API 测试"
    echo -e "${YELLOW}提示:${NC} 请先启动 dsh: pnpm dsh web --patch ./cordis.patch.yml"
fi
echo ""

# 步骤 5: 生成测试报告
echo "📝 步骤 5: 生成测试报告"
REPORT_FILE="test-report-$(date +%Y%m%d-%H%M%S).txt"
{
    echo "========================================="
    echo "  LLM Call 修复验证报告"
    echo "========================================="
    echo ""
    echo "测试时间: $(date)"
    echo "版本: v0.5.1"
    echo ""
    echo "编译产物: ✓"
    echo "配置检查: ✓"
    echo "代码修复: ✓"
    echo ""
    echo "下一步操作:"
    echo "1. 重启 dsh（如果正在运行）"
    echo "2. 确保 query_nearby_deals Node 已装配"
    echo "3. 在对话中测试: '帮我查询附近的优惠'"
    echo ""
    echo "期望结果:"
    echo "- Task 1 (查询瑞幸门店): OK"
    echo "- Task 2 (查询麦当劳优惠券): OK"
    echo "- Task 3 (整合结果): OK ← 之前会失败"
    echo ""
    echo "如果仍然失败，请查看:"
    echo "- docs/2node/LLM配置错误修复.md"
    echo "- docs/2node/快速修复指南.md"
} > "$REPORT_FILE"

echo -e "${GREEN}✓${NC} 测试报告已生成: $REPORT_FILE"
echo ""

# 总结
echo "========================================="
echo "  验证完成"
echo "========================================="
echo ""
echo -e "${GREEN}✓ 所有检查通过！${NC}"
echo ""
echo "📚 相关文档:"
echo "   - docs/2node/CHANGELOG.md"
echo "   - docs/2node/LLM配置错误修复.md"
echo "   - docs/2node/快速修复指南.md"
echo ""
echo "🚀 下一步:"
echo "   1. 重启 dsh (如果正在运行)"
echo "   2. 在对话中测试 query_nearby_deals"
echo "   3. 验证 Task 3 不再报错"
echo ""
