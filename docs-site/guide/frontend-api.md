# API 对接

## 请求封装

所有 API 请求通过 `services/request.js` 统一封装：

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

// 响应拦截器
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

## API 服务文件

每个模块一个 API 文件，放在 `services/` 目录：

### 认证 API

```javascript
// services/authApi.js
import request from './request'

export const authApi = {
  login: (data) => request.post('/auth/login', data),
  register: (data) => request.post('/auth/register', data),
  me: () => request.get('/auth/me'),
  logout: () => request.post('/auth/logout'),
  updatePassword: (data) => request.put('/auth/password', data),
}
```

### Agent API

```javascript
// services/agentApi.js
import request from './request'

export const agentApi = {
  list: (params) => request.get('/agents', { params }),
  show: (id) => request.get(`/agents/${id}`),
  create: (data) => request.post('/agents', data),
  update: (id, data) => request.put(`/agents/${id}`, data),
  destroy: (id) => request.delete(`/agents/${id}`),
}
```

### 告警 API

```javascript
// services/alertsApi.js
import request from './request'

export const alertsApi = {
  rules: (params) => request.get('/alert-rules', { params }),
  createRule: (data) => request.post('/alert-rules', data),
  updateRule: (id, data) => request.put(`/alert-rules/${id}`, data),
  deleteRule: (id) => request.delete(`/alert-rules/${id}`),
  toggleRule: (id) => request.post(`/alert-rules/${id}/toggle`),
  history: (params) => request.get('/alert-history', { params }),
}
```

### 性能指标 API

```javascript
// services/metricsApi.js
import request from './request'

export const metricsApi = {
  list: (params) => request.get('/metrics', { params }),
  store: (data) => request.post('/metrics', data),
  batchStore: (data) => request.post('/metrics/batch', data),
  names: () => request.get('/metrics/names'),
  summary: (params) => request.get('/metrics/summary', { params }),
}
```

### 其他 API 文件

```javascript
// services/dashboardApi.js
export const dashboardApi = {
  stats: () => request.get('/dashboard/stats'),
  charts: () => request.get('/dashboard/charts'),
}

// services/errorLogApi.js
export const errorLogApi = {
  list: (params) => request.get('/error-logs', { params }),
  stats: () => request.get('/error-logs/stats'),
  resolve: (id) => request.put(`/error-logs/${id}/resolve`),
}

// services/cronJobApi.js
export const cronJobApi = {
  list: (params) => request.get('/cronjobs', { params }),
  create: (data) => request.post('/cronjobs', data),
  pause: (id) => request.post(`/cronjobs/${id}/pause`),
  resume: (id) => request.post(`/cronjobs/${id}/resume`),
  run: (id) => request.post(`/cronjobs/${id}/run`),
}
```

## Token 管理

```javascript
// services/tokenManager.js
const TOKEN_KEY = 'auth_token'
const USER_KEY = 'auth_user'

export const tokenManager = {
  getToken: () => localStorage.getItem(TOKEN_KEY),
  setToken: (token) => localStorage.setItem(TOKEN_KEY, token),
  getUser: () => JSON.parse(localStorage.getItem(USER_KEY) || 'null'),
  setUser: (user) => localStorage.setItem(USER_KEY, JSON.stringify(user)),
  clearAll: () => {
    localStorage.removeItem(TOKEN_KEY)
    localStorage.removeItem(USER_KEY)
  },
}
```

## 请求去重

防止快速重复点击导致多次请求：

```javascript
// 使用 AbortController
const controller = new AbortController()

const fetchData = async () => {
  controller.abort() // 取消上次请求
  const newController = new AbortController()
  try {
    const res = await request.get('/api/xxx', {
      signal: newController.signal
    })
  } catch (err) {
    if (err.name !== 'CanceledError') throw err
  }
}
```

## Vite 代理配置

开发环境通过 Vite 代理转发 API 请求到后端：

```javascript
// vite.config.js
export default defineConfig({
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

这样前端调用 `/api/agents` 实际请求 `http://localhost:8000/api/agents`。
