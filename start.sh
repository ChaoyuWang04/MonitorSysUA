#!/bin/bash

# MonitorSysUA 本地开发环境启动脚本

set -e

echo "🚀 启动 MonitorSysUA 系统（本地开发模式）..."
echo ""

# ========== 1. 检查PostgreSQL安装 ==========
echo "📦 检查 PostgreSQL..."
if ! command -v psql &> /dev/null; then
    echo "❌ 错误: PostgreSQL 未安装"
    echo ""
    echo "请根据您的操作系统安装 PostgreSQL 16:"
    echo "  macOS:   brew install postgresql@16"
    echo "  Ubuntu:  sudo apt install postgresql-16"
    echo "  Windows: https://www.postgresql.org/download/windows/"
    echo ""
    exit 1
fi

# ========== 2. 检查PostgreSQL服务状态 ==========
echo "🔍 检查 PostgreSQL 服务状态..."

# 检测操作系统
if [[ "$OSTYPE" == "darwin"* ]]; then
    # macOS
    if brew services list | grep -q "postgresql@16.*started"; then
        echo "✅ PostgreSQL 已运行"
    else
        echo "⚙️  启动 PostgreSQL 服务..."
        brew services start postgresql@16
        sleep 3
        echo "✅ PostgreSQL 已启动"
    fi
elif [[ "$OSTYPE" == "linux-gnu"* ]]; then
    # Linux
    if systemctl is-active --quiet postgresql; then
        echo "✅ PostgreSQL 已运行"
    else
        echo "⚙️  启动 PostgreSQL 服务..."
        sudo systemctl start postgresql
        sleep 3
        echo "✅ PostgreSQL 已启动"
    fi
else
    echo "⚠️  请手动确认 PostgreSQL 服务已启动"
fi

# ========== 3. 检查数据库是否存在 ==========
echo "🗄️  检查数据库..."
if psql -U postgres -lqt | cut -d \| -f 1 | grep -qw monitorua; then
    echo "✅ 数据库 'monitorua' 已存在"
else
    echo "⚙️  创建数据库 'monitorua'..."
    psql -U postgres -c "CREATE DATABASE monitorua;"
    echo "✅ 数据库创建完成"
fi

echo ""

# ========== 4. 检查Python虚拟环境 ==========
echo "🐍 检查 Python 虚拟环境..."

VENV_PATH="backend/venv"

if [ ! -d "$VENV_PATH" ]; then
    echo "⚠️  虚拟环境不存在,正在创建..."
    cd backend
    python3 -m venv venv
    cd ..
    echo "✅ 虚拟环境创建完成"
else
    echo "✅ 虚拟环境已存在"
fi

# ========== 5. 激活虚拟环境 ==========
echo "🔧 激活虚拟环境..."
source "$VENV_PATH/bin/activate"

# ========== 6. 安装/更新依赖 ==========
echo "📥 检查并安装依赖..."
cd backend
pip install -q -r requirements.txt
cd ..
echo "✅ 依赖安装完成"

echo ""

# ========== 7. 检查Google Ads配置文件 ==========
echo "🔑 检查 Google Ads 配置..."
if [ ! -f "googletest/google-ads.yaml" ]; then
    echo "⚠️  警告: Google Ads配置文件不存在"
    echo "   请确保 googletest/google-ads.yaml 文件存在并配置正确"
    echo ""
else
    echo "✅ Google Ads 配置文件存在"
fi

if [ ! -f "googletest/apitest-478007-6043fa24df4c.json" ]; then
    echo "⚠️  警告: Google Ads 凭据JSON文件不存在"
    echo ""
else
    echo "✅ Google Ads 凭据文件存在"
fi

echo ""

# ========== 8. 检查环境变量 ==========
if [ ! -f ".env" ]; then
    echo "⚠️  警告: .env 文件不存在,将使用默认配置"
    echo ""
fi

# ========== 9. 启动FastAPI服务 ==========
echo "🌐 启动 FastAPI 服务..."
echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

cd backend
uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload &
BACKEND_PID=$!
cd ..

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

# 等待服务启动
echo "⏳ 等待服务启动..."
sleep 5

# ========== 10. 健康检查 ==========
echo "🏥 执行健康检查..."
if curl -s http://localhost:8000/health > /dev/null 2>&1; then
    echo "✅ 服务健康检查通过"
else
    echo "⚠️  服务可能尚未完全启动,请稍等片刻"
fi

echo ""
echo "✅ 系统启动完成!"
echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
echo "📡 服务地址:"
echo "   - API文档(Swagger): http://localhost:8000/docs"
echo "   - API文档(ReDoc):   http://localhost:8000/redoc"
echo "   - 健康检查:          http://localhost:8000/health"
echo "   - PostgreSQL:        localhost:5432"
echo ""
echo "📝 常用命令:"
echo "   - 查看后端日志:  tail -f backend/logs/app.log (如果有日志文件)"
echo "   - 停止服务:      kill $BACKEND_PID  或按 Ctrl+C"
echo "   - 重启服务:      ./start.sh"
echo "   - 进入数据库:    psql -U postgres -d monitorua"
echo "   - 激活虚拟环境:  source backend/venv/bin/activate"
echo ""
echo "🧪 测试API:"
echo "   - 获取变更列表: curl http://localhost:8000/api/changes"
echo "   - 手动同步:     curl -X POST http://localhost:8000/api/sync/trigger"
echo "   - 同步状态:     curl http://localhost:8000/api/sync/status"
echo ""
echo "💡 提示:"
echo "   - 后端进程PID: $BACKEND_PID"
echo "   - 按 Ctrl+C 停止服务"
echo "   - 虚拟环境路径: backend/venv/"
echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

# 保持脚本运行,监听Ctrl+C
trap "echo ''; echo '🛑 正在停止服务...'; kill $BACKEND_PID; echo '✅ 服务已停止'; exit 0" INT TERM

wait $BACKEND_PID
