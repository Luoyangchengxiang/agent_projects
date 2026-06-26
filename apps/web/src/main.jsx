import React, { Suspense } from 'react'
import ReactDOM from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { ConfigProvider, App as AntApp, theme } from 'antd'
import zhCN from 'antd/locale/zh_CN'
import { initPreloadScreen } from 'preload-screen'
import App from './App'
import './styles/variables.css'
import './styles/components.css'
import './styles/notification.css'

// 在 JS 加载前就显示 loading（越早越好）
const loader = initPreloadScreen({
  mode: 'manual',
  text: 'Agent Monitor',
  color: '#06b6d4',
  animeStyle: '3dBox',
  minShow: 300,
  fadeOut: 500,
})

// 创建QueryClient
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 1,
      refetchOnWindowFocus: false,
    },
  },
})

// Ant Design 暗色主题配置
const darkTheme = {
  algorithm: theme.darkAlgorithm,
  token: {
    colorPrimary: '#06b6d4',
    colorBgContainer: '#24272e',
    colorBgElevated: '#2a2d35',
    colorBgLayout: '#0f1117',
    colorText: '#e5e7eb',
    colorTextSecondary: '#9ca3af',
    colorBorder: 'rgba(255, 255, 255, 0.1)',
    borderRadius: 8,
  },
  components: {
    Table: {
      colorBgContainer: '#24272e',
      headerBg: '#1a1d24',
      headerColor: '#9ca3af',
      rowHoverBg: '#2a2d35',
      borderColor: 'rgba(255, 255, 255, 0.05)',
    },
    Card: {
      colorBgContainer: '#24272e',
    },
    Input: {
      colorBgContainer: '#1a1d24',
      colorBorder: 'rgba(255, 255, 255, 0.1)',
    },
    Select: {
      colorBgContainer: '#1a1d24',
      colorBorder: 'rgba(255, 255, 255, 0.1)',
    },
    Button: {
      colorPrimary: '#06b6d4',
    },
    Tag: {
      borderRadiusSM: 12,
    },
    Message: {
      colorBgContainer: '#2a2d35',
      colorText: '#e5e7eb',
    },
    Modal: {
      colorBgContainer: '#24272e',
      colorBgElevated: '#24272e',
      titleColor: '#e5e7eb',
      colorText: '#e5e7eb',
      colorTextSecondary: '#9ca3af',
      colorIcon: '#9ca3af',
      colorIconHover: '#e5e7eb',
    },
  },
}

// 应用挂载完成后关闭预加载屏
ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <ConfigProvider locale={zhCN} theme={darkTheme}>
      <AntApp>
        <QueryClientProvider client={queryClient}>
          <BrowserRouter>
            <App onReady={() => loader.hide()} />
          </BrowserRouter>
        </QueryClientProvider>
      </AntApp>
    </ConfigProvider>
  </React.StrictMode>
)