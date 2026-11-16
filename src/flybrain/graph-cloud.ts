import { surface, type Surface } from '../papers/hidden-choices/common'

// ─── A graph drawn as a 3-D cloud ──────────────────────────────────────────────
// Nodes, their links, and a marker that travels between them. Like the brain's
// CloudView it knows nothing about what the nodes mean: callers set colours,
// sizes, labels, a halo strength per node and which nodes are spent.

const SPAN = 24000
const CAMERA = SPAN * 5

export type Spent = 0 | 1 | 2   // untouched, picked up, tasted and left

export class GraphCloud {
  yaw = 0.4
  pitch = -0.25
  /** Node the visitor selected, or -1. */
  pinned = -1
  /** Node the marker is on or heading for, or -1. */
  focus = -1
  /** 0..1 per node: how strongly it glows (used for perceived sweetness). */
  readonly halo: Float32Array
  readonly spent: Uint8Array
  /** Marker position in the cloud's own coordinates, or null to hide it. */
  marker: [number, number, number] | null = null
  /** True while the marker is travelling (its wings beat). */
  flying = false

  private s: Surface
  private sx: Float32Array
  private sy: Float32Array
  private depth: Float32Array
  private scaleAt: Float32Array
  private flashes: Float32Array
  private order: number[]
  private trail: [number, number, number][] = []
  private clock = 0
  private readonly count: number
  private disposed = false

  constructor(
    canvas: HTMLCanvasElement,
    private points: Int16Array,
    private colours: string[],
    private sizes: Float32Array,
    private edges: [number, number][],
    private labels: string[],
    private alwaysLabelled: Set<number>,
  ) {
    this.count = points.length / 3
    this.halo = new Float32Array(this.count)
    this.spent = new Uint8Array(this.count)
    this.sx = new Float32Array(this.count)
    this.sy = new Float32Array(this.count)
    this.depth = new Float32Array(this.count)
    this.scaleAt = new Float32Array(this.count)
    this.flashes = new Float32Array(this.count)
    this.order = Array.from({ length: this.count }, (_, i) => i)
    this.s = surface(canvas, () => { if (!this.disposed) this.draw(0) })
  }

  dispose(): void { this.disposed = true }
  flash(i: number): void { this.flashes[i] = 1 }
  clearTrail(): void { this.trail = [] }
  position(i: number): [number, number, number] { return [this.points[3 * i], this.points[3 * i + 1], this.points[3 * i + 2]] }

  pick(x: number, y: number, reach: number): number {
    let best = -1, bestD = Infinity
    for (let i = 0; i < this.count; i++) {
      const r = reach + this.sizes[i] * this.scaleAt[i]
      const dx = this.sx[i] - x, dy = this.sy[i] - y, d = dx * dx + dy * dy
      if (d < r * r && d < bestD) { bestD = d; best = i }
    }
    return best
  }

  /** Draw one frame; `dt` (seconds) moves the wing beat and fades flashes. */
  draw(dt: number): void {
    const { ctx, w, h } = this.s
    this.clock += dt
    const cy = Math.cos(this.yaw), sy = Math.sin(this.yaw), cp = Math.cos(this.pitch), sp = Math.sin(this.pitch)
    const fit = Math.min(w / 2.7, h / 2.15) / SPAN, ox = w / 2, oy = h / 2 + 6
    const project = (x: number, y: number, z: number): [number, number, number, number] => {
      const x1 = x * cy + z * sy, z1 = z * cy - x * sy
      const y1 = y * cp - z1 * sp, z2 = z1 * cp + y * sp
      const f = CAMERA / (CAMERA - z2)
      return [ox + x1 * f * fit, oy - y1 * f * fit, z2, f]
    }

    ctx.globalCompositeOperation = 'source-over'
    ctx.globalAlpha = 1
    ctx.fillStyle = '#0d1117'
    ctx.fillRect(0, 0, w, h)

    const p = this.points
    for (let i = 0; i < this.count; i++) {
      const [x, y, z, f] = project(p[3 * i], p[3 * i + 1], p[3 * i + 2])
      this.sx[i] = x; this.sy[i] = y; this.depth[i] = z; this.scaleAt[i] = f
    }

    // links: faint, brighter for the node in focus or selected
    ctx.lineWidth = 1
    for (const [a, b] of this.edges) {
      const hot = a === this.focus || b === this.focus || a === this.pinned || b === this.pinned
      ctx.globalAlpha = hot ? 0.5 : 0.1
      ctx.strokeStyle = hot ? '#bbf7d0' : '#7d9a8c'
      ctx.beginPath(); ctx.moveTo(this.sx[a], this.sy[a]); ctx.lineTo(this.sx[b], this.sy[b]); ctx.stroke()
    }

    // nodes, far ones first so near ones sit on top
    this.order.sort((a, b) => this.depth[a] - this.depth[b])
    const showAll = w >= 420
    for (const i of this.order) {
      const x = this.sx[i], y = this.sy[i], r = this.sizes[i] * this.scaleAt[i]
      const near = 0.7 + 0.3 * Math.max(-1, Math.min(1, this.depth[i] / SPAN))
      const colour = this.colours[i], state = this.spent[i] as Spent

      if (state === 0 && this.halo[i] > 0.02) {
        ctx.globalCompositeOperation = 'lighter'
        ctx.globalAlpha = 0.03 + 0.16 * this.halo[i] ** 2
        ctx.fillStyle = colour
        ctx.beginPath(); ctx.arc(x, y, r + 2 + 6 * this.halo[i], 0, Math.PI * 2); ctx.fill()
        ctx.globalCompositeOperation = 'source-over'
      }
      if (state === 1) {
        // picked up: a bright ring with a hollow middle
        ctx.globalAlpha = 0.95 * near; ctx.strokeStyle = colour; ctx.lineWidth = 2
        ctx.beginPath(); ctx.arc(x, y, r + 1.5, 0, Math.PI * 2); ctx.stroke()
        ctx.globalAlpha = 0.9; ctx.fillStyle = '#0d1117'
        ctx.beginPath(); ctx.arc(x, y, Math.max(1, r - 0.5), 0, Math.PI * 2); ctx.fill()
      } else {
        ctx.globalAlpha = (state === 2 ? 0.3 : 0.9) * near
        ctx.fillStyle = colour
        ctx.beginPath(); ctx.arc(x, y, r, 0, Math.PI * 2); ctx.fill()
      }
      const fl = this.flashes[i]
      if (fl > 0.03) {
        ctx.globalCompositeOperation = 'lighter'
        ctx.globalAlpha = fl * 0.5; ctx.fillStyle = colour
        ctx.beginPath(); ctx.arc(x, y, r + 16 * (1 - fl) + 4, 0, Math.PI * 2); ctx.fill()
        ctx.globalCompositeOperation = 'source-over'
        this.flashes[i] = fl * Math.pow(0.04, dt)
      }
      if (i === this.pinned) {
        ctx.globalAlpha = 1; ctx.strokeStyle = '#e6f3ef'; ctx.lineWidth = 1.5
        ctx.beginPath(); ctx.arc(x, y, r + 5, 0, Math.PI * 2); ctx.stroke()
      }
    }

    // labels: the node in focus and the selected one always; headline nodes only where there is room,
    // nearest first, so the names never pile up
    const boxes: [number, number, number, number][] = []
    const label = (i: number, strong: boolean): void => {
      const text = this.labels[i], size = strong ? 12 : 10
      ctx.font = `${strong ? 600 : 400} ${size}px 'IBM Plex Mono', monospace`
      const tw = ctx.measureText(text).width
      const x = Math.max(tw / 2 + 4, Math.min(w - tw / 2 - 4, this.sx[i]))
      const y = Math.max(size + 2, this.sy[i] - this.sizes[i] * this.scaleAt[i] - (i === this.focus ? 20 : 7))
      const box: [number, number, number, number] = [x - tw / 2 - 3, y - size, x + tw / 2 + 3, y + 3]
      if (!strong && boxes.some(b => box[0] < b[2] && box[2] > b[0] && box[1] < b[3] && box[3] > b[1])) return
      boxes.push(box)
      if (strong) { ctx.globalAlpha = 0.8; ctx.fillStyle = '#0d1117'; ctx.fillRect(box[0], box[1] - 1, box[2] - box[0], box[3] - box[1] + 2) }
      ctx.globalAlpha = strong ? 1 : 0.7
      ctx.fillStyle = strong ? '#e6f3ef' : '#c9d1d9'
      ctx.textAlign = 'center'
      ctx.fillText(text, x, y)
    }
    if (this.focus >= 0) label(this.focus, true)
    if (this.pinned >= 0 && this.pinned !== this.focus) label(this.pinned, true)
    if (showAll) for (let k = this.order.length - 1; k >= 0; k--) {
      const i = this.order[k]
      if (this.alwaysLabelled.has(i) && i !== this.focus && i !== this.pinned) label(i, false)
    }

    this.drawMarker(project, dt)
    ctx.globalAlpha = 1
  }

  private drawMarker(project: (x: number, y: number, z: number) => [number, number, number, number], dt: number): void {
    const { ctx } = this.s
    if (!this.marker) return
    if (dt > 0) {
      this.trail.push([...this.marker])
      if (this.trail.length > 26) this.trail.shift()
    }
    this.trail.forEach(([tx, ty, tz], k) => {
      const [x, y] = project(tx, ty, tz)
      ctx.globalAlpha = 0.5 * (k / this.trail.length) ** 2
      ctx.fillStyle = '#e6f3ef'
      ctx.beginPath(); ctx.arc(x, y - 9, 1.2, 0, Math.PI * 2); ctx.fill()
    })
    const [mx, my0] = project(...this.marker)
    const my = my0 - 9                                   // the fly sits just above its node
    const beat = this.flying ? Math.sin(this.clock * 42) : 0.25
    ctx.globalAlpha = 0.55; ctx.fillStyle = '#c9d1d9'
    for (const side of [-1, 1]) {
      ctx.beginPath()
      ctx.ellipse(mx + side * 4.5, my - 2 - beat * 1.5, 5, 2.2 + beat * 0.8, side * (0.5 + beat * 0.35), 0, Math.PI * 2)
      ctx.fill()
    }
    ctx.globalAlpha = 1; ctx.fillStyle = '#e6f3ef'
    ctx.beginPath(); ctx.ellipse(mx, my, 2.4, 4, 0, 0, Math.PI * 2); ctx.fill()
    ctx.fillStyle = '#f87171'
    ctx.beginPath(); ctx.arc(mx, my - 3.6, 1.6, 0, Math.PI * 2); ctx.fill()
  }
}
