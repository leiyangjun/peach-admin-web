/**
 * 用户管理控制器（Controller）：搜索、分页、增删改状态、弹窗与校验。
 * 作者：leiyangjun
 */

import { computed, reactive, ref } from 'vue'
import { ElMessage, ElMessageBox, type FormRules } from 'element-plus'
import type { UserFormModel, UserRow } from '../../models/user'

export function useUserController() {
  const keyword = ref('')
  const page = ref(1)
  const pageSize = ref(8)

  const allUsers = ref<UserRow[]>([
    { id: 1, username: 'admin', nickname: '系统管理员', phone: '13800000001', email: 'admin@peach.com', role: '超级管理员', status: true },
    { id: 2, username: 'ops01', nickname: '运维小李', phone: '13800000002', email: 'ops01@peach.com', role: '运维', status: true },
    { id: 3, username: 'dev01', nickname: '开发小王', phone: '13800000003', email: 'dev01@peach.com', role: '开发', status: false },
    { id: 4, username: 'qa01', nickname: '测试小周', phone: '13800000004', email: 'qa01@peach.com', role: '测试', status: true },
    { id: 5, username: 'guest01', nickname: '访客A', phone: '13800000005', email: 'guest01@peach.com', role: '访客', status: true },
    { id: 6, username: 'guest02', nickname: '访客B', phone: '13800000006', email: 'guest02@peach.com', role: '访客', status: false },
    { id: 7, username: 'product', nickname: '产品经理', phone: '13800000007', email: 'pm@peach.com', role: '产品', status: true },
    { id: 8, username: 'finance', nickname: '财务人员', phone: '13800000008', email: 'finance@peach.com', role: '财务', status: true },
    { id: 9, username: 'hr001', nickname: '人事专员', phone: '13800000009', email: 'hr@peach.com', role: '人事', status: true },
    { id: 10, username: 'support', nickname: '客服小赵', phone: '13800000010', email: 'support@peach.com', role: '客服', status: false },
  ])

  const filteredUsers = computed(() => {
    const q = keyword.value.trim().toLowerCase()
    if (!q) {
      return allUsers.value
    }
    return allUsers.value.filter((u) =>
      [u.username, u.nickname, u.phone, u.email, u.role].some((v) => v.toLowerCase().includes(q)),
    )
  })

  const pagedUsers = computed(() => {
    const start = (page.value - 1) * pageSize.value
    return filteredUsers.value.slice(start, start + pageSize.value)
  })

  const total = computed(() => filteredUsers.value.length)

  const onSearch = () => {
    page.value = 1
  }

  const onReset = () => {
    keyword.value = ''
    page.value = 1
  }

  const onDelete = async (row: UserRow) => {
    try {
      await ElMessageBox.confirm(`确定删除用户「${row.nickname}」吗？`, '删除确认', {
        type: 'warning',
        confirmButtonText: '删除',
        cancelButtonText: '取消',
      })
      allUsers.value = allUsers.value.filter((u) => u.id !== row.id)
      ElMessage.success('删除成功')
      if (pagedUsers.value.length === 0 && page.value > 1) {
        page.value -= 1
      }
    }
    catch {
      // 用户取消删除时不提示
    }
  }

  const onToggleStatus = (row: UserRow) => {
    ElMessage.success(`${row.nickname} ${row.status ? '已启用' : '已停用'}`)
  }

  const dialogVisible = ref(false)
  const activeTab = ref('base')

  const userForm = reactive<UserFormModel>({
    username: '',
    nickname: '',
    phone: '',
    email: '',
    role: '访客',
    status: true,
    password: '',
    confirmPassword: '',
    remark: '',
  })

  const rules: FormRules = {
    username: [{ required: true, message: '请输入登录账号', trigger: 'blur' }],
    nickname: [{ required: true, message: '请输入用户昵称', trigger: 'blur' }],
    phone: [{ required: true, message: '请输入手机号', trigger: 'blur' }],
    role: [{ required: true, message: '请选择角色', trigger: 'change' }],
    password: [{ required: true, message: '请输入初始密码', trigger: 'blur' }],
  }

  const openCreate = () => {
    dialogVisible.value = true
    activeTab.value = 'base'
    Object.assign(userForm, {
      username: '',
      nickname: '',
      phone: '',
      email: '',
      role: '访客',
      status: true,
      password: '',
      confirmPassword: '',
      remark: '',
    })
  }

  const onSubmit = async () => {
    if (!userForm.username || !userForm.nickname || !userForm.phone || !userForm.role || !userForm.password) {
      ElMessage.warning('请完整填写必填项')
      return
    }
    if (userForm.confirmPassword && userForm.password !== userForm.confirmPassword) {
      ElMessage.error('两次密码不一致')
      return
    }
    const nextId = Math.max(...allUsers.value.map((u) => u.id), 0) + 1
    allUsers.value.unshift({
      id: nextId,
      username: userForm.username,
      nickname: userForm.nickname,
      phone: userForm.phone,
      email: userForm.email,
      role: userForm.role,
      status: userForm.status,
      remark: userForm.remark,
    })
    dialogVisible.value = false
    page.value = 1
    ElMessage.success('新增用户成功（演示数据）')
  }

  return {
    keyword,
    page,
    pageSize,
    pagedUsers,
    total,
    dialogVisible,
    activeTab,
    userForm,
    rules,
    onSearch,
    onReset,
    onDelete,
    onToggleStatus,
    openCreate,
    onSubmit,
  }
}
