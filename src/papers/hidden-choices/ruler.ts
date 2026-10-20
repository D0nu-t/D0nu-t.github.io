import { prefersReducedMotion } from '../../motion'
import { COLOR, Loop, rng, surface, tween, type Surface } from './common'

// Demo 5: a cosine gate at ε and an angular gate at arccos(1 − ε) admit the
// same pairs, and both rotate opinions, so the two runs end identical. Counting
// groups within half of each run's own ε (cosine units vs radians) can still
// give different counts; one common ruler gives the same count for both.

const N = 120, MU = 0.3, ROUNDS = 220, ATT = 60, MIN_GROUP = 2
const EPS_COS = 0.06
const EPS_ANG = Math.acos(1 - EPS_COS)
const OWN_COS = Math.acos(1 - 0.5 * EPS_COS)   // half the cosine ε, as an angle
const OWN_ANG = 0.5 * EPS_ANG                  // half the angular ε
const COMMON = 0.16                            // one angle for both runs
type Agent = { a: number; r: number }
const PALETTE = [COLOR.euc, COLOR.cos, COLOR.ang, '#a78bfa', '#f472b6', '#93c5fd', COLOR.text]

const wrap = (x: number) => Math.atan2(Math.sin(x), Math.cos(x))

function simulate(seed: number): Agent[][] {
  const r = rng(seed)
  let A: Agent[] = Array.from({ length: N }, () => ({ a: r() * Math.PI * 2 - Math.PI, r: 0.35 + 0.65 * Math.sqrt(r()) }))
  const frames: Agent[][] = [A.map(x => ({ ...x }))]
  for (let t = 0; t < ROUNDS; t++) {
    for (let k = 0; k < ATT; k++) {
      const i = (r() * N) | 0, j = (r() * N) | 0
      if (i === j) continue
      const d = wrap(A[j].a - A[i].a)
      if (Math.abs(d) > EPS_ANG) continue      // identical to 1 − cos θ ≤ EPS_COS
      A[i].a = wrap(A[i].a + MU * d); A[j].a = wrap(A[j].a - MU * d)
    }
    frames.push(A.map(x => ({ ...x })))
  }
  return frames
}

/** Single-linkage groups on the circle: a gap wider than `radius` starts a new group. */
function groups(A: Agent[], radius: number): number[][] {
  const idx = A.map((_, i) => i).sort((i, j) => A[i].a - A[j].a)
  const out: number[][] = [[idx[0]]]
  for (let k = 1; k < idx.length; k++) {
    if (A[idx[k]].a - A[idx[k - 1]].a > radius) out.push([])
    out[out.length - 1].push(idx[k])
  }
  const wrapGap = A[idx[0]].a + 2 * Math.PI - A[idx[idx.length - 1]].a
  if (out.length > 1 && wrapGap <= radius) out[0].push(...out.pop()!)
  return out.filter(g => g.length >= MIN_GROUP)
}

export function initRuler(root: HTMLElement): void {
  // Use the first seed where the two own-radius counts differ, to show the effect
  let seed = 1, frames = simulate(seed)
  const final = () => frames[frames.length - 1]
  while (seed < 60 && groups(final(), OWN_COS).length === groups(final(), OWN_ANG).length) frames = simulate(++seed)

  let ruler: 'own' | 'common' = 'own'
  let shown = { cos: OWN_COS, ang: OWN_ANG }
  let f = prefersReducedMotion() ? frames.length - 1 : 0

  const out = (k: string) => root.querySelector<HTMLElement>(`[data-out="${k}"]`)!
  const sCos = surface(root.querySelector<HTMLCanvasElement>('canvas[data-run="cos"]')!, s => paint(s, 'cos'))
  const sAng = surface(root.querySelector<HTMLCanvasElement>('canvas[data-run="ang"]')!, s => paint(s, 'ang'))

  function paint(s: Surface, which: 'cos' | 'ang'): void {
    const { ctx, w, h } = s, cx = w / 2, cy = h / 2, R = Math.min(w, h) / 2 - 14
    const A = frames[f], done = f === frames.length - 1
    ctx.clearRect(0, 0, w, h)
    ctx.strokeStyle = COLOR.grid; ctx.lineWidth = 1
    ctx.beginPath(); ctx.arc(cx, cy, R, 0, Math.PI * 2); ctx.stroke()
    // colour each agent by its group; agents outside any group stay dim
    const shade = new Array<string>(A.length).fill(COLOR.faint)
    if (done) {
      const gs = groups(A, shown[which])
      gs.forEach((g, k) => g.forEach(i => { shade[i] = PALETTE[k % PALETTE.length] }))
      out(which).textContent = String(gs.length)
    } else out(which).textContent = '…'
    A.forEach((x, i) => {
      ctx.fillStyle = done ? shade[i] : (which === 'cos' ? COLOR.cos : COLOR.ang)
      ctx.beginPath(); ctx.arc(cx + Math.cos(x.a) * x.r * R, cy - Math.sin(x.a) * x.r * R, 2.8, 0, Math.PI * 2); ctx.fill()
    })
  }
  const paintBoth = () => { paint(sCos, 'cos'); paint(sAng, 'ang') }

  const loop = new Loop(root, () => {
    if (f < frames.length - 1) { f = Math.min(frames.length - 1, f + 2); paintBoth() }
  })

  root.querySelectorAll<HTMLButtonElement>('[data-ruler]').forEach(b => b.addEventListener('click', () => {
    ruler = b.dataset.ruler as 'own' | 'common'
    root.querySelectorAll('[data-ruler]').forEach(x => x.setAttribute('aria-pressed', String(x === b)))
    const from = { ...shown }, to = ruler === 'own' ? { cos: OWN_COS, ang: OWN_ANG } : { cos: COMMON, ang: COMMON }
    f = frames.length - 1
    tween(500, k => { shown = { cos: from.cos + (to.cos - from.cos) * k, ang: from.ang + (to.ang - from.ang) * k }; paintBoth() })
  }))
  root.querySelector('[data-action="reset"]')?.addEventListener('click', () => { f = 0; paintBoth(); if (!loop.playing) root.querySelector<HTMLButtonElement>('[data-action="play"]')?.click() })
  out('own-cos').textContent = `${(OWN_COS * 180 / Math.PI).toFixed(1)}°`
  out('own-ang').textContent = `${(OWN_ANG * 180 / Math.PI).toFixed(1)}°`
  out('common').textContent = `${(COMMON * 180 / Math.PI).toFixed(1)}°`
  paintBoth()
}
