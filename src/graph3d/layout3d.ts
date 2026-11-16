// ─── Force layout in three dimensions ──────────────────────────────────────────
// A small Fruchterman-Reingold layout: every pair of nodes pushes apart, linked
// nodes pull together, and the whole thing cools until it settles. Seeded, so
// the same graph always gets the same shape. Fine for a few hundred nodes.

const SPAN = 24000   // radius of the finished layout
const WIDEN = 1.3    // stretched sideways, because the canvas is wider than it is tall (stays inside Int16)

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

/** Positions as Int16 x, y, z per node, centred on the origin. `links` are index pairs. */
export function layout3d(n: number, links: [number, number][], seed = 7, iterations = 320): Int16Array {
  const rand = mulberry32(seed)
  const p = new Float64Array(n * 3), move = new Float64Array(n * 3)
  for (let i = 0; i < p.length; i++) p[i] = rand() - 0.5
  const k = Math.cbrt(1 / Math.max(1, n))          // the distance nodes settle at
  let heat = 0.12
  // a hub with dozens of links would drag the whole graph into one clump, so each link
  // pulls less the busier its quieter end is
  const degree = new Float64Array(n)
  for (const [a, b] of links) { degree[a]++; degree[b]++ }
  const pull = links.map(([a, b]) => 1 / Math.sqrt(Math.max(1, Math.min(degree[a], degree[b]))) / Math.cbrt(Math.max(degree[a], degree[b])))

  for (let it = 0; it < iterations; it++) {
    move.fill(0)
    for (let i = 0; i < n; i++) {
      for (let j = i + 1; j < n; j++) {
        const dx = p[3 * i] - p[3 * j], dy = p[3 * i + 1] - p[3 * j + 1], dz = p[3 * i + 2] - p[3 * j + 2]
        const d2 = dx * dx + dy * dy + dz * dz + 1e-9
        const f = 1.6 * (k * k) / d2                // repulsion k²/d, divided by d again to normalise
        move[3 * i] += dx * f; move[3 * i + 1] += dy * f; move[3 * i + 2] += dz * f
        move[3 * j] -= dx * f; move[3 * j + 1] -= dy * f; move[3 * j + 2] -= dz * f
      }
    }
    for (let l = 0; l < links.length; l++) {
      const [a, b] = links[l]
      const dx = p[3 * a] - p[3 * b], dy = p[3 * a + 1] - p[3 * b + 1], dz = p[3 * a + 2] - p[3 * b + 2]
      const d = Math.sqrt(dx * dx + dy * dy + dz * dz) + 1e-9
      const f = pull[l] * d / k                     // attraction d²/k, divided by d
      move[3 * a] -= dx * f; move[3 * a + 1] -= dy * f; move[3 * a + 2] -= dz * f
      move[3 * b] += dx * f; move[3 * b + 1] += dy * f; move[3 * b + 2] += dz * f
    }
    for (let i = 0; i < n; i++) {
      // a gentle pull to the centre keeps unlinked nodes from drifting off
      const mx = move[3 * i] - p[3 * i] * 1.1, my = move[3 * i + 1] - p[3 * i + 1] * 1.1, mz = move[3 * i + 2] - p[3 * i + 2] * 1.1
      const len = Math.sqrt(mx * mx + my * my + mz * mz) + 1e-9
      const step = Math.min(len, heat) / len
      p[3 * i] += mx * step; p[3 * i + 1] += my * step; p[3 * i + 2] += mz * step
    }
    heat *= 0.985
  }

  // centre, then scale so most nodes fill the view; the few stragglers are pulled in to the edge
  const c = [0, 0, 0]
  for (let i = 0; i < n; i++) for (let a = 0; a < 3; a++) c[a] += p[3 * i + a] / n
  const radius = new Float64Array(n)
  for (let i = 0; i < n; i++) {
    let d2 = 0
    for (let a = 0; a < 3; a++) { p[3 * i + a] -= c[a]; d2 += p[3 * i + a] ** 2 }
    radius[i] = Math.sqrt(d2) + 1e-9
  }
  const typical = [...radius].sort((a, b) => a - b)[Math.floor(n * 0.9)] || 1
  const out = new Int16Array(n * 3)
  for (let i = 0; i < n; i++) {
    const r = Math.min(1, (radius[i] / typical) * 0.85)
    for (let a = 0; a < 3; a++) out[3 * i + a] = Math.round((p[3 * i + a] / radius[i]) * r * SPAN * (a === 0 ? WIDEN : 1))
  }
  return out
}
