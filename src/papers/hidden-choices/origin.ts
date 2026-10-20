import { COLOR, Loop, surface, tween, type Surface } from './common'

// Demo 2: an angular gate measures direction from the origin, so moving the
// origin changes its verdict while the Euclidean distance stays the same.
// Second panel: trust shrinks each agent's perceived policy toward a target;
// toward the corner, distrustful agents end up much further from trusting ones.

type V = [number, number]
const A: V = [0.78, 0.42], B: V = [0.52, 0.74]
const COS_EPS = 0.12
const POLICY: V = [0.72, 0.62]
const TRUST = [0.15, 0.35, 0.55, 0.75, 0.95]
const CORNER: V = [0, 0], CENTRE: V = [0.5, 0.5]

const sub = (a: V, b: V): V => [a[0] - b[0], a[1] - b[1]]
const ang = (v: V) => Math.atan2(v[1], v[0])
const lerp = (a: number, b: number, t: number) => a + (b - a) * t

function angleBetween(o: V, a: V, b: V): number {
  const u = sub(a, o), v = sub(b, o)
  const c = (u[0] * v[0] + u[1] * v[1]) / (Math.hypot(...u) * Math.hypot(...v) || 1)
  return Math.acos(Math.max(-1, Math.min(1, c)))
}

export function initOrigin(root: HTMLElement): void {
  const o: V = [0, 0]
  let target: V = CORNER
  let shownTarget: V = [...CORNER]
  let t = 0

  const ox = root.querySelector<HTMLInputElement>('input[name="ox"]')!
  const oy = root.querySelector<HTMLInputElement>('input[name="oy"]')!
  const out = (k: string) => root.querySelector<HTMLElement>(`[data-out="${k}"]`)!

  const gateS = surface(root.querySelector<HTMLCanvasElement>('canvas[data-panel="gate"]')!, s => paintGate(s))
  const trustS = surface(root.querySelector<HTMLCanvasElement>('canvas[data-panel="trust"]')!, s => paintTrust(s))

  const frame = (s: Surface) => {
    const pad = 16, side = Math.min(s.w, s.h) - 2 * pad
    const x0 = (s.w - side) / 2, y0 = (s.h - side) / 2
    return { X: (v: number) => x0 + v * side, Y: (v: number) => y0 + (1 - v) * side, x0, y0, side }
  }

  function box(s: Surface, f: ReturnType<typeof frame>): void {
    const { ctx } = s
    ctx.clearRect(0, 0, s.w, s.h)
    ctx.strokeStyle = COLOR.grid; ctx.lineWidth = 1
    ctx.strokeRect(f.x0, f.y0, f.side, f.side)
  }

  function dot(ctx: CanvasRenderingContext2D, x: number, y: number, r: number, c: string): void {
    ctx.beginPath(); ctx.arc(x, y, r, 0, Math.PI * 2); ctx.fillStyle = c; ctx.fill()
  }

  function paintGate(s: Surface): void {
    const f = frame(s), { ctx } = s
    box(s, f)
    // Euclidean distance: the segment A–B (unchanged by the origin)
    ctx.strokeStyle = COLOR.euc; ctx.lineWidth = 2; ctx.setLineDash([5, 4])
    ctx.beginPath(); ctx.moveTo(f.X(A[0]), f.Y(A[1])); ctx.lineTo(f.X(B[0]), f.Y(B[1])); ctx.stroke()
    ctx.setLineDash([])
    // rays from the origin and the angle between them
    const th = angleBetween(o, A, B), pass = 1 - Math.cos(th) <= COS_EPS
    ctx.strokeStyle = pass ? COLOR.cos : COLOR.dim; ctx.lineWidth = 1.5
    for (const p of [A, B]) { ctx.beginPath(); ctx.moveTo(f.X(o[0]), f.Y(o[1])); ctx.lineTo(f.X(p[0]), f.Y(p[1])); ctx.stroke() }
    const a1 = -ang(sub(A, o)), a2 = -ang(sub(B, o))
    ctx.beginPath(); ctx.arc(f.X(o[0]), f.Y(o[1]), 26, Math.min(a1, a2), Math.max(a1, a2)); ctx.stroke()
    dot(ctx, f.X(A[0]), f.Y(A[1]), 6, COLOR.text)
    dot(ctx, f.X(B[0]), f.Y(B[1]), 6, COLOR.text)
    dot(ctx, f.X(o[0]), f.Y(o[1]), 7, COLOR.ang)
    ctx.fillStyle = COLOR.text; ctx.font = '12px "IBM Plex Mono", monospace'
    ctx.fillText('A', f.X(A[0]) + 9, f.Y(A[1]) + 4); ctx.fillText('B', f.X(B[0]) + 9, f.Y(B[1]) + 4)
    ctx.fillStyle = COLOR.ang; ctx.fillText('origin', f.X(o[0]) + 10, f.Y(o[1]) - 8)

    out('euc').textContent = Math.hypot(...sub(A, B)).toFixed(3)
    out('angle').textContent = `${(th * 180 / Math.PI).toFixed(1)}°`
    out('cos').textContent = (1 - Math.cos(th)).toFixed(3)
    out('verdict').textContent = pass ? 'the pair converses' : 'the pair is blocked'
  }

  function paintTrust(s: Surface): void {
    const f = frame(s), { ctx } = s
    box(s, f)
    dot(ctx, f.X(POLICY[0]), f.Y(POLICY[1]), 7, COLOR.euc)
    ctx.fillStyle = COLOR.euc; ctx.font = '12px "IBM Plex Mono", monospace'
    ctx.fillText('policy', f.X(POLICY[0]) + 10, f.Y(POLICY[1]) - 8)
    dot(ctx, f.X(shownTarget[0]), f.Y(shownTarget[1]), 6, COLOR.ang)
    ctx.fillStyle = COLOR.ang; ctx.fillText('trust target', f.X(shownTarget[0]) + 9, f.Y(shownTarget[1]) - 8)
    // the line along which trust moves the perceived policy
    ctx.strokeStyle = COLOR.faint; ctx.lineWidth = 1
    ctx.beginPath(); ctx.moveTo(f.X(shownTarget[0]), f.Y(shownTarget[1])); ctx.lineTo(f.X(POLICY[0]), f.Y(POLICY[1])); ctx.stroke()
    const pts = TRUST.map(tau => [lerp(shownTarget[0], POLICY[0], tau), lerp(shownTarget[1], POLICY[1], tau)] as V)
    pts.forEach((p, k) => {
      ctx.globalAlpha = 0.35 + 0.65 * TRUST[k]
      dot(ctx, f.X(p[0]), f.Y(p[1]), 5, COLOR.cos)
      ctx.globalAlpha = 1
    })
    // gap between the least and the most trusting agent's perceived policy
    out('spread').textContent = Math.hypot(...sub(pts[0], pts[pts.length - 1])).toFixed(2)
  }

  const setOrigin = (x: number, y: number) => {
    o[0] = Math.max(0, Math.min(1, x)); o[1] = Math.max(0, Math.min(1, y))
    ox.value = String(o[0]); oy.value = String(o[1])
    paintGate(gateS)
  }

  // Play: the origin tours from the corner to the centre and back
  const loop = new Loop(root, dt => {
    t += dt * 0.25
    const k = 0.5 - 0.5 * Math.cos(t * Math.PI)
    setOrigin(lerp(0, 0.5, k), lerp(0, 0.5, k))
  })

  ox.addEventListener('input', () => { loop.pause(); setOrigin(+ox.value, o[1]) })
  oy.addEventListener('input', () => { loop.pause(); setOrigin(o[0], +oy.value) })
  root.querySelectorAll<HTMLButtonElement>('[data-origin]').forEach(b => b.addEventListener('click', () => {
    loop.pause()
    const v = b.dataset.origin === 'centre' ? 0.5 : 0, from: V = [o[0], o[1]]
    tween(600, k => setOrigin(lerp(from[0], v, k), lerp(from[1], v, k)))
  }))
  root.querySelectorAll<HTMLButtonElement>('[data-target]').forEach(b => b.addEventListener('click', () => {
    target = b.dataset.target === 'centre' ? CENTRE : CORNER
    root.querySelectorAll('[data-target]').forEach(x => x.setAttribute('aria-pressed', String(x === b)))
    const from: V = [...shownTarget]
    tween(700, k => { shownTarget = [lerp(from[0], target[0], k), lerp(from[1], target[1], k)]; paintTrust(trustS) })
  }))

  // Drag the origin on the canvas
  const canvas = root.querySelector<HTMLCanvasElement>('canvas[data-panel="gate"]')!
  const move = (e: PointerEvent) => {
    const r = canvas.getBoundingClientRect(), f = frame(gateS)
    setOrigin((e.clientX - r.left - f.x0) / f.side, 1 - (e.clientY - r.top - f.y0) / f.side)
  }
  canvas.addEventListener('pointerdown', e => { loop.pause(); canvas.setPointerCapture(e.pointerId); move(e) })
  canvas.addEventListener('pointermove', e => { if (canvas.hasPointerCapture(e.pointerId)) move(e) })

  setOrigin(0, 0); paintTrust(trustS)
}
