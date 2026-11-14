import { buildOutline, graphMarkdown, nodeName, type Entry } from './graph-text'
import { CATEGORY_COLOR } from './graph-data'

// ─── Copy-as-Markdown and the graph's list view ───────────────────────────────

const SITE = 'https://krishnasai.is-a.dev/'
const clean = (s: string | null | undefined): string => (s ?? '').replace(/\s+/g, ' ').trim()
const abs = (href: string | null): string => new URL(href ?? '', SITE).href
const today = (): string => new Date().toISOString().slice(0, 10)

/**
 * The home page as Markdown, read from the page's own markup so the copy can
 * never disagree with what is on screen.
 */
export function profileMarkdown(doc: Document = document): string {
  const q = (s: string): string => clean(doc.querySelector(s)?.textContent)
  const all = <T extends Element>(s: string): T[] => [...doc.querySelectorAll<T>(s)]
  const L: string[] = [
    '# Krishnasai Addala', '',
    `Source: ${SITE} (copied ${today()})`, '',
    q('.hero-eyebrow'), '',
    q('.hero-body'),
  ]
  const status = all('.status-item').map(e => clean(e.textContent)).filter(Boolean)
  if (status.length) L.push('', status.join(' | '))

  L.push('', '## Experience')
  for (const row of all('.exp-row')) {
    const title = row.querySelector('.exp-title')
    const detail = clean(title?.querySelector('span')?.textContent).replace(/^·\s*/, '')
    const org = clean(title?.childNodes[0]?.textContent)
    L.push(`- ${org} (${clean(row.querySelector('.exp-date')?.textContent)})`)
    if (detail) L.push(`  - Role: ${detail.replace(/\s*·\s*/g, ', ')}`)
    L.push(`  - ${clean(row.querySelector('.exp-desc')?.textContent)}`)
  }

  L.push('', '## Current work')
  for (const card of all('.work-card')) {
    L.push(`- ${clean(card.querySelector('.work-card-title')?.textContent)}`)
    const badge = clean(card.querySelector('.work-badge')?.textContent).replace(/^[●○]\s*/, '')
    if (badge) L.push(`  - Status: ${badge}`)
    L.push(`  - ${clean(card.querySelector('.work-card-body')?.textContent)}`)
    const stack = [...card.querySelectorAll('.chip')].map(c => clean(c.textContent))
    if (stack.length) L.push(`  - Stack: ${stack.join(', ')}`)
    for (const a of card.querySelectorAll<HTMLAnchorElement>('a.card-link')) L.push(`  - ${clean(a.textContent)}: ${abs(a.getAttribute('href'))}`)
  }

  L.push('', graphMarkdown('## Skills graph'))

  L.push('', '## Publications')
  for (const item of all('.pub-item')) {
    const a = item.querySelector('a')
    L.push(`- ${clean(item.querySelector('.pub-title')?.textContent)}`)
    L.push(`  - ${clean(item.querySelector('.pub-venue')?.textContent)}`)
    if (a) L.push(`  - ${abs(a.getAttribute('href'))}`)
  }

  L.push('', '## Links')
  for (const a of all<HTMLAnchorElement>('.footer-ctas a, .footer-meta a')) {
    const href = a.getAttribute('href') ?? ''
    L.push(`- ${clean(a.textContent)}: ${href.startsWith('mailto:') ? href.slice(7) : abs(href)}`)
  }
  return L.join('\n').replace(/\n{3,}/g, '\n\n') + '\n'
}

export function graphOnlyMarkdown(): string {
  return `${graphMarkdown('# Krishnasai Addala: skills graph')}\n\nSource: ${SITE}projects/graph.html (copied ${today()})\n`
}

/** Copy `getText()` when the button is pressed, and say so on the button. */
export function wireCopy(btn: HTMLButtonElement, getText: () => string): void {
  const label = btn.textContent ?? ''
  btn.setAttribute('aria-live', 'polite')
  btn.addEventListener('click', async () => {
    const text = getText()
    let ok = true
    try {
      await navigator.clipboard.writeText(text)
    } catch {
      // older browsers, or a page without clipboard permission
      const ta = document.createElement('textarea')
      ta.value = text; ta.style.position = 'fixed'; ta.style.opacity = '0'
      document.body.append(ta); ta.select()
      ok = document.execCommand('copy')
      ta.remove()
    }
    btn.textContent = ok ? 'Copied' : 'Copy failed'
    setTimeout(() => { btn.textContent = label }, 2000)
  })
}

/** The graph as readable HTML: every project and organisation with its skills, then skills by category. */
export function renderGraphList(root: HTMLElement): void {
  const o = buildOutline()
  const el = <K extends keyof HTMLElementTagNameMap>(tag: K, cls = '', text = ''): HTMLElementTagNameMap[K] => {
    const e = document.createElement(tag)
    if (cls) e.className = cls
    if (text) e.textContent = text
    return e
  }
  const line = (key: string, value: string): HTMLElement => {
    const p = el('p', 'gl-line'); p.append(el('span', 'gl-key', key), document.createTextNode(value)); return p
  }
  const item = (e: Entry): HTMLElement => {
    const a = el('article', 'gl-item')
    const h = el('h4', 'gl-name', nodeName(e.node)); h.style.borderColor = CATEGORY_COLOR[e.node.category]
    a.append(h)
    if (e.orgs.length) a.append(line('Organisation', e.orgs.map(nodeName).join(', ')))
    if (e.projects.length) a.append(line('Projects', e.projects.map(nodeName).join(', ')))
    for (const g of e.skillGroups) a.append(line(g.label, g.skills.map(nodeName).join(', ')))
    return a
  }
  const group = (title: string, children: HTMLElement[]): HTMLElement => {
    const s = el('section', 'gl-group'); s.append(el('h3', 'gl-title', title))
    const grid = el('div', 'gl-grid'); grid.append(...children); s.append(grid); return s
  }
  const skills = o.skills.map(g => {
    const a = el('article', 'gl-item')
    const h = el('h4', 'gl-name', g.label); h.style.borderColor = CATEGORY_COLOR[g.category]
    a.append(h, el('p', 'gl-line', g.items.map(i => nodeName(i.node)).join(', ')))
    return a
  })
  root.replaceChildren(
    group(`Projects (${o.counts.projects})`, o.projects.map(item)),
    group(`Organisations (${o.counts.orgs})`, o.orgs.map(item)),
    group(`Skills by category (${o.counts.skills})`, skills),
  )
}
