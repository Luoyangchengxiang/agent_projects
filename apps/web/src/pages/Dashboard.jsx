import { useState, useEffect } from 'react'
import { 
  RobotOutlined, 
  CheckCircleOutlined, 
  CloseCircleOutlined, 
  ClockCircleOutlined,
  LoadingOutlined,
  FileTextOutlined,
  FilterOutlined
} from '@ant-design/icons'
import { Select, Tag, Empty } from 'antd'
import { dashboardApi } from '@agent-monitor/api'

function Dashboard() {
  const [stats, setStats] = useState(null)
  const [loading, setLoading] = useState(true)
  const [summaries, setSummaries] = useState([])
  const [summariesLoading, setSummariesLoading] = useState(false)
  const [agentGroups, setAgentGroups] = useState([])
  const [selectedGroup, setSelectedGroup] = useState(null)

  useEffect(() => {
    loadStats()
    loadAgentGroups()
    loadSummaries()
  }, [])

  useEffect(() => {
    loadSummaries()
  }, [selectedGroup])

  const loadStats = async () => {
    try {
      const response = await dashboardApi.getStats()
      if (response.success) {
        setStats(response.data)
      }
    } catch (error) {
      console.error('加载统计数据失败:', error)
    } finally {
      setLoading(false)
    }
  }

  const loadAgentGroups = async () => {
    try {
      const response = await dashboardApi.getAgentGroups()
      if (response.success) {
        setAgentGroups(response.data || [])
      }
    } catch (error) {
      console.error('加载智能体组失败:', error)
    }
  }

  const loadSummaries = async () => {
    setSummariesLoading(true)
    try {
      const params = { per_page: 5 }
      if (selectedGroup) {
        params.agent_group = selectedGroup
      }
      const response = await dashboardApi.getResultSummaries(params)
      if (response.success) {
        setSummaries(response.data?.data || [])
      }
    } catch (error) {
      console.error('加载执行结果汇总失败:', error)
    } finally {
      setSummariesLoading(false)
    }
  }

  const statCards = [
    {
      title: 'Agent总数',
      value: stats?.total_agents || 0,
      icon: <RobotOutlined className="text-2xl" />,
      color: 'text-primary'
    },
    {
      title: '在线Agent',
      value: stats?.online_agents || 0,
      icon: <CheckCircleOutlined className="text-2xl" />,
      color: 'text-success'
    },
    {
      title: '离线Agent',
      value: stats?.offline_agents || 0,
      icon: <CloseCircleOutlined className="text-2xl" />,
      color: 'text-muted'
    },
    {
      title: '错误Agent',
      value: stats?.error_agents || 0,
      icon: <ClockCircleOutlined className="text-2xl" />,
      color: 'text-error'
    }
  ]

  // 截取结果摘要
  const truncateSummary = (text, maxLen = 100) => {
    if (!text) return '无摘要'
    return text.length > maxLen ? text.substring(0, maxLen) + '...' : text
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <LoadingOutlined className="text-4xl text-primary" />
      </div>
    )
  }

  return (
    <div>
      {/* 页面标题 */}
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-primary">仪表盘</h1>
        <p className="text-secondary mt-1">监控系统概览</p>
      </div>

      {/* 统计卡片 */}
      <div className="grid-dashboard mb-6">
        {statCards.map((card, index) => (
          <div key={index} className="card hoverable">
            <div className="card-body flex items-center justify-between">
              <div>
                <p className="text-muted text-sm">{card.title}</p>
                <p className={`text-3xl font-bold mt-1 ${card.color}`}>
                  {card.value}
                </p>
              </div>
              <div className={`${card.color} opacity-80`}>
                {card.icon}
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* 详细统计 */}
      <div className="grid-detail">
        {/* 执行统计 */}
        <div className="card">
          <div className="card-header">
            <h3 className="text-lg font-semibold text-primary">执行统计</h3>
          </div>
          <div className="card-body space-y-4">
            <div className="flex justify-between items-center">
              <span className="text-secondary">总执行次数</span>
              <span className="text-primary font-semibold">{stats?.total_executions || 0}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-secondary">成功率</span>
              <span className="text-success font-semibold">{stats?.success_rate || 0}%</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-secondary">平均耗时</span>
              <span className="text-primary font-semibold">{stats?.avg_duration || 0}s</span>
            </div>
          </div>
        </div>

        {/* 执行结果汇总 */}
        <div className="card">
          <div className="card-header flex items-center justify-between">
            <h3 className="text-lg font-semibold text-primary">
              <FileTextOutlined className="mr-2" />
              执行结果汇总
            </h3>
            <div className="flex items-center gap-2">
              <FilterOutlined className="text-muted" />
              <Select
                placeholder="全部智能体组"
                allowClear
                style={{ width: 150 }}
                value={selectedGroup}
                onChange={(value) => setSelectedGroup(value)}
                options={agentGroups.map(g => ({
                  value: g.agent_group,
                  label: `${g.agent_group} (${g.count})`
                }))}
              />
            </div>
          </div>
          <div className="card-body">
            {summariesLoading ? (
              <div className="flex justify-center py-8">
                <LoadingOutlined className="text-2xl text-primary" />
              </div>
            ) : summaries.length > 0 ? (
              <div className="space-y-3">
                {summaries.map((item) => (
                  <div key={item.id} className="p-3 rounded-lg hoverable" style={{ background: 'var(--bg-surface)' }}>
                    <div className="flex items-start justify-between mb-2">
                      <div className="flex items-center gap-2">
                        <Tag color={item.status === 'success' ? 'success' : item.status === 'failed' ? 'error' : 'processing'}>
                          {item.status === 'success' ? '成功' : item.status === 'failed' ? '失败' : '运行中'}
                        </Tag>
                        <span className="text-sm text-muted">
                          {item.agent?.name || `Agent-${item.agent_id}`}
                        </span>
                        {item.agent_group && (
                          <Tag>{item.agent_group}</Tag>
                        )}
                      </div>
                      <span className="text-xs text-muted">
                        {new Date(item.created_at).toLocaleString('zh-CN')}
                      </span>
                    </div>
                    <p className="text-sm text-primary">
                      {truncateSummary(item.result_summary)}
                    </p>
                  </div>
                ))}
              </div>
            ) : (
              <Empty 
                description="暂无执行结果" 
                image={Empty.PRESENTED_IMAGE_SIMPLE}
              />
            )}
          </div>
        </div>

        {/* 系统状态 */}
        <div className="card">
          <div className="card-header">
            <h3 className="text-lg font-semibold text-primary">系统状态</h3>
          </div>
          <div className="card-body space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-secondary">CPU使用率</span>
              <div className="flex items-center gap-2">
                <div className="w-24 h-2 bg-surface rounded-full overflow-hidden">
                  <div className="w-1/3 h-full bg-primary rounded-full"></div>
                </div>
                <span className="text-sm text-primary">33%</span>
              </div>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-secondary">内存使用率</span>
              <div className="flex items-center gap-2">
                <div className="w-24 h-2 bg-surface rounded-full overflow-hidden">
                  <div className="w-1/2 h-full bg-success rounded-full"></div>
                </div>
                <span className="text-sm text-primary">50%</span>
              </div>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-secondary">磁盘使用率</span>
              <div className="flex items-center gap-2">
                <div className="w-24 h-2 bg-surface rounded-full overflow-hidden">
                  <div className="w-1/4 h-full bg-warning rounded-full"></div>
                </div>
                <span className="text-sm text-primary">25%</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

export default Dashboard
