import { useState, useEffect } from 'react'
import { 
  BugOutlined, 
  WarningOutlined, 
  CheckCircleOutlined, 
  ExclamationCircleOutlined 
} from '@ant-design/icons'

// 模拟统计数据
const mockStats = {
  total: 156,
  unresolved: 23,
  resolved: 133,
  by_severity: {
    critical: 5,
    high: 12,
    medium: 45,
    low: 67,
    info: 27
  }
}

function ErrorStats() {
  const [stats, setStats] = useState(mockStats)

  const severityCards = [
    {
      title: '严重错误',
      value: stats.by_severity.critical,
      icon: <ExclamationCircleOutlined className="text-2xl" />,
      color: 'text-error'
    },
    {
      title: '高级错误',
      value: stats.by_severity.high,
      icon: <WarningOutlined className="text-2xl" />,
      color: 'text-warning'
    },
    {
      title: '未解决',
      value: stats.unresolved,
      icon: <BugOutlined className="text-2xl" />,
      color: 'text-primary'
    },
    {
      title: '已解决',
      value: stats.resolved,
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
