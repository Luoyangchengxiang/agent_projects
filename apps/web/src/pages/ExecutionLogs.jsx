import { useState, useEffect } from 'react'
import { Table, Tag, Select, DatePicker, Space, App, Button, Modal, Tooltip } from 'antd'
import { LoadingOutlined, EyeOutlined, DownOutlined, UpOutlined, LockOutlined } from '@ant-design/icons'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import { executionLogApi, permissionApi } from '@agent-monitor/api'

function ExecutionLogs() {
  const { message } = App.useApp()
  const [logs, setLogs] = useState([])
  const [loading, setLoading] = useState(true)
  const [statusFilter, setStatusFilter] = useState(null)
  const [selectedLog, setSelectedLog] = useState(null)
  const [detailVisible, setDetailVisible] = useState(false)
  const [summaryExpanded, setSummaryExpanded] = useState(false)
  const [userPermissions, setUserPermissions] = useState(null)
  const [pagination, setPagination] = useState({
    current: 1,
    pageSize: 20,
    total: 0
  })

  useEffect(() => {
    loadUserPermissions()
    loadLogs()
  }, [pagination.current, pagination.pageSize, statusFilter])

  // 加载用户权限
  const loadUserPermissions = async () => {
    try {
      const response = await permissionApi.getMe()
      if (response.success) {
        setUserPermissions(response.data)
      }
    } catch (error) {
      console.error('加载权限失败:', error)
    }
  }

  const loadLogs = async () => {
    setLoading(true)
    try {
      const response = await executionLogApi.getList({
        page: pagination.current,
        per_page: pagination.pageSize,
        status: statusFilter || undefined
      })
      
      if (response.success) {
        setLogs(response.data.data)
        setPagination({
          ...pagination,
          total: response.data.total
        })
      }
    } catch (error) {
      console.error('加载日志失败:', error)
      message.error('加载失败')
    } finally {
      setLoading(false)
    }
  }

  // 检查是否可以查看完整结果
  const canViewFullResult = () => {
    return userPermissions?.can_view_full_execution || false
  }

  const columns = [
    {
      title: 'ID',
      dataIndex: 'id',
      key: 'id',
      width: 80
    },
    {
      title: '执行者',
      key: 'executor',
      render: (_, record) => {
        // 优先显示具体智能体名称，否则显示团队名称
        const name = record.agent?.name || record.agent_group || '未知'
        const isTeam = !record.agent && record.agent_group
        return (
          <span className="text-primary font-medium">
            {isTeam && <Tag color="blue" className="mr-1">团队</Tag>}
            {name}
          </span>
        )
      }
    },
    {
      title: '任务ID',
      dataIndex: 'task_id',
      key: 'task_id',
      render: (text) => <span className="text-muted font-mono text-sm">{text}</span>
    },
    {
      title: '状态',
      dataIndex: 'status',
      key: 'status',
      render: (status) => {
        const colorMap = {
          success: 'success',
          failed: 'error',
          running: 'processing',
          pending: 'warning'
        }
        const textMap = {
          success: '成功',
          failed: '失败',
          running: '运行中',
          pending: '等待中'
        }
        return <Tag color={colorMap[status]}>{textMap[status]}</Tag>
      }
    },
    {
      title: '耗时',
      dataIndex: 'duration',
      key: 'duration',
      render: (duration) => {
        if (!duration) return <span className="text-muted">-</span>
        if (duration < 1000) return <span>{duration}ms</span>
        return <span>{(duration / 1000).toFixed(1)}s</span>
      }
    },
    {
      title: '错误信息',
      dataIndex: 'error',
      key: 'error',
      render: (error) => {
        if (!error) return <span className="text-muted">-</span>
        return <span className="text-error text-sm">{error}</span>
      }
    },
    {
      title: '执行时间',
      dataIndex: 'created_at',
      key: 'created_at',
      render: (text) => {
        if (!text) return <span className="text-muted">-</span>
        const date = new Date(text)
        const formatted = date.toLocaleString('zh-CN', {
          year: 'numeric',
          month: '2-digit',
          day: '2-digit',
          hour: '2-digit',
          minute: '2-digit',
          second: '2-digit',
          hour12: false
        })
        return <span className="text-muted">{formatted}</span>
      }
    },
    {
      title: '结果',
      key: 'result',
      width: 100,
      render: (_, record) => {
        if (!record.result_summary && !record.output) {
          return <span className="text-muted">-</span>
        }

        // 根据权限显示不同提示
        const hasFullAccess = canViewFullResult()
        
        return (
          <Tooltip title={hasFullAccess ? '点击查看完整结果' : '点击查看摘要（VIP 可查看完整内容）'}>
            <Button
              type="link"
              size="small"
              icon={hasFullAccess ? <EyeOutlined /> : <LockOutlined />}
              onClick={() => {
                setSelectedLog(record)
                setDetailVisible(true)
              }}
            >
              {hasFullAccess ? '查看' : '摘要'}
            </Button>
          </Tooltip>
        )
      }
    }
  ]

  const handleTableChange = (pag) => {
    setPagination(pag)
  }

  return (
    <div>
      {/* 页面标题 */}
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-primary">执行日志</h1>
        <p className="text-secondary mt-1">
          查看所有Agent的执行记录
          {!canViewFullResult() && (
            <span className="ml-2 text-yellow-500 text-sm">
              （当前为普通用户，仅可查看摘要）
            </span>
          )}
        </p>
      </div>

      {/* 筛选栏 */}
      <div className="card mb-6">
        <div className="card-body">
          <Space>
            <Select
              placeholder="按状态筛选"
              allowClear
              style={{ width: 150 }}
              onChange={(value) => {
                setStatusFilter(value)
                setPagination({ ...pagination, current: 1 })
              }}
              options={[
                { value: 'success', label: '成功' },
                { value: 'failed', label: '失败' },
                { value: 'running', label: '运行中' },
                { value: 'pending', label: '等待中' }
              ]}
            />
          </Space>
        </div>
      </div>

      {/* 表格 */}
      <div className="card">
        <Table
          columns={columns}
          dataSource={logs}
          rowKey="id"
          loading={loading}
          pagination={pagination}
          onChange={handleTableChange}
        />
      </div>

      {/* 结果详情弹窗 */}
      <Modal
        title={`执行结果详情 - ${selectedLog?.agent?.name || selectedLog?.agent_group || '未知'}`}
        open={detailVisible}
        onCancel={() => {
          setDetailVisible(false)
          setSelectedLog(null)
          setSummaryExpanded(false)
        }}
        footer={[
          <Button key="close" onClick={() => {
            setDetailVisible(false)
            setSelectedLog(null)
            setSummaryExpanded(false)
          }}>
            关闭
          </Button>
        ]}
        width={800}
      >
        {selectedLog && (
          <div>
            <div className="mb-4 p-3 bg-gray-800 rounded">
              <div className="flex justify-between text-sm text-gray-400">
                <span>任务ID: {selectedLog.task_id}</span>
                <span>执行时间: {new Date(selectedLog.created_at).toLocaleString('zh-CN', {
                  year: 'numeric',
                  month: '2-digit',
                  day: '2-digit',
                  hour: '2-digit',
                  minute: '2-digit',
                  second: '2-digit',
                  hour12: false
                })}</span>
              </div>
              <div className="mt-2">
                <Tag color={selectedLog.status === 'success' ? 'success' : 'error'}>
                  {selectedLog.status === 'success' ? '成功' : '失败'}
                </Tag>
                {selectedLog.duration && (
                  <span className="ml-2 text-sm text-gray-400">
                    耗时: {selectedLog.duration < 1000 ? `${selectedLog.duration}ms` : `${(selectedLog.duration / 1000).toFixed(1)}s`}
                  </span>
                )}
              </div>
            </div>

            {/* 结果摘要 - 所有用户可见 */}
            {selectedLog.result_summary && (
              <div className="mb-4">
                <div className="flex items-center justify-between mb-2">
                  <h4 className="text-sm font-medium text-gray-300">结果摘要</h4>
                  <Button 
                    type="link" 
                    size="small"
                    icon={summaryExpanded ? <UpOutlined /> : <DownOutlined />}
                    onClick={() => setSummaryExpanded(!summaryExpanded)}
                  >
                    {summaryExpanded ? '收起' : '展开全部'}
                  </Button>
                </div>
                <div className="relative">
                  <div 
                    className={`p-3 bg-gray-900 rounded text-sm text-gray-200 transition-all duration-300 ${
                      summaryExpanded ? 'max-h-none' : 'max-h-32 overflow-hidden'
                    }`}
                  >
                    {selectedLog.result_summary}
                  </div>
                  {!summaryExpanded && selectedLog.result_summary.length > 200 && (
                    <div className="absolute bottom-0 left-0 right-0 h-12 bg-gradient-to-t from-gray-900 to-transparent pointer-events-none rounded-b" />
                  )}
                </div>
              </div>
            )}

            {/* 完整输出 - 仅 VIP 和管理员可见 */}
            {selectedLog.output && (
              <div>
                <div className="flex items-center justify-between mb-2">
                  <h4 className="text-sm font-medium text-gray-300">完整输出</h4>
                  {!canViewFullResult() && (
                    <span className="text-xs text-yellow-500 flex items-center gap-1">
                      <LockOutlined /> 升级 VIP 查看完整内容
                    </span>
                  )}
                </div>
                {canViewFullResult() ? (
                  <div className="p-4 bg-gray-900 rounded text-sm text-gray-200 max-h-96 overflow-auto markdown-body">
                    <ReactMarkdown 
                      remarkPlugins={[remarkGfm]}
                      components={{
                        h1: ({node, ...props}) => <h1 className="text-2xl font-bold text-white mb-4 mt-6" {...props} />,
                        h2: ({node, ...props}) => <h2 className="text-xl font-semibold text-white mb-3 mt-5" {...props} />,
                        h3: ({node, ...props}) => <h3 className="text-lg font-medium text-white mb-2 mt-4" {...props} />,
                        p: ({node, ...props}) => <p className="mb-3 leading-relaxed" {...props} />,
                        ul: ({node, ...props}) => <ul className="list-disc pl-6 mb-3 space-y-1" {...props} />,
                        ol: ({node, ...props}) => <ol className="list-decimal pl-6 mb-3 space-y-1" {...props} />,
                        li: ({node, ...props}) => <li className="text-gray-200" {...props} />,
                        strong: ({node, ...props}) => <strong className="font-semibold text-white" {...props} />,
                        em: ({node, ...props}) => <em className="italic text-gray-300" {...props} />,
                        code: ({node, inline, ...props}) => 
                          inline 
                            ? <code className="px-1.5 py-0.5 bg-gray-800 rounded text-sm text-emerald-400 font-mono" {...props} />
                            : <code className="block p-3 bg-gray-800 rounded text-sm text-gray-200 font-mono overflow-x-auto" {...props} />,
                        pre: ({node, ...props}) => <pre className="mb-3 rounded overflow-hidden" {...props} />,
                        blockquote: ({node, ...props}) => <blockquote className="border-l-4 border-blue-500 pl-4 italic text-gray-400 mb-3" {...props} />,
                        table: ({node, ...props}) => <table className="w-full border-collapse mb-3" {...props} />,
                        thead: ({node, ...props}) => <thead className="bg-gray-800" {...props} />,
                        th: ({node, ...props}) => <th className="px-4 py-2 text-left text-white font-medium border border-gray-700" {...props} />,
                        td: ({node, ...props}) => <td className="px-4 py-2 border border-gray-700" {...props} />,
                        hr: ({node, ...props}) => <hr className="border-gray-700 my-4" {...props} />,
                        a: ({node, ...props}) => <a className="text-blue-400 hover:text-blue-300 underline" {...props} />,
                      }}
                    >
                      {selectedLog.output}
                    </ReactMarkdown>
                  </div>
                ) : (
                  <div className="p-8 bg-gray-900 rounded text-center">
                    <LockOutlined className="text-4xl text-gray-600 mb-3" />
                    <p className="text-gray-400">完整内容仅对 VIP 用户和管理员开放</p>
                    <p className="text-sm text-gray-500 mt-1">升级 VIP 即可查看完整执行结果</p>
                  </div>
                )}
              </div>
            )}

            {selectedLog.error && (
              <div className="mt-4">
                <h4 className="text-sm font-medium text-red-400 mb-2">错误信息</h4>
                <div className="p-3 bg-red-900/20 border border-red-800 rounded text-sm text-red-300">
                  {selectedLog.error}
                </div>
              </div>
            )}
          </div>
        )}
      </Modal>
    </div>
  )
}

export default ExecutionLogs
