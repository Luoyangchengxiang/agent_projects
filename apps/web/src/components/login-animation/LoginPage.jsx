import { useState, useRef, useEffect, forwardRef, useImperativeHandle } from 'react'
import { Eye, EyeOff, Mail, Sparkles } from 'lucide-react'
import { tokenManager } from '../../services/tokenManager'
import AnimatedCharacters from './AnimatedCharacters'
import './login.css'

/**
 * 登录页面组件 — 左侧动画角色 + 右侧登录表单
 * Vue 原版：LoginPage.vue
 *
 * Props:
 * - brandName: 品牌名称
 * - title: 标题
 * - subtitle: 副标题
 * - emailPlaceholder: 邮箱输入框占位符
 * - primaryColor: 主题色
 * - showGoogleLogin: 是否显示 Google 登录
 * - onSubmit: 提交回调 (payload) => void
 */
const LoginPage = forwardRef(function LoginPage({
  brandName = 'YourBrand',
  title = '欢迎回来！',
  subtitle = '请输入您的账号信息登录系统',
  emailPlaceholder = '程序员阿甘(接单中)',
  primaryColor = '#4f46e5',
  showGoogleLogin = true,
  onSubmit,
  footerLink,
}, ref) {
  const [showPassword, setShowPassword] = useState(false)
  const [login, setLogin] = useState('')  // 用户名或邮箱
  const [password, setPassword] = useState('')
  const [remember, setRemember] = useState(false)
  const [errorMsg, setErrorMsg] = useState('')
  const [loading, setLoading] = useState(false)
  const [isTyping, setIsTyping] = useState(false)

  // 初始化时检查是否有记住的登录信息
  useEffect(() => {
    const remembered = tokenManager.getRemember()
    if (remembered) {
      setLogin(remembered.login)
      setPassword(remembered.password)
      setRemember(true)
    }
  }, [])

  // 暴露给父组件的方法
  useImperativeHandle(ref, () => ({
    setError: (msg) => setErrorMsg(msg),
    setLoading: (v) => setLoading(v),
  }))

  const handleSubmit = (e) => {
    e.preventDefault()
    setErrorMsg('')

    // 处理记住密码
    if (remember) {
      tokenManager.saveRemember(login, password)
    } else {
      tokenManager.clearRemember()
    }

    onSubmit?.({ login, password, remember })
  }

  return (
    <div className="login-page">
      {/* 左侧 — 动画区域 */}
      <div className="login-left" style={{ background: `linear-gradient(135deg, ${primaryColor}e6, ${primaryColor}, ${primaryColor}cc)` }}>
        <div className="login-brand">
          <div className="login-brand-icon"><Sparkles size={16} /></div>
          <span>{brandName}</span>
        </div>
        <div className="login-characters-area">
          <AnimatedCharacters
            isTyping={isTyping}
            hasSecret={!!password}
            secretVisible={showPassword}
          />
        </div>
        <div className="login-footer-links">
          <a href="#">隐私政策</a>
          <a href="#">服务条款</a>
          <a href="#">联系我们</a>
        </div>
        {/* 装饰元素 */}
        <div className="login-deco-grid" />
        <div className="login-deco-circle login-deco-circle-1" />
        <div className="login-deco-circle login-deco-circle-2" />
      </div>

      {/* 右侧 — 表单区域 */}
      <div className="login-right">
        <div className="login-form-wrapper">
          {/* 移动端品牌 */}
          <div className="login-mobile-brand">
            <div className="login-brand-icon"><Sparkles size={16} /></div>
            <span>{brandName}</span>
          </div>

          <div className="login-header">
            <h1>{title}</h1>
            <p>{subtitle}</p>
          </div>

          <form onSubmit={handleSubmit} className="login-form">
            <div className="login-field">
              <label htmlFor="login-input">用户名 / 邮箱</label>
              <input
                id="login-input"
                type="text"
                placeholder="请输入用户名或邮箱"
                value={login}
                onChange={(e) => setLogin(e.target.value)}
                onFocus={() => setIsTyping(true)}
                onBlur={() => setIsTyping(false)}
                autoComplete="username"
                required
              />
            </div>

            <div className="login-field">
              <label htmlFor="login-password">密码</label>
              <div className="login-password-wrap">
                <input
                  id="login-password"
                  type={showPassword ? 'text' : 'password'}
                  placeholder="请输入密码"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                />
                <button
                  type="button"
                  className="login-eye-btn"
                  onClick={() => setShowPassword(!showPassword)}
                >
                  {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
                </button>
              </div>
            </div>

            <div className="login-options">
              <label className="login-remember">
                <input
                  type="checkbox"
                  checked={remember}
                  onChange={(e) => setRemember(e.target.checked)}
                />
                记住30天
              </label>
              <a href="#" className="login-forgot">忘记密码？</a>
            </div>

            {errorMsg && <div className="login-error-msg">{errorMsg}</div>}

            <button
              type="submit"
              className="login-btn-primary"
              disabled={loading}
              style={{ background: primaryColor }}
            >
              {loading ? '登录中...' : '登录'}
            </button>
          </form>

          {showGoogleLogin && (
            <button type="button" className="login-btn-google">
              <Mail size={20} /> 使用Google登录
            </button>
          )}

          <p className="login-signup-link">
            {footerLink || <a href="#">注册</a>}
          </p>
        </div>
      </div>
    </div>
  )
})

export default LoginPage
