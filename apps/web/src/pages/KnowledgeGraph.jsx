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
  Modal,
  Form,
  Switch,
  Tooltip,
  Badge,
} from 'antd'
import {
  PlusOutlined,
  ExpandOutlined,
  CompressOutlined,
  NodeIndexOutlined,
  ApartmentOutlined,
  ReloadOutlined,
  PauseCircleOutlined,
  PlayCircleOutlined,
} from '@ant-design/icons'
import { graphApi } from '../services/graphApi'
import G6Graph from '../components/G6Graph'
import { NODE_TYPES, EDGE_TYPES, getNodeStatus } from '../constants/graphConstants'
import { escapeHtml } from '../utils/htmlUtils'

const { Search } = Input
const { Option } = Select

function KnowledgeGraph() {
  const [loading, setLoading] = useState(false)
  const [graphData, setGraphData] = useState({ nodes: [], edges: [] })
  const [searchResults, setSearchResults] = useState([])
  const [selectedNode, setSelectedNode] = useState(null)
  const [drawerVisible, setDrawerVisible] = useState(false)
  const [filterType, setFilterType] = useState(null)
  const [searchQuery, setSearchQuery] = useState('')
  const [highlightNodeIds, setHighlightNodeIds] = useState([])
  const [isFullscreen, setIsFullscreen] = useState(false)
  const [addNodeVisible, setAddNodeVisible] = useState(false)
  const [addEdgeVisible, setAddEdgeVisible] = useState(false)
  const [autoRefresh, setAutoRefresh] = useState(true)
  const [refreshInterval, setRefreshInterval] = useState(10) // 秒
  const [rendererType, setRendererType] = useState('echarts') // echarts | g6
  const [lastRefresh, setLastRefresh] = useState(null)
  const [form] = Form.useForm()
  const [edgeForm] = Form.useForm()
  const chartRef = useRef(null)
  const containerRef = useRef(null)
  const refreshTimerRef = useRef(null)
  const refreshFailCountRef = useRef(0) // 连续失败计数

  // 加载图谱数据
  const loadGraphData = useCallback(async (showLoading = true) => {
    if (showLoading) setLoading(true)
    try {
      const res = await graphApi.getData({ type: filterType })
      if (res.success) {
        setGraphData(res.data)
        setLastRefresh(new Date())
        refreshFailCountRef.current = 0 // 重置失败计数
      }
    } catch (error) {
      console.error('加载图谱数据失败:', error)
      refreshFailCountRef.current += 1
      if (showLoading) {
        message.error('加载失败')
      } else if (refreshFailCountRef.current >= 3) {
        // 连续失败3次后通知用户
        message.warning('数据刷新多次失败，请检查网络连接')
        refreshFailCountRef.current = 0 // 重置避免重复通知
      }
    } finally {
      if (showLoading) setLoading(false)
    }
  }, [filterType])

  // 初始加载
  useEffect(() => {
    loadGraphData()
  }, [loadGraphData])

  // 自动刷新
  useEffect(() => {
    if (autoRefresh) {
      refreshTimerRef.current = setInterval(() => {
        loadGraphData(false) // 静默刷新，不显示 loading
      }, refreshInterval * 1000)
    }

    return () => {
      if (refreshTimerRef.current) {
        clearInterval(refreshTimerRef.current)
      }
    }
  }, [autoRefresh, refreshInterval, loadGraphData])

  // 监听全屏状态变化
  useEffect(() => {
    const handleFullscreenChange = () => {
      setIsFullscreen(!!document.fullscreenElement)
    }
    document.addEventListener('fullscreenchange', handleFullscreenChange)
    return () => {
      document.removeEventListener('fullscreenchange', handleFullscreenChange)
    }
  }, [])

  // 搜索节点
  const handleSearch = async (value) => {
    if (!value.trim()) {
      setSearchResults([])
      setHighlightNodeIds([])
      highlightNodes([])
      return
    }

    try {
      const res = await graphApi.search(value)
      if (res.success) {
        setSearchResults(res.data)
        const ids = res.data.map(n => n.id)
        setHighlightNodeIds(ids)
        highlightNodes(ids)
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

    const chartNodes = nodes.map(node => {
      const typeConfig = NODE_TYPES[node.type] || NODE_TYPES.agent
      const status = getNodeStatus(node)
      const isRunning = status === 'running'
      
      return {
        id: node.id.toString(),
        name: node.name,
        symbolSize: node.type === 'agent_group' ? 60 : node.type === 'agent' ? 45 : 35,
        symbol: node.type === 'agent_group' ? 'roundRect' : 'circle',
        category: Object.keys(NODE_TYPES).indexOf(node.type),
        itemStyle: {
          color: typeConfig.color,
          borderColor: isRunning ? '#10b981' : '#1a1a2e',
          borderWidth: isRunning ? 3 : 2,
          shadowBlur: isRunning ? 20 : 10,
          shadowColor: isRunning ? '#10b981' : typeConfig.color,
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
        // 添加状态标记
        status: status,
        ...node,
      }
    })

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
        z: 1000,
        extraCssText: 'z-index: 1000; max-width: 280px; overflow: hidden;',
        formatter: (params) => {
          if (params.dataType === 'node') {
            const typeConfig = NODE_TYPES[params.data.type] || NODE_TYPES.agent
            const status = params.data.status
            const statusText = status === 'running' ? '<span style="color: #10b981;">● 运行中</span>' : status === 'error' ? '<span style="color: #ef4444;">● 异常</span>' : '<span style="color: #9ca3af;">○ 空闲</span>'
            const safeName = escapeHtml(params.name)
            const safeLabel = escapeHtml(typeConfig.label)
            const safeIcon = escapeHtml(typeConfig.icon)
            // 截断过长描述，保留前80字符
            const descText = params.data.description || ''
            const truncatedDesc = descText.length > 80 ? descText.substring(0, 80) + '...' : descText
            const safeDesc = truncatedDesc ? `<div style="color: #9ca3af; max-width: 250px; word-break: break-word; line-height: 1.4; margin-top: 4px; font-size: 12px;">${escapeHtml(truncatedDesc)}</div>` : ''
            
            return `
              <div style="padding: 4px 0; max-width: 280px;">
                <div style="font-size: 15px; font-weight: bold; margin-bottom: 6px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">
                  ${safeIcon} ${safeName}
                </div>
                <div style="display: flex; gap: 12px; font-size: 12px;">
                  <span style="color: #9ca3af;">${safeLabel}</span>
                  ${statusText}
                </div>
                ${safeDesc}
              </div>
            `
          }
          if (params.dataType === 'edge') {
            return escapeHtml(params.data.label?.formatter || '关联')
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
      animationDuration: 1000,
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
      zIndex: 1100,
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
  const toggleFullscreen = async () => {
    if (!containerRef.current) return

    try {
      if (!document.fullscreenElement) {
        await containerRef.current.requestFullscreen()
      } else {
        await document.exitFullscreen()
      }
    } catch (error) {
      console.error('全屏切换失败:', error)
      message.error('全屏功能不可用')
    }
  }

  // 重置搜索
  const resetSearch = () => {
    setSearchQuery('')
    setSearchResults([])
    setHighlightNodeIds([])
    highlightNodes([])
  }

  // 格式化刷新间隔显示
  const formatRefreshInterval = (seconds) => {
    if (seconds < 60) return `${seconds}秒`
    return `${Math.floor(seconds / 60)}分${seconds % 60 > 0 ? seconds % 60 + '秒' : ''}`
  }

  // G6 节点点击回调（用 useCallback 保持引用稳定，避免重建图实例）
  const handleG6NodeClick = useCallback(async (nodeId) => {
    try {
      const res = await graphApi.getNode(nodeId)
      if (res.success) {
        setSelectedNode(res.data)
        setDrawerVisible(true)
      }
    } catch (error) {
      console.error('获取节点详情失败:', error)
    }
  }, [])

  return (
    <div 
      ref={containerRef}
      style={{ 
        height: '100%', 
        display: 'flex', 
        flexDirection: 'column',
        background: isFullscreen ? '#0f1117' : 'transparent',
        padding: isFullscreen ? 24 : 0,
      }}
    >
      {/* 标题栏 */}
      <div style={{ marginBottom: 16, display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexShrink: 0 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
          <h4 style={{ margin: 0, fontSize: 18, fontWeight: 600 }}>
            <ApartmentOutlined style={{ marginRight: 8 }} />
            知识图谱
          </h4>
          
          {/* 动态状态指示器 */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <Badge 
              status={autoRefresh ? 'processing' : 'default'} 
              text={
                <span style={{ color: autoRefresh ? '#10b981' : '#9ca3af', fontSize: 12 }}>
                  {autoRefresh ? '实时更新中' : '已暂停更新'}
                </span>
              }
            />
            {lastRefresh && (
              <span style={{ color: '#6b7280', fontSize: 11 }}>
                最后更新: {lastRefresh.toLocaleTimeString('zh-CN')}
              </span>
            )}
          </div>
        </div>

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
          
          {/* 自动刷新控制 */}
          <Tooltip title={autoRefresh ? '暂停自动刷新' : '开启自动刷新'}>
            <Button
              icon={autoRefresh ? <PauseCircleOutlined /> : <PlayCircleOutlined />}
              onClick={() => setAutoRefresh(!autoRefresh)}
              type={autoRefresh ? 'primary' : 'default'}
              ghost={autoRefresh}
            >
              {autoRefresh ? formatRefreshInterval(refreshInterval) : '自动刷新'}
            </Button>
          </Tooltip>
          
          <Button
            icon={isFullscreen ? <CompressOutlined /> : <ExpandOutlined />}
            onClick={toggleFullscreen}
          >
            {isFullscreen ? '退出全屏' : '全屏'}
          </Button>
        </Space>
      </div>

      {/* 工具栏 */}
      <Card style={{ marginBottom: 16, flexShrink: 0 }} bodyStyle={{ padding: '12px 16px' }}>
        <Space size="middle" style={{ width: '100%', flexWrap: 'wrap' }}>
          <Search
            placeholder="搜索节点..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            onSearch={handleSearch}
            style={{ width: 280 }}
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

          <Button icon={<ReloadOutlined />} onClick={() => loadGraphData()}>
            刷新
          </Button>

          {/* 渲染引擎切换 */}
          <Select
            value={rendererType}
            onChange={setRendererType}
            style={{ width: 140 }}
          >
            <Option value="echarts">📊 ECharts</Option>
            <Option value="g6">🕸️ G6 图引擎</Option>
          </Select>

          {/* 刷新间隔设置 */}
          <Select
            value={refreshInterval}
            onChange={setRefreshInterval}
            style={{ width: 100 }}
            disabled={!autoRefresh}
          >
            <Option value={5}>5秒</Option>
            <Option value={10}>10秒</Option>
            <Option value={30}>30秒</Option>
            <Option value={60}>1分钟</Option>
            <Option value={300}>5分钟</Option>
          </Select>

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
                  try {
                    const res = await graphApi.getNode(node.id)
                    if (res.success) {
                      setSelectedNode(res.data)
                      setDrawerVisible(true)
                    }
                  } catch (error) {
                    console.error('获取节点详情失败:', error)
                    message.error('获取节点详情失败')
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
          flex: 1,
          minHeight: 500,
        }}
        bodyStyle={{ padding: 0, height: '100%' }}
      >
        {loading && !graphData.nodes?.length ? (
          <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100%' }}>
            <Spin size="large" tip="加载中..." />
          </div>
        ) : graphData.nodes && graphData.nodes.length > 0 ? (
          rendererType === 'g6' ? (
            <G6Graph
              graphData={graphData}
              highlightNodeIds={highlightNodeIds}
              onNodeClick={handleG6NodeClick}
            />
          ) : (
            <ReactECharts
              ref={chartRef}
              option={getChartOption()}
              style={{ height: '100%', width: '100%' }}
              onEvents={{
                click: handleChartClick,
              }}
              opts={{ renderer: 'canvas' }}
              notMerge={false}
              lazyUpdate={true}
            />
          )
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
      <Card style={{ marginTop: 16, flexShrink: 0 }} bodyStyle={{ padding: '8px 16px' }}>
        <div style={{ display: 'flex', alignItems: 'center', flexWrap: 'wrap', gap: 16 }}>
          <span style={{ color: '#9ca3af' }}>节点：</span>
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
          <span style={{ color: '#9ca3af', marginLeft: 8 }}>关系：</span>
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
          <span style={{ color: '#9ca3af', marginLeft: 8 }}>状态：</span>
          <Space size={4}>
            <div style={{
              width: 12,
              height: 12,
              borderRadius: '50%',
              background: '#10b981',
              boxShadow: '0 0 10px #10b981',
            }} />
            <span style={{ color: '#e0e0e0', fontSize: 12 }}>运行中</span>
          </Space>
          <Space size={4}>
            <div style={{
              width: 12,
              height: 12,
              borderRadius: '50%',
              background: '#6b7280',
            }} />
            <span style={{ color: '#e0e0e0', fontSize: 12 }}>空闲</span>
          </Space>
        </div>
      </Card>

      {/* 节点详情抽屉 */}
      <Drawer
        title={
          <Space>
            {selectedNode && NODE_TYPES[selectedNode.type]?.icon}
            <span>{selectedNode?.name}</span>
          </Space>
        }
        placement="right"
        onClose={() => {
          setDrawerVisible(false)
          setSelectedNode(null)
        }}
        open={drawerVisible}
        width={420}
        zIndex={1050}
      >
        {selectedNode && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
            {/* 基本信息 */}
            <div>
              <h5 style={{ marginBottom: 12, color: '#e0e0e0', fontSize: 14, fontWeight: 600 }}>基本信息</h5>
              <Descriptions column={1} bordered size="small">
                <Descriptions.Item label="类型">
                  <Tag color={NODE_TYPES[selectedNode.type]?.color}>
                    {NODE_TYPES[selectedNode.type]?.label}
                  </Tag>
                </Descriptions.Item>
                <Descriptions.Item label="名称">{selectedNode.name}</Descriptions.Item>
                <Descriptions.Item label="状态">
                  <Badge 
                    status={getNodeStatus(selectedNode) === 'running' ? 'processing' : 'default'} 
                    text={getNodeStatus(selectedNode) === 'running' ? '运行中' : '空闲'} 
                  />
                </Descriptions.Item>
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
            </div>

            {/* 关联节点 */}
            <div>
              <h5 style={{ marginBottom: 12, color: '#e0e0e0', fontSize: 14, fontWeight: 600 }}>关联节点</h5>
              <div style={{ 
                background: '#1a1a2e', 
                borderRadius: 8, 
                padding: 16,
                display: 'flex',
                flexDirection: 'column',
                gap: 12,
              }}>
                {selectedNode.outgoing_edges?.length > 0 && (
                  <div>
                    <div style={{ color: '#9ca3af', fontSize: 12, marginBottom: 8 }}>出边（指向）：</div>
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                      {selectedNode.outgoing_edges.map(edge => (
                        <Tag key={edge.id} color={EDGE_TYPES[edge.relation_type]?.color} style={{ margin: 0 }}>
                          → {edge.target?.name}
                        </Tag>
                      ))}
                    </div>
                  </div>
                )}
                {selectedNode.incoming_edges?.length > 0 && (
                  <div>
                    <div style={{ color: '#9ca3af', fontSize: 12, marginBottom: 8 }}>入边（来源）：</div>
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                      {selectedNode.incoming_edges.map(edge => (
                        <Tag key={edge.id} color={EDGE_TYPES[edge.relation_type]?.color} style={{ margin: 0 }}>
                          ← {edge.source?.name}
                        </Tag>
                      ))}
                    </div>
                  </div>
                )}
                {(!selectedNode.outgoing_edges || selectedNode.outgoing_edges.length === 0) &&
                 (!selectedNode.incoming_edges || selectedNode.incoming_edges.length === 0) && (
                  <div style={{ color: '#9ca3af', textAlign: 'center', padding: 8 }}>暂无关联节点</div>
                )}
              </div>
            </div>

            {/* 操作按钮 */}
            <div>
              <Button
                danger
                block
                onClick={() => handleDeleteNode(selectedNode.id)}
              >
                删除节点
              </Button>
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
        zIndex={1100}
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
        zIndex={1100}
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
