# 更新日志 (CHANGELOG)

本项目遵循 [语义化版本](https://semver.org/lang/zh-CN/) 规范。

---

## [0.2.1] - 2026-06-23

### 🐛 Bug 修复

- **修复登录后重定向到登录页的竞态条件问题**
  - 根本原因：`init()` 和 `login()` 之间存在竞态条件，`init()` 的 `else` 分支会覆盖 `login()` 设置的 `isAuthenticated: true`
  - 修复方案：
    - `init()` 开始时检查 `isAuthenticated`，如果已登录则跳过初始化
    - 在 `else` 分支中，再次检查 token 是否存在
    - 如果 `init` 期间有了新 token，主动恢复登录状态
  - 新增 4 个 `init()` 竞态条件测试用例

### ✅ 测试

- 全部 30 个单元测试通过
- 新增测试覆盖：竞态条件场景、token 刷新、缓存用户信息

---

## [0.2.0] - 2026-06-22

### ✨ 新功能

- **客服 Agent 系统**
  - AI 自动回复（基于 Ollama 本地模型）
  - 人工接管功能
  - 客服管理后台页面 (`/chat`)
  - 实时对话界面

- **看板娘 Live2D 组件**
  - 静态 SVG 看板娘动画（因 Cubism 2 SDK CDN 不可用降级）
  - 环状交互菜单（`RadialMenu`）
  - 眼睛跟随鼠标效果
  - 浮动动画

- **看板娘形象选择**
  - 首次登录选择形象页面 (`/select-mascot`)
  - 形象绑定用户，不可更改

- **客服集成到看板娘**
  - 点击 💬 图标打开客服对话

### 🐛 Bug 修复

- 修复登录表单 `type="email"` 验证问题——改为 `type="text"` 支持用户名登录
- 修复认证 `init()` 异步问题——添加 `isLoading` 状态到 `ProtectedRoute`
- 简化 `request.js`——移除请求取消逻辑以避免重复初始化时请求被取消
- 修复 Live2D Cubism 2 SDK 加载失败——替换为静态 SVG 看板娘动画

### 📦 部署

- 创建一键部署脚本 `install.sh`（交互式配置、自动安装环境、Nginx 配置、systemd 服务）
- 创建 Docker 部署文件：
  - `agent-api/Dockerfile`（PHP 8.2 FPM Alpine）
  - `apps/web/Dockerfile`（Node.js 构建 + Nginx 托管）
  - `docker-compose.yml`（api, web, postgres, redis）

### 📚 文档

- 创建 VitePress 文档项目 (`apps/docs`)
- 快速开始指南
- Docker 部署指南
- 前端 README 和后端 README

---

## [0.1.0] - 2026-06-21

### ✨ 新功能

- **基础架构搭建**
  - 前端 Monorepo 结构（pnpm workspaces）
  - 后端 Laravel 11 + Sanctum 认证
  - PostgreSQL 主库 + Redis 缓存

- **暗色科技风格 UI**
  - 自定义暗色主题（主色调 `#06b6d4`）
  - 侧边栏导航、头部组件
  - 仪表盘、Agent 列表、执行日志页面

- **认证系统**
  - 登录/注册页面
  - JWT Token 认证
  - 受保护路由 (`ProtectedRoute`)
  - IP 检测中间件
  - API 限流（登录 5 次/分钟、注册 3 次/分钟）

- **Agent 管理**
  - Agent 列表页面
  - 执行日志页面
  - 仪表盘统计卡片

- **错误日志系统**
  - `ErrorType` 枚举（17 种错误类型）
  - `ErrorLog` 模型和控制器
  - 错误日志页面和统计卡片
  - PostgreSQL 语法兼容修复

- **DDoS 防护**
  - 后端限流中间件
  - 前端节流/防抖

### 🐛 Bug 修复

- 修复安全问题：替换 Laravel 欢迎页为通用 JSON 响应
- 配置错误处理隐藏框架详情

### ✅ 测试

- 后端 PHPUnit 测试
- 前端 Vitest 26 个用例通过

---

## [0.0.1] - 2026-06-20

### ✨ 初始化

- 项目初始化
- 技术栈选型
- 环境搭建（Node.js, pnpm, PHP, Composer, PostgreSQL, Redis）

---

## 版本号说明

- **主版本号 (MAJOR)**：不兼容的 API 变更
- **次版本号 (MINOR)**：向下兼容的功能性新增
- **修订号 (PATCH)**：向下兼容的问题修正
