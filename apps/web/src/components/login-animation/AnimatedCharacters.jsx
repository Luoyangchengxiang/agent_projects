import { useState, useEffect, useRef, useCallback, useMemo } from 'react'
import EyeBall from './EyeBall'
import Pupil from './Pupil'

/**
 * 动画角色组件 — 4个卡通角色，眼睛跟随鼠标，对输入做出反应
 * Vue 原版：AnimatedCharacters.vue
 *
 * Props:
 * - isTyping: 用户正在输入
 * - hasSecret: 密码框有内容
 * - secretVisible: 密码可见（点击了显示密码）
 */
export default function AnimatedCharacters({ isTyping = false, hasSecret = false, secretVisible = false }) {
  const [mx, setMx] = useState(0)
  const [my, setMy] = useState(0)
  const [isPurpleBlinking, setIsPurpleBlinking] = useState(false)
  const [isBlackBlinking, setIsBlackBlinking] = useState(false)
  const [isLookingAtEachOther, setIsLookingAtEachOther] = useState(false)
  const [isPurplePeeking, setIsPurplePeeking] = useState(false)

  const purpleRef = useRef(null)
  const blackRef = useRef(null)
  const orangeRef = useRef(null)
  const yellowRef = useRef(null)

  const purplePos = useRef({ faceX: 0, faceY: 0, bodySkew: 0 })
  const blackPos = useRef({ faceX: 0, faceY: 0, bodySkew: 0 })
  const yellowPos = useRef({ faceX: 0, faceY: 0, bodySkew: 0 })
  const orangePos = useRef({ faceX: 0, faceY: 0, bodySkew: 0 })

  // 强制触发渲染
  const [, setTick] = useState(0)

  // 衍生状态
  const hiding = hasSecret && secretVisible
  const leaning = isTyping || (hasSecret && !secretVisible)

  // 计算角色位置
  const calcPos = useCallback((el, target) => {
    if (!el) return
    const r = el.getBoundingClientRect()
    const dx = mx - (r.left + r.width / 2)
    const dy = my - (r.top + r.height / 3)
    target.faceX = Math.max(-15, Math.min(15, dx / 20))
    target.faceY = Math.max(-10, Math.min(10, dy / 30))
    target.bodySkew = Math.max(-6, Math.min(6, -dx / 120))
  }, [mx, my])

  // 鼠标追踪
  useEffect(() => {
    const onMove = (e) => { setMx(e.clientX); setMy(e.clientY) }
    window.addEventListener('mousemove', onMove)
    return () => window.removeEventListener('mousemove', onMove)
  }, [])

  // 动画帧更新
  useEffect(() => {
    let rafId
    const tick = () => {
      calcPos(purpleRef.current, purplePos.current)
      calcPos(blackRef.current, blackPos.current)
      calcPos(yellowRef.current, yellowPos.current)
      calcPos(orangeRef.current, orangePos.current)
      setTick(t => t + 1) // 触发重绘
      rafId = requestAnimationFrame(tick)
    }
    rafId = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(rafId)
  }, [calcPos])

  // 眨眼动画
  useEffect(() => {
    let t1, t2
    const setupBlink = (setter) => {
      const go = () => {
        t1 = setTimeout(() => {
          setter(true)
          t2 = setTimeout(() => { setter(false); go() }, 150)
        }, Math.random() * 4000 + 3000)
      }
      go()
    }
    setupBlink(setIsPurpleBlinking)
    const setupBlink2 = (setter) => {
      let t3, t4
      const go = () => {
        t3 = setTimeout(() => {
          setter(true)
          t4 = setTimeout(() => { setter(false); go() }, 150)
        }, Math.random() * 4000 + 3000)
      }
      go()
      return () => { clearTimeout(t3); clearTimeout(t4) }
    }
    const cleanup2 = setupBlink2(setIsBlackBlinking)
    return () => { clearTimeout(t1); clearTimeout(t2); cleanup2?.() }
  }, [])

  // 打字时互相看
  useEffect(() => {
    let t
    if (isTyping) {
      setIsLookingAtEachOther(true)
      t = setTimeout(() => setIsLookingAtEachOther(false), 800)
    } else {
      setIsLookingAtEachOther(false)
    }
    return () => clearTimeout(t)
  }, [isTyping])

  // 密码可见时紫色偷看
  useEffect(() => {
    let t1, t2
    if (hasSecret && secretVisible) {
      t1 = setTimeout(() => {
        setIsPurplePeeking(true)
        t2 = setTimeout(() => setIsPurplePeeking(false), 800)
      }, Math.random() * 3000 + 2000)
    } else {
      setIsPurplePeeking(false)
    }
    return () => { clearTimeout(t1); clearTimeout(t2) }
  }, [hasSecret, secretVisible])

  // 计算样式
  const purpleStyle = useMemo(() => ({
    height: leaning ? 440 : 400,
    transform: hiding ? 'skewX(0deg)'
      : leaning ? `skewX(${purplePos.current.bodySkew - 12}deg) translateX(40px)`
      : `skewX(${purplePos.current.bodySkew}deg)`,
  }), [hiding, leaning, purplePos.current.bodySkew])

  const purpleEyesStyle = useMemo(() => ({
    left: hiding ? 20 : isLookingAtEachOther ? 55 : 45 + purplePos.current.faceX,
    top: hiding ? 35 : isLookingAtEachOther ? 65 : 40 + purplePos.current.faceY,
    gap: 32,
  }), [hiding, isLookingAtEachOther, purplePos.current.faceX, purplePos.current.faceY])

  const purpleLookX = hiding ? (isPurplePeeking ? 4 : -4) : isLookingAtEachOther ? 3 : undefined
  const purpleLookY = hiding ? (isPurplePeeking ? 5 : -4) : isLookingAtEachOther ? 4 : undefined

  const blackStyle = useMemo(() => ({
    transform: hiding ? 'skewX(0deg)'
      : isLookingAtEachOther ? `skewX(${blackPos.current.bodySkew * 1.5 + 10}deg) translateX(20px)`
      : leaning ? `skewX(${blackPos.current.bodySkew * 1.5}deg)`
      : `skewX(${blackPos.current.bodySkew}deg)`,
  }), [hiding, isLookingAtEachOther, leaning, blackPos.current.bodySkew])

  const blackEyesStyle = useMemo(() => ({
    left: hiding ? 10 : isLookingAtEachOther ? 32 : 26 + blackPos.current.faceX,
    top: hiding ? 28 : isLookingAtEachOther ? 12 : 32 + blackPos.current.faceY,
    gap: 24,
  }), [hiding, isLookingAtEachOther, blackPos.current.faceX, blackPos.current.faceY])

  const blackLookX = hiding ? -4 : isLookingAtEachOther ? 0 : undefined
  const blackLookY = hiding ? -4 : isLookingAtEachOther ? -4 : undefined

  const orangeStyle = useMemo(() => ({
    transform: hiding ? 'skewX(0deg)' : `skewX(${orangePos.current.bodySkew}deg)`,
  }), [hiding, orangePos.current.bodySkew])

  const orangeEyesStyle = useMemo(() => ({
    left: hiding ? 50 : 82 + orangePos.current.faceX,
    top: hiding ? 85 : 90 + orangePos.current.faceY,
    gap: 32,
  }), [hiding, orangePos.current.faceX, orangePos.current.faceY])

  const yellowStyle = useMemo(() => ({
    transform: hiding ? 'skewX(0deg)' : `skewX(${yellowPos.current.bodySkew}deg)`,
  }), [hiding, yellowPos.current.bodySkew])

  const yellowEyesStyle = useMemo(() => ({
    left: hiding ? 20 : 52 + yellowPos.current.faceX,
    top: hiding ? 35 : 40 + yellowPos.current.faceY,
    gap: 24,
  }), [hiding, yellowPos.current.faceX, yellowPos.current.faceY])

  const yellowMouthStyle = useMemo(() => ({
    left: hiding ? 10 : 40 + yellowPos.current.faceX,
    top: hiding ? 88 : 88 + yellowPos.current.faceY,
  }), [hiding, yellowPos.current.faceX, yellowPos.current.faceY])

  return (
    <div style={{ position: 'relative', width: 550, height: 400 }}>
      {/* 紫色角色 */}
      <div ref={purpleRef} style={{
        position: 'absolute', bottom: 0, left: 70, width: 180, height: 400,
        background: '#6C3FF5', borderRadius: '10px 10px 0 0', zIndex: 1,
        transition: 'all 0.7s ease-in-out', transformOrigin: 'bottom center',
        ...purpleStyle,
      }}>
        <div style={{ position: 'absolute', display: 'flex', transition: 'all 0.7s ease-in-out', ...purpleEyesStyle }}>
          {[0, 1].map(i => (
            <EyeBall key={`p${i}`} size={18} pupilSize={7} maxDistance={5}
              eyeColor="white" pupilColor="#2D2D2D" isBlinking={isPurpleBlinking}
              forceLookX={purpleLookX} forceLookY={purpleLookY} />
          ))}
        </div>
      </div>

      {/* 黑色角色 */}
      <div ref={blackRef} style={{
        position: 'absolute', bottom: 0, left: 240, width: 120, height: 310,
        background: '#2D2D2D', borderRadius: '8px 8px 0 0', zIndex: 2,
        transition: 'all 0.7s ease-in-out', transformOrigin: 'bottom center',
        ...blackStyle,
      }}>
        <div style={{ position: 'absolute', display: 'flex', transition: 'all 0.7s ease-in-out', ...blackEyesStyle }}>
          {[0, 1].map(i => (
            <EyeBall key={`b${i}`} size={16} pupilSize={6} maxDistance={4}
              eyeColor="white" pupilColor="#2D2D2D" isBlinking={isBlackBlinking}
              forceLookX={blackLookX} forceLookY={blackLookY} />
          ))}
        </div>
      </div>

      {/* 橙色角色 */}
      <div ref={orangeRef} style={{
        position: 'absolute', bottom: 0, left: 0, width: 240, height: 200,
        background: '#FF9B6B', borderRadius: '120px 120px 0 0', zIndex: 3,
        transition: 'all 0.7s ease-in-out', transformOrigin: 'bottom center',
        ...orangeStyle,
      }}>
        <div style={{ position: 'absolute', display: 'flex', transition: 'all 0.7s ease-in-out', ...orangeEyesStyle }}>
          {[0, 1].map(i => (
            <Pupil key={`o${i}`} size={12} maxDistance={5} pupilColor="#2D2D2D"
              forceLookX={hiding ? -5 : undefined} forceLookY={hiding ? -4 : undefined} />
          ))}
        </div>
      </div>

      {/* 黄色角色 */}
      <div ref={yellowRef} style={{
        position: 'absolute', bottom: 0, left: 310, width: 140, height: 230,
        background: '#E8D754', borderRadius: '70px 70px 0 0', zIndex: 4,
        transition: 'all 0.7s ease-in-out', transformOrigin: 'bottom center',
        ...yellowStyle,
      }}>
        <div style={{ position: 'absolute', display: 'flex', transition: 'all 0.7s ease-in-out', ...yellowEyesStyle }}>
          {[0, 1].map(i => (
            <Pupil key={`y${i}`} size={12} maxDistance={5} pupilColor="#2D2D2D"
              forceLookX={hiding ? -5 : undefined} forceLookY={hiding ? -4 : undefined} />
          ))}
        </div>
        <div style={{
          position: 'absolute', width: 80, height: 4,
          background: '#2D2D2D', borderRadius: 4,
          transition: 'all 0.2s ease-out',
          ...yellowMouthStyle,
        }} />
      </div>
    </div>
  )
}
