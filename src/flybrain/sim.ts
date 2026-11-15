// ─── Leaky integrate-and-fire network ──────────────────────────────────────────
// The model of Shiu et al. (Nature 2024), following tools/flybrain/lif.py step
// for step. Nothing here touches the page: typed arrays in, spikes out, so the
// same class can run in a worker or be replaced by a faster implementation.

export interface Params {
  v_rest: number; v_reset: number; v_thresh: number   // mV
  tau_m: number; tau_syn: number                       // ms
  t_refrac: number; t_delay: number; dt: number        // ms
  w_syn: number                                        // mV per synapse
  poisson_factor: number
}

/** A network in CSR form: connections leaving neuron i are ptr[i] .. ptr[i+1]. */
export interface Network {
  n: number
  ptr: Uint32Array
  post: Uint16Array | Uint32Array
  weight: Int16Array            // signed synapse count
  params: Params
}

/** Seeded PRNG (mulberry32), so Reset replays the same run. */
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

export class Sim {
  readonly n: number
  /** Steps taken since the last reset; brain time is step * params.dt milliseconds. */
  step = 0
  /** Spikes per neuron since the last reset. */
  readonly counts: Uint32Array

  private v: Float64Array
  private g: Float64Array
  private freeAt: Int32Array          // first step at which the neuron integrates again
  private pEvent: Float64Array        // chance of a Poisson event per step; 0 when not stimulated
  private stimulated: number[] = []
  private muted: Uint8Array
  private history: number[][]         // spikes waiting out the synaptic delay
  private rand: () => number
  private readonly em: number
  private readonly es: number
  private readonly a: number
  private readonly refracSteps: number
  private readonly delaySteps: number

  constructor(private net: Network, private seed = 1) {
    const p = net.params
    this.n = net.n
    this.v = new Float64Array(net.n).fill(p.v_rest)
    this.g = new Float64Array(net.n)
    this.freeAt = new Int32Array(net.n)
    this.pEvent = new Float64Array(net.n)
    this.muted = new Uint8Array(net.n)
    this.counts = new Uint32Array(net.n)
    this.refracSteps = Math.round(p.t_refrac / p.dt)
    this.delaySteps = Math.round(p.t_delay / p.dt)
    this.history = Array.from({ length: this.delaySteps }, () => [])
    // exact solution of dv/dt = (v_rest - v + g) / tau_m, dg/dt = -g / tau_syn over one step
    this.em = Math.exp(-p.dt / p.tau_m)
    this.es = Math.exp(-p.dt / p.tau_syn)
    this.a = p.tau_syn / (p.tau_syn - p.tau_m)
    this.rand = mulberry32(seed)
  }

  get timeMs(): number { return this.step * this.net.params.dt }

  /** Drive `neurons` with Poisson input at `rateHz`; 0 switches the drive off. */
  stimulate(neurons: number[], rateHz: number): void {
    const p = rateHz * this.net.params.dt / 1000
    for (const i of neurons) this.pEvent[i] = p
    this.stimulated = []
    for (let i = 0; i < this.n; i++) if (this.pEvent[i] > 0) this.stimulated.push(i)
  }

  /** A silenced neuron still integrates, but nothing it sends arrives. */
  silence(i: number, on: boolean): void { this.muted[i] = on ? 1 : 0 }
  isSilenced(i: number): boolean { return this.muted[i] === 1 }
  get silenced(): number[] { const out: number[] = []; this.muted.forEach((m, i) => { if (m) out.push(i) }); return out }

  /** Back to rest. Stimuli and silenced neurons are kept; the random stream restarts. */
  reset(): void {
    this.v.fill(this.net.params.v_rest); this.g.fill(0); this.freeAt.fill(0); this.counts.fill(0)
    this.history = Array.from({ length: this.delaySteps }, () => [])
    this.rand = mulberry32(this.seed)
    this.step = 0
  }

  /** Advance one time step and return the neurons that spiked in it. */
  tick(): number[] {
    const { v, g, freeAt, net, em, es, a } = this
    const p = net.params, t = this.step
    const spikes: number[] = []

    // 1 and 2. integrate every neuron that is not refractory, then test the threshold
    for (let i = 0; i < this.n; i++) {
      if (freeAt[i] > t) continue
      const ag = a * g[i]
      v[i] = p.v_rest + (v[i] - p.v_rest - ag) * em + ag * es
      g[i] *= es
      if (v[i] > p.v_thresh) spikes.push(i)
    }

    // 3. spikes from `delay` steps ago arrive now; input to a refractory neuron is dropped
    const slot = t % this.delaySteps
    for (const s of this.history[slot]) {
      for (let k = net.ptr[s], end = net.ptr[s + 1]; k < end; k++) {
        const j = net.post[k]
        if (freeAt[j] <= t) g[j] += net.weight[k] * p.w_syn
      }
    }
    this.history[slot] = this.muted.some(Boolean) ? spikes.filter(i => !this.muted[i]) : spikes

    // 4. Poisson input
    const kick = p.w_syn * p.poisson_factor
    for (const i of this.stimulated) if (this.rand() < this.pEvent[i]) v[i] += kick

    // 5. reset; a stimulated neuron has no refractory period
    for (const i of spikes) {
      v[i] = p.v_reset
      g[i] = 0
      freeAt[i] = t + (this.pEvent[i] > 0 ? 1 : this.refracSteps)
      this.counts[i]++
    }
    this.step++
    return spikes
  }
}
