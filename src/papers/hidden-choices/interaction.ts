import { COLOR, Loop } from './common'

// Demo 4: the draft read each geometry's lag index against 100 and saw a
// reversal; the test that compares the geometries (the interaction) is
// positive. Numbers come from data attributes filled from numbers.tex.

const NS = 'http://www.w3.org/2000/svg'
const W = 640, H = 260

function el<K extends keyof SVGElementTagNameMap>(tag: K, attrs: Record<string, string | number>, parent?: Element): SVGElementTagNameMap[K] {
  const e = document.createElementNS(NS, tag)
  for (const [k, v] of Object.entries(attrs)) e.setAttribute(k, String(v))
  parent?.appendChild(e)
  return e
}

function text(parent: Element, x: number, y: number, s: string, fill: string, anchor = 'middle', size = 12): SVGTextElement {
  const t = el('text', { x, y, fill, 'text-anchor': anchor, 'font-size': size, 'font-family': 'IBM Plex Mono, monospace' }, parent)
  t.textContent = s
  return t
}

export function initInteraction(root: HTMLElement): void {
  const d = root.dataset
  const eucIdx = +d.eucIdx!, cosIdx = +d.cosIdx!
  const inter = +d.inter!, lo = +d.ciLo!, hi = +d.ciHi!, margin = +d.margin!
  const pos = +d.positive!, neg = +d.negative!, nul = +d.null!

  const svg = el('svg', { viewBox: `0 0 ${W} ${H}`, role: 'img', class: 'demo-svg' })
  const title = el('title', {}, svg)
  root.querySelector('[data-chart]')!.appendChild(svg)

  // ── View A: lag index per geometry against 100 ──
  const A = el('g', { class: 'view' }, svg)
  const ax = (v: number) => 60 + ((v - 50) / 100) * (W - 120)       // 50..150
  el('line', { x1: ax(50), x2: ax(150), y1: 200, y2: 200, stroke: COLOR.faint }, A)
  for (const v of [50, 75, 100, 125, 150]) text(A, ax(v), 220, String(v), COLOR.dim, 'middle', 11)
  el('line', { x1: ax(100), x2: ax(100), y1: 40, y2: 200, stroke: COLOR.text, 'stroke-dasharray': '4 4' }, A)
  text(A, ax(100), 30, '100 = no change with lag', COLOR.dim, 'middle', 11)
  const rows: [string, number, string, number][] = [['Euclidean', eucIdx, COLOR.euc, 90], ['cosine', cosIdx, COLOR.cos, 150]]
  for (const [name, v, c, y] of rows) {
    el('line', { x1: ax(100), x2: ax(v), y1: y, y2: y, stroke: c, 'stroke-width': 6, 'stroke-linecap': 'round', class: 'grow' }, A)
    el('circle', { cx: ax(v), cy: y, r: 7, fill: c }, A)
    text(A, ax(v) + (v > 100 ? 14 : -14), y + 4, `${name} ${v}`, c, v > 100 ? 'start' : 'end', 13)
  }
  text(A, W / 2, 250, 'lag index: effect at lag 40 as a % of the effect at lag 0', COLOR.dim, 'middle', 11)

  // ── View B: the interaction, and its sign across configurations ──
  const B = el('g', { class: 'view' }, svg)
  const bx = (v: number) => 60 + ((v + 0.06) / 0.11) * (W - 120)   // -0.06..+0.05
  el('rect', { x: bx(-margin), y: 50, width: bx(margin) - bx(-margin), height: 70, fill: COLOR.grid }, B)
  el('line', { x1: bx(0), x2: bx(0), y1: 45, y2: 125, stroke: COLOR.text }, B)
  el('line', { x1: bx(-0.06), x2: bx(0.05), y1: 125, y2: 125, stroke: COLOR.faint }, B)
  for (const v of [-0.06, -0.04, -0.02, 0, 0.02, 0.04]) text(B, bx(v), 142, (v > 0 ? '+' : '') + v.toFixed(2), COLOR.dim, 'middle', 11)
  el('line', { x1: bx(lo), x2: bx(hi), y1: 85, y2: 85, stroke: COLOR.cos, 'stroke-width': 4, 'stroke-linecap': 'round' }, B)
  el('circle', { cx: bx(inter), cy: 85, r: 7, fill: COLOR.cos }, B)
  text(B, bx(inter), 68, `${inter > 0 ? '+' : ''}${inter.toFixed(3)} [${lo > 0 ? '+' : ''}${lo.toFixed(3)}, +${hi.toFixed(3)}]`, COLOR.cos, 'middle', 12)
  text(B, bx(-0.035), 40, 'cosine amplifies more', COLOR.dim, 'middle', 11)
  text(B, bx(0.03), 40, 'cosine attenuates', COLOR.dim, 'middle', 11)
  const cells = [...Array(pos).fill(COLOR.euc), ...Array(nul).fill(COLOR.dim), ...Array(neg).fill(COLOR.ang)]
  const cw = 16, gap = 4, x0 = W / 2 - (cells.length * (cw + gap)) / 2
  cells.forEach((c, i) => el('rect', { x: x0 + i * (cw + gap), y: 178, width: cw, height: cw, rx: 3, fill: c, class: 'cell', style: `transition-delay:${i * 25}ms` }, B))
  text(B, W / 2, 168, `sign of the interaction in all ${cells.length} configurations`, COLOR.dim, 'middle', 11)
  text(B, W / 2, 222, `${pos} positive · ${nul} not different from zero · ${neg} negative`, COLOR.text, 'middle', 12)

  const caption = root.querySelector<HTMLElement>('[data-out="caption"]')!
  const views = [
    { g: A, label: 'Each geometry against 100', note: `Read one at a time, cosine (${cosIdx}) falls below 100 while Euclidean (${eucIdx}) rises above it, which the draft reported as a reversal.` },
    { g: B, label: 'The interaction', note: `The test of the comparison is positive (${inter > 0 ? '+' : ''}${inter.toFixed(3)}): cosine attenuates the lag effect, the same direction as in the audited model.` },
  ]
  let cur = 0, timer = 0
  const show = (i: number) => {
    cur = i
    views.forEach((v, k) => v.g.classList.toggle('is-on', k === i))
    root.querySelectorAll<HTMLButtonElement>('[data-view]').forEach(b => b.setAttribute('aria-pressed', String(+b.dataset.view! === i)))
    caption.textContent = views[i].note
    title.textContent = `${views[i].label}. ${views[i].note}`
  }
  const loop = new Loop(root, dt => { timer += dt; if (timer > 5) { timer = 0; show(1 - cur) } })
  root.querySelectorAll<HTMLButtonElement>('[data-view]').forEach(b => b.addEventListener('click', () => { loop.pause(); timer = 0; show(+b.dataset.view!) }))
  show(0)
}
