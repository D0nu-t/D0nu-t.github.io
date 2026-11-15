import { surface, type Surface } from '../papers/hidden-choices/common'

// ─── Point-cloud view ──────────────────────────────────────────────────────────
// Draws a dim background cloud and a set of highlighted points in the same
// space, rotated and projected onto a 2-D canvas. It knows nothing about
// neurons or simulations: callers hand it points, colours and "these just
// fired", so it can show any brain, circuit or recording.

export interface Link { to: number; strength: number; outgoing: boolean }

const SPAN = 32000          // coordinates are Int16 in roughly [-SPAN, SPAN]
const CAMERA = SPAN * 4.5   // camera distance, for a mild perspective

export class CloudView {
  yaw = 0
  pitch = -0.12
  /** Which highlighted point is selected, or -1. */
  pinned = -1
  links: Link[] = []

  private s: Surface
  private glow: Float32Array
  private sx: Float32Array
  private sy: Float32Array
  private depth: Float32Array
  private crossed: Uint8Array
  private ringed: Uint8Array
  private readonly count: number
  private disposed = false

  constructor(
    canvas: HTMLCanvasElement,
    private background: Int16Array,
    private points: Int16Array,
    private colours: string[],
  ) {
    this.count = points.length / 3
    this.glow = new Float32Array(this.count)
    this.sx = new Float32Array(this.count)
    this.sy = new Float32Array(this.count)
    this.depth = new Float32Array(this.count)
    this.crossed = new Uint8Array(this.count)
    this.ringed = new Uint8Array(this.count)
    this.s = surface(canvas, () => { if (!this.disposed) this.draw(1) })
  }

  /** Stop answering canvas resizes (call before replacing this view with another on the same canvas). */
  dispose(): void { this.disposed = true }

  /** Points drawn with a ring (stimulus and readout neurons). */
  ring(indices: number[]): void { for (const i of indices) this.ringed[i] = 1 }
  /** Points drawn crossed out (silenced neurons). */
  cross(i: number, on: boolean): void { this.crossed[i] = on ? 1 : 0 }
  /** Light up points that just fired. */
  flash(indices: number[]): void { for (const i of indices) this.glow[i] = 1 }
  calm(): void { this.glow.fill(0) }

  /** The highlighted point nearest to a canvas position, or -1 if none is within `reach` pixels. */
  pick(x: number, y: number, reach: number): number {
    let best = -1, bestD = reach * reach
    for (let i = 0; i < this.count; i++) {
      const dx = this.sx[i] - x, dy = this.sy[i] - y, d = dx * dx + dy * dy
      if (d < bestD) { bestD = d; best = i }
    }
    return best
  }

  draw(fade = 0.86): void {
    const { ctx, w, h } = this.s
    const cy = Math.cos(this.yaw), sy = Math.sin(this.yaw)
    const cp = Math.cos(this.pitch), sp = Math.sin(this.pitch)
    // fit the brain's width; it is about twice as wide as it is tall
    const scale = Math.min(w * 0.47, h * 0.95) / SPAN
    const ox = w / 2, oy = h / 2

    ctx.globalCompositeOperation = 'source-over'
    ctx.globalAlpha = 1
    ctx.fillStyle = '#0d1117'
    ctx.fillRect(0, 0, w, h)

    // background cloud: two depth bands so the far side reads as further away
    const bg = this.background
    for (let band = 0; band < 2; band++) {
      ctx.fillStyle = band ? '#7d9a8c' : '#4a5f55'
      ctx.globalAlpha = band ? 0.5 : 0.32
      const size = band ? 1.4 : 1.1
      for (let k = 0; k < bg.length; k += 3) {
        const x = bg[k], y = bg[k + 1], z = bg[k + 2]
        const x1 = x * cy + z * sy, z1 = z * cy - x * sy
        const y1 = y * cp - z1 * sp, z2 = z1 * cp + y * sp
        if ((z2 > 0 ? 1 : 0) !== band) continue
        const f = CAMERA / (CAMERA - z2) * scale
        ctx.fillRect(ox + x1 * f, oy - y1 * f, size, size)
      }
    }

    // highlighted points
    const pts = this.points
    for (let i = 0; i < this.count; i++) {
      const x = pts[3 * i], y = pts[3 * i + 1], z = pts[3 * i + 2]
      const x1 = x * cy + z * sy, z1 = z * cy - x * sy
      const y1 = y * cp - z1 * sp, z2 = z1 * cp + y * sp
      const f = CAMERA / (CAMERA - z2) * scale
      this.sx[i] = ox + x1 * f; this.sy[i] = oy - y1 * f; this.depth[i] = z2
    }

    if (this.pinned >= 0) {
      ctx.lineWidth = 1
      for (const l of this.links) {
        ctx.globalAlpha = 0.25 + 0.55 * l.strength
        ctx.strokeStyle = l.outgoing ? '#5eead4' : '#c4b5fd'
        ctx.beginPath()
        ctx.moveTo(this.sx[this.pinned], this.sy[this.pinned])
        ctx.lineTo(this.sx[l.to], this.sy[l.to])
        ctx.stroke()
      }
    }

    for (let i = 0; i < this.count; i++) {
      const gl = this.glow[i], x = this.sx[i], y = this.sy[i]
      const near = 0.75 + 0.25 * Math.max(-1, Math.min(1, this.depth[i] / SPAN))
      ctx.globalCompositeOperation = 'source-over'
      ctx.globalAlpha = (this.crossed[i] ? 0.35 : 0.55) * near + gl * 0.45
      ctx.fillStyle = this.colours[i]
      ctx.beginPath(); ctx.arc(x, y, 1.9 + gl * 1.6, 0, Math.PI * 2); ctx.fill()
      if (gl > 0.08) {
        ctx.globalCompositeOperation = 'lighter'
        ctx.globalAlpha = gl * 0.28
        ctx.beginPath(); ctx.arc(x, y, 4 + gl * 7, 0, Math.PI * 2); ctx.fill()
        ctx.globalCompositeOperation = 'source-over'
      }
      if (this.ringed[i]) {
        ctx.globalAlpha = 0.9; ctx.strokeStyle = this.colours[i]; ctx.lineWidth = 1
        ctx.beginPath(); ctx.arc(x, y, 4.5, 0, Math.PI * 2); ctx.stroke()
      }
      if (this.crossed[i]) {
        ctx.globalAlpha = 1; ctx.strokeStyle = '#f87171'; ctx.lineWidth = 1.5
        ctx.beginPath(); ctx.moveTo(x - 4, y - 4); ctx.lineTo(x + 4, y + 4); ctx.moveTo(x + 4, y - 4); ctx.lineTo(x - 4, y + 4); ctx.stroke()
      }
      this.glow[i] = gl * fade
    }

    if (this.pinned >= 0) {
      ctx.globalAlpha = 1; ctx.strokeStyle = '#e6f3ef'; ctx.lineWidth = 1.5
      ctx.beginPath(); ctx.arc(this.sx[this.pinned], this.sy[this.pinned], 8, 0, Math.PI * 2); ctx.stroke()
    }
    ctx.globalAlpha = 1
  }
}
