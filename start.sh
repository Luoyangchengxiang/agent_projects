#!/bin/bash
# Agent Monitor 一键启动脚本
# 用法: ./start.sh [all|db|ollama|backend|frontend]

set -e

PROJECT_DIR="/home/cheng/projects/agent-monitor"
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

log() {
    echo -e "${GREEN}[$(date +%H:%M:%S)]${NC} $1"
}

warn() {
    echo -e "${YELLOW}[$(date +%H:%M:%S)]${NC} $1"
}

check_port() {
    local port=$1
    if lsof -i :$port >/dev/null 2>&1; then
        return 0
    else
        return 1
    fi
}

start_db() {
    log "检查 PostgreSQL..."
    if systemctl is-active postgresql >/dev/null 2>&1; then
        log "✅ PostgreSQL 已运行"
    else
        log "启动 PostgreSQL..."
        sudo systemctl start postgresql
        log "✅ PostgreSQL 启动完成"
    fi
}

start_ollama() {
    log "检查 Ollama..."
    if check_port 11434; then
        log "✅ Ollama 已运行 (端口 11434)"
    else
        log "启动 Ollama..."
        nohup ollama serve > /tmp/ollama.log 2>&1 &
        sleep 3
        if check_port 11434; then
            log "✅ Ollama 启动完成"
        else
            warn "⚠️  Ollama 启动失败，请检查 /tmp/ollama.log"
        fi
    fi
}

start_backend() {
    log "检查 Laravel 后端..."
    if check_port 8000; then
        log "✅ 后端已运行 (端口 8000)"
    else
        log "启动 Laravel 后端..."
        cd "$PROJECT_DIR/agent-api"
        nohup php artisan serve > /tmp/agent-monitor-backend.log 2>&1 &
        sleep 2
        if check_port 8000; then
            log "✅ 后端启动完成"
        else
            warn "⚠️  后端启动失败，请检查 /tmp/agent-monitor-backend.log"
        fi
    fi
}

start_frontend() {
    log "检查前端..."
    if check_port 3000; then
        log "✅ 前端已运行 (端口 3000)"
    else
        log "启动前端..."
        cd "$PROJECT_DIR/apps/web"
        nohup npm run dev -- --host > /tmp/agent-monitor-frontend.log 2>&1 &
        sleep 5
        if check_port 3000; then
            log "✅ 前端启动完成"
        else
            warn "⚠️  前端启动失败，请检查 /tmp/agent-monitor-frontend.log"
        fi
    fi
}

show_status() {
    echo ""
    echo "=========================================="
    echo "  Agent Monitor 服务状态"
    echo "=========================================="
    echo ""
    
    # PostgreSQL
    if systemctl is-active postgresql >/dev/null 2>&1; then
        echo -e "PostgreSQL:    ${GREEN}✅ 运行中${NC}"
    else
        echo -e "PostgreSQL:    ${YELLOW}❌ 未运行${NC}"
    fi
    
    # Ollama
    if check_port 11434; then
        echo -e "Ollama:        ${GREEN}✅ 运行中${NC} (端口 11434)"
    else
        echo -e "Ollama:        ${YELLOW}❌ 未运行${NC}"
    fi
    
    # 后端
    if check_port 8000; then
        echo -e "后端 API:      ${GREEN}✅ 运行中${NC} (端口 8000)"
    else
        echo -e "后端 API:      ${YELLOW}❌ 未运行${NC}"
    fi
    
    # 前端
    if check_port 3000; then
        echo -e "前端:          ${GREEN}✅ 运行中${NC} (端口 3000)"
    else
        echo -e "前端:          ${YELLOW}❌ 未运行${NC}"
    fi
    
    echo ""
    echo "访问地址:"
    echo "  前端: http://localhost:3000"
    echo "  后端: http://localhost:8000"
    echo ""
}

# 主逻辑
case "${1:-all}" in
    db)
        start_db
        ;;
    ollama)
        start_ollama
        ;;
    backend)
        start_backend
        ;;
    frontend)
        start_frontend
        ;;
    all)
        log "🚀 开始启动 Agent Monitor 所有服务..."
        echo ""
        start_db
        start_ollama
        start_backend
        start_frontend
        show_status
        ;;
    status)
        show_status
        ;;
    *)
        echo "用法: $0 [all|db|ollama|backend|frontend|status]"
        echo ""
        echo "参数说明:"
        echo "  all       - 启动所有服务 (默认)"
        echo "  db        - 仅启动 PostgreSQL"
        echo "  ollama    - 仅启动 Ollama"
        echo "  backend   - 仅启动后端"
        echo "  frontend  - 仅启动前端"
        echo "  status    - 查看服务状态"
        exit 1
        ;;
esac