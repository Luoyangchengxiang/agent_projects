# 自动恢复机制

## 概述

Agent Monitor 现在具有自动恢复功能，可以在 WSL 重启后自动检测并恢复丢失的数据。

## 组件

### 1. 自动恢复脚本 (`auto-restore.sh`)

**功能：**
- 检查 PostgreSQL 是否就绪
- 检测智能体数据是否丢失
- 如果数据丢失，自动运行 Seeder 恢复智能体
- 自动导入历史报告到数据库

**触发条件：**
- WSL 启动时（通过 cron @reboot）
- 手动运行

**使用方法：**
```bash
# 手动运行
./auto-restore.sh

# 查看日志
tail -f logs/auto-restore.log
```

### 2. 备份验证脚本 (`verify-backup.sh`)

**功能：**
- 检查备份文件是否存在
- 验证备份文件格式是否正常
- 检查备份是否是今天的
- 检查备份内容是否完整

**使用方法：**
```bash
# 手动运行
./verify-backup.sh

# 查看日志
tail -f logs/backup-verify.log
```

### 3. 定时任务

**已配置的 cron 任务：**

```bash
# 每天凌晨 2 点自动备份
0 2 * * * /home/cheng/projects/agent-monitor/backup-db.sh backup >> /home/cheng/projects/agent-monitor/backups/cron.log 2>&1

# WSL 启动时自动恢复
@reboot /home/cheng/projects/agent-monitor/auto-restore.sh
```

### 4. Systemd 服务（可选）

**服务文件位置：** `~/.config/systemd/user/agent-monitor-restore.service`

**启用服务：**
```bash
systemctl --user enable agent-monitor-restore.service
```

**注意：** WSL 的 systemd 用户服务可能不会在启动时自动运行，建议使用 cron @reboot 任务。

## 工作流程

```
WSL 启动
    ↓
PostgreSQL 启动
    ↓
cron @reboot 触发 auto-restore.sh
    ↓
检查智能体数量
    ↓ (数量为 0)
运行 Seeder 恢复智能体
    ↓
导入历史报告
    ↓
完成恢复
```

## 日志文件

- **自动恢复日志：** `logs/auto-restore.log`
- **备份验证日志：** `logs/backup-verify.log`
- **备份 cron 日志：** `backups/cron.log`

## 故障排除

### 1. 自动恢复失败

**检查日志：**
```bash
tail -f logs/auto-restore.log
```

**常见问题：**
- PostgreSQL 未启动
- 项目目录权限问题
- PHP 环境问题

### 2. 备份文件损坏

**手动备份：**
```bash
./backup-db.sh backup
```

**验证备份：**
```bash
./verify-backup.sh
```

### 3. 数据丢失但未自动恢复

**手动恢复：**
```bash
cd agent-api
php artisan db:seed --class=AgentSeeder --force
./auto-restore.sh
```

## 最佳实践

1. **定期检查备份** - 每周运行一次 `verify-backup.sh`
2. **重要操作前备份** - 运行 `./backup-db.sh backup`
3. **监控日志** - 定期检查 `logs/auto-restore.log`
4. **测试恢复** - 每月测试一次恢复流程

## 更新记录

- **2026-06-28** - 创建自动恢复机制
  - 添加 `auto-restore.sh` 脚本
  - 添加 `verify-backup.sh` 脚本
  - 配置 cron @reboot 任务
  - 创建 systemd 服务
