import { useState, useEffect, useRef, useMemo } from 'react'

/**
 * 眼球组件 — 白色圆形眼球 + 跟随鼠标的瞳孔
 * Vue 原版：EyeBall.vue
 */
export default function EyeBall({
  size = 48,
  pupilSize = 16,
  maxDistance = 10,
  eyeColor = 'white',
  pupilColor = 'black',
  isBlinking = false,
  forceLookX,
  forceLookY,
}) {
  const [mx, setMx] = useState(0)
  const [my, setMy] = useState(0)
  const eyeRef = useRef(null)

  useEffect(() => {
    const onMove = (e) => { setMx(e.clientX); setMy(e.clientY) }
    window.addEventListener('mousemove', onMove)
    return () => window.removeEventListener('mousemove', onMove)
  }, [])

  const pos = useMemo(() => {
    if (!eyeRef.current) return { x: 0, y: 0 }
    if (forceLookX !== undefined && forceLookY !== undefined)
      return { x: forceLookX, y: forceLookY }
    const r = eyeRef.current.getBoundingClientRect()
    const dx = mx - (r.left + r.width / 2)
    const dy = my - (r.top + r.height / 2)
    const d = Math.min(Math.sqrt(dx ** 2 + dy ** 2), maxDistance)
    const a = Math.atan2(dy, dx)
    return { x: Math.cos(a) * d, y: Math.sin(a) * d }
  }, [mx, my, maxDistance, forceLookX, forceLookY])

  return (
    <div
      ref={eyeRef}
      style={{
        width: size,
        height: isBlinking ? 2 : size,
        backgroundColor: eyeColor,
        borderRadius: '50%',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        transition: 'all 0.15s',
        overflow: 'hidden',
      }}
    >
      {!isBlinking && (
        <div
          style={{
            width: pupilSize,
            height: pupilSize,
            backgroundColor: pupilColor,
            borderRadius: '50%',
            transition: 'transform 0.1s ease-out',
            transform: `translate(${pos.x}px, ${pos.y}px)`,
          }}
        />
      )}
    </div>
  )
}
