import { useState, useEffect } from 'react'
import { 
  BugOutlined, 
  WarningOutlined, 
  CheckCircleOutlined, 
  ExclamationCircleOutlined 
} from '@ant-design/icons'
import request from '../services/request'

function ErrorStats() {
  const [stats, setStats] = useState({
    total: 0,
    unresolved: 0,
    resolved: 0,
    by_severity: {
      critical: 0,
      high: 0,
      medium: 0,
      low: 0,
      info: 0
    }
  })

  const fetchStats = async () => {
    try {
      const res = await request.get('/error-logs/stats')
      if (res.success) {
        setStats(res.data)
      }
    } catch (error) {
      console.error('获取错误统计失败:', error)
    }
  }

  useEffect(() => {
    fetchStats()
  }, [])

  const severityCards = [
    {
      title: '严重错误',
      value: stats.by_severity?.critical || 0,
      icon: <ExclamationCircleOutlined className="text-2xl" />,
      color: 'text-error'
    },
    {
      title: '高级错误',
      value: stats.by_severity?.high || 0,
      icon: <WarningOutlined className="text-2xl" />,
      color: 'text-warning'
    },
    {
      title: '未解决',
      value: stats.unresolved || 0,
      icon: <BugOutlined className="text-2xl" />,
      color: 'text-primary'
    },
    {
      title: '已解决',
      value: stats.resolved || 0,
      icon: <CheckCircleOutlined className="text-2xl" />,
      color: 'text-success'
    }
  ]

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
      {severityCards.map((card, index) => (
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
  )
}

export default ErrorStats
