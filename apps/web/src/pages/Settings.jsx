/**
 * 设置页面
 * 包含：个人信息、修改密码、看板娘设置、系统设置（管理员）、系统信息
 */
import { useState, useEffect } from 'react'
import {
  UserOutlined, LockOutlined, SmileOutlined,
  InfoCircleOutlined, CrownOutlined, SaveOutlined,
  EyeInvisibleOutlined, EyeOutlined,
  SettingOutlined, CloudOutlined, BellOutlined,
  LoadingOutlined
} from '@ant-design/icons'
import { Card, Form, Input, Button, App, Tag, Divider, Descriptions, Switch, InputNumber, Tabs } from 'antd'
import useAuthStore from '../stores/authStore'
import useMascotStore from '../stores/mascotStore'
import { authService } from '../services/authService'
import { settingsApi } from '@agent-monitor/api'

export default function Settings() {
  const { message } = App.useApp()
  const { user } = useAuthStore()
  const { modelId, models, hasSelectedModel, reset: resetMascot } = useMascotStore()
  const [passwordForm] = Form.useForm()
  const [changingPassword, setChangingPassword] = useState(false)

  // 系统设置状态
  const [systemSettings, setSystemSettings] = useState(null)
  const [settingsLoading, setSettingsLoading] = useState(false)
  const [settingsSaving, setSettingsSaving] = useState(false)
  const [ollamaForm] = Form.useForm()
  const [notificationForm] = Form.useForm()
  const [systemForm] = Form.useForm()

  const isAdmin = user?.role === 'admin'
  const currentModel = models.find(m => m.id === modelId)

  // 加载系统设置（仅管理员）
  useEffect(() => {
    if (isAdmin) loadSystemSettings()
  }, [isAdmin])

  const loadSystemSettings = async () => {
    setSettingsLoading(true)
    try {
      const res = await settingsApi.getAll()
      if (res.success) {
        setSystemSettings(res.data)
        // 填充表单
        if (res.data.ollama) {
          ollamaForm.setFieldsValue(res.data.ollama)
        }
        if (res.data.notification) {
          notificationForm.setFieldsValue(res.data.notification)
        }
        if (res.data.system) {
          systemForm.setFieldsValue(res.data.system)
        }
      }
    } catch (error) {
      console.error('加载设置失败:', error)
    } finally {
      setSettingsLoading(false)
    }
  }

  // 保存设置
  const handleSaveSettings = async (group, form) => {
    setSettingsSaving(true)
    try {
      const values = form.getFieldsValue()
      const res = await settingsApi.update(group, values)
      if (res.success) {
        message.success('设置已保存')
      }
    } catch (error) {
      message.error('保存失败')
    } finally {
      setSettingsSaving(false)
    }
  }

  // 修改密码
  const handleChangePassword = async (values) => {
    setChangingPassword(true)
    try {
      await authService.updatePassword({
        current_password: values.currentPassword,
        password: values.newPassword,
      })
      message.success('密码修改成功')
      passwordForm.resetFields()
    } catch (error) {
      message.error(error.message || '密码修改失败')
    } finally {
      setChangingPassword(false)
    }
  }

  // 角色标签
  const roleColors = { admin: 'gold', user: 'blue', vip: 'purple' }
  const roleLabels = { admin: '管理员', user: '普通用户', vip: 'VIP用户' }

  const cardStyle = { marginBottom: 20, background: '#24272e', border: '1px solid rgba(255,255,255,0.08)' }
  const headerStyle = { background: '#1a1d24', borderBottom: '1px solid rgba(255,255,255,0.06)' }
  const labelStyle = { color: '#9ca3af', width: 140 }

  return (
    <div style={{ maxWidth: 800, margin: '0 auto' }}>
      <h1 style={{ color: '#e5e7eb', fontSize: 24, fontWeight: 600, marginBottom: 24 }}>
        ⚙️ 系统设置
      </h1>

      {/* 个人信息卡片 */}
      <Card
        title={<span style={{ color: '#e5e7eb' }}><UserOutlined style={{ marginRight: 8 }} />个人信息</span>}
        style={cardStyle}
        styles={{ header: headerStyle }}
      >
        <Descriptions column={2} labelStyle={labelStyle} contentStyle={{ color: '#e5e7eb' }}>
          <Descriptions.Item label="用户名">{user?.name || '-'}</Descriptions.Item>
          <Descriptions.Item label="邮箱">{user?.email || '-'}</Descriptions.Item>
          <Descriptions.Item label="角色">
            <Tag color={roleColors[user?.role] || 'default'} icon={isAdmin ? <CrownOutlined /> : <UserOutlined />}>
              {roleLabels[user?.role] || user?.role || '未知'}
            </Tag>
          </Descriptions.Item>
          <Descriptions.Item label="状态">
            <Tag color={user?.status === 'active' ? 'success' : 'error'}>
              {user?.status === 'active' ? '正常' : '已禁用'}
            </Tag>
          </Descriptions.Item>
          <Descriptions.Item label="最后登录">{user?.last_login_at || '-'}</Descriptions.Item>
          <Descriptions.Item label="注册时间">{user?.created_at || '-'}</Descriptions.Item>
        </Descriptions>
      </Card>

      {/* 修改密码卡片 */}
      <Card
        title={<span style={{ color: '#e5e7eb' }}><LockOutlined style={{ marginRight: 8 }} />修改密码</span>}
        style={cardStyle}
        styles={{ header: headerStyle }}
      >
        <Form form={passwordForm} layout="vertical" onFinish={handleChangePassword} style={{ maxWidth: 400 }}>
          <Form.Item name="currentPassword" label="当前密码" rules={[{ required: true, message: '请输入当前密码' }]}>
            <Input.Password placeholder="输入当前密码" />
          </Form.Item>
          <Form.Item name="newPassword" label="新密码" rules={[
            { required: true, message: '请输入新密码' },
            { min: 8, message: '密码至少8个字符' }
          ]}>
            <Input.Password placeholder="输入新密码（至少8位）" />
          </Form.Item>
          <Form.Item name="confirmPassword" label="确认新密码" dependencies={['newPassword']} rules={[
            { required: true, message: '请确认新密码' },
            ({ getFieldValue }) => ({
              validator(_, value) {
                if (!value || getFieldValue('newPassword') === value) return Promise.resolve()
                return Promise.reject(new Error('两次密码不一致'))
              }
            })
          ]}>
            <Input.Password placeholder="再次输入新密码" />
          </Form.Item>
          <Form.Item>
            <Button type="primary" htmlType="submit" icon={<SaveOutlined />} loading={changingPassword}>
              保存密码
            </Button>
          </Form.Item>
        </Form>
      </Card>

      {/* 看板娘设置卡片 */}
      <Card
        title={<span style={{ color: '#e5e7eb' }}><SmileOutlined style={{ marginRight: 8 }} />看板娘设置</span>}
        style={cardStyle}
        styles={{ header: headerStyle }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 16, marginBottom: 16 }}>
          <div style={{
            width: 60, height: 60,
            background: 'rgba(6, 182, 212, 0.1)',
            borderRadius: 12,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: 32,
          }}>
            {currentModel?.emoji || '🎭'}
          </div>
          <div>
            <div style={{ color: '#e5e7eb', fontSize: 16, fontWeight: 500 }}>
              {currentModel?.name || '未选择'}
            </div>
            <div style={{ color: '#9ca3af', fontSize: 13, marginTop: 4 }}>
              {currentModel?.desc || '尚未选择看板娘形象'}
            </div>
          </div>
        </div>
        <Divider style={{ borderColor: 'rgba(255,255,255,0.06)' }} />
        {isAdmin ? (
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div>
              <div style={{ color: '#e5e7eb', fontSize: 14 }}>管理员权限</div>
              <div style={{ color: '#9ca3af', fontSize: 12, marginTop: 4 }}>你可以随时更换看板娘形象</div>
            </div>
            <Button type="primary" onClick={() => { resetMascot(); window.location.href = '/select-mascot' }}>
              更换形象
            </Button>
          </div>
        ) : (
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div>
              <div style={{ color: '#e5e7eb', fontSize: 14 }}>
                {hasSelectedModel() ? '🔒 形象已锁定' : '未选择形象'}
              </div>
              <div style={{ color: '#9ca3af', fontSize: 12, marginTop: 4 }}>
                {hasSelectedModel() ? '如需更换请联系管理员' : '点击右侧按钮选择你的看板娘'}
              </div>
            </div>
            {!hasSelectedModel() && (
              <Button type="primary" onClick={() => window.location.href = '/select-mascot'}>
                选择形象
              </Button>
            )}
          </div>
        )}
      </Card>

      {/* ===== 系统设置（仅管理员可见） ===== */}
      {isAdmin && (
        <Card
          title={<span style={{ color: '#e5e7eb' }}><SettingOutlined style={{ marginRight: 8 }} />系统设置</span>}
          style={cardStyle}
          styles={{ header: headerStyle }}
        >
          {settingsLoading ? (
            <div style={{ textAlign: 'center', padding: 40 }}>
              <LoadingOutlined style={{ fontSize: 24, color: '#06b6d4' }} />
              <p style={{ color: '#9ca3af', marginTop: 12 }}>加载设置...</p>
            </div>
          ) : (
            <Tabs
              tabPosition="left"
              items={[
                {
                  key: 'ollama',
                  label: <span><CloudOutlined /> Ollama 配置</span>,
                  children: (
                    <Form form={ollamaForm} layout="vertical">
                      <Form.Item name="ollama.base_url" label="Ollama 服务地址">
                        <Input placeholder="http://localhost:11434" />
                      </Form.Item>
                      <Form.Item name="ollama.default_model" label="默认模型">
                        <Input placeholder="qwen2.5:3b" />
                      </Form.Item>
                      <Form.Item name="ollama.timeout" label="请求超时（秒）">
                        <InputNumber min={5} max={300} style={{ width: '100%' }} />
                      </Form.Item>
                      <Button
                        type="primary"
                        icon={<SaveOutlined />}
                        loading={settingsSaving}
                        onClick={() => handleSaveSettings('ollama', ollamaForm)}
                      >
                        保存 Ollama 配置
                      </Button>
                    </Form>
                  )
                },
                {
                  key: 'notification',
                  label: <span><BellOutlined /> 通知渠道</span>,
                  children: (
                    <Form form={notificationForm} layout="vertical">
                      <Divider orientation="left" style={{ borderColor: 'rgba(255,255,255,0.1)', color: '#e5e7eb' }}>邮件 SMTP</Divider>
                      <Form.Item name="notification.email_enabled" label="启用邮件通知" valuePropName="checked">
                        <Switch />
                      </Form.Item>
                      <Form.Item name="notification.email_smtp_host" label="SMTP 服务器">
                        <Input placeholder="smtp.gmail.com" />
                      </Form.Item>
                      <Form.Item name="notification.email_smtp_port" label="SMTP 端口">
                        <InputNumber min={1} max={65535} style={{ width: '100%' }} />
                      </Form.Item>
                      <Form.Item name="notification.email_from" label="发件人邮箱">
                        <Input placeholder="alert@example.com" />
                      </Form.Item>
                      <Form.Item name="notification.email_password" label="邮箱密码/授权码">
                        <Input.Password placeholder="授权码" />
                      </Form.Item>

                      <Divider orientation="left" style={{ borderColor: 'rgba(255,255,255,0.1)', color: '#e5e7eb' }}>Webhook</Divider>
                      <Form.Item name="notification.wechat_webhook" label="企业微信 Webhook">
                        <Input placeholder="https://qyapi.weixin.qq.com/cgi-bin/webhook/send?key=..." />
                      </Form.Item>
                      <Form.Item name="notification.dingtalk_webhook" label="钉钉 Webhook">
                        <Input placeholder="https://oapi.dingtalk.com/robot/send?access_token=..." />
                      </Form.Item>
                      <Form.Item name="notification.feishu_webhook" label="飞书 Webhook">
                        <Input placeholder="https://open.feishu.cn/open-apis/bot/v2/hook/..." />
                      </Form.Item>
                      <Button
                        type="primary"
                        icon={<SaveOutlined />}
                        loading={settingsSaving}
                        onClick={() => handleSaveSettings('notification', notificationForm)}
                      >
                        保存通知配置
                      </Button>
                    </Form>
                  )
                },
                {
                  key: 'system',
                  label: <span><InfoCircleOutlined /> 系统参数</span>,
                  children: (
                    <Form form={systemForm} layout="vertical">
                      <Form.Item name="system.name" label="系统名称">
                        <Input placeholder="Agent Monitor" />
                      </Form.Item>
                      <Form.Item name="system.log_retention_days" label="日志保留天数">
                        <InputNumber min={7} max={365} style={{ width: '100%' }} />
                      </Form.Item>
                      <Form.Item name="system.api_timeout" label="API 默认超时（秒）">
                        <InputNumber min={5} max={120} style={{ width: '100%' }} />
                      </Form.Item>
                      <Button
                        type="primary"
                        icon={<SaveOutlined />}
                        loading={settingsSaving}
                        onClick={() => handleSaveSettings('system', systemForm)}
                      >
                        保存系统配置
                      </Button>
                    </Form>
                  )
                }
              ]}
            />
          )}
        </Card>
      )}

      {/* 系统信息卡片 */}
      <Card
        title={<span style={{ color: '#e5e7eb' }}><InfoCircleOutlined style={{ marginRight: 8 }} />系统信息</span>}
        style={cardStyle}
        styles={{ header: headerStyle }}
      >
        <Descriptions column={2} labelStyle={labelStyle} contentStyle={{ color: '#e5e7eb' }}>
          <Descriptions.Item label="系统名称">Agent Monitor</Descriptions.Item>
          <Descriptions.Item label="版本">v1.1.0</Descriptions.Item>
          <Descriptions.Item label="前端框架">React 18 + Vite 5</Descriptions.Item>
          <Descriptions.Item label="UI框架">Ant Design v5</Descriptions.Item>
          <Descriptions.Item label="后端框架">Laravel 11</Descriptions.Item>
          <Descriptions.Item label="数据库">PostgreSQL 16</Descriptions.Item>
        </Descriptions>
      </Card>
    </div>
  )
}
