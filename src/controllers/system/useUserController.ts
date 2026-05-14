/**
 * 用户管理：详情 / 新增 / 编辑共用一个对话框；分页、有效标记、系统用户重置密码。
 * 作者：leiyangjun
 */

import { computed, ref, watch, type ComputedRef } from 'vue'
import { ElMessage, ElMessageBox, type FormRules } from 'element-plus'
import {
  fetchUserById,
  fetchUserPage,
  hardDeleteUser,
  resetUserPassword,
  saveUser,
  toggleUserValid,
} from '../../api/user'
import { isSessionExpiredError } from '../../utils/sessionExpired'
import type { UserMgmtVO } from '../../models/userMgmt'

const SYSTEM = 'system'

export type UserDialogMode = 'view' | 'create' | 'edit'

export function useUserController() {
  const keyword = ref('')
  const page = ref(1)
  const pageSize = ref(10)
  const total = ref(0)
  const loading = ref(false)
  const tableRows = ref<UserMgmtVO[]>([])

  const dialogVisible = ref(false)
  const dialogMode = ref<UserDialogMode>('view')
  const submitLoading = ref(false)
  const userForm = ref<UserMgmtVO>({})

  const resetPwdVisible = ref(false)
  const resetPwdTarget = ref<UserMgmtVO | null>(null)
  const resetPwdForm = ref({ newPassword: '', confirmPassword: '' })
  const resetPwdLoading = ref(false)

  const formReadonly = computed(() => dialogMode.value === 'view')

  const dialogTitle = computed(() => {
    if (dialogMode.value === 'create') {
      return '新增系统用户'
    }
    if (dialogMode.value === 'edit') {
      return '编辑用户'
    }
    return '用户详情'
  })

  const loadList = async () => {
    loading.value = true
    try {
      const data = await fetchUserPage({
        pageNum: page.value,
        pageSize: pageSize.value,
        searchValue: keyword.value.trim() || undefined,
      })
      tableRows.value = data.list ?? []
      total.value = data.total ?? 0
    } catch (e) {
      if (!isSessionExpiredError(e)) {
        ElMessage.error(e instanceof Error ? e.message : '加载用户列表失败')
      }
    } finally {
      loading.value = false
    }
  }

  watch(
    [page, pageSize],
    () => {
      void loadList()
    },
    { immediate: true },
  )

  const onSearch = () => {
    page.value = 1
    void loadList()
  }

  const onReset = () => {
    keyword.value = ''
    page.value = 1
    void loadList()
  }

  const loadUserIntoDialog = async (id: string | number, mode: UserDialogMode) => {
    dialogMode.value = mode
    dialogVisible.value = true
    submitLoading.value = true
    try {
      userForm.value = { ...(await fetchUserById(id)), plainPassword: '' }
    } catch (e) {
      if (!isSessionExpiredError(e)) {
        ElMessage.error(e instanceof Error ? e.message : '加载用户失败')
      }
      dialogVisible.value = false
    } finally {
      submitLoading.value = false
    }
  }

  const openDetail = (row: UserMgmtVO) => {
    if (row.id == null) {
      return
    }
    void loadUserIntoDialog(row.id, 'view')
  }

  const isSystemUser = (row: UserMgmtVO) => row.userType === SYSTEM

  const onToggleValid = async (row: UserMgmtVO, val: boolean) => {
    if (row.id == null) {
      return
    }
    const prev = row.valid === 1
    if (val === false) {
      try {
        await ElMessageBox.confirm('请确认是否将该用户改为无效用户？', '提示', {
          type: 'warning',
          confirmButtonText: '确定',
          cancelButtonText: '取消',
        })
      } catch {
        return
      }
    }
    try {
      const next = await toggleUserValid(row.id)
      row.valid = next
      ElMessage.success(next === 1 ? '已设为有效' : '已设为无效')
    } catch (e) {
      row.valid = prev ? 1 : 0
      if (!isSessionExpiredError(e)) {
        ElMessage.error(e instanceof Error ? e.message : '更新状态失败')
      }
    }
  }

  const emptyForm = (): UserMgmtVO => ({
    username: '',
    nickname: '',
    mobile: '',
    email: '',
    realName: '',
    remark: '',
    plainPassword: '',
    valid: 1,
  })

  const openCreate = () => {
    dialogMode.value = 'create'
    userForm.value = emptyForm()
    dialogVisible.value = true
  }

  const openEdit = (row: UserMgmtVO) => {
    if (!isSystemUser(row) || row.id == null) {
      ElMessage.warning('仅系统用户支持资料修改')
      return
    }
    void loadUserIntoDialog(row.id, 'edit')
  }

  const enterEditFromView = () => {
    if (userForm.value.userType !== SYSTEM) {
      return
    }
    dialogMode.value = 'edit'
  }

  const rules: ComputedRef<FormRules> = computed(() => {
    const base: FormRules = {
      username: [{ required: true, message: '请输入用户名', trigger: 'blur' }],
      nickname: [{ required: true, message: '请输入昵称', trigger: 'blur' }],
      mobile: [{ required: true, message: '请输入手机号', trigger: 'blur' }],
    }
    if (dialogMode.value === 'create') {
      return {
        ...base,
        plainPassword: [
          { required: true, message: '请输入密码', trigger: 'blur' },
          { min: 6, message: '密码至少 6 位', trigger: 'blur' },
        ],
      }
    }
    return base
  })

  const onSubmit = async () => {
    if (dialogMode.value === 'view') {
      return
    }
    const f = userForm.value
    if (dialogMode.value === 'create') {
      if (!f.plainPassword || f.plainPassword.length < 6) {
        ElMessage.warning('密码至少 6 位')
        return
      }
    } else if (f.plainPassword && f.plainPassword.length < 6) {
      ElMessage.warning('密码至少 6 位')
      return
    }

    submitLoading.value = true
    try {
      const payload: UserMgmtVO =
        dialogMode.value === 'create'
          ? {
              username: f.username?.trim(),
              nickname: f.nickname,
              mobile: f.mobile,
              email: f.email,
              realName: f.realName,
              remark: f.remark,
              valid: f.valid ?? 1,
              plainPassword: f.plainPassword,
            }
          : {
              id: f.id,
              username: f.username?.trim(),
              nickname: f.nickname,
              mobile: f.mobile,
              email: f.email,
              realName: f.realName,
              remark: f.remark,
              plainPassword: f.plainPassword?.trim() ? f.plainPassword : undefined,
            }
      await saveUser(payload)
      ElMessage.success(dialogMode.value === 'create' ? '新增成功' : '保存成功')
      /** 仅成功路径（HTTP 200 + 业务成功码，见 saveUser）关闭弹窗并刷新；异常在 catch 中不关闭 */
      dialogVisible.value = false
      void loadList()
    } catch (e) {
      if (!isSessionExpiredError(e)) {
        ElMessage.error(e instanceof Error ? e.message : '保存失败')
      }
    } finally {
      submitLoading.value = false
    }
  }

  const openResetPassword = (row: UserMgmtVO) => {
    if (!isSystemUser(row) || row.id == null) {
      ElMessage.warning('仅系统用户支持重置密码')
      return
    }
    resetPwdTarget.value = row
    resetPwdForm.value = { newPassword: '', confirmPassword: '' }
    resetPwdVisible.value = true
  }

  /** 系统用户物理删除：确认后调接口，成功则刷新列表；HTTP/业务错误不关列表状态 */
  const confirmHardDelete = async (row: UserMgmtVO) => {
    if (!isSystemUser(row) || row.id == null) {
      return
    }
    const name = row.username ?? row.nickname ?? String(row.id)
    try {
      await ElMessageBox.confirm(`确定物理删除系统用户「${name}」？该操作不可恢复。`, '物理删除', {
        type: 'warning',
        confirmButtonText: '确定删除',
        cancelButtonText: '取消',
      })
    } catch {
      return
    }
    try {
      await hardDeleteUser(row.id)
      ElMessage.success('已物理删除')
      void loadList()
    } catch (e) {
      if (!isSessionExpiredError(e)) {
        ElMessage.error(e instanceof Error ? e.message : '物理删除失败')
      }
    }
  }

  const submitResetPassword = async () => {
    const t = resetPwdTarget.value
    if (t?.id == null) {
      return
    }
    if (!resetPwdForm.value.newPassword || resetPwdForm.value.newPassword.length < 6) {
      ElMessage.warning('新密码至少 6 位')
      return
    }
    if (resetPwdForm.value.newPassword !== resetPwdForm.value.confirmPassword) {
      ElMessage.error('两次输入的密码不一致')
      return
    }
    resetPwdLoading.value = true
    try {
      await resetUserPassword({ id: t.id, newPassword: resetPwdForm.value.newPassword })
      ElMessage.success('密码已重置')
      resetPwdVisible.value = false
    } catch (e) {
      if (!isSessionExpiredError(e)) {
        ElMessage.error(e instanceof Error ? e.message : '重置失败')
      }
    } finally {
      resetPwdLoading.value = false
    }
  }

  return {
    keyword,
    page,
    pageSize,
    total,
    loading,
    tableRows,
    dialogVisible,
    dialogMode,
    dialogTitle,
    formReadonly,
    submitLoading,
    userForm,
    rules,
    resetPwdVisible,
    resetPwdForm,
    resetPwdLoading,
    onSearch,
    onReset,
    openDetail,
    openCreate,
    openEdit,
    enterEditFromView,
    onSubmit,
    onToggleValid,
    isSystemUser,
    openResetPassword,
    confirmHardDelete,
    submitResetPassword,
  }
}
