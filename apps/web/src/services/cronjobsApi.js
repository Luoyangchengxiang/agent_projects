import request from './request'

/**
 * 定时任务 API
 */
export const cronjobsApi = {
  /**
   * 获取任务列表
   */
  getList: (params = {}) => {
    return request.get('/cronjobs', { params })
  },

  /**
   * 获取统计信息
   */
  getStats: () => {
    return request.get('/cronjobs/stats')
  },

  /**
   * 获取任务详情
   */
  getDetail: (id) => {
    return request.get(`/cronjobs/${id}`)
  },

  /**
   * 创建任务
   */
  create: (data) => {
    return request.post('/cronjobs', data)
  },

  /**
   * 更新任务
   */
  update: (id, data) => {
    return request.put(`/cronjobs/${id}`, data)
  },

  /**
   * 删除任务
   */
  delete: (id) => {
    return request.delete(`/cronjobs/${id}`)
  },

  /**
   * 暂停任务
   */
  pause: (id) => {
    return request.post(`/cronjobs/${id}/pause`)
  },

  /**
   * 恢复任务
   */
  resume: (id) => {
    return request.post(`/cronjobs/${id}/resume`)
  },

  /**
   * 手动执行任务
   */
  run: (id) => {
    return request.post(`/cronjobs/${id}/run`)
  },

  /**
   * 获取执行日志
   */
  getLogs: (id, params = {}) => {
    return request.get(`/cronjobs/${id}/logs`, { params })
  },
}

export default cronjobsApi
