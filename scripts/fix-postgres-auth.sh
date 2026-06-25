#!/bin/bash
# 修复PostgreSQL认证问题

echo "=========================================="
echo "🔧 修复PostgreSQL认证问题"
echo "=========================================="

# 颜色定义
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

# 查找pg_hba.conf
echo -e "${GREEN}[1/4] 查找pg_hba.conf文件...${NC}"
PG_HBA=$(sudo find /etc/postgresql -name "pg_hba.conf" 2>/dev/null | head -1)

if [ -z "$PG_HBA" ]; then
    echo "未找到pg_hba.conf，尝试其他位置..."
    PG_HBA=$(sudo find / -name "pg_hba.conf" 2>/dev/null | head -1)
fi

if [ -z "$PG_HBA" ]; then
    echo -e "${YELLOW}未找到pg_hba.conf，请手动查找${NC}"
    exit 1
fi

echo "找到: $PG_HBA"

# 备份原文件
echo -e "${GREEN}[2/4] 备份原文件...${NC}"
sudo cp "$PG_HBA" "${PG_HBA}.backup"
echo "备份完成: ${PG_HBA}.backup"

# 修改认证方式
echo -e "${GREEN}[3/4] 修改认证方式...${NC}"

# 将peer认证改为md5认证
sudo sed -i 's/local   all             all                                     peer/local   all             all                                     md5/' "$PG_HBA"
sudo sed -i 's/host    all             all             127.0.0.1\/32            scram-sha-256/host    all             all             127.0.0.1\/32            md5/' "$PG_HBA"
sudo sed -i 's/host    all             all             ::1\/128                 scram-sha-256/host    all             all             ::1\/128                 md5/' "$PG_HBA"

# 重启PostgreSQL
echo -e "${GREEN}[4/4] 重启PostgreSQL...${NC}"
sudo systemctl restart postgresql

echo ""
echo "=========================================="
echo -e "${GREEN}✅ 修复完成！${NC}"
echo "=========================================="
echo ""
echo "现在可以测试连接："
echo "  psql -U agent_monitor -d agent_monitor -c \"SELECT 1;\""
echo ""
echo "如果仍然失败，可能需要设置密码："
echo "  sudo -u postgres psql -c \"ALTER USER agent_monitor WITH PASSWORD 'agent_monitor_password';\""
echo ""
