import { useRef } from 'react'
import { useNavigate, useSearchParams, Link } from 'react-router-dom'
import LoginPage from '../components/login-animation/LoginPage'
import useAuthStore from '../stores/authStore'
import useMascotStore from '../stores/mascotStore'

/**
 * 登录页面容器
 */
export default function Login() {
  const loginRef = useRef(null)
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const { login } = useAuthStore()
  const { hasSelectedModel } = useMascotStore()

  async function handleLogin(payload) {
    loginRef.current?.setLoading(true)
    loginRef.current?.setError('')

    try {
      await login(payload.login, payload.password)

      // 登录成功，检查是否已选择看板娘
      const redirect = searchParams.get('redirect')
      if (!hasSelectedModel()) {
        // 首次登录，必须先选择看板娘
        navigate('/select-mascot', { replace: true })
      } else if (redirect) {
        navigate(redirect, { replace: true })
      } else {
        navigate('/', { replace: true })
      }
    } catch (error) {
      loginRef.current?.setError(error.message || '登录失败')
    } finally {
      loginRef.current?.setLoading(false)
    }
  }

  return (
    <LoginPage
      ref={loginRef}
      brandName="Agent Monitor"
      title="欢迎回来！"
      subtitle="请输入你的账号信息登录系统"
      primaryColor="#00d4ff"
      showGoogleLogin={false}
      emailPlaceholder="邮箱 或 admin（本地IP）"
      onSubmit={handleLogin}
      footerLink={
        <span>
          没有账号？<Link to="/register">注册新账号</Link>
        </span>
      }
    />
  )
}
