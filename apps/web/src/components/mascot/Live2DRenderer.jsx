/**
 * Live2D 看板娘渲染组件
 * 优先加载 Live2D 模型，失败则回退到 CatAvatar SVG
 * 使用全局 loadlive2d 函数（由 l2d.js 提供）
 */
import { useState, useEffect, useRef, useCallback } from 'react'
import useMascotStore from '../../stores/mascotStore'
import CatAvatar from './CatAvatar'

// 默认模型路径（相对于 public 目录）
const LIVE2D_MODEL_PATH = '/live2d/models/shizuku/assets/shizuku.model.json'
// 加载超时时间（毫秒）
const LOAD_TIMEOUT = 8000

export default function Live2DRenderer({ onHover, onClick }) {
  const { getCurrentModel } = useMascotStore()
  const [expression, setExpression] = useState('normal')
  const [live2dFailed, setLive2dFailed] = useState(false)
  const [live2dReady, setLive2dReady] = useState(false)
  const canvasRef = useRef(null)
  const loadAttempted = useRef(false)
  const readyRef = useRef(false)

  // 同步 ready 状态到 ref
  useEffect(() => { readyRef.current = live2dReady }, [live2dReady])

  // 尝试加载 Live2D 模型
  useEffect(() => {
    if (loadAttempted.current) return
    loadAttempted.current = true

    // 检查 loadlive2d 是否可用
    if (typeof window.loadlive2d !== 'function') {
      console.warn('[Live2D] loadlive2d 未定义，回退到 CatAvatar')
      setLive2dFailed(true)
      return
    }

    let innerTimeout = null

    // 超时保护
    const timeout = setTimeout(() => {
      if (!readyRef.current) {
        console.warn('[Live2D] 加载超时，回退到 CatAvatar')
        setLive2dFailed(true)
      }
    }, LOAD_TIMEOUT)

    try {
      window.loadlive2d('live2d-canvas', LIVE2D_MODEL_PATH, 0.5)
      innerTimeout = setTimeout(() => {
        const canvas = document.getElementById('live2d-canvas')
        if (canvas && canvas.width > 0) {
          setLive2dReady(true)
          clearTimeout(timeout)
        } else {
          setLive2dFailed(true)
          clearTimeout(timeout)
        }
      }, 3000)
    } catch (err) {
      console.warn('[Live2D] 加载失败:', err)
      setLive2dFailed(true)
      clearTimeout(timeout)
    }

    return () => {
      clearTimeout(timeout)
      if (innerTimeout) clearTimeout(innerTimeout)
    }
  }, []) // 只在挂载时执行一次

  const currentModel = getCurrentModel()

  // 点击切换表情（SVG 模式）
  const handleClick = useCallback(() => {
    if (live2dFailed || !live2dReady) {
      const expressions = ['normal', 'happy', 'surprised']
      const idx = expressions.indexOf(expression)
      setExpression(expressions[(idx + 1) % expressions.length])
    }
    onClick?.()
  }, [live2dFailed, live2dReady, expression, onClick])

  return (
    <div
      className="mascot-live2d-wrapper"
      style={{
        width: 150,
        height: 200,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        cursor: 'pointer',
        userSelect: 'none',
        position: 'relative',
      }}
      onMouseEnter={() => onHover?.(true)}
      onMouseLeave={() => onHover?.(false)}
      onClick={handleClick}
    >
      {/* Live2D Canvas（始终存在，成功加载后显示） */}
      {!live2dFailed && (
        <canvas
          id="live2d-canvas"
          ref={canvasRef}
          width={300}
          height={400}
          style={{
            width: 150,
            height: 200,
            opacity: live2dReady ? 1 : 0,
            transition: 'opacity 0.5s ease',
            position: 'absolute',
            top: 0,
            left: 0,
          }}
        />
      )}

      {/* 回退：CatAvatar SVG（Live2D 失败或未就绪时显示） */}
      {(live2dFailed || !live2dReady) && (
        <>
          <CatAvatar
            size={120}
            expression={expression}
            modelId={currentModel?.id || 'cat-black'}
          />
          {/* 名字 */}
          <div style={{
            marginTop: 5,
            color: '#4ade80',
            fontSize: 12,
            fontWeight: 500,
          }}>
            {currentModel?.name || '小猫咪'}
          </div>
          {/* 呼吸动画指示器 */}
          <div style={{
            width: 6,
            height: 6,
            borderRadius: '50%',
            background: '#4ade80',
            marginTop: 5,
            animation: 'pulse 2s infinite',
          }} />
        </>
      )}

      {/* Live2D 加载中指示 */}
      {!live2dFailed && !live2dReady && (
        <div style={{
          position: 'absolute',
          top: '50%',
          left: '50%',
          transform: 'translate(-50%, -50%)',
          fontSize: 10,
          color: '#06b6d4',
          opacity: 0.6,
        }}>
          Loading...
        </div>
      )}
    </div>
  )
}
