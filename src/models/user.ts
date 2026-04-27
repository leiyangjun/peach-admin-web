/**
 * 用户管理领域模型定义（Model）。
 * 作者：leiyangjun
 */

export interface UserRow {
  id: number
  username: string
  nickname: string
  phone: string
  email: string
  role: string
  status: boolean
  remark?: string
}

export interface UserFormModel {
  username: string
  nickname: string
  phone: string
  email: string
  role: string
  status: boolean
  password: string
  confirmPassword: string
  remark: string
}
