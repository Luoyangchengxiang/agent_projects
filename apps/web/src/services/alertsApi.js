import request from './request'

/**
 * 告警规则 API
 */
export const alertsApi = {
  /**
   * 获取告警规则列表
   */
  getList: (params = {}) => {
    return request.get('/alerts', { params })
  },

  /**
   * 获取告警规则详情
   */
  getDetail: (id) => {
    return request.get(`/alerts/${id}`)
  },

  /**
   * 创建告警规则
   */
  create: (data) => {
    return request.post('/alerts', data)
  },

  /**
   * 更新告警规则
   */
  update: (id, data) => {
    return request.put(`/alerts/${id}`, data)
  },

  /**
   * 删除告警规则
   */
  delete: (id) => {
    return request.delete(`/alerts/${id}`)
  },

  /**
   * 手动检查所有规则
   */
  checkAll: () => {
    return request.get('/alerts/check')
  },

  /**
   * 检查单条规则
   */
  checkRule: (id) => {
    return request.post(`/alerts/${id}/check`)
  },
}

export default alertsApi
