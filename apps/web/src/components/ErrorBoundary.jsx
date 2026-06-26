/**
 * 错误边界组件
 * 捕获子组件的 JavaScript 错误，显示备用 UI
 */
import React from 'react'

function ErrorFallback({ error }) {
  return (
    <div style={{ padding: 40, color: '#ef4444', background: '#0f1117', minHeight: '100vh' }}>
      <h2>页面加载失败</h2>
      <pre style={{ color: '#9ca3af', fontSize: 12 }}>{error?.message || '未知错误'}</pre>
      <button 
        onClick={() => window.location.reload()} 
        style={{ marginTop: 16, padding: '8px 16px', background: '#06b6d4', color: '#fff', border: 'none', borderRadius: 6, cursor: 'pointer' }}
      >
        刷新页面
      </button>
    </div>
  )
}

class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props)
    this.state = { error: null }
  }

  static getDerivedStateFromError(error) {
    return { error }
  }

  componentDidCatch(error, errorInfo) {
    console.error('ErrorBoundary caught an error:', error, errorInfo)
  }

  render() {
    if (this.state.error) {
      return <ErrorFallback error={this.state.error} />
    }
    return this.props.children
  }
}

export default ErrorBoundary
