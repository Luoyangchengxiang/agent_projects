/**
 * 知识图谱共享常量
 * 供 ECharts 和 G6 渲染器共用
 */

// 节点类型配置
export const NODE_TYPES = {
  agent_group: { label: '智能体组', color: '#6366f1', icon: '🤖' },
  agent: { label: '智能体', color: '#06b6d4', icon: '⚡' },
  knowledge: { label: '知识库', color: '#8b5cf6', icon: '📚' },
  skill: { label: '技能', color: '#f59e0b', icon: '🎯' },
  output: { label: '产出物', color: '#10b981', icon: '📊' },
}

// 关系类型配置
export const EDGE_TYPES = {
  contains: { label: '包含', color: '#6366f1' },
  uses: { label: '使用', color: '#06b6d4' },
  produces: { label: '产出', color: '#10b981' },
  depends_on: { label: '依赖', color: '#f59e0b' },
  collaborates: { label: '协作', color: '#ec4899' },
}

// 获取节点运行状态（基于关联 Agent 的真实状态）
export const getNodeStatus = (node) => {
  // 从关联的 Agent 获取真实状态
  if (node.agent?.status === 'online') return 'running'
  if (node.agent?.status === 'error') return 'error'
  return 'idle'
}
