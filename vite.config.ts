import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'

/** 本地网关（与 peach-gateway server.port 一致）；开发环境一律经此前缀访问下游服务 */
const GATEWAY_TARGET = 'http://127.0.0.1:8090'
/** 认证等服务在网关后的路径前缀（与注册中心 serviceId 一致） */
const AUTH_SERVICE_PREFIX = '/peach-auth-service'
/** 基础业务服务（菜单/用户/角色等），网关路由 /peach-common-service/** */
const COMMON_SERVICE_PREFIX = '/peach-common-service'

// https://vite.dev/config/
export default defineConfig({
	plugins: [vue()],
	server: {
		proxy: {
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
