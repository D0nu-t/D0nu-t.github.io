import type { NavSection, CounterOptions, RevealOptions } from './types'

// ─── Active nav tracking ──────────────────────────────────────────────────────

const NAV_SECTIONS: NavSection[] = [
  { id: 'work',         label: 'Work' },
  { id: 'experience',   label: 'Experience' },
  { id: 'publications', label: 'Publications' },
  { id: 'contact',      label: 'Contact' },
]

function initNavTracking(): void {
  const links = document.querySelectorAll<HTMLAnchorElement>('.nav-links a')
  if (!links.length) return

  const sectionEls = NAV_SECTIONS
    .map(s => document.getElementById(s.id))
    .filter((el): el is HTMLElement => el !== null)

  const observer = new IntersectionObserver(
    (entries) => {
      entries.forEach(entry => {
        if (!entry.isIntersecting) return
        const id = entry.target.id
        links.forEach(a => {
          const isActive = a.getAttribute('href') === `#${id}`
          a.classList.toggle('is-active', isActive)
        })
      })
    },
    { rootMargin: '-40% 0px -55% 0px' }
  )

  sectionEls.forEach(el => observer.observe(el))
}

// ─── Scroll reveal ─────────────────────────────────────────────────────────────

function initReveal(opts: RevealOptions = {}): void {
  const { threshold = 0.12, rootMargin = '0px' } = opts
  const els = document.querySelectorAll<HTMLElement>('[data-reveal]')
  if (!els.length) return

  const observer = new IntersectionObserver(
    (entries) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          entry.target.classList.add('is-revealed')
          observer.unobserve(entry.target)
        }
      })
    },
    { threshold, rootMargin }
  )

  els.forEach(el => observer.observe(el))
}

// ─── Animated counter ─────────────────────────────────────────────────────────

function animateCounter(opts: CounterOptions): void {
  const { el, target, suffix = '', duration = 1400 } = opts
  const start = performance.now()

  function easeOut(t: number): number {
    return 1 - Math.pow(1 - t, 3)
  }

  function frame(now: number): void {
    const elapsed = now - start
    const progress = Math.min(elapsed / duration, 1)
    const value = Math.round(easeOut(progress) * target)
    el.textContent = value.toString() + suffix
    if (progress < 1) requestAnimationFrame(frame)
  }

  requestAnimationFrame(frame)
}

function initCounters(): void {
  const els = document.querySelectorAll<HTMLElement>('[data-counter]')
  if (!els.length) return

  const observer = new IntersectionObserver(
    (entries) => {
      entries.forEach(entry => {
        if (!entry.isIntersecting) return
        const el = entry.target as HTMLElement
        const target = parseInt(el.dataset.counter ?? '0', 10)
        const suffix = el.dataset.counterSuffix ?? ''
        animateCounter({ el, target, suffix })
        observer.unobserve(el)
      })
    },
    { threshold: 0.5 }
  )

  els.forEach(el => observer.observe(el))
}

// ─── Sticky nav shadow on scroll ─────────────────────────────────────────────

function initNavShadow(): void {
  const nav = document.querySelector<HTMLElement>('.site-nav')
  if (!nav) return

  const update = (): void => {
    nav.classList.toggle('is-scrolled', window.scrollY > 8)
  }

  window.addEventListener('scroll', update, { passive: true })
  update()
}

// ─── Probe grid hover tooltips ────────────────────────────────────────────────

function initProbeGrid(): void {
  const cells = document.querySelectorAll<HTMLElement>('.probe-cell')
  cells.forEach(cell => {
    cell.addEventListener('mouseenter', () => {
      cell.setAttribute('aria-expanded', 'true')
    })
    cell.addEventListener('mouseleave', () => {
      cell.setAttribute('aria-expanded', 'false')
    })
  })
}

// ─── Copy email to clipboard ─────────────────────────────────────────────────

function initCopyEmail(): void {
  const btn = document.querySelector<HTMLButtonElement>('[data-copy-email]')
  if (!btn) return

  btn.addEventListener('click', async () => {
    const email = btn.dataset.copyEmail ?? ''
    try {
      await navigator.clipboard.writeText(email)
      const original = btn.textContent
      btn.textContent = 'Copied!'
      setTimeout(() => { btn.textContent = original }, 2000)
    } catch {
      // clipboard not available — graceful fallback, do nothing
    }
  })
}

// ─── Init ─────────────────────────────────────────────────────────────────────

document.addEventListener('DOMContentLoaded', () => {
  initNavTracking()
  initReveal()
  initCounters()
  initNavShadow()
  initProbeGrid()
  initCopyEmail()
})
