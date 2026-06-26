import type { GraphNode, GraphLink, NodeCategory } from './types'

// ─── Nodes ────────────────────────────────────────────────────────────────────

export const RAW_NODES: Omit<GraphNode, 'degree'>[] = [
  // Projects
  { id: 'llm-platform',  label: 'LLM Interpretability\nPlatform', type: 'project', category: 'project' },
  { id: 'policy-swarm',  label: 'Policy Simulator',               type: 'project', category: 'project' },
  { id: 'tinynla',       label: 'TinyNLA',                        type: 'project', category: 'project' },
  { id: 'capgemini',     label: 'Capgemini',                      type: 'project', category: 'project' },
  { id: 'geminae',       label: 'Project Geminae',                type: 'project', category: 'project' },
  { id:'cmu',        label:'CMU',        type:'project', category:'project'},
{ id:'midas',      label:'MIDAS Lab',  type:'project', category:'project'},
{ id:'iiitd',      label:'IIIT Delhi', type:'project', category:'project'},
  // Consulting / Industry
{ id: 'cfpb-ai-agent',        label: 'CFPB AI Agent',             type: 'project', category: 'project' },
{ id: 'delay-prediction',     label: 'Delay Prediction',          type: 'project', category: 'project' },
{ id: 'sentiment-analysis',   label: 'Sentiment Analysis',        type: 'project', category: 'project' },
{ id: 'claim-llm',            label: 'Insurance Claim\nLLM',      type: 'project', category: 'project' },
{ id: 'churn-prediction',     label: 'Churn Prediction',          type: 'project', category: 'project' },
{ id: 'paper-recommender',    label: 'Paper Recommender',         type: 'project', category: 'project' },
{ id: 'food-retrieval',       label: 'Food Image\nRetrieval',     type: 'project', category: 'project' },
{ id: 'physics-llm',          label: 'Physics LLM\nDataset',      type: 'project', category: 'project' },
{ id: 'cv-experiment',        label: 'Computer Vision',           type: 'project', category: 'project' },
{ id: 'twitter-streamlit',    label: 'Twitter\nSentiment',        type: 'project', category: 'project' },
{ id: 'steganography',        label: 'Steganography',             type: 'project', category: 'project' },

  // Languages
  { id: 'python',        label: 'Python',      type: 'skill', category: 'lang' },
  { id: 'typescript',    label: 'TypeScript',  type: 'skill', category: 'lang' },
  { id: 'sql',           label: 'SQL',         type: 'skill', category: 'lang' },
  { id: 'bash',          label: 'Bash',        type: 'skill', category: 'lang' },
  { id: 'javascript', label: 'JavaScript', type: 'skill', category: 'lang' },
{ id: 'java',       label: 'Java',       type: 'skill', category: 'lang' },

  // ML / DL
  { id: 'pytorch',       label: 'PyTorch',      type: 'skill', category: 'ml' },
  { id: 'cuda',          label: 'CUDA',         type: 'skill', category: 'ml' },
  { id: 'huggingface',   label: 'HuggingFace',  type: 'skill', category: 'ml' },
  { id: 'tensorflow',    label: 'TensorFlow',   type: 'skill', category: 'ml' },
  { id: 'sklearn',       label: 'Scikit-learn', type: 'skill', category: 'ml' },
  { id: 'xgboost',       label: 'XGBoost',      type: 'skill', category: 'ml' },
  { id: 'keras',          label: 'Keras',             type: 'skill', category: 'ml' },
{ id: 'lime',           label: 'LIME',              type: 'skill', category: 'ml' },
{ id: 'opencv',         label: 'OpenCV',            type: 'skill', category: 'ml' },
{ id: 'cnn',            label: 'CNNs',              type: 'skill', category: 'ml' },
{ id: 'nlp',            label: 'NLP',               type: 'skill', category: 'ml' },
{ id: 'computervision', label: 'Computer Vision',   type: 'skill', category: 'ml' },
{ id: 'timeseries',     label: 'Time Series',       type: 'skill', category: 'ml' },

  // GenAI
  { id: 'langchain',     label: 'LangChain',  type: 'skill', category: 'genai' },
  { id: 'langgraph',     label: 'LangGraph',  type: 'skill', category: 'genai' },
  { id: 'openai',        label: 'OpenAI API', type: 'skill', category: 'genai' },
  { id: 'rag',           label: 'RAG',        type: 'skill', category: 'genai' },
  { id: 'llms',          label: 'LLMs',            type: 'skill', category: 'genai' },
{ id: 'embeddings',    label: 'Embeddings',      type: 'skill', category: 'genai' },
{ id: 'vectorsearch',  label: 'Vector Search',   type: 'skill', category: 'genai' },
{ id: 'prompteng',     label: 'Prompt Engineering', type:'skill',category:'genai'},
{ id: 'agents',        label: 'AI Agents',       type:'skill', category:'genai'},
{ id: 'evaluation',    label: 'LLM Evaluation',  type:'skill', category:'genai'},
{ id: 'knowledgegraph',label: 'Knowledge Graphs',type:'skill', category:'genai'},

  // Infrastructure
  { id: 'fastapi',       label: 'FastAPI',  type: 'skill', category: 'infra' },
  { id: 'docker',        label: 'Docker',   type: 'skill', category: 'infra' },
  { id: 'mlflow',        label: 'MLflow',   type: 'skill', category: 'infra' },
  { id: 'sse',           label: 'SSE',      type: 'skill', category: 'infra' },
  { id: 'airflow',       label: 'Airflow',  type: 'skill', category: 'infra' },
  { id: 'git',          label: 'Git',          type:'skill', category:'infra'},
{ id: 'github',       label: 'GitHub',       type:'skill', category:'infra'},
{ id: 'streamlit',    label: 'Streamlit',    type:'skill', category:'infra'},
{ id: 'react',        label: 'React',        type:'skill', category:'infra'},
{ id: 'vite',         label: 'Vite',         type:'skill', category:'infra'},
{ id: 'selenium',     label: 'Selenium',     type:'skill', category:'infra'},
{ id: 'cloudfunc',    label: 'Cloud Functions', type:'skill', category:'infra'},
{ id: 'bigtable',     label: 'BigQuery',     type:'skill', category:'cloud'},

  // Cloud
  { id: 'gcp',           label: 'GCP',      type: 'skill', category: 'cloud' },
  { id: 'aws',           label: 'AWS',      type: 'skill', category: 'cloud' },
  { id: 'bigquery',      label: 'BigQuery', type: 'skill', category: 'cloud' },
  { id: 'pubsub',        label: 'Pub/Sub',  type: 'skill', category: 'cloud' },
  { id: 'gcs',          label:'Cloud Storage', type:'skill', category:'cloud'},
{ id: 'vertex',       label:'Vertex AI',     type:'skill', category:'cloud'},

  // Data
  { id: 'numpy',         label: 'NumPy',    type: 'skill', category: 'data' },
  { id: 'scipy',         label: 'SciPy',    type: 'skill', category: 'data' },
  { id: 'networkx',      label: 'NetworkX', type: 'skill', category: 'data' },
  { id: 'pandas',        label: 'Pandas',   type: 'skill', category: 'data' },
  { id: 'shap',          label: 'SHAP',     type: 'skill', category: 'data' },
  { id: 'matplotlib', label:'Matplotlib', type:'skill', category:'data'},
{ id: 'plotly',     label:'Plotly',     type:'skill', category:'data'},
{ id: 'tableau',    label:'Tableau',    type:'skill', category:'data'},
{ id: 'airflowetl', label:'ETL',        type:'skill', category:'data'},
{ id: 'statistics', label:'Statistics', type:'skill', category:'data'},
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
  { source:'python', target:'cfpb-ai-agent'},
{ source:'langgraph', target:'cfpb-ai-agent'},
{ source:'langchain', target:'cfpb-ai-agent'},
{ source:'openai', target:'cfpb-ai-agent'},
{ source:'rag', target:'cfpb-ai-agent'},
{ source:'embeddings', target:'cfpb-ai-agent'},
{ source:'vectorsearch', target:'cfpb-ai-agent'},
{ source:'agents', target:'cfpb-ai-agent'},
{ source:'evaluation', target:'cfpb-ai-agent'},
{ source:'python', target:'delay-prediction'},
{ source:'keras', target:'delay-prediction'},
{ source:'lime', target:'delay-prediction'},
{ source:'shap', target:'delay-prediction'},
{ source:'tensorflow', target:'delay-prediction'},
{ source:'python', target:'sentiment-analysis'},
{ source:'nlp', target:'sentiment-analysis'},
{ source:'streamlit', target:'sentiment-analysis'},
{ source:'selenium', target:'sentiment-analysis'},
{ source:'python', target:'physics-llm'},
{ source:'llms', target:'physics-llm'},
{ source:'nlp', target:'physics-llm'},
{ source:'knowledgegraph', target:'physics-llm'},
{ source:'python', target:'cv-experiment'},
{ source:'opencv', target:'cv-experiment'},
{ source:'computervision', target:'cv-experiment'},
{ source:'python', target:'twitter-streamlit'},
{ source:'streamlit', target:'twitter-streamlit'},
{ source:'nlp', target:'twitter-streamlit'},
{ source:'python', target:'steganography'},
{ source:'keras', target:'steganography'},
{ source:'cnn', target:'steganography'},

  // Project Geminae
  { source: 'python',      target: 'geminae' },
  { source: 'sklearn',     target: 'geminae' },
  { source: 'xgboost',     target: 'geminae' },
  { source: 'tensorflow',  target: 'geminae' },
  { source: 'shap',        target: 'geminae' },
  { source: 'numpy',       target: 'geminae' },
  { source: 'pandas',      target: 'geminae' },
  { source:'python', target:'claim-llm'},
{ source:'llms', target:'claim-llm'},
{ source:'keras', target:'claim-llm'},
{ source:'nlp', target:'claim-llm'},
{ source:'lime', target:'claim-llm'},
{ source:'shap', target:'claim-llm'},
{ source:'python', target:'churn-prediction'},
{ source:'sklearn', target:'churn-prediction'},
{ source:'xgboost', target:'churn-prediction'},
{ source:'pandas', target:'churn-prediction'},
{ source:'numpy', target:'churn-prediction'},
{ source:'statistics', target:'churn-prediction'},
{ source:'python', target:'paper-recommender'},
{ source:'knowledgegraph', target:'paper-recommender'},
{ source:'networkx', target:'paper-recommender'},
{ source:'tensorflow', target:'paper-recommender'},
{ source:'numpy', target:'paper-recommender'},
{ source:'python', target:'food-retrieval'},
{ source:'opencv', target:'food-retrieval'},
{ source:'cnn', target:'food-retrieval'},
{ source:'selenium', target:'food-retrieval'},
{ source:'streamlit', target:'food-retrieval'},
// ---------- Shared ML ----------
{ source: 'python', target: 'keras' },
{ source: 'python', target: 'tensorflow' },
{ source: 'python', target: 'pytorch' },
{ source: 'python', target: 'sklearn' },
{ source: 'python', target: 'xgboost' },
{ source: 'python', target: 'opencv' },
{ source: 'python', target: 'numpy' },
{ source: 'python', target: 'pandas' },
{ source: 'python', target: 'scipy' },

// ---------- Deep Learning ----------
{ source: 'keras', target: 'tensorflow' },
{ source: 'keras', target: 'cnn' },
{ source: 'tensorflow', target: 'cnn' },
{ source: 'tensorflow', target: 'computervision' },
{ source: 'pytorch', target: 'cuda' },
{ source: 'pytorch', target: 'huggingface' },
{ source: 'pytorch', target: 'llms' },
{ source: 'huggingface', target: 'llms' },

// ---------- NLP ----------
{ source: 'nlp', target: 'llms' },
{ source: 'nlp', target: 'rag' },
{ source: 'nlp', target: 'langchain' },
{ source: 'nlp', target: 'langgraph' },
{ source: 'nlp', target: 'openai' },
{ source: 'nlp', target: 'embeddings' },
{ source: 'nlp', target: 'vectorsearch' },

// ---------- GenAI ----------
{ source: 'langchain', target: 'langgraph' },
{ source: 'langchain', target: 'openai' },
{ source: 'langchain', target: 'rag' },
{ source: 'langchain', target: 'embeddings' },

{ source: 'langgraph', target: 'agents' },
{ source: 'langgraph', target: 'openai' },

{ source: 'openai', target: 'llms' },
{ source: 'openai', target: 'embeddings' },
{ source: 'openai', target: 'evaluation' },
{ source: 'openai', target: 'prompteng' },

{ source: 'rag', target: 'embeddings' },
{ source: 'rag', target: 'vectorsearch' },
{ source: 'rag', target: 'knowledgegraph' },

{ source: 'embeddings', target: 'vectorsearch' },
{ source: 'embeddings', target: 'llms' },

{ source: 'agents', target: 'llms' },
{ source: 'agents', target: 'evaluation' },

{ source: 'knowledgegraph', target: 'networkx' },
{ source: 'knowledgegraph', target: 'llms' },

// ---------- Explainability ----------
{ source: 'lime', target: 'shap' },
{ source: 'lime', target: 'sklearn' },
{ source: 'shap', target: 'xgboost' },
{ source: 'shap', target: 'tensorflow' },

// ---------- Data ----------
{ source: 'numpy', target: 'pandas' },
{ source: 'numpy', target: 'scipy' },
{ source: 'numpy', target: 'sklearn' },
{ source: 'numpy', target: 'tensorflow' },
{ source: 'numpy', target: 'pytorch' },

{ source: 'pandas', target: 'sklearn' },
{ source: 'pandas', target: 'xgboost' },
{ source: 'pandas', target: 'bigquery' },

{ source: 'statistics', target: 'sklearn' },
{ source: 'statistics', target: 'xgboost' },

// ---------- Computer Vision ----------
{ source: 'opencv', target: 'computervision' },
{ source: 'opencv', target: 'cnn' },
{ source: 'opencv', target: 'tensorflow' },

// ---------- Cloud ----------
{ source: 'gcp', target: 'airflow' },
{ source: 'gcp', target: 'pubsub' },
{ source: 'gcp', target: 'bigquery' },
{ source: 'gcp', target: 'cloudfunc' },
{ source: 'gcp', target: 'gcs' },
{ source: 'gcp', target: 'vertex' },

{ source: 'bigquery', target: 'pubsub' },
{ source: 'bigquery', target: 'airflow' },
{ source: 'airflow', target: 'cloudfunc' },

// ---------- Infrastructure ----------
{ source: 'docker', target: 'fastapi' },
{ source: 'docker', target: 'mlflow' },
{ source: 'docker', target: 'gcp' },
{ source: 'docker', target: 'streamlit' },

{ source: 'fastapi', target: 'sse' },
{ source: 'fastapi', target: 'openai' },

{ source: 'git', target: 'github' },
{ source: 'git', target: 'docker' },

{ source: 'react', target: 'typescript' },
{ source: 'react', target: 'vite' },

{ source: 'streamlit', target: 'plotly' },
{ source: 'streamlit', target: 'matplotlib' },

// ---------- Languages ----------
{ source: 'javascript', target: 'typescript' },
{ source: 'typescript', target: 'vite' },
{ source: 'typescript', target: 'react' },

{ source: 'sql', target: 'bigquery' },
{ source: 'sql', target: 'pandas' },

{ source: 'bash', target: 'docker' },
{ source: 'bash', target: 'gcp' },

// ---------- Misc ----------
{ source: 'selenium', target: 'streamlit' },
{ source: 'selenium', target: 'opencv' },

{ source: 'tableau', target: 'plotly' },
{ source: 'tableau', target: 'statistics' },

{ source: 'matplotlib', target: 'numpy' },
{ source: 'plotly', target: 'pandas' },

{ source: 'networkx', target: 'scipy' },
{ source: 'networkx', target: 'numpy' },

{ source: 'mlflow', target: 'tensorflow' },
{ source: 'mlflow', target: 'pytorch' },

{ source: 'evaluation', target: 'llms' },
{ source: 'evaluation', target: 'rag' },
// Organizations → Projects
{ source: 'iiitd',      target: 'paper-recommender' },
{ source: 'iiitd',      target: 'food-retrieval' },
{ source: 'iiitd',      target: 'cv-experiment' },
{ source: 'iiitd',      target: 'twitter-streamlit' },
{ source: 'iiitd',      target: 'steganography' },

{ source: 'midas',      target: 'physics-llm' },

{ source: 'cmu',        target: 'geminae' },
{ source: 'cmu',        target: 'claim-llm' },
{ source: 'cmu',        target: 'churn-prediction' },

{ source: 'capgemini',  target: 'cfpb-ai-agent' },
{ source: 'capgemini',  target: 'delay-prediction' },

// Organization → Skills

// IIIT Delhi
{ source: 'iiitd', target: 'python' },
{ source: 'iiitd', target: 'tensorflow' },
{ source: 'iiitd', target: 'keras' },
{ source: 'iiitd', target: 'opencv' },
{ source: 'iiitd', target: 'knowledgegraph' },

// MIDAS
{ source: 'midas', target: 'python' },
{ source: 'midas', target: 'llms' },
{ source: 'midas', target: 'nlp' },
{ source: 'midas', target: 'knowledgegraph' },

// CMU
{ source: 'cmu', target: 'python' },
{ source: 'cmu', target: 'sklearn' },
{ source: 'cmu', target: 'xgboost' },
{ source: 'cmu', target: 'tensorflow' },
{ source: 'cmu', target: 'shap' },
{ source: 'cmu', target: 'lime' },

// Capgemini
{ source: 'capgemini', target: 'gcp' },
{ source: 'capgemini', target: 'langgraph' },
{ source: 'capgemini', target: 'langchain' },
{ source: 'capgemini', target: 'openai' },
{ source: 'capgemini', target: 'docker' },


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
