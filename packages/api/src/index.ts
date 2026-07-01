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

  // 删除Agent（逻辑删除）
  delete(id: number): Promise<ApiResponse<void>> {
    return api.delete(`/agents/${id}`)
  },

  // 恢复已删除的Agent
  restore(id: number): Promise<ApiResponse<void>> {
    return api.post(`/agents/${id}/restore`)
  },

  // 获取已删除的Agent列表（回收站）
  getTrash(): Promise<ApiResponse<PaginatedResponse<Agent>>> {
    return api.get('/agents-trash')
  },

  // 执行Agent任务
  run(id: number, data: { input: string; context?: any }): Promise<ApiResponse<{
    task_id: string
    status: string
    input: string
    output: string | null
    error: string | null
    duration: number
    duration_formatted: string
    created_at: string
  }>> {
    return api.post(`/agents/${id}/run`, data)
  },

  // Modelfile 同步
  syncFromLocal(): Promise<ApiResponse<any[]>> {
    return api.post('/agents-sync/from-local')
  },

  syncToLocal(): Promise<ApiResponse<any[]>> {
    return api.post('/agents-sync/to-local')
  },

  getModelfile(id: number): Promise<ApiResponse<{ path: string; raw: string; parsed: any }>> {
    return api.get(`/agents/${id}/modelfile`)
  },
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

// 错误日志相关API
export const errorLogApi = {
  // 获取错误日志列表
  getList(params?: PaginationParams & { status?: string; error_type?: string }): Promise<ApiResponse<PaginatedResponse<any>>> {
    return api.get('/error-logs', { params })
  },

  // 获取错误日志详情
  getById(id: number): Promise<ApiResponse<any>> {
    return api.get(`/error-logs/${id}`)
  },

  // 获取错误统计
  getStats(): Promise<ApiResponse<any>> {
    return api.get('/error-logs/stats')
  },

  // 获取错误类型列表
  getTypes(): Promise<ApiResponse<string[]>> {
    return api.get('/error-logs/types')
  },

  // 标记为已解决
  resolve(id: number): Promise<ApiResponse<any>> {
    return api.put(`/error-logs/${id}/resolve`)
  },

  // 删除错误日志
  delete(id: number): Promise<ApiResponse<void>> {
    return api.delete(`/error-logs/${id}`)
  },

  // 批量删除
  batchDestroy(ids: number[]): Promise<ApiResponse<void>> {
    return api.post('/error-logs/batch-destroy', { ids })
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
  },

  // 获取执行结果汇总
  getResultSummaries(params?: { agent_id?: number; agent_group?: string; start_date?: string; end_date?: string; per_page?: number }): Promise<ApiResponse<PaginatedResponse<ExecutionLog>>> {
    return api.get('/dashboard/result-summaries', { params })
  },

  // 获取智能体组列表
  getAgentGroups(): Promise<ApiResponse<Array<{ agent_group: string; count: number }>>> {
    return api.get('/dashboard/agent-groups')
  },

  // 获取系统状态（CPU、内存、磁盘）
  getSystem(): Promise<ApiResponse<{
    cpu: { usage: number; cores: number }
    memory: { total: number; used: number; free: number; usage: number }
    disk: { total: number; used: number; free: number; usage: number }
    uptime: string
    timestamp: string
  }>> {
    return api.get('/dashboard/system')
  }
}

// 版本更新相关API
export const versionUpdateApi = {
  // 获取版本更新列表
  getList(params?: PaginationParams & { type?: string; highlight_only?: boolean }): Promise<ApiResponse<PaginatedResponse<any>>> {
    return api.get('/version-updates', { params })
  },

  // 获取最新版本（用于通知中心）
  getLatest(): Promise<ApiResponse<any[]>> {
    return api.get('/version-updates/latest')
  },

  // 创建版本更新（管理员）
  create(data: { version: string; title: string; content: string; type?: string; release_date: string; is_highlight?: boolean }): Promise<ApiResponse<any>> {
    return api.post('/version-updates', data)
  },

  // 更新版本记录（管理员）
  update(id: number, data: Partial<any>): Promise<ApiResponse<any>> {
    return api.put(`/version-updates/${id}`, data)
  },

  // 删除版本记录（管理员）
  delete(id: number): Promise<ApiResponse<void>> {
    return api.delete(`/version-updates/${id}`)
  }
}

// 权限管理相关API
export const permissionApi = {
  // 获取当前用户权限信息
  getMe(): Promise<ApiResponse<{
    id: number
    name: string
    email: string
    role: string
    role_name: string
    permissions: string[]
    can_view_full_execution: boolean
    can_manage_users: boolean
  }>> {
    return api.get('/permissions/me')
  },

  // 获取用户列表（管理员）
  getUsers(params?: { search?: string; role?: string; page?: number; per_page?: number }): Promise<ApiResponse<PaginatedResponse<any>>> {
    return api.get('/permissions/users', { params })
  },

  // 更新用户角色
  updateRole(userId: number, role: string): Promise<ApiResponse<any>> {
    return api.put(`/permissions/users/${userId}/role`, { role })
  },

  // 更新用户权限
  updatePermissions(userId: number, permissions: string[]): Promise<ApiResponse<any>> {
    return api.put(`/permissions/users/${userId}/permissions`, { permissions })
  },

  // 创建用户（管理员）
  createUser(data: { name: string; password: string; role?: string }): Promise<ApiResponse<any>> {
    return api.post('/permissions/users', data)
  },

  // 删除用户（管理员）
  deleteUser(userId: number): Promise<ApiResponse<any>> {
    return api.delete(`/permissions/users/${userId}`)
  }
}

// 系统设置相关API
export const settingsApi = {
  // 获取所有设置（按组）
  getAll(group?: string): Promise<ApiResponse<Record<string, Record<string, any>>>> {
    return api.get('/settings', { params: group ? { group } : {} })
  },

  // 获取单个设置
  get(key: string): Promise<ApiResponse<{ key: string; value: any; type: string; group: string; description: string }>> {
    return api.get(`/settings/${key}`)
  },

  // 批量更新设置
  update(group: string, settings: Record<string, any>): Promise<ApiResponse<void>> {
    return api.post('/settings', { group, settings })
  }
}

export default api
