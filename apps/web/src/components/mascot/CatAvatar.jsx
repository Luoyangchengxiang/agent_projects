/**
 * SVG 动漫小猫形象
 * 参考 GitHub 黑夜模式小猫咪动画风格
 * 来源：https://cloud.tencent.com/developer/article/1835795
 */
import { useState, useEffect } from 'react'

// 小猫颜色配置
const CAT_COLORS = {
  'cat-black': { body: '#1f1f1f', belly: '#2d2d2d', eyes: '#4ade80', blush: '#ff6b9d' },
  'cat-white': { body: '#f5f5f5', belly: '#ffffff', eyes: '#60a5fa', blush: '#f472b6' },
  'cat-orange': { body: '#ff9b6b', belly: '#ffd4b8', eyes: '#fbbf24', blush: '#ff6b9d' },
  'cat-gray': { body: '#8b949e', belly: '#c9d1d9', eyes: '#a78bfa', blush: '#f472b6' },
  'cat-pink': { body: '#ff6b9d', belly: '#ffb3d0', eyes: '#fbbf24', blush: '#ff9b6b' },
}

export default function CatAvatar({ size = 120, expression = 'normal', modelId = 'cat-black' }) {
  const [blink, setBlink] = useState(false)
  const [tailWag, setTailWag] = useState(0)
  
  const colors = CAT_COLORS[modelId] || CAT_COLORS['cat-black']
  
  // 眨眼动画
  useEffect(() => {
    const blinkInterval = setInterval(() => {
      setBlink(true)
      setTimeout(() => setBlink(false), 200)
    }, 3000 + Math.random() * 2000)
    
    return () => clearInterval(blinkInterval)
  }, [])

  // 尾巴摇摆动画
  useEffect(() => {
    let frame = 0
    const animate = () => {
      frame += 0.05
      setTailWag(Math.sin(frame) * 10)
      requestAnimationFrame(animate)
    }
    const raf = requestAnimationFrame(animate)
    return () => cancelAnimationFrame(raf)
  }, [])

  // 表情状态
  const expressions = {
    normal: { eyeScaleY: 1, mouthPath: 'M 42 62 Q 50 68 58 62' },
    happy: { eyeScaleY: 0.3, mouthPath: 'M 38 60 Q 50 72 62 60' },
    surprised: { eyeScaleY: 1.3, mouthPath: 'M 46 62 A 4 4 0 1 0 54 62 A 4 4 0 1 0 46 62' },
    sleeping: { eyeScaleY: 0.1, mouthPath: 'M 45 62 Q 50 65 55 62' },
  }
  
  const expr = expressions[expression] || expressions.normal

  return (
    <svg 
      width={size} 
      height={size} 
      viewBox="0 0 100 110" 
      xmlns="http://www.w3.org/2000/svg"
      className="cat-avatar"
    >
      {/* 尾巴 */}
      <path 
        d={`M 75 75 Q ${85 + tailWag} 55 ${80 + tailWag} 40 Q ${78 + tailWag} 35 ${75 + tailWag} 38`}
        fill="none" 
        stroke={colors.body} 
        strokeWidth="8" 
        strokeLinecap="round"
      />
      
      {/* 身体 */}
      <ellipse 
        cx="50" 
        cy="80" 
        rx="28" 
        ry="22" 
        fill={colors.body}
      />
      
      {/* 肚子白色区域 */}
      <ellipse 
        cx="50" 
        cy="84" 
        rx="18" 
        ry="14" 
        fill={colors.belly}
      />
      
      {/* 爪子 - 左 */}
      <ellipse cx="35" cy="95" rx="10" ry="6" fill={colors.body} />
      <ellipse cx="35" cy="96" rx="7" ry="4" fill={colors.belly} />
      
      {/* 爪子 - 右 */}
      <ellipse cx="65" cy="95" rx="10" ry="6" fill={colors.body} />
      <ellipse cx="65" cy="96" rx="7" ry="4" fill={colors.belly} />
      
      {/* 耳朵 - 左 */}
      <path 
        d="M 25 35 L 15 8 L 42 28 Z" 
        fill={colors.body}
      />
      <path 
        d="M 28 32 L 20 14 L 38 28 Z" 
        fill={colors.blush}
      />
      
      {/* 耳朵 - 右 */}
      <path 
        d="M 75 35 L 85 8 L 58 28 Z" 
        fill={colors.body}
      />
      <path 
        d="M 72 32 L 80 14 L 62 28 Z" 
        fill={colors.blush}
      />
      
      {/* 头部 */}
      <ellipse 
        cx="50" 
        cy="45" 
        rx="32" 
        ry="28" 
        fill={colors.body}
      />
      
      {/* 脸部白色区域 */}
      <ellipse 
        cx="50" 
        cy="50" 
        rx="22" 
        ry="18" 
        fill={colors.belly}
      />
      
      {/* 眼睛 - 左 */}
      <g transform={`translate(38, 42) scale(1, ${blink ? 0.1 : expr.eyeScaleY})`}>
        <ellipse cx="0" cy="0" rx="6" ry="7" fill={colors.eyes} />
        <ellipse cx="0" cy="0" rx="3" ry="4" fill="#1f1f1f" />
        <ellipse cx="1.5" cy="-2" rx="1.5" ry="2" fill="white" opacity="0.8" />
      </g>
      
      {/* 眼睛 - 右 */}
      <g transform={`translate(62, 42) scale(1, ${blink ? 0.1 : expr.eyeScaleY})`}>
        <ellipse cx="0" cy="0" rx="6" ry="7" fill={colors.eyes} />
        <ellipse cx="0" cy="0" rx="3" ry="4" fill="#1f1f1f" />
        <ellipse cx="1.5" cy="-2" rx="1.5" ry="2" fill="white" opacity="0.8" />
      </g>
      
      {/* 鼻子 */}
      <ellipse cx="50" cy="54" rx="3" ry="2.5" fill={colors.blush} />
      
      {/* 嘴巴 */}
      <path 
        d={expr.mouthPath} 
        fill="none" 
        stroke={colors.blush} 
        strokeWidth="1.5" 
        strokeLinecap="round"
      />
      
      {/* 胡子 - 左 */}
      <line x1="12" y1="48" x2="32" y2="52" stroke="#4a4a4a" strokeWidth="1" opacity="0.5" />
      <line x1="14" y1="55" x2="32" y2="55" stroke="#4a4a4a" strokeWidth="1" opacity="0.5" />
      <line x1="16" y1="62" x2="32" y2="58" stroke="#4a4a4a" strokeWidth="1" opacity="0.5" />
      
      {/* 胡子 - 右 */}
      <line x1="88" y1="48" x2="68" y2="52" stroke="#4a4a4a" strokeWidth="1" opacity="0.5" />
      <line x1="86" y1="55" x2="68" y2="55" stroke="#4a4a4a" strokeWidth="1" opacity="0.5" />
      <line x1="84" y1="62" x2="68" y2="58" stroke="#4a4a4a" strokeWidth="1" opacity="0.5" />
      
      {/* 腮红 */}
      <ellipse cx="28" cy="55" rx="7" ry="4" fill={colors.blush} opacity="0.2" />
      <ellipse cx="72" cy="55" rx="7" ry="4" fill={colors.blush} opacity="0.2" />
    </svg>
  )
}