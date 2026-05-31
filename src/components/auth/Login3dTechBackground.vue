<script setup lang="ts">
/**
 * 登录页 3D 科技风背景：浅蓝渐变、散景、随机玻璃立方体（仅左侧 ≤52% 安全区）。
 * 作者：leiyangjun
 */
import { onMounted, ref } from 'vue'

const cubesContainer = ref<HTMLElement | null>(null)

const CUBE_COUNT = 20
const MAX_LEFT = 52
const MIN_GAP = 7

interface LayerConfig {
  key: string
  cls: string
  size: [number, number]
  opacity: [number, number]
  blur: [number, number]
  weight: number
}

const LAYERS: LayerConfig[] = [
  { key: 'far', cls: 'cube-wrap--far', size: [22, 38], opacity: [0.28, 0.42], blur: [2.5, 4], weight: 0.38 },
  { key: 'mid', cls: 'cube-wrap--mid', size: [36, 58], opacity: [0.52, 0.72], blur: [0.6, 1.4], weight: 0.36 },
  { key: 'near', cls: 'cube-wrap--near', size: [48, 88], opacity: [0.78, 0.94], blur: [0, 0.4], weight: 0.26 },
]

const ANIMS = ['', 'cube-wrap--anim-x', 'cube-wrap--anim-reverse', 'cube-wrap--anim-drift']
const FACES = ['front', 'back', 'right', 'left', 'top', 'bottom'] as const

function rand(min: number, max: number) {
  return min + Math.random() * (max - min)
}

function pickLayer(): LayerConfig {
  const r = Math.random()
  let acc = 0
  for (const layer of LAYERS) {
    acc += layer.weight
    if (r <= acc) return layer
  }
  return LAYERS[LAYERS.length - 1]
}

function buildCubes() {
  const container = cubesContainer.value
  if (!container) return

  const placed: { left: number; top: number }[] = []

  function tooClose(left: number, top: number) {
    for (const p of placed) {
      const dx = left - p.left
      const dy = top - p.top
      if (Math.sqrt(dx * dx + dy * dy) < MIN_GAP) return true
    }
    return false
  }

  function randomPos(sizePx: number) {
    let left: number
    let top: number
    let tries = 0
    const sizePct = (sizePx / window.innerWidth) * 100 * 0.6
    do {
      left = rand(1.5, MAX_LEFT - sizePct)
      top = rand(4, 86)
      tries++
    } while (tooClose(left, top) && tries < 48)
    placed.push({ left, top })
    return { left, top }
  }

  function createCubeFace(className: string) {
    const face = document.createElement('div')
    face.className = `cube__face ${className}`
    return face
  }

  function buildCube(layer: LayerConfig) {
    const size = Math.round(rand(layer.size[0], layer.size[1]))
    const pos = randomPos(size)
    const spinReverse = Math.random() > 0.62
    const anim = ANIMS[Math.floor(Math.random() * ANIMS.length)]

    const wrap = document.createElement('div')
    wrap.className = `cube-wrap ${layer.cls}${anim ? ` ${anim}` : ''}`
    wrap.style.top = `${pos.top}%`
    wrap.style.left = `${pos.left}%`
    wrap.style.setProperty('--size', `${size}px`)
    wrap.style.setProperty('--rx', `${Math.round(rand(-28, 32))}deg`)
    wrap.style.setProperty('--ry', `${Math.round(rand(-52, 52))}deg`)
    wrap.style.setProperty('--dur', `${rand(5.5, 12.5).toFixed(1)}s`)
    wrap.style.setProperty('--delay', `${(-rand(0, 9)).toFixed(1)}s`)
    wrap.style.setProperty('--spin-dur', `${Math.round(rand(13, 34))}s`)
    wrap.style.setProperty('--layer-opacity', rand(layer.opacity[0], layer.opacity[1]).toFixed(2))
    wrap.style.setProperty('--layer-blur', `${rand(layer.blur[0], layer.blur[1]).toFixed(1)}px`)
    if (spinReverse) wrap.style.setProperty('--spin-dir', 'reverse')

    const cube = document.createElement('div')
    cube.className = 'cube'
    cube.style.setProperty('--size', `${size}px`)
    if (spinReverse) cube.style.setProperty('--spin-dir', 'reverse')

    for (const f of FACES) {
      cube.appendChild(createCubeFace(`cube__face--${f}`))
    }

    wrap.appendChild(cube)
    return wrap
  }

  const frag = document.createDocumentFragment()
  for (let c = 0; c < CUBE_COUNT; c++) {
    frag.appendChild(buildCube(pickLayer()))
  }
  container.appendChild(frag)
}

onMounted(() => {
  buildCubes()
})
</script>

<template>
  <div class="scene" aria-hidden="true">
    <div class="scene__gradient" />

    <div class="bokeh bokeh--1" />
    <div class="bokeh bokeh--2" />
    <div class="bokeh bokeh--3" />
    <div class="bokeh bokeh--4" />
    <div class="bokeh bokeh--5" />

    <svg class="scene__svg" xmlns="http://www.w3.org/2000/svg" preserveAspectRatio="xMidYMid slice">
      <defs>
        <linearGradient id="lineGrad" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stop-color="#3b82f6" stop-opacity="0.3" />
          <stop offset="100%" stop-color="#93c5fd" stop-opacity="0.1" />
        </linearGradient>
      </defs>
      <circle cx="10%" cy="30%" r="120" fill="none" stroke="url(#lineGrad)" stroke-width="1.5" />
      <circle cx="90%" cy="70%" r="180" fill="none" stroke="url(#lineGrad)" stroke-width="1" />
      <polygon
        points="85,120 160,80 235,120 235,200 160,240 85,200"
        fill="none"
        stroke="rgba(59,130,246,0.15)"
        stroke-width="1.5"
        transform="translate(1200, 80) rotate(12)"
      />
      <polygon
        points="0,400 80,360 160,400 160,480 80,520 0,480"
        fill="none"
        stroke="rgba(96,165,250,0.2)"
        stroke-width="1"
        transform="translate(60, 100)"
      />
      <line x1="0" y1="50%" x2="100%" y2="45%" stroke="rgba(147,197,253,0.2)" stroke-width="1" stroke-dasharray="8 12" />
      <line x1="0" y1="70%" x2="100%" y2="68%" stroke="rgba(59,130,246,0.12)" stroke-width="1" stroke-dasharray="4 16" />
    </svg>

    <div class="cubes-stage">
      <div ref="cubesContainer" class="cubes-container" aria-hidden="true" />

      <svg class="iso-block" style="top:42%; left:3%; width:100px; animation-delay:-2s;" viewBox="0 0 100 80" fill="none">
        <path d="M50 10 L90 35 L90 65 L50 90 L10 65 L10 35 Z" fill="rgba(255,255,255,0.25)" stroke="rgba(59,130,246,0.3)" stroke-width="1" />
        <path d="M50 10 L50 40 L10 65 L10 35 Z" fill="rgba(191,219,254,0.4)" />
        <path d="M50 10 L90 35 L90 65 L50 40 Z" fill="rgba(147,197,253,0.35)" />
      </svg>

      <svg class="iso-block" style="top:18%; left:44%; width:62px; animation-delay:-5s; opacity:0.32;" viewBox="0 0 80 70" fill="none">
        <path d="M40 5 L75 25 L75 50 L40 70 L5 50 L5 25 Z" fill="rgba(255,255,255,0.18)" stroke="rgba(96,165,250,0.28)" stroke-width="1" />
        <path d="M40 5 L40 32 L5 50 L5 25 Z" fill="rgba(219,234,254,0.35)" />
        <path d="M40 5 L75 25 L75 50 L40 32 Z" fill="rgba(147,197,253,0.22)" />
      </svg>

      <svg class="iso-block" style="top:72%; left:38%; width:88px; animation-delay:-3.5s; opacity:0.38;" viewBox="0 0 100 80" fill="none">
        <path d="M50 10 L90 35 L90 65 L50 90 L10 65 L10 35 Z" fill="rgba(255,255,255,0.2)" stroke="rgba(59,130,246,0.25)" stroke-width="1" />
        <path d="M50 10 L50 40 L10 65 L10 35 Z" fill="rgba(191,219,254,0.35)" />
        <path d="M50 10 L90 35 L90 65 L50 40 Z" fill="rgba(147,197,253,0.28)" />
      </svg>

      <svg class="iso-block" style="bottom:14%; left:8%; width:110px; animation-delay:-7s;" viewBox="0 0 120 90" fill="none">
        <rect x="20" y="50" width="50" height="30" rx="2" fill="rgba(59,130,246,0.15)" stroke="rgba(59,130,246,0.25)" stroke-width="1" />
        <path d="M20 50 L45 30 L95 30 L70 50 Z" fill="rgba(255,255,255,0.35)" stroke="rgba(59,130,246,0.2)" stroke-width="1" />
        <path d="M70 50 L95 30 L95 60 L70 80 Z" fill="rgba(191,219,254,0.4)" stroke="rgba(59,130,246,0.2)" stroke-width="1" />
        <path d="M20 50 L45 30 L95 30 L70 50 L70 80 L20 80 Z" fill="none" stroke="rgba(96,165,250,0.3)" stroke-width="1" />
      </svg>

      <div class="cubes-stage__safe-mask" aria-hidden="true" />
    </div>
  </div>

  <div class="tech-line" aria-hidden="true" />
</template>

<style scoped>
.scene {
  position: fixed;
  inset: 0;
  z-index: 0;
  pointer-events: none;
  overflow: hidden;
}

.scene__gradient {
  position: absolute;
  inset: 0;
  background:
    radial-gradient(ellipse 120% 80% at 15% 20%, rgba(59, 130, 246, 0.35), transparent 55%),
    radial-gradient(ellipse 90% 70% at 85% 75%, rgba(96, 165, 250, 0.28), transparent 50%),
    radial-gradient(ellipse 60% 50% at 50% 100%, rgba(191, 219, 254, 0.5), transparent 60%),
    linear-gradient(160deg, #dbeafe 0%, #bfdbfe 40%, #93c5fd 100%);
}

.bokeh {
  position: absolute;
  border-radius: 50%;
  filter: blur(40px);
  animation: bokeh-drift 12s ease-in-out infinite;
}

.bokeh--1 { width: 280px; height: 280px; top: 8%; left: 5%; background: rgba(255, 255, 255, 0.55); animation-delay: 0s; }
.bokeh--2 { width: 200px; height: 200px; top: 60%; left: 12%; background: rgba(59, 130, 246, 0.25); animation-delay: -3s; }
.bokeh--3 { width: 320px; height: 320px; top: 20%; right: 8%; background: rgba(147, 197, 253, 0.45); animation-delay: -6s; }
.bokeh--4 { width: 160px; height: 160px; bottom: 15%; right: 20%; background: rgba(255, 255, 255, 0.4); animation-delay: -9s; }
.bokeh--5 { width: 240px; height: 240px; bottom: 5%; left: 35%; background: rgba(96, 165, 250, 0.2); animation-delay: -4s; }

@keyframes bokeh-drift {
  0%, 100% { transform: translate(0, 0) scale(1); opacity: 0.85; }
  33% { transform: translate(18px, -24px) scale(1.05); opacity: 1; }
  66% { transform: translate(-12px, 16px) scale(0.97); opacity: 0.75; }
}

.scene__svg {
  position: absolute;
  inset: 0;
  width: 100%;
  height: 100%;
  opacity: 0.35;
}

.cubes-stage {
  position: absolute;
  inset: 0;
  perspective: 1200px;
  perspective-origin: 50% 50%;
}

.cubes-container :deep(.cube-wrap) {
  position: absolute;
  transform-style: preserve-3d;
  will-change: transform;
  animation: cube-float var(--dur, 8s) ease-in-out infinite;
  animation-delay: var(--delay, 0s);
}

.cubes-container :deep(.cube-wrap--far) {
  opacity: var(--layer-opacity, 0.38);
  filter: blur(var(--layer-blur, 3px));
  z-index: 0;
}

.cubes-container :deep(.cube-wrap--mid) {
  opacity: var(--layer-opacity, 0.62);
  filter: blur(var(--layer-blur, 1px));
  z-index: 1;
}

.cubes-container :deep(.cube-wrap--near) {
  opacity: var(--layer-opacity, 0.88);
  filter: blur(var(--layer-blur, 0px));
  z-index: 2;
}

.cubes-stage__safe-mask {
  position: absolute;
  top: 0;
  right: 0;
  width: 42%;
  height: 100%;
  background: linear-gradient(90deg, transparent 0%, rgba(219, 234, 254, 0.12) 35%, rgba(239, 246, 255, 0.22) 100%);
  pointer-events: none;
  z-index: 3;
}

.cubes-container :deep(.cube-wrap--anim-x) { animation-name: cube-float-x; }
.cubes-container :deep(.cube-wrap--anim-reverse) { animation-name: cube-float-reverse; }
.cubes-container :deep(.cube-wrap--anim-drift) { animation-name: cube-float-drift; }

@keyframes cube-float {
  0%, 100% { transform: translateY(0) rotateX(var(--rx, 15deg)) rotateY(var(--ry, -25deg)); }
  50% { transform: translateY(-18px) rotateX(calc(var(--rx, 15deg) + 8deg)) rotateY(calc(var(--ry, -25deg) + 12deg)); }
}

@keyframes cube-float-x {
  0%, 100% { transform: translate(0, 0) rotateX(var(--rx, 15deg)) rotateY(var(--ry, -25deg)); }
  50% { transform: translate(16px, -14px) rotateX(calc(var(--rx, 15deg) + 6deg)) rotateY(calc(var(--ry, -25deg) + 10deg)); }
}

@keyframes cube-float-reverse {
  0%, 100% { transform: translateY(0) rotateX(var(--rx, 15deg)) rotateY(var(--ry, -25deg)); }
  50% { transform: translateY(14px) rotateX(calc(var(--rx, 15deg) - 7deg)) rotateY(calc(var(--ry, -25deg) - 11deg)); }
}

@keyframes cube-float-drift {
  0%, 100% { transform: translate(0, 0) rotateX(var(--rx, 15deg)) rotateY(var(--ry, -25deg)); }
  33% { transform: translate(-12px, -10px) rotateX(calc(var(--rx, 15deg) + 5deg)) rotateY(calc(var(--ry, -25deg) - 8deg)); }
  66% { transform: translate(10px, -20px) rotateX(calc(var(--rx, 15deg) + 9deg)) rotateY(calc(var(--ry, -25deg) + 14deg)); }
}

.cubes-container :deep(.cube) {
  width: var(--size, 60px);
  height: var(--size, 60px);
  transform-style: preserve-3d;
  will-change: transform;
  animation: cube-spin var(--spin-dur, 20s) linear infinite;
  animation-direction: var(--spin-dir, normal);
}

@keyframes cube-spin {
  from { transform: rotateX(0deg) rotateY(0deg); }
  to { transform: rotateX(360deg) rotateY(360deg); }
}

.cubes-container :deep(.cube__face) {
  position: absolute;
  width: 100%;
  height: 100%;
  border: 1px solid rgba(255, 255, 255, 0.6);
  backface-visibility: visible;
}

.cubes-container :deep(.cube__face--front) { transform: translateZ(calc(var(--size, 60px) / 2)); background: linear-gradient(135deg, rgba(255,255,255,0.85), rgba(191,219,254,0.7)); }
.cubes-container :deep(.cube__face--back) { transform: rotateY(180deg) translateZ(calc(var(--size, 60px) / 2)); background: linear-gradient(135deg, rgba(147,197,253,0.6), rgba(59,130,246,0.35)); }
.cubes-container :deep(.cube__face--right) { transform: rotateY(90deg) translateZ(calc(var(--size, 60px) / 2)); background: linear-gradient(135deg, rgba(219,234,254,0.8), rgba(96,165,250,0.45)); }
.cubes-container :deep(.cube__face--left) { transform: rotateY(-90deg) translateZ(calc(var(--size, 60px) / 2)); background: linear-gradient(135deg, rgba(191,219,254,0.75), rgba(37,99,235,0.3)); }
.cubes-container :deep(.cube__face--top) { transform: rotateX(90deg) translateZ(calc(var(--size, 60px) / 2)); background: linear-gradient(135deg, rgba(255,255,255,0.95), rgba(219,234,254,0.8)); }
.cubes-container :deep(.cube__face--bottom) { transform: rotateX(-90deg) translateZ(calc(var(--size, 60px) / 2)); background: linear-gradient(135deg, rgba(59,130,246,0.25), rgba(30,64,175,0.2)); }

.iso-block {
  position: absolute;
  opacity: 0.55;
  animation: iso-float 10s ease-in-out infinite;
}

@keyframes iso-float {
  0%, 100% { transform: translateY(0); }
  50% { transform: translateY(-12px); }
}

.tech-line {
  position: fixed;
  bottom: 0;
  left: 0;
  right: 0;
  height: 3px;
  background: linear-gradient(90deg, transparent, #60a5fa, #3b82f6, #60a5fa, transparent);
  opacity: 0.5;
  z-index: 5;
  pointer-events: none;
}
</style>
