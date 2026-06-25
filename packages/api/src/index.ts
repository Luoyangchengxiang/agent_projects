import axios from 'axios'
import type { Agent, ExecutionLog, DashboardStats, ChartData, ApiResponse, PaginatedResponse, PaginationParams } from '@agent-monitor/types'

// 创建axios实例
const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || 'http://localhost:8000/api',
  timeout: 10000,
  headers: {
    'Content-Type': 'application/json',
    'Accept': 'application/json'
  }
})

// 请求拦截器
api.interceptors.request.use(
  (config) => {
    // 从localStorage获取token
    const token = localStorage.getItem('token')
    if (token) {
      config.headers.Authorization = `Bearer ${token}`
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
      // 服务器返回错误
      const { status, data } = error.response
      if (status === 401) {
        // 未授权，清除token
        localStorage.removeItem('token')
        window.location.href = '/login'
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
