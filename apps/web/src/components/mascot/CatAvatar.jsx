/**
 * GitHub 黑夜模式猫猫 SVG 动画
 * 来源：https://cloud.tencent.com/developer/article/1835795
 */
import { useState, useEffect } from 'react'

// 小猫颜色配置（stroke 颜色映射）
const CAT_COLORS = {
  'cat-black': '#c9d1d9',
  'cat-white': '#e6edf3',
  'cat-orange': '#f0883e',
  'cat-gray': '#8b949e',
  'cat-pink': '#f778ba',
}

export default function CatAvatar({ size = 120, expression = 'normal', modelId = 'cat-black' }) {
  const [blink, setBlink] = useState(false)
  const [tailPhase, setTailPhase] = useState(0)

  const strokeColor = CAT_COLORS[modelId] || CAT_COLORS['cat-black']

  // 眨眼动画
  useEffect(() => {
    const blinkInterval = setInterval(() => {
      setBlink(true)
      setTimeout(() => setBlink(false), 200)
    }, 3000 + Math.random() * 2000)
    return () => clearInterval(blinkInterval)
  }, [])

  // 尾巴摇摆动画（用 tailPhase 控制尾巴曲线偏移）
  useEffect(() => {
    let frame = 0
    const animate = () => {
      frame += 0.03
      setTailPhase(Math.sin(frame) * 3)
      requestAnimationFrame(animate)
    }
    const raf = requestAnimationFrame(animate)
    return () => cancelAnimationFrame(raf)
  }, [])

  return (
    <svg
      width={size}
      height={size * 0.566} // 保持 106:60 的宽高比
      viewBox="0 0 106 60"
      fill="none"
      strokeWidth="3"
      strokeLinecap="round"
      strokeLinejoin="round"
      xmlns="http://www.w3.org/2000/svg"
      className="cat-avatar"
    >
      {/* 红色组 - 坐姿猫的下半身/底座 */}
      <g stroke={strokeColor} opacity="0.9">
        <path d="M37.5 58.5V57.5C37.5 49.768 43.768 43.5 51.5 43.5V43.5C59.232 43.5 65.5 49.768 65.5 57.5V58.5" />
      </g>

      {/* 橙色组 - 装饰性曲线（地面/尾巴元素），尾巴跟随动画 */}
      <g stroke={strokeColor} opacity="0.7">
        <path d={`M${104.07 + tailPhase} 58.5C${103.401 + tailPhase} 55.092 ${97.7635 + tailPhase} 54.3869 ${95.5375 + tailPhase} 57.489C${97.4039 + tailPhase} 54.6411 ${99.7685 + tailPhase} 48.8845 ${94.6889 + tailPhase} 46.6592C${89.4817 + tailPhase} 44.378 ${86.1428 + tailPhase} 50.1604 ${85.3786 + tailPhase} 54.1158C${85.9519 + tailPhase} 50.4768 ${83.7226 + tailPhase} 43.294 ${78.219 + tailPhase} 44.6737C${72.7154 + tailPhase} 46.0534 ${72.7793 + tailPhase} 51.3754 ${74.4992 + tailPhase} 55.489C${74.169 + tailPhase} 54.7601 ${72.4917 + tailPhase} 53.3567 ${70.5 + tailPhase} 52.8196`} />
      </g>

      {/* 紫色组 - 左侧花朵/装饰元素 */}
      <g stroke={strokeColor} opacity="0.8">
        <path d="M5.51109 58.5V52.5C5.51109 41.4543 14.4654 32.5 25.5111 32.5C31.4845 32.5 36.8464 35.1188 40.5111 39.2709C40.7212 39.5089 40.9258 39.7521 41.1245 40" />
        <path d="M27.511 49.5C29.6777 49.5 28.911 49.5 32.511 49.5" />
        <path d="M27.511 56.5C29.6776 56.5 26.911 56.5 30.511 56.5" />
      </g>

      {/* 绿色组 - 右上角星星/叶子装饰 */}
      <g stroke={strokeColor} opacity="0.8">
        <circle cx="5.5" cy="12.5" r="4" />
        <circle cx="18.5" cy="5.5" r="4" />
        <path d="M18.5 9.5L18.5 27.5" />
        <path d="M18.5 23.5C6 23.5 5.5 23.6064 5.5 16.5" />
      </g>

      {/* 蓝色组 - 猫的主要身体形状 */}
      <g stroke={strokeColor}>
        {/* 坐姿猫的身体轮廓（白天模式 frame） */}
        <path d="M40.6983 31.5C40.5387 29.6246 40.6456 28.0199 41.1762 27.2317C42.9939 24.5312 49.7417 26.6027 52.5428 30.2409C54.2551 29.8552 56.0796 29.6619 57.9731 29.6619C59.8169 29.6619 61.5953 29.8452 63.2682 30.211C66.0833 26.5913 72.799 24.5386 74.6117 27.2317C75.6839 28.8246 75.0259 33.7525 73.9345 37.5094C74.2013 37.9848 74.4422 38.4817 74.6555 39" />

        {/* 站立猫的身体轮廓（黑夜模式 frame） - 耳朵、头部、身体 */}
        <path d="M73.4999 40.2236C74.9709 38.2049 75.8108 35.5791 75.8108 32.2283C75.8108 29.2229 75.1351 26.6488 73.9344 24.5094C75.0258 20.7525 75.6838 15.8246 74.6116 14.2317C72.7989 11.5386 66.0832 13.5913 63.2681 17.211C61.5952 16.8452 59.8167 16.6619 57.973 16.6619C56.0795 16.6619 54.2549 16.8552 52.5427 17.2409C49.7416 13.6027 42.9938 11.5312 41.176 14.2317C40.0859 15.8512 40.7843 20.9182 41.9084 24.6968C41.003 26.3716 40.4146 28.3065 40.2129 30.5" />

        {/* 胡须 - 右上 */}
        <path d="M82.9458 30.5471L76.8413 31.657" />
        {/* 胡须 - 右下 */}
        <path d="M76.2867 34.4319L81.8362 37.7616" />

        {/* 眼睛 - 左（带眨眼动画） */}
        <path d="M49.4995 27.8242V30.4999" style={{
          transformOrigin: '49.4995px 29.162px',
          transform: `scaleY(${blink ? 0.1 : 1})`,
          transition: 'transform 0.1s ease'
        }} />
        {/* 眼睛 - 右（带眨眼动画） */}
        <path d="M67.3374 27.8242V30.4998" style={{
          transformOrigin: '67.3374px 29.162px',
          transform: `scaleY(${blink ? 0.1 : 1})`,
          transition: 'transform 0.1s ease'
        }} />
      </g>
    </svg>
  )
}
