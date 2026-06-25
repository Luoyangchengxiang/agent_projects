import { useState, useEffect, useRef, useMemo } from 'react'

/**
 * 瞳孔组件 — 跟随鼠标移动的圆点
 * Vue 原版：Pupil.vue
 */
export default function Pupil({
  size = 12,
  maxDistance = 5,
  pupilColor = 'black',
  forceLookX,
  forceLookY,
}) {
  const [mx, setMx] = useState(0)
  const [my, setMy] = useState(0)
  const pupilRef = useRef(null)

  useEffect(() => {
    const onMove = (e) => { setMx(e.clientX); setMy(e.clientY) }
    window.addEventListener('mousemove', onMove)
    return () => window.removeEventListener('mousemove', onMove)
  }, [])

  const pos = useMemo(() => {
    if (!pupilRef.current) return { x: 0, y: 0 }
    if (forceLookX !== undefined && forceLookY !== undefined)
      return { x: forceLookX, y: forceLookY }
    const r = pupilRef.current.getBoundingClientRect()
    const dx = mx - (r.left + r.width / 2)
    const dy = my - (r.top + r.height / 2)
    const d = Math.min(Math.sqrt(dx ** 2 + dy ** 2), maxDistance)
    const a = Math.atan2(dy, dx)
    return { x: Math.cos(a) * d, y: Math.sin(a) * d }
  }, [mx, my, maxDistance, forceLookX, forceLookY])

  return (
    <div
      ref={pupilRef}
      style={{
        width: size,
        height: size,
        backgroundColor: pupilColor,
        borderRadius: '50%',
        transition: 'transform 0.1s ease-out',
        transform: `translate(${pos.x}px, ${pos.y}px)`,
      }}
    />
  )
}
