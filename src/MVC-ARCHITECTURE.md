## peach-admin-web MVC 分层说明

作者：leiyangjun

### 目录约定

- `models/`：领域模型（数据结构、类型定义）
- `controllers/`：页面控制器（业务行为、交互流程、数据组装）
- `views/`：页面视图（Vue SFC，只负责模板与样式展示）
- `stores/`：全局状态（Pinia）
- `router/`：路由与导航守卫
- `api/`：后端请求封装

### 当前示例

- 登录页：
  - `models/auth.ts`
  - `controllers/auth/useLoginController.ts`
  - `views/auth/LoginView.vue`
- 用户管理：
  - `models/user.ts`
  - `controllers/system/useUserController.ts`
  - `views/system/UserView.vue`
- 主布局：
  - `models/menu.ts`
  - `controllers/layout/useLayoutController.ts`
  - `layout/AdminLayout.vue`

> 目标：让 View 关注界面，Controller 关注流程，Model 关注数据，提升可维护性与可测试性。
