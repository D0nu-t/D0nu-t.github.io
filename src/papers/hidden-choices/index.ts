import { initHero } from './hero'
import { initCoverage } from './coverage'
import { initOrigin } from './origin'
import { initMatching } from './matching'
import { initInteraction } from './interaction'
import { initRuler } from './ruler'

// Entry for projects/hidden-choices.html: start each demo whose markup is on the page.
const demos: Record<string, (root: HTMLElement) => void> = {
  coverage: initCoverage,
  origin: initOrigin,
  matching: initMatching,
  interaction: initInteraction,
  ruler: initRuler,
}

document.addEventListener('DOMContentLoaded', () => {
  // Each demo starts on its own, so one failing can't stop the rest
  const start = (name: string, fn: () => void) => { try { fn() } catch (err) { console.error(`demo ${name} failed`, err) } }
  const hero = document.getElementById('hero-field')
  if (hero instanceof HTMLCanvasElement) start('hero', () => initHero(hero))
  document.querySelectorAll<HTMLElement>('[data-demo]').forEach(root => start(root.dataset.demo!, () => demos[root.dataset.demo!]?.(root)))
})
