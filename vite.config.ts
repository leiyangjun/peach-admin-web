import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'

/** 本地网关（与 peach-gateway server.port、VITE_GATEWAY_ORIGIN 一致） */
const GATEWAY_TARGET = 'http://127.0.0.1:8090'
/** 认证等服务在网关后的路径前缀（与注册中心 serviceId 一致） */
const AUTH_SERVICE_PREFIX = '/peach-auth-service'
/** 基础业务服务（菜单/用户/角色等），网关路由 /peach-common-service/** */
const COMMON_SERVICE_PREFIX = '/peach-common-service'
/** 定时任务服务，网关路由 /peach-job-service/** */
const JOB_SERVICE_PREFIX = '/peach-job-service'

// https://vite.dev/config/
export default defineConfig({
  plugins: [vue()],
  resolve: {
    // no-vue3-cron 自带 element-plus，须与项目共用同一实例
    dedupe: ['vue', 'element-plus'],
  },
  optimizeDeps: {
    include: ['no-vue3-cron'],
  },
  server: {
    // axios 已直连 VITE_GATEWAY_ORIGIN（8090）；下列代理仅作手工 fetch / 旧链接兜底，业务代码勿依赖 /api* 相对路径
    proxy: {
      '/api-job': {
        target: GATEWAY_TARGET,
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/api-job/, JOB_SERVICE_PREFIX),
      },
      '^/peach-[^/]+(/.*)?$': {
        target: GATEWAY_TARGET,
        changeOrigin: true,
      },
      '/api-common': {
        target: GATEWAY_TARGET,
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/api-common/, COMMON_SERVICE_PREFIX),
      },
      '/api': {
        target: GATEWAY_TARGET,
        changeOrigin: true,
        rewrite: (path) => {
          if (path.startsWith('/api-common')) {
            return path.replace(/^\/api-common/, COMMON_SERVICE_PREFIX)
          }
          return path.replace(/^\/api/, AUTH_SERVICE_PREFIX)
        },
      },
    },
  },
})
