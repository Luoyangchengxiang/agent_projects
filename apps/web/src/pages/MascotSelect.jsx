/**
 * 看板娘形象选择页面
 * 首次登录时选择，绑定用户后不可更改
 */
import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { CheckOutlined, LockOutlined } from '@ant-design/icons'
import useMascotStore from '../stores/mascotStore'
import './mascot-select.css'

export default function MascotSelect() {
  const { models, selectModel } = useMascotStore()
  const [selected, setSelected] = useState(null)
  const [confirmed, setConfirmed] = useState(false)
  const navigate = useNavigate()

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

        {/* 形象网格 */}
        <div className="mascot-select-grid">
          {models.map((model) => (
            <div
              key={model.id}
              className={`mascot-select-card ${selected === model.id ? 'mascot-select-card--selected' : ''}`}
              onClick={() => setSelected(model.id)}
            >
              <div className="mascot-select-card-emoji">{model.emoji}</div>
              <div className="mascot-select-card-name">{model.name}</div>
              {selected === model.id && (
                <div className="mascot-select-card-check">
                  <CheckOutlined />
                </div>
              )}
            </div>
          ))}
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
                <LockOutlined /> 确认选择（不可更改）
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
