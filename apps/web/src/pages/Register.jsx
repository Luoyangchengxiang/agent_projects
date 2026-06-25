import { useState, useRef } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { User, Mail, Lock, Eye, EyeOff, Sparkles } from 'lucide-react'
import useAuthStore from '../stores/authStore'
import '../components/login-animation/login.css'

/**
 * 注册页面
 * 与登录页风格一致，左侧动画 + 右侧表单
 */
export default function Register() {
  const navigate = useNavigate()
  const { register, isLoading } = useAuthStore()

  const [form, setForm] = useState({
    name: '',
    email: '',
    password: '',
    confirmPassword: '',
  })
  const [showPassword, setShowPassword] = useState(false)
  const [errors, setErrors] = useState({})
  const [submitError, setSubmitError] = useState('')

  const handleChange = (field) => (e) => {
    setForm((prev) => ({ ...prev, [field]: e.target.value }))
    // 清除该字段的错误
    if (errors[field]) {
      setErrors((prev) => ({ ...prev, [field]: '' }))
    }
  }

  const validate = () => {
    const newErrors = {}

    if (!form.name.trim()) {
      newErrors.name = '请输入用户名'
    } else if (form.name.length > 50) {
      newErrors.name = '用户名不能超过50个字符'
    }

    if (!form.email.trim()) {
      newErrors.email = '请输入邮箱'
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)) {
      newErrors.email = '邮箱格式不正确'
    }

    if (!form.password) {
      newErrors.password = '请输入密码'
    } else if (form.password.length < 8) {
      newErrors.password = '密码至少需要8个字符'
    }

    if (!form.confirmPassword) {
      newErrors.confirmPassword = '请确认密码'
    } else if (form.password !== form.confirmPassword) {
      newErrors.confirmPassword = '两次输入的密码不一致'
    }

    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setSubmitError('')

    if (!validate()) return

    try {
      await register({
        name: form.name,
        email: form.email,
        password: form.password,
      })
      navigate('/', { replace: true })
    } catch (error) {
      setSubmitError(error.message || '注册失败')
    }
  }

  return (
    <div className="login-page">
      {/* 左侧 — 动画区域 */}
      <div className="login-left" style={{ background: 'linear-gradient(135deg, #00d4ffcc, #00d4ff, #00d4ffee)' }}>
        <div className="login-brand">
          <div className="login-brand-icon"><Sparkles size={16} /></div>
          <span>Agent Monitor</span>
        </div>
        <div className="login-characters-area" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <div style={{ textAlign: 'center', color: 'white' }}>
            <h2 style={{ fontSize: 36, fontWeight: 700, marginBottom: 16 }}>加入我们</h2>
            <p style={{ fontSize: 18, opacity: 0.8 }}>创建账号，开始监控你的智能体</p>
          </div>
        </div>
        <div className="login-footer-links">
          <a href="#">Privacy Policy</a>
          <a href="#">Terms of Service</a>
          <a href="#">Contact</a>
        </div>
        <div className="login-deco-grid" />
        <div className="login-deco-circle login-deco-circle-1" />
        <div className="login-deco-circle login-deco-circle-2" />
      </div>

      {/* 右侧 — 注册表单 */}
      <div className="login-right">
        <div className="login-form-wrapper">
          <div className="login-mobile-brand">
            <div className="login-brand-icon"><Sparkles size={16} /></div>
            <span>Agent Monitor</span>
          </div>

          <div className="login-header">
            <h1>创建账号</h1>
            <p>填写以下信息完成注册</p>
          </div>

          <form onSubmit={handleSubmit} className="login-form">
            {/* 用户名 */}
            <div className="login-field">
              <label htmlFor="reg-name">用户名</label>
              <div style={{ position: 'relative' }}>
                <input
                  id="reg-name"
                  type="text"
                  placeholder="请输入用户名"
                  value={form.name}
                  onChange={handleChange('name')}
                  style={errors.name ? { borderColor: '#f87171' } : {}}
                />
                <User size={18} style={{ position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)', color: '#71717a' }} />
              </div>
              {errors.name && <span style={{ color: '#f87171', fontSize: 13 }}>{errors.name}</span>}
            </div>

            {/* 邮箱 */}
            <div className="login-field">
              <label htmlFor="reg-email">邮箱</label>
              <div style={{ position: 'relative' }}>
                <input
                  id="reg-email"
                  type="email"
                  placeholder="your@email.com"
                  value={form.email}
                  onChange={handleChange('email')}
                  style={errors.email ? { borderColor: '#f87171' } : {}}
                />
                <Mail size={18} style={{ position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)', color: '#71717a' }} />
              </div>
              {errors.email && <span style={{ color: '#f87171', fontSize: 13 }}>{errors.email}</span>}
            </div>

            {/* 密码 */}
            <div className="login-field">
              <label htmlFor="reg-password">密码</label>
              <div className="login-password-wrap">
                <input
                  id="reg-password"
                  type={showPassword ? 'text' : 'password'}
                  placeholder="至少8个字符"
                  value={form.password}
                  onChange={handleChange('password')}
                  style={errors.password ? { borderColor: '#f87171' } : {}}
                />
                <button
                  type="button"
                  className="login-eye-btn"
                  onClick={() => setShowPassword(!showPassword)}
                >
                  {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
                </button>
              </div>
              {errors.password && <span style={{ color: '#f87171', fontSize: 13 }}>{errors.password}</span>}
            </div>

            {/* 确认密码 */}
            <div className="login-field">
              <label htmlFor="reg-confirm">确认密码</label>
              <input
                id="reg-confirm"
                type={showPassword ? 'text' : 'password'}
                placeholder="再次输入密码"
                value={form.confirmPassword}
                onChange={handleChange('confirmPassword')}
                style={errors.confirmPassword ? { borderColor: '#f87171' } : {}}
              />
              {errors.confirmPassword && <span style={{ color: '#f87171', fontSize: 13 }}>{errors.confirmPassword}</span>}
            </div>

            {submitError && <div className="login-error-msg">{submitError}</div>}

            <button
              type="submit"
              className="login-btn-primary"
              disabled={isLoading}
              style={{ background: '#00d4ff' }}
            >
              {isLoading ? '注册中...' : '注册'}
            </button>
          </form>

          <p className="login-signup-link">
            已有账号？ <Link to="/login">去登录</Link>
          </p>
        </div>
      </div>
    </div>
  )
}
