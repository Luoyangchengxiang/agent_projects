import { BellOutlined, SearchOutlined, UserOutlined } from '@ant-design/icons'

function Header() {
  return (
    <div className="header flex items-center justify-between px-6">
      {/* 搜索框 */}
      <div className="flex-1 max-w-md">
        <div className="relative">
          <SearchOutlined className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted" />
          <input
            type="text"
            placeholder="搜索Agent、日志..."
            className="input pl-10 pr-4 py-2"
          />
        </div>
      </div>

      {/* 右侧操作区 */}
      <div className="flex items-center gap-4">
        {/* 通知按钮 */}
        <button className="btn-ghost relative">
          <BellOutlined className="text-lg" />
          <span className="absolute -top-1 -right-1 w-4 h-4 bg-error rounded-full text-xs flex items-center justify-center">
            3
          </span>
        </button>

        {/* 用户头像 */}
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 bg-primary/20 rounded-full flex items-center justify-center">
            <UserOutlined className="text-primary" />
          </div>
          <span className="text-sm text-secondary">Admin</span>
        </div>
      </div>
    </div>
  )
}

export default Header
