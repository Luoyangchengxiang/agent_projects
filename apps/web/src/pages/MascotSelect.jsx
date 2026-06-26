/**
 * 看板娘形象选择页面
 * 首次登录时选择，绑定用户后不可更改
 * 左侧选择列表 + 右侧实时预览
 */
import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { CheckOutlined, LockOutlined, ArrowRightOutlined } from '@ant-design/icons'
import useMascotStore from '../stores/mascotStore'
import CatAvatar from '../components/mascot/CatAvatar'
import './mascot-select.css'

export default function MascotSelect() {
  const { models, selectModel } = useMascotStore()
  const [selected, setSelected] = useState(null)
  const [confirmed, setConfirmed] = useState(false)
  const navigate = useNavigate()

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
        {/* 头部 */}
        <div className="mascot-select-header">
          <h1>🎭 选择你的看板娘</h1>
          <p>选择一个你喜欢的形象，它将陪伴你使用系统（选定后不可更改）</p>
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
                  <div className="mascot-select-item-name">{model.name}</div>
                  <div className="mascot-select-item-id">{model.id}</div>
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
                  选择此形象作为你的看板娘
                </div>
                <div className="mascot-select-preview-model">
                  <CatAvatar size={180} expression="happy" modelId={selectedModel.id} />
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
                <LockOutlined /> 确认选择（不可更改） <ArrowRightOutlined />
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