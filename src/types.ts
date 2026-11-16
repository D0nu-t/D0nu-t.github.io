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

export type NodeCategory = 'project' | 'work' | 'academic' | 'lang' | 'ml' | 'genai' | 'infra' | 'cloud' | 'data'

export interface GraphNode {
  id: string
  label: string
  type: 'project' | 'work' | 'academic'  | 'skill'
  category: NodeCategory
  degree?: number
  since?: number   // year the skill or project was first used; optional, read by the foraging fly
}

export interface GraphLink {
  source: string
  target: string
}
