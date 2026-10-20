import { prefersReducedMotion } from '../../motion'

// ─── Shared helpers for the Hidden Choices demos ──────────────────────────────

export const COLOR = {
  euc:   '#4ade80',
  cos:   '#5eead4',
  ang:   '#f59e0b',
  faint: '#30363d',
  grid:  '#21262d',
  text:  '#c9d1d9',
  dim:   '#8b949e',
}

/** Seeded PRNG (mulberry32), so a demo's random draws repeat after Reset with the same seed. */
export function rng(seed: number): () => number {
  let a = seed >>> 0
  return () => {
    a = (a + 0x6d2b79f5) >>> 0
    let t = a
    t = Math.imul(t ^ (t >>> 15), t | 1)
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61)
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

export interface Surface { ctx: CanvasRenderingContext2D; w: number; h: number }

/** Size a canvas to its CSS box at device pixel ratio; calls onResize after each change. */
export function surface(canvas: HTMLCanvasElement, onResize: (s: Surface) => void): Surface {
  const ctx = canvas.getContext('2d')!
  const s: Surface = { ctx, w: 0, h: 0 }
  const fit = (notify = true) => {
    const r = canvas.getBoundingClientRect()
    const dpr = Math.min(window.devicePixelRatio || 1, 2)
    s.w = Math.max(1, r.width); s.h = Math.max(1, r.height)
    canvas.width = Math.round(s.w * dpr); canvas.height = Math.round(s.h * dpr)
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
    if (notify) onResize(s)
  }
  // Size now without calling back (the caller hasn't stored the surface yet); repaint on later resizes
  fit(false)
  new ResizeObserver(() => fit()).observe(canvas)
  return s
}

/**
 * Animation loop that only runs while the demo is on screen, the tab is visible
 * and the visitor hasn't paused it. With reduced motion it never starts on its
 * own; the caller draws a static frame instead, and Play still works.
 */
export class Loop {
  private wanted: boolean
  private visible = false
  private raf = 0
  private last = 0

  constructor(private root: HTMLElement, private frame: (dt: number) => void) {
    this.wanted = !prefersReducedMotion()
    new IntersectionObserver(([e]) => { this.visible = e.isIntersecting; this.sync() }, { threshold: 0.1 }).observe(root)
    document.addEventListener('visibilitychange', () => this.sync())
    const btn = root.querySelector<HTMLButtonElement>('[data-action="play"]')
    btn?.addEventListener('click', () => { this.wanted = !this.wanted; this.sync() })
    this.label()
  }

  get playing(): boolean { return this.raf !== 0 }

  /** Stop until the visitor presses Play again (used when they take over a control). */
  pause(): void { this.wanted = false; this.sync() }

  private sync(): void {
    const run = this.wanted && this.visible && !document.hidden
    if (run && !this.raf) {
      this.last = performance.now()
      const tick = (now: number) => {
        const dt = Math.min(0.05, (now - this.last) / 1000)
        this.last = now
        this.frame(dt)
        this.raf = requestAnimationFrame(tick)
      }
      this.raf = requestAnimationFrame(tick)
    } else if (!run && this.raf) {
      cancelAnimationFrame(this.raf); this.raf = 0
    }
    this.label()
  }

  private label(): void {
    const btn = this.root.querySelector<HTMLButtonElement>('[data-action="play"]')
    if (!btn) return
    btn.textContent = this.wanted ? 'Pause' : 'Play'
    btn.setAttribute('aria-pressed', String(this.wanted))
  }
}

/** Ease from 0 to 1 over `ms`, calling `step(k)` each frame; jumps straight to 1 with reduced motion. */
export function tween(ms: number, step: (k: number) => void): void {
  if (prefersReducedMotion()) { step(1); return }
  const t0 = performance.now()
  const f = (now: number) => {
    const p = Math.min(1, (now - t0) / ms)
    step(0.5 - 0.5 * Math.cos(p * Math.PI))
    if (p < 1) requestAnimationFrame(f)
  }
  requestAnimationFrame(f)
}

export const pct = (x: number): string => `${Math.round(x * 100)}%`

/** Distance helpers on plain number arrays. */
export function euclid(a: number[], b: number[]): number {
  let s = 0
  for (let i = 0; i < a.length; i++) { const d = a[i] - b[i]; s += d * d }
  return Math.sqrt(s)
}
export function cosSim(a: number[], b: number[]): number {
  let ab = 0, aa = 0, bb = 0
  for (let i = 0; i < a.length; i++) { ab += a[i] * b[i]; aa += a[i] * a[i]; bb += b[i] * b[i] }
  return aa && bb ? ab / Math.sqrt(aa * bb) : 1
}
