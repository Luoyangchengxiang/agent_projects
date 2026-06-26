/**
 * Live2D 渲染组件
 * 支持 Live2D SDK 或 SVG 动漫小猫 fallback
 */
import { useEffect, useRef, useState } from 'react'
import useMascotStore from '../../stores/mascotStore'
import CatAvatar from './CatAvatar'

// 检测 Live2D SDK 是否可用
const isLive2DAvailable = () => {
  return typeof window.live2d !== 'undefined' || typeof window.Live2D !== 'undefined'
}

export default function Live2DRenderer({ onHover, onClick }) {
  const canvasRef = useRef(null)
  const { getCurrentModel, setLoading } = useMascotStore()
  const [useStatic, setUseStatic] = useState(!isLive2DAvailable())
  const [mousePos, setMousePos] = useState({ x: 0.5, y: 0.5 })
  const [expression, setExpression] = useState('normal')

  // 鼠标跟随效果（静态模式）
  const handleMouseMove = (e) => {
    if (!canvasRef.current) return
    const rect = canvasRef.current.getBoundingClientRect()
    setMousePos({
      x: (e.clientX - rect.left) / rect.width,
      y: (e.clientY - rect.top) / rect.height,
    })
  }

  // 点击切换表情
  const handleClick = () => {
    const expressions = ['normal', 'happy', 'surprised']
    const currentIndex = expressions.indexOf(expression)
    const nextIndex = (currentIndex + 1) % expressions.length
    setExpression(expressions[nextIndex])
    onClick?.(['body'])
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
          width: 150,
          height: 150,
          backgroundAlpha: 0,
          antialias: true,
        })

        const model = await Live2DModel.from(currentModel.url, {
          autoInteract: false,
          autoUpdate: true,
        })

        model.scale.set(0.12)
        model.anchor.set(0.5, 0.5)
        model.x = 75
        model.y = 130

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
        console.warn('Live2D 加载失败，使用 SVG 小猫:', e)
        setUseStatic(true)
        setLoading(false)
      }
    }

    loadLive2D()
  }, [getCurrentModel()?.id])

  // 静态看板娘（SVG 动漫小猫）
  if (useStatic) {
    const currentModel = getCurrentModel()

    return (
      <div 
        ref={canvasRef}
        className="mascot-static"
        style={{
          width: 150,
          height: 150,
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
        onClick={handleClick}
      >
        {/* SVG 动漫小猫 */}
        <CatAvatar size={120} expression={expression} />
        
        {/* 名字 */}
        <div style={{
          marginTop: 5,
          color: '#FF69B4',
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
      </div>
    )
  }

  // Live2D Canvas
  return (
    <canvas
      ref={canvasRef}
      width={150}
      height={150}
      style={{ cursor: 'pointer' }}
      onMouseEnter={() => onHover?.(true)}
      onMouseLeave={() => onHover?.(false)}
    />
  )
}
