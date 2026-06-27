import request from './request'

/**
 * 性能指标 API
 */
export const metricsApi = {
  /**
   * 获取指标列表
   */
  getList: (params = {}) => {
    return request.get('/metrics', { params })
  },

  /**
   * 记录指标
   */
  record: (data) => {
    return request.post('/metrics', data)
  },

  /**
   * 批量记录指标
   */
  batchRecord: (metrics) => {
    return request.post('/metrics/batch', { metrics })
  },

  /**
   * 获取所有指标类型名
   */
  getMetricNames: () => {
    return request.get('/metrics/names')
  },

  /**
   * 获取 Agent 指标统计
   */
  getStats: (agentId, params = {}) => {
    return request.get(`/metrics/${agentId}/stats`, { params })
  },

  /**
   * 获取 Agent 指标趋势
   */
  getTrend: (agentId, params = {}) => {
    return request.get(`/metrics/${agentId}/trend`, { params })
  },

  /**
   * 获取 Agent 指标概览
   */
  getOverview: (agentId) => {
    return request.get(`/metrics/${agentId}/overview`)
  },

  /**
   * 删除指标数据
   */
  delete: (agentId, beforeDate = null) => {
    const data = { agent_id: agentId }
    if (beforeDate) data.before_date = beforeDate
    return request.delete('/metrics', { data })
  },
}

export default metricsApi
