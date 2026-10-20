import { COLOR, Loop, cosSim, euclid, pct, rng, surface, type Surface } from './common'

// Demo 1: one shared threshold ε admits very different shares of opinion pairs
// under Euclidean, cosine and angular distance, depending on the space and d.

type Space = 'unit' | 'centred'
type Gate = 'euc' | 'cos' | 'ang'
const GATES: Gate[] = ['euc', 'cos', 'ang']
const SAMPLE = 6000          // pairs behind the coverage bars
const SHOWN = 70             // pairs drawn in each panel
const SWAP_PER_SEC = 18      // how fast drawn pairs are replaced

const draw01 = (r: () => number, space: Space) => space === 'unit' ? r() : r() * 2 - 1

function admits(g: Gate, a: number[], b: number[], eps: number): boolean {
  if (g === 'euc') return euclid(a, b) <= eps
  const c = Math.max(-1, Math.min(1, cosSim(a, b)))
  return g === 'cos' ? 1 - c <= eps : Math.acos(c) <= eps
}

export function initCoverage(root: HTMLElement): void {
  const st = { eps: 0.5, d: 4, space: 'unit' as Space }
  const rand = rng(11)
  const pair = (): [number[], number[]] => {
    const a: number[] = [], b: number[] = []
    for (let i = 0; i < st.d; i++) { a.push(draw01(rand, st.space)); b.push(draw01(rand, st.space)) }
    return [a, b]
  }
  let shown: [number[], number[]][] = []
  let swapAcc = 0

  const surfaces = GATES.map(g => surface(root.querySelector<HTMLCanvasElement>(`canvas[data-gate="${g}"]`)!, s => paint(g, s)))
  const bars = Object.fromEntries(GATES.map(g => [g, root.querySelector<HTMLElement>(`[data-bar="${g}"]`)!]))
  const vals = Object.fromEntries(GATES.map(g => [g, root.querySelector<HTMLElement>(`[data-val="${g}"]`)!]))
  const epsOut = root.querySelector<HTMLOutputElement>('[data-out="eps"]')!

  function estimate(): void {
    const r = rng(99 + st.d * 7 + (st.space === 'unit' ? 0 : 1))
    const hits = { euc: 0, cos: 0, ang: 0 }
    for (let k = 0; k < SAMPLE; k++) {
      const a: number[] = [], b: number[] = []
      for (let i = 0; i < st.d; i++) { a.push(draw01(r, st.space)); b.push(draw01(r, st.space)) }
      for (const g of GATES) if (admits(g, a, b, st.eps)) hits[g]++
    }
    for (const g of GATES) {
      const p = hits[g] / SAMPLE
      bars[g].style.transform = `scaleX(${p})`
      vals[g].textContent = pct(p)
    }
    epsOut.textContent = st.eps.toFixed(2)
  }

  function paint(g: Gate, s: Surface): void {
    const { ctx, w, h } = s
    ctx.clearRect(0, 0, w, h)
    const lo = st.space === 'unit' ? 0 : -1, span = st.space === 'unit' ? 1 : 2
    const pad = 10
    const X = (v: number) => pad + ((v - lo) / span) * (w - 2 * pad)
    const Y = (v: number) => h - pad - ((v - lo) / span) * (h - 2 * pad)
    ctx.strokeStyle = COLOR.grid; ctx.lineWidth = 1
    ctx.strokeRect(pad, pad, w - 2 * pad, h - 2 * pad)
    if (st.space === 'centred') {
      ctx.beginPath(); ctx.moveTo(X(0), pad); ctx.lineTo(X(0), h - pad); ctx.moveTo(pad, Y(0)); ctx.lineTo(w - pad, Y(0)); ctx.stroke()
    }
    for (const [a, b] of shown) {
      const ok = admits(g, a, b, st.eps)
      ctx.strokeStyle = ok ? COLOR[g] : COLOR.faint
      ctx.globalAlpha = ok ? 0.85 : 0.5
      ctx.lineWidth = ok ? 1.4 : 1
      ctx.beginPath(); ctx.moveTo(X(a[0]), Y(a[1])); ctx.lineTo(X(b[0]), Y(b[1])); ctx.stroke()
    }
    ctx.globalAlpha = 1
  }

  const repaint = () => GATES.forEach((g, i) => paint(g, surfaces[i]))
  const reseed = () => { shown = Array.from({ length: SHOWN }, pair); estimate(); repaint() }

  new Loop(root, dt => {
    swapAcc += dt * SWAP_PER_SEC
    while (swapAcc >= 1) { shown.shift(); shown.push(pair()); swapAcc-- }
    repaint()
  })

  root.querySelector<HTMLInputElement>('input[name="eps"]')!.addEventListener('input', e => {
    st.eps = +(e.target as HTMLInputElement).value; estimate(); repaint()
  })
  root.querySelectorAll<HTMLButtonElement>('[data-d]').forEach(btn => btn.addEventListener('click', () => {
    st.d = +btn.dataset.d!
    root.querySelectorAll('[data-d]').forEach(b => b.setAttribute('aria-pressed', String(b === btn)))
    reseed()
  }))
  root.querySelectorAll<HTMLButtonElement>('[data-space]').forEach(btn => btn.addEventListener('click', () => {
    st.space = btn.dataset.space as Space
    root.querySelectorAll('[data-space]').forEach(b => b.setAttribute('aria-pressed', String(b === btn)))
    reseed()
  }))
  root.querySelector('[data-action="reset"]')?.addEventListener('click', () => {
    st.eps = 0.5; st.d = 4; st.space = 'unit'
    root.querySelector<HTMLInputElement>('input[name="eps"]')!.value = '0.5'
    root.querySelectorAll<HTMLElement>('[data-d]').forEach(b => b.setAttribute('aria-pressed', String(b.dataset.d === '4')))
    root.querySelectorAll<HTMLElement>('[data-space]').forEach(b => b.setAttribute('aria-pressed', String(b.dataset.space === 'unit')))
    reseed()
  })
  reseed()
}
