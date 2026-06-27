import { useState, useEffect, useRef } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { Eye, EyeOff, Mail, Sparkles, RefreshCw } from 'lucide-react'
import AnimatedCharacters from '../components/login-animation/AnimatedCharacters'
import '../components/login-animation/login.css'
import { captchaService } from '../services/captchaService'
import request from '../services/request'

/**
 * 注册页面
 */
export default function Register() {
  const navigate = useNavigate()
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    password: '',
    password_confirmation: '',
    captcha_code: '',
  })
  const [captcha, setCaptcha] = useState({
    image: '',
    token: '',
  })
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)
  const [loading, setLoading] = useState(false)
  const [captchaLoading, setCaptchaLoading] = useState(false)
  const [errorMsg, setErrorMsg] = useState('')
  const [isTyping, setIsTyping] = useState(false)
  const hasFetchedCaptcha = useRef(false)

  // 获取验证码
  const fetchCaptcha = async () => {
    setCaptchaLoading(true)
    try {
      const data = await captchaService.getCaptcha()
      setCaptcha({
        image: data.captcha_image,
        token: data.captcha_token,
      })
    } catch (error) {
      console.error('获取验证码失败:', error)
      setErrorMsg('获取验证码失败，请刷新页面重试')
    } finally {
      setCaptchaLoading(false)
    }
  }

  // 页面加载时获取验证码（StrictMode 下只请求一次）
  useEffect(() => {
    if (!hasFetchedCaptcha.current) {
      hasFetchedCaptcha.current = true
      fetchCaptcha()
    }
  }, [])

  // 处理输入变化
  const handleChange = (e) => {
    const { name, value } = e.target
    
    // 用户名只允许字母、数字、下划线、短横线
    if (name === 'name') {
      const filtered = value.replace(/[^a-zA-Z0-9_-]/g, '')
      setFormData(prev => ({ ...prev, [name]: filtered }))
    } else {
      setFormData(prev => ({ ...prev, [name]: value }))
    }
    setErrorMsg('')
  }

  // 处理提交
  const handleSubmit = async (e) => {
    e.preventDefault()
    setErrorMsg('')

    // 前端验证
    if (formData.password !== formData.password_confirmation) {
      setErrorMsg('两次输入的密码不一致')
      return
    }

    if (formData.password.length < 8) {
      setErrorMsg('密码至少需要8个字符')
      return
    }

    if (formData.captcha_code.length !== 4) {
      setErrorMsg('请输入4位验证码')
      return
    }

    setLoading(true)

    try {
      const result = await request.post('/auth/register', {
        ...formData,
        captcha_token: captcha.token,
      })

      if (result.success) {
        // 注册成功，跳转到登录页
        navigate('/login', { 
          replace: true,
          state: { message: '注册成功，请登录' }
        })
      } else {
        setErrorMsg(result.message || '注册失败')
        // 如果验证码错误，刷新验证码
        if (result.error_type === 'captcha_invalid') {
          fetchCaptcha()
          setFormData(prev => ({ ...prev, captcha_code: '' }))
        }
      }
    } catch (error) {
      // 直接使用error对象的信息（拦截器已经处理过）
      let message = error.message || '注册失败，请稍后重试'
      
      // 如果有详细的验证错误，优先显示具体的错误信息
      if (error.errors && typeof error.errors === 'object') {
        const errorKeys = Object.keys(error.errors)
        if (errorKeys.length > 0) {
          const firstKey = errorKeys[0]
          const firstError = error.errors[firstKey]
          if (Array.isArray(firstError) && firstError.length > 0) {
            message = firstError[0]
          }
        }
      }
      
      setErrorMsg(message)
      
      // 注册失败时，刷新验证码
      fetchCaptcha()
      setFormData(prev => ({ ...prev, captcha_code: '' }))
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="login-page">
      {/* 左侧 — 动画区域 */}
      <div className="login-left" style={{ background: 'linear-gradient(135deg, #00d4ff, #00d4ff, #00b8d4)' }}>
        <div className="login-brand">
          <div className="login-brand-icon"><Sparkles size={16} /></div>
          <span>Agent Monitor</span>
        </div>
        <div className="login-characters-area">
          <AnimatedCharacters
            isTyping={isTyping}
            hasSecret={!!formData.password}
            secretVisible={showPassword}
          />
        </div>
        <div className="login-footer-links">
          <a href="#">Privacy Policy</a>
          <a href="#">Terms of Service</a>
          <a href="#">Contact</a>
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
            <span>Agent Monitor</span>
          </div>

          <div className="login-header">
            <h1>创建账号</h1>
            <p>注册一个新账号开始使用系统</p>
          </div>

          {errorMsg && (
            <div className="login-error" style={{ 
              color: '#ef4444', 
              background: 'rgba(239, 68, 68, 0.1)', 
              padding: '10px 14px', 
              borderRadius: '8px', 
              marginBottom: '16px',
              fontSize: '14px'
            }}>
              {errorMsg}
            </div>
          )}

          <form onSubmit={handleSubmit} className="login-form">
            {/* 用户名 */}
            <div className="login-field">
              <label htmlFor="register-name">用户名</label>
              <input
                id="register-name"
                name="name"
                type="text"
                placeholder="字母、数字、下划线（如 user_01）"
                value={formData.name}
                onChange={handleChange}
                onFocus={() => setIsTyping(true)}
                onBlur={() => setIsTyping(false)}
                maxLength={50}
                pattern="[a-zA-Z0-9_-]+"
                title="用户名只能包含字母、数字、下划线和短横线"
                required
              />
            </div>

            {/* 邮箱 */}
            <div className="login-field">
              <label htmlFor="register-email">邮箱</label>
              <input
                id="register-email"
                name="email"
                type="email"
                placeholder="请输入邮箱地址"
                value={formData.email}
                onChange={handleChange}
                onFocus={() => setIsTyping(true)}
                onBlur={() => setIsTyping(false)}
                required
              />
            </div>

            {/* 密码 */}
            <div className="login-field">
              <label htmlFor="register-password">密码</label>
              <div className="login-password-wrap">
                <input
                  id="register-password"
                  name="password"
                  type={showPassword ? 'text' : 'password'}
                  placeholder="至少8位密码"
                  value={formData.password}
                  onChange={handleChange}
                  onFocus={() => setIsTyping(true)}
                  onBlur={() => setIsTyping(false)}
                  minLength={8}
                  required
                />
                <button
                  type="button"
                  className="login-eye-btn"
                  onClick={() => setShowPassword(!showPassword)}
                >
                  {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
            </div>

            {/* 确认密码 */}
            <div className="login-field">
              <label htmlFor="register-confirm-password">确认密码</label>
              <div className="login-password-wrap">
                <input
                  id="register-confirm-password"
                  name="password_confirmation"
                  type={showConfirmPassword ? 'text' : 'password'}
                  placeholder="请再次输入密码"
                  value={formData.password_confirmation}
                  onChange={handleChange}
                  onFocus={() => setIsTyping(true)}
                  onBlur={() => setIsTyping(false)}
                  minLength={8}
                  required
                />
                <button
                  type="button"
                  className="login-eye-btn"
                  onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                >
                  {showConfirmPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
            </div>

            {/* 验证码 */}
            <div className="login-field">
              <label htmlFor="register-captcha">验证码</label>
              <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
                <input
                  id="register-captcha"
                  name="captcha_code"
                  type="text"
                  placeholder="请输入4位验证码"
                  value={formData.captcha_code}
                  onChange={handleChange}
                  onFocus={() => setIsTyping(true)}
                  onBlur={() => setIsTyping(false)}
                  maxLength={4}
                  style={{ flex: 1 }}
                  required
                />
                <div 
                  onClick={fetchCaptcha}
                  style={{ 
                    cursor: 'pointer', 
                    border: '1px solid rgba(255,255,255,0.1)', 
                    borderRadius: '8px',
                    padding: '4px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    minWidth: '150px',
                    height: '44px',
                    background: 'rgba(255,255,255,0.05)'
                  }}
                >
                  {captchaLoading ? (
                    <RefreshCw size={20} className="animate-spin" />
                  ) : captcha.image ? (
                    <img 
                      src={captcha.image} 
                      alt="验证码" 
                      style={{ height: '42px', maxWidth: '140px' }}
                    />
                  ) : (
                    <span style={{ fontSize: '12px', color: '#9ca3af' }}>点击获取</span>
                  )}
                </div>
                <button
                  type="button"
                  onClick={fetchCaptcha}
                  disabled={captchaLoading}
                  style={{
                    background: 'none',
                    border: 'none',
                    cursor: 'pointer',
                    color: '#00d4ff',
                    padding: '4px'
                  }}
                  title="刷新验证码"
                >
                  <RefreshCw size={18} className={captchaLoading ? 'animate-spin' : ''} />
                </button>
              </div>
            </div>

            {/* 提交按钮 */}
            <button
              type="submit"
              className="login-btn-primary"
              disabled={loading}
              style={{ background: loading ? '#94a3b8' : '#00d4ff' }}
            >
              {loading ? '注册中...' : '注册'}
            </button>
          </form>

          <div className="login-bottom-link" style={{ marginTop: '20px', textAlign: 'center' }}>
            <span style={{ color: '#9ca3af' }}>已有账号？</span>
            <Link to="/login" style={{ color: '#00d4ff', marginLeft: '8px' }}>立即登录</Link>
          </div>
        </div>
      </div>
    </div>
  )
}
