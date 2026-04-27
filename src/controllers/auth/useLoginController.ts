/**
 * 登录页控制器（Controller）：处理登录表单行为与跳转。
 * 作者：leiyangjun
 */

import { reactive, ref } from 'vue'
import { useRouter } from 'vue-router'
import { ElMessage } from 'element-plus'
import { useAuthStore } from '../../stores/auth'
import type { LoginFormModel } from '../../models/auth'

export function useLoginController() {
  const router = useRouter()
  const authStore = useAuthStore()
  const loading = ref(false)

  const form = reactive<LoginFormModel>({
    username: 'admin',
    password: '123456',
    remember: true,
  })

  const rules = {
    username: [{ required: true, message: '请输入用户名', trigger: 'blur' }],
    password: [{ required: true, message: '请输入密码', trigger: 'blur' }],
  }

  const handleLogin = async () => {
    if (!form.username || !form.password) {
      ElMessage.warning('请填写用户名和密码')
      return
    }
    loading.value = true
    try {
      await authStore.login({ username: form.username, password: form.password })
      ElMessage.success('登录成功')
      router.replace('/')
    }
    catch (error) {
      ElMessage.error((error as Error).message || '登录失败')
    }
    finally {
      loading.value = false
    }
  }

  return {
    loading,
    form,
    rules,
    handleLogin,
  }
}
