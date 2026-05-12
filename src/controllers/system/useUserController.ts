/**
 * 用户管理：详情 / 新增 / 编辑共用一个对话框；分页、有效标记、系统用户重置密码。
 * 作者：leiyangjun
 */

import { computed, ref, watch } from 'vue'
import { ElMessage, ElMessageBox, type FormRules } from 'element-plus'
import { fetchUserById, fetchUserPage, resetUserPassword, saveUser, toggleUserValid } from '../../api/user'
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

  const rules: FormRules = {
    username: [{ required: true, message: '请输入登录账号', trigger: 'blur' }],
    nickname: [{ required: true, message: '请输入昵称', trigger: 'blur' }],
    mobile: [{ required: true, message: '请输入手机号', trigger: 'blur' }],
  }

  const onSubmit = async () => {
    if (dialogMode.value === 'view') {
      return
    }
    const f = userForm.value
    if (dialogMode.value === 'create') {
      if (!f.plainPassword || f.plainPassword.length < 6) {
        ElMessage.warning('初始口令至少 6 位')
        return
      }
    } else if (f.plainPassword && f.plainPassword.length < 6) {
      ElMessage.warning('新口令至少 6 位')
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
      // 后端仅返回 id，列表会整体刷新
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

  const submitResetPassword = async () => {
    const t = resetPwdTarget.value
    if (t?.id == null) {
      return
    }
    if (!resetPwdForm.value.newPassword || resetPwdForm.value.newPassword.length < 6) {
      ElMessage.warning('新口令至少 6 位')
      return
    }
    if (resetPwdForm.value.newPassword !== resetPwdForm.value.confirmPassword) {
      ElMessage.error('两次输入的口令不一致')
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
    submitResetPassword,
  }
}
