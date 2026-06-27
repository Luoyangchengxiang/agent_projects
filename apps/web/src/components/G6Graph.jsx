/**
 * G6 知识图谱渲染组件
 * 使用 @antv/g6 v5 实现力导向图
 * 与 ECharts 版本共享相同的数据结构和交互逻辑
 */
import React, { useEffect, useRef, useCallback } from 'react'
import { Graph } from '@antv/g6'
import { NODE_TYPES, EDGE_TYPES, getNodeStatus } from '../constants/graphConstants'
import { escapeHtml } from '../utils/htmlUtils'

// 获取节点类型配置
const getTypeConfig = (type) => NODE_TYPES[type] || NODE_TYPES.agent

// 获取边类型配置
const getEdgeConfig = (relationType) => EDGE_TYPES[relationType] || EDGE_TYPES.contains

function G6Graph({ graphData, onNodeClick, highlightNodeIds = [] }) {
  const containerRef = useRef(null)
  const graphRef = useRef(null)
  const onNodeClickRef = useRef(onNodeClick)

  // 保持回调引用稳定
  useEffect(() => {
    onNodeClickRef.current = onNodeClick
  }, [onNodeClick])

  // 将数据转换为 G6 格式
  const transformData = useCallback(() => {
    if (!graphData?.nodes?.length) return null

    const nodes = graphData.nodes.map((node) => {
      const typeConfig = getTypeConfig(node.type)
      const status = getNodeStatus(node)
      const isRunning = status === 'running'
      const isHighlighted = highlightNodeIds.length === 0 || highlightNodeIds.includes(node.id)
      const name = node.name || '未命名'

      return {
        id: String(node.id),
        data: {
          ...node,
          status,
          typeConfig,
        },
        style: {
          size: node.type === 'agent_group' ? 60 : node.type === 'agent' ? 45 : 35,
          fill: typeConfig.color,
          stroke: isRunning ? '#10b981' : 'rgba(255,255,255,0.15)',
          lineWidth: isRunning ? 3 : 1.5,
          opacity: isHighlighted ? 1 : 0.15,
          shadowColor: isRunning ? '#10b981' : typeConfig.color,
          shadowBlur: isRunning ? 20 : 8,
          cursor: 'pointer',
          labelText: name.length > 8 ? name.substring(0, 8) + '...' : name,
          labelFill: '#e0e0e0',
          labelFontSize: 12,
          labelPlacement: 'bottom',
          labelOffsetY: 8,
        },
      }
    })

    const edges = graphData.edges.map((edge) => {
      const edgeConfig = getEdgeConfig(edge.relation_type)
      return {
        id: `edge-${edge.source_id}-${edge.target_id}-${edge.relation_type}`,
        source: String(edge.source_id),
        target: String(edge.target_id),
        style: {
          stroke: edgeConfig.color,
          lineWidth: 2,
          opacity: 0.5,
          endArrow: true,
          endArrowSize: 6,
          labelText: edge.label || edgeConfig.label,
          labelFill: '#9ca3af',
          labelFontSize: 10,
        },
      }
    })

    return { nodes, edges }
  }, [graphData, highlightNodeIds])

  // 初始化 + 更新 + 清理：单一 useEffect
  useEffect(() => {
    if (!containerRef.current) return

    const data = transformData()
    if (!data) return

    const container = containerRef.current
    const width = container.offsetWidth || 800
    const height = container.offsetHeight || 500

    // 如果已有图实例，直接更新数据
    if (graphRef.current) {
      graphRef.current.setData(data)
      graphRef.current.render()
      return
    }

    const graph = new Graph({
      container,
      width,
      height,
      data,
      autoFit: 'view',
      padding: 40,
      animation: true,
      node: {
        animation: {
          update: ['position'],
        },
      },
      layout: {
        type: 'd3-force',
        preventOverlap: true,
        nodeSize: 50,
        linkDistance: 150,
        chargeStrength: -300,
        collideRadius: 30,
        gravity: 0.05,
      },
      behaviors: ['drag-canvas', 'zoom-canvas', 'drag-element'],
      plugins: [
        {
          type: 'tooltip',
          enable: (e) => e.targetType === 'node',
          getContent: (e, items) => {
            const item = items?.[0]
            if (!item) return ''
            const node = item.data || item
            const typeConfig = node.typeConfig || getTypeConfig(node.type)
            const status = node.status
            const statusText = status === 'running'
              ? '<span style="color: #10b981;">● 运行中</span>'
              : '<span style="color: #9ca3af;">○ 空闲</span>'
            const safeName = escapeHtml(node.name)
            const safeDesc = node.description ? `<div style="color: #9ca3af; max-width: 200px; word-break: break-all; margin-top: 4px;">描述: ${escapeHtml(node.description)}</div>` : ''

            return `
              <div style="padding: 8px; background: rgba(26, 26, 46, 0.95); border: 1px solid rgba(255,255,255,0.1); border-radius: 8px; color: #e0e0e0; font-size: 13px;">
                <div style="font-size: 15px; font-weight: bold; margin-bottom: 6px;">
                  ${escapeHtml(typeConfig.icon)} ${safeName}
                </div>
                <div style="color: #9ca3af; margin-bottom: 3px;">类型: ${escapeHtml(typeConfig.label)}</div>
                <div>状态: ${statusText}</div>
                ${safeDesc}
              </div>
            `
          },
          style: {
            background: 'transparent',
            border: 'none',
            boxShadow: 'none',
          },
        },
      ],
    })

    graph.render()

    // 节点点击事件（通过 ref 调用最新回调）
    graph.on('node:click', (e) => {
      const nodeId = e.target?.id
      if (nodeId && onNodeClickRef.current) {
        onNodeClickRef.current(nodeId)
      }
    })

    graphRef.current = graph

    // 响应式调整
    const resizeObserver = new ResizeObserver(() => {
      if (graphRef.current && container) {
        graphRef.current.setSize(container.offsetWidth, container.offsetHeight)
      }
    })
    resizeObserver.observe(container)

    // cleanup：断开 ResizeObserver（图实例在卸载时销毁）
    return () => {
      resizeObserver.disconnect()
    }
  }, [transformData])

  // 组件卸载时销毁图
  useEffect(() => {
    return () => {
      if (graphRef.current) {
        graphRef.current.destroy()
        graphRef.current = null
      }
    }
  }, [])

  return (
    <div
      ref={containerRef}
      style={{ width: '100%', height: '100%', minHeight: 500 }}
    />
  )
}

export default G6Graph
