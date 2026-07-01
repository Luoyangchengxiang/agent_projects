# Agent Monitor

AI Agent 全栈监控系统 — 从开发到部署的完整解决方案

## 📖 项目简介

Agent Monitor 是一个 AI Agent 监控管理平台，提供 Agent 状态监控、错误告警、性能指标、知识图谱、定时任务、客服系统等功能。

## 🛠 技术栈

| 层级 | 技术 | 版本 |
|------|------|------|
| 前端框架 | React + Vite | 18 / 5 |
| UI 组件库 | Ant Design | 5 (暗色主题) |
| 状态管理 | Zustand | 4 |
| 图表 | ECharts + @antv/g6 | - |
| 后端框架 | Laravel + Sanctum | 11 |
| 数据库 | PostgreSQL | 16 |
| 测试 | Vitest + PHPUnit | 237+94=331 个 |
| 容器化 | Docker + Docker Compose | - |
| CI/CD | GitHub Actions | Node 22 LTS |

## 🚀 快速开始

### 方式一：本地开发

```bash
# 克隆项目
git clone git@gitee.com:cheng_zhen_guo/agent-monitor.git
cd agent-monitor

# 后端
cd agent-api
composer install
cp .env.example .env
php artisan key:generate
php artisan migrate
php artisan serve --port=8000

# 前端（新终端）
cd apps/web
pnpm install
pnpm dev
```

访问 http://localhost:3000

### 方式二：Docker 一键部署

```bash
docker-compose up -d
# 访问 http://localhost
```

## 📁 项目结构

```
agent-monitor/
├── apps/web/                    # 前端 React 应用
│   ├── src/
│   │   ├── pages/              # 13 个页面组件
│   │   ├── components/         # 通用组件（Header/Sidebar/G6Graph）
│   │   ├── services/           # API 服务封装
│   │   ├── stores/             # Zustand 状态管理
│   │   ├── constants/          # 常量定义
│   │   ├── utils/              # 工具函数
│   │   ├── styles/             # 全局样式 + Ant Design 暗色覆盖
│   │   └── __tests__/          # Vitest 测试 (237个)
│   ├── package.json
│   ├── vite.config.js          # Vite + API 代理
│   └── vitest.config.js
├── agent-api/                   # 后端 Laravel 应用
│   ├── app/
│   │   ├── Http/Controllers/   # 控制器 (7个模块)
│   │   ├── Http/Middleware/    # 限流 + CORS + 角色权限 中间件
│   │   ├── Models/             # Eloquent 模型 (14个)
│   │   └── Services/           # 业务服务
│   ├── database/migrations/    # 数据库迁移 (19个)
│   ├── routes/api.php          # API 路由 (74个端点)
│   ├── tests/                  # PHPUnit 测试 (94个)
│   └── composer.json
├── docs-site/                   # VitePress 教程文档站
│   ├── guide/                  # 开发教程（14篇）
│   ├── modules/                # 功能模块文档（4篇）
│   ├── api/                    # API 文档（5篇）
│   └── .vitepress/config.mjs
├── docs/
│   ├── openapi.yaml            # OpenAPI 3.0 规范
│   └── API.md                  # API 使用指南
├── docker-compose.yml           # Docker Compose 配置
├── Dockerfile                   # 多阶段构建
├── nginx.conf                   # Nginx 反向代理配置
└── .github/workflows/ci.yml    # CI/CD 流水线
```

## ✨ 功能模块

| 模块 | 说明 | 文档 |
|------|------|------|
| 🏠 仪表盘 | 系统概览、实时统计、图表 | - |
| 🤖 Agent 管理 | 树状结构、软删除、回收站、Modelfile 双向同步 | [API](docs-site/api/agents.md) |
| 📋 执行日志 | 任务执行记录、本地报告批量导入 | - |
| ❌ 错误日志 | 错误记录、解决标记 | - |
| 🚨 错误告警 | 阈值规则、Webhook 通知 | [文档](docs-site/modules/alerts.md) |
| 📊 性能监控 | CPU/内存/响应时间指标 | [文档](docs-site/modules/metrics.md) |
| 🕸 知识图谱 | 自动生成、Agent 变动实时同步、ECharts + G6 双引擎 | [文档](docs-site/modules/graph.md) |
| ⏰ 定时任务 | 创建、暂停、恢复、手动执行 | [文档](docs-site/modules/cronjobs.md) |
| 📄 数据报告 | 周报/月报/选品报告、Markdown 渲染 | - |
| 💬 客服系统 | AI + 人工接管 | - |
| 📢 版本更新 | 版本记录、通知中心 | - |
| 🔐 权限管理 | admin/support/user 角色权限控制 | - |
| 🎭 看板娘系统 | Live2D 形象、互动菜单、首次选择锁定 | - |
| 🔑 用户认证 | 注册/登录、验证码、用户名或邮箱登录、记住密码 | - |

## 🧪 测试

```bash
# 前端测试 (236 个用例)
cd apps/web && pnpm test

# 后端测试 (94 个用例，使用独立 testing schema，不影响生产数据)
cd agent-api && vendor/bin/phpunit
```

## 🔧 常用命令

```bash
# 知识图谱同步
php artisan graph:sync            # 增量同步
php artisan graph:sync --clear    # 清空重建

# 本地数据导入
php artisan data:import --all     # 导入执行日志 + 报告
php artisan data:import --logs    # 仅日志
php artisan data:import --reports # 仅报告

# 知识库构建
php artisan knowledge:build       # 构建客服 RAG 知识库
```

## 🐳 部署

### Docker

```bash
docker-compose up -d
```

### CI/CD

Push 到 master 自动触发：
1. 前端 lint + test（Node 22 LTS）
2. 后端 PHPStan + PHPUnit
3. 所有检查通过后可部署

### 公网穿透

```bash
# 使用 natapp
./natapp -authtoken=your_token
```

## 📚 文档

- **教程文档站**: `docs-site/` → `cd docs-site && pnpm dev`
- **OpenAPI 规范**: `docs/openapi.yaml`
- **API 使用指南**: `docs/API.md`

## 🐛 踩坑记录

| 问题 | 原因 | 解决 |
|------|------|------|
| 暗色弹框白底 | 静态方法不继承 ConfigProvider | 全局 CSS 覆盖 |
| 限流太严 | GET 也被限流 | 仅限写操作 |
| 时间显示错误 | 时区丢失 | 统一 UTC 存储 |
| icons 警告 | antd 5.0.0 fill-rule bug | 升级 @ant-design/icons |
| 502 错误 | 代理变量干扰 localhost | 开发时关闭代理 |
| CI Node 20 弃用 | pnpm 11.9 需要 Node 22 | 升级 Node 22 + actions v5 |

## 📮 联系方式

- **Gitee**: https://gitee.com/cheng_zhen_guo/agent-monitor
- **GitHub**: https://github.com/Luoyangchengxiang/agent_projects
- **作者**: Aaron_Cheng (aaron_cheng0606@163.com)
