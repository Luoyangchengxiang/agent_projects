# Agent Monitor 前端

> 智能体监控系统 — 前端 Monorepo 项目

## 📋 项目简介

Agent Monitor 是一个智能体执行监控平台的前端部分，用于实时查看和管理各类 AI 智能体的运行状态、执行日志和错误信息。采用暗色科技风格（Dark Tech）设计主题。

## 🛠 技术栈

| 类别 | 技术 | 版本 | 说明 |
|------|------|------|------|
| **框架** | React | ^18.2.0 | 前端 UI 框架 |
| **构建工具** | Vite | ^5.0.0 | 开发服务器 + 打包 |
| **包管理** | pnpm | ^9.0.0 | Monorepo 工作区管理 |
| **UI 组件库** | Ant Design | ^5.0.0 | 表格、表单、弹窗等复杂组件 |
| **图标** | @ant-design/icons | ^5.0.0 | Ant Design 图标库 |
| **图标** | lucide-react | ^1.21.0 | 登录页动画用图标 |
| **CSS 工具** | Tailwind CSS | ^3.0.0 | 原子化 CSS 工具类 |
| **路由** | React Router | ^6.0.0 | 前端路由管理 |
| **状态管理** | Zustand | ^4.0.0 | 轻量级全局状态管理 |
| **数据请求** | Axios | ^1.0.0 | HTTP 客户端（封装了拦截器） |
| **数据请求** | TanStack Query | ^5.0.0 | 服务端状态管理 + 缓存 |
| **图表** | ECharts | ^5.0.0 | 数据可视化图表 |
| **Live2D** | pixi-live2d-display | ^0.4.0 | 看板娘 Live2D 渲染 |
| **Canvas** | pixi.js | ^6.0.0 | 2D 渲染引擎 |
| **测试** | Vitest | ^2.0.0 | 单元测试框架 |
| **测试** | @testing-library/react | ^16.0.0 | React 组件测试工具 |
| **语言** | JavaScript (JSX) | - | 主语言，TS 仅用于类型定义 |

## 📁 项目结构

```
agent-monitor/
├── README.md
├── package.json
├── pnpm-workspace.yaml
├── pnpm-lock.yaml
├── scripts/
│   └── install-deps.sh
│
└── apps/
    └── web/
        ├── package.json
        ├── index.html
        ├── vite.config.js
        ├── tailwind.config.js
        ├── postcss.config.js
        └── src/
            ├── main.jsx
            ├── App.jsx
            │
            ├── services/
            │   ├── tokenManager.js        # Token 存储管理
            │   ├── request.js             # Axios 封装（拦截器、限流、重试）
            │   ├── authService.js         # 认证 API
            │   └── chatService.js         # ⭐ 客服 API
            │
            ├── stores/
            │   ├── authStore.js           # 认证状态
            │   ├── chatStore.js           # ⭐ 客服对话状态
            │   └── mascotStore.js         # ⭐ 看板娘状态
            │
            ├── components/
            │   ├── MainLayout.jsx
            │   ├── Header.jsx
            │   ├── Sidebar.jsx
            │   ├── ProtectedRoute.jsx
            │   ├── ErrorStats.jsx
            │   ├── login-animation/       # 登录页动画
            │   │   ├── LoginPage.jsx
            │   │   ├── AnimatedCharacters.jsx
            │   │   ├── EyeBall.jsx
            │   │   ├── Pupil.jsx
            │   │   └── login.css
            │   ├── chat/                  # ⭐ 客服模块
            │   │   ├── ChatPanel.jsx       # 聊天面板
            │   │   ├── ChatButton.jsx      # 悬浮按钮
            │   │   └── chat.css
            │   └── mascot/                # ⭐ 看板娘模块
            │       ├── Mascot.jsx          # 看板娘主组件
            │       ├── Live2DRenderer.jsx  # Live2D 渲染
            │       ├── RadialMenu.jsx      # 环状菜单
            │       ├── mascot.css
            │       └── radial-menu.css
            │
            ├── pages/
            │   ├── Dashboard.jsx
            │   ├── AgentList.jsx
            │   ├── ExecutionLogs.jsx
            │   ├── ErrorLogs.jsx
            │   ├── Login.jsx
            │   ├── Register.jsx
            │   ├── ChatAdmin.jsx          # ⭐ 客服管理后台
            │   ├── chat-admin.css
            │   ├── MascotSelect.jsx       # ⭐ 看板娘形象选择
            │   └── mascot-select.css
            │
            ├── styles/
            │   ├── variables.css
            │   └── components.css
            │
            └── __tests__/
                ├── setup.js
                ├── tokenManager.test.js
                ├── authStore.test.js
                └── request.test.js
```

## 📚 使用文档

我们提供了详细的使用和安装指南，请访问 [文档站点](/apps/docs) 或查看以下内容：

- **[快速开始](/apps/docs/guide/)**: 环境要求与手动部署步骤。
- **[Docker 部署](/apps/docs/guide/docker)**: 使用 Docker Compose 一键部署。

## 🚀 快速开始

### 环境要求

- Node.js 18+
- pnpm 9+
- 后端 API 服务 (Laravel)

### 安装依赖

```bash
# 安装所有依赖（包括 web 应用）
pnpm install
```

### 启动

```bash
pnpm dev
```

访问 **http://localhost:3000**

### 运行测试

```bash
cd apps/web
pnpm test          # 运行一次
pnpm test:watch    # 监听模式
pnpm test:coverage # 覆盖率
```

## 🔐 认证系统

| 方式 | 说明 |
|------|------|
| 本地IP快捷登录 | 邮箱 `admin`，密码 `123456` |
| 邮箱密码登录 | 正常登录 |
| 注册新账号 | /register |

## 🤖 客服系统

### 功能

- AI自动回复（对接本地 Ollama 大模型）
- 人工接管（管理员可在后台接管对话）
- 消息历史（所有对话记录可查询）
- 悬浮按钮入口（右下角）

### 页面

| 页面 | 路径 | 说明 |
|------|------|------|
| 客服对话 | 右下角悬浮按钮 | 用户端聊天面板 |
| 客服管理 | /chat | 管理员后台（对话列表、接管、回复） |

## 🎭 看板娘系统

### 功能

- Live2D 模型渲染（17个形象可选）
- 环状交互菜单（5个功能入口）
- 屏幕边界检测（菜单始终保持可视）
- 形象选择（首次登录选择，绑定用户不可更改）
- 集成客服对话（环状菜单→客服对话）

### 形象列表

| ID | 名称 | ID | 名称 |
|----|------|----|------|
| hijiki | 黑猫咪 🐱 | tororo | 白猫咪 😺 |
| shizuku | 萌娘 👧 | wanko | 狗狗 🐶 |
| z16 | 萌妹1号 👩 | koharu | 萌妹2号 👱‍♀️ |
| hibiki | 萌妹3号 🎶 | izumi | 妹子4号 💫 |
| miku | 初音 🎵 | nico | Nico ✨ |
| unitychan | Unity酱 🎮 | haruto | 帅哥2号 🧑 |

### 交互流程

```
首次登录 → 选择看板娘形象 → 进入系统
                            ↓
              看板娘出现在右下角
                            ↓
              Hover → 问号提示 "点击互动"
                            ↓
              点击 → 环状菜单展开（5个入口）
                            ↓
              💬 客服对话 / 📊 系统状态 / ❤️ 互动 / ⚙️ 设置 / 📋 日志
```

## 📡 API 接口

| 接口 | 方法 | 说明 |
|------|------|------|
| `/api/auth/login` | POST | 登录 |
| `/api/auth/register` | POST | 注册 |
| `/api/auth/me` | GET | 当前用户 |
| `/api/auth/logout` | POST | 退出 |
| `/api/agents` | GET/POST | Agent列表/创建 |
| `/api/execution-logs` | GET | 执行日志 |
| `/api/dashboard/stats` | GET | 仪表盘统计 |
| `/api/error-logs` | GET | 错误日志 |
| `/api/chat/conversations` | POST/GET | 创建/获取对话 |
| `/api/chat/messages` | POST | 发送消息 |
| `/api/chat/takeover` | POST | 人工接管 |
| `/api/chat/release` | POST | 释放给AI |
| `/api/chat/close` | POST | 关闭对话 |
| `/api/chat/human-reply` | POST | 人工回复 |
| `/api/chat/status` | GET | 客服系统状态 |

## 🧪 测试覆盖

```
 ✓ tokenManager.test.js  (11 tests)
 ✓ authStore.test.js     (10 tests)
 ✓ request.test.js       (5 tests)

 Tests  26 passed (26)
```

## 📝 开发注意事项

1. 客服和看板娘模块已模块化，目录独立，可抽离为独立NPM包
2. 看板娘使用 Live2D 模型，需联网加载 unpkg.com 资源
3. 环状菜单自动检测屏幕边界，确保内容始终可视
4. 看板娘形象选择后绑定用户，存储在 localStorage

## 📄 License

MIT
