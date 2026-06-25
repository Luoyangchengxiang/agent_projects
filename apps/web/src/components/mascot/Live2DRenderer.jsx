/**
 * Live2D 渲染组件
 * 支持 Live2D SDK 或静态图片 fallback
 */
import { useEffect, useRef, useState } from 'react'
import useMascotStore from '../../stores/mascotStore'

// 检测 Live2D SDK 是否可用
const isLive2DAvailable = () => {
  return typeof window.live2d !== 'undefined' || typeof window.Live2D !== 'undefined'
}

export default function Live2DRenderer({ onHover, onClick }) {
  const canvasRef = useRef(null)
  const { getCurrentModel, setLoading } = useMascotStore()
  const [useStatic, setUseStatic] = useState(!isLive2DAvailable())
  const [mousePos, setMousePos] = useState({ x: 0.5, y: 0.5 })

  // 鼠标跟随效果（静态模式）
  const handleMouseMove = (e) => {
    if (!canvasRef.current) return
    const rect = canvasRef.current.getBoundingClientRect()
    setMousePos({
      x: (e.clientX - rect.left) / rect.width,
      y: (e.clientY - rect.top) / rect.height,
    })
  }

  // 尝试加载 Live2D
  useEffect(() => {
    if (!isLive2DAvailable()) {
      setUseStatic(true)
      setLoading(false)
      return
    }

    // 动态加载 pixi-live2d-display
    const loadLive2D = async () => {
      try {
        const PIXI = await import('pixi.js')
        const { Live2DModel } = await import('pixi-live2d-display')
        
        window.PIXI = PIXI

        const currentModel = getCurrentModel()
        if (!currentModel || !canvasRef.current) return

        const app = new PIXI.Application({
          view: canvasRef.current,
          width: 300,
          height: 400,
          backgroundAlpha: 0,
          antialias: true,
        })

        const model = await Live2DModel.from(currentModel.url, {
          autoInteract: false,
          autoUpdate: true,
        })

        model.scale.set(0.25)
        model.anchor.set(0.5, 0.5)
        model.x = 150
        model.y = 350

        model.on('hit', (hitAreas) => {
          if (onClick) onClick(hitAreas)
        })

        app.stage.addChild(model)

        // 鼠标跟随
        canvasRef.current.addEventListener('mousemove', (e) => {
          const rect = canvasRef.current.getBoundingClientRect()
          model.focus(e.clientX - rect.left, e.clientY - rect.top)
        })

        setLoading(false)

        return () => {
          model.destroy()
          app.destroy(true)
        }
      } catch (e) {
        console.warn('Live2D 加载失败，使用静态模式:', e)
        setUseStatic(true)
        setLoading(false)
      }
    }

    loadLive2D()
  }, [getCurrentModel()?.id])

  // 静态看板娘（CSS 动画）
  if (useStatic) {
    const currentModel = getCurrentModel()
    const eyeX = (mousePos.x - 0.5) * 8
    const eyeY = (mousePos.y - 0.5) * 4

    return (
      <div 
        ref={canvasRef}
        className="mascot-static"
        style={{
          width: 300,
          height: 400,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          cursor: 'pointer',
          userSelect: 'none',
        }}
        onMouseMove={handleMouseMove}
        onMouseEnter={() => onHover?.(true)}
        onMouseLeave={() => onHover?.(false)}
        onClick={() => onClick?.(['body'])}
      >
        {/* 静态 SVG 看板娘 */}
        <svg width="200" height="280" viewBox="0 0 200 280">
          {/* 头发 */}
          <ellipse cx="100" cy="90" rx="65" ry="70" fill="#2d1b4e" />
          <ellipse cx="100" cy="85" rx="60" ry="65" fill="#3d2b5e" />
          
          {/* 脸 */}
          <ellipse cx="100" cy="100" rx="50" ry="55" fill="#ffe0c2" />
          
          {/* 眼睛 - 跟随鼠标 */}
          <g transform={`translate(${eyeX}, ${eyeY})`}>
            <ellipse cx="78" cy="95" rx="8" ry="10" fill="white" />
            <ellipse cx="122" cy="95" rx="8" ry="10" fill="white" />
            <circle cx="78" cy="95" r="5" fill="#6366f1" />
            <circle cx="122" cy="95" r="5" fill="#6366f1" />
            <circle cx="78" cy="93" r="2" fill="white" />
            <circle cx="122" cy="93" r="2" fill="white" />
          </g>
          
          {/* 嘴巴 */}
          <path d="M 90 115 Q 100 120 110 115" stroke="#e88" strokeWidth="2" fill="none" />
          
          {/* 身体 */}
          <path d="M 60 150 Q 60 140 100 135 Q 140 140 140 150 L 150 250 Q 100 260 50 250 Z" fill="#6366f1" />
          
          {/* 装饰 */}
          <circle cx="80" cy="160" r="4" fill="#f472b6" />
          <circle cx="120" cy="160" r="4" fill="#f472b6" />
          
          {/* 蝴蝶结 */}
          <path d="M 85 130 L 70 120 L 85 135 L 100 130 L 115 135 L 130 120 L 115 130" fill="#f472b6" />
        </svg>
        
        {/* 名字 */}
        <div style={{
          marginTop: 10,
          color: '#a78bfa',
          fontSize: 14,
          fontWeight: 500,
        }}>
          {currentModel?.name || '看板娘'}
        </div>
        
        {/* 呼吸动画指示器 */}
        <div style={{
          width: 6,
          height: 6,
          borderRadius: '50%',
          background: '#4ade80',
          marginTop: 8,
          animation: 'pulse 2s infinite',
        }} />
      </div>
    )
  }

  // Live2D Canvas
  return (
    <canvas
      ref={canvasRef}
      width={300}
      height={400}
      style={{ cursor: 'pointer' }}
      onMouseEnter={() => onHover?.(true)}
      onMouseLeave={() => onHover?.(false)}
    />
  )
}
