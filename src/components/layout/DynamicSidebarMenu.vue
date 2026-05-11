<script lang="ts">
export default {
  name: 'DynamicSidebarMenu',
}
</script>

<script setup lang="ts">
/**
 * 递归侧栏：目录 CATALOG 为子菜单，MENU 为可点击项（index 为数据库 route_path 原文）。
 */
import type { MenuMgmtVO } from '../../models/menuMgmt'
import { resolveMenuIconComponent } from '../../constants/menuIconOptions'
import { Menu as MenuIcon } from '@element-plus/icons-vue'

const props = defineProps<{
  nodes: MenuMgmtVO[]
}>()

function iconFor(node: MenuMgmtVO) {
  return resolveMenuIconComponent(node.icon) ?? MenuIcon
}

function visibleChildren(node: MenuMgmtVO): MenuMgmtVO[] {
  return (node.children ?? []).filter((c) => c.valid === undefined || c.valid === null || Number(c.valid) === 1)
}

function isMenuRow(node: MenuMgmtVO): boolean {
  return node.menuType === 'MENU' && !!(node.routePath ?? '').trim()
}
</script>

<template>
  <template v-for="node in props.nodes" :key="String(node.id ?? node.menuCode)">
    <el-sub-menu
      v-if="node.menuType === 'CATALOG' && visibleChildren(node).length"
      :index="`catalog:${String(node.id ?? node.menuCode)}`"
    >
      <template #title>
        <el-icon><component :is="iconFor(node)" /></el-icon>
        <span>{{ node.menuName }}</span>
      </template>
      <DynamicSidebarMenu :nodes="visibleChildren(node)" />
    </el-sub-menu>
    <el-menu-item v-else-if="isMenuRow(node)" :index="String(node.routePath).trim()">
      <el-icon><component :is="iconFor(node)" /></el-icon>
      <template #title>{{ node.menuName }}</template>
    </el-menu-item>
  </template>
</template>
