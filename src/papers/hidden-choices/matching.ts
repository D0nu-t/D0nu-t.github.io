import { prefersReducedMotion } from '../../motion'
import { COLOR, Loop, cosSim, euclid, pct, rng, surface, type Surface } from './common'

// Demo 3: two toy Deffuant runs from the same start in the centred square.
// Thresholds are matched so both gates admit 15% of pairs at round 0
// ("start-matched"), or cosine reuses Euclidean's number ("shared").
// The chart shows the pass rate per round drifting apart as opinions move.

const N = 150, MU = 0.3, ROUNDS = 320, ATTEMPTS = N / 2, START = 0.15, SMOOTH = 8
type Agent = [number, number]
type Mode = 'matched' | 'shared'

function quantile(xs: number[], q: number): number {
  const s = [...xs].sort((a, b) => a - b)
  return s[Math.min(s.length - 1, Math.floor(q * s.length))]
}

const cosD = (a: Agent, b: Agent) => 1 - Math.max(-1, Math.min(1, cosSim(a, b)))

export function initMatching(root: HTMLElement): void {
  let mode: Mode = 'matched'
  let seed = 3
  let E: Agent[] = [], C: Agent[] = [], epsE = 0, epsC = 0, round = 0
  let passE: number[] = [], passC: number[] = []

  const sE = surface(root.querySelector<HTMLCanvasElement>('canvas[data-run="euc"]')!, s => paintRun(s, E, COLOR.euc))
  const sC = surface(root.querySelector<HTMLCanvasElement>('canvas[data-run="cos"]')!, s => paintRun(s, C, COLOR.cos))
  const sChart = surface(root.querySelector<HTMLCanvasElement>('canvas[data-chart]')!, s => paintChart(s))
  const out = (k: string) => root.querySelector<HTMLElement>(`[data-out="${k}"]`)!

  function reset(): void {
    const r = rng(seed)
    E = Array.from({ length: N }, () => [r() * 2 - 1, r() * 2 - 1] as Agent)
    C = E.map(a => [a[0], a[1]] as Agent)
    const de: number[] = [], dc: number[] = []
    for (let i = 0; i < N; i++) for (let j = i + 1; j < N; j++) { de.push(euclid(E[i], E[j])); dc.push(cosD(E[i], E[j])) }
    epsE = quantile(de, START)
    epsC = mode === 'matched' ? quantile(dc, START) : epsE
    round = 0; passE = []; passC = []
    out('epsE').textContent = epsE.toFixed(2)
    out('epsC').textContent = epsC.toFixed(2)
    paintAll()
  }

  function stepE(r: () => number): number {
    let pass = 0
    for (let k = 0; k < ATTEMPTS; k++) {
      const i = (r() * N) | 0, j = (r() * N) | 0
      if (i === j || euclid(E[i], E[j]) > epsE) continue
      pass++
      const dx = E[j][0] - E[i][0], dy = E[j][1] - E[i][1]
      E[i][0] += MU * dx; E[i][1] += MU * dy; E[j][0] -= MU * dx; E[j][1] -= MU * dy
    }
    return pass / ATTEMPTS
  }

  // Angular step: each agent turns toward the other by MU of the angle and keeps its length
  function stepC(r: () => number): number {
    let pass = 0
    for (let k = 0; k < ATTEMPTS; k++) {
      const i = (r() * N) | 0, j = (r() * N) | 0
      if (i === j || cosD(C[i], C[j]) > epsC) continue
      pass++
      const ai = Math.atan2(C[i][1], C[i][0]), aj = Math.atan2(C[j][1], C[j][0])
      let d = aj - ai; d = Math.atan2(Math.sin(d), Math.cos(d))
      const ri = Math.hypot(...C[i]), rj = Math.hypot(...C[j])
      C[i] = [ri * Math.cos(ai + MU * d), ri * Math.sin(ai + MU * d)]
      C[j] = [rj * Math.cos(aj - MU * d), rj * Math.sin(aj - MU * d)]
    }
    return pass / ATTEMPTS
  }

  const r1 = () => rng(seed * 31 + round)
  function advance(): void {
    if (round >= ROUNDS) return
    // both runs use the same pair draws each round
    passE.push(stepE(r1())); passC.push(stepC(r1()))
    round++
  }

  const smooth = (xs: number[], i: number) => {
    const lo = Math.max(0, i - SMOOTH + 1); let s = 0
    for (let k = lo; k <= i; k++) s += xs[k]
    return s / (i - lo + 1)
  }

  function paintRun(s: Surface, A: Agent[], c: string): void {
    const { ctx, w, h } = s, pad = 8, side = Math.min(w, h) - 2 * pad
    const x0 = (w - side) / 2, y0 = (h - side) / 2
    ctx.clearRect(0, 0, w, h)
    ctx.strokeStyle = COLOR.grid; ctx.strokeRect(x0, y0, side, side)
    ctx.beginPath(); ctx.moveTo(x0 + side / 2, y0); ctx.lineTo(x0 + side / 2, y0 + side); ctx.moveTo(x0, y0 + side / 2); ctx.lineTo(x0 + side, y0 + side / 2); ctx.stroke()
    ctx.fillStyle = c; ctx.globalAlpha = 0.75
    for (const a of A) { ctx.beginPath(); ctx.arc(x0 + (a[0] + 1) / 2 * side, y0 + (1 - (a[1] + 1) / 2) * side, 2.4, 0, Math.PI * 2); ctx.fill() }
    ctx.globalAlpha = 1
  }

  function paintChart(s: Surface): void {
    const { ctx, w, h } = s, l = 34, rgt = 10, t = 8, b = 22
    ctx.clearRect(0, 0, w, h)
    const X = (i: number) => l + (i / ROUNDS) * (w - l - rgt), Y = (v: number) => t + (1 - v) * (h - t - b)
    ctx.strokeStyle = COLOR.grid; ctx.fillStyle = COLOR.dim; ctx.font = '10px "IBM Plex Mono", monospace'
    for (const v of [0, 0.25, 0.5, 0.75, 1]) { ctx.beginPath(); ctx.moveTo(l, Y(v)); ctx.lineTo(w - rgt, Y(v)); ctx.stroke(); ctx.fillText(pct(v), 2, Y(v) + 3) }
    ctx.fillText('round', w - rgt - 34, h - 6)
    for (const [xs, c] of [[passE, COLOR.euc], [passC, COLOR.cos]] as const) {
      if (!xs.length) continue
      ctx.strokeStyle = c; ctx.lineWidth = 2; ctx.beginPath()
      xs.forEach((_, i) => { const x = X(i), y = Y(smooth(xs, i)); i ? ctx.lineTo(x, y) : ctx.moveTo(x, y) })
      ctx.stroke()
    }
    if (passE.length) {
      out('passE').textContent = pct(smooth(passE, passE.length - 1))
      out('passC').textContent = pct(smooth(passC, passC.length - 1))
    } else { out('passE').textContent = pct(START); out('passC').textContent = mode === 'matched' ? pct(START) : '—' }
    out('round').textContent = String(round)
  }

  const paintAll = () => { paintRun(sE, E, COLOR.euc); paintRun(sC, C, COLOR.cos); paintChart(sChart) }

  new Loop(root, () => { if (round < ROUNDS) { advance(); paintAll() } })

  root.querySelectorAll<HTMLButtonElement>('[data-mode]').forEach(b => b.addEventListener('click', () => {
    mode = b.dataset.mode as Mode
    root.querySelectorAll('[data-mode]').forEach(x => x.setAttribute('aria-pressed', String(x === b)))
    reset()
  }))
  root.querySelector('[data-action="reset"]')?.addEventListener('click', () => { seed++; reset() })

  reset()
  // Reduced motion: show the finished run as a static result
  if (prefersReducedMotion()) {
    while (round < ROUNDS) advance()
    paintAll()
  }
}
