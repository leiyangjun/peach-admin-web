import { createApp } from 'vue'
import { createPinia } from 'pinia'
import ElementPlus from 'element-plus'
import { ElMessage } from 'element-plus'
import 'element-plus/dist/index.css'

import App from './App.vue'
import router from './router'
import { useAuthStore } from './stores/auth'
import { registerSessionExpiredHandler } from './utils/sessionExpired'
import './styles/global.css'

const app = createApp(App)
const pinia = createPinia()
app.use(pinia)
app.use(router)
app.use(ElementPlus)

/** 401 时登出并回登录页（须在 pinia / router 挂载后注册） */
registerSessionExpiredHandler((msg) => {
  const auth = useAuthStore()
  auth.logout()
  ElMessage.warning(msg.trim() || '登录已过期，请重新登录')
  const current = router.currentRoute.value
  if (current.path !== '/login') {
    void router.replace({
      path: '/login',
      query: { redirect: current.fullPath },
    })
  }
})

app.mount('#app')
