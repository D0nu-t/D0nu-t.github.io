import { buildNodes, RAW_LINKS, CATEGORY_COLOR, CATEGORY_LABEL } from '../graph-data'
import { nodeName } from '../graph-text'
import { prefersReducedMotion } from '../motion'
import { Forager, type ForageSettings } from './forage'
import { GraphCloud } from './graph-cloud'
import { layout3d } from './layout3d'

// ─── The foraging fly on the page ──────────────────────────────────────────────
// Joins three things that otherwise know nothing of each other: the foraging
// rule (forage.ts), the 3-D drawing of the skills graph (graph-cloud.ts) and the
// brain simulation, which it reaches only through the small Brain interface.

/** What the fly needs from the brain: set the taste drive, and say whether the visitor may. */
export interface Brain {
  drive(rateHz: number): void
  setManual(allowed: boolean): void
}

const FLIGHT_S = 1.2      // seconds on screen to fly between two nodes
const REST_S = 0.55       // pause after deciding, so the outcome can be seen

const el = <K extends keyof HTMLElementTagNameMap>(tag: K, cls = '', text = ''): HTMLElementTagNameMap[K] => {
  const e = document.createElement(tag)
  if (cls) e.className = cls
  if (text) e.textContent = text
  return e
}

export class Foraging {
  readonly cloud: GraphCloud
  on = true
  dragging = false

  private nodes = buildNodes()
  private names: string[]
  private positions: Int16Array
  private forager: Forager | null = null
  private brain: Brain | null = null
  private from: [number, number, number] = [0, 0, 0]
  private flight = 0
  private rest = 0
  private frames = 0
  private shownRound = 1
  private still = prefersReducedMotion()
  private q: <T extends HTMLElement>(name: string) => T

  constructor(root: HTMLElement) {
    this.q = <T extends HTMLElement>(name: string): T => {
      const e = root.querySelector<T>(`[data-fly="${name}"]`)
      if (!e) throw new Error(`fly brain: missing ${name}`)
      return e
    }
    const index = new Map(this.nodes.map((n, i) => [n.id, i]))
    const edges = RAW_LINKS.map(l => [index.get(l.source), index.get(l.target)] as [number | undefined, number | undefined])
      .filter((e): e is [number, number] => e[0] !== undefined && e[1] !== undefined)
    this.names = this.nodes.map(nodeName)
    this.positions = layout3d(this.nodes.length, edges)
    const sizes = Float32Array.from(this.nodes, n => n.type === 'skill' ? 2.6 + Math.min(6, n.degree ?? 0) * 0.45 : 6.5)
    const headline = new Set(this.nodes.flatMap((n, i) => n.type === 'skill' ? [] : [i]))
    this.cloud = new GraphCloud(this.q<HTMLCanvasElement>('graph'), this.positions, this.nodes.map(n => CATEGORY_COLOR[n.category]),
      sizes, edges, this.names, headline)

    this.q('forage-toggle').addEventListener('click', () => this.setOn(!this.on))
    this.wirePointer()
  }

  /** Connect to a brain (a newly loaded circuit). Without settings the circuit cannot forage. */
  attach(brain: Brain, settings: ForageSettings | null | undefined): void {
    this.brain = brain
    this.q('forage-wrap').hidden = !settings
    this.forager = settings ? new Forager(
      this.nodes.map(n => ({ type: n.type, category: n.category, degree: n.degree ?? 0, since: n.since })), this.positions, settings) : null
    this.restart()
    this.setOn(this.on && !!settings)
  }

  setOn(on: boolean): void {
    this.on = on && !!this.forager
    const b = this.q('forage-toggle')
    b.setAttribute('aria-pressed', String(this.on))
    this.brain?.setManual(!this.on)
    if (!this.on) {
      // hand the brain back quiet; the fly stays where it is
      if (this.forager && this.forager.phase !== 'idle') { this.forager.phase = 'idle'; this.forager.target = this.forager.current }
      this.cloud.flying = false
      this.brain?.drive(0)
      this.say('The crawler is off. The stimulus button is yours.')
    } else {
      this.brain?.drive(0)
      this.say('The crawler is choosing a node.')
    }
    this.paint()
  }

  /** Back to the first node of the first round. */
  restart(): void {
    const f = this.forager
    if (!f) return
    f.reset()
    this.shownRound = 1
    this.cloud.spent.fill(0)
    this.cloud.focus = -1
    this.cloud.marker = null
    this.cloud.flying = false
    this.cloud.clearTrail()
    this.flight = 0; this.rest = 0
    if (this.on) this.brain?.drive(0)
    this.q('forage-picks').replaceChildren()
    this.q('forage-progress').textContent = ''
    this.refresh()
  }

  // ── one animation frame: `ms` of brain time passed and the readout fired `spikes` times ──
  frame(dt: number, ms: number, spikes: number): void {
    if (!this.still && !this.dragging) this.cloud.yaw += dt * 0.09
    const f = this.forager
    if (f && this.on) {
      if (f.phase === 'idle') {
        this.rest -= dt
        if (this.rest <= 0) this.depart(f)
      } else if (f.phase === 'flying') {
        this.flight += this.still ? 1 : dt / FLIGHT_S
        const k = Math.min(1, this.flight), ease = 0.5 - 0.5 * Math.cos(k * Math.PI)
        const to = this.cloud.position(f.target)
        // a shallow arc, so the path reads as flight and not a slide
        this.cloud.marker = [0, 1, 2].map(a => this.from[a] + (to[a] - this.from[a]) * ease + (a === 1 ? Math.sin(k * Math.PI) * 2600 : 0)) as [number, number, number]
        if (k >= 1) this.land(f)
      } else {
        const outcome = f.taste(ms, spikes)
        this.q('forage-progress').textContent =
          `Motor neuron spikes: ${Math.min(f.spikes, f.settings.spikes_to_eat)} of ${f.settings.spikes_to_eat} · ${Math.round(f.tastedMs)} of ${f.settings.give_up_ms} ms`
        if (outcome) this.decide(f, outcome)
      }
    }
    if (this.frames++ % 12 === 0) this.refresh()
    this.cloud.draw(dt)
  }

  paint(): void { this.cloud.draw(0) }

  private depart(f: Forager): void {
    const to = f.depart()
    if (to < 0) return
    this.from = this.cloud.marker ?? this.cloud.position(to)
    this.flight = this.cloud.marker ? 0 : 1          // the very first node: the fly simply appears there
    this.cloud.focus = to
    this.cloud.flying = true
    this.brain?.drive(0)
    if (f.round !== this.shownRound) { this.cloud.spent.fill(0); this.shownRound = f.round }   // everything grew back
    this.q('forage-progress').textContent = ''
    this.say(`Moving to ${this.names[to]}.`, false)
    this.setSweetness(f.sweetness(to))
  }

  private land(f: Forager): void {
    const rate = f.land()
    this.cloud.flying = false
    this.cloud.marker = this.cloud.position(f.current)
    this.brain?.drive(rate)
    this.say(`Reading ${this.names[f.current]}: taste neurons driven at ${Math.round(rate)} Hz.`)
  }

  private decide(f: Forager, outcome: 'picked' | 'refused'): void {
    const i = f.current
    this.brain?.drive(0)
    this.cloud.spent[i] = outcome === 'picked' ? 1 : 2
    this.rest = this.still ? 0.9 : REST_S
    if (outcome === 'picked') {
      this.cloud.flash(i)
      this.say(`Picked up ${this.names[i]} after ${Math.round(f.tastedMs)} ms.`)
      const li = el('li', '', this.names[i]); li.style.borderColor = CATEGORY_COLOR[this.nodes[i].category]
      const list = this.q('forage-picks')
      list.prepend(li)
      while (list.children.length > 5) list.lastElementChild?.remove()
    } else {
      this.say(`Left ${this.names[i]}: signal too weak to pick up.`)
    }
    this.refresh()
    if (this.cloud.pinned >= 0) this.renderNode()
  }

  private say(text: string, announce = true): void {
    // only landings and outcomes go to the live region; flights would be too chatty
    const live = this.q('forage-status')
    live.setAttribute('aria-live', announce ? 'polite' : 'off')
    live.textContent = text
  }

  private setSweetness(v: number): void {
    this.q('forage-sweet').style.width = `${Math.round(v * 100)}%`
    this.q('forage-sweet-value').textContent = `${Math.round(v * 100)}%`
  }

  /** Recompute how sweet every node looks from where the fly is, and the tally. */
  private refresh(): void {
    const f = this.forager
    if (!f) return
    let max = 1e-9
    const seen = new Float32Array(f.n)
    for (let i = 0; i < f.n; i++) { seen[i] = this.cloud.spent[i] ? 0 : f.breakdown(i).perceived; max = Math.max(max, seen[i]) }
    for (let i = 0; i < f.n; i++) this.cloud.halo[i] = seen[i] / max
    let left = 0
    for (let i = 0; i < f.n; i++) if (this.cloud.spent[i] === 2) left++
    this.q('forage-count').textContent = `Round ${f.round}: picked ${f.picked.length} of ${f.n}` + (left ? `, left ${left}` : '')
  }

  // ── selection: what makes this node sweet ──
  private renderNode(): void {
    const box = this.q('node-details'), i = this.cloud.pinned, f = this.forager
    box.replaceChildren()
    box.hidden = i < 0 || !f
    if (i < 0 || !f) return
    const n = this.nodes[i], b = f.breakdown(i)
    const head = el('div', 'sel-head')
    const dot = el('span', 'sel-dot'); dot.style.background = CATEGORY_COLOR[n.category]
    head.append(dot, el('strong', '', this.names[i]), el('span', 'sel-kind', n.type === 'project' ? 'Project' : CATEGORY_LABEL[n.category]))
    const clear = el('button', 'sel-clear', 'Clear'); clear.type = 'button'
    clear.addEventListener('click', () => { this.cloud.pinned = -1; this.renderNode(); this.paint() })
    head.append(clear)
    box.append(head)
    const pct = (v: number): string => `${Math.round(v * 100)}%`
    const rows: [string, string][] = [
      ['Connections', `${n.degree ?? 0} (scores ${pct(b.connectedness)}, on a log scale)`],
      ['Type', `${n.type}, weight ${b.type}`],
      ['Category', `${CATEGORY_LABEL[n.category]}, weight ${b.category}`],
      ['Own signal', `${pct(b.own)}: taste drive ${Math.round(f.rateFor(i))} Hz`],
      ['Nearness', i === f.current ? 'the crawler is here' : pct(b.nearness)],
      ['State', this.cloud.spent[i] === 1 ? 'picked up this round, signal 0' : this.cloud.spent[i] === 2 ? 'read and left this round' : 'untouched'],
    ]
    for (const [key, value] of rows) {
      const r = el('div', 'sel-row'); r.append(el('span', 'sel-key', key), el('span', 'sel-items', value)); box.append(r)
    }
  }

  private wirePointer(): void {
    const canvas = this.q<HTMLCanvasElement>('graph')
    let start: { x: number; y: number; moved: boolean } | null = null
    canvas.addEventListener('pointerdown', e => { start = { x: e.clientX, y: e.clientY, moved: false }; canvas.setPointerCapture(e.pointerId) })
    canvas.addEventListener('pointermove', e => {
      if (!start) return
      const dx = e.clientX - start.x, dy = e.clientY - start.y
      if (!start.moved && Math.hypot(dx, dy) < 5) return
      start.moved = true; this.dragging = true
      this.cloud.yaw += dx * 0.008
      if (e.pointerType !== 'touch') this.cloud.pitch = Math.max(-1.2, Math.min(1.2, this.cloud.pitch + dy * 0.006))
      start.x = e.clientX; start.y = e.clientY
      this.paint()
    })
    const release = (e: PointerEvent): void => {
      if (start && !start.moved && e.type === 'pointerup') {
        const r = canvas.getBoundingClientRect()
        this.cloud.pinned = this.cloud.pick(e.clientX - r.left, e.clientY - r.top, e.pointerType === 'touch' ? 16 : 7)
        this.renderNode()
        this.paint()
      }
      this.dragging = false; start = null
    }
    canvas.addEventListener('pointerup', release)
    canvas.addEventListener('pointercancel', release)
  }
}
