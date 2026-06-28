import { useEffect, useRef } from 'react'
import Delaunator from 'delaunator'

const HUE = 213
const SAT = 96
const BASE_L = 10
const MAX_BRIGHT = 65

const FILL_BASE = `hsl(${HUE},${SAT}%,${BASE_L}%)`
const STROKE_BASE = `hsl(${HUE},40%,${BASE_L + 6}%)`

const SPRING = 0.022
const DAMPING = 0.86
const CURSOR_PUSH_R = 155
const CURSOR_FORCE = 0.6
const WAVE_SPEED = 0.00075
const WAVE_AMP = 8

const CURSOR_COLOR_R = 40
const CR2 = CURSOR_COLOR_R * CURSOR_COLOR_R

const TRAIL_MAX_AGE = 1400  // ms — how long the wake persists
const TRAIL_MIN_DIST2 = 12 * 12  // px² — minimum movement to record a trail point
const CURSOR_FADE_OUT = 320  // ms — how fast the cursor highlight dies when stopped

const POISSON_R = 26  // min distance between interior points (controls triangle size uniformity)
const N_EDGE = 13

interface Pt {
  x: number; y: number
  vx: number; vy: number
  hx: number; hy: number
  fixed: boolean
}

interface TrailPt { x: number; y: number; t: number }

// Bridson's Poisson disk sampling — produces uniformly-spaced random points
function poissonDisk(w: number, h: number, r: number): [number, number][] {
  const k = 30
  const cellSize = r / Math.SQRT2
  const gw = Math.ceil(w / cellSize) + 1
  const gh = Math.ceil(h / cellSize) + 1
  const grid = new Int32Array(gw * gh).fill(-1)
  const pts: [number, number][] = []
  const active: number[] = []

  const add = (x: number, y: number) => {
    const idx = pts.length
    pts.push([x, y])
    grid[Math.floor(y / cellSize) * gw + Math.floor(x / cellSize)] = idx
    active.push(idx)
  }

  add(w / 2, h / 2)

  while (active.length > 0) {
    const ai = Math.floor(Math.random() * active.length)
    const [px, py] = pts[active[ai]]
    let placed = false

    for (let attempt = 0; attempt < k; attempt++) {
      const angle = Math.random() * Math.PI * 2
      const d = r * (1 + Math.random())
      const nx = px + Math.cos(angle) * d
      const ny = py + Math.sin(angle) * d
      if (nx < 0 || nx >= w || ny < 0 || ny >= h) continue

      const gx = Math.floor(nx / cellSize)
      const gy = Math.floor(ny / cellSize)
      let valid = true

      outer: for (let dy = -2; dy <= 2; dy++) {
        for (let dx = -2; dx <= 2; dx++) {
          const bx = gx + dx, by = gy + dy
          if (bx < 0 || bx >= gw || by < 0 || by >= gh) continue
          const ni = grid[by * gw + bx]
          if (ni < 0) continue
          const [ex, ey] = pts[ni]
          if ((nx - ex) * (nx - ex) + (ny - ey) * (ny - ey) < r * r) {
            valid = false; break outer
          }
        }
      }

      if (valid) { add(nx, ny); placed = true; break }
    }

    if (!placed) active.splice(ai, 1)
  }

  return pts
}

function makePoints(w: number, h: number): Pt[] {
  const pts: Pt[] = []

  const addFixed = (hx: number, hy: number) =>
    pts.push({ x: hx, y: hy, vx: 0, vy: 0, hx, hy, fixed: true })

  const addFree = (hx: number, hy: number) =>
    pts.push({ x: hx, y: hy, vx: 0, vy: 0, hx, hy, fixed: false })

  addFixed(0, 0); addFixed(w, 0); addFixed(0, h); addFixed(w, h)
  for (let i = 1; i < N_EDGE; i++) {
    const t = i / N_EDGE
    addFixed(t * w, 0); addFixed(t * w, h)
    addFixed(0, t * h); addFixed(w, t * h)
  }

  for (const [hx, hy] of poissonDisk(w, h, POISSON_R)) {
    addFree(hx, hy)
  }

  return pts
}

export default function PolyWater() {
  const canvasRef = useRef<HTMLCanvasElement>(null)

  useEffect(() => {
    const canvas = canvasRef.current!
    const ctx = canvas.getContext('2d')!

    let w = 0, h = 0
    let pts: Pt[] = []
    let triIdx: Uint32Array = new Uint32Array()
    let raf = 0
    const mouse = { x: -9999, y: -9999 }
    const trail: TrailPt[] = []
    let lastTX = -9999, lastTY = -9999
    let lastMoveTime = -CURSOR_FADE_OUT * 2

    function init() {
      w = window.innerWidth
      h = window.innerHeight
      canvas.width = w
      canvas.height = h
      pts = makePoints(w, h)
      triIdx = Delaunator.from(pts, p => p.hx, p => p.hy).triangles
    }

    function frame(ts: number) {
      const t = ts * WAVE_SPEED

      // Age out old trail points
      while (trail.length > 0 && ts - trail[0].t > TRAIL_MAX_AGE) trail.shift()

      // Physics
      for (const p of pts) {
        if (p.fixed) continue

        const wx = Math.sin(t + p.hy * 0.0045) * WAVE_AMP
        const wy = Math.cos(t * 1.4 + p.hx * 0.005) * WAVE_AMP * 0.6

        p.vx += (p.hx + wx - p.x) * SPRING
        p.vy += (p.hy + wy - p.y) * SPRING

        const dx = p.x - mouse.x
        const dy = p.y - mouse.y
        const d2 = dx * dx + dy * dy
        if (d2 < CURSOR_PUSH_R * CURSOR_PUSH_R && d2 > 0.01) {
          const d = Math.sqrt(d2)
          const f = (1 - d / CURSOR_PUSH_R) * CURSOR_FORCE
          p.vx += (dx / d) * f
          p.vy += (dy / d) * f
        }

        p.vx *= DAMPING
        p.vy *= DAMPING
        p.x += p.vx
        p.y += p.vy
      }

      ctx.fillStyle = FILL_BASE
      ctx.fillRect(0, 0, w, h)
      ctx.lineWidth = 0.5

      const n = triIdx.length
      for (let i = 0; i < n; i += 3) {
        const p0 = pts[triIdx[i]]
        const p1 = pts[triIdx[i + 1]]
        const p2 = pts[triIdx[i + 2]]

        const cx = (p0.x + p1.x + p2.x) / 3
        const cy = (p0.y + p1.y + p2.y) / 3

        // Max influence from current cursor (fades when stopped) + trail history
        let infl = 0

        const cursorFade = Math.max(0, 1 - (ts - lastMoveTime) / CURSOR_FADE_OUT)
        if (cursorFade > 0 && mouse.x > -100) {
          const cdx = mouse.x - cx, cdy = mouse.y - cy
          const cd2 = cdx * cdx + cdy * cdy
          if (cd2 < CR2) {
            const v = cursorFade * Math.pow(1 - Math.sqrt(cd2) / CURSOR_COLOR_R, 1.5)
            if (v > infl) infl = v
          }
        }

        for (let j = trail.length - 1; j >= 0; j--) {
          const tp = trail[j]
          const tdx = tp.x - cx, tdy = tp.y - cy
          const td2 = tdx * tdx + tdy * tdy
          if (td2 < CR2) {
            const ageFade = 1 - (ts - tp.t) / TRAIL_MAX_AGE
            const v = ageFade * Math.pow(1 - Math.sqrt(td2) / CURSOR_COLOR_R, 1.5)
            if (v > infl) infl = v
          }
        }

        ctx.beginPath()
        ctx.moveTo(p0.x, p0.y)
        ctx.lineTo(p1.x, p1.y)
        ctx.lineTo(p2.x, p2.y)
        ctx.closePath()

        if (infl > 0.005) {
          const L = BASE_L + infl * MAX_BRIGHT
          ctx.fillStyle = `hsl(${HUE},${SAT}%,${L}%)`
          ctx.fill()
          ctx.strokeStyle = `hsl(${HUE},40%,${Math.min(L + 7, 80)}%)`
          ctx.stroke()
        } else {
          ctx.fillStyle = FILL_BASE
          ctx.fill()
          ctx.strokeStyle = STROKE_BASE
          ctx.stroke()
        }
      }

      raf = requestAnimationFrame(frame)
    }

    init()
    raf = requestAnimationFrame(frame)

    const onMove = (e: MouseEvent) => {
      mouse.x = e.clientX
      mouse.y = e.clientY
      lastMoveTime = performance.now()
      const dx = e.clientX - lastTX, dy = e.clientY - lastTY
      if (dx * dx + dy * dy > TRAIL_MIN_DIST2) {
        trail.push({ x: e.clientX, y: e.clientY, t: performance.now() })
        lastTX = e.clientX; lastTY = e.clientY
      }
    }

    const onLeave = () => { mouse.x = -9999; mouse.y = -9999 }

    window.addEventListener('mousemove', onMove)
    window.addEventListener('mouseleave', onLeave)
    window.addEventListener('resize', init)

    return () => {
      cancelAnimationFrame(raf)
      window.removeEventListener('mousemove', onMove)
      window.removeEventListener('mouseleave', onLeave)
      window.removeEventListener('resize', init)
    }
  }, [])

  return <canvas ref={canvasRef} className="fixed inset-0 block w-full h-full" />
}
