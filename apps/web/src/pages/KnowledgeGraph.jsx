import React, { useState, useEffect, useRef, useCallback } from 'react'
import ReactECharts from 'echarts-for-react'
import {
  Card,
  Input,
  Select,
  Button,
  Space,
  Tag,
  Drawer,
  Descriptions,
  Empty,
  Spin,
  message,
  Tooltip,
  Modal,
  Form,
} from 'antd'
import {
  SearchOutlined,
  PlusOutlined,
  ExpandOutlined,
  CompressOutlined,
  NodeIndexOutlined,
  ApartmentOutlined,
  ReloadOutlined,
} from '@ant-design/icons'
import { graphApi } from '../services/graphApi'

const { Search } = Input
const { Option } = Select

// 节点类型配置
const NODE_TYPES = {
  agent_group: { label: '智能体组', color: '#6366f1', icon: '🤖' },
  agent: { label: '智能体', color: '#06b6d4', icon: '⚡' },
  knowledge: { label: '知识库', color: '#8b5cf6', icon: '📚' },
  skill: { label: '技能', color: '#f59e0b', icon: '🎯' },
  output: { label: '产出物', color: '#10b981', icon: '📊' },
}

// 关系类型配置
const EDGE_TYPES = {
  contains: { label: '包含', color: '#6366f1' },
  uses: { label: '使用', color: '#06b6d4' },
  produces: { label: '产出', color: '#10b981' },
  depends_on: { label: '依赖', color: '#f59e0b' },
  collaborates: { label: '协作', color: '#ec4899' },
}

function KnowledgeGraph() {
  const [loading, setLoading] = useState(false)
  const [graphData, setGraphData] = useState({ nodes: [], edges: [] })
  const [searchResults, setSearchResults] = useState([])
  const [selectedNode, setSelectedNode] = useState(null)
  const [drawerVisible, setDrawerVisible] = useState(false)
  const [filterType, setFilterType] = useState(null)
  const [searchQuery, setSearchQuery] = useState('')
  const [isFullscreen, setIsFullscreen] = useState(false)
  const [addNodeVisible, setAddNodeVisible] = useState(false)
  const [addEdgeVisible, setAddEdgeVisible] = useState(false)
  const [form] = Form.useForm()
  const [edgeForm] = Form.useForm()
  const chartRef = useRef(null)

  // 加载图谱数据
  const loadGraphData = useCallback(async () => {
    setLoading(true)
    try {
      const res = await graphApi.getData({ type: filterType })
      if (res.success) {
        setGraphData(res.data)
      }
    } catch (error) {
      console.error('加载图谱数据失败:', error)
      message.error('加载失败')
    } finally {
      setLoading(false)
    }
  }, [filterType])

  useEffect(() => {
    loadGraphData()
  }, [loadGraphData])

  // 搜索节点
  const handleSearch = async (value) => {
    if (!value.trim()) {
      setSearchResults([])
      return
    }

    try {
      const res = await graphApi.search(value)
      if (res.success) {
        setSearchResults(res.data)
        // 高亮搜索结果
        highlightNodes(res.data.map(n => n.id))
      }
    } catch (error) {
      console.error('搜索失败:', error)
    }
  }

  // 高亮节点
  const highlightNodes = (nodeIds) => {
    if (!chartRef.current) return
    
    const chart = chartRef.current.getEchartsInstance()
    if (!chart) return

    // 更新节点样式
    const option = chart.getOption()
    if (option.series && option.series[0]) {
      const updatedNodes = option.series[0].data.map(node => ({
        ...node,
        itemStyle: {
          ...node.itemStyle,
          opacity: nodeIds.length === 0 || nodeIds.includes(node.id) ? 1 : 0.2,
          borderWidth: nodeIds.includes(node.id) ? 4 : 1,
          borderColor: nodeIds.includes(node.id) ? '#fff' : 'transparent',
        },
      }))
      
      chart.setOption({
        series: [{
          data: updatedNodes,
        }],
      })
    }
  }

  // 构建 ECharts 配置
  const getChartOption = () => {
    const { nodes, edges } = graphData

    if (!nodes || nodes.length === 0) {
      return {}
    }

    // 转换节点数据
    const chartNodes = nodes.map(node => {
      const typeConfig = NODE_TYPES[node.type] || NODE_TYPES.agent
      return {
        id: node.id.toString(),
        name: node.name,
        symbolSize: node.type === 'agent_group' ? 60 : node.type === 'agent' ? 45 : 35,
        symbol: node.type === 'agent_group' ? 'roundRect' : 'circle',
        category: Object.keys(NODE_TYPES).indexOf(node.type),
        itemStyle: {
          color: typeConfig.color,
          borderColor: '#1a1a2e',
          borderWidth: 2,
          shadowBlur: 10,
          shadowColor: typeConfig.color,
        },
        label: {
          show: true,
          position: 'bottom',
          fontSize: 12,
          color: '#e0e0e0',
          formatter: (params) => {
            const name = params.name
            return name.length > 8 ? name.substring(0, 8) + '...' : name
          },
        },
        // 保存原始数据
        ...node,
      }
    })

    // 转换边数据
    const chartEdges = edges.map(edge => {
      const edgeConfig = EDGE_TYPES[edge.relation_type] || EDGE_TYPES.contains
      return {
        source: edge.source_id.toString(),
        target: edge.target_id.toString(),
        lineStyle: {
          color: edgeConfig.color,
          width: 2,
          curveness: 0.3,
          opacity: 0.6,
        },
        label: {
          show: true,
          formatter: edge.label || edgeConfig.label,
          fontSize: 10,
          color: '#9ca3af',
        },
      }
    })

    // 类别配置
    const categories = Object.entries(NODE_TYPES).map(([key, config]) => ({
      name: config.label,
      itemStyle: {
        color: config.color,
      },
    }))

    return {
      backgroundColor: 'transparent',
      tooltip: {
        trigger: 'item',
        backgroundColor: 'rgba(26, 26, 46, 0.95)',
        borderColor: 'rgba(255, 255, 255, 0.1)',
        textStyle: {
          color: '#e0e0e0',
        },
        formatter: (params) => {
          if (params.dataType === 'node') {
            const typeConfig = NODE_TYPES[params.data.type] || NODE_TYPES.agent
            return `
              <div style="padding: 4px 0;">
                <div style="font-size: 16px; font-weight: bold; margin-bottom: 8px;">
                  ${typeConfig.icon} ${params.name}
                </div>
                <div style="color: #9ca3af; margin-bottom: 4px;">
                  类型: ${typeConfig.label}
                </div>
                ${params.data.description ? `<div style="color: #9ca3af; max-width: 200px; word-break: break-all;">描述: ${params.data.description}</div>` : ''}
              </div>
            `
          }
          if (params.dataType === 'edge') {
            const edgeConfig = EDGE_TYPES[params.data.lineStyle?.color] || EDGE_TYPES.contains
            return `${params.data.label?.formatter || '关联'}`
          }
          return ''
        },
      },
      legend: {
        data: categories.map(c => c.name),
        textStyle: {
          color: '#9ca3af',
        },
        top: 10,
        right: 10,
      },
      animationDuration: 1500,
      animationEasingUpdate: 'quinticInOut',
      series: [{
        type: 'graph',
        layout: 'force',
        data: chartNodes,
        links: chartEdges,
        categories: categories,
        roam: true,
        draggable: true,
        force: {
          repulsion: 300,
          gravity: 0.1,
          edgeLength: [100, 200],
          layoutAnimation: true,
        },
        emphasis: {
          focus: 'adjacency',
          lineStyle: {
            width: 4,
            opacity: 1,
          },
          itemStyle: {
            borderWidth: 4,
            borderColor: '#fff',
            shadowBlur: 20,
          },
        },
        blur: {
          itemStyle: {
            opacity: 0.1,
          },
          lineStyle: {
            opacity: 0.05,
          },
        },
        scaleLimit: {
          min: 0.3,
          max: 3,
        },
        lineStyle: {
          curveness: 0.3,
        },
      }],
    }
  }

  // 处理节点点击
  const handleChartClick = async (params) => {
    if (params.dataType === 'node') {
      const nodeId = params.data.id
      try {
        const res = await graphApi.getNode(nodeId)
        if (res.success) {
          setSelectedNode(res.data)
          setDrawerVisible(true)
        }
      } catch (error) {
        console.error('获取节点详情失败:', error)
      }
    }
  }

  // 创建节点
  const handleCreateNode = async (values) => {
    try {
      const res = await graphApi.createNode(values)
      if (res.success) {
        message.success('节点创建成功')
        setAddNodeVisible(false)
        form.resetFields()
        loadGraphData()
      }
    } catch (error) {
      message.error('创建失败')
    }
  }

  // 创建边
  const handleCreateEdge = async (values) => {
    try {
      const res = await graphApi.createEdge(values)
      if (res.success) {
        message.success('关系创建成功')
        setAddEdgeVisible(false)
        edgeForm.resetFields()
        loadGraphData()
      }
    } catch (error) {
      message.error('创建失败')
    }
  }

  // 删除节点
  const handleDeleteNode = async (id) => {
    Modal.confirm({
      title: '确定删除该节点？',
      content: '删除节点将同时删除所有相关的关系',
      okText: '确定',
      cancelText: '取消',
      onOk: async () => {
        try {
          await graphApi.deleteNode(id)
          message.success('删除成功')
          setDrawerVisible(false)
          loadGraphData()
        } catch (error) {
          message.error('删除失败')
        }
      },
    })
  }

  // 全屏切换
  const toggleFullscreen = () => {
    setIsFullscreen(!isFullscreen)
  }

  // 重置搜索
  const resetSearch = () => {
    setSearchQuery('')
    setSearchResults([])
    highlightNodes([])
  }

  return (
    <div>
      {/* 标题栏 */}
      <div style={{ marginBottom: 24, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <h4 style={{ margin: 0, fontSize: 18, fontWeight: 600 }}>
          <ApartmentOutlined style={{ marginRight: 8 }} />
          知识图谱
        </h4>
        <Space>
          <Button
            icon={<PlusOutlined />}
            onClick={() => setAddNodeVisible(true)}
          >
            添加节点
          </Button>
          <Button
            icon={<NodeIndexOutlined />}
            onClick={() => setAddEdgeVisible(true)}
          >
            添加关系
          </Button>
          <Button
            icon={isFullscreen ? <CompressOutlined /> : <ExpandOutlined />}
            onClick={toggleFullscreen}
          >
            {isFullscreen ? '退出全屏' : '全屏'}
          </Button>
        </Space>
      </div>

      {/* 工具栏 */}
      <Card style={{ marginBottom: 16 }}>
        <Space size="large" style={{ width: '100%' }}>
          <Search
            placeholder="搜索节点..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            onSearch={handleSearch}
            style={{ width: 300 }}
            allowClear
          />
          
          <Select
            placeholder="筛选类型"
            value={filterType}
            onChange={setFilterType}
            style={{ width: 150 }}
            allowClear
          >
            {Object.entries(NODE_TYPES).map(([key, config]) => (
              <Option key={key} value={key}>
                {config.icon} {config.label}
              </Option>
            ))}
          </Select>

          <Button icon={<ReloadOutlined />} onClick={loadGraphData}>
            刷新
          </Button>

          {searchResults.length > 0 && (
            <Button onClick={resetSearch}>
              清除搜索
            </Button>
          )}
        </Space>

        {/* 搜索结果 */}
        {searchResults.length > 0 && (
          <div style={{ marginTop: 12 }}>
            <span style={{ color: '#9ca3af', marginRight: 8 }}>搜索结果：</span>
            {searchResults.map(node => (
              <Tag
                key={node.id}
                color={NODE_TYPES[node.type]?.color}
                style={{ cursor: 'pointer', marginBottom: 4 }}
                onClick={async () => {
                  const res = await graphApi.getNode(node.id)
                  if (res.success) {
                    setSelectedNode(res.data)
                    setDrawerVisible(true)
                  }
                }}
              >
                {NODE_TYPES[node.type]?.icon} {node.name}
              </Tag>
            ))}
          </div>
        )}
      </Card>

      {/* 图谱主体 */}
      <Card
        style={{
          height: isFullscreen ? 'calc(100vh - 180px)' : 600,
          transition: 'height 0.3s',
        }}
        bodyStyle={{ padding: 0 }}
      >
        {loading ? (
          <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100%' }}>
            <Spin size="large" tip="加载中..." />
          </div>
        ) : graphData.nodes && graphData.nodes.length > 0 ? (
          <ReactECharts
            ref={chartRef}
            option={getChartOption()}
            style={{ height: '100%', width: '100%' }}
            onEvents={{
              click: handleChartClick,
            }}
            opts={{ renderer: 'canvas' }}
          />
        ) : (
          <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100%' }}>
            <Empty
              description="暂无图谱数据，点击上方按钮添加节点"
              image={Empty.PRESENTED_IMAGE_SIMPLE}
            />
          </div>
        )}
      </Card>

      {/* 图例说明 */}
      <Card style={{ marginTop: 16 }}>
        <Space size="large">
          <span style={{ color: '#9ca3af' }}>图例：</span>
          {Object.entries(NODE_TYPES).map(([key, config]) => (
            <Space key={key} size={4}>
              <div style={{
                width: 12,
                height: 12,
                borderRadius: '50%',
                background: config.color,
              }} />
              <span style={{ color: '#e0e0e0', fontSize: 12 }}>{config.label}</span>
            </Space>
          ))}
          <span style={{ color: '#9ca3af', marginLeft: 16 }}>关系：</span>
          {Object.entries(EDGE_TYPES).map(([key, config]) => (
            <Space key={key} size={4}>
              <div style={{
                width: 20,
                height: 2,
                background: config.color,
              }} />
              <span style={{ color: '#e0e0e0', fontSize: 12 }}>{config.label}</span>
            </Space>
          ))}
        </Space>
      </Card>

      {/* 节点详情抽屉 */}
      <Drawer
        title={
          <Space>
            {selectedNode && NODE_TYPES[selectedNode.type]?.icon}
            {selectedNode?.name}
          </Space>
        }
        placement="right"
        onClose={() => {
          setDrawerVisible(false)
          setSelectedNode(null)
        }}
        open={drawerVisible}
        width={400}
      >
        {selectedNode && (
          <div>
            <Descriptions column={1} bordered size="small">
              <Descriptions.Item label="类型">
                <Tag color={NODE_TYPES[selectedNode.type]?.color}>
                  {NODE_TYPES[selectedNode.type]?.label}
                </Tag>
              </Descriptions.Item>
              <Descriptions.Item label="名称">{selectedNode.name}</Descriptions.Item>
              {selectedNode.description && (
                <Descriptions.Item label="描述">{selectedNode.description}</Descriptions.Item>
              )}
              {selectedNode.agent && (
                <Descriptions.Item label="关联Agent">{selectedNode.agent.name}</Descriptions.Item>
              )}
              <Descriptions.Item label="创建时间">
                {new Date(selectedNode.created_at).toLocaleString('zh-CN')}
              </Descriptions.Item>
            </Descriptions>

            {/* 关联节点 */}
            <div style={{ marginTop: 16 }}>
              <h4>关联节点</h4>
              {selectedNode.outgoing_edges?.length > 0 && (
                <div style={{ marginBottom: 8 }}>
                  <span style={{ color: '#9ca3af' }}>出边：</span>
                  {selectedNode.outgoing_edges.map(edge => (
                    <Tag key={edge.id} color={EDGE_TYPES[edge.relation_type]?.color}>
                      → {edge.target?.name}
                    </Tag>
                  ))}
                </div>
              )}
              {selectedNode.incoming_edges?.length > 0 && (
                <div>
                  <span style={{ color: '#9ca3af' }}>入边：</span>
                  {selectedNode.incoming_edges.map(edge => (
                    <Tag key={edge.id} color={EDGE_TYPES[edge.relation_type]?.color}>
                      ← {edge.source?.name}
                    </Tag>
                  ))}
                </div>
              )}
              {(!selectedNode.outgoing_edges || selectedNode.outgoing_edges.length === 0) &&
               (!selectedNode.incoming_edges || selectedNode.incoming_edges.length === 0) && (
                <span style={{ color: '#9ca3af' }}>暂无关联节点</span>
              )}
            </div>

            {/* 操作按钮 */}
            <div style={{ marginTop: 24 }}>
              <Space>
                <Button
                  danger
                  onClick={() => handleDeleteNode(selectedNode.id)}
                >
                  删除节点
                </Button>
              </Space>
            </div>
          </div>
        )}
      </Drawer>

      {/* 添加节点弹窗 */}
      <Modal
        title="添加节点"
        open={addNodeVisible}
        onCancel={() => {
          setAddNodeVisible(false)
          form.resetFields()
        }}
        footer={null}
      >
        <Form
          form={form}
          layout="vertical"
          onFinish={handleCreateNode}
        >
          <Form.Item
            name="type"
            label="节点类型"
            rules={[{ required: true, message: '请选择节点类型' }]}
          >
            <Select placeholder="选择节点类型">
              {Object.entries(NODE_TYPES).map(([key, config]) => (
                <Option key={key} value={key}>
                  {config.icon} {config.label}
                </Option>
              ))}
            </Select>
          </Form.Item>

          <Form.Item
            name="name"
            label="节点名称"
            rules={[{ required: true, message: '请输入节点名称' }]}
          >
            <Input placeholder="输入节点名称" />
          </Form.Item>

          <Form.Item
            name="description"
            label="描述"
          >
            <Input.TextArea placeholder="输入描述（可选）" rows={3} />
          </Form.Item>

          <Form.Item>
            <Space>
              <Button type="primary" htmlType="submit">
                创建
              </Button>
              <Button onClick={() => {
                setAddNodeVisible(false)
                form.resetFields()
              }}>
                取消
              </Button>
            </Space>
          </Form.Item>
        </Form>
      </Modal>

      {/* 添加关系弹窗 */}
      <Modal
        title="添加关系"
        open={addEdgeVisible}
        onCancel={() => {
          setAddEdgeVisible(false)
          edgeForm.resetFields()
        }}
        footer={null}
      >
        <Form
          form={edgeForm}
          layout="vertical"
          onFinish={handleCreateEdge}
        >
          <Form.Item
            name="source_id"
            label="源节点"
            rules={[{ required: true, message: '请选择源节点' }]}
          >
            <Select placeholder="选择源节点">
              {graphData.nodes?.map(node => (
                <Option key={node.id} value={node.id}>
                  {NODE_TYPES[node.type]?.icon} {node.name}
                </Option>
              ))}
            </Select>
          </Form.Item>

          <Form.Item
            name="target_id"
            label="目标节点"
            rules={[{ required: true, message: '请选择目标节点' }]}
          >
            <Select placeholder="选择目标节点">
              {graphData.nodes?.map(node => (
                <Option key={node.id} value={node.id}>
                  {NODE_TYPES[node.type]?.icon} {node.name}
                </Option>
              ))}
            </Select>
          </Form.Item>

          <Form.Item
            name="relation_type"
            label="关系类型"
            rules={[{ required: true, message: '请选择关系类型' }]}
          >
            <Select placeholder="选择关系类型">
              {Object.entries(EDGE_TYPES).map(([key, config]) => (
                <Option key={key} value={key}>
                  {config.label}
                </Option>
              ))}
            </Select>
          </Form.Item>

          <Form.Item
            name="label"
            label="关系标签"
          >
            <Input placeholder="输入关系标签（可选）" />
          </Form.Item>

          <Form.Item>
            <Space>
              <Button type="primary" htmlType="submit">
                创建
              </Button>
              <Button onClick={() => {
                setAddEdgeVisible(false)
                edgeForm.resetFields()
              }}>
                取消
              </Button>
            </Space>
          </Form.Item>
        </Form>
      </Modal>
    </div>
  )
}

export default KnowledgeGraph
