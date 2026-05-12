/**
 * 用户管理（与 peach-common-service UserVO 对齐的展示/提交模型）。
 */

/** 列表与详情（口令字段不落库，仅 plainPassword 用于新增/改密） */
export interface UserMgmtVO {
  id?: string | number
  userType?: string
  username?: string
  nickname?: string
  realName?: string
  mobile?: string
  email?: string
  avatar?: string
  gender?: number
  certType?: string
  certNo?: string
  remark?: string
  valid?: number
  plainPassword?: string
  createTime?: string
  editTime?: string
}

export interface UserPageQuery {
  pageNum: number
  pageSize: number
  searchValue?: string
  userType?: string
  valid?: number | ''
  sortName?: string
  sortType?: string
}

/** 与后端 {@code ResetPwdDTO} 对齐 */
export interface ResetPwdDTO {
  id: string | number
  newPassword: string
}
