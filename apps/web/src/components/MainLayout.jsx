import { Outlet } from 'react-router-dom'
import { Suspense } from 'react'
import Sidebar from './Sidebar'
import Header from './Header'
import ChatButton from './chat/ChatButton'
import Mascot from './mascot/Mascot'
import useMascotStore from '../stores/mascotStore'

// 内容区域加载占位（只在 Outlet 区域显示，不影响侧边栏）
function ContentLoading() {
  return (
    <div style={{
      display: 'flex',
      justifyContent: 'center',
      alignItems: 'center',
      height: '50%',
      minHeight: 200,
      color: '#9ca3af',
      fontSize: 14,
    }}>
      <div style={{
        width: 24,
        height: 24,
        border: '2px solid rgba(6, 182, 212, 0.2)',
        borderTopColor: '#06b6d4',
        borderRadius: '50%',
        animation: 'spin 1s linear infinite',
        marginRight: 12,
      }} />
      加载中...
    </div>
  )
}

function MainLayout() {
  const { hasSelectedModel } = useMascotStore()
  const showMascot = hasSelectedModel()

  return (
    <div className="page-container">
      <Sidebar />
      <div className="main-content">
        <Header />
        <main className="p-6" style={{ height: 'calc(100vh - 64px)', overflow: 'auto' }}>
          <Suspense fallback={<ContentLoading />}>
            <Outlet />
          </Suspense>
        </main>
      </div>

      {/* 客服悬浮按钮 - 仅在看板娘未激活时显示 */}
      {!showMascot && <ChatButton />}

      {/* 看板娘 */}
      <Mascot />
    </div>
  )
}

export default MainLayout
