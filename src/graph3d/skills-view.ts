import type { GraphNode, NodeCategory } from '../types'
import { buildNodes, RAW_LINKS, CATEGORY_COLOR, CATEGORY_LABEL } from '../graph-data'
import { groupSkills, nodeName } from '../graph-text'
import { prefersReducedMotion } from '../motion'
import { Loop } from '../papers/hidden-choices/common'
import { GraphCloud } from './graph-cloud'
import { layout3d } from './layout3d'

// ─── The skills graph as a 3-D cloud ───────────────────────────────────────────
// One implementation for the home page and the fullscreen page. Left alone it
// tours the projects: it turns to each in turn and lights up the skills behind
// it. Clicking, dragging or searching stops the tour and pins a node instead.
//
// The page supplies the markup. Inside the root element, parts are found by
// `data-sg`: canvas (required), search, details, caption, prev, next, tour,
// zoom-in, zoom-out, zoom-reset. Buttons with `data-filter="<category>"` fade
// everything outside that category. `data-wheel-zoom` on the root lets the
// mouse wheel zoom (only sensible where the page itself does not scroll).

const DWELL_S = 4.5          // how long the tour rests on each project
const TURN_RATE = 3.2        // how briskly the cloud turns to face a node
const IDLE_SPIN = 0.07       // radians per second when nothing is selected

const el = <K extends keyof HTMLElementTagNameMap>(tag: K, cls = '', text = ''): HTMLElementTagNameMap[K] => {
  const e = document.createElement(tag)
  if (cls) e.className = cls
  if (text) e.textContent = text
  return e
}
const isOrg = (n: GraphNode): boolean => n.type === 'work' || n.type === 'academic'
const kindOf = (n: GraphNode): string => n.type === 'project' ? 'Project' : CATEGORY_LABEL[n.category]

export function mountSkillsGraph(root: HTMLElement): void {
  const part = <T extends HTMLElement>(name: string): T | null => root.querySelector<T>(`[data-sg="${name}"]`)
  const canvas = part<HTMLCanvasElement>('canvas')
  if (!canvas) return

  // ── data ──
  const nodes = buildNodes()
  const names = nodes.map(nodeName)
  const at = new Map(nodes.map((n, i) => [n.id, i]))
  const edges = RAW_LINKS.map(l => [at.get(l.source), at.get(l.target)] as [number | undefined, number | undefined])
    .filter((e): e is [number, number] => e[0] !== undefined && e[1] !== undefined)
  const near: Set<number>[] = nodes.map(() => new Set<number>())
  for (const [a, b] of edges) { near[a].add(b); near[b].add(a) }
  const byName = (a: number, b: number): number => names[a].localeCompare(names[b])
  const pickType = (test: (n: GraphNode) => boolean): number[] => nodes.flatMap((n, i) => test(n) ? [i] : []).sort(byName)
  // the tour and the Prev / Next buttons go through projects first, then organisations
  const stops = [...pickType(n => n.type === 'project'), ...pickType(isOrg)]

  const cloud = new GraphCloud(
    canvas, layout3d(nodes.length, edges), nodes.map(n => CATEGORY_COLOR[n.category]),
    Float32Array.from(nodes, n => n.type === 'skill' ? 3 + Math.min(6, n.degree ?? 0) * 0.5 : 7.5),
    edges, names, new Set(nodes.flatMap((n, i) => n.type === 'skill' ? [] : [i])),
  )
  const home: [number, number] = [cloud.yaw, cloud.pitch]

  // ── state ──
  const still = prefersReducedMotion()
  let touring = !still
  let clock = DWELL_S - 1            // the first stop comes a second after the graph appears
  let stop = -1                      // position in `stops`
  let pinned = -1
  let target: [number, number] | null = null
  let dragging = false
  // the view looks at the node being shown and zooms until its neighbours fill the canvas
  let lookAt: [number, number, number] = [0, 0, 0]
  let autoZoom = 1, autoZoomTo = 1, userZoom = 1

  const caption = part('caption'), details = part('details'), search = part<HTMLInputElement>('search'), tourBtn = part('tour')

  // ── showing a node: light it and what it connects to, turn it to the front, describe it ──
  function describe(i: number, announce: boolean): void {
    if (!caption) return
    caption.setAttribute('aria-live', announce ? 'polite' : 'off')
    caption.replaceChildren()
    if (i < 0) { caption.textContent = touring ? '' : 'Pick a project with Prev and Next, click a node, or resume the tour.'; return }
    const n = nodes[i], linked = [...near[i]].sort(byName)
    const skills = linked.filter(j => nodes[j].type === 'skill'), others = linked.filter(j => nodes[j].type !== 'skill')
    caption.append(el('strong', '', names[i]))
    if (n.type === 'skill') caption.append(others.length ? ` is used in ${others.map(j => names[j]).join(', ')}.` : ' is not linked to a project yet.')
    else caption.append(skills.length ? ` uses ${skills.map(j => names[j]).join(', ')}.` : ' has no skills linked yet.')
  }

  function show(i: number, announce: boolean): void {
    cloud.focus = i
    cloud.lit = i < 0 ? null : new Set([i, ...near[i]])
    target = i < 0 ? null : cloud.facing(i)
    lookAt = i < 0 ? [0, 0, 0] : cloud.position(i)
    // zoom so that most neighbours sit about a third of the canvas away; a far-off hub such as
    // Python is allowed to fall outside the frame (three quarters of the neighbours set the scale)
    const away = i < 0 ? [] : [...near[i]].map(j => { const p = cloud.position(j); return Math.hypot(p[0] - lookAt[0], p[1] - lookAt[1], p[2] - lookAt[2]) }).sort((a, b) => a - b)
    const reach = away.length ? away[Math.min(away.length - 1, Math.floor(away.length * 0.75))] : 0
    autoZoomTo = reach > 0 ? Math.max(1, Math.min(4, 23000 / reach)) : 1
    describe(i, announce)
    if (!loop.playing) {            // nothing is animating (reduced motion or paused): jump there
      if (target) [cloud.yaw, cloud.pitch] = target
      cloud.centre = [...lookAt]; autoZoom = autoZoomTo; cloud.zoom = userZoom * autoZoom
      cloud.draw(0)
    }
  }

  function setTour(on: boolean): void {
    touring = on && !still
    if (tourBtn) {
      tourBtn.setAttribute('aria-pressed', String(touring))
      tourBtn.textContent = touring ? 'Pause tour' : 'Resume tour'
    }
    if (touring) { pinned = -1; cloud.pinned = -1; if (search) search.value = ''; renderDetails(); clock = DWELL_S }
  }

  /** Select a node on the visitor's behalf; -1 clears the selection. The tour stops. */
  function pin(i: number): void {
    setTour(false)
    pinned = i
    cloud.pinned = i
    const s = stops.indexOf(i)
    if (s >= 0) stop = s
    if (search) search.value = i < 0 ? '' : names[i]
    show(i, true)
    renderDetails()
  }

  function renderDetails(): void {
    root.classList.toggle('has-details', pinned >= 0)
    if (!details) return
    details.replaceChildren()
    details.hidden = pinned < 0
    if (pinned < 0) return
    const n = nodes[pinned], linked = [...near[pinned]].sort(byName)
    const head = el('div', 'sel-head')
    const dot = el('span', 'sel-dot'); dot.style.background = CATEGORY_COLOR[n.category]
    const clear = el('button', 'sel-clear', 'Clear'); clear.type = 'button'
    clear.addEventListener('click', () => pin(-1))
    head.append(dot, el('strong', '', names[pinned]), el('span', 'sel-kind', kindOf(n)), clear)
    details.append(head)
    const rows: [string, number[]][] = [
      ['Projects', linked.filter(j => nodes[j].type === 'project')],
      ['Organisations', linked.filter(j => isOrg(nodes[j]))],
      ...groupSkills(linked.map(j => nodes[j])).map(g => [g.label, g.skills.map(sk => at.get(sk.id)!)] as [string, number[]]),
    ]
    for (const [label, group] of rows) {
      if (!group.length) continue
      const row = el('div', 'sel-row'), items = el('span', 'sel-items')
      for (const j of group) {
        const b = el('button', 'sel-item', names[j]); b.type = 'button'
        b.addEventListener('click', () => pin(j))
        items.append(b)
      }
      row.append(el('span', 'sel-key', label), items)
      details.append(row)
    }
  }

  // ── one frame ──
  const wrap = (a: number): number => ((a + Math.PI) % (2 * Math.PI) + 2 * Math.PI) % (2 * Math.PI) - Math.PI
  const loop = new Loop(root, dt => {
    if (touring && !dragging) {
      clock += dt
      if (clock >= DWELL_S) { clock = 0; stop = (stop + 1) % stops.length; show(stops[stop], false) }
    }
    if (target) {
      const k = 1 - Math.exp(-dt * TURN_RATE)
      cloud.yaw += wrap(target[0] - cloud.yaw) * k
      cloud.pitch += (target[1] - cloud.pitch) * k
    } else if (!dragging) cloud.yaw += dt * IDLE_SPIN
    const ease = 1 - Math.exp(-dt * TURN_RATE)
    for (let a = 0; a < 3; a++) cloud.centre[a] += (lookAt[a] - cloud.centre[a]) * ease
    autoZoom += (autoZoomTo - autoZoom) * ease
    cloud.zoom = userZoom * autoZoom
    cloud.draw(dt)
  }, canvas)
  const repaint = (): void => { if (!loop.playing) cloud.draw(0) }

  // ── buttons ──
  const step = (by: number): void => pin(stops[(Math.max(stop, by > 0 ? -1 : 0) + by + stops.length) % stops.length])
  part('prev')?.addEventListener('click', () => step(-1))
  part('next')?.addEventListener('click', () => step(1))
  tourBtn?.addEventListener('click', () => { setTour(!touring); if (!touring) describe(cloud.focus, false) })
  if (tourBtn && still) tourBtn.hidden = true

  const zoomBy = (f: number): void => { userZoom = Math.max(0.6, Math.min(3.5, userZoom * f)); cloud.zoom = userZoom * autoZoom; repaint() }
  part('zoom-in')?.addEventListener('click', () => zoomBy(1.3))
  part('zoom-out')?.addEventListener('click', () => zoomBy(1 / 1.3))
  part('zoom-reset')?.addEventListener('click', () => { userZoom = 1; cloud.zoom = autoZoom; if (pinned < 0 && !touring) { target = null; [cloud.yaw, cloud.pitch] = home } repaint() })
  if (root.dataset.wheelZoom !== undefined) {
    canvas.addEventListener('wheel', e => { e.preventDefault(); zoomBy(e.deltaY < 0 ? 1.12 : 1 / 1.12) }, { passive: false })
  }

  // category filter: fade everything outside the chosen category (projects stay, as anchors)
  const filters = [...root.querySelectorAll<HTMLButtonElement>('[data-filter]')]
  let filter: NodeCategory | null = null
  for (const b of filters) {
    b.setAttribute('aria-pressed', 'false')
    b.addEventListener('click', () => {
      filter = filter === b.dataset.filter ? null : b.dataset.filter as NodeCategory
      for (const o of filters) { const on = o.dataset.filter === filter; o.setAttribute('aria-pressed', String(on)); o.classList.toggle('active', on) }
      nodes.forEach((n, i) => { cloud.faded[i] = filter && n.category !== filter && n.type !== 'project' ? 1 : 0 })
      repaint()
    })
  }

  // ── find by name ──
  if (search) {
    const list = document.createElement('datalist')
    list.id = `${search.id || 'skills-search'}-options`
    for (const i of nodes.map((_, k) => k).sort(byName)) { const o = document.createElement('option'); o.value = names[i]; list.append(o) }
    search.after(list)
    search.setAttribute('list', list.id)
    const lower = names.map(s => s.toLowerCase())
    search.addEventListener('input', () => {
      const q = search.value.trim().toLowerCase()
      if (!q) { if (pinned >= 0) pin(-1); return }
      const exact = lower.indexOf(q), starts = lower.flatMap((s, i) => s.startsWith(q) ? [i] : [])
      const match = exact >= 0 ? exact : starts.length === 1 ? starts[0] : -1
      if (match >= 0 && match !== pinned) pin(match)
    })
    search.addEventListener('keydown', e => {
      if (e.key !== 'Enter') return
      const q = search.value.trim().toLowerCase(), first = q ? lower.findIndex(s => s.includes(q)) : -1
      if (first >= 0) pin(first)
    })
  }

  // ── pointer: drag turns the cloud, a click selects, moving over a node names it ──
  let start: { x: number; y: number; moved: boolean } | null = null
  const local = (e: PointerEvent): [number, number] => { const r = canvas.getBoundingClientRect(); return [e.clientX - r.left, e.clientY - r.top] }
  canvas.addEventListener('pointerdown', e => { start = { x: e.clientX, y: e.clientY, moved: false }; canvas.setPointerCapture(e.pointerId) })
  canvas.addEventListener('pointermove', e => {
    if (!start) {
      const over = cloud.pick(...local(e), 6)
      if (over !== cloud.hover) { cloud.hover = over; canvas.style.cursor = over >= 0 ? 'pointer' : ''; repaint() }
      return
    }
    const dx = e.clientX - start.x, dy = e.clientY - start.y
    if (!start.moved && Math.hypot(dx, dy) < 5) return
    if (!start.moved) { start.moved = true; dragging = true; if (touring) { setTour(false); describe(cloud.focus, false) } }
    target = null
    cloud.yaw += dx * 0.008
    if (e.pointerType !== 'touch') cloud.pitch = Math.max(-1.2, Math.min(1.2, cloud.pitch + dy * 0.006))
    start.x = e.clientX; start.y = e.clientY
    repaint()
  })
  const release = (e: PointerEvent): void => {
    if (start && !start.moved && e.type === 'pointerup') pin(cloud.pick(...local(e), e.pointerType === 'touch' ? 16 : 7))
    dragging = false; start = null
  }
  canvas.addEventListener('pointerup', release)
  canvas.addEventListener('pointercancel', release)
  canvas.addEventListener('pointerleave', () => { if (cloud.hover >= 0) { cloud.hover = -1; repaint() } })

  setTour(touring)
  describe(-1, false)
  repaint()
}
