# 项目概览

## 技术栈

| 层级 | 技术 | 版本 |
|------|------|------|
| 前端框架 | React | 18 |
| 构建工具 | Vite | 5 |
| UI 组件库 | Ant Design | 5 |
| 状态管理 | Zustand | 4 |
| 图表 | ECharts + G6 | - |
| 后端框架 | Laravel | 11 |
| 认证 | Sanctum | - |
| 数据库 | PostgreSQL | 16 |
| 容器化 | Docker + Docker Compose | - |
| CI/CD | GitHub Actions | - |

## 项目结构

```
agent-monitor/
├── apps/web/                    # 前端
│   ├── src/
│   │   ├── pages/              # 页面组件 (13个)
│   │   ├── components/         # 通用组件
│   │   ├── services/           # API 服务
│   │   ├── stores/             # Zustand 状态
│   │   ├── constants/          # 常量定义
│   │   ├── utils/              # 工具函数
│   │   ├── styles/             # 全局样式
│   │   └── __tests__/          # 测试文件
│   ├── package.json
│   └── vite.config.js
├── agent-api/                   # 后端
│   ├── app/
│   │   ├── Http/Controllers/   # 控制器
│   │   ├── Http/Middleware/    # 中间件
│   │   ├── Models/             # 数据模型
│   │   ├── Services/           # 业务服务
│   │   └── Enums/              # 枚举
│   ├── database/migrations/    # 数据库迁移
│   ├── routes/api.php          # API 路由
│   └── composer.json
├── docs/                        # API 文档
├── docs-site/                   # 教程文档 (VitePress)
├── docker-compose.yml           # Docker 配置
├── Dockerfile                   # 构建镜像
├── nginx.conf                   # Nginx 配置
└── .github/workflows/ci.yml    # CI/CD 流水线
```

## 功能模块

| 模块 | 说明 | 状态 |
|------|------|------|
| 仪表盘 | 系统概览、统计数据 | ✅ |
| Agent 管理 | CRUD、状态监控 | ✅ |
| 执行日志 | 任务执行记录 | ✅ |
| 错误日志 | 错误记录、解决标记 | ✅ |
| 错误告警 | 阈值告警、Webhook 通知 | ✅ |
| 性能监控 | CPU/内存/响应时间指标 | ✅ |
| 知识图谱 | ECharts + G6 双引擎 | ✅ |
| 定时任务 | 创建、暂停、恢复、手动执行 | ✅ |
| 数据报告 | 周报/月报/选品报告 | ✅ |
| 客服系统 | AI + 人工接管 | ✅ |
| 版本更新 | 版本记录、通知中心 | ✅ |
| 权限管理 | 角色、权限控制 | ✅ |

## 测试覆盖

- 前端：160 个测试用例
- 后端：34 个测试用例
- 总计：194 个测试用例
