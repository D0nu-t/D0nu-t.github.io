import { mountSkillsGraph } from './graph3d/skills-view'
import { graphOnlyMarkdown, wireCopy } from './export'

document.addEventListener('DOMContentLoaded', () => {
  document.querySelectorAll<HTMLElement>('[data-skills-graph]').forEach(mountSkillsGraph)
  document.querySelectorAll<HTMLButtonElement>('[data-copy="graph"]').forEach(b => wireCopy(b, graphOnlyMarkdown))
})
