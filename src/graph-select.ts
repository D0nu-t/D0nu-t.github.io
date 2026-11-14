import type * as d3 from 'd3'
import type { GraphNode } from './types'
import { CATEGORY_COLOR, CATEGORY_LABEL } from './graph-data'
import { groupSkills, neighbourMap, nodeName } from './graph-text'

// ─── Pin, search and details for a drawn graph ────────────────────────────────
// Hover still previews a node. Clicking a node (or finding it by name) pins it,
// so the highlight stays and a details panel lists what it connects to. Used by
// both the embedded graph and the fullscreen one.

interface Options {
  nodes: GraphNode[]
  nodeEl: d3.Selection<SVGGElement, GraphNode, any, any>   // eslint-disable-line @typescript-eslint/no-explicit-any
  highlight: (d: GraphNode) => void
  clear: () => void
  search?: HTMLInputElement | null
  details?: HTMLElement | null
}

export function wireSelection({ nodes, nodeEl, highlight, clear, search, details }: Options): void {
  const near = neighbourMap(nodes)
  let pinned: GraphNode | null = null

  const el = <K extends keyof HTMLElementTagNameMap>(tag: K, cls = '', text = ''): HTMLElementTagNameMap[K] => {
    const e = document.createElement(tag)
    if (cls) e.className = cls
    if (text) e.textContent = text
    return e
  }

  function renderDetails(): void {
    if (!details) return
    details.replaceChildren()
    details.hidden = !pinned
    if (!pinned) return
    const head = el('div', 'sel-head')
    const dot = el('span', 'sel-dot'); dot.style.background = CATEGORY_COLOR[pinned.category]
    head.append(dot, el('strong', '', nodeName(pinned)), el('span', 'sel-kind', pinned.type === 'project' ? 'Project' : CATEGORY_LABEL[pinned.category]))
    const close = el('button', 'sel-clear', 'Clear'); close.type = 'button'
    close.addEventListener('click', () => pin(null))
    head.append(close)
    details.append(head)

    const ns = near.get(pinned.id) ?? []
    const rows: [string, GraphNode[]][] = [
      ['Projects', ns.filter(n => n.type === 'project')],
      ['Organisations', ns.filter(n => n.type === 'work' || n.type === 'academic')],
      ...groupSkills(ns).map(g => [g.label, g.skills] as [string, GraphNode[]]),
    ]
    for (const [label, group] of rows) {
      if (!group.length) continue
      const row = el('div', 'sel-row')
      row.append(el('span', 'sel-key', label))
      const list = el('span', 'sel-items')
      for (const n of group) {
        const b = el('button', 'sel-item', nodeName(n)); b.type = 'button'
        b.addEventListener('click', () => pin(n))
        list.append(b)
      }
      row.append(list)
      details.append(row)
    }
  }

  function pin(d: GraphNode | null): void {
    pinned = d
    nodeEl.classed('is-pinned', n => n === pinned)
    if (pinned) highlight(pinned); else clear()
    if (search && pinned && search.value.toLowerCase() !== nodeName(pinned).toLowerCase()) search.value = nodeName(pinned)
    if (search && !pinned) search.value = ''
    renderDetails()
  }

  nodeEl
    .on('mouseenter', (_e, d) => highlight(d))
    .on('mouseleave', () => { if (pinned) highlight(pinned); else clear() })
    .on('click', (_e, d) => pin(pinned === d ? null : d))

  if (search) {
    const list = document.createElement('datalist')
    list.id = `${search.id || 'graph-search'}-options`
    for (const n of [...nodes].sort((a, b) => nodeName(a).localeCompare(nodeName(b)))) {
      const o = document.createElement('option'); o.value = nodeName(n); list.append(o)
    }
    search.after(list)
    search.setAttribute('list', list.id)

    const find = (): void => {
      const q = search.value.trim().toLowerCase()
      if (!q) { pin(null); return }
      const exact = nodes.find(n => nodeName(n).toLowerCase() === q)
      const starts = nodes.filter(n => nodeName(n).toLowerCase().startsWith(q))
      const match = exact ?? (starts.length === 1 ? starts[0] : null)
      if (match && match !== pinned) pin(match)
    }
    search.addEventListener('input', find)
    search.addEventListener('keydown', e => {
      if (e.key !== 'Enter') return
      const q = search.value.trim().toLowerCase()
      const first = nodes.find(n => nodeName(n).toLowerCase().includes(q))
      if (q && first) pin(first)
    })
  }
  renderDetails()
}
