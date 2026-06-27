# 前端项目结构

## 目录说明

```
apps/web/
├── src/
│   ├── __tests__/              # 测试文件
│   │   ├── authStore.test.js
│   │   ├── chatStore.test.js
│   │   ├── escapeHtml.test.js
│   │   └── ...
│   ├── components/             # 通用组件
│   │   ├── G6Graph.jsx        # G6 知识图谱
│   │   ├── ErrorBoundary.jsx  # 错误边界
│   │   ├── Header.jsx         # 头部导航
│   │   ├── Sidebar.jsx        # 侧边栏
│   │   └── NotificationPanel.jsx
│   ├── constants/              # 常量定义
│   │   └── graphConstants.js  # 图谱常量
│   ├── pages/                  # 页面组件
│   │   ├── Dashboard.jsx      # 仪表盘
│   │   ├── AgentList.jsx      # Agent 列表
│   │   ├── ErrorLogs.jsx      # 错误日志
│   │   ├── KnowledgeGraph.jsx # 知识图谱
│   │   └── ...
│   ├── services/               # API 服务
│   │   ├── request.js         # Axios 封装
│   │   ├── tokenManager.js    # Token 管理
│   │   ├── alertsApi.js       # 告警 API
│   │   ├── metricsApi.js      # 指标 API
│   │   └── ...
│   ├── stores/                 # Zustand 状态
│   │   ├── authStore.js       # 认证状态
│   │   ├── chatStore.js       # 聊天状态
│   │   └── mascotStore.js     # 看板娘状态
│   ├── styles/                 # 样式
│   │   └── variables.css      # 全局样式
│   └── utils/                  # 工具函数
│       └── htmlUtils.js       # HTML 转义
├── package.json
├── vite.config.js
└── vitest.config.js
```

## 关键配置

### package.json

```json
{
  "name": "agent-monitor-web",
  "type": "module",
  "scripts": {
    "dev": "vite --host 0.0.0.0",
    "build": "vite build",
    "preview": "vite preview",
    "test": "vitest run",
    "test:watch": "vitest"
  }
}
```

### vite.config.js

```javascript
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  server: {
    port: 3000,
    proxy: {
      '/api': {
        target: 'http://localhost:8000',
        changeOrigin: true,
      }
    }
  }
})
```

## 状态管理 (Zustand)

```javascript
// stores/authStore.js
import { create } from 'zustand'

const useAuthStore = create((set) => ({
  user: null,
  token: null,
  isAuthenticated: false,
  
  login: (user, token) => set({ user, token, isAuthenticated: true }),
  logout: () => set({ user: null, token: null, isAuthenticated: false }),
}))

export default useAuthStore
```

## API 请求封装

```javascript
// services/request.js
import axios from 'axios'
import { tokenManager } from './tokenManager'

const request = axios.create({
  baseURL: '/api',
  timeout: 30000,
})

// 请求拦截器：自动添加 Token
request.interceptors.request.use((config) => {
  const token = tokenManager.getToken()
  if (token) {
    config.headers.Authorization = `Bearer ${token}`
  }
  return config
})

// 响应拦截器：解包 data
request.interceptors.response.use(
  (response) => response.data,
  (error) => {
    if (error.response?.status === 401) {
      tokenManager.clearAll()
      window.location.href = '/login'
    }
    return Promise.reject(error)
  }
)

export default request
```
