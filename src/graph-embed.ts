import * as d3 from 'd3'
import type { GraphNode, GraphLink, NodeCategory } from './types'
import {
  buildNodes, buildLinks, nodeRadius,
  CATEGORY_COLOR, CATEGORY_LABEL,
} from './graph-data'

// ─── Public init ──────────────────────────────────────────────────────────────

export function initGraphEmbed(containerId: string): void {
  const container = document.getElementById(containerId)
  if (!container) return

  const nodes = buildNodes()
  const links = buildLinks()

  // ── Dimensions ──────────────────────────────────────────────────────────────
  let W = container.clientWidth
  let H = container.clientHeight

  // ── SVG ─────────────────────────────────────────────────────────────────────
  const svg = d3.select(container)
    .append('svg')
    .attr('width', '100%')
    .attr('height', '100%')
    .attr('viewBox', `0 0 ${W} ${H}`)
    .style('display', 'block')
    .style('background', 'transparent')

  // Glow filters
  const defs = svg.append('defs')

  const mkGlow = (id: string, blur: number) => {
    const f = defs.append('filter')
      .attr('id', id)
      .attr('x', '-60%').attr('y', '-60%')
      .attr('width', '220%').attr('height', '220%')
    f.append('feGaussianBlur').attr('in', 'SourceGraphic').attr('stdDeviation', blur).attr('result', 'b')
    const m = f.append('feMerge')
    m.append('feMergeNode').attr('in', 'b')
    m.append('feMergeNode').attr('in', 'SourceGraphic')
  }
  mkGlow('eg', 2.5)
  mkGlow('eg-strong', 5)

  // Zoom layer
  const zoomG = svg.append('g')

  const zoom = d3.zoom<SVGSVGElement, unknown>()
    .scaleExtent([0.3, 4])
    .on('zoom', (e: d3.D3ZoomEvent<SVGSVGElement, unknown>) => {
      zoomG.attr('transform', e.transform.toString())
    })

  svg.call(zoom)

  // ── Simulation ───────────────────────────────────────────────────────────────
  const sim = d3.forceSimulation<GraphNode>(nodes)
    .force('link', d3.forceLink<GraphNode, GraphLink>(links)
      .id(d => d.id)
      .distance(d => {
        const s = d.source as GraphNode
        const t = d.target as GraphNode
        return (s.type === 'project' || t.type === 'project') ? 95 : 60
      })
      .strength(0.55)
    )
    .force('charge', d3.forceManyBody<GraphNode>()
      .strength(d => d.type === 'project' ? -280 : -100)
    )
    .force('center', d3.forceCenter(W / 2, H / 2).strength(0.09))
    .force('collide', d3.forceCollide<GraphNode>()
      .radius(d => nodeRadius(d) + 14)
      .strength(0.75)
    )
    .alphaDecay(0.028)

  // ── Links ────────────────────────────────────────────────────────────────────
  const linkEl = zoomG.append('g')
    .selectAll<SVGLineElement, GraphLink>('line')
    .data(links)
    .join('line')
    .attr('stroke', '#30363d')
    .attr('stroke-width', 1)
    .attr('stroke-opacity', 0.5)

  // ── Nodes ────────────────────────────────────────────────────────────────────
  const nodeEl = zoomG.append('g')
    .selectAll<SVGGElement, GraphNode>('g')
    .data(nodes)
    .join('g')
    .style('cursor', 'pointer')

  nodeEl.append('circle')
    .attr('r', d => nodeRadius(d))
    .attr('fill', d => CATEGORY_COLOR[d.category])
    .attr('fill-opacity', d => d.type === 'project' ? 0.18 : 0.12)
    .attr('stroke', d => CATEGORY_COLOR[d.category])
    .attr('stroke-width', d => d.type === 'project' ? 2 : 1.2)
    .attr('filter', d => d.type === 'project' ? 'url(#eg-strong)' : 'url(#eg)')

  // Labels — project nodes always visible; skill nodes dimmer
  nodeEl.each(function(d) {
    const g = d3.select(this)
    const lines = d.label.split('\n')
    const base = nodeRadius(d) + 12

    lines.forEach((line, i) => {
      g.append('text')
        .text(line)
        .attr('text-anchor', 'middle')
        .attr('dy', base + i * 12)
        .attr('fill', d.type === 'project'
          ? CATEGORY_COLOR[d.category]
          : '#8b949e'
        )
        .attr('font-family', 'IBM Plex Mono, monospace')
        .attr('font-size', d.type === 'project' ? '10px' : '8.5px')
        .attr('font-weight', d.type === 'project' ? '600' : '400')
        .attr('pointer-events', 'none')
    })
  })

  // ── Drag ─────────────────────────────────────────────────────────────────────
  nodeEl.call(
    d3.drag<SVGGElement, GraphNode>()
      .on('start', (e, d) => {
        if (!e.active) sim.alphaTarget(0.25).restart()
        d.fx = d.x; d.fy = d.y
      })
      .on('drag', (e, d) => { d.fx = e.x; d.fy = e.y })
      .on('end', (e, d) => {
        if (!e.active) sim.alphaTarget(0)
        d.fx = null; d.fy = null
      })
  )

  // ── Tooltip element ───────────────────────────────────────────────────────────
  const tooltip = document.getElementById('embed-tooltip')

  function showTooltip(d: GraphNode): void {
    if (!tooltip) return
    const connected = links
      .filter(l => (l.source as GraphNode).id === d.id || (l.target as GraphNode).id === d.id)
      .map(l => {
        const s = (l.source as GraphNode).id
        const other = s === d.id
          ? (l.target as GraphNode)
          : (l.source as GraphNode)
        return other.label.replace('\n', ' ')
      })

    tooltip.innerHTML = `
      <span class="tt-name">${d.label.replace('\n', ' ')}</span>
      <span class="tt-cat">${d.type === 'project' ? 'Project' : CATEGORY_LABEL[d.category]}</span>
      <span class="tt-links">${connected.length} connection${connected.length !== 1 ? 's' : ''}</span>
    `
    tooltip.classList.add('visible')
  }

  function hideTooltip(): void {
    tooltip?.classList.remove('visible')
  }

  // ── Hover highlighting ────────────────────────────────────────────────────────
  const linkedIds = new Set<string>()

  nodeEl
    .on('mouseenter', (_e, d) => {
      linkedIds.clear()
      linkedIds.add(d.id)
      links.forEach(l => {
        const s = (l.source as GraphNode).id
        const t = (l.target as GraphNode).id
        if (s === d.id) linkedIds.add(t)
        if (t === d.id) linkedIds.add(s)
      })

      nodeEl.select('circle')
        .attr('fill-opacity', (n: GraphNode) =>
          linkedIds.has(n.id) ? (n.type === 'project' ? 0.32 : 0.28) : 0.03
        )
        .attr('stroke-opacity', (n: GraphNode) => linkedIds.has(n.id) ? 1 : 0.15)

      nodeEl.selectAll<SVGTextElement, GraphNode>('text')
        .attr('fill-opacity', function() {
          const p = d3.select((this as SVGTextElement).parentElement!).datum() as GraphNode
          return linkedIds.has(p.id) ? 1 : 0.1
        })

      linkEl
        .attr('stroke', (l: GraphLink) => {
          const s = (l.source as GraphNode).id
          const t = (l.target as GraphNode).id
          if (s === d.id || t === d.id) {
            const other = nodes.find(n => n.id === (s === d.id ? t : s))
            return other ? CATEGORY_COLOR[other.category] : '#30363d'
          }
          return '#21262d'
        })
        .attr('stroke-opacity', (l: GraphLink) => {
          const s = (l.source as GraphNode).id
          const t = (l.target as GraphNode).id
          return s === d.id || t === d.id ? 0.85 : 0.06
        })
        .attr('stroke-width', (l: GraphLink) => {
          const s = (l.source as GraphNode).id
          const t = (l.target as GraphNode).id
          return s === d.id || t === d.id ? 1.5 : 0.6
        })

      showTooltip(d)
    })
    .on('mouseleave', () => {
      linkedIds.clear()
      nodeEl.select('circle')
        .attr('fill-opacity', (n: GraphNode) => n.type === 'project' ? 0.18 : 0.12)
        .attr('stroke-opacity', 1)
      nodeEl.selectAll<SVGTextElement, GraphNode>('text').attr('fill-opacity', 1)
      linkEl
        .attr('stroke', '#30363d')
        .attr('stroke-opacity', 0.5)
        .attr('stroke-width', 1)
      hideTooltip()
    })

  // ── Tick ─────────────────────────────────────────────────────────────────────
  sim.on('tick', () => {
    linkEl
      .attr('x1', d => (d.source as GraphNode).x ?? 0)
      .attr('y1', d => (d.source as GraphNode).y ?? 0)
      .attr('x2', d => (d.target as GraphNode).x ?? 0)
      .attr('y2', d => (d.target as GraphNode).y ?? 0)
    nodeEl.attr('transform', d => `translate(${d.x ?? 0},${d.y ?? 0})`)
  })

  // ── Category filter pills ─────────────────────────────────────────────────────
  let activeCat: NodeCategory | null = null

  document.querySelectorAll<HTMLButtonElement>('[data-filter-embed]').forEach(btn => {
    btn.addEventListener('click', () => {
      const cat = btn.dataset.filterEmbed as NodeCategory

      if (activeCat === cat) {
        activeCat = null
        document.querySelectorAll('[data-filter-embed]').forEach(b => b.classList.remove('active'))
        nodeEl.select('circle')
          .attr('fill-opacity', (n: GraphNode) => n.type === 'project' ? 0.18 : 0.12)
          .attr('stroke-opacity', 1)
        nodeEl.selectAll<SVGTextElement, GraphNode>('text').attr('fill-opacity', 1)
        linkEl.attr('stroke-opacity', 0.5)
      } else {
        activeCat = cat
        document.querySelectorAll('[data-filter-embed]').forEach(b => b.classList.remove('active'))
        btn.classList.add('active')

        nodeEl.select('circle')
          .attr('fill-opacity', (n: GraphNode) =>
            n.category === cat || n.type === 'project' ? (n.type === 'project' ? 0.3 : 0.32) : 0.03
          )
          .attr('stroke-opacity', (n: GraphNode) =>
            n.category === cat || n.type === 'project' ? 1 : 0.1
          )
        nodeEl.selectAll<SVGTextElement, GraphNode>('text')
          .attr('fill-opacity', function() {
            const p = d3.select((this as SVGTextElement).parentElement!).datum() as GraphNode
            return p.category === cat || p.type === 'project' ? 1 : 0.08
          })
        linkEl.attr('stroke-opacity', (l: GraphLink) => {
          const s = l.source as GraphNode
          const t = l.target as GraphNode
          return s.category === cat || t.category === cat ? 0.75 : 0.04
        })
      }
    })
  })

  // Reset button
  document.getElementById('embed-reset')?.addEventListener('click', () => {
    svg.transition().duration(400).call(zoom.transform, d3.zoomIdentity)
  })

  // ── Pause sim when section off-screen ──────────────────────────────────────────
  const sectionEl = container.closest('section')
  if (sectionEl) {
    new IntersectionObserver(([entry]) => {
      if (entry.isIntersecting) {
        sim.alphaTarget(0).restart()
      } else {
        sim.stop()
      }
    }, { threshold: 0.05 }).observe(sectionEl)
  }

  // ── Resize ────────────────────────────────────────────────────────────────────
  new ResizeObserver(() => {
    W = container.clientWidth
    H = container.clientHeight
    svg.attr('viewBox', `0 0 ${W} ${H}`)
    sim.force('center', d3.forceCenter(W / 2, H / 2).strength(0.09))
    sim.alpha(0.15).restart()
  }).observe(container)
}
