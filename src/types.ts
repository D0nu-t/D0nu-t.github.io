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
