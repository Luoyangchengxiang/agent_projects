import { useState, useEffect, useCallback } from 'react'
import { 
  RobotOutlined, 
  CheckCircleOutlined, 
  CloseCircleOutlined, 
  ClockCircleOutlined,
  LoadingOutlined,
  ReloadOutlined
} from '@ant-design/icons'
import { dashboardApi } from '@agent-monitor/api'

function Dashboard() {
  const [stats, setStats] = useState(null)
  const [system, setSystem] = useState(null)
  const [loading, setLoading] = useState(true)
  const [systemLoading, setSystemLoading] = useState(false)

  useEffect(() => {
    loadStats()
    loadSystem()
    
    // 每 10 秒自动刷新系统状态
    const interval = setInterval(loadSystem, 10000)
    return () => clearInterval(interval)
  }, [])

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

  const loadSystem = useCallback(async () => {
    try {
      setSystemLoading(true)
      const response = await dashboardApi.getSystem()
      if (response.success) {
        setSystem(response.data)
      }
    } catch (error) {
      console.error('加载系统状态失败:', error)
    } finally {
      setSystemLoading(false)
    }
  }, [])

  // 获取使用率颜色
  const getUsageColor = (usage) => {
    if (usage >= 90) return 'bg-error'
    if (usage >= 70) return 'bg-warning'
    return 'bg-success'
  }

  // 获取使用率文本颜色
  const getUsageTextColor = (usage) => {
    if (usage >= 90) return 'text-error'
    if (usage >= 70) return 'text-warning'
    return 'text-success'
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

        {/* 系统状态 */}
        <div className="card">
          <div className="card-header flex items-center justify-between">
            <h3 className="text-lg font-semibold text-primary">系统状态</h3>
            <button 
              onClick={loadSystem}
              disabled={systemLoading}
              className="text-secondary hover:text-primary transition-colors"
              title="刷新系统状态"
            >
              <ReloadOutlined className={systemLoading ? 'animate-spin' : ''} />
            </button>
          </div>
          <div className="card-body space-y-3">
            {/* CPU 使用率 */}
            <div className="flex items-center justify-between">
              <span className="text-secondary">CPU使用率</span>
              <div className="flex items-center gap-2">
                <div className="w-24 h-2 bg-surface rounded-full overflow-hidden">
                  <div 
                    className={`h-full rounded-full transition-all duration-500 ${getUsageColor(system?.cpu?.usage || 0)}`}
                    style={{ width: `${system?.cpu?.usage || 0}%` }}
                  ></div>
                </div>
                <span className={`text-sm font-medium ${getUsageTextColor(system?.cpu?.usage || 0)}`}>
                  {system?.cpu?.usage || 0}%
                </span>
              </div>
            </div>
            
            {/* 内存使用率 */}
            <div className="flex items-center justify-between">
              <span className="text-secondary">内存使用率</span>
              <div className="flex items-center gap-2">
                <div className="w-24 h-2 bg-surface rounded-full overflow-hidden">
                  <div 
                    className={`h-full rounded-full transition-all duration-500 ${getUsageColor(system?.memory?.usage || 0)}`}
                    style={{ width: `${system?.memory?.usage || 0}%` }}
                  ></div>
                </div>
                <span className={`text-sm font-medium ${getUsageTextColor(system?.memory?.usage || 0)}`}>
                  {system?.memory?.usage || 0}%
                </span>
              </div>
            </div>
            
            {/* 磁盘使用率 */}
            <div className="flex items-center justify-between">
              <span className="text-secondary">磁盘使用率</span>
              <div className="flex items-center gap-2">
                <div className="w-24 h-2 bg-surface rounded-full overflow-hidden">
                  <div 
                    className={`h-full rounded-full transition-all duration-500 ${getUsageColor(system?.disk?.usage || 0)}`}
                    style={{ width: `${system?.disk?.usage || 0}%` }}
                  ></div>
                </div>
                <span className={`text-sm font-medium ${getUsageTextColor(system?.disk?.usage || 0)}`}>
                  {system?.disk?.usage || 0}%
                </span>
              </div>
            </div>

            {/* 详细信息 */}
            {system && (
              <div className="mt-4 pt-4 border-t border-border">
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <span className="text-muted">CPU核心：</span>
                    <span className="text-primary ml-1">{system.cpu?.cores || '-'}</span>
                  </div>
                  <div>
                    <span className="text-muted">运行时间：</span>
                    <span className="text-primary ml-1">{system.uptime || '-'}</span>
                  </div>
                  <div>
                    <span className="text-muted">总内存：</span>
                    <span className="text-primary ml-1">{system.memory?.total || 0} GB</span>
                  </div>
                  <div>
                    <span className="text-muted">可用内存：</span>
                    <span className="text-primary ml-1">{system.memory?.free || 0} GB</span>
                  </div>
                  <div>
                    <span className="text-muted">总磁盘：</span>
                    <span className="text-primary ml-1">{system.disk?.total || 0} GB</span>
                  </div>
                  <div>
                    <span className="text-muted">可用磁盘：</span>
                    <span className="text-primary ml-1">{system.disk?.free || 0} GB</span>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

export default Dashboard
