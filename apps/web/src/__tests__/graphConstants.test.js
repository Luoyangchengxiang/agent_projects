/**
 * graphConstants 单元测试
 */
import { describe, it, expect } from 'vitest'
import { NODE_TYPES, EDGE_TYPES, getNodeStatus } from '../constants/graphConstants'

describe('NODE_TYPES', () => {
  it('包含所有必要的节点类型', () => {
    expect(NODE_TYPES).toHaveProperty('agent_group')
    expect(NODE_TYPES).toHaveProperty('agent')
    expect(NODE_TYPES).toHaveProperty('knowledge')
    expect(NODE_TYPES).toHaveProperty('skill')
    expect(NODE_TYPES).toHaveProperty('output')
  })

  it('每个类型都有 label、color、icon', () => {
    for (const [key, config] of Object.entries(NODE_TYPES)) {
      expect(config).toHaveProperty('label')
      expect(config).toHaveProperty('color')
      expect(config).toHaveProperty('icon')
      expect(typeof config.label).toBe('string')
      expect(typeof config.color).toBe('string')
      expect(config.color).toMatch(/^#[0-9a-f]{6}$/)
    }
  })

  it('agent_group 是智能体组', () => {
    expect(NODE_TYPES.agent_group.label).toBe('智能体组')
  })

  it('agent 是智能体', () => {
    expect(NODE_TYPES.agent.label).toBe('智能体')
  })
})

describe('EDGE_TYPES', () => {
  it('包含所有必要的关系类型', () => {
    expect(EDGE_TYPES).toHaveProperty('contains')
    expect(EDGE_TYPES).toHaveProperty('uses')
    expect(EDGE_TYPES).toHaveProperty('produces')
    expect(EDGE_TYPES).toHaveProperty('depends_on')
    expect(EDGE_TYPES).toHaveProperty('collaborates')
  })

  it('每个类型都有 label 和 color', () => {
    for (const [key, config] of Object.entries(EDGE_TYPES)) {
      expect(config).toHaveProperty('label')
      expect(config).toHaveProperty('color')
      expect(typeof config.label).toBe('string')
      expect(config.color).toMatch(/^#[0-9a-f]{6}$/)
    }
  })

  it('contains 关系标签是"包含"', () => {
    expect(EDGE_TYPES.contains.label).toBe('包含')
  })
})

describe('getNodeStatus', () => {
  it('运行中的 agent 返回 running', () => {
    const node = { id: 1, type: 'agent' }
    expect(getNodeStatus(node)).toBe('running')
  })

  it('运行中的 agent（id=2）返回 running', () => {
    const node = { id: 2, type: 'agent' }
    expect(getNodeStatus(node)).toBe('running')
  })

  it('运行中的 agent（id=3）返回 running', () => {
    const node = { id: 3, type: 'agent' }
    expect(getNodeStatus(node)).toBe('running')
  })

  it('不在运行列表中的 agent 返回 idle', () => {
    const node = { id: 99, type: 'agent' }
    expect(getNodeStatus(node)).toBe('idle')
  })

  it('非 agent 类型返回 idle', () => {
    expect(getNodeStatus({ id: 1, type: 'knowledge' })).toBe('idle')
    expect(getNodeStatus({ id: 1, type: 'skill' })).toBe('idle')
    expect(getNodeStatus({ id: 1, type: 'output' })).toBe('idle')
    expect(getNodeStatus({ id: 1, type: 'agent_group' })).toBe('idle')
  })

  it('字符串 id 也能匹配', () => {
    const node = { id: '1', type: 'agent' }
    expect(getNodeStatus(node)).toBe('running')
  })

  it('id=0 返回 idle', () => {
    const node = { id: 0, type: 'agent' }
    expect(getNodeStatus(node)).toBe('idle')
  })
})
