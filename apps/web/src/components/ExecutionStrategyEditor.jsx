import { useCallback, useState, useEffect } from 'react'
import {
  ReactFlow,
  Controls,
  Background,
  useNodesState,
  useEdgesState,
  addEdge,
  MarkerType,
  Handle,
  Position,
} from '@xyflow/react'
import '@xyflow/react/dist/style.css'
import { Card, Tag, Typography, Space, Button, Tooltip, Modal } from 'antd'
import {
  PlayCircleOutlined,
  BranchesOutlined,
  MergeOutlined,
  DeleteOutlined,
  PlusOutlined,
  ExpandOutlined,
  CompressOutlined,
  InfoCircleOutlined,
  SyncOutlined,
} from '@ant-design/icons'

const { Text } = Typography

// 项目主题色
const themeColors = {
  primary: '#06b6d4',
  success: '#10b981',
  warning: '#f59e0b',
  error: '#ef4444',
  purple: '#8b5cf6',
  bgContainer: '#24272e',
  bgElevated: '#2a2d35',
  bgLayout: '#0f1117',
  text: '#e5e7eb',
  textSecondary: '#9ca3af',
  border: '#374151',
}

// Controls 样式
const controlsStyles = `
  .react-flow__controls {
    background: ${themeColors.bgElevated} !important;
    border: 1px solid ${themeColors.border} !important;
    border-radius: 8px !important;
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3) !important;
    overflow: hidden !important;
  }
  .react-flow__controls-button {
    background: ${themeColors.bgElevated} !important;
    border-bottom: 1px solid ${themeColors.border} !important;
    color: ${themeColors.text} !important;
    width: 32px !important;
    height: 32px !important;
    display: flex !important;
    align-items: center !important;
    justify-content: center !important;
  }
  .react-flow__controls-button:hover {
    background: ${themeColors.bgContainer} !important;
  }
  .react-flow__controls-button svg {
    fill: ${themeColors.text} !important;
  }
  .react-flow__controls-button:last-child {
    border-bottom: none !important;
  }
  .react-flow__minimap {
    background: ${themeColors.bgElevated} !important;
    border: 1px solid ${themeColors.border} !important;
    border-radius: 8px !important;
  }
`

// 节点样式
const nodeStyles = {
  start: {
    background: themeColors.success,
    color: '#fff',
    borderRadius: '50%',
    width: 56,
    height: 56,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    boxShadow: `0 0 12px ${themeColors.success}40`,
    border: `2px solid ${themeColors.success}`,
  },
  agent: {
    background: themeColors.bgElevated,
    color: themeColors.text,
    borderRadius: 8,
    padding: '12px 20px',
    minWidth: 140,
    border: `2px solid ${themeColors.primary}`,
    boxShadow: `0 0 12px ${themeColors.primary}20`,
  },
  parallel: {
    background: themeColors.bgElevated,
    color: themeColors.text,
    borderRadius: 8,
    padding: '12px 20px',
    minWidth: 120,
    border: `2px solid ${themeColors.purple}`,
    boxShadow: `0 0 12px ${themeColors.purple}20`,
  },
  merge: {
    background: themeColors.bgElevated,
    color: themeColors.text,
    borderRadius: 8,
    padding: '12px 20px',
    minWidth: 120,
    border: `2px solid #13c2c2`,
    boxShadow: `0 0 12px #13c2c220`,
  },
  end: {
    background: themeColors.error,
    color: '#fff',
    borderRadius: '50%',
    width: 56,
    height: 56,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    boxShadow: `0 0 12px ${themeColors.error}40`,
    border: `2px solid ${themeColors.error}`,
  },
}

// 开始节点
function StartNode({ data }) {
  return (
    <div style={nodeStyles.start}>
      <PlayCircleOutlined style={{ fontSize: 22 }} />
      <Handle
        type="source"
        position={Position.Bottom}
        style={{ background: themeColors.success, border: `2px solid ${themeColors.bgElevated}` }}
      />
    </div>
  )
}

// Agent节点
function AgentNode({ data, selected }) {
  return (
    <div style={{
      ...nodeStyles.agent,
      borderColor: selected ? themeColors.warning : themeColors.primary,
      boxShadow: selected
        ? `0 0 16px ${themeColors.warning}60`
        : `0 0 12px ${themeColors.primary}20`,
    }}>
      <Handle
        type="target"
        position={Position.Top}
        style={{ background: themeColors.primary, border: `2px solid ${themeColors.bgElevated}` }}
      />
      <div style={{ textAlign: 'center' }}>
        <div style={{ fontWeight: 600, marginBottom: 4, fontSize: 14 }}>{data.label}</div>
        {data.model && (
          <Tag color="cyan" style={{ margin: 0, fontSize: 11 }}>
            {data.model}
          </Tag>
        )}
      </div>
      <Handle
        type="source"
        position={Position.Bottom}
        style={{ background: themeColors.primary, border: `2px solid ${themeColors.bgElevated}` }}
      />
    </div>
  )
}

// 并行节点
function ParallelNode({ data, selected }) {
  return (
    <div style={{
      ...nodeStyles.parallel,
      borderColor: selected ? themeColors.warning : themeColors.purple,
      boxShadow: selected
        ? `0 0 16px ${themeColors.warning}60`
        : `0 0 12px ${themeColors.purple}20`,
    }}>
      <Handle
        type="target"
        position={Position.Top}
        style={{ background: themeColors.purple, border: `2px solid ${themeColors.bgElevated}` }}
      />
      <div style={{ textAlign: 'center' }}>
        <BranchesOutlined style={{ fontSize: 18, marginBottom: 4, color: themeColors.purple }} />
        <div style={{ fontSize: 13 }}>{data.label || '并行执行'}</div>
      </div>
      <Handle
        type="source"
        position={Position.Bottom}
        id="left"
        style={{ left: '25%', background: themeColors.purple, border: `2px solid ${themeColors.bgElevated}` }}
      />
      <Handle
        type="source"
        position={Position.Bottom}
        id="right"
        style={{ left: '75%', background: themeColors.purple, border: `2px solid ${themeColors.bgElevated}` }}
      />
    </div>
  )
}

// 合并节点
function MergeNode({ data, selected }) {
  return (
    <div style={{
      ...nodeStyles.merge,
      borderColor: selected ? themeColors.warning : '#13c2c2',
      boxShadow: selected
        ? `0 0 16px ${themeColors.warning}60`
        : `0 0 12px #13c2c220`,
    }}>
      <Handle
        type="target"
        position={Position.Top}
        id="left"
        style={{ left: '25%', background: '#13c2c2', border: `2px solid ${themeColors.bgElevated}` }}
      />
      <Handle
        type="target"
        position={Position.Top}
        id="right"
        style={{ left: '75%', background: '#13c2c2', border: `2px solid ${themeColors.bgElevated}` }}
      />
      <div style={{ textAlign: 'center' }}>
        <MergeOutlined style={{ fontSize: 18, marginBottom: 4, color: '#13c2c2' }} />
        <div style={{ fontSize: 13 }}>{data.label || '合并结果'}</div>
      </div>
      <Handle
        type="source"
        position={Position.Bottom}
        style={{ background: '#13c2c2', border: `2px solid ${themeColors.bgElevated}` }}
      />
    </div>
  )
}

// 结束节点
function EndNode({ data }) {
  return (
    <div style={nodeStyles.end}>
      <Handle
        type="target"
        position={Position.Top}
        style={{ background: themeColors.error, border: `2px solid ${themeColors.bgElevated}` }}
      />
      <div style={{ fontSize: 13 }}>结束</div>
    </div>
  )
}

// 节点类型映射
const nodeTypes = {
  start: StartNode,
  agent: AgentNode,
  parallel: ParallelNode,
  merge: MergeNode,
  end: EndNode,
}

// 默认策略模板
const defaultStrategy = {
  nodes: [
    { id: 'start', type: 'start', position: { x: 250, y: 0 }, data: {} },
    { id: 'selection', type: 'agent', position: { x: 200, y: 100 }, data: { label: '选品专家', agentId: null } },
    { id: 'analysis', type: 'agent', position: { x: 200, y: 220 }, data: { label: '分析专家', agentId: null } },
    { id: 'financial', type: 'agent', position: { x: 200, y: 340 }, data: { label: '财务顾问', agentId: null } },
    { id: 'decision', type: 'agent', position: { x: 200, y: 460 }, data: { label: '决策引擎', agentId: null } },
    { id: 'operation', type: 'agent', position: { x: 200, y: 580 }, data: { label: '运营管家', agentId: null } },
    { id: 'end', type: 'end', position: { x: 250, y: 700 }, data: {} },
  ],
  edges: [
    { id: 'e1', source: 'start', target: 'selection', markerEnd: { type: MarkerType.ArrowClosed } },
    { id: 'e2', source: 'selection', target: 'analysis', markerEnd: { type: MarkerType.ArrowClosed } },
    { id: 'e3', source: 'analysis', target: 'financial', markerEnd: { type: MarkerType.ArrowClosed } },
    { id: 'e4', source: 'financial', target: 'decision', markerEnd: { type: MarkerType.ArrowClosed } },
    { id: 'e5', source: 'decision', target: 'operation', markerEnd: { type: MarkerType.ArrowClosed } },
    { id: 'e6', source: 'operation', target: 'end', markerEnd: { type: MarkerType.ArrowClosed } },
  ],
}

/**
 * 执行策略编辑器
 * @param {Object} props
 * @param {Object} props.value - 策略数据 { nodes, edges }
 * @param {Function} props.onChange - 数据变更回调
 * @param {Array} props.agents - 可选的Agent列表
 * @param {boolean} props.readOnly - 是否只读模式
 */
export default function ExecutionStrategyEditor({
  value,
  onChange,
  agents = [],
  readOnly = false,
}) {
  const [isFullscreen, setIsFullscreen] = useState(false)

  // 使用传入的值或默认值
  const initialData = value || defaultStrategy

  const [nodes, setNodes, onNodesChange] = useNodesState(initialData.nodes || [])
  const [edges, setEdges, onEdgesChange] = useEdgesState(initialData.edges || [])

  // 同步外部 value 变化
  useEffect(() => {
    if (value && value.nodes && value.edges) {
      setNodes(value.nodes)
      setEdges(value.edges)
    }
  }, [value, setNodes, setEdges])

  // 连接回调
  const onConnect = useCallback(
    (params) => {
      const newEdge = {
        ...params,
        markerEnd: { type: MarkerType.ArrowClosed },
      }
      setEdges((eds) => addEdge(newEdge, eds))
    },
    [setEdges]
  )

  // 通知父组件数据变更
  const notifyChange = useCallback(
    (newNodes, newEdges) => {
      if (onChange) {
        onChange({
          nodes: newNodes,
          edges: newEdges,
        })
      }
    },
    [onChange]
  )

  // 添加Agent节点
  const addAgentNode = useCallback(() => {
    const newNode = {
      id: `agent_${Date.now()}`,
      type: 'agent',
      position: { x: 200, y: nodes.length * 120 },
      data: { label: '新Agent', agentId: null },
    }
    const newNodes = [...nodes, newNode]
    setNodes(newNodes)
    notifyChange(newNodes, edges)
  }, [nodes, edges, setNodes, notifyChange])

  // 根据子Agent列表生成默认流程
  const generateFromAgents = useCallback(() => {
    if (!agents || agents.length === 0) {
      return
    }

    // 生成节点
    const agentNodes = agents.map((agent, index) => ({
      id: `agent_${agent.id}`,
      type: 'agent',
      position: { x: 250, y: (index + 1) * 130 },
      data: {
        label: agent.name,
        agentId: agent.id,
        model: agent.model || null,
      },
    }))

    const newNodes = [
      { id: 'start', type: 'start', position: { x: 280, y: 0 }, data: {} },
      ...agentNodes,
      { id: 'end', type: 'end', position: { x: 280, y: (agents.length + 1) * 130 }, data: {} },
    ]

    // 生成连线（串行）
    const newEdges = [
      {
        id: 'e_start',
        source: 'start',
        target: `agent_${agents[0].id}`,
        markerEnd: { type: MarkerType.ArrowClosed },
      },
      ...agents.slice(0, -1).map((agent, index) => ({
        id: `e_${agent.id}_${agents[index + 1].id}`,
        source: `agent_${agent.id}`,
        target: `agent_${agents[index + 1].id}`,
        markerEnd: { type: MarkerType.ArrowClosed },
      })),
      {
        id: 'e_end',
        source: `agent_${agents[agents.length - 1].id}`,
        target: 'end',
        markerEnd: { type: MarkerType.ArrowClosed },
      },
    ]

    setNodes(newNodes)
    setEdges(newEdges)
    notifyChange(newNodes, newEdges)
  }, [agents, setNodes, setEdges, notifyChange])

  // 删除选中的节点
  const deleteSelectedNode = useCallback(
    (nodeId) => {
      const newNodes = nodes.filter((n) => n.id !== nodeId)
      const newEdges = edges.filter(
        (e) => e.source !== nodeId && e.target !== nodeId
      )
      setNodes(newNodes)
      setEdges(newEdges)
      notifyChange(newNodes, newEdges)
    },
    [nodes, edges, setNodes, setEdges, notifyChange]
  )

  // 节点拖拽结束时通知
  const onNodeDragStop = useCallback(
    (_, node) => {
      const newNodes = nodes.map((n) =>
        n.id === node.id ? { ...n, position: node.position } : n
      )
      notifyChange(newNodes, edges)
    },
    [nodes, edges, notifyChange]
  )

  // 边删除时通知
  const onEdgesDelete = useCallback(
    (deletedEdges) => {
      const newEdges = edges.filter(
        (e) => !deletedEdges.find((de) => de.id === e.id)
      )
      setEdges(newEdges)
      notifyChange(nodes, newEdges)
    },
    [nodes, edges, setEdges, notifyChange]
  )

  // 渲染编辑器内容
  const renderEditor = (height = 400) => (
    <div style={{
      border: `1px solid ${themeColors.border}`,
      borderRadius: 8,
      overflow: 'hidden',
      background: themeColors.bgContainer,
    }}>
      {/* 注入 Controls 样式 */}
      <style>{controlsStyles}</style>
      {/* 工具栏 */}
      <div style={{
        padding: '10px 16px',
        background: themeColors.bgElevated,
        borderBottom: `1px solid ${themeColors.border}`,
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
      }}>
        <Space size="middle">
          {!readOnly && (
            <>
              <Button
                size="small"
                type="primary"
                icon={<PlusOutlined />}
                onClick={addAgentNode}
                style={{ background: themeColors.primary, borderColor: themeColors.primary }}
              >
                添加节点
              </Button>
              {agents && agents.length > 0 && (
                <Tooltip title="根据团队成员自动生成串行流程">
                  <Button
                    size="small"
                    icon={<SyncOutlined />}
                    onClick={generateFromAgents}
                  >
                    刷新
                  </Button>
                </Tooltip>
              )}
              <Tooltip title="点击画布空白处取消选中，选中节点后按 Delete 键删除">
                <Button size="small" icon={<InfoCircleOutlined />}>
                  操作提示
                </Button>
              </Tooltip>
            </>
          )}
        </Space>
        <Space size="small">
          <Tooltip title={isFullscreen ? '退出全屏' : '全屏编辑'}>
            <Button
              size="small"
              icon={isFullscreen ? <CompressOutlined /> : <ExpandOutlined />}
              onClick={() => setIsFullscreen(!isFullscreen)}
            />
          </Tooltip>
        </Space>
      </div>

      {/* React Flow画布 */}
      <div style={{ height, background: themeColors.bgLayout }}>
        <ReactFlow
          nodes={nodes}
          edges={edges}
          onNodesChange={onNodesChange}
          onEdgesChange={onEdgesChange}
          onConnect={onConnect}
          onNodeDragStop={onNodeDragStop}
          onEdgesDelete={onEdgesDelete}
          nodeTypes={nodeTypes}
          fitView
          nodesDraggable={!readOnly}
          nodesConnectable={!readOnly}
          elementsSelectable={!readOnly}
          deleteKeyCode={readOnly ? null : 'Delete'}
          defaultEdgeOptions={{
            style: { stroke: themeColors.primary, strokeWidth: 2 },
            markerEnd: { type: MarkerType.ArrowClosed, color: themeColors.primary },
          }}
          proOptions={{ hideAttribution: true }}
        >
          <Controls
            showInteractive={false}
          />
          <Background
            color={themeColors.textSecondary}
            gap={20}
            size={1}
          />
        </ReactFlow>
      </div>

      {/* 节点信息 */}
      {nodes.filter((n) => n.type === 'agent').length > 0 && (
        <div style={{
          padding: '10px 16px',
          background: themeColors.bgElevated,
          borderTop: `1px solid ${themeColors.border}`,
        }}>
          <Space wrap size="small">
            <Text type="secondary" style={{ fontSize: 12 }}>流程节点：</Text>
            {nodes
              .filter((n) => n.type === 'agent')
              .map((n) => (
                <Tag key={n.id} color="cyan" style={{ margin: 0 }}>
                  {n.data.label}
                </Tag>
              ))}
          </Space>
        </div>
      )}
    </div>
  )

  // 全屏模式
  if (isFullscreen) {
    return (
      <Modal
        title={
          <Space>
            <BranchesOutlined />
            <span>执行策略编辑器</span>
          </Space>
        }
        open={isFullscreen}
        onCancel={() => setIsFullscreen(false)}
        footer={null}
        width="90vw"
        style={{ top: 20 }}
        styles={{ body: { padding: 0 } }}
      >
        {renderEditor(window.innerHeight - 200)}
      </Modal>
    )
  }

  return renderEditor(400)
}
