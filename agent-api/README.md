# Agent Monitor 后端 API

> 智能体监控系统 — Laravel 后端 API 服务

## 📋 项目简介

Agent Monitor API 是智能体监控系统的后端服务，基于 Laravel 12 构建，提供用户认证、Agent 管理、执行日志查询、错误日志记录与分析、客服对话系统等 RESTful API 接口。使用 PostgreSQL 作为主数据库，Redis 用于缓存和限流。

## 🛠 技术栈

| 类别 | 技术 | 版本 | 说明 |
|------|------|------|------|
| **语言** | PHP | ^8.2 | 后端开发语言 |
| **框架** | Laravel | ^12.0 | Web 应用框架 |
| **认证** | Laravel Sanctum | ^4.3 | API Token 认证 |
| **数据库** | PostgreSQL | 14+ | 主数据库 |
| **缓存** | Redis | 7.0+ | 缓存 + 限流计数 |
| **AI** | Ollama | - | 本地大模型服务（客服AI） |

## 📁 项目结构

```
agent-api/
├── README.md
├── composer.json
├── .env
│
├── app/
│   ├── Enums/
│   │   └── ErrorType.php                  # 错误类型枚举（17种）
│   ├── Exceptions/
│   │   └── Handler.php                    # 全局异常处理器
│   ├── Http/
│   │   ├── Controllers/
│   │   │   ├── Controller.php
│   │   │   └── Api/
│   │   │       ├── AuthController.php     # 认证控制器
│   │   │       ├── AgentController.php    # Agent CRUD
│   │   │       ├── DashboardController.php # 仪表盘
│   │   │       ├── ExecutionLogController.php # 执行日志
│   │   │       ├── ErrorLogController.php # 错误日志
│   │   │       └── ChatController.php     # ⭐ 客服对话控制器
│   │   └── Middleware/
│   │       ├── IpDetection.php            # IP检测
│   │       └── ApiRateLimit.php           # API限流
│   ├── Models/
│   │   ├── Agent.php
│   │   ├── AgentMetric.php
│   │   ├── ExecutionLog.php
│   │   ├── ErrorLog.php
│   │   ├── User.php
│   │   ├── Conversation.php               # ⭐ 对话模型
│   │   └── ChatMessage.php                # ⭐ 消息模型
│   └── Services/
│       └── OllamaService.php              # ⭐ Ollama AI服务
│
├── bootstrap/
│   └── app.php
│
├── config/
│   └── ollama.php                         # ⭐ Ollama配置
│
├── database/
│   ├── migrations/
│   │   ├── 2026_06_23_160000_create_agents_table.php
│   │   ├── 2026_06_23_160001_create_execution_logs_table.php
│   │   ├── 2026_06_23_160002_create_agent_metrics_table.php
│   │   ├── 2026_06_24_100000_create_error_logs_table.php
│   │   ├── 2026_06_25_000001_add_auth_fields_to_users_table.php
│   │   ├── 2026_06_25_112600_create_personal_access_tokens_table.php
│   │   └── 2026_06_25_200000_create_chat_tables.php  # ⭐ 对话+消息表
│   └── seeders/
│       ├── DatabaseSeeder.php
│       ├── AgentSeeder.php
│       └── AdminSeeder.php
│
├── routes/
│   ├── api.php
│   ├── web.php
│   └── console.php
```

## 📡 API 接口

### 认证

| 方法 | 路径 | 说明 | 认证 |
|------|------|------|:----:|
| POST | /api/auth/login | 登录 | ❌ |
| POST | /api/auth/register | 注册 | ❌ |
| GET | /api/auth/me | 当前用户 | ✅ |
| POST | /api/auth/logout | 退出 | ✅ |
| PUT | /api/auth/password | 改密码 | ✅ |

### 业务

| 方法 | 路径 | 说明 | 认证 |
|------|------|------|:----:|
| GET/POST | /api/agents | Agent列表/创建 | ✅ |
| GET | /api/execution-logs | 执行日志 | ✅ |
| GET | /api/dashboard/stats | 仪表盘统计 | ✅ |
| GET/DELETE | /api/error-logs | 错误日志 | ✅ |

### 客服系统

| 方法 | 路径 | 说明 | 认证 |
|------|------|------|:----:|
| POST | /api/chat/conversations | 创建/获取对话 | ✅ |
| GET | /api/chat/conversations | 对话列表（管理后台） | ✅ |
| GET | /api/chat/conversations/{id} | 对话详情+消息 | ✅ |
| POST | /api/chat/messages | 发送消息（AI自动回复） | ✅ |
| POST | /api/chat/takeover | 人工接管 | ✅ |
| POST | /api/chat/release | 释放给AI | ✅ |
| POST | /api/chat/close | 关闭对话 | ✅ |
| POST | /api/chat/human-reply | 人工客服回复 | ✅ |
| GET | /api/chat/status | 客服系统状态 | ✅ |

### 客服系统流程

```
用户发送消息
    ↓
POST /api/chat/messages
    ↓
检查对话模式
    ├─ mode=ai → 调用 Ollama → AI回复
    └─ mode=human → 不回复，等待人工

管理员接管
    ↓
POST /api/chat/takeover → mode 改为 human
    ↓
POST /api/chat/human-reply → 人工回复
    ↓
POST /api/chat/release → 释放给AI
```

## 🔐 认证系统

### 本地IP快捷登录

| IP段 | 说明 |
|------|------|
| 127.0.0.1 / ::1 | 本机回环 |
| 192.168.x.x | 局域网 |
| 10.x.x.x | 内网 |
| 172.x.x.x | 内网 |

账号：`admin` / `123456`

## 🛡 DDoS 防护

| 接口 | 每分钟限次 | 封禁时长 |
|------|:----------:|:--------:|
| /api/auth/login | 5次 | 15分钟 |
| /api/auth/register | 3次 | 30分钟 |
| 其他API | 60次 | 5分钟 |

## 🤖 Ollama 配置

```env
# .env
OLLAMA_BASE_URL=http://localhost:11434
OLLAMA_MODEL=qwen2.5:3b
OLLAMA_TIMEOUT=30
```

## 🐛 已修复的 Bug

| # | 问题 | 修复 |
|---|------|------|
| 1 | 路由优先级 | 自定义路由在 apiResource 之前 |
| 2 | PostgreSQL HOUR() | 改用 EXTRACT() |
| 3 | 根路径暴露框架 | 自定义 Handler.php |
| 4 | catch-all 干扰 | 移除 catch-all |
| 5 | API路由未启用 | withApiRoutes() |
| 6 | 视图缓存残留 | php artisan view:clear |
| 7 | Sanctum表缺失 | vendor:publish + migrate |
| 8 | 限流未区分接口 | 独立 ApiRateLimit 中间件 |

## 📄 License

MIT
