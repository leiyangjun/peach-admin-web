/**
 * 认证领域模型定义（Model）。
 * 作者：leiyangjun
 */

export interface UserInfo {
  username: string
  nickname: string
}

export interface LoginPayload {
  username: string
  password: string
}

export interface LoginFormModel extends LoginPayload {
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
