import { prefersReducedMotion } from './motion'

// ─── TCG card deck (home page hero) ───────────────────────────────────────────
// Stack mode: clicking the top card flies it off and moves it to the back.
// Fan mode (toggle button): first click selects a card, second click opens it.
// Keyboard: each card with a destination is a focusable link; Enter or Space opens it.

export function initTCG(): void {
  const outer   = document.getElementById('tcg-outer')
  const stage   = document.getElementById('tcg-stage')
  const toggle  = document.getElementById('tcg-toggle')
  const counter = document.getElementById('tcg-counter')
  if (!outer || !stage || !toggle) return

  let isOpen  = false
  let busy    = false
  let dispNum = 1   // 1-based display index for the current top card

  const cards = () => stage.querySelectorAll<HTMLElement>('.tcg-card')

  function updateCounter(): void {
    if (counter) counter.textContent = `${dispNum} / ${cards().length}`
  }

  function open(card: HTMLElement): void {
    const href = card.dataset.href
    if (href) window.location.href = href
  }

  // Move the top card to the back of the stack (nth-child CSS repositions it)
  function sendToBack(card: HTMLElement): void {
    stage!.appendChild(card)
    dispNum = dispNum >= cards().length ? 1 : dispNum + 1
    updateCounter()
  }

  // ── Toggle fan / stack ─────────────────────────────────
  toggle.addEventListener('click', () => {
    isOpen = !isOpen
    outer.classList.toggle('is-open', isOpen)
    toggle.setAttribute('aria-pressed', String(isOpen))
    // Clear any active selection on collapse
    if (!isOpen) cards().forEach(c => c.classList.remove('is-active'))
  })

  // ── Pointer ────────────────────────────────────────────
  stage.addEventListener('click', e => {
    const card = (e.target as HTMLElement).closest<HTMLElement>('.tcg-card')
    if (!card) return

    if (isOpen) {
      if (card.classList.contains('is-active')) {
        open(card)
      } else {
        cards().forEach(c => c.classList.remove('is-active'))
        card.classList.add('is-active')
      }
      return
    }

    // Stack mode: only the top card (first child) cycles
    if (card !== stage.firstElementChild || busy) return

    // With reduced motion there is no fly-out, so no transitionend to wait for
    if (prefersReducedMotion()) { sendToBack(card); return }

    busy = true
    card.classList.add('is-flying')
    card.addEventListener('transitionend', function handler(ev: TransitionEvent) {
      if (ev.propertyName !== 'transform') return
      card.removeEventListener('transitionend', handler)

      // Suppress transitions during the DOM reorder, re-enable on the next frame
      card.classList.add('no-transition')
      card.classList.remove('is-flying')
      sendToBack(card)
      requestAnimationFrame(() => requestAnimationFrame(() => {
        card.classList.remove('no-transition')
        busy = false
      }))
    })
  })

  // ── Keyboard ───────────────────────────────────────────
  stage.addEventListener('keydown', e => {
    if (e.key !== 'Enter' && e.key !== ' ') return
    const card = (e.target as HTMLElement).closest<HTMLElement>('.tcg-card')
    if (!card?.dataset.href) return
    e.preventDefault()
    open(card)
  })

  updateCounter()
}
