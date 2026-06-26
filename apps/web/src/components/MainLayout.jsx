import { Outlet } from 'react-router-dom'
import Sidebar from './Sidebar'
import Header from './Header'
import ChatButton from './chat/ChatButton'
import Mascot from './mascot/Mascot'
import useMascotStore from '../stores/mascotStore'

function MainLayout() {
  const { hasSelectedModel } = useMascotStore()
  const showMascot = hasSelectedModel()

  return (
    <div className="page-container">
      <Sidebar />
      <div className="main-content">
        <Header />
        <main className="p-6">
          <Outlet />
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
