/**
 * SVG 动漫小猫形象
 * 替代 canvas2d 的默认形象
 */
import { useState, useEffect } from 'react'

export default function CatAvatar({ size = 120, expression = 'normal' }) {
  const [blink, setBlink] = useState(false)
  
  // 眨眼动画
  useEffect(() => {
    const blinkInterval = setInterval(() => {
      setBlink(true)
      setTimeout(() => setBlink(false), 200)
    }, 3000 + Math.random() * 2000)
    
    return () => clearInterval(blinkInterval)
  }, [])

  // 表情状态
  const expressions = {
    normal: { eyeScaleY: 1, mouthPath: 'M 45 75 Q 55 80 65 75' },
    happy: { eyeScaleY: 0.3, mouthPath: 'M 40 72 Q 55 85 70 72' },
    surprised: { eyeScaleY: 1.3, mouthPath: 'M 50 75 A 5 5 0 1 0 60 75 A 5 5 0 1 0 50 75' },
    sleeping: { eyeScaleY: 0.1, mouthPath: 'M 48 75 Q 55 78 62 75' },
  }
  
  const expr = expressions[expression] || expressions.normal

  return (
    <svg 
      width={size} 
      height={size} 
      viewBox="0 0 100 100" 
      xmlns="http://www.w3.org/2000/svg"
      className="cat-avatar"
    >
      {/* 耳朵 - 左 */}
      <path 
        d="M 25 35 L 15 10 L 40 30 Z" 
        fill="#FFB6C1" 
        stroke="#FF69B4" 
        strokeWidth="1.5"
      />
      <path 
        d="M 28 32 L 20 15 L 37 30 Z" 
        fill="#FFD1DC"
      />
      
      {/* 耳朵 - 右 */}
      <path 
        d="M 75 35 L 85 10 L 60 30 Z" 
        fill="#FFB6C1" 
        stroke="#FF69B4" 
        strokeWidth="1.5"
      />
      <path 
        d="M 72 32 L 80 15 L 63 30 Z" 
        fill="#FFD1DC"
      />
      
      {/* 头部 */}
      <ellipse 
        cx="50" 
        cy="55" 
        rx="35" 
        ry="30" 
        fill="#FFB6C1" 
        stroke="#FF69B4" 
        strokeWidth="1.5"
      />
      
      {/* 脸部白色区域 */}
      <ellipse 
        cx="50" 
        cy="60" 
        rx="25" 
        ry="20" 
        fill="#FFF0F5"
      />
      
      {/* 眼睛 - 左 */}
      <g transform={`translate(38, 48) scale(1, ${blink ? 0.1 : expr.eyeScaleY})`}>
        <ellipse cx="0" cy="0" rx="6" ry="7" fill="#333" />
        <ellipse cx="2" cy="-2" rx="2" ry="2.5" fill="white" />
      </g>
      
      {/* 眼睛 - 右 */}
      <g transform={`translate(62, 48) scale(1, ${blink ? 0.1 : expr.eyeScaleY})`}>
        <ellipse cx="0" cy="0" rx="6" ry="7" fill="#333" />
        <ellipse cx="2" cy="-2" rx="2" ry="2.5" fill="white" />
      </g>
      
      {/* 鼻子 */}
      <ellipse cx="50" cy="62" rx="3" ry="2" fill="#FF69B4" />
      
      {/* 嘴巴 */}
      <path 
        d={expr.mouthPath} 
        fill="none" 
        stroke="#FF69B4" 
        strokeWidth="1.5" 
        strokeLinecap="round"
      />
      
      {/* 胡子 - 左 */}
      <line x1="15" y1="55" x2="35" y2="58" stroke="#FFB6C1" strokeWidth="1" />
      <line x1="15" y1="62" x2="35" y2="62" stroke="#FFB6C1" strokeWidth="1" />
      <line x1="18" y1="70" x2="35" y2="66" stroke="#FFB6C1" strokeWidth="1" />
      
      {/* 胡子 - 右 */}
      <line x1="85" y1="55" x2="65" y2="58" stroke="#FFB6C1" strokeWidth="1" />
      <line x1="85" y1="62" x2="65" y2="62" stroke="#FFB6C1" strokeWidth="1" />
      <line x1="82" y1="70" x2="65" y2="66" stroke="#FFB6C1" strokeWidth="1" />
      
      {/* 腮红 */}
      <ellipse cx="30" cy="65" rx="8" ry="5" fill="#FFD1DC" opacity="0.5" />
      <ellipse cx="70" cy="65" rx="8" ry="5" fill="#FFD1DC" opacity="0.5" />
      
      {/* 身体 */}
      <ellipse 
        cx="50" 
        cy="90" 
        rx="25" 
        ry="15" 
        fill="#FFB6C1" 
        stroke="#FF69B4" 
        strokeWidth="1.5"
      />
      
      {/* 肚子 */}
      <ellipse 
        cx="50" 
        cy="92" 
        rx="15" 
        ry="10" 
        fill="#FFF0F5"
      />
      
      {/* 爪子 - 左 */}
      <ellipse cx="35" cy="98" rx="8" ry="5" fill="#FFB6C1" stroke="#FF69B4" strokeWidth="1" />
      
      {/* 爪子 - 右 */}
      <ellipse cx="65" cy="98" rx="8" ry="5" fill="#FFB6C1" stroke="#FF69B4" strokeWidth="1" />
      
      {/* 尾巴 */}
      <path 
        d="M 75 85 Q 90 70 85 55 Q 82 48 78 52" 
        fill="none" 
        stroke="#FFB6C1" 
        strokeWidth="6" 
        strokeLinecap="round"
      />
      <path 
        d="M 78 52 Q 75 48 72 52" 
        fill="#FF69B4" 
        stroke="#FF69B4" 
        strokeWidth="2"
      />
    </svg>
  )
}
