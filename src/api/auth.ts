/**
 * 认证服务 HTTP 封装：滑块挑战、RSA 公钥、密码登录（口令须加密后与后端对齐）。
 */

import http from './http'
import { isPeachSuccess } from '../utils/apiResult'
import { encryptLoginPassword } from '../utils/rsaLogin'
import type { ApiEnvelope, RsaPublicKeyDTO, SliderChallenge, TokenDTO } from '../models/auth'

export async function fetchSliderChallenge(): Promise<SliderChallenge> {
  const { data: body } = await http.post<ApiEnvelope<SliderChallenge>>('/auth/login/slider/challenge')
  if (!isPeachSuccess(body.code) || body.data == null) {
    throw new Error(body.msg || '获取滑块验证失败')
  }
  return body.data
}

/** 获取登录口令 RSA 公钥（须先于密码登录调用） */
export async function fetchLoginPasswordPublicKey(): Promise<RsaPublicKeyDTO> {
  const { data: body } = await http.get<ApiEnvelope<RsaPublicKeyDTO>>('/auth/login/password/public-key')
  if (!isPeachSuccess(body.code) || body.data == null) {
    throw new Error(body.msg || '获取加密公钥失败')
  }
  return body.data
}

export interface PasswordLoginBody {
  username: string
  /** 明文口令；将在提交前用公钥加密为 Base64 密文 */
  password: string
  captchaId: string
  sliderOffset: number
}

export async function loginWithPassword(payload: PasswordLoginBody): Promise<TokenDTO> {
  const rsa = await fetchLoginPasswordPublicKey()
  const passwordCipher = encryptLoginPassword(rsa.publicKeyPem, payload.password)
  const { data: body } = await http.post<ApiEnvelope<TokenDTO>>('/auth/login/password', {
    username: payload.username,
    password: passwordCipher,
    captchaId: payload.captchaId,
    sliderOffset: payload.sliderOffset,
  })
  if (!isPeachSuccess(body.code) || body.data == null) {
    throw new Error(body.msg || '登录失败')
  }
  return body.data
}
