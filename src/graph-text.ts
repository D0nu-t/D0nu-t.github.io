import type { GraphNode, NodeCategory } from './types'
import { buildNodes, RAW_LINKS, CATEGORY_LABEL } from './graph-data'

// ─── The skills graph as an outline ───────────────────────────────────────────
// One structure feeds the on-page list view and the Markdown copy, so both
// always say the same thing as the drawn graph.

export const SKILL_CATEGORIES: NodeCategory[] = ['lang', 'ml', 'genai', 'infra', 'cloud', 'data']

export const nodeName = (n: GraphNode): string => n.label.replace(/\n/g, ' ')

export interface SkillGroup { category: NodeCategory; label: string; skills: GraphNode[] }
export interface Entry { node: GraphNode; orgs: GraphNode[]; projects: GraphNode[]; skillGroups: SkillGroup[] }
export interface Outline {
  projects: Entry[]
  orgs: Entry[]
  skills: { category: NodeCategory; label: string; items: { node: GraphNode; usedIn: GraphNode[] }[] }[]
  counts: { projects: number; orgs: number; skills: number }
}

const isOrg = (n: GraphNode): boolean => n.type === 'work' || n.type === 'academic'
const byName = (a: GraphNode, b: GraphNode): number => nodeName(a).localeCompare(nodeName(b))

/** Every node's direct neighbours, keyed by node id. */
export function neighbourMap(nodes: GraphNode[] = buildNodes()): Map<string, GraphNode[]> {
  const byId = new Map(nodes.map(n => [n.id, n]))
  const out = new Map<string, Set<GraphNode>>(nodes.map(n => [n.id, new Set<GraphNode>()]))
  for (const l of RAW_LINKS) {
    const s = byId.get(l.source), t = byId.get(l.target)
    if (!s || !t) continue
    out.get(s.id)!.add(t); out.get(t.id)!.add(s)
  }
  return new Map([...out].map(([id, set]) => [id, [...set].sort(byName)]))
}

export function groupSkills(ns: GraphNode[]): SkillGroup[] {
  return SKILL_CATEGORIES
    .map(category => ({ category, label: CATEGORY_LABEL[category], skills: ns.filter(n => n.type === 'skill' && n.category === category) }))
    .filter(g => g.skills.length)
}

export function buildOutline(): Outline {
  const nodes = buildNodes()
  const near = neighbourMap(nodes)
  const entry = (node: GraphNode): Entry => {
    const ns = near.get(node.id) ?? []
    return { node, orgs: ns.filter(isOrg), projects: ns.filter(n => n.type === 'project'), skillGroups: groupSkills(ns) }
  }
  const projects = nodes.filter(n => n.type === 'project').sort(byName).map(entry)
  const orgs = nodes.filter(isOrg).sort(byName).map(entry)
  const skills = SKILL_CATEGORIES.map(category => ({
    category,
    label: CATEGORY_LABEL[category],
    items: nodes.filter(n => n.type === 'skill' && n.category === category).sort(byName)
      .map(node => ({ node, usedIn: (near.get(node.id) ?? []).filter(n => n.type !== 'skill') })),
  }))
  return { projects, orgs, skills, counts: { projects: projects.length, orgs: orgs.length, skills: nodes.filter(n => n.type === 'skill').length } }
}

const names = (ns: GraphNode[]): string => ns.map(nodeName).join(', ')

/** The graph as Markdown: nested bullets, one node per top-level bullet. */
export function graphMarkdown(heading = '## Skills graph'): string {
  const o = buildOutline()
  const L: string[] = [
    heading, '',
    `${o.counts.projects} projects, ${o.counts.orgs} organisations and ${o.counts.skills} skills. Each bullet is a node and what it connects to. Skill-to-skill "related" links are left out.`,
    '', '### Projects',
  ]
  const block = (e: Entry, kind: string): void => {
    L.push(`- ${nodeName(e.node)}${kind ? ` (${kind})` : ''}`)
    if (e.orgs.length) L.push(`  - Organisation: ${names(e.orgs)}`)
    if (e.projects.length) L.push(`  - Projects: ${names(e.projects)}`)
    for (const g of e.skillGroups) L.push(`  - ${g.label}: ${names(g.skills)}`)
  }
  o.projects.forEach(e => block(e, ''))
  L.push('', '### Organisations')
  o.orgs.forEach(e => block(e, e.node.type === 'work' ? 'work' : 'academic'))
  L.push('', '### Skills by category')
  for (const g of o.skills) {
    L.push(`- ${g.label}`)
    for (const it of g.items) L.push(`  - ${nodeName(it.node)}${it.usedIn.length ? `: ${names(it.usedIn)}` : ''}`)
  }
  return L.join('\n')
}
