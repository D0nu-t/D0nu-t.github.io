import { prefersReducedMotion } from '../../motion'
import { COLOR, rng, surface } from './common'

// Background of the page header: agents in a 2-D opinion space drift into
// clusters under a bounded-confidence rule (Deffuant), then the field reseeds.

const N = 240
const EPS = 0.16
const MU = 0.04
const PAIRS_PER_FRAME = 90

export function initHero(canvas: HTMLCanvasElement): void {
  let rand = rng(7)
  let xs = new Float32Array(N), ys = new Float32Array(N), glow = new Float32Array(N)
  let age = 0

  const seed = () => {
    for (let i = 0; i < N; i++) { xs[i] = rand(); ys[i] = rand(); glow[i] = 0 }
    age = 0
  }

  const step = () => {
    for (let k = 0; k < PAIRS_PER_FRAME; k++) {
      const i = (rand() * N) | 0, j = (rand() * N) | 0
      if (i === j) continue
      const dx = xs[j] - xs[i], dy = ys[j] - ys[i]
      if (dx * dx + dy * dy > EPS * EPS) continue
      xs[i] += MU * dx; ys[i] += MU * dy
      xs[j] -= MU * dx; ys[j] -= MU * dy
      glow[i] = glow[j] = 1
    }
    age++
  }

  const s = surface(canvas, () => draw())

  function draw(): void {
    const { ctx, w, h } = s
    ctx.clearRect(0, 0, w, h)
    const pad = 24
    for (let i = 0; i < N; i++) {
      const x = pad + xs[i] * (w - 2 * pad), y = pad + ys[i] * (h - 2 * pad)
      ctx.beginPath()
      ctx.arc(x, y, 1.6 + glow[i] * 1.6, 0, Math.PI * 2)
      ctx.fillStyle = glow[i] > 0.05 ? COLOR.euc : COLOR.cos
      ctx.globalAlpha = 0.25 + glow[i] * 0.45
      ctx.fill()
      glow[i] *= 0.9
    }
    ctx.globalAlpha = 1
  }

  seed()
  if (prefersReducedMotion()) {
    for (let k = 0; k < 900; k++) step()
    glow.fill(0); draw()
    return
  }

  let visible = true
  new IntersectionObserver(([e]) => { visible = e.isIntersecting }).observe(canvas)
  const tick = () => {
    if (visible && !document.hidden) {
      step(); draw()
      if (age > 1400) { rand = rng(((Math.random() * 1e9) | 0) + 1); xs = new Float32Array(N); ys = new Float32Array(N); glow = new Float32Array(N); seed() }
    }
    requestAnimationFrame(tick)
  }
  requestAnimationFrame(tick)
}
