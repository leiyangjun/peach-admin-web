import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'

/** 本地网关（与 peach-gateway server.port 一致）；开发环境一律经此前缀访问下游服务 */
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
		proxy: {
			// 浏览器：`/api-job{ADMIN}/...` → 网关：`/peach-job-service{ADMIN}/...`（须写在 `/api` 之前）
			'/api-job': {
				target: GATEWAY_TARGET,
				changeOrigin: true,
				rewrite: (path) => path.replace(/^\/api-job/, JOB_SERVICE_PREFIX),
			},
			// 浏览器：`/{serviceId}{ADMIN}/apis/...`（如 `/peach-common-service/admin/apis/type/admin`）→ 网关同路径，不剥离服务前缀
			'^/peach-[a-z0-9-]+': {
				target: GATEWAY_TARGET,
				changeOrigin: true,
			},
			// 必须写在 /api 之前：否则 /^\/api/ 会命中「/api-common」前缀，被错写成 /peach-auth-service-common/…（404）
			// 浏览器：`/api-common{ADMIN}/...`（ADMIN 默认 `/admin`，见 src/config/adminApiPrefix.ts）→ 网关：`/peach-common-service{ADMIN}/...`
			'/api-common': {
				target: GATEWAY_TARGET,
				changeOrigin: true,
				rewrite: (path) => path.replace(/^\/api-common/, COMMON_SERVICE_PREFIX),
			},
			// 浏览器：`/api{ADMIN}/...` → 网关：`/peach-auth-service{ADMIN}/...`
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
