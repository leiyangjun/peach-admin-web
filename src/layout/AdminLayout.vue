<script setup lang="ts">
/**
 * 后台主框架视图（View）：负责布局展示，交互逻辑委托 Controller。
 * 作者：leiyangjun
 */

import { useLayoutController } from '../controllers/layout/useLayoutController'

const {
  authStore,
  appStore,
  menuList,
  activeMenu,
  activeTab,
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
      <el-menu router :default-active="activeMenu" class="menu" :collapse="appStore.sidebarCollapsed">
        <el-menu-item v-for="item in menuList" :key="item.index" :index="item.index">
          <el-icon><component :is="item.icon" /></el-icon>
          <template #title>{{ item.title }}</template>
        </el-menu-item>
      </el-menu>
    </aside>

    <section class="main-wrapper">
      <header class="topbar">
        <div class="left">
          <el-button text class="collapse-btn" @click="appStore.toggleSidebar">
            <el-icon size="18">
              <component :is="collapseIcon" />
            </el-icon>
          </el-button>
          <span>欢迎回来，{{ authStore.user?.nickname ?? '管理员' }}</span>
        </div>
        <div class="right">
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
      </header>

      <div class="tabs-wrap">
        <el-tabs
          :model-value="activeTab"
          type="card"
          class="route-tabs"
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

      <main class="content">
        <RouterView />
      </main>
    </section>

    <el-dialog v-model="profileDialogVisible" title="个人信息" width="520px">
      <el-form :model="profileForm" :rules="profileRules" label-width="90px">
        <el-form-item label="账号">
          <el-input v-model="profileForm.username" disabled />
        </el-form-item>
        <el-form-item label="昵称" prop="nickname">
          <el-input v-model="profileForm.nickname" />
        </el-form-item>
        <el-form-item label="手机号" prop="phone">
          <el-input v-model="profileForm.phone" />
        </el-form-item>
        <el-form-item label="邮箱" prop="email">
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
        <el-form-item label="旧密码" prop="oldPassword">
          <el-input v-model="passwordForm.oldPassword" type="password" show-password />
        </el-form-item>
        <el-form-item label="新密码" prop="newPassword">
          <el-input v-model="passwordForm.newPassword" type="password" show-password />
        </el-form-item>
        <el-form-item label="确认密码" prop="confirmPassword">
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
  min-height: 100vh;
}

.sidebar {
  width: 240px;
  transition: width 0.2s ease;
  background: linear-gradient(180deg, #1f3d91 0%, #1b2f70 100%);
  color: #fff;
  padding: 18px 14px;
  box-shadow: 2px 0 14px rgb(0 0 0 / 12%);
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

.menu :deep(.el-menu-item) {
  color: rgb(255 255 255 / 90%);
  border-radius: 10px;
  margin-bottom: 6px;
  transition: all 0.2s ease;
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

.main-wrapper {
  flex: 1;
  min-width: 0;
}

.topbar {
  height: 62px;
  background: rgb(255 255 255 / 92%);
  backdrop-filter: blur(4px);
  border-bottom: 1px solid #e7edf8;
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0 20px;
}

.left {
  color: #1f2d5a;
  font-weight: 600;
  display: flex;
  align-items: center;
  gap: 8px;
}

.collapse-btn {
  margin-right: 4px;
}

.tabs-wrap {
  background: #fff;
  border-bottom: 1px solid #e7edf8;
  padding: 8px 14px 0;
}

.route-tabs :deep(.el-tabs__header) {
  margin-bottom: 0;
}

.route-tabs :deep(.el-tabs__item) {
  border-radius: 8px 8px 0 0;
}

.content {
  padding: 18px;
}

.right {
  display: flex;
  align-items: center;
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
