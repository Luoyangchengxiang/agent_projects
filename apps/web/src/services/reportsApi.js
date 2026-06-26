import request from './request'

/**
 * 报告相关 API
 */
export const reportsApi = {
  /**
   * 获取报告列表
   */
  getList: (params = {}) => {
    return request.get('/reports', { params })
  },

  /**
   * 获取报告详情
   */
  getDetail: (id) => {
    return request.get(`/reports/${id}`)
  },

  /**
   * 生成周报
   */
  generateWeekly: () => {
    return request.post('/reports/generate/weekly')
  },

  /**
   * 生成月报
   */
  generateMonthly: () => {
    return request.post('/reports/generate/monthly')
  },

  /**
   * 生成选品报告
   */
  generateSelection: () => {
    return request.post('/reports/generate/selection')
  },

  /**
   * 生成自定义报告
   */
  generateCustom: (startDate, endDate) => {
    return request.post('/reports/generate/custom', {
      start_date: startDate,
      end_date: endDate,
    })
  },

  /**
   * 下载报告
   */
  download: (id) => {
    return request.get(`/reports/${id}/download`, {
      responseType: 'blob',
    })
  },

  /**
   * 删除报告
   */
  delete: (id) => {
    return request.delete(`/reports/${id}`)
  },
}

export default reportsApi
