import type { NodeCategory } from '../types'

// ─── Foraging over a graph ─────────────────────────────────────────────────────
// A fly moves from node to node. It heads for whichever node it perceives as
// sweetest, tastes it, and either picks it up (its sweetness drops to zero) or
// gives up and leaves. This file is only the rule and the bookkeeping: it knows
// nothing about the page, the drawing or the brain simulation. The caller tells
// it how much brain time passed and how many readout spikes arrived.

/** Everything that shapes sweetness. Change the numbers here to change the fly's taste. */
export const SWEETNESS = {
  // how much each ingredient counts towards a node's own sweetness (they need not sum to 1)
  connectedness: 0.5,
  type: 0.3,
  category: 0.2,
  recency: 0,                 // off until nodes carry a `since` year
  typeWeight: { project: 1, work: 0.8, academic: 0.8, skill: 0.4 } as Record<string, number>,
  categoryWeight: { project: 1, work: 1, academic: 1, lang: 1, ml: 1, genai: 1, infra: 1, cloud: 1, data: 1 } as Record<NodeCategory, number>,
  // nearness: a node this far away (as a share of the graph's radius) smells half as sweet
  halfDistance: 0.6,
  // the fly's perception is a little noisy, so ties break differently each round
  noise: 0.08,
}

export interface Food {
  type: string
  category: NodeCategory
  degree: number
  since?: number              // year; optional, used only when SWEETNESS.recency > 0
}

export interface ForageSettings {
  min_rate_hz: number         // taste drive for the least sweet node
  max_rate_hz: number         // taste drive for the sweetest node
  spikes_to_eat: number       // readout spikes needed to pick a node up
  give_up_ms: number          // brain time after which the fly leaves a node untouched
}

export interface Breakdown {
  connectedness: number; type: number; category: number; recency: number
  own: number                 // the node's own sweetness, 0 to 1 across the graph
  nearness: number
  perceived: number           // what the fly acts on: own × nearness × what is left
  remaining: number
  skipped: boolean
}

export type Outcome = 'picked' | 'refused' | null

function mulberry32(seed: number): () => number {
  let a = seed >>> 0
  return () => {
    a = (a + 0x6d2b79f5) >>> 0
    let t = a
    t = Math.imul(t ^ (t >>> 15), t | 1)
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61)
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

export class Forager {
  readonly n: number
  /** 1 while a node is untouched, 0 once it has been picked up. */
  readonly remaining: Float32Array
  /** The node the fly is on, or was last on; -1 before the first landing. */
  current = -1
  /** Where it is heading or what it is tasting; -1 when idle. */
  target = -1
  phase: 'idle' | 'flying' | 'tasting' = 'idle'
  round = 1
  /** Nodes picked up this round, in order. */
  picked: number[] = []
  spikes = 0
  tastedMs = 0

  private own: Float32Array            // each node's own sweetness, scaled to 0..1
  private parts: { connectedness: number; type: number; category: number; recency: number }[]
  private skipped: Uint8Array          // tasted and left this round
  private radius: number
  private rand: () => number

  constructor(foods: Food[], private positions: Int16Array, readonly settings: ForageSettings, private seed = 3) {
    this.n = foods.length
    this.remaining = new Float32Array(this.n).fill(1)
    this.skipped = new Uint8Array(this.n)
    this.rand = mulberry32(seed)

    const maxDegree = Math.max(1, ...foods.map(f => f.degree))
    const years = foods.map(f => f.since).filter((y): y is number => y !== undefined)
    const lo = Math.min(...years), hi = Math.max(...years)
    this.parts = foods.map(f => ({
      // on a log scale: one hub with dozens of links would otherwise flatten every other node to near zero
      connectedness: Math.log1p(f.degree) / Math.log1p(maxDegree),
      type: SWEETNESS.typeWeight[f.type] ?? 0.4,
      category: SWEETNESS.categoryWeight[f.category] ?? 1,
      // newer is sweeter; a node with no year is neutral
      recency: f.since === undefined || hi === lo ? 0.5 : (f.since - lo) / (hi - lo),
    }))
    const raw = this.parts.map(p =>
      SWEETNESS.connectedness * p.connectedness + SWEETNESS.type * p.type + SWEETNESS.category * p.category + SWEETNESS.recency * p.recency)
    const min = Math.min(...raw), span = Math.max(1e-9, Math.max(...raw) - min)
    this.own = Float32Array.from(raw, r => (r - min) / span)

    let far = 1
    for (let i = 0; i < this.n; i++) far = Math.max(far, Math.hypot(positions[3 * i], positions[3 * i + 1], positions[3 * i + 2]))
    this.radius = far
  }

  /** Own sweetness of a node, 0 (least sweet in the graph) to 1 (sweetest). */
  sweetness(i: number): number { return this.own[i] }

  /** How hard the taste neurons are driven when the fly lands on node i. */
  rateFor(i: number): number {
    const s = this.settings
    return s.min_rate_hz + this.own[i] * (s.max_rate_hz - s.min_rate_hz)
  }

  private distance(i: number, from: number): number {
    if (from < 0) return Math.hypot(this.positions[3 * i], this.positions[3 * i + 1], this.positions[3 * i + 2])
    return Math.hypot(this.positions[3 * i] - this.positions[3 * from], this.positions[3 * i + 1] - this.positions[3 * from + 1],
      this.positions[3 * i + 2] - this.positions[3 * from + 2])
  }

  /** How sweet node i looks from where the fly is now, before noise. */
  breakdown(i: number): Breakdown {
    const nearness = 1 / (1 + this.distance(i, this.current) / (SWEETNESS.halfDistance * this.radius))
    // a small floor keeps the least sweet node visible to the fly at all
    const perceived = this.remaining[i] * (0.05 + this.own[i]) * nearness
    return { ...this.parts[i], own: this.own[i], nearness, perceived, remaining: this.remaining[i], skipped: this.skipped[i] === 1 }
  }

  private available(i: number): boolean { return i !== this.current && this.remaining[i] > 0 && !this.skipped[i] }

  /** Pick the next node and set off. The node the fly is on is never chosen, so it cannot pick the same node twice in a row. */
  depart(): number {
    let any = false
    for (let i = 0; i < this.n; i++) if (this.available(i)) { any = true; break }
    if (!any) this.newRound()
    let best = -1, bestScore = -1
    for (let i = 0; i < this.n; i++) {
      if (!this.available(i)) continue
      const score = this.breakdown(i).perceived * (1 + SWEETNESS.noise * (this.rand() - 0.5))
      if (score > bestScore) { bestScore = score; best = i }
    }
    this.target = best
    this.phase = best < 0 ? 'idle' : 'flying'
    return best
  }

  /** The fly has arrived. Returns the taste drive in Hz. */
  land(): number {
    this.current = this.target
    this.phase = 'tasting'
    this.spikes = 0
    this.tastedMs = 0
    return this.rateFor(this.current)
  }

  /** Brain time passes while tasting. Returns 'picked' or 'refused' once the fly has decided. */
  taste(ms: number, readoutSpikes: number): Outcome {
    if (this.phase !== 'tasting') return null
    this.spikes += readoutSpikes
    this.tastedMs += ms
    if (this.spikes >= this.settings.spikes_to_eat) {
      this.remaining[this.current] = 0
      this.picked.push(this.current)
      this.phase = 'idle'
      return 'picked'
    }
    if (this.tastedMs >= this.settings.give_up_ms) {
      this.skipped[this.current] = 1
      this.phase = 'idle'
      return 'refused'
    }
    return null
  }

  /** Everything grows back. The fly stays where it is. */
  private newRound(): void {
    this.remaining.fill(1)
    this.skipped.fill(0)
    this.picked = []
    this.round++
  }

  /** Back to the very start, replaying the same choices. */
  reset(): void {
    this.remaining.fill(1)
    this.skipped.fill(0)
    this.picked = []
    this.round = 1
    this.current = -1; this.target = -1; this.phase = 'idle'
    this.spikes = 0; this.tastedMs = 0
    this.rand = mulberry32(this.seed)
  }
}
