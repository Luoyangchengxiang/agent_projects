/**
 * 看板娘渲染组件
 * 使用 SVG 动漫小猫形象
 * 参考：GitHub 黑夜模式小猫咪动画
 */
import { useState } from 'react'
import useMascotStore from '../../stores/mascotStore'
import CatAvatar from './CatAvatar'

export default function Live2DRenderer({ onHover, onClick }) {
  const { getCurrentModel } = useMascotStore()
  const [expression, setExpression] = useState('normal')

  // 点击切换表情
  const handleClick = () => {
    const expressions = ['normal', 'happy', 'surprised']
    const currentIndex = expressions.indexOf(expression)
    const nextIndex = (currentIndex + 1) % expressions.length
    setExpression(expressions[nextIndex])
    onClick?.(['body'])
  }

  const currentModel = getCurrentModel()

  return (
    <div 
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
      onMouseEnter={() => onHover?.(true)}
      onMouseLeave={() => onHover?.(false)}
      onClick={handleClick}
    >
      {/* SVG 动漫小猫 */}
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
    </div>
  )
}