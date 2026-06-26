import request from './request'

/**
 * 版本更新 API
 */
export const versionUpdateApi = {
  /**
   * 获取版本更新列表
   */
  getList: (params = {}) => {
    return request.get('/version-updates', { params })
  },

  /**
   * 获取最新版本（用于通知中心）
   */
  getLatest: () => {
    return request.get('/version-updates/latest')
  },

  /**
   * 创建版本更新（管理员）
   */
  create: (data) => {
    return request.post('/version-updates', data)
  },

  /**
   * 更新版本记录（管理员）
   */
  update: (id, data) => {
    return request.put(`/version-updates/${id}`, data)
  },

  /**
   * 删除版本记录（管理员）
   */
  delete: (id) => {
    return request.delete(`/version-updates/${id}`)
  },
}

export default versionUpdateApi
