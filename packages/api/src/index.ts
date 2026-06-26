import axios from 'axios'
import type { Agent, ExecutionLog, DashboardStats, ChartData, ApiResponse, PaginatedResponse, PaginationParams } from '@agent-monitor/types'

// Token key，与主应用保持一致
const TOKEN_KEY = 'auth_token'
const USER_KEY = 'auth_user'

// 创建axios实例
const api = axios.create({
  baseURL: '/api',
  timeout: 30000,
  headers: {
    'Content-Type': 'application/json',
    'Accept': 'application/json'
  }
})

// 请求拦截器
api.interceptors.request.use(
  (config) => {
    // 白名单路径不附加Token
    const whiteList = ['/auth/login', '/auth/register']
    const isWhiteListed = whiteList.some((path) => config.url?.includes(path))
    
    if (!isWhiteListed) {
      const token = localStorage.getItem(TOKEN_KEY)
      if (token) {
        config.headers.Authorization = `Bearer ${token}`
      }
    }
    return config
  },
  (error) => {
    return Promise.reject(error)
  }
)

// 响应拦截器
api.interceptors.response.use(
  (response) => {
    return response.data
  },
  (error) => {
    // 处理错误
    if (error.response) {
      const { status, data } = error.response
      if (status === 401) {
        // 未授权，清除token并跳转登录
        localStorage.removeItem(TOKEN_KEY)
        localStorage.removeItem(USER_KEY)
        if (window.location.pathname !== '/login') {
          window.location.href = '/login'
        }
      }
      return Promise.reject(data || error.message)
    }
    return Promise.reject(error.message)
  }
)

// Agent相关API
export const agentApi = {
  // 获取Agent列表
  getList(params?: PaginationParams): Promise<ApiResponse<PaginatedResponse<Agent>>> {
    return api.get('/agents', { params })
  },

  // 获取Agent详情
  getById(id: number): Promise<ApiResponse<Agent>> {
    return api.get(`/agents/${id}`)
  },

  // 创建Agent
  create(data: Partial<Agent>): Promise<ApiResponse<Agent>> {
    return api.post('/agents', data)
  },

  // 更新Agent
  update(id: number, data: Partial<Agent>): Promise<ApiResponse<Agent>> {
    return api.put(`/agents/${id}`, data)
  },

  // 删除Agent
  delete(id: number): Promise<ApiResponse<void>> {
    return api.delete(`/agents/${id}`)
  }
}

// 执行日志相关API
export const executionLogApi = {
  // 获取日志列表
  getList(params?: PaginationParams & { agent_id?: number; status?: string }): Promise<ApiResponse<PaginatedResponse<ExecutionLog>>> {
    return api.get('/execution-logs', { params })
  },

  // 获取日志详情
  getById(id: number): Promise<ApiResponse<ExecutionLog>> {
    return api.get(`/execution-logs/${id}`)
  }
}

// 仪表盘相关API
export const dashboardApi = {
  // 获取统计数据
  getStats(): Promise<ApiResponse<DashboardStats>> {
    return api.get('/dashboard/stats')
  },

  // 获取图表数据
  getCharts(params?: { period?: string }): Promise<ApiResponse<ChartData>> {
    return api.get('/dashboard/charts', { params })
  }
}

export default api
