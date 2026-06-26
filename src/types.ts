import type * as d3 from 'd3'

// ─── Project types ────────────────────────────────────────────────────────────

export interface ProjectMeta {
  id: string
  title: string
  tagline: string
  status: 'active' | 'prep' | 'complete'
  stack: string[]
  href: string
}

export interface Metric {
  value: string
  label: string
}

export interface ProbeCategory {
  name: string
  color: 'green' | 'teal' | 'sage'
}

// ─── Nav section tracking ─────────────────────────────────────────────────────

export interface NavSection {
  id: string
  label: string
}

// ─── Animation options ────────────────────────────────────────────────────────

export interface CounterOptions {
  el: HTMLElement
  target: number
  suffix?: string
  duration?: number
}

export interface RevealOptions {
  threshold?: number
  rootMargin?: string
}

// ─── Graph types ──────────────────────────────────────────────────────────────

export type NodeCategory = 'project' | 'lang' | 'ml' | 'genai' | 'infra' | 'cloud' | 'data'

export interface GraphNode extends d3.SimulationNodeDatum {
  id: string
  label: string
  type: 'project' | 'skill'
  category: NodeCategory
  degree?: number
}

export interface GraphLink extends d3.SimulationLinkDatum<GraphNode> {
  source: GraphNode | string
  target: GraphNode | string
}
