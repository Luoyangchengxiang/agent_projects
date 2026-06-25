// Agent类型定义
export interface Agent {
  id: number
  name: string
  type: 'online' | 'local'
  status: 'online' | 'offline' | 'error'
  config?: Record<string, any>
  metadata?: Record<string, any>
  last_active_at?: string
  created_at: string
  updated_at: string
}

// 执行日志类型定义
export interface ExecutionLog {
  id: number
  agent_id: number
  task_id: string
  status: 'pending' | 'running' | 'success' | 'failed'
  input?: string
  output?: string
  context?: Record<string, any>
  duration?: number
  error?: string
  created_at: string
  updated_at: string
}

// Agent指标类型定义
export interface AgentMetric {
  id: number
  agent_id: number
  metric_name: string
  metric_value: number
  tags?: Record<string, any>
  recorded_at: string
  created_at: string
}

// 仪表盘统计
export interface DashboardStats {
  total_agents: number
  online_agents: number
  offline_agents: number
  error_agents: number
  total_executions: number
  success_rate: number
  avg_duration: number
}

// 图表数据
export interface ChartData {
  labels: string[]
  datasets: {
    label: string
    data: number[]
    color?: string
  }[]
}

// API响应
export interface ApiResponse<T> {
  success: boolean
  data: T
  message?: string
  error?: string
}

// 分页参数
export interface PaginationParams {
  page?: number
  per_page?: number
  sort_by?: string
  sort_order?: 'asc' | 'desc'
}

// 分页响应
export interface PaginatedResponse<T> {
  data: T[]
  current_page: number
  last_page: number
  per_page: number
  total: number
}
