import request from './request'

/**
 * 验证码API服务
 */
export const captchaService = {
  /**
   * 获取验证码
   * @returns {Promise<{captcha_image: string, captcha_token: string, expire_minutes: number}>}
   */
  async getCaptcha() {
    const res = await request.get('/captcha')
    return res.data
  },
}
