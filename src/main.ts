import type { NavSection, CounterOptions, RevealOptions } from './types'
import { initGraphEmbed } from './graph-embed'

const NAV_SECTIONS: NavSection[] = [
  { id: 'work',         label: 'Work' },
  { id: 'experience',   label: 'Experience' },
  { id: 'skills',       label: 'Skills' },
  { id: 'publications', label: 'Publications' },
  { id: 'contact',      label: 'Contact' },
]

function initNavTracking(): void {
  const links = document.querySelectorAll<HTMLAnchorElement>('.nav-links a')
  if (!links.length) return
  const sectionEls = NAV_SECTIONS
    .map(s => document.getElementById(s.id))
    .filter((el): el is HTMLElement => el !== null)
  const observer = new IntersectionObserver(entries => {
    entries.forEach(entry => {
      if (!entry.isIntersecting) return
      const id = entry.target.id
      links.forEach(a => a.classList.toggle('is-active', a.getAttribute('href') === `#${id}`))
    })
  }, { rootMargin: '-40% 0px -55% 0px' })
  sectionEls.forEach(el => observer.observe(el))
}

function initReveal(opts: RevealOptions = {}): void {
  const { threshold = 0.12, rootMargin = '0px' } = opts
  const els = document.querySelectorAll<HTMLElement>('[data-reveal]')
  if (!els.length) return
  const observer = new IntersectionObserver(entries => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        entry.target.classList.add('is-revealed')
        observer.unobserve(entry.target)
      }
    })
  }, { threshold, rootMargin })
  els.forEach(el => observer.observe(el))
}

function initCounters(): void {
  const els = document.querySelectorAll<HTMLElement>('[data-counter]')
  if (!els.length) return
  const easeOut = (t: number) => 1 - Math.pow(1 - t, 3)
  const obs = new IntersectionObserver(entries => {
    entries.forEach(entry => {
      if (!entry.isIntersecting) return
      const el = entry.target as HTMLElement
      const target = parseInt(el.dataset.counter ?? '0', 10)
      const suffix = el.dataset.counterSuffix ?? ''
      const duration = 1400
      const start = performance.now()
      const tick = (opts: CounterOptions) => {
        const frame = (now: number) => {
          const p = Math.min((now - start) / opts.duration!, 1)
          opts.el.textContent = Math.round(easeOut(p) * opts.target).toString() + (opts.suffix ?? '')
          if (p < 1) requestAnimationFrame(frame)
        }
        requestAnimationFrame(frame)
      }
      tick({ el, target, suffix, duration })
      obs.unobserve(el)
    })
  }, { threshold: 0.5 })
  els.forEach(el => obs.observe(el))
}

function initNavShadow(): void {
  const nav = document.querySelector<HTMLElement>('.site-nav')
  if (!nav) return
  const update = () => nav.classList.toggle('is-scrolled', window.scrollY > 8)
  window.addEventListener('scroll', update, { passive: true })
  update()
}

function initCopyEmail(): void {
  const btn = document.querySelector<HTMLButtonElement>('[data-copy-email]')
  if (!btn) return
  btn.addEventListener('click', async () => {
    try {
      await navigator.clipboard.writeText(btn.dataset.copyEmail ?? '')
      const orig = btn.textContent
      btn.textContent = 'Copied!'
      setTimeout(() => { btn.textContent = orig }, 2000)
    } catch { /* silent */ }
  })
}

document.addEventListener('DOMContentLoaded', () => {
  initNavTracking()
  initReveal()
  initCounters()
  initNavShadow()
  initCopyEmail()
  const embed = document.getElementById('graph-embed')
  if (embed) initGraphEmbed('graph-embed')
})
