import React, { useState, useEffect } from 'react'
import {
  Card,
  Button,
  Table,
  Space,
  Tag,
  Modal,
  DatePicker,
  message,
  Popconfirm,
  Typography,
  Empty,
  Spin,
} from 'antd'
import {
  FileTextOutlined,
  DownloadOutlined,
  DeleteOutlined,
  PlusOutlined,
  ReloadOutlined,
  CalendarOutlined,
  ShoppingOutlined,
  BarChartOutlined,
} from '@ant-design/icons'
import { reportsApi } from '../services/reportsApi'
import dayjs from 'dayjs'

const { RangePicker } = DatePicker
const { Title, Text, Paragraph } = Typography

function Reports() {
  const [reports, setReports] = useState([])
  const [loading, setLoading] = useState(false)
  const [generating, setGenerating] = useState(false)
  const [pagination, setPagination] = useState({
    current: 1,
    pageSize: 10,
    total: 0,
  })
  const [customModalVisible, setCustomModalVisible] = useState(false)
  const [customDateRange, setCustomDateRange] = useState(null)
  const [detailModalVisible, setDetailModalVisible] = useState(false)
  const [currentReport, setCurrentReport] = useState(null)

  // 加载报告列表
  const loadReports = async (page = 1) => {
    setLoading(true)
    try {
      const res = await reportsApi.getList({
        page,
        per_page: pagination.pageSize,
      })
      if (res.data.success) {
        setReports(res.data.data)
        setPagination({
          ...pagination,
          current: page,
          total: res.data.pagination.total,
        })
      }
    } catch (error) {
      console.error('加载报告列表失败:', error)
      message.error('加载失败')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadReports()
  }, [])

  // 生成报告
  const handleGenerate = async (type) => {
    setGenerating(true)
    try {
      let res
      switch (type) {
        case 'weekly':
          res = await reportsApi.generateWeekly()
          break
        case 'monthly':
          res = await reportsApi.generateMonthly()
          break
        case 'selection':
          res = await reportsApi.generateSelection()
          break
        default:
          return
      }

      if (res.data.success) {
        message.success(res.data.message)
        loadReports()
      }
    } catch (error) {
      console.error('生成报告失败:', error)
      message.error('生成报告失败')
    } finally {
      setGenerating(false)
    }
  }

  // 生成自定义报告
  const handleGenerateCustom = async () => {
    if (!customDateRange || customDateRange.length !== 2) {
      message.warning('请选择日期范围')
      return
    }

    setGenerating(true)
    try {
      const startDate = customDateRange[0].format('YYYY-MM-DD')
      const endDate = customDateRange[1].format('YYYY-MM-DD')
      
      const res = await reportsApi.generateCustom(startDate, endDate)
      if (res.data.success) {
        message.success(res.data.message)
        setCustomModalVisible(false)
        setCustomDateRange(null)
        loadReports()
      }
    } catch (error) {
      console.error('生成报告失败:', error)
      message.error('生成报告失败')
    } finally {
      setGenerating(false)
    }
  }

  // 下载报告
  const handleDownload = async (record) => {
    try {
      const res = await reportsApi.download(record.id)
      
      // 创建下载链接
      const url = window.URL.createObjectURL(new Blob([res.data]))
      const link = document.createElement('a')
      link.href = url
      link.setAttribute('download', record.file_path ? record.file_path.split('/').pop() : `report_${record.id}.csv`)
      document.body.appendChild(link)
      link.click()
      link.remove()
      window.URL.revokeObjectURL(url)
      
      message.success('下载成功')
    } catch (error) {
      console.error('下载失败:', error)
      message.error('下载失败')
    }
  }

  // 删除报告
  const handleDelete = async (id) => {
    try {
      const res = await reportsApi.delete(id)
      if (res.data.success) {
        message.success('删除成功')
        loadReports(pagination.current)
      }
    } catch (error) {
      console.error('删除失败:', error)
      message.error('删除失败')
    }
  }

  // 查看详情
  const handleViewDetail = (record) => {
    setCurrentReport(record)
    setDetailModalVisible(true)
  }

  // 表格列定义
  const columns = [
    {
      title: '报告标题',
      dataIndex: 'title',
      key: 'title',
      ellipsis: true,
      render: (text, record) => (
        <a onClick={() => handleViewDetail(record)}>{text}</a>
      ),
    },
    {
      title: '类型',
      dataIndex: 'type',
      key: 'type',
      width: 100,
      render: (type) => {
        const typeMap = {
          weekly: { color: 'blue', text: '周报' },
          monthly: { color: 'purple', text: '月报' },
          selection: { color: 'green', text: '选品报告' },
          custom: { color: 'orange', text: '自定义' },
        }
        const config = typeMap[type] || { color: 'default', text: type }
        return <Tag color={config.color}>{config.text}</Tag>
      },
    },
    {
      title: '格式',
      dataIndex: 'format',
      key: 'format',
      width: 80,
      render: (format) => (
        <Tag>{format.toUpperCase()}</Tag>
      ),
    },
    {
      title: '生成人',
      dataIndex: ['generator', 'name'],
      key: 'generator',
      width: 100,
      render: (name) => name || '-',
    },
    {
      title: '生成时间',
      dataIndex: 'created_at',
      key: 'created_at',
      width: 180,
      render: (text) => dayjs(text).format('YYYY-MM-DD HH:mm:ss'),
    },
    {
      title: '操作',
      key: 'action',
      width: 200,
      render: (_, record) => (
        <Space size="small">
          <Button
            type="link"
            size="small"
            icon={<DownloadOutlined />}
            onClick={() => handleDownload(record)}
          >
            下载
          </Button>
          <Popconfirm
            title="确定删除此报告？"
            onConfirm={() => handleDelete(record.id)}
            okText="确定"
            cancelText="取消"
          >
            <Button type="link" size="small" danger icon={<DeleteOutlined />}>
              删除
            </Button>
          </Popconfirm>
        </Space>
      ),
    },
  ]

  return (
    <div>
      {/* 标题栏 */}
      <div style={{ marginBottom: 24, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <Title level={4} style={{ margin: 0 }}>
          <FileTextOutlined style={{ marginRight: 8 }} />
          数据报告
        </Title>
        <Button
          icon={<ReloadOutlined />}
          onClick={() => loadReports(pagination.current)}
        >
          刷新
        </Button>
      </div>

      {/* 快速生成卡片 */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 16, marginBottom: 24 }}>
        <Card
          hoverable
          onClick={() => handleGenerate('weekly')}
          style={{ textAlign: 'center' }}
        >
          <CalendarOutlined style={{ fontSize: 32, color: '#1890ff', marginBottom: 8 }} />
          <div style={{ fontWeight: 500 }}>生成周报</div>
          <Text type="secondary" style={{ fontSize: 12 }}>上周执行数据</Text>
        </Card>
        
        <Card
          hoverable
          onClick={() => handleGenerate('monthly')}
          style={{ textAlign: 'center' }}
        >
          <BarChartOutlined style={{ fontSize: 32, color: '#722ed1', marginBottom: 8 }} />
          <div style={{ fontWeight: 500 }}>生成月报</div>
          <Text type="secondary" style={{ fontSize: 12 }}>上月执行数据</Text>
        </Card>
        
        <Card
          hoverable
          onClick={() => handleGenerate('selection')}
          style={{ textAlign: 'center' }}
        >
          <ShoppingOutlined style={{ fontSize: 32, color: '#52c41a', marginBottom: 8 }} />
          <div style={{ fontWeight: 500 }}>选品报告</div>
          <Text type="secondary" style={{ fontSize: 12 }}>近30天选品数据</Text>
        </Card>
        
        <Card
          hoverable
          onClick={() => setCustomModalVisible(true)}
          style={{ textAlign: 'center' }}
        >
          <PlusOutlined style={{ fontSize: 32, color: '#fa8c16', marginBottom: 8 }} />
          <div style={{ fontWeight: 500 }}>自定义报告</div>
          <Text type="secondary" style={{ fontSize: 12 }}>选择日期范围</Text>
        </Card>
      </div>

      {/* 报告列表 */}
      <Card title="历史报告">
        <Table
          columns={columns}
          dataSource={reports}
          rowKey="id"
          loading={loading}
          pagination={{
            ...pagination,
            showSizeChanger: false,
            showQuickJumper: true,
            showTotal: (total) => `共 ${total} 份报告`,
            onChange: (page) => loadReports(page),
          }}
          locale={{
            emptyText: <Empty description="暂无报告，点击上方卡片生成" />,
          }}
        />
      </Card>

      {/* 自定义日期弹窗 */}
      <Modal
        title="生成自定义报告"
        open={customModalVisible}
        onOk={handleGenerateCustom}
        onCancel={() => {
          setCustomModalVisible(false)
          setCustomDateRange(null)
        }}
        okText="生成"
        cancelText="取消"
        confirmLoading={generating}
      >
        <div style={{ padding: '16px 0' }}>
          <Text style={{ display: 'block', marginBottom: 8 }}>选择日期范围：</Text>
          <RangePicker
            style={{ width: '100%' }}
            value={customDateRange}
            onChange={(dates) => setCustomDateRange(dates)}
            placeholder={['开始日期', '结束日期']}
          />
        </div>
      </Modal>

      {/* 报告详情弹窗 */}
      <Modal
        title="报告详情"
        open={detailModalVisible}
        onCancel={() => {
          setDetailModalVisible(false)
          setCurrentReport(null)
        }}
        footer={[
          <Button
            key="download"
            type="primary"
            icon={<DownloadOutlined />}
            onClick={() => {
              handleDownload(currentReport)
              setDetailModalVisible(false)
            }}
          >
            下载 CSV
          </Button>,
          <Button
            key="close"
            onClick={() => {
              setDetailModalVisible(false)
              setCurrentReport(null)
            }}
          >
            关闭
          </Button>,
        ]}
        width={700}
      >
        {currentReport && (
          <div>
            <div style={{ marginBottom: 16 }}>
              <Text strong>报告标题：</Text>
              <Text>{currentReport.title}</Text>
            </div>
            
            <div style={{ marginBottom: 16 }}>
              <Text strong>报告类型：</Text>
              <Tag color={
                currentReport.type === 'weekly' ? 'blue' :
                currentReport.type === 'monthly' ? 'purple' :
                currentReport.type === 'selection' ? 'green' : 'orange'
              }>
                {currentReport.type === 'weekly' ? '周报' :
                 currentReport.type === 'monthly' ? '月报' :
                 currentReport.type === 'selection' ? '选品报告' : '自定义'}
              </Tag>
            </div>
            
            <div style={{ marginBottom: 16 }}>
              <Text strong>生成时间：</Text>
              <Text>{dayjs(currentReport.created_at).format('YYYY-MM-DD HH:mm:ss')}</Text>
            </div>
            
            {currentReport.metadata && (
              <div style={{ marginBottom: 16 }}>
                <Text strong>报告周期：</Text>
                <Text>{currentReport.metadata.start_date} 至 {currentReport.metadata.end_date}</Text>
              </div>
            )}
            
            {currentReport.content && (
              <div style={{ 
                marginTop: 16, 
                padding: 16, 
                background: '#1a1a2e', 
                borderRadius: 8,
                maxHeight: 400,
                overflow: 'auto'
              }}>
                <pre style={{ 
                  whiteSpace: 'pre-wrap', 
                  wordBreak: 'break-word',
                  margin: 0,
                  fontFamily: 'monospace',
                  fontSize: 13,
                  lineHeight: 1.6,
                  color: '#e0e0e0'
                }}>
                  {currentReport.content}
                </pre>
              </div>
            )}
          </div>
        )}
      </Modal>

      {/* 加载中提示 */}
      {generating && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: 'rgba(0,0,0,0.5)',
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          zIndex: 9999,
        }}>
          <Spin size="large" tip="正在生成报告..." />
        </div>
      )}
    </div>
  )
}

export default Reports
