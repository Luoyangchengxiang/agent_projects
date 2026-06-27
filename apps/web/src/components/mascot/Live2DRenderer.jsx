/**
 * Live2D 看板娘渲染组件
 * 优先加载 Live2D 模型，失败则回退到 CatAvatar SVG
 * 支持动态切换模型
 */
import { useState, useEffect, useRef, useCallback } from 'react'
import useMascotStore from '../../stores/mascotStore'
import CatAvatar from './CatAvatar'

// 加载超时时间（毫秒）
const LOAD_TIMEOUT = 8000

export default function Live2DRenderer({ onHover, onClick }) {
  const { getCurrentModel } = useMascotStore()
  const currentModel = getCurrentModel()
  const [expression, setExpression] = useState('normal')
  const [live2dFailed, setLive2dFailed] = useState(false)
  const [live2dReady, setLive2dReady] = useState(false)
  const canvasRef = useRef(null)
  const readyRef = useRef(false)
  const timeoutRef = useRef(null)
  const innerTimeoutRef = useRef(null)
  const prevModelIdRef = useRef(null)

  // 同步 ready 状态到 ref
  useEffect(() => { readyRef.current = live2dReady }, [live2dReady])

  // 获取当前模型路径
  const modelPath = currentModel?.live2d ? currentModel.modelPath : null

  // 加载 Live2D 模型
  useEffect(() => {
    // 清理之前的超时
    if (timeoutRef.current) clearTimeout(timeoutRef.current)
    if (innerTimeoutRef.current) clearTimeout(innerTimeoutRef.current)

    // 如果不是 Live2D 模型，直接标记失败（显示 CatAvatar）
    if (!modelPath) {
      setLive2dFailed(true)
      setLive2dReady(false)
      return
    }

    // 检查 loadlive2d 是否可用
    if (typeof window.loadlive2d !== 'function') {
      console.warn('[Live2D] loadlive2d 未定义，回退到 CatAvatar')
      setLive2dFailed(true)
      return
    }

    // 重置状态（模型切换时）
    setLive2dFailed(false)
    setLive2dReady(false)

    // 超时保护
    timeoutRef.current = setTimeout(() => {
      if (!readyRef.current) {
        console.warn('[Live2D] 加载超时，回退到 CatAvatar')
        setLive2dFailed(true)
      }
    }, LOAD_TIMEOUT)

    try {
      window.loadlive2d('live2d-canvas', modelPath, 0.5)
      innerTimeoutRef.current = setTimeout(() => {
        const canvas = document.getElementById('live2d-canvas')
        if (canvas && canvas.width > 0) {
          setLive2dReady(true)
          clearTimeout(timeoutRef.current)
        } else {
          setLive2dFailed(true)
          clearTimeout(timeoutRef.current)
        }
      }, 3000)
    } catch (err) {
      console.warn('[Live2D] 加载失败:', err)
      setLive2dFailed(true)
      clearTimeout(timeoutRef.current)
    }

    return () => {
      if (timeoutRef.current) clearTimeout(timeoutRef.current)
      if (innerTimeoutRef.current) clearTimeout(innerTimeoutRef.current)
    }
  }, [modelPath]) // 模型路径变化时重新加载

  // 点击切换表情（SVG 模式）
  const handleClick = useCallback(() => {
    if (live2dFailed || !live2dReady) {
      const expressions = ['normal', 'happy', 'surprised']
      const idx = expressions.indexOf(expression)
      setExpression(expressions[(idx + 1) % expressions.length])
    }
    onClick?.()
  }, [live2dFailed, live2dReady, expression, onClick])

  const displayName = currentModel?.name || '小猫咪'
  const isLive2dModel = currentModel?.live2d === true

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
      {isLive2dModel && !live2dFailed && (
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

      {/* 回退：CatAvatar SVG（非 Live2D 模型 或 Live2D 失败时显示） */}
      {(!isLive2dModel || live2dFailed || !live2dReady) && (
        <>
          {/* 光晕底层 */}
          <div style={{
            position: 'absolute',
            bottom: 30,
            left: '50%',
            transform: 'translateX(-50%)',
            width: 100,
            height: 100,
            borderRadius: '50%',
            background: 'radial-gradient(circle, rgba(74, 222, 128, 0.15) 0%, rgba(74, 222, 128, 0.05) 50%, transparent 70%)',
            filter: 'blur(8px)',
            animation: 'mascotGlow 3s ease-in-out infinite',
            pointerEvents: 'none',
          }} />
          <div style={{ position: 'relative', zIndex: 1 }}>
            <CatAvatar
              size={120}
              expression={expression}
              modelId={currentModel?.id || 'cat-black'}
            />
          </div>
          {/* 名字 */}
          <div style={{
            marginTop: 5,
            color: '#4ade80',
            fontSize: 12,
            fontWeight: 500,
          }}>
            {displayName}
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
      {isLive2dModel && !live2dFailed && !live2dReady && (
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
