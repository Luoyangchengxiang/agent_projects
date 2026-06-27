# Agent Monitor

AI Agent 监控系统 - 全栈 Web 应用

## 技术栈

| 层级 | 技术 |
|------|------|
| 前端 | React 18 + Vite 5 + Ant Design 5 + Zustand 4 |
| 后端 | Laravel 11 + Sanctum + PostgreSQL 16 |
| 图表 | ECharts + G6 知识图谱 |
| 部署 | Docker + Nginx |
| CI/CD | GitHub Actions |

## 功能模块

| 模块 | 说明 |
|------|------|
| 仪表盘 | 系统概览、实时统计 |
| Agent 管理 | CRUD、状态监控 |
| 错误日志 | 错误记录、解决标记 |
| 错误告警 | 阈值告警、Webhook 通知 |
| 性能监控 | CPU/内存/响应时间指标 |
| 知识图谱 | ECharts + G6 双引擎 |
| 定时任务 | 创建、暂停、恢复、执行 |
| 数据报告 | 周报/月报/选品报告 |
| 客服系统 | AI + 人工接管 |
| 版本更新 | 版本记录、通知中心 |
| 权限管理 | 角色权限控制 |

## 快速开始

### 克隆项目

```bash
git clone git@gitee.com:cheng_zhen_guo/agent-monitor.git
cd agent-monitor
```

### 后端

```bash
cd agent-api
composer install
cp .env.example .env
php artisan key:generate
php artisan migrate
php artisan serve --port=8000
```

### 前端

```bash
cd apps/web
pnpm install
pnpm dev
```

### Docker 一键部署

```bash
docker-compose up -d
# 访问 http://localhost
```

## 运行测试

```bash
# 前端测试 (160个)
cd apps/web && pnpm test

# 后端测试 (34个)
cd agent-api && vendor/bin/phpunit
```

## 项目结构

```
agent-monitor/
├── apps/web/                    # 前端
│   ├── src/
│   │   ├── pages/              # 13 个页面
│   │   ├── components/         # 通用组件
│   │   ├── services/           # API 服务
│   │   ├── stores/             # 状态管理
│   │   └── __tests__/          # 测试 (160个)
│   └── package.json
├── agent-api/                   # 后端
│   ├── app/
│   │   ├── Http/Controllers/   # 控制器 (7个)
│   │   ├── Http/Middleware/    # 中间件 (2个)
│   │   ├── Models/             # 模型 (8个)
│   │   └── Services/           # 服务 (2个)
│   ├── database/migrations/    # 迁移 (19个)
│   └── routes/api.php          # API 路由 (74个端点)
├── docs/                        # API 文档 (OpenAPI 3.0)
├── docs-site/                   # 教程文档 (VitePress)
├── docker-compose.yml           # Docker 配置
├── Dockerfile                   # 构建镜像
├── nginx.conf                   # Nginx 配置
└── .github/workflows/ci.yml    # CI/CD 流水线
```

## API 文档

- **OpenAPI 规范**: `docs/openapi.yaml`
- **使用指南**: `docs/API.md`
- **交互式文档**: `docs-site/` (VitePress)

## 测试覆盖

| 层级 | 测试数 |
|------|--------|
| 前端 Vitest | 160 |
| 后端 PHPUnit | 34 |
| **总计** | **194** |

## 部署

### Docker

```bash
docker-compose up -d
```

### CI/CD

Push to master 自动触发：
1. 前端 lint + test
2. 后端 PHPStan + PHPUnit
3. 所有检查通过后自动部署

## 相关链接

- **Gitee**: https://gitee.com/cheng_zhen_guo/agent-monitor
- **GitHub**: https://github.com/Luoyangchengxiang/agent_projects

## 开发者

- **Aaron_Cheng** - aaron_cheng0606@163.com
