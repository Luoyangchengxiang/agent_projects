import { useState, useRef, useEffect, forwardRef, useImperativeHandle } from 'react'
import { Eye, EyeOff, Mail, Sparkles } from 'lucide-react'
import { tokenManager } from '../../services/tokenManager'
import AnimatedCharacters from './AnimatedCharacters'
import './login.css'

/**
 * 登录页面组件 — 左侧动画角色 + 右侧登录表单
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
  const [login, setLogin] = useState('')
  const [password, setPassword] = useState('')
  const [remember, setRemember] = useState(false)
  const [errorMsg, setErrorMsg] = useState('')
  const [loading, setLoading] = useState(false)
  const [isTyping, setIsTyping] = useState(false)
  const [isRememberLogin, setIsRememberLogin] = useState(false)

  // 初始化时加载最后一个记住的用户
  useEffect(() => {
    const lastRemembered = tokenManager.getLastRemembered()
    if (lastRemembered) {
      setLogin(lastRemembered.login)
      setPassword(lastRemembered.rememberToken)
      setRemember(true)
      setIsRememberLogin(true)
    }
  }, [])

  // 当用户名变化时，检查是否有对应的 remember_token
  const handleLoginChange = (e) => {
    const newLogin = e.target.value
    setLogin(newLogin)
    
    // 检查新用户名是否有对应的 remember_token
    if (newLogin) {
      const remembered = tokenManager.getRemember(newLogin)
      if (remembered) {
        setPassword(remembered.rememberToken)
        setRemember(true)
        setIsRememberLogin(true)
      } else {
        // 如果没有对应的 remember_token，清空密码
        setPassword('')
        setRemember(false)
        setIsRememberLogin(false)
      }
    } else {
      setPassword('')
      setRemember(false)
      setIsRememberLogin(false)
    }
  }

  // 暴露给父组件的方法
  useImperativeHandle(ref, () => ({
    setError: (msg) => setErrorMsg(msg),
    setLoading: (v) => setLoading(v),
  }))

  const handleSubmit = (e) => {
    e.preventDefault()
    setErrorMsg('')

    // 注意：不在这里清除 remember_token
    // 由 authService 在登录成功后根据 remember 参数决定是否保存/清除
    
    onSubmit?.({ login, password, remember, isRememberLogin })
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

          <form onSubmit={handleSubmit} className="login-form" autoComplete="on">
            <div className="login-field">
              <label htmlFor="login-input">用户名 / 邮箱</label>
              <input
                id="login-input"
                type="text"
                name="username"
                placeholder="请输入用户名或邮箱"
                value={login}
                onChange={handleLoginChange}
                onFocus={() => setIsTyping(true)}
                onBlur={() => setIsTyping(false)}
                autoComplete="username"
                required
              />
            </div>

            <div className="login-field">
              <label htmlFor="login-password">
                密码
                {isRememberLogin && (
                  <span className="login-remember-hint">（已记住登录）</span>
                )}
              </label>
              <div className="login-password-wrap">
                <input
                  id="login-password"
                  type={showPassword ? 'text' : 'password'}
                  name="password"
                  placeholder={isRememberLogin ? '已记住登录，直接点击登录' : '请输入密码'}
                  value={password}
                  onChange={(e) => {
                    setPassword(e.target.value || '')
                    // 如果用户手动修改了密码，标记为非 remember 登录
                    if (isRememberLogin) {
                      setIsRememberLogin(false)
                    }
                  }}
                  autoComplete={isRememberLogin ? 'off' : 'current-password'}
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
