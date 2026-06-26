import type { GraphNode, GraphLink, NodeCategory } from './types'

// ─── Nodes ────────────────────────────────────────────────────────────────────

export const RAW_NODES: Omit<GraphNode, 'degree'>[] = [
  // Projects
  { id: 'llm-platform',  label: 'LLM Interpretability\nPlatform', type: 'project', category: 'project' },
  { id: 'policy-swarm',  label: 'Policy Simulator',               type: 'project', category: 'project' },
  { id: 'tinynla',       label: 'TinyNLA',                        type: 'project', category: 'project' },
  { id: 'capgemini',     label: 'Capgemini',                      type: 'project', category: 'project' },
  { id: 'geminae',       label: 'Project Geminae',                type: 'project', category: 'project' },

  // Languages
  { id: 'python',        label: 'Python',      type: 'skill', category: 'lang' },
  { id: 'typescript',    label: 'TypeScript',  type: 'skill', category: 'lang' },
  { id: 'sql',           label: 'SQL',         type: 'skill', category: 'lang' },
  { id: 'bash',          label: 'Bash',        type: 'skill', category: 'lang' },

  // ML / DL
  { id: 'pytorch',       label: 'PyTorch',      type: 'skill', category: 'ml' },
  { id: 'cuda',          label: 'CUDA',         type: 'skill', category: 'ml' },
  { id: 'huggingface',   label: 'HuggingFace',  type: 'skill', category: 'ml' },
  { id: 'tensorflow',    label: 'TensorFlow',   type: 'skill', category: 'ml' },
  { id: 'sklearn',       label: 'Scikit-learn', type: 'skill', category: 'ml' },
  { id: 'xgboost',       label: 'XGBoost',      type: 'skill', category: 'ml' },

  // GenAI
  { id: 'langchain',     label: 'LangChain',  type: 'skill', category: 'genai' },
  { id: 'langgraph',     label: 'LangGraph',  type: 'skill', category: 'genai' },
  { id: 'openai',        label: 'OpenAI API', type: 'skill', category: 'genai' },
  { id: 'rag',           label: 'RAG',        type: 'skill', category: 'genai' },

  // Infrastructure
  { id: 'fastapi',       label: 'FastAPI',  type: 'skill', category: 'infra' },
  { id: 'docker',        label: 'Docker',   type: 'skill', category: 'infra' },
  { id: 'mlflow',        label: 'MLflow',   type: 'skill', category: 'infra' },
  { id: 'sse',           label: 'SSE',      type: 'skill', category: 'infra' },
  { id: 'airflow',       label: 'Airflow',  type: 'skill', category: 'infra' },

  // Cloud
  { id: 'gcp',           label: 'GCP',      type: 'skill', category: 'cloud' },
  { id: 'aws',           label: 'AWS',      type: 'skill', category: 'cloud' },
  { id: 'bigquery',      label: 'BigQuery', type: 'skill', category: 'cloud' },
  { id: 'pubsub',        label: 'Pub/Sub',  type: 'skill', category: 'cloud' },

  // Data
  { id: 'numpy',         label: 'NumPy',    type: 'skill', category: 'data' },
  { id: 'scipy',         label: 'SciPy',    type: 'skill', category: 'data' },
  { id: 'networkx',      label: 'NetworkX', type: 'skill', category: 'data' },
  { id: 'pandas',        label: 'Pandas',   type: 'skill', category: 'data' },
  { id: 'shap',          label: 'SHAP',     type: 'skill', category: 'data' },
]

export const RAW_LINKS: { source: string; target: string }[] = [
  // LLM Platform
  { source: 'python',      target: 'llm-platform' },
  { source: 'pytorch',     target: 'llm-platform' },
  { source: 'cuda',        target: 'llm-platform' },
  { source: 'huggingface', target: 'llm-platform' },
  { source: 'fastapi',     target: 'llm-platform' },
  { source: 'sse',         target: 'llm-platform' },
  { source: 'docker',      target: 'llm-platform' },
  { source: 'mlflow',      target: 'llm-platform' },
  { source: 'numpy',       target: 'llm-platform' },

  // Policy Simulator
  { source: 'python',      target: 'policy-swarm' },
  { source: 'numpy',       target: 'policy-swarm' },
  { source: 'scipy',       target: 'policy-swarm' },
  { source: 'networkx',    target: 'policy-swarm' },
  {source: 'typescript',      target: 'policy-swarm' },

  // TinyNLA
  { source: 'python',      target: 'tinynla' },
  { source: 'pytorch',     target: 'tinynla' },
  { source: 'cuda',        target: 'tinynla' },
  { source: 'huggingface', target: 'tinynla' },
  { source: 'numpy',       target: 'tinynla' },
  {source: 'typescript',      target: 'tinynla' },

  // Capgemini
  { source: 'python',      target: 'capgemini' },
  { source: 'langchain',   target: 'capgemini' },
  { source: 'langgraph',   target: 'capgemini' },
  { source: 'openai',      target: 'capgemini' },
  { source: 'rag',         target: 'capgemini' },
  { source: 'gcp',         target: 'capgemini' },
  { source: 'airflow',     target: 'capgemini' },
  { source: 'bigquery',    target: 'capgemini' },
  { source: 'pubsub',      target: 'capgemini' },
  { source: 'docker',      target: 'capgemini' },
  { source: 'sql',         target: 'capgemini' },
  { source: 'bash',        target: 'capgemini' },

  // Project Geminae
  { source: 'python',      target: 'geminae' },
  { source: 'sklearn',     target: 'geminae' },
  { source: 'xgboost',     target: 'geminae' },
  { source: 'tensorflow',  target: 'geminae' },
  { source: 'shap',        target: 'geminae' },
  { source: 'numpy',       target: 'geminae' },
  { source: 'pandas',      target: 'geminae' },
]

// ─── Palette ──────────────────────────────────────────────────────────────────

export const CATEGORY_COLOR: Record<NodeCategory, string> = {
  project: '#4ade80',
  lang:    '#5eead4',
  ml:      '#86efac',
  genai:   '#34d399',
  infra:   '#6ee7b7',
  cloud:   '#a7f3d0',
  data:    '#d1fae5',
}

export const CATEGORY_LABEL: Record<NodeCategory, string> = {
  project: 'Projects',
  lang:    'Languages',
  ml:      'ML / DL',
  genai:   'GenAI',
  infra:   'Infrastructure',
  cloud:   'Cloud',
  data:    'Data',
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

export function buildNodes(): GraphNode[] {
  const degreeMap = new Map<string, number>()
  RAW_LINKS.forEach(l => {
    degreeMap.set(l.source, (degreeMap.get(l.source) ?? 0) + 1)
    degreeMap.set(l.target, (degreeMap.get(l.target) ?? 0) + 1)
  })
  return RAW_NODES.map(n => ({ ...n, degree: degreeMap.get(n.id) ?? 0 }))
}

export function buildLinks(): GraphLink[] {
  return RAW_LINKS.map(l => ({ ...l }))
}

export function nodeRadius(n: GraphNode): number {
  if (n.type === 'project') return 22
  return Math.max(7, Math.min(14, 7 + (n.degree ?? 1) * 1.2))
}
