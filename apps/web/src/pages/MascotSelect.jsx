/**
 * 看板娘形象选择页面
 * 首次登录时选择，绑定用户后不可更改
 * 左侧选择列表 + 右侧实时预览（支持 Live2D）
 */
import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { CheckOutlined, LockOutlined, ArrowRightOutlined, ArrowLeftOutlined } from '@ant-design/icons'
import useAuthStore from '../stores/authStore'
import useMascotStore from '../stores/mascotStore'
import CatAvatar from '../components/mascot/CatAvatar'
import './mascot-select.css'

export default function MascotSelect() {
  const { models, selectModel } = useMascotStore()
  const { user } = useAuthStore()
  const [selected, setSelected] = useState(null)
  const [confirmed, setConfirmed] = useState(false)
  const navigate = useNavigate()
  // 用后端数据库的 mascot_model_id 判断（不可被前端篡改）
  const hasExistingMascot = !!user?.mascot_model_id
  const isAdmin = user?.role === 'admin'
  // 管理员或已有看板娘的用户可以看到返回按钮
  const canGoBack = hasExistingMascot || isAdmin

  const selectedModel = models.find(m => m.id === selected)

  const handleConfirm = () => {
    if (!selected) return
    setConfirmed(true)
    selectModel(selected)

    // 延迟跳转，给用户看到确认动画
    setTimeout(() => {
      navigate('/', { replace: true })
    }, 800)
  }

  return (
    <div className="mascot-select">
      <div className="mascot-select-container">
        {/* 返回按钮 — 管理员或已有看板娘的用户可见 */}
        {canGoBack && (
          <button
            onClick={() => navigate('/', { replace: true })}
            style={{
              position: 'absolute', top: 20, left: 20,
              display: 'flex', alignItems: 'center', gap: 6,
              background: 'rgba(255,255,255,0.08)', border: '1px solid rgba(255,255,255,0.12)',
              borderRadius: 8, padding: '8px 16px', color: '#e5e7eb', cursor: 'pointer',
              fontSize: 14, transition: 'all 0.2s',
            }}
            onMouseEnter={e => { e.target.style.background = 'rgba(255,255,255,0.15)' }}
            onMouseLeave={e => { e.target.style.background = 'rgba(255,255,255,0.08)' }}
          >
            <ArrowLeftOutlined /> 返回首页
          </button>
        )}

        {/* 头部 */}
        <div className="mascot-select-header">
          <h1>🎭 选择你的看板娘</h1>
          <p>选择一个你喜欢的形象，它将陪伴你使用系统</p>
        </div>

        {/* 主体：左侧列表 + 右侧预览 */}
        <div className="mascot-select-main">
          {/* 左侧形象列表 */}
          <div className="mascot-select-list">
            {models.map((model) => (
              <div
                key={model.id}
                className={`mascot-select-item ${selected === model.id ? 'mascot-select-item--selected' : ''}`}
                onClick={() => setSelected(model.id)}
              >
                <div className="mascot-select-item-emoji">{model.emoji}</div>
                <div className="mascot-select-item-info">
                  <div className="mascot-select-item-name">
                    {model.name}
                    {model.live2d && (
                      <span style={{
                        marginLeft: 6,
                        fontSize: 10,
                        background: 'rgba(6, 182, 212, 0.2)',
                        color: '#06b6d4',
                        padding: '1px 5px',
                        borderRadius: 4,
                      }}>Live2D</span>
                    )}
                  </div>
                  <div className="mascot-select-item-id">{model.desc || model.id}</div>
                </div>
                {selected === model.id && (
                  <div className="mascot-select-item-check">
                    <CheckOutlined />
                  </div>
                )}
              </div>
            ))}
          </div>

          {/* 右侧预览区 */}
          <div className="mascot-select-preview">
            {selectedModel ? (
              <>
                <div className="mascot-select-preview-emoji">
                  {selectedModel.emoji}
                </div>
                <div className="mascot-select-preview-name">
                  {selectedModel.name}
                </div>
                <div className="mascot-select-preview-desc">
                  {selectedModel.desc || '选择此形象作为你的看板娘'}
                </div>
                <div className="mascot-select-preview-model">
                  {selectedModel.live2d ? (
                    <Live2DPreview modelPath={selectedModel.modelPath} />
                  ) : (
                    <CatAvatar size={180} expression="happy" modelId={selectedModel.id} />
                  )}
                </div>
              </>
            ) : (
              <div className="mascot-select-preview-empty">
                <div className="mascot-select-preview-empty-icon">👈</div>
                <div className="mascot-select-preview-empty-text">
                  从左侧选择一个形象
                </div>
              </div>
            )}
          </div>
        </div>

        {/* 确认按钮 */}
        <div className="mascot-select-footer">
          <button
            className={`mascot-select-confirm ${!selected ? 'mascot-select-confirm--disabled' : ''} ${confirmed ? 'mascot-select-confirm--done' : ''}`}
            onClick={handleConfirm}
            disabled={!selected || confirmed}
          >
            {confirmed ? (
              <>
                <CheckOutlined /> 已选择，正在进入系统...
              </>
            ) : selected ? (
              <>
                <LockOutlined /> 确认选择 <ArrowRightOutlined />
              </>
            ) : (
              '请先选择一个形象'
            )}
          </button>
        </div>
      </div>
    </div>
  )
}

/**
 * Live2D 预览组件（选择页面专用）
 */
function Live2DPreview({ modelPath }) {
  const [failed, setFailed] = useState(false)
  const [ready, setReady] = useState(false)

  // 加载 Live2D 预览
  useState(() => {
    if (typeof window.loadlive2d !== 'function') {
      setFailed(true)
      return
    }

    try {
      window.loadlive2d('preview-live2d-canvas', modelPath, 0.5)
      setTimeout(() => {
        const canvas = document.getElementById('preview-live2d-canvas')
        if (canvas && canvas.width > 0) {
          setReady(true)
        } else {
          setFailed(true)
        }
      }, 3000)
    } catch {
      setFailed(true)
    }
  })

  if (failed) {
    return (
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        width: 200,
        height: 280,
        color: '#666',
        fontSize: 14,
      }}>
        <div style={{ textAlign: 'center' }}>
          <div style={{ fontSize: 48, marginBottom: 8 }}>🎭</div>
          <div>Live2D 预览</div>
          <div style={{ fontSize: 12, color: '#888' }}>(进入系统后可看到完整动画)</div>
        </div>
      </div>
    )
  }

  return (
    <div style={{ position: 'relative', width: 200, height: 280 }}>
      <canvas
        id="preview-live2d-canvas"
        width={400}
        height={560}
        style={{
          width: 200,
          height: 280,
          opacity: ready ? 1 : 0,
          transition: 'opacity 0.5s ease',
        }}
      />
      {!ready && (
        <div style={{
          position: 'absolute',
          top: '50%',
          left: '50%',
          transform: 'translate(-50%, -50%)',
          color: '#06b6d4',
          fontSize: 12,
        }}>
          加载中...
        </div>
      )}
    </div>
  )
}
