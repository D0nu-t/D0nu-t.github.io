import { Loop } from '../papers/hidden-choices/common'
import { prefersReducedMotion } from '../motion'
import { Sim, type Network, type Params } from './sim'
import { CloudView, type Link } from './view'
import { Foraging, type Brain } from './forage-ui'
import type { ForageSettings } from './forage'

// ─── Fly brain page ────────────────────────────────────────────────────────────
// Everything shown comes from data files: index.json lists the circuits, and each
// circuit's meta.json names its neurons, stimuli and readouts. Adding a circuit
// is a new folder of data (see tools/flybrain/README.md), not a change here.

const FORMAT = 1
const WINDOW_MS = 100                 // a neuron counts as active if it fired within this much brain time
const RATE_MS = 250                   // readout rates are averaged over this much brain time
const RASTER_MS = 250
const SPEEDS: Record<string, number> = { slow: 60, fast: 300 }   // ms of brain time per second
const COLOUR = { excites: '#4ade80', inhibits: '#f59e0b', silent: '#8b949e' }

interface IndexFile {
  format: number
  brain: { file: string; points: number; total_neurons: number }
  circuits: { id: string; title: string; summary: string; meta: string; neurons: number }[]
}
interface Group { id: string; label: string; neurons: number[]; rate_hz?: number }
interface Meta {
  format: number; id: string; title: string; summary: string
  source: { connectome: string; model: string; whole_brain_neurons: number }
  params: Params
  n: number; m: number; index_bits: number
  files: { positions: string; edges: string }
  neurons: { flywire_id: string[]; name: string[]; kind: string[]; transmitter: string[]; side: string[]; vfb_id: string[] }
  stimuli: Group[]
  readouts: Group[]
  forage?: ForageSettings | null
  reference: {
    trials: number
    baseline: { stimulus: string; active_neurons: number; readout_hz: Record<string, number> }[]
    silencing: { neuron: number; stimulus: string; trials: number; with_hz: Record<string, number>; readout_hz: Record<string, number> }[]
  }
}

const el = <K extends keyof HTMLElementTagNameMap>(tag: K, cls = '', text = ''): HTMLElementTagNameMap[K] => {
  const e = document.createElement(tag)
  if (cls) e.className = cls
  if (text) e.textContent = text
  return e
}
const need = <T extends Element>(root: ParentNode, sel: string): T => {
  const e = root.querySelector<T>(sel)
  if (!e) throw new Error(`fly brain: missing ${sel}`)
  return e
}
async function get(url: string): Promise<Response> {
  const r = await fetch(url)
  if (!r.ok) throw new Error(`${url}: ${r.status}`)
  return r
}

/** One loaded circuit: its simulation, its view and the page controls bound to them. */
class Session implements Brain {
  readonly sim: Sim
  readonly view: CloudView
  private net: Network
  private incoming: { from: number; weight: number }[][]
  private sign: Int8Array
  private lastSpike: Int32Array
  private rasterStep: number[] = []
  private rasterRow: number[] = []
  private rowOf: Int32Array
  private readoutSpikes: number[][]
  // running average of each readout since the visitor last changed something
  private avgFrom = 0
  private avgCount: number[]
  private on = new Set<string>()
  private stepsPerMs: number
  private carry = 0
  private frames = 0
  speed = SPEEDS.slow
  // view motion
  private swing = 0
  private yawHome = 0
  private idle = 10
  dragging = false
  private still = prefersReducedMotion()

  constructor(private root: HTMLElement, readonly meta: Meta, background: Int16Array, positions: Int16Array, edges: ArrayBuffer) {
    const { n, m } = meta
    const ptr = new Uint32Array(edges, 0, n + 1)
    const wide = meta.index_bits === 32
    const post = wide ? new Uint32Array(edges, 4 * (n + 1), m) : new Uint16Array(edges, 4 * (n + 1), m)
    const weight = new Int16Array(edges, 4 * (n + 1) + (wide ? 4 : 2) * m, m)
    this.net = { n, ptr, post, weight, params: meta.params }
    this.sim = new Sim(this.net)
    this.stepsPerMs = 1 / meta.params.dt

    // what each neuron does to its targets, and who talks to it
    this.sign = new Int8Array(n)
    this.incoming = Array.from({ length: n }, () => [])
    for (let i = 0; i < n; i++) {
      let sum = 0
      for (let k = ptr[i]; k < ptr[i + 1]; k++) { sum += weight[k]; this.incoming[post[k]].push({ from: i, weight: weight[k] }) }
      this.sign[i] = Math.sign(sum)
    }
    const colours = Array.from(this.sign, s => s > 0 ? COLOUR.excites : s < 0 ? COLOUR.inhibits : COLOUR.silent)
    this.view = new CloudView(need<HTMLCanvasElement>(root, '[data-fly="canvas"]'), background, positions, colours)
    this.view.ring([...meta.stimuli, ...meta.readouts].flatMap(g => g.neurons))

    // raster rows: stimulus neurons on top, readouts at the bottom
    const first = new Set(meta.stimuli.flatMap(g => g.neurons)), last = new Set(meta.readouts.flatMap(g => g.neurons))
    const order = [...first, ...Array.from({ length: n }, (_, i) => i).filter(i => !first.has(i) && !last.has(i)), ...last]
    this.rowOf = new Int32Array(n)
    order.forEach((i, row) => { this.rowOf[i] = row })
    this.lastSpike = new Int32Array(n).fill(-1e9)
    this.readoutSpikes = meta.readouts.map(() => [])
    this.avgCount = meta.readouts.map(() => 0)

    this.buildControls()
    this.pin(-1)
  }

  name(i: number): string { return this.meta.neurons.name[i] || `neuron …${this.meta.neurons.flywire_id[i].slice(-5)}` }
  /** Name plus L or R, since most cell types exist once on each side of the brain. */
  label(i: number): string {
    const side = this.meta.neurons.side[i]
    return side === 'left' || side === 'right' ? `${this.name(i)} ${side[0].toUpperCase()}` : this.name(i)
  }

  // ── controls built from the circuit's own description ──
  private buildControls(): void {
    const { meta, root } = this
    const stim = need<HTMLElement>(root, '[data-fly="stimuli"]')
    stim.replaceChildren(...meta.stimuli.map(g => {
      const b = el('button', 'demo-btn', g.label); b.type = 'button'
      b.setAttribute('aria-pressed', 'false')
      b.title = `Drive ${g.neurons.length} neurons at ${g.rate_hz} Hz`
      b.addEventListener('click', () => this.setStimulus(g.id, !this.on.has(g.id)))
      b.dataset.stimulus = g.id
      return b
    }))

    const outs = need<HTMLElement>(root, '[data-fly="readouts"]')
    outs.replaceChildren(...meta.readouts.map(g => {
      const box = el('div', 'fly-readout')
      const head = el('div', 'fly-readout-head')
      head.append(el('span', '', g.label), el('strong', '', '0 Hz'))
      const bar = el('div', 'fly-bar'); bar.append(el('span'))
      const avg = el('p', 'fly-note'); avg.dataset.avg = ''
      box.append(head, bar, avg)
      const ref = meta.reference.baseline[0]?.readout_hz[g.id]
      if (ref !== undefined) box.append(el('p', 'fly-note', `Whole-brain run with ${meta.stimuli[0].label.toLowerCase()} on: ${Math.round(ref)} Hz`))
      return box
    }))

    const tries = need<HTMLElement>(root, '[data-fly="try"]')
    const ro = meta.readouts[0]
    tries.replaceChildren(...meta.reference.silencing.map(s => {
      const change = ro ? `: ${Math.round(s.with_hz[ro.id])} → ${Math.round(s.readout_hz[ro.id])} Hz` : ''
      const b = el('button', 'sel-item', this.label(s.neuron) + change); b.type = 'button'
      if (ro) b.title = `${ro.label} with and without this neuron, in the whole-brain run`
      b.addEventListener('click', () => this.pin(s.neuron))
      return b
    }))
    need<HTMLElement>(root, '[data-fly="try-wrap"]').hidden = meta.reference.silencing.length === 0

    need<HTMLElement>(root, '[data-fly="summary"]').textContent =
      `${meta.title}. ${meta.n.toLocaleString('en')} of the model's ${meta.source.whole_brain_neurons.toLocaleString('en')} neurons, ${meta.m.toLocaleString('en')} connections.`
  }

  setStimulus(id: string, on: boolean): void {
    const g = this.meta.stimuli.find(s => s.id === id)
    if (!g) return
    if (on) this.on.add(id); else this.on.delete(id)
    this.sim.stimulate(g.neurons, on ? g.rate_hz ?? 150 : 0)
    this.changed()
    this.root.querySelector(`[data-stimulus="${id}"]`)?.setAttribute('aria-pressed', String(on))
  }

  /** Set the first stimulus to any strength; the foraging fly uses this when it lands on a node. */
  drive(rateHz: number): void {
    const g = this.meta.stimuli[0]
    if (!g) return
    if (rateHz > 0) this.on.add(g.id); else this.on.delete(g.id)
    this.sim.stimulate(g.neurons, rateHz)
    this.changed()
    this.root.querySelector(`[data-stimulus="${g.id}"]`)?.setAttribute('aria-pressed', String(rateHz > 0))
  }

  /** While the fly forages it owns the stimulus, so the visitor's buttons are switched off. */
  setManual(allowed: boolean): void {
    this.root.querySelectorAll<HTMLButtonElement>('[data-stimulus]').forEach(b => { b.disabled = !allowed })
    need<HTMLElement>(this.root, '[data-fly="stimuli-note"]').hidden = allowed
  }

  /** Restart the running averages: what is measured from here on belongs to the new set-up. */
  private changed(): void {
    this.avgFrom = this.sim.step
    this.avgCount.fill(0)
  }

  reset(): void {
    this.sim.reset()
    this.changed()
    this.rasterStep = []; this.rasterRow = []
    this.readoutSpikes.forEach(a => { a.length = 0 })
    this.lastSpike.fill(-1e9)
    this.view.calm()
    this.carry = 0
    this.paint()
  }

  // ── selection ──
  pin(i: number): void {
    const { view, net } = this
    view.pinned = i
    view.links = []
    if (i >= 0) {
      const out: Link[] = [], inn: Link[] = []
      for (let k = net.ptr[i]; k < net.ptr[i + 1]; k++) out.push({ to: net.post[k], strength: Math.abs(net.weight[k]), outgoing: true })
      for (const e of this.incoming[i]) inn.push({ to: e.from, strength: Math.abs(e.weight), outgoing: false })
      const top = (ls: Link[]): Link[] => ls.sort((a, b) => b.strength - a.strength).slice(0, 12)
      const links = [...top(out), ...top(inn)]
      const max = Math.max(1, ...links.map(l => l.strength))
      view.links = links.map(l => ({ ...l, strength: l.strength / max }))
    }
    this.renderDetails()
    this.paint()
  }

  private renderDetails(): void {
    const box = need<HTMLElement>(this.root, '[data-fly="details"]')
    const i = this.view.pinned
    box.replaceChildren()
    box.hidden = i < 0
    if (i < 0) return
    const { neurons } = this.meta, { net } = this

    const head = el('div', 'sel-head')
    const dot = el('span', 'sel-dot'); dot.style.background = this.sign[i] > 0 ? COLOUR.excites : this.sign[i] < 0 ? COLOUR.inhibits : COLOUR.silent
    head.append(dot, el('strong', '', this.name(i)), el('span', 'sel-kind', neurons.kind[i].replace(/_/g, ' ')))
    const clear = el('button', 'sel-clear', 'Clear'); clear.type = 'button'
    clear.addEventListener('click', () => this.pin(-1))
    head.append(clear)
    box.append(head)

    const row = (key: string, ...content: (Node | string)[]): void => {
      const r = el('div', 'sel-row'); const v = el('span', 'sel-items'); v.append(...content)
      r.append(el('span', 'sel-key', key), v); box.append(r)
    }
    const effect = this.sign[i] > 0 ? 'excites its targets' : this.sign[i] < 0 ? 'inhibits its targets' : 'no outputs in this circuit'
    row('Transmitter', `${neurons.transmitter[i] || 'not predicted'} (${effect})`)
    if (neurons.side[i]) row('Side', neurons.side[i])
    row('FlyWire ID', neurons.flywire_id[i])
    row('Spikes so far', String(this.sim.counts[i]))

    const partner = (j: number, weight: number): HTMLButtonElement => {
      const b = el('button', 'sel-item', `${this.label(j)} ${weight > 0 ? '+' : '−'}${Math.abs(weight)}`); b.type = 'button'
      b.title = `${Math.abs(weight)} synapses, ${weight > 0 ? 'excitatory' : 'inhibitory'}`
      b.addEventListener('click', () => this.pin(j))
      return b
    }
    const out: [number, number][] = []
    for (let k = net.ptr[i]; k < net.ptr[i + 1]; k++) out.push([net.post[k], net.weight[k]])
    const inn = this.incoming[i].map(e => [e.from, e.weight] as [number, number])
    const top = (ps: [number, number][]): HTMLButtonElement[] =>
      ps.sort((a, b) => Math.abs(b[1]) - Math.abs(a[1])).slice(0, 6).map(([j, w]) => partner(j, w))
    if (out.length) row(`Sends to (${out.length})`, ...top(out))
    if (inn.length) row(`Hears from (${inn.length})`, ...top(inn))

    const mute = el('button', 'demo-btn', this.sim.isSilenced(i) ? 'Restore this neuron' : 'Silence this neuron'); mute.type = 'button'
    mute.setAttribute('aria-pressed', String(this.sim.isSilenced(i)))
    mute.addEventListener('click', () => { this.silence(i, !this.sim.isSilenced(i)); this.renderDetails() })
    box.append(mute)
  }

  silence(i: number, on: boolean): void {
    this.sim.silence(i, on)
    this.view.cross(i, on)
    this.changed()
    const all = this.sim.silenced
    const wrap = need<HTMLElement>(this.root, '[data-fly="silenced"]')
    wrap.hidden = all.length === 0
    need<HTMLElement>(wrap, 'span').textContent = `Silenced: ${all.map(j => this.label(j)).join(', ')}`
    this.paint()
  }
  restoreAll(): void {
    for (const i of this.sim.silenced) this.silence(i, false)
    this.renderDetails()
  }

  // ── pointer: drag turns the brain, a click picks a neuron ──
  turn(dx: number, dy: number): void {
    this.view.yaw += dx * 0.008
    this.view.pitch = Math.max(-0.9, Math.min(0.9, this.view.pitch + dy * 0.006))
    this.idle = 0
    this.yawHome = this.view.yaw - 0.5 * Math.sin(this.swing)
  }

  // ── one animation frame; returns the brain time that passed (ms) and the first readout's spikes ──
  frame(dt: number): [number, number] {
    // sway slowly once the visitor has let go (not for visitors who asked for less motion)
    this.idle += dt
    if (!this.still && !this.dragging && this.idle > 2.5) {
      this.swing += dt * 0.22
      this.view.yaw = this.yawHome + 0.5 * Math.sin(this.swing)
    }

    this.carry += this.speed * dt * this.stepsPerMs
    const steps = Math.min(80, Math.floor(this.carry))
    this.carry -= steps
    const readouts = this.meta.readouts
    const before = this.avgCount[0] ?? 0
    for (let s = 0; s < steps; s++) {
      const spikes = this.sim.tick(), t = this.sim.step
      if (!spikes.length) continue
      const shown = spikes.filter(i => !this.sim.isSilenced(i))
      this.view.flash(shown)
      for (const i of shown) { this.lastSpike[i] = t; this.rasterStep.push(t); this.rasterRow.push(i) }
      readouts.forEach((g, r) => { for (const i of spikes) if (g.neurons.includes(i)) { this.readoutSpikes[r].push(t); this.avgCount[r]++ } })
    }
    this.paint(true)
    return [steps / this.stepsPerMs, (this.avgCount[0] ?? 0) - before]
  }

  /** Redraw everything; `advance` lets the spike glow fade. */
  paint(advance = false): void {
    this.view.draw(advance ? 0.86 : 1)
    this.drawRaster()
    if (!advance || this.frames++ % 6 === 0) this.report()
  }

  private report(): void {
    const t = this.sim.step, windowSteps = WINDOW_MS * this.stepsPerMs, rateSteps = RATE_MS * this.stepsPerMs
    const span = Math.max(1, Math.min(rateSteps, t)) / this.stepsPerMs / 1000    // seconds
    this.meta.readouts.forEach((g, r) => {
      const a = this.readoutSpikes[r]
      while (a.length && a[0] <= t - rateSteps) a.shift()
      const hz = a.length / g.neurons.length / span
      const box = this.root.querySelectorAll<HTMLElement>('.fly-readout')[r]
      if (!box) return
      need<HTMLElement>(box, 'strong').textContent = `${Math.round(hz)} Hz`
      need<HTMLElement>(box, '.fly-bar span').style.width = `${Math.min(100, hz / 1.5)}%`
      const ms = (t - this.avgFrom) / this.stepsPerMs
      need<HTMLElement>(box, '[data-avg]').textContent = ms < 100 ? 'Average since the last change: measuring'
        : `Average since the last change: ${Math.round(this.avgCount[r] / g.neurons.length / (ms / 1000))} Hz over ${(ms / 1000).toFixed(1)} s`
    })
    let active = 0
    for (let i = 0; i < this.sim.n; i++) if (this.lastSpike[i] > t - windowSteps) active++
    need<HTMLElement>(this.root, '[data-fly="status"]').textContent =
      `Brain time ${Math.round(this.sim.timeMs)} ms · ${active} neurons active in the last ${WINDOW_MS} ms`
  }

  private drawRaster(): void {
    const canvas = need<HTMLCanvasElement>(this.root, '[data-fly="raster"]')
    const r = canvas.getBoundingClientRect(), dpr = Math.min(window.devicePixelRatio || 1, 2)
    const w = Math.max(1, r.width), h = Math.max(1, r.height)
    if (canvas.width !== Math.round(w * dpr)) { canvas.width = Math.round(w * dpr); canvas.height = Math.round(h * dpr) }
    const ctx = canvas.getContext('2d')!
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
    ctx.fillStyle = '#0d1117'; ctx.fillRect(0, 0, w, h)
    const t = this.sim.step, span = RASTER_MS * this.stepsPerMs
    // forget spikes that have scrolled off
    let drop = 0
    while (drop < this.rasterStep.length && this.rasterStep[drop] < t - span) drop++
    if (drop > 2000) { this.rasterStep.splice(0, drop); this.rasterRow.splice(0, drop); drop = 0 }
    const n = this.sim.n
    for (let k = drop; k < this.rasterStep.length; k++) {
      const i = this.rasterRow[k]
      ctx.fillStyle = this.sign[i] > 0 ? COLOUR.excites : this.sign[i] < 0 ? COLOUR.inhibits : COLOUR.silent
      ctx.fillRect(w * (1 - (t - this.rasterStep[k]) / span), 3 + (this.rowOf[i] / n) * (h - 6), 1.5, 1.5)
    }
  }
}

/** Mount the fly brain in `root`; data files are read from `root.dataset.src`. */
export async function mountFlyBrain(root: HTMLElement): Promise<void> {
  const base = (root.dataset.src ?? '../data/flybrain/').replace(/\/?$/, '/')
  const status = need<HTMLElement>(root, '[data-fly="status"]')
  const canvas = need<HTMLCanvasElement>(root, '[data-fly="canvas"]')
  let session: Session | null = null

  const index = await (await get(`${base}index.json`)).json() as IndexFile
  if (index.format !== FORMAT) throw new Error(`data format ${index.format}, this page reads ${FORMAT}`)
  const background = new Int16Array(await (await get(base + index.brain.file)).arrayBuffer())

  // run whenever the brain itself is on screen, even if the controls below it are not
  const foraging = new Foraging(root)
  const loop = new Loop(root, dt => {
    if (!session) return
    const [ms, spikes] = session.frame(dt)
    foraging.frame(dt, ms, spikes)
  }, canvas)

  async function open(id: string): Promise<void> {
    const entry = index.circuits.find(c => c.id === id) ?? index.circuits[0]
    status.textContent = `Loading ${entry.title}…`
    const meta = await (await get(base + entry.meta)).json() as Meta
    if (meta.format !== FORMAT) throw new Error(`circuit format ${meta.format}, this page reads ${FORMAT}`)
    const dir = base + entry.meta.replace(/[^/]*$/, '')
    const [pos, edges] = await Promise.all([get(dir + meta.files.positions), get(dir + meta.files.edges)].map(async r => (await r).arrayBuffer()))
    session?.view.dispose()
    session = new Session(root, meta, background, new Int16Array(pos), edges)
    root.querySelectorAll<HTMLElement>('[data-circuit]').forEach(b => b.setAttribute('aria-pressed', String(b.dataset.circuit === entry.id)))
    foraging.attach(session, meta.forage)
    // without a foraging fly, start with the first stimulus on (unless the visitor asked for less motion)
    if (!foraging.on && !prefersReducedMotion() && meta.stimuli[0]) session.setStimulus(meta.stimuli[0].id, true)
    session.paint()
  }

  // circuit picker, shown only when there is a choice
  const picker = need<HTMLElement>(root, '[data-fly="circuits"]')
  picker.hidden = index.circuits.length < 2
  picker.replaceChildren(...index.circuits.map(c => {
    const b = el('button', 'demo-btn', c.title); b.type = 'button'; b.dataset.circuit = c.id; b.title = c.summary
    b.addEventListener('click', () => { void open(c.id) })
    return b
  }))

  need<HTMLElement>(root, '[data-action="reset"]').addEventListener('click', () => { session?.reset(); foraging.restart(); foraging.paint() })
  need<HTMLElement>(root, '[data-action="restore"]').addEventListener('click', () => session?.restoreAll())
  root.querySelectorAll<HTMLButtonElement>('[data-speed]').forEach(b => b.addEventListener('click', () => {
    if (session) session.speed = SPEEDS[b.dataset.speed ?? 'slow'] ?? SPEEDS.slow
    root.querySelectorAll('[data-speed]').forEach(o => o.setAttribute('aria-pressed', String(o === b)))
  }))

  // drag to turn, click to pick; vertical touch drags still scroll the page
  let start: { x: number; y: number; moved: boolean } | null = null
  canvas.addEventListener('pointerdown', e => { start = { x: e.clientX, y: e.clientY, moved: false }; canvas.setPointerCapture(e.pointerId) })
  canvas.addEventListener('pointermove', e => {
    if (!start || !session) return
    const dx = e.clientX - start.x, dy = e.clientY - start.y
    if (!start.moved && Math.hypot(dx, dy) < 5) return
    start.moved = true; session.dragging = true
    session.turn(dx, e.pointerType === 'touch' ? 0 : dy)
    start.x = e.clientX; start.y = e.clientY
    if (!loop.playing) session.paint()
  })
  const release = (e: PointerEvent): void => {
    if (!start || !session) { start = null; return }
    if (!start.moved && e.type === 'pointerup') {
      const r = canvas.getBoundingClientRect()
      session.pin(session.view.pick(e.clientX - r.left, e.clientY - r.top, e.pointerType === 'touch' ? 22 : 12))
    }
    session.dragging = false; start = null
  }
  canvas.addEventListener('pointerup', release)
  canvas.addEventListener('pointercancel', release)

  await open(index.circuits[0].id)
}

document.querySelectorAll<HTMLElement>('[data-flybrain]').forEach(root => {
  mountFlyBrain(root).catch(err => {
    console.error(err)
    const status = root.querySelector<HTMLElement>('[data-fly="status"]')
    if (status) status.textContent = 'The fly brain data could not be loaded.'
  })
})
