/**
 * 认证领域模型定义（Model）。
 * 作者：leiyangjun
 */

/** 与后端 ApiResult 一致 */
export interface ApiEnvelope<T> {
  code: string
  msg: string
  data: T | null
}

/** 滑块挑战：与 SliderCaptchaChallengeResponse 对齐 */
export interface SliderChallenge {
  captchaId: string
  /** 历史字段；当前登录页使用 vue3-slide-verify 时由组件随机纵向位置，可不展示 */
  sliderY: number
  canvasWidth: number
  /** 拼图块长度参考，与 vue3-slide-verify 的 l 一致（默认 42） */
  blockWidth: number
  targetX: number
  expireAt: string
}

/** RSA 公钥：与后端 RsaPublicKeyDTO 对齐 */
export interface RsaPublicKeyDTO {
  algorithm: string
  padding: string
  keyBits: number
  publicKeyPem: string
}

/** 登录成功令牌：与后端 TokenDTO 对齐（当前无 refreshToken） */
export interface TokenDTO {
  tokenId: string
  tokenType: string
  accessToken: string
  expiresIn: number
}

export interface UserInfo {
  username: string
  nickname: string
}

export interface LoginPayload {
  username: string
  password: string
  captchaId: string
  sliderOffset: number
}

export interface LoginFormModel {
  username: string
  password: string
  remember: boolean
}

export interface ProfileFormModel {
  username: string
  nickname: string
  phone: string
  email: string
}

export interface PasswordFormModel {
  oldPassword: string
  newPassword: string
  confirmPassword: string
}
