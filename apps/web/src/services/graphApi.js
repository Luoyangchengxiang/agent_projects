import request from './request'

/**
 * 知识图谱 API
 */
export const graphApi = {
  /**
   * 获取整个图谱数据
   */
  getData: (params = {}) => {
    return request.get('/graph', { params })
  },

  /**
   * 获取节点详情
   */
  getNode: (id) => {
    return request.get(`/graph/nodes/${id}`)
  },

  /**
   * 创建节点
   */
  createNode: (data) => {
    return request.post('/graph/nodes', data)
  },

  /**
   * 更新节点
   */
  updateNode: (id, data) => {
    return request.put(`/graph/nodes/${id}`, data)
  },

  /**
   * 删除节点
   */
  deleteNode: (id) => {
    return request.delete(`/graph/nodes/${id}`)
  },

  /**
   * 获取节点的关联节点
   */
  getNeighbors: (id) => {
    return request.get(`/graph/nodes/${id}/neighbors`)
  },

  /**
   * 创建边（关系）
   */
  createEdge: (data) => {
    return request.post('/graph/edges', data)
  },

  /**
   * 删除边
   */
  deleteEdge: (id) => {
    return request.delete(`/graph/edges/${id}`)
  },

  /**
   * 搜索节点
   */
  search: (query) => {
    return request.get('/graph/search', { params: { q: query } })
  },
}

export default graphApi
