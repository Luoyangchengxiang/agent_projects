import { describe, it, expect, vi, beforeEach } from 'vitest'

// Mock the request module
vi.mock('../services/request', () => ({
  default: {
    get: vi.fn(),
    post: vi.fn(),
    put: vi.fn(),
    delete: vi.fn(),
  },
}))

import request from '../services/request'
import { graphApi } from '../services/graphApi'

describe('graphApi', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('getData', () => {
    it('should call GET /graph with params', async () => {
      const mockData = { nodes: [], edges: [] }
      request.get.mockResolvedValue({ success: true, data: mockData })

      const result = await graphApi.getData({ type: 'agent' })

      expect(request.get).toHaveBeenCalledWith('/graph', { params: { type: 'agent' } })
      expect(result).toEqual({ success: true, data: mockData })
    })

    it('should call GET /graph without params', async () => {
      request.get.mockResolvedValue({ success: true, data: { nodes: [], edges: [] } })

      await graphApi.getData()

      expect(request.get).toHaveBeenCalledWith('/graph', { params: {} })
    })
  })

  describe('getNode', () => {
    it('should call GET /graph/nodes/:id', async () => {
      const mockNode = { id: 1, name: 'Test Node', type: 'agent' }
      request.get.mockResolvedValue({ success: true, data: mockNode })

      const result = await graphApi.getNode(1)

      expect(request.get).toHaveBeenCalledWith('/graph/nodes/1')
      expect(result).toEqual({ success: true, data: mockNode })
    })
  })

  describe('createNode', () => {
    it('should call POST /graph/nodes with data', async () => {
      const nodeData = { name: 'New Node', type: 'agent', description: 'Test' }
      const mockResponse = { success: true, data: { id: 2, ...nodeData } }
      request.post.mockResolvedValue(mockResponse)

      const result = await graphApi.createNode(nodeData)

      expect(request.post).toHaveBeenCalledWith('/graph/nodes', nodeData)
      expect(result).toEqual(mockResponse)
    })
  })

  describe('updateNode', () => {
    it('should call PUT /graph/nodes/:id with data', async () => {
      const updateData = { name: 'Updated Node' }
      const mockResponse = { success: true, data: { id: 1, ...updateData } }
      request.put.mockResolvedValue(mockResponse)

      const result = await graphApi.updateNode(1, updateData)

      expect(request.put).toHaveBeenCalledWith('/graph/nodes/1', updateData)
      expect(result).toEqual(mockResponse)
    })
  })

  describe('deleteNode', () => {
    it('should call DELETE /graph/nodes/:id', async () => {
      request.delete.mockResolvedValue({ success: true, message: '删除成功' })

      const result = await graphApi.deleteNode(1)

      expect(request.delete).toHaveBeenCalledWith('/graph/nodes/1')
      expect(result).toEqual({ success: true, message: '删除成功' })
    })
  })

  describe('getNeighbors', () => {
    it('should call GET /graph/nodes/:id/neighbors', async () => {
      const mockNeighbors = [
        { node: { id: 2, name: 'Neighbor' }, edge: { id: 1 }, direction: 'outgoing' },
      ]
      request.get.mockResolvedValue({ success: true, data: mockNeighbors })

      const result = await graphApi.getNeighbors(1)

      expect(request.get).toHaveBeenCalledWith('/graph/nodes/1/neighbors')
      expect(result).toEqual({ success: true, data: mockNeighbors })
    })
  })

  describe('createEdge', () => {
    it('should call POST /graph/edges with data', async () => {
      const edgeData = { source_id: 1, target_id: 2, relation_type: 'contains' }
      const mockResponse = { success: true, data: { id: 1, ...edgeData } }
      request.post.mockResolvedValue(mockResponse)

      const result = await graphApi.createEdge(edgeData)

      expect(request.post).toHaveBeenCalledWith('/graph/edges', edgeData)
      expect(result).toEqual(mockResponse)
    })
  })

  describe('deleteEdge', () => {
    it('should call DELETE /graph/edges/:id', async () => {
      request.delete.mockResolvedValue({ success: true, message: '删除成功' })

      const result = await graphApi.deleteEdge(1)

      expect(request.delete).toHaveBeenCalledWith('/graph/edges/1')
      expect(result).toEqual({ success: true, message: '删除成功' })
    })
  })

  describe('search', () => {
    it('should call GET /graph/search with query', async () => {
      const mockResults = [
        { id: 1, name: 'Agent 1', type: 'agent' },
        { id: 2, name: 'Agent 2', type: 'agent' },
      ]
      request.get.mockResolvedValue({ success: true, data: mockResults })

      const result = await graphApi.search('Agent')

      expect(request.get).toHaveBeenCalledWith('/graph/search', { params: { q: 'Agent' } })
      expect(result).toEqual({ success: true, data: mockResults })
    })
  })
})
