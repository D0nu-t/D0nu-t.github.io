import { surface, type Surface } from '../papers/hidden-choices/common'

// ─── A graph drawn as a 3-D cloud ──────────────────────────────────────────────
// Nodes, their links, and an optional marker that travels between them. It knows
// nothing about what the nodes mean: callers set colours, sizes, labels, which
// nodes are lit or faded, a halo strength per node and which nodes are spent.
// Used by the skills graph (home and fullscreen pages) and the fly brain page.

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
  /** True while the marker is travelling (its ring turns faster). */
  flying = false
  /** When set, only these nodes are drawn at full strength and named; the rest fade back. */
  lit: Set<number> | null = null
  /** 1 per node to fade it regardless of `lit` (a category filter, say). */
  readonly faded: Uint8Array
  /** Node under the pointer, or -1; it gets a name. */
  hover = -1
  /** Magnification; 1 fits the whole cloud. */
  zoom = 1
  /** The point the view looks at, in the cloud's own coordinates. */
  centre: [number, number, number] = [0, 0, 0]

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
    this.faded = new Uint8Array(this.count)
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

  /** The yaw and pitch that bring node i to the front, facing the viewer. */
  facing(i: number): [number, number] {
    const [x, y, z] = this.position(i)
    return [Math.atan2(-x, z), Math.max(-1.1, Math.min(1.1, Math.atan2(y, Math.hypot(x, z))))]
  }

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
    // sized so that the whole cloud stays on the canvas at any angle (near nodes are drawn larger)
    const fit = this.zoom * Math.min(w / 3.1, h / 2.7) / SPAN, ox = w / 2, oy = h / 2 + 6
    const [lx, ly, lz] = this.centre
    const project = (px: number, py: number, pz: number): [number, number, number, number] => {
      const x = px - lx, y = py - ly, z = pz - lz
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
      const quiet = this.faded[a] || this.faded[b] || (this.lit !== null && !(this.lit.has(a) && this.lit.has(b)))
      ctx.globalAlpha = quiet ? 0.035 : hot ? 0.5 : 0.1
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
      const back = this.faded[i] || (this.lit !== null && !this.lit.has(i)) ? 0.22 : 1

      if (back === 1 && state === 0 && this.halo[i] > 0.02) {
        ctx.globalCompositeOperation = 'lighter'
        ctx.globalAlpha = 0.03 + 0.16 * this.halo[i] ** 2
        ctx.fillStyle = colour
        ctx.beginPath(); ctx.arc(x, y, r + 2 + 6 * this.halo[i], 0, Math.PI * 2); ctx.fill()
        ctx.globalCompositeOperation = 'source-over'
      }
      if (state === 1) {
        // picked up: a bright ring with a hollow middle
        ctx.globalAlpha = 0.95 * near * back; ctx.strokeStyle = colour; ctx.lineWidth = 2
        ctx.beginPath(); ctx.arc(x, y, r + 1.5, 0, Math.PI * 2); ctx.stroke()
        ctx.globalAlpha = 0.9; ctx.fillStyle = '#0d1117'
        ctx.beginPath(); ctx.arc(x, y, Math.max(1, r - 0.5), 0, Math.PI * 2); ctx.fill()
      } else {
        ctx.globalAlpha = (state === 2 ? 0.3 : 0.9) * near * back
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

    // labels. Strong: the node in focus, the selected one and the one under the pointer.
    // Then, where there is room and nearest first: the lit set if there is one, else the
    // headline nodes. A label that would cover another is tried below its node, then dropped.
    const boxes: [number, number, number, number][] = []
    const label = (i: number, level: 0 | 1 | 2): void => {
      const text = this.labels[i], size = level === 2 ? 12 : level === 1 ? 10.5 : 10
      ctx.font = `${level === 2 ? 600 : 400} ${size}px 'IBM Plex Mono', monospace`
      const tw = ctx.measureText(text).width, r = this.sizes[i] * this.scaleAt[i]
      const x = Math.max(tw / 2 + 4, Math.min(w - tw / 2 - 4, this.sx[i]))
      const above = Math.max(size + 2, this.sy[i] - r - (i === this.focus && this.marker ? 22 : 7))
      const below = Math.min(h - 4, this.sy[i] + r + size + 4)
      let placed: [number, number, number, number] | null = null, y = above
      for (const tryY of level === 0 ? [above] : [above, below]) {
        const box: [number, number, number, number] = [x - tw / 2 - 3, tryY - size, x + tw / 2 + 3, tryY + 3]
        if (level === 2 || !boxes.some(b => box[0] < b[2] && box[2] > b[0] && box[1] < b[3] && box[3] > b[1])) { placed = box; y = tryY; break }
      }
      if (!placed) return
      boxes.push(placed)
      if (level > 0) { ctx.globalAlpha = level === 2 ? 0.85 : 0.6; ctx.fillStyle = '#0d1117'; ctx.fillRect(placed[0], placed[1] - 1, placed[2] - placed[0], placed[3] - placed[1] + 2) }
      ctx.globalAlpha = level === 2 ? 1 : level === 1 ? 0.95 : 0.7
      ctx.fillStyle = level === 2 ? '#e6f3ef' : '#c9d1d9'
      ctx.textAlign = 'center'
      ctx.fillText(text, x, y)
    }
    const strong = [...new Set([this.focus, this.pinned, this.hover])].filter(i => i >= 0)
    for (const i of strong) label(i, 2)
    if (showAll || this.lit) for (let k = this.order.length - 1; k >= 0; k--) {
      const i = this.order[k]
      if (strong.includes(i) || this.faded[i]) continue
      if (this.lit ? this.lit.has(i) : this.alwaysLabelled.has(i)) label(i, this.lit ? 1 : 0)
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
      ctx.fillStyle = '#5eead4'
      ctx.beginPath(); ctx.arc(x, y, 1.3, 0, Math.PI * 2); ctx.fill()
    })
    // the crawler: a targeting ring centred on its node, turning faster while it travels
    const [mx, my] = project(...this.marker)
    const turn = this.clock * (this.flying ? 5 : 1.2)
    const pulse = this.flying ? 0 : 1.5 * Math.sin(this.clock * 4)
    ctx.strokeStyle = '#5eead4'; ctx.lineWidth = 1.6; ctx.globalAlpha = 0.95
    ctx.setLineDash([5, 4]); ctx.lineDashOffset = -turn * 6
    ctx.beginPath(); ctx.arc(mx, my, 12 + pulse, 0, Math.PI * 2); ctx.stroke()
    ctx.setLineDash([])
    // four corner brackets
    ctx.lineWidth = 2
    for (let c = 0; c < 4; c++) {
      const a0 = turn * 0.5 + c * Math.PI / 2
      ctx.beginPath(); ctx.arc(mx, my, 17, a0 - 0.28, a0 + 0.28); ctx.stroke()
    }
    // a small diamond at the centre
    ctx.globalAlpha = 1; ctx.fillStyle = '#e6f3ef'
    ctx.beginPath(); ctx.moveTo(mx, my - 3.5); ctx.lineTo(mx + 3.5, my); ctx.lineTo(mx, my + 3.5); ctx.lineTo(mx - 3.5, my); ctx.closePath(); ctx.fill()
  }
}
