/**
 * 侧栏与动态子路由的写死菜单树（联调阶段使用）。
 * 登录后按当前用户拉菜单尚未接入时，仍保证首页、系统页与演示项可点可测。
 */

import type { MenuMgmtVO } from '../models/menuMgmt'

/** 嵌入/新窗口类菜单占位组件（动态注册逻辑会解析 component_path，此处仅占位） */
const PLACEHOLDER_VIEW = 'views/dashboard/HomeView.vue'

export const STATIC_SIDEBAR_MENU_TREE: MenuMgmtVO[] = [
  {
    id: 'st-1',
    menuCode: 'DASHBOARD',
    menuName: '首页',
    menuType: 'MENU',
    routePath: '/dashboard',
    componentPath: 'views/dashboard/HomeView.vue',
    icon: 'House',
    orderNo: 1,
    valid: 1,
  },
  {
    id: 'st-2',
    menuCode: 'SYS_USER',
    menuName: '用户管理',
    menuType: 'MENU',
    routePath: '/system/user',
    componentPath: 'views/system/UserView.vue',
    icon: 'User',
    orderNo: 10,
    valid: 1,
  },
  {
    id: 'st-3',
    menuCode: 'SYS_ROLE',
    menuName: '角色管理',
    menuType: 'MENU',
    routePath: '/system/role',
    componentPath: 'views/system/RoleView.vue',
    icon: 'Lock',
    orderNo: 20,
    valid: 1,
  },
  {
    id: 'st-4',
    menuCode: 'SYS_MENU',
    menuName: '菜单管理',
    menuType: 'MENU',
    routePath: '/system/menu',
    componentPath: 'views/system/MenuView.vue',
    icon: 'Menu',
    orderNo: 30,
    valid: 1,
  },
  {
    id: 'st-demo-swagger',
    menuCode: 'DEMO_SWAGGER',
    menuName: '演示Swagger',
    menuType: 'MENU',
    routePath: 'frame://http://127.0.0.1:8090/swagger-ui.html',
    componentPath: PLACEHOLDER_VIEW,
    icon: 'Document',
    orderNo: 40,
    valid: 1,
  },
  {
    id: 'st-demo-ext',
    menuCode: 'DEMO_OPEN_EXT',
    menuName: '新窗口外站',
    menuType: 'MENU',
    routePath: 'openwindow://http://127.0.0.1:8090/index.html',
    componentPath: PLACEHOLDER_VIEW,
    icon: 'Link',
    orderNo: 41,
    valid: 1,
  },
  {
    id: 'st-demo-int',
    menuCode: 'DEMO_OPEN_INT',
    menuName: '新窗口站内',
    menuType: 'MENU',
    routePath: 'openwindow://system/menu',
    componentPath: PLACEHOLDER_VIEW,
    icon: 'Share',
    orderNo: 42,
    valid: 1,
  },
]
