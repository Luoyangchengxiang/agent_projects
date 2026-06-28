#!/bin/bash
# Agent Monitor 一键停止脚本
# 用法: ./stop.sh [all|backend|frontend]

set -e

GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

log() {
    echo -e "${GREEN}[$(date +%H:%M:%S)]${NC} $1"
}

warn() {
    echo -e "${YELLOW}[$(date +%H:%M:%S)]${NC} $1"
}

stop_backend() {
    log "停止 Laravel 后端..."
    pkill -f "php artisan serve" 2>/dev/null && log "✅ 后端已停止" || warn "⚠️  后端未运行"
}

stop_frontend() {
    log "停止前端..."
    pkill -f "vite.*agent-web" 2>/dev/null && log "✅ 前端已停止" || warn "⚠️  前端未运行"
}

stop_ollama() {
    warn "⚠️  Ollama 保持运行（模型加载耗时，不建议停止）"
    warn "   如需停止: sudo systemctl stop ollama"
}

stop_db() {
    warn "⚠️  PostgreSQL 保持运行（数据库服务不建议停止）"
    warn "   如需停止: sudo systemctl stop postgresql"
}

case "${1:-app}" in
    app)
        log "🛑 停止 Agent Monitor 应用服务..."
        stop_backend
        stop_frontend
        log "✅ 应用服务已停止（数据库和 Ollama 保持运行）"
        ;;
    backend)
        stop_backend
        ;;
    frontend)
        stop_frontend
        ;;
    all)
        log "🛑 停止所有服务..."
        stop_backend
        stop_frontend
        stop_ollama
        stop_db
        ;;
    *)
        echo "用法: $0 [app|backend|frontend|all]"
        echo ""
        echo "参数说明:"
        echo "  app       - 停止应用服务 (默认，保留数据库和Ollama)"
        echo "  backend   - 仅停止后端"
        echo "  frontend  - 仅停止前端"
        echo "  all       - 停止所有服务"
        exit 1
        ;;
esac