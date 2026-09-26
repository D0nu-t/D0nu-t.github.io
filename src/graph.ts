import * as d3 from 'd3'
import type { GraphNode, GraphLink, NodeCategory } from './types'
import {
  buildNodes, buildLinks, nodeRadius,
  CATEGORY_COLOR, CATEGORY_LABEL,
} from './graph-data'

// ─── Main init ────────────────────────────────────────────────────────────────

export function initGraph(containerId: string): void {
  const container = document.getElementById(containerId)
  if (!container) return

  const nodes = buildNodes()
  const links = buildLinks()

  // ── SVG setup ─────────────────────────────────────────────────────────────
  const W = container.clientWidth
  const H = container.clientHeight

  const svg = d3.select(container)
    .append('svg')
    .attr('width', '100%')
    .attr('height', '100%')
    .attr('viewBox', `0 0 ${W} ${H}`)
    .style('background', '#0d1117')

  // Glow filter
  const defs = svg.append('defs')
  const glowFilter = defs.append('filter')
    .attr('id', 'glow')
    .attr('x', '-50%').attr('y', '-50%')
    .attr('width', '200%').attr('height', '200%')
  glowFilter.append('feGaussianBlur')
    .attr('in', 'SourceGraphic')
    .attr('stdDeviation', '3')
    .attr('result', 'blur')
  const feMerge = glowFilter.append('feMerge')
  feMerge.append('feMergeNode').attr('in', 'blur')
  feMerge.append('feMergeNode').attr('in', 'SourceGraphic')

  // Strong glow for projects
  const strongGlow = defs.append('filter')
    .attr('id', 'glow-strong')
    .attr('x', '-100%').attr('y', '-100%')
    .attr('width', '300%').attr('height', '300%')
  strongGlow.append('feGaussianBlur')
    .attr('in', 'SourceGraphic')
    .attr('stdDeviation', '6')
    .attr('result', 'blur')
  const feMerge2 = strongGlow.append('feMerge')
  feMerge2.append('feMergeNode').attr('in', 'blur')
  feMerge2.append('feMergeNode').attr('in', 'SourceGraphic')

  // Zoom layer
  const zoomG = svg.append('g').attr('class', 'zoom-layer')

  const zoom = d3.zoom<SVGSVGElement, unknown>()
    .scaleExtent([0.25, 4])
    .on('zoom', (event: d3.D3ZoomEvent<SVGSVGElement, unknown>) => {
      zoomG.attr('transform', event.transform.toString())
    })

  svg.call(zoom)

  // ── Force simulation ───────────────────────────────────────────────────────
  const simulation = d3.forceSimulation<GraphNode>(nodes)
    .force('link', d3.forceLink<GraphNode, GraphLink>(links)
      .id(d => d.id)
      .distance(d => {
        const src = d.source as GraphNode
        const tgt = d.target as GraphNode
        if (src.type === 'project' || tgt.type === 'project') return 110
        return 70
      })
      .strength(0.4)
    )
    .force('charge', d3.forceManyBody<GraphNode>()
  .strength(d => {
    const r = nodeRadius(d)
    if (d.type !== 'skill') {
      // Gravity well: attraction proportional to area (mass = r²)
      // r=22 → strength ≈ +170, pulls surrounding skill nodes inward
      return r * r * 0.3
    }
    const deg = d.degree ?? 1
    if (deg > 8) {
      // High-degree skills (Python, NumPy etc.) have mild self-attraction
      return r * r * 0.08
    }
    // Peripheral skills repel each other lightly so they don't stack
    return -(15 + deg * 6)
  })
  .distanceMin(18)    // prevents near-singularity forces
  // .distanceMax(380)   // gravity doesn't reach across the whole canvas
  .theta(0.8)         // slightly more accurate than default 0.9
)
    .force('center', d3.forceCenter(W / 2, H / 2).strength(0.08))
    .force('collide', d3.forceCollide<GraphNode>()
      .radius(d => nodeRadius(d) + 18)
      .strength(0.8)
    )
    .alphaDecay(0.025)

  // ── Links ──────────────────────────────────────────────────────────────────
  const linkG = zoomG.append('g').attr('class', 'links')

  const linkEl = linkG.selectAll<SVGLineElement, GraphLink>('line')
    .data(links)
    .join('line')
    .attr('stroke', '#30363d')
    .attr('stroke-width', 1)
    .attr('stroke-opacity', 0.5)

  // ── Nodes ──────────────────────────────────────────────────────────────────
  const nodeG = zoomG.append('g').attr('class', 'nodes')

  const nodeEl = nodeG.selectAll<SVGGElement, GraphNode>('g')
    .data(nodes)
    .join('g')
    .attr('class', 'node')
    .style('cursor', 'pointer')

  // Circle
    nodeEl.append('circle')
      .attr('r', d => nodeRadius(d))
      .attr('fill', d => CATEGORY_COLOR[d.category])
      .attr('fill-opacity', d => d.type === 'project' ? 0.18 : 0.12)
      .attr('stroke', d => CATEGORY_COLOR[d.category])
      .attr('stroke-width', d => {
      if (d.category === 'work') return 2.5
      if (d.category === 'academic') return 2
      return d.type === 'project' ? 2 : 1.2})
      .attr('stroke-dasharray', d => d.category === 'academic' ? '5 3' : 'none')
    .attr('filter', d => d.type === 'project' ? 'url(#glow-strong)' : 'url(#eg)')
  // Label — split on newline for projects
  nodeEl.each(function(d) {
    const el = d3.select(this)
    const lines = d.label.split('\n')
    const yOffset = nodeRadius(d) + 13
    if (lines.length === 1) {
      el.append('text')
        .text(d.label)
        .attr('text-anchor', 'middle')
        .attr('dy', yOffset)
        .attr('fill', d.type === 'project' ? CATEGORY_COLOR[d.category] : CATEGORY_COLOR[d.category])
        .attr('font-family', 'IBM Plex Mono, monospace')
        .attr('font-size', d.type === 'project' ? '11px' : '9px')
        .attr('font-weight', d.type === 'project' ? '600' : '400')
        .attr('pointer-events', 'none')
    } else {
      lines.forEach((line, i) => {
        el.append('text')
          .text(line)
          .attr('text-anchor', 'middle')
          .attr('dy', yOffset + i * 13)
          .attr('fill', CATEGORY_COLOR[d.category])
          .attr('font-family', 'IBM Plex Mono, monospace')
          .attr('font-size', '10px')
          .attr('font-weight', '600')
          .attr('pointer-events', 'none')
      })
    }
  })

  // ── Drag ──────────────────────────────────────────────────────────────────
  const drag = d3.drag<SVGGElement, GraphNode>()
    .on('start', (event, d) => {
      if (!event.active) simulation.alphaTarget(0.25).restart()
      d.fx = d.x
      d.fy = d.y
    })
    .on('drag', (event, d) => {
      d.fx = event.x
      d.fy = event.y
    })
    .on('end', (event, d) => {
      if (!event.active) simulation.alphaTarget(0)
      d.fx = null
      d.fy = null
    })

  nodeEl.call(drag)

  // ── Hover highlighting ─────────────────────────────────────────────────────
  const linkedSet = new Set<string>()

  function buildLinkedSet(nodeId: string): void {
    linkedSet.clear()
    linkedSet.add(nodeId)
    links.forEach(l => {
      const s = (l.source as GraphNode).id
      const t = (l.target as GraphNode).id
      if (s === nodeId) linkedSet.add(t)
      if (t === nodeId) linkedSet.add(s)
    })
  }

  nodeEl
    .on('mouseenter', function(_event, d) {
      buildLinkedSet(d.id)

      nodeEl.select('circle')
        .attr('fill-opacity', (n: GraphNode) =>
          linkedSet.has(n.id) ? (n.type === 'project' ? 0.35 : 0.3) : 0.04
        )
        .attr('stroke-opacity', (n: GraphNode) => linkedSet.has(n.id) ? 1 : 0.2)

      nodeEl.selectAll<SVGTextElement, GraphNode>('text')
        .attr('fill-opacity', function() {
          const parentData = d3.select((this as SVGTextElement).parentElement!).datum() as GraphNode
          return linkedSet.has(parentData.id) ? 1 : 0.15
        })

      linkEl
        .attr('stroke-opacity', (l: GraphLink) => {
          const s = (l.source as GraphNode).id
          const t = (l.target as GraphNode).id
          return (s === d.id || t === d.id) ? 0.9 : 0.05
        })
        .attr('stroke', (l: GraphLink) => {
          const s = (l.source as GraphNode).id
          const t = (l.target as GraphNode).id
          if (s === d.id || t === d.id) {
            const other = s === d.id ? t : s
            const otherNode = nodes.find(n => n.id === other)
            return otherNode ? CATEGORY_COLOR[otherNode.category] : '#30363d'
          }
          return '#30363d'
        })
        .attr('stroke-width', (l: GraphLink) => {
          const s = (l.source as GraphNode).id
          const t = (l.target as GraphNode).id
          return (s === d.id || t === d.id) ? 1.5 : 0.6
        })

      // Show tooltip
      const tooltipEl = document.getElementById('graph-tooltip')
      if (tooltipEl) {
        const connected = links
          .filter(l => {
            const s = (l.source as GraphNode).id
            const t = (l.target as GraphNode).id
            return s === d.id || t === d.id
          })
          .map(l => {
            const s = (l.source as GraphNode).id
            const t = (l.target as GraphNode).id
            const otherId = s === d.id ? t : s
            return nodes.find(n => n.id === otherId)?.label.replace('\n', ' ') ?? ''
          })

        tooltipEl.innerHTML = `
          <strong>${d.label.replace('\n', ' ')}</strong>
          <span>${d.type === 'project' ? 'Project' : CATEGORY_LABEL[d.category]}</span>
          <span>${connected.length} connection${connected.length !== 1 ? 's' : ''}</span>
        `
        tooltipEl.style.opacity = '1'
      }
    })
    .on('mouseleave', function() {
      linkedSet.clear()

      nodeEl.select('circle')
        .attr('fill-opacity', (n: GraphNode) => n.type === 'project' ? 0.2 : 0.15)
        .attr('stroke-opacity', 1)

      nodeEl.selectAll('text').attr('fill-opacity', 1)

      linkEl
        .attr('stroke', '#30363d')
        .attr('stroke-opacity', 0.5)
        .attr('stroke-width', 1)

      const tooltipEl = document.getElementById('graph-tooltip')
      if (tooltipEl) tooltipEl.style.opacity = '0'
    })

  // ── Tick ──────────────────────────────────────────────────────────────────
  simulation.on('tick', () => {
    linkEl
      .attr('x1', d => (d.source as GraphNode).x ?? 0)
      .attr('y1', d => (d.source as GraphNode).y ?? 0)
      .attr('x2', d => (d.target as GraphNode).x ?? 0)
      .attr('y2', d => (d.target as GraphNode).y ?? 0)

    nodeEl.attr('transform', d => `translate(${d.x ?? 0},${d.y ?? 0})`)
  })

  // ── Zoom controls ─────────────────────────────────────────────────────────
  document.getElementById('zoom-in')?.addEventListener('click', () => {
    svg.transition().duration(300).call(zoom.scaleBy, 1.4)
  })
  document.getElementById('zoom-out')?.addEventListener('click', () => {
    svg.transition().duration(300).call(zoom.scaleBy, 0.7)
  })
  document.getElementById('zoom-reset')?.addEventListener('click', () => {
    svg.transition().duration(400).call(zoom.transform, d3.zoomIdentity)
  })

  // ── Filter buttons ────────────────────────────────────────────────────────
  let activeCategory: NodeCategory | null = null

  document.querySelectorAll<HTMLButtonElement>('[data-filter]').forEach(btn => {
    btn.addEventListener('click', () => {
      const cat = btn.dataset.filter as NodeCategory

      if (activeCategory === cat) {
        activeCategory = null
        document.querySelectorAll('[data-filter]').forEach(b => b.classList.remove('active'))
        nodeEl.select('circle')
          .attr('fill-opacity', (n: GraphNode) => n.type === 'project' ? 0.2 : 0.15)
          .attr('stroke-opacity', 1)
        nodeEl.selectAll('text').attr('fill-opacity', 1)
        linkEl.attr('stroke-opacity', 0.5)
      } else {
        activeCategory = cat
        document.querySelectorAll('[data-filter]').forEach(b => b.classList.remove('active'))
        btn.classList.add('active')

        nodeEl.select('circle')
          .attr('fill-opacity', (n: GraphNode) =>
            n.category === cat || n.type === 'project' ? (n.type === 'project' ? 0.3 : 0.35) : 0.04
          )
          .attr('stroke-opacity', (n: GraphNode) =>
            n.category === cat || n.type === 'project' ? 1 : 0.15
          )

        nodeEl.selectAll<SVGTextElement, GraphNode>('text')
          .attr('fill-opacity', function() {
            const parentData = d3.select((this as SVGTextElement).parentElement!).datum() as GraphNode
            return parentData.category === cat || parentData.type === 'project' ? 1 : 0.1
          })

        linkEl.attr('stroke-opacity', (l: GraphLink) => {
          const s = l.source as GraphNode
          const t = l.target as GraphNode
          return s.category === cat || t.category === cat ? 0.8 : 0.05
        })
      }
    })
  })

  // ── Resize ────────────────────────────────────────────────────────────────
  const resizeObserver = new ResizeObserver(() => {
    const nw = container.clientWidth
    const nh = container.clientHeight
    svg.attr('viewBox', `0 0 ${nw} ${nh}`)
    simulation.force('center', d3.forceCenter(nw / 2, nh / 2).strength(0.08))
    simulation.alpha(0.15).restart()
  })

  resizeObserver.observe(container)
}
