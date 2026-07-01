/**
 * 看板娘设置面板
 * 点击环状菜单的"设置"按钮后弹出
 * 管理员可随时更换形象，普通用户首次选择后锁定
 */
import { useState } from 'react'
import { Modal, Button, Tag, App, Space } from 'antd'
import { CheckOutlined, LockOutlined, SettingOutlined } from '@ant-design/icons'
import useAuthStore from '../../stores/authStore'
import useMascotStore from '../../stores/mascotStore'

export default function MascotSettingsPanel() {
  const { message } = App.useApp()
  const { user, refreshUser } = useAuthStore()
  const { 
    models, 
    modelId, 
    selectModel, 
    isSettingsOpen, 
    closeSettings 
  } = useMascotStore()

  const [selected, setSelected] = useState(modelId)
  const [saving, setSaving] = useState(false)

  const isAdmin = user?.role === 'admin'
  const hasExistingMascot = !!user?.mascot_model_id
  const isLocked = hasExistingMascot && !isAdmin

  // 保存选择
  const handleSave = async () => {
    if (!selected || selected === modelId) {
      closeSettings()
      return
    }

    setSaving(true)
    try {
      await selectModel(selected)
      await refreshUser()
      message.success('看板娘形象已更新！')
      closeSettings()
    } catch (error) {
      message.error('保存失败，请重试')
    } finally {
      setSaving(false)
    }
  }

  return (
    <Modal
      title={
        <Space>
          <SettingOutlined />
          看板娘设置
        </Space>
      }
      open={isSettingsOpen}
      onCancel={closeSettings}
      footer={[
        <Button key="cancel" onClick={closeSettings}>
          取消
        </Button>,
        <Button 
          key="save" 
          type="primary" 
          onClick={handleSave}
          loading={saving}
          disabled={!selected || selected === modelId || isLocked}
        >
          保存
        </Button>
      ]}
      width={600}
    >
      <div style={{ marginBottom: 16 }}>
        <div style={{ color: '#888', fontSize: 13 }}>
          {isLocked 
            ? '🔒 你的看板娘形象已锁定，如需更换请联系管理员'
            : isAdmin 
              ? '👑 管理员可随时更换看板娘形象'
              : '选择一个你喜欢的形象'
          }
        </div>
      </div>

      {/* 当前形象 */}
      <div style={{ 
        marginBottom: 16, 
        padding: 12, 
        background: 'rgba(6, 182, 212, 0.1)', 
        borderRadius: 8,
        border: '1px solid rgba(6, 182, 212, 0.2)'
      }}>
        <div style={{ fontSize: 13, color: '#06b6d4', marginBottom: 4 }}>当前形象</div>
        <div style={{ fontSize: 16, fontWeight: 500 }}>
          {models.find(m => m.id === modelId)?.emoji} {models.find(m => m.id === modelId)?.name || '未选择'}
        </div>
      </div>

      {/* 形象列表 */}
      <div style={{ 
        display: 'grid', 
        gridTemplateColumns: 'repeat(2, 1fr)', 
        gap: 8,
        maxHeight: 400,
        overflowY: 'auto',
        padding: '4px 0'
      }}>
        {models.map((model) => {
          const isCurrentMascot = modelId === model.id
          const isSelected = selected === model.id

          return (
            <div
              key={model.id}
              onClick={() => !isLocked && setSelected(model.id)}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 10,
                padding: '10px 12px',
                borderRadius: 8,
                border: `1px solid ${isSelected ? '#1890ff' : 'rgba(255,255,255,0.08)'}`,
                background: isSelected ? 'rgba(24, 144, 255, 0.1)' : 'rgba(255,255,255,0.02)',
                cursor: isLocked ? 'not-allowed' : 'pointer',
                opacity: isLocked && !isCurrentMascot ? 0.5 : 1,
                transition: 'all 0.2s'
              }}
            >
              <div style={{ fontSize: 24 }}>{model.emoji}</div>
              <div style={{ flex: 1 }}>
                <div style={{ fontWeight: 500, fontSize: 14 }}>
                  {model.name}
                  {model.live2d && (
                    <Tag color="cyan" style={{ marginLeft: 6, fontSize: 10, lineHeight: '16px', padding: '0 4px' }}>
                      Live2D
                    </Tag>
                  )}
                </div>
                <div style={{ fontSize: 12, color: '#888' }}>{model.desc}</div>
              </div>
              {isSelected && (
                <CheckOutlined style={{ color: '#1890ff' }} />
              )}
              {isLocked && !isCurrentMascot && (
                <LockOutlined style={{ color: '#666' }} />
              )}
            </div>
          )
        })}
      </div>
    </Modal>
  )
}
