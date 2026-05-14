<script setup lang="ts">
/**
 * 后台主框架视图（View）：负责布局展示，交互逻辑委托 Controller。
 * 作者：leiyangjun
 */

import { useLayoutController } from '../controllers/layout/useLayoutController'
import DynamicSidebarMenu from '../components/layout/DynamicSidebarMenu.vue'

const {
  authStore,
  appStore,
  menuTree,
  activeMenu,
  activeTab,
  breadcrumbs,
  collapseIcon,
  profileDialogVisible,
  passwordDialogVisible,
  profileForm,
  passwordForm,
  profileRules,
  passwordRules,
  handleUserAction,
  submitProfile,
  submitPassword,
  handleTabChange,
  handleTabRemove,
  handleMenuSelect,
} = useLayoutController()
</script>

<template>
  <div class="admin-layout" :class="{ collapsed: appStore.sidebarCollapsed }">
    <aside class="sidebar">
      <div class="brand">
        <div class="logo">P</div>
        <div v-show="!appStore.sidebarCollapsed" class="brand-text">
          <div class="title">Peach Admin</div>
          <div class="sub-title">管理后台</div>
        </div>
      </div>
      <div class="sidebar-menu-scroll">
        <el-menu
          :default-active="activeMenu"
          class="menu"
          background-color="transparent"
          text-color="rgba(255, 255, 255, 0.9)"
          active-text-color="#ffffff"
          :collapse="appStore.sidebarCollapsed"
          :router="false"
          unique-opened
          @select="handleMenuSelect"
        >
          <DynamicSidebarMenu v-if="menuTree.length" :nodes="menuTree" />
          <el-empty v-else class="menu-empty" description="加载菜单中…" :image-size="48" />
        </el-menu>
      </div>
    </aside>

    <section class="main-wrapper">
      <!-- 参考经典后台：首行面包屑 + 用户区；次行全宽「页面选项卡」便于多任务切换 -->
      <header class="layout-header">
        <div class="header-toolbar">
          <div class="toolbar-left">
            <el-button text class="collapse-btn" @click="appStore.toggleSidebar">
              <el-icon size="18">
                <component :is="collapseIcon" />
              </el-icon>
            </el-button>
            <el-breadcrumb separator="/" class="layout-breadcrumb">
              <el-breadcrumb-item v-for="(bc, idx) in breadcrumbs" :key="`${bc.path}-${idx}`">
                <RouterLink v-if="!bc.current" :to="bc.path" class="breadcrumb-link">{{ bc.title }}</RouterLink>
                <span v-else class="breadcrumb-current">{{ bc.title }}</span>
              </el-breadcrumb-item>
            </el-breadcrumb>
          </div>
          <div class="toolbar-right">
            <el-dropdown trigger="click" @command="handleUserAction">
              <div class="user-entry">
                <el-avatar :size="32" class="avatar">{{ (authStore.user?.nickname || '管').slice(0, 1) }}</el-avatar>
                <span class="name">{{ authStore.user?.nickname ?? '管理员' }}</span>
              </div>
              <template #dropdown>
                <el-dropdown-menu>
                  <el-dropdown-item command="profile">个人信息</el-dropdown-item>
                  <el-dropdown-item command="password">修改密码</el-dropdown-item>
                  <el-dropdown-item command="logout" divided>退出登录</el-dropdown-item>
                </el-dropdown-menu>
              </template>
            </el-dropdown>
          </div>
        </div>

        <div class="header-tabs-scroll">
          <el-tabs
            :model-value="activeTab"
            class="route-tabs route-tabs--underline"
            @tab-change="handleTabChange"
            @tab-remove="handleTabRemove"
          >
            <el-tab-pane
              v-for="tab in appStore.tabs"
              :key="tab.path"
              :label="tab.title"
              :name="tab.path"
              :closable="tab.closable"
            />
          </el-tabs>
        </div>
      </header>

      <main class="content">
        <RouterView />
      </main>
    </section>

    <el-dialog v-model="profileDialogVisible" title="个人信息" width="520px">
      <el-form :model="profileForm" :rules="profileRules" label-width="90px">
        <el-form-item :for="''" label="账号">
          <el-input v-model="profileForm.username" disabled />
        </el-form-item>
        <el-form-item :for="''" label="昵称" prop="nickname">
          <el-input v-model="profileForm.nickname" />
        </el-form-item>
        <el-form-item :for="''" label="手机号" prop="phone">
          <el-input v-model="profileForm.phone" />
        </el-form-item>
        <el-form-item :for="''" label="邮箱" prop="email">
          <el-input v-model="profileForm.email" />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="profileDialogVisible = false">取消</el-button>
        <el-button type="primary" @click="submitProfile">保存信息</el-button>
      </template>
    </el-dialog>

    <el-dialog v-model="passwordDialogVisible" title="修改密码" width="520px">
      <el-alert
        title="建议密码至少 8 位，包含字母与数字。当前为演示逻辑，后续对接后端 API。"
        type="info"
        :closable="false"
        class="mb12"
      />
      <el-form :model="passwordForm" :rules="passwordRules" label-width="90px">
        <el-form-item :for="''" label="旧密码" prop="oldPassword">
          <el-input v-model="passwordForm.oldPassword" type="password" show-password />
        </el-form-item>
        <el-form-item :for="''" label="新密码" prop="newPassword">
          <el-input v-model="passwordForm.newPassword" type="password" show-password />
        </el-form-item>
        <el-form-item :for="''" label="确认密码" prop="confirmPassword">
          <el-input v-model="passwordForm.confirmPassword" type="password" show-password />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="passwordDialogVisible = false">取消</el-button>
        <el-button type="primary" @click="submitPassword">确认修改</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<style scoped>
.admin-layout {
  display: flex;
  height: 100vh;
  min-height: 0;
  max-height: 100vh;
  overflow: hidden;
}

.sidebar {
  width: 240px;
  transition: width 0.2s ease;
  background: linear-gradient(180deg, #1f3d91 0%, #1b2f70 100%);
  color: #fff;
  padding: 18px 14px;
  box-shadow: 2px 0 14px rgb(0 0 0 / 12%);
  display: flex;
  flex-direction: column;
  align-self: stretch;
  height: 100%;
  min-height: 0;
  overflow: hidden;
  flex-shrink: 0;
}

.sidebar-menu-scroll {
  flex: 1;
  min-height: 0;
  overflow-x: hidden;
  overflow-y: auto;
}

.sidebar-menu-scroll::-webkit-scrollbar {
  width: 6px;
}

.sidebar-menu-scroll::-webkit-scrollbar-thumb {
  background: rgb(255 255 255 / 22%);
  border-radius: 3px;
}

.collapsed .sidebar {
  width: 74px;
  padding-inline: 8px;
}

.brand {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 8px 10px 18px;
  flex-shrink: 0;
}

.brand-text {
  min-width: 0;
}

.logo {
  width: 36px;
  height: 36px;
  border-radius: 10px;
  background: linear-gradient(135deg, #62a4ff, #b8dbff);
  color: #12306c;
  font-weight: 800;
  display: grid;
  place-items: center;
  flex-shrink: 0;
}

.title {
  font-size: 16px;
  font-weight: 700;
}

.sub-title {
  font-size: 12px;
  color: rgb(255 255 255 / 72%);
}

.menu {
  border-right: none;
  background: transparent;
}

/** 内联子菜单容器默认白底，在深色侧栏上会呈现大块空白；与侧栏渐变统一为透明 */
.menu :deep(.el-menu--inline),
.menu :deep(.el-sub-menu > .el-menu) {
  background-color: transparent !important;
  border: none;
  min-height: 0;
}

.menu :deep(.el-sub-menu__title) {
  color: rgb(255 255 255 / 90%);
  border-radius: 8px;
  margin-bottom: 4px;
  min-height: 36px;
  height: 36px;
  line-height: 36px;
  transition: background-color 0.2s ease, color 0.2s ease;
}

.menu:not(.el-menu--collapse) :deep(.el-sub-menu__title) {
  padding: 0 12px;
}

.menu :deep(.el-sub-menu__title:hover) {
  color: #fff;
  background: rgb(255 255 255 / 12%);
}

.menu :deep(.el-sub-menu.is-active > .el-sub-menu__title) {
  color: #fff;
}

.menu :deep(.el-sub-menu .el-icon),
.menu :deep(.el-sub-menu__icon-arrow) {
  color: inherit;
}

.menu :deep(.el-menu-item) {
  color: rgb(255 255 255 / 90%);
  border-radius: 8px;
  margin-bottom: 4px;
  min-height: 36px;
  height: 36px;
  line-height: 36px;
  transition: all 0.2s ease;
}

.menu:not(.el-menu--collapse) :deep(.el-menu-item) {
  padding: 0 12px;
}

.menu :deep(.el-menu-item:hover) {
  color: #fff;
  background: rgb(255 255 255 / 14%);
}

.menu :deep(.el-menu-item.is-active) {
  color: #fff;
  background: rgb(255 255 255 / 24%);
  font-weight: 600;
}

/** 嵌套层级下的菜单项与顶层一致（紧凑行高；缩进沿用 Element Plus 默认层级 padding） */
.menu :deep(.el-sub-menu .el-menu-item) {
  color: rgb(255 255 255 / 88%);
  min-height: 36px;
  height: 36px;
  line-height: 36px;
}

.menu :deep(.el-sub-menu .el-menu-item:hover) {
  color: #fff;
  background: rgb(255 255 255 / 14%);
}

.menu :deep(.el-sub-menu .el-menu-item.is-active) {
  color: #fff;
  background: rgb(255 255 255 / 24%);
  font-weight: 600;
}

.menu-empty {
  padding: 16px 8px;
  opacity: 0.85;
}

.main-wrapper {
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
  min-height: 0;
  background: #f0f2f5;
}

.layout-header {
  flex-shrink: 0;
  background: #fff;
  box-shadow: 0 1px 4px rgb(0 21 41 / 8%);
  z-index: 2;
}

.header-toolbar {
  height: 52px;
  padding: 0 16px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  border-bottom: 1px solid #f0f0f0;
}

.toolbar-left {
  display: flex;
  align-items: center;
  gap: 10px;
  min-width: 0;
  flex: 1;
}

.toolbar-right {
  display: flex;
  align-items: center;
  gap: 12px;
  flex-shrink: 0;
}

.layout-breadcrumb {
  font-size: 14px;
  min-width: 0;
}

.layout-breadcrumb :deep(.el-breadcrumb__inner) {
  font-weight: 500;
}

.breadcrumb-link {
  color: #595959;
  text-decoration: none;
}

.breadcrumb-link:hover {
  color: var(--el-color-primary);
}

.breadcrumb-current {
  color: #262626;
  font-weight: 600;
}

.collapse-btn {
  flex-shrink: 0;
}

.header-tabs-scroll {
  padding: 0 12px;
  background: #fff;
  border-bottom: 1px solid #f0f0f0;
  overflow-x: auto;
  overflow-y: hidden;
}

.header-tabs-scroll::-webkit-scrollbar {
  height: 4px;
}

.header-tabs-scroll::-webkit-scrollbar-thumb {
  background: rgb(0 0 0 / 15%);
  border-radius: 2px;
}

.route-tabs {
  min-width: min-content;
}

/** 顶栏页签：白底 + 底部指示条，避免卡片式「一整块白底」显得笨重 */
.route-tabs--underline :deep(.el-tabs__header) {
  margin-bottom: 0;
}

.route-tabs--underline :deep(.el-tabs__nav-wrap::after) {
  height: 1px;
  background-color: #f0f0f0;
}

.route-tabs--underline :deep(.el-tabs__nav) {
  border: none;
}

.route-tabs--underline :deep(.el-tabs__item) {
  margin-right: 4px;
  padding: 0 16px;
  height: 40px;
  line-height: 40px;
  font-size: 13px;
  color: #595959;
  border: none !important;
  transition: color 0.2s ease;
}

.route-tabs--underline :deep(.el-tabs__item:hover) {
  color: var(--el-color-primary);
}

.route-tabs--underline :deep(.el-tabs__item.is-active) {
  color: var(--el-color-primary);
  font-weight: 600;
}

.route-tabs--underline :deep(.el-tabs__active-bar) {
  height: 3px;
  border-radius: 3px 3px 0 0;
  background-color: var(--el-color-primary);
}

.route-tabs--underline :deep(.is-icon-close) {
  margin-left: 4px;
  vertical-align: middle;
}

.content {
  flex: 1;
  min-height: 0;
  padding: 8px 10px 10px;
  overflow: auto;
  display: flex;
  flex-direction: column;
}

/** 使页面根节点（如菜单管理）可通过 flex 链铺满内容区剩余高度 */
.content > * {
  flex: 1;
  min-height: 0;
}

.user-entry {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  cursor: pointer;
  padding: 4px 8px;
  border-radius: 999px;
  transition: background-color 0.2s;
}

.user-entry:hover {
  background: #edf3ff;
}

.avatar {
  background: linear-gradient(135deg, #538eff, #85b6ff);
  color: #fff;
}

.name {
  color: #2a3f73;
  font-size: 14px;
}

.mb12 {
  margin-bottom: 12px;
}
</style>
