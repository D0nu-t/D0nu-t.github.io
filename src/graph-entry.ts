import { initGraph } from './graph'
import { graphOnlyMarkdown, wireCopy } from './export'

document.addEventListener('DOMContentLoaded', () => {
  initGraph('graph-container')
  document.querySelectorAll<HTMLButtonElement>('[data-copy="graph"]').forEach(b => wireCopy(b, graphOnlyMarkdown))
})
