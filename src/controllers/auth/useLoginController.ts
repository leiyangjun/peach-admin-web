/**

 * 登录页控制器（Controller）：滑块挑战、密码登录对接认证服务。

 * 作者：leiyangjun

 */



import { onMounted, reactive, ref } from 'vue'

import { useRouter } from 'vue-router'

import { ElMessage } from 'element-plus'

import { fetchSliderChallenge } from '../../api/auth'

import { useAuthStore } from '../../stores/auth'

import { getRequestErrorMessage } from '../../utils/httpError'

import type { LoginFormModel, SliderChallenge } from '../../models/auth'



export function useLoginController() {

  const router = useRouter()

  const authStore = useAuthStore()

  const loading = ref(false)

  const challengeLoading = ref(false)

  const challenge = ref<SliderChallenge | null>(null)

  /** 滑块水平偏移，对应后端 sliderOffset */

  const sliderOffset = ref(0)



  /** 默认演示：用户名 admin；密码以库中 BCrypt 为准（常见为 init 脚本 123456 或自行 UPDATE 为 admin） */

  const form = reactive<LoginFormModel>({

    username: 'admin',

    password: 'admin',

    remember: true,

  })



  const rules = {

    username: [{ required: true, message: '请输入用户名', trigger: 'blur' }],

    password: [{ required: true, message: '请输入密码', trigger: 'blur' }],

  }



  async function loadChallenge() {

    challengeLoading.value = true

    try {

      challenge.value = await fetchSliderChallenge()

      sliderOffset.value = 0

    }

    catch (error) {

      challenge.value = null

      ElMessage.error(getRequestErrorMessage(error) || '获取滑块验证失败')

    }

    finally {

      challengeLoading.value = false

    }

  }



  onMounted(() => {

    void loadChallenge()

  })



  const handleLogin = async () => {

    if (!form.username || !form.password) {

      ElMessage.warning('请填写用户名和密码')

      return

    }

    if (!challenge.value) {

      ElMessage.warning('验证加载中，请稍候或点击刷新')

      return

    }

    loading.value = true

    try {

      await authStore.login({

        username: form.username,

        password: form.password,

        captchaId: challenge.value.captchaId,

        sliderOffset: sliderOffset.value,

        remember: form.remember,

      })

      ElMessage.success('登录成功')

      router.replace('/')

    }

    catch (error) {

      const tip = getRequestErrorMessage(error)

      ElMessage.error({

        message: tip,

        duration: 5200,

        showClose: true,

      })

      await loadChallenge()

    }

    finally {

      loading.value = false

    }

  }



  return {

    loading,

    challengeLoading,

    challenge,

    sliderOffset,

    form,

    rules,

    handleLogin,

    loadChallenge,

  }

}

