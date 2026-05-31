<script setup lang="ts">
/**
 * 紧凑滑块验证：36px 滑轨 + hover 浮层拼图，几何与后端 SliderCaptchaService / vue3-slide-verify 一致。
 * 作者：leiyangjun
 */
import { computed, onBeforeUnmount, ref, watch } from 'vue'
import type { SliderChallenge } from '../../models/auth'

const props = defineProps<{
  challenge: SliderChallenge | null
  loading?: boolean
}>()

const emit = defineEmits<{
  refresh: []
}>()

/** 登录提交的 sliderOffset（拼图块最终 left，px） */
const model = defineModel<number>({ default: 0 })

const CANVAS_W = 320
const SLIDER_BTN = 38
const ACCURACY = 6

const captchaRef = ref<HTMLElement | null>(null)
const trackRef = ref<HTMLElement | null>(null)
const thumbRef = ref<HTMLElement | null>(null)

const dragging = ref(false)
const isActive = ref(false)
const offset = ref(0)
const fillWidth = ref(0)
const puzzleX = ref(0)
const startX = ref(0)

const verified = computed(() => model.value > 0)

const targetX = computed(() => props.challenge?.targetX ?? 0)
const puzzleY = computed(() => props.challenge?.sliderY ?? 55)

const gapTransform = computed(() => `translate(${targetX.value}, ${puzzleY.value})`)
const pieceTransform = computed(() => `translate(${puzzleX.value}, ${puzzleY.value})`)
const pieceBgTransform = computed(() => `translate(${-puzzleX.value}, ${-puzzleY.value})`)
const thumbLeft = computed(() => `${offset.value + 2}px`)

const sliderClass = computed(() => ({
  'is-active': isActive.value,
  'is-dragging': dragging.value,
  'is-done': verified.value,
  'is-loading': !!props.loading,
}))

const labelText = computed(() => {
  if (props.loading) return '正在加载验证…'
  if (verified.value) return '验证已通过'
  return '向右滑动完成验证'
})

watch(
  () => props.challenge?.captchaId,
  () => {
    resetSlider()
    model.value = 0
  },
)

function puzzleMaxMove() {
  return ((CANVAS_W - 60) / (CANVAS_W - 40)) * (CANVAS_W - SLIDER_BTN)
}

function maxOffset() {
  const track = trackRef.value
  const thumb = thumbRef.value
  if (!track || !thumb) return 0
  return track.clientWidth - thumb.clientWidth - 4
}

function offsetToPuzzleX(sliderOffset: number) {
  const max = maxOffset()
  const ratio = max > 0 ? sliderOffset / max : 0
  return ratio * puzzleMaxMove()
}

function updatePiece(x: number) {
  puzzleX.value = x
  const max = maxOffset()
  const progressRatio = puzzleMaxMove() > 0 ? x / puzzleMaxMove() : 0
  fillWidth.value = progressRatio * (max + (thumbRef.value?.clientWidth ?? 0) / 2)
}

function resetSlider() {
  offset.value = 0
  fillWidth.value = 0
  updatePiece(0)
}

function markDone(finalX: number) {
  model.value = Math.round(finalX)
  dragging.value = false
  isActive.value = false
}

/** 拖动中仅更新滑块与拼图位置，不做校验（避免扫过缺口即自动通过） */
function move(clientX: number) {
  if (!dragging.value || verified.value) return
  const max = maxOffset()
  offset.value = Math.max(0, Math.min(max, clientX - startX.value))
  const x = offsetToPuzzleX(offset.value)
  updatePiece(x)
}

/** 松开时校验对齐；失败则复位滑块与拼图 */
function verifyOnRelease() {
  if (verified.value) return
  const x = offsetToPuzzleX(offset.value)
  if (Math.abs(x - targetX.value) <= ACCURACY) {
    markDone(x)
  } else {
    resetSlider()
  }
}

function onPointerDown(e: MouseEvent | TouchEvent) {
  if (verified.value || props.loading || !props.challenge) return
  e.preventDefault()
  dragging.value = true
  isActive.value = true
  const clientX = 'touches' in e ? e.touches[0].clientX : e.clientX
  startX.value = clientX - offset.value
}

function onPointerMove(e: MouseEvent | TouchEvent) {
  if (!dragging.value) return
  const clientX = 'touches' in e ? e.touches[0].clientX : e.clientX
  move(clientX)
}

function onPointerUp() {
  if (!dragging.value) return
  dragging.value = false
  verifyOnRelease()
}

function showPopover() {
  if (!verified.value && !props.loading && props.challenge) {
    isActive.value = true
  }
}

function hidePopover() {
  if (!dragging.value && !verified.value) {
    isActive.value = false
  }
}

function onCaptchaLeave(e: MouseEvent) {
  const related = e.relatedTarget
  if (related instanceof Node && captchaRef.value?.contains(related)) return
  hidePopover()
}

function onRefresh(e: Event) {
  e.preventDefault()
  e.stopPropagation()
  model.value = 0
  resetSlider()
  emit('refresh')
  showPopover()
}

document.addEventListener('mousemove', onPointerMove)
document.addEventListener('mouseup', onPointerUp)
document.addEventListener('touchmove', onPointerMove, { passive: true })
document.addEventListener('touchend', onPointerUp)

onBeforeUnmount(() => {
  document.removeEventListener('mousemove', onPointerMove)
  document.removeEventListener('mouseup', onPointerUp)
  document.removeEventListener('touchmove', onPointerMove)
  document.removeEventListener('touchend', onPointerUp)
})
</script>

<template>
  <div class="captcha-block">
    <div class="captcha-block__label">安全验证</div>

    <div
      ref="captchaRef"
      class="captcha-slider"
      :class="sliderClass"
      @mouseleave="onCaptchaLeave"
    >
      <div
        class="captcha-popover"
        :aria-hidden="!isActive && !dragging"
        @mouseenter="showPopover"
      >
        <div v-if="challenge && !loading" class="captcha-popover__stage">
          <svg class="captcha-popover__svg" viewBox="0 0 320 155" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
            <defs>
              <linearGradient id="techSky" x1="0" y1="0" x2="320" y2="155" gradientUnits="userSpaceOnUse">
                <stop offset="0%" stop-color="#eef4ff" />
                <stop offset="40%" stop-color="#e2ecff" />
                <stop offset="75%" stop-color="#d3e5ff" />
                <stop offset="100%" stop-color="#bfdbfe" />
              </linearGradient>
              <radialGradient id="techBokeh1" cx="0.2" cy="0.25" r="0.55">
                <stop offset="0%" stop-color="#ffffff" stop-opacity="0.75" />
                <stop offset="100%" stop-color="#ffffff" stop-opacity="0" />
              </radialGradient>
              <radialGradient id="techBokeh2" cx="0.82" cy="0.72" r="0.5">
                <stop offset="0%" stop-color="#93c5fd" stop-opacity="0.45" />
                <stop offset="100%" stop-color="#93c5fd" stop-opacity="0" />
              </radialGradient>
              <radialGradient id="techBokeh3" cx="0.55" cy="0.15" r="0.4">
                <stop offset="0%" stop-color="#60a5fa" stop-opacity="0.28" />
                <stop offset="100%" stop-color="#60a5fa" stop-opacity="0" />
              </radialGradient>
              <linearGradient id="techLineGrad" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stop-color="#3b82f6" stop-opacity="0.28" />
                <stop offset="100%" stop-color="#93c5fd" stop-opacity="0.08" />
              </linearGradient>
              <linearGradient id="cubeFaceLight" x1="0" y1="0" x2="1" y2="1">
                <stop offset="0%" stop-color="#ffffff" stop-opacity="0.92" />
                <stop offset="100%" stop-color="#dbeafe" stop-opacity="0.75" />
              </linearGradient>
              <linearGradient id="cubeFaceMid" x1="0" y1="0" x2="1" y2="1">
                <stop offset="0%" stop-color="#bfdbfe" stop-opacity="0.85" />
                <stop offset="100%" stop-color="#60a5fa" stop-opacity="0.45" />
              </linearGradient>
              <linearGradient id="cubeFaceSide" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stop-color="#93c5fd" stop-opacity="0.55" />
                <stop offset="100%" stop-color="#3b6cf4" stop-opacity="0.28" />
              </linearGradient>
              <pattern id="techGrid" width="18" height="18" patternUnits="userSpaceOnUse">
                <path d="M 18 0 L 0 0 0 18" fill="none" stroke="rgba(59,130,246,0.1)" stroke-width="0.5" />
              </pattern>
              <filter id="bokehBlur" x="-50%" y="-50%" width="200%" height="200%">
                <feGaussianBlur stdDeviation="8" />
              </filter>
              <!-- vue3-slide-verify draw()：l=42 r=10；顶/右凸起、底边平直、左侧内凹 -->
              <path
                id="jigsawPath"
                d="M 0 0 L 14.63 -0.29 A 10 10 0 1 1 27.85 -0.71 L 42 0 L 42.1 14.87 A 10 10 0 1 1 42.29 27.37 L 42 42 L 0 42 L 0.42 28.12 A 10.4 10.4 0 1 0 0.42 13.88 L 0 0 Z"
              />
              <clipPath id="jigsawClip" clipPathUnits="userSpaceOnUse">
                <use href="#jigsawPath" />
              </clipPath>
            </defs>
            <g id="captchaBg">
              <rect width="320" height="155" fill="url(#techSky)" />
              <rect width="320" height="155" fill="url(#techBokeh1)" />
              <rect width="320" height="155" fill="url(#techBokeh2)" />
              <rect width="320" height="155" fill="url(#techBokeh3)" />
              <rect width="320" height="155" fill="url(#techGrid)" opacity="0.85" />
              <circle cx="48" cy="38" r="28" fill="rgba(255,255,255,0.55)" filter="url(#bokehBlur)" />
              <circle cx="268" cy="42" r="36" fill="rgba(147,197,253,0.4)" filter="url(#bokehBlur)" />
              <circle cx="180" cy="118" r="32" fill="rgba(96,165,250,0.22)" filter="url(#bokehBlur)" />
              <circle cx="10%" cy="30%" r="52" fill="none" stroke="url(#techLineGrad)" stroke-width="1.2" />
              <circle cx="88%" cy="68%" r="68" fill="none" stroke="url(#techLineGrad)" stroke-width="0.8" />
              <line x1="0" y1="52%" x2="100%" y2="48%" stroke="rgba(147,197,253,0.35)" stroke-width="1" stroke-dasharray="6 10" />
              <line x1="0" y1="72%" x2="100%" y2="70%" stroke="rgba(59,130,246,0.15)" stroke-width="1" stroke-dasharray="4 14" />
              <path d="M24 118 L52 102 L80 118 L80 146 L52 162 L24 146 Z" fill="rgba(255,255,255,0.35)" stroke="rgba(59,130,246,0.28)" stroke-width="1" />
              <path d="M24 118 L52 102 L52 130 L24 146 Z" fill="url(#cubeFaceMid)" />
              <path d="M52 102 L80 118 L80 146 L52 130 Z" fill="url(#cubeFaceSide)" />
              <path d="M108 92 L136 76 L164 92 L164 120 L136 136 L108 120 Z" fill="rgba(255,255,255,0.28)" stroke="rgba(59,130,246,0.22)" stroke-width="1" />
              <path d="M108 92 L136 76 L136 104 L108 120 Z" fill="rgba(191,219,254,0.55)" />
              <path d="M136 76 L164 92 L164 120 L136 104 Z" fill="rgba(147,197,253,0.42)" />
              <rect x="196" y="98" width="14" height="26" rx="1.5" fill="url(#cubeFaceLight)" stroke="rgba(59,130,246,0.25)" stroke-width="0.8" transform="skewY(-8)" />
              <rect x="218" y="104" width="12" height="20" rx="1.5" fill="rgba(219,234,254,0.7)" stroke="rgba(96,165,250,0.3)" stroke-width="0.8" transform="skewY(-6)" />
              <rect x="238" y="100" width="13" height="24" rx="1.5" fill="rgba(191,219,254,0.65)" stroke="rgba(59,130,246,0.22)" stroke-width="0.8" transform="skewY(-7)" />
              <path d="M268 58 L296 44 L296 68 L268 82 L240 68 L240 44 Z" fill="rgba(255,255,255,0.3)" stroke="rgba(96,165,250,0.32)" stroke-width="1" />
              <path d="M268 58 L268 82 L240 68 L240 44 Z" fill="rgba(191,219,254,0.5)" />
              <path d="M268 58 L296 44 L296 68 L268 82 Z" fill="rgba(147,197,253,0.38)" />
              <path d="M36 48 H108 M36 56 H88 M36 64 H96" stroke="rgba(59,130,246,0.18)" stroke-width="0.8" />
              <circle cx="52" cy="32" r="2.5" fill="#3b6cf4" opacity="0.45" />
              <circle cx="92" cy="26" r="2" fill="#60a5fa" opacity="0.4" />
              <circle cx="128" cy="40" r="2" fill="#93c5fd" opacity="0.5" />
              <circle cx="284" cy="28" r="2" fill="#243f7b" opacity="0.25" />
            </g>
            <g id="captchaGap" :transform="gapTransform">
              <use href="#jigsawPath" fill="rgba(15,45,105,0.38)" stroke="rgba(59,130,246,0.55)" stroke-width="1" />
            </g>
            <g id="pieceGroup" :transform="pieceTransform">
              <g id="pieceInner" clip-path="url(#jigsawClip)">
                <use href="#captchaBg" :transform="pieceBgTransform" />
              </g>
              <use href="#jigsawPath" fill="none" stroke="rgba(59,130,246,0.75)" stroke-width="1.5" />
            </g>
          </svg>
          <button
            type="button"
            class="captcha-popover__refresh"
            title="刷新验证"
            aria-label="刷新验证"
            @click="onRefresh"
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M23 4v6h-6M1 20v-6h6" />
              <path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15" />
            </svg>
          </button>
        </div>
        <div v-else class="captcha-popover__loading">正在加载验证…</div>
      </div>

      <div
        ref="trackRef"
        class="captcha-slider__track"
        @mouseenter="showPopover"
        @click="showPopover"
      >
        <div class="captcha-slider__fill" :style="{ width: verified ? '100%' : `${fillWidth}px` }" />
        <span class="captcha-slider__text">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
          </svg>
          <span>{{ labelText }}</span>
        </span>
        <div
          v-if="!verified"
          ref="thumbRef"
          class="captcha-slider__thumb"
          :style="{ left: thumbLeft }"
          @mousedown="onPointerDown"
          @touchstart="onPointerDown"
        >
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
            <path d="M9 18l6-6-6-6" />
          </svg>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.captcha-block {
  margin: 4px 0 20px;
}

.captcha-block__label {
  font-size: 12px;
  font-weight: 500;
  color: #64748b;
  margin-bottom: 6px;
}

.captcha-slider {
  position: relative;
  z-index: 1;
  user-select: none;
}

.captcha-slider__track {
  position: relative;
  height: 36px;
  background: #f8fafc;
  border: 1px solid #e2e8f0;
  border-radius: 8px;
  overflow: hidden;
  cursor: pointer;
  transition: border-color 0.2s, box-shadow 0.2s;
}

.captcha-slider__track:hover,
.captcha-slider.is-active .captcha-slider__track {
  border-color: rgba(24, 144, 255, 0.45);
  box-shadow: 0 0 0 3px rgba(24, 144, 255, 0.06);
}

.captcha-slider.is-done .captcha-slider__track {
  border-color: rgba(34, 197, 94, 0.5);
  background: rgba(34, 197, 94, 0.05);
  cursor: default;
}

.captcha-slider.is-loading .captcha-slider__track {
  cursor: wait;
  opacity: 0.75;
}

.captcha-slider__fill {
  position: absolute;
  left: 0;
  top: 0;
  height: 100%;
  width: 0;
  background: linear-gradient(90deg, rgba(24, 144, 255, 0.08), rgba(77, 124, 254, 0.14));
  border-radius: 7px 0 0 7px;
  pointer-events: none;
}

.captcha-slider.is-done .captcha-slider__fill {
  background: linear-gradient(90deg, rgba(34, 197, 94, 0.08), rgba(34, 197, 94, 0.14));
}

.captcha-slider__text {
  position: absolute;
  inset: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 6px;
  font-size: 12px;
  color: #64748b;
  pointer-events: none;
}

.captcha-slider__text svg {
  width: 14px;
  height: 14px;
  flex-shrink: 0;
}

.captcha-slider.is-done .captcha-slider__text {
  color: #16a34a;
  font-weight: 600;
}

.captcha-slider__thumb {
  position: absolute;
  left: 2px;
  top: 2px;
  width: 30px;
  height: 30px;
  background: #fff;
  border: 1px solid #e2e8f0;
  border-radius: 6px;
  display: grid;
  place-items: center;
  cursor: grab;
  box-shadow: 0 2px 6px rgba(0, 0, 0, 0.08);
  z-index: 2;
  transition: box-shadow 0.15s;
}

.captcha-slider__thumb:hover {
  box-shadow: 0 0 0 2px rgba(24, 144, 255, 0.15), 0 2px 6px rgba(0, 0, 0, 0.08);
}

.captcha-slider__thumb:active {
  cursor: grabbing;
}

.captcha-slider__thumb svg {
  width: 12px;
  color: #1890ff;
}

.captcha-popover {
  position: absolute;
  left: 0;
  right: 0;
  bottom: calc(100% + 8px);
  padding: 12px;
  background: #fff;
  border: 1px solid #e2e8f0;
  border-radius: 10px;
  box-shadow:
    0 12px 32px rgba(13, 42, 92, 0.12),
    0 4px 12px rgba(0, 0, 0, 0.06);
  opacity: 0;
  visibility: hidden;
  transform: translateY(4px);
  transition: opacity 0.2s, transform 0.2s, visibility 0.2s;
  z-index: 20;
  pointer-events: none;
  contain: layout style;
}

.captcha-popover::after {
  content: '';
  position: absolute;
  left: 0;
  right: 0;
  top: 100%;
  height: 12px;
}

.captcha-slider.is-active .captcha-popover,
.captcha-slider.is-dragging .captcha-popover {
  opacity: 1;
  visibility: visible;
  transform: translateY(0);
  pointer-events: auto;
}

.captcha-popover__stage {
  position: relative;
  width: 100%;
  max-width: 320px;
  margin: 0 auto;
  border-radius: 6px;
  overflow: hidden;
  background: linear-gradient(160deg, #eef4ff 0%, #dbeafe 45%, #bfdbfe 100%);
  line-height: 0;
  border: 1px solid rgba(59, 130, 246, 0.12);
}

.captcha-popover__svg {
  display: block;
  width: 100%;
  height: auto;
  aspect-ratio: 320 / 155;
}

.captcha-popover__refresh {
  position: absolute;
  top: 8px;
  right: 8px;
  width: 22px;
  height: 22px;
  border: none;
  border-radius: 4px;
  background: rgba(255, 255, 255, 0.72);
  color: #3b6cf4;
  cursor: pointer;
  display: grid;
  place-items: center;
  padding: 0;
  transition: background 0.15s, box-shadow 0.15s;
  z-index: 3;
  pointer-events: auto;
  box-shadow: 0 1px 4px rgba(36, 63, 123, 0.1);
}

.captcha-popover__refresh:hover {
  background: rgba(255, 255, 255, 0.95);
  box-shadow: 0 2px 6px rgba(36, 63, 123, 0.14);
}

.captcha-popover__refresh svg {
  width: 14px;
  height: 14px;
}

.captcha-popover__loading {
  min-height: 120px;
  display: grid;
  place-items: center;
  font-size: 13px;
  color: #64748b;
}
</style>
