/**
 * 菜单管理左侧树面板宽度与拖拽调整。
 */
import { ref } from 'vue'

/** 左侧菜单树默认宽度（px） */
const TREE_PANEL_DEFAULT_PX = 240
/** 拖拽调整时的最小/最大宽度（px） */
const TREE_PANEL_MIN_PX = 200
const TREE_PANEL_MAX_PX = 560

function clampTreeWidth(w: number): number {
  return Math.min(TREE_PANEL_MAX_PX, Math.max(TREE_PANEL_MIN_PX, w))
}

export function useMenuPanelResize() {
  const treePanelWidthPx = ref(TREE_PANEL_DEFAULT_PX)

  /** 左右分栏拖拽：mousedown 起在 window 上跟踪移动与释放 */
  function onTreeResizePointerDown(e: MouseEvent) {
    if (e.button !== 0) {
      return
    }
    e.preventDefault()
    const startX = e.clientX
    const startW = treePanelWidthPx.value
    const prevUserSelect = document.body.style.userSelect
    document.body.style.userSelect = 'none'

    const onMove = (ev: MouseEvent) => {
      const dx = ev.clientX - startX
      treePanelWidthPx.value = clampTreeWidth(startW + dx)
    }
    const onUp = () => {
      document.body.style.userSelect = prevUserSelect
      window.removeEventListener('mousemove', onMove)
      window.removeEventListener('mouseup', onUp)
    }
    window.addEventListener('mousemove', onMove)
    window.addEventListener('mouseup', onUp)
  }

  return {
    treePanelWidthPx,
    onTreeResizePointerDown,
  }
}
