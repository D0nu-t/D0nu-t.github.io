import * as d3 from 'd3'
import type { GraphNode, GraphLink, NodeCategory } from './types'

// ─── Data ─────────────────────────────────────────────────────────────────────

const RAW_NODES: Omit<GraphNode, 'degree'>[] = [
   // Projects
  { id: 'llm-platform',  label: 'LLM Interpretability\nPlatform', type: 'project', category: 'project' },
  { id: 'policy-swarm',  label: 'Policy Simulator',               type: 'project', category: 'project' },
  { id: 'tinynla',       label: 'TinyNLA',                        type: 'project', category: 'project' },
{ id: 'capgemini', label: 'Capgemini', type: 'project', category: 'work' },
  { id: 'geminae',       label: 'Project Geminae',                type: 'project', category: 'project' },
  { id:'cmu',        label:'CMU',        type:'project', category:'academic'},
{ id:'midas',      label:'MIDAS Lab',  type:'project', category:'academic'},
{ id:'iiitd',      label:'IIIT Delhi', type:'project', category:'academic'},
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
{ id: 'bigtable',     label: 'BigTable',     type:'skill', category:'cloud'},

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

// Languages
{ id: 'r',           label: 'R',            type: 'skill', category: 'lang' },

// ML / DL
{ id: 'lightgbm',   label: 'LightGBM',     type: 'skill', category: 'ml' },
{ id: 'jax',        label: 'JAX',          type: 'skill', category: 'ml' },
{ id: 'dice',       label: 'DiCE',         type: 'skill', category: 'ml' },
{ id: 'lora',       label: 'LoRA / PEFT',  type: 'skill', category: 'ml' },
{ id: 'rlhf',       label: 'RLHF',         type: 'skill', category: 'ml' },

// GenAI
{ id: 'google-adk', label: 'Google ADK',   type: 'skill', category: 'genai' },
{ id: 'ollama',     label: 'Ollama',       type: 'skill', category: 'genai' },

// Infrastructure
{ id: 'kubernetes', label: 'Kubernetes',   type: 'skill', category: 'infra' },
{ id: 'flask',      label: 'Flask',        type: 'skill', category: 'infra' },
{ id: 'langsmith',  label: 'LangSmith',    type: 'skill', category: 'infra' },
{ id: 'mcp',        label: 'MCP',          type: 'skill', category: 'infra' },
{ id: 'd3',         label: 'D3.js',        type: 'skill', category: 'infra' },

// Data
{ id: 'spark',      label: 'Spark',        type: 'skill', category: 'data' },
{ id: 'databricks', label: 'Databricks',   type: 'skill', category: 'data' },
{ id: 'postgresql', label: 'PostgreSQL',   type: 'skill', category: 'data' },
{ id: 'mongodb',    label: 'MongoDB',      type: 'skill', category: 'data' },
{ id: 'neo4j',      label: 'Neo4j',        type: 'skill', category: 'data' },
{ id: 'powerbi',    label: 'Power BI',     type: 'skill', category: 'data' },
]
const RAW_LINKS: { source: string; target: string }[] = [
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
// Java
{ source: 'java', target: 'javascript' },
{ source: 'java', target: 'typescript' },

// Time Series
{ source: 'timeseries', target: 'sklearn' },
{ source: 'timeseries', target: 'xgboost' },
{ source: 'timeseries', target: 'statistics' },
{ source: 'timeseries', target: 'python' },

// AWS
{ source: 'aws', target: 'docker' },
{ source: 'aws', target: 'python' },
{ source: 'aws', target: 'gcp' },

// BigTable (or rename this node to BigQuery)
{ source: 'bigtable', target: 'gcp' },
{ source: 'bigtable', target: 'python' },
{ source: 'bigtable', target: 'bigquery' },

// ETL
{ source: 'airflowetl', target: 'airflow' },
{ source: 'airflowetl', target: 'python' },
{ source: 'airflowetl', target: 'pandas' },
{ source: 'airflowetl', target: 'bigquery' },
// LoRA / PEFT / RLHF — used at MIDAS for fine-tuning
{ source: 'lora',       target: 'midas' },
{ source: 'rlhf',       target: 'midas' },
{ source: 'lora',       target: 'physics-llm' },
{ source: 'rlhf',       target: 'physics-llm' },
{ source: 'lora',       target: 'pytorch' },
{ source: 'lora',       target: 'huggingface' },
{ source: 'rlhf',       target: 'llms' },

// DiCE — explainability, alongside SHAP/LIME
{ source: 'dice',       target: 'sklearn' },
{ source: 'dice',       target: 'tensorflow' },
{ source: 'dice',       target: 'lime' },
{ source: 'dice',       target: 'shap' },
{ source: 'dice',       target: 'geminae' },

// LightGBM — sits next to XGBoost
{ source: 'lightgbm',  target: 'sklearn' },
{ source: 'lightgbm',  target: 'xgboost' },
{ source: 'lightgbm',  target: 'pandas' },
{ source: 'lightgbm',  target: 'geminae' },

// JAX — alongside PyTorch/NumPy
{ source: 'jax',        target: 'numpy' },
{ source: 'jax',        target: 'pytorch' },

// Google ADK — Capgemini stack
{ source: 'google-adk', target: 'capgemini' },
{ source: 'google-adk', target: 'agents' },
{ source: 'google-adk', target: 'langgraph' },
{ source: 'google-adk', target: 'gcp' },

// Ollama — local LLM inference, sits with LLMs
{ source: 'ollama',     target: 'llms' },
{ source: 'ollama',     target: 'openai' },

// MCP — Capgemini (mentioned in experience bullets)
{ source: 'mcp',        target: 'capgemini' },
{ source: 'mcp',        target: 'agents' },
{ source: 'mcp',        target: 'langchain' },

// LangSmith — tracing for LangGraph/LangChain
{ source: 'langsmith',  target: 'capgemini' },
{ source: 'langsmith',  target: 'langchain' },
{ source: 'langsmith',  target: 'langgraph' },
{ source: 'langsmith',  target: 'evaluation' },

// Kubernetes
{ source: 'kubernetes', target: 'docker' },
{ source: 'kubernetes', target: 'gcp' },
{ source: 'kubernetes', target: 'capgemini' },

// Flask
{ source: 'flask',      target: 'fastapi' },
{ source: 'flask',      target: 'python' },

// D3.js
{ source: 'd3',         target: 'javascript' },
{ source: 'd3',         target: 'typescript' },
{ source: 'd3',         target: 'plotly' },

// R
{ source: 'r',          target: 'statistics' },
{ source: 'r',          target: 'pandas' },

// Spark / Databricks
{ source: 'spark',      target: 'python' },
{ source: 'spark',      target: 'pandas' },
{ source: 'spark',      target: 'bigquery' },
{ source: 'databricks', target: 'spark' },
{ source: 'databricks', target: 'gcp' },
{ source: 'databricks', target: 'capgemini' },

// Databases
{ source: 'postgresql', target: 'sql' },
{ source: 'postgresql', target: 'pandas' },
{ source: 'mongodb',    target: 'python' },
{ source: 'mongodb',    target: 'fastapi' },
{ source: 'neo4j',      target: 'knowledgegraph' },
{ source: 'neo4j',      target: 'networkx' },
{ source: 'neo4j',      target: 'midas' },
{ source: 'neo4j',      target: 'physics-llm' },

// Power BI
{ source: 'powerbi',    target: 'tableau' },
{ source: 'powerbi',    target: 'statistics' },
{ source: 'powerbi',    target: 'pandas' },

]

// ─── Colour palette ───────────────────────────────────────────────────────────

export const CATEGORY_COLOR: Record<NodeCategory, string> = {
  project:  '#4ade80',
  work:     '#f59e0b',  // amber — professional/industry
  academic: '#a78bfa',  // violet — scholarly
  lang:     '#5eead4',
  ml:       '#86efac',
  genai:    '#34d399',
  infra:    '#6ee7b7',
  cloud:    '#a7f3d0',
  data:     '#d1fae5',
}

export const CATEGORY_LABEL: Record<NodeCategory, string> = {
  project:  'Projects',
  work:     'Work Experience',
  academic: 'Academic',
  lang:     'Languages',
  ml:       'ML / DL',
  genai:    'GenAI',
  infra:    'Infrastructure',
  cloud:    'Cloud',
  data:     'Data',
}

// ─── Radius helpers ───────────────────────────────────────────────────────────

function nodeRadius(n: GraphNode): number {
  if (n.type === 'project') return 22
  return Math.max(7, Math.min(14, 7 + (n.degree ?? 1) * 1.2))
}

// ─── Main init ────────────────────────────────────────────────────────────────

export function initGraph(containerId: string): void {
  const container = document.getElementById(containerId)
  if (!container) return

  // ── Compute degrees ────────────────────────────────────────────────────────
  const degreeMap = new Map<string, number>()
  RAW_LINKS.forEach(l => {
    degreeMap.set(l.source, (degreeMap.get(l.source) ?? 0) + 1)
    degreeMap.set(l.target, (degreeMap.get(l.target) ?? 0) + 1)
  })

  const nodes: GraphNode[] = RAW_NODES.map(n => ({
    ...n,
    degree: degreeMap.get(n.id) ?? 0,
  }))

  const links: GraphLink[] = RAW_LINKS.map(l => ({ ...l }))

  // ── SVG setup ─────────────────────────────────────────────────────────────
  const W = container.clientWidth
  const H = container.clientHeight

  const svg = d3.select(container)
    .append('svg')
    .attr('width', '100%')
    .attr('height', '100%')
    .attr('viewBox', `0 0 ${W} ${H}`)
    .style('background', '#0d1117')

  // Glow filter
  const defs = svg.append('defs')
  const glowFilter = defs.append('filter')
    .attr('id', 'glow')
    .attr('x', '-50%').attr('y', '-50%')
    .attr('width', '200%').attr('height', '200%')
  glowFilter.append('feGaussianBlur')
    .attr('in', 'SourceGraphic')
    .attr('stdDeviation', '3')
    .attr('result', 'blur')
  const feMerge = glowFilter.append('feMerge')
  feMerge.append('feMergeNode').attr('in', 'blur')
  feMerge.append('feMergeNode').attr('in', 'SourceGraphic')

  // Strong glow for projects
  const strongGlow = defs.append('filter')
    .attr('id', 'glow-strong')
    .attr('x', '-100%').attr('y', '-100%')
    .attr('width', '300%').attr('height', '300%')
  strongGlow.append('feGaussianBlur')
    .attr('in', 'SourceGraphic')
    .attr('stdDeviation', '6')
    .attr('result', 'blur')
  const feMerge2 = strongGlow.append('feMerge')
  feMerge2.append('feMergeNode').attr('in', 'blur')
  feMerge2.append('feMergeNode').attr('in', 'SourceGraphic')

  // Zoom layer
  const zoomG = svg.append('g').attr('class', 'zoom-layer')

  const zoom = d3.zoom<SVGSVGElement, unknown>()
    .scaleExtent([0.25, 4])
    .on('zoom', (event: d3.D3ZoomEvent<SVGSVGElement, unknown>) => {
      zoomG.attr('transform', event.transform.toString())
    })

  svg.call(zoom)

  // ── Force simulation ───────────────────────────────────────────────────────
  const simulation = d3.forceSimulation<GraphNode>(nodes)
    .force('link', d3.forceLink<GraphNode, GraphLink>(links)
      .id(d => d.id)
      .distance(d => {
        const src = d.source as GraphNode
        const tgt = d.target as GraphNode
        if (src.type === 'project' || tgt.type === 'project') return 110
        return 70
      })
      .strength(0.4)
    )
    .force('charge', d3.forceManyBody<GraphNode>()
  .strength(d => {
    const r = nodeRadius(d)
    if (d.type !== 'skill') {
      // Gravity well: attraction proportional to area (mass = r²)
      // r=22 → strength ≈ +170, pulls surrounding skill nodes inward
      return r * r * 0.35
    }
    const deg = d.degree ?? 1
    if (deg > 8) {
      // High-degree skills (Python, NumPy etc.) have mild self-attraction
      return r * r * 0.08
    }
    // Peripheral skills repel each other lightly so they don't stack
    return -(15 + deg * 6)
  })
  .distanceMin(18)    // prevents near-singularity forces
  .distanceMax(380)   // gravity doesn't reach across the whole canvas
  .theta(0.8)         // slightly more accurate than default 0.9
)
    .force('center', d3.forceCenter(W / 2, H / 2).strength(0.08))
    .force('collide', d3.forceCollide<GraphNode>()
      .radius(d => nodeRadius(d) + 18)
      .strength(0.8)
    )
    .alphaDecay(0.025)

  // ── Links ──────────────────────────────────────────────────────────────────
  const linkG = zoomG.append('g').attr('class', 'links')

  const linkEl = linkG.selectAll<SVGLineElement, GraphLink>('line')
    .data(links)
    .join('line')
    .attr('stroke', '#30363d')
    .attr('stroke-width', 1)
    .attr('stroke-opacity', 0.5)

  // ── Nodes ──────────────────────────────────────────────────────────────────
  const nodeG = zoomG.append('g').attr('class', 'nodes')

  const nodeEl = nodeG.selectAll<SVGGElement, GraphNode>('g')
    .data(nodes)
    .join('g')
    .attr('class', 'node')
    .style('cursor', 'pointer')

  // Circle
    nodeEl.append('circle')
      .attr('r', d => nodeRadius(d))
      .attr('fill', d => CATEGORY_COLOR[d.category])
      .attr('fill-opacity', d => d.type === 'project' ? 0.18 : 0.12)
      .attr('stroke', d => CATEGORY_COLOR[d.category])
      .attr('stroke-width', d => {
      if (d.category === 'work') return 2.5
      if (d.category === 'academic') return 2
      return d.type === 'project' ? 2 : 1.2})
      .attr('stroke-dasharray', d => d.category === 'academic' ? '5 3' : 'none')
    .attr('filter', d => d.type === 'project' ? 'url(#glow-strong)' : 'url(#eg)')
  // Label — split on newline for projects
  nodeEl.each(function(d) {
    const el = d3.select(this)
    const lines = d.label.split('\n')
    const yOffset = nodeRadius(d) + 13
    if (lines.length === 1) {
      el.append('text')
        .text(d.label)
        .attr('text-anchor', 'middle')
        .attr('dy', yOffset)
        .attr('fill', d.type === 'project' ? CATEGORY_COLOR[d.category] : '#8b949e')
        .attr('font-family', 'IBM Plex Mono, monospace')
        .attr('font-size', d.type === 'project' ? '11px' : '9px')
        .attr('font-weight', d.type === 'project' ? '600' : '400')
        .attr('pointer-events', 'none')
    } else {
      lines.forEach((line, i) => {
        el.append('text')
          .text(line)
          .attr('text-anchor', 'middle')
          .attr('dy', yOffset + i * 13)
          .attr('fill', CATEGORY_COLOR[d.category])
          .attr('font-family', 'IBM Plex Mono, monospace')
          .attr('font-size', '10px')
          .attr('font-weight', '600')
          .attr('pointer-events', 'none')
      })
    }
  })

  // ── Drag ──────────────────────────────────────────────────────────────────
  const drag = d3.drag<SVGGElement, GraphNode>()
    .on('start', (event, d) => {
      if (!event.active) simulation.alphaTarget(0.25).restart()
      d.fx = d.x
      d.fy = d.y
    })
    .on('drag', (event, d) => {
      d.fx = event.x
      d.fy = event.y
    })
    .on('end', (event, d) => {
      if (!event.active) simulation.alphaTarget(0)
      d.fx = null
      d.fy = null
    })

  nodeEl.call(drag)

  // ── Hover highlighting ─────────────────────────────────────────────────────
  const linkedSet = new Set<string>()

  function buildLinkedSet(nodeId: string): void {
    linkedSet.clear()
    linkedSet.add(nodeId)
    links.forEach(l => {
      const s = (l.source as GraphNode).id
      const t = (l.target as GraphNode).id
      if (s === nodeId) linkedSet.add(t)
      if (t === nodeId) linkedSet.add(s)
    })
  }

  nodeEl
    .on('mouseenter', function(_event, d) {
      buildLinkedSet(d.id)

      nodeEl.select('circle')
        .attr('fill-opacity', (n: GraphNode) =>
          linkedSet.has(n.id) ? (n.type === 'project' ? 0.35 : 0.3) : 0.04
        )
        .attr('stroke-opacity', (n: GraphNode) => linkedSet.has(n.id) ? 1 : 0.2)

      nodeEl.selectAll<SVGTextElement, GraphNode>('text')
        .attr('fill-opacity', function() {
          const parentData = d3.select((this as SVGTextElement).parentElement!).datum() as GraphNode
          return linkedSet.has(parentData.id) ? 1 : 0.15
        })

      linkEl
        .attr('stroke-opacity', (l: GraphLink) => {
          const s = (l.source as GraphNode).id
          const t = (l.target as GraphNode).id
          return (s === d.id || t === d.id) ? 0.9 : 0.05
        })
        .attr('stroke', (l: GraphLink) => {
          const s = (l.source as GraphNode).id
          const t = (l.target as GraphNode).id
          if (s === d.id || t === d.id) {
            const other = s === d.id ? t : s
            const otherNode = nodes.find(n => n.id === other)
            return otherNode ? CATEGORY_COLOR[otherNode.category] : '#30363d'
          }
          return '#30363d'
        })
        .attr('stroke-width', (l: GraphLink) => {
          const s = (l.source as GraphNode).id
          const t = (l.target as GraphNode).id
          return (s === d.id || t === d.id) ? 1.5 : 0.6
        })

      // Show tooltip
      const tooltipEl = document.getElementById('graph-tooltip')
      if (tooltipEl) {
        const connected = links
          .filter(l => {
            const s = (l.source as GraphNode).id
            const t = (l.target as GraphNode).id
            return s === d.id || t === d.id
          })
          .map(l => {
            const s = (l.source as GraphNode).id
            const t = (l.target as GraphNode).id
            const otherId = s === d.id ? t : s
            return nodes.find(n => n.id === otherId)?.label.replace('\n', ' ') ?? ''
          })

        tooltipEl.innerHTML = `
          <strong>${d.label.replace('\n', ' ')}</strong>
          <span>${d.type === 'project' ? 'Project' : CATEGORY_LABEL[d.category]}</span>
          <span>${connected.length} connection${connected.length !== 1 ? 's' : ''}</span>
        `
        tooltipEl.style.opacity = '1'
      }
    })
    .on('mouseleave', function() {
      linkedSet.clear()

      nodeEl.select('circle')
        .attr('fill-opacity', (n: GraphNode) => n.type === 'project' ? 0.2 : 0.15)
        .attr('stroke-opacity', 1)

      nodeEl.selectAll('text').attr('fill-opacity', 1)

      linkEl
        .attr('stroke', '#30363d')
        .attr('stroke-opacity', 0.5)
        .attr('stroke-width', 1)

      const tooltipEl = document.getElementById('graph-tooltip')
      if (tooltipEl) tooltipEl.style.opacity = '0'
    })

  // ── Tick ──────────────────────────────────────────────────────────────────
  simulation.on('tick', () => {
    linkEl
      .attr('x1', d => (d.source as GraphNode).x ?? 0)
      .attr('y1', d => (d.source as GraphNode).y ?? 0)
      .attr('x2', d => (d.target as GraphNode).x ?? 0)
      .attr('y2', d => (d.target as GraphNode).y ?? 0)

    nodeEl.attr('transform', d => `translate(${d.x ?? 0},${d.y ?? 0})`)
  })

  // ── Zoom controls ─────────────────────────────────────────────────────────
  document.getElementById('zoom-in')?.addEventListener('click', () => {
    svg.transition().duration(300).call(zoom.scaleBy, 1.4)
  })
  document.getElementById('zoom-out')?.addEventListener('click', () => {
    svg.transition().duration(300).call(zoom.scaleBy, 0.7)
  })
  document.getElementById('zoom-reset')?.addEventListener('click', () => {
    svg.transition().duration(400).call(zoom.transform, d3.zoomIdentity)
  })

  // ── Filter buttons ────────────────────────────────────────────────────────
  let activeCategory: NodeCategory | null = null

  document.querySelectorAll<HTMLButtonElement>('[data-filter]').forEach(btn => {
    btn.addEventListener('click', () => {
      const cat = btn.dataset.filter as NodeCategory

      if (activeCategory === cat) {
        activeCategory = null
        document.querySelectorAll('[data-filter]').forEach(b => b.classList.remove('active'))
        nodeEl.select('circle')
          .attr('fill-opacity', (n: GraphNode) => n.type === 'project' ? 0.2 : 0.15)
          .attr('stroke-opacity', 1)
        nodeEl.selectAll('text').attr('fill-opacity', 1)
        linkEl.attr('stroke-opacity', 0.5)
      } else {
        activeCategory = cat
        document.querySelectorAll('[data-filter]').forEach(b => b.classList.remove('active'))
        btn.classList.add('active')

        nodeEl.select('circle')
          .attr('fill-opacity', (n: GraphNode) =>
            n.category === cat || n.type === 'project' ? (n.type === 'project' ? 0.3 : 0.35) : 0.04
          )
          .attr('stroke-opacity', (n: GraphNode) =>
            n.category === cat || n.type === 'project' ? 1 : 0.15
          )

        nodeEl.selectAll<SVGTextElement, GraphNode>('text')
          .attr('fill-opacity', function() {
            const parentData = d3.select((this as SVGTextElement).parentElement!).datum() as GraphNode
            return parentData.category === cat || parentData.type === 'project' ? 1 : 0.1
          })

        linkEl.attr('stroke-opacity', (l: GraphLink) => {
          const s = l.source as GraphNode
          const t = l.target as GraphNode
          return s.category === cat || t.category === cat ? 0.8 : 0.05
        })
      }
    })
  })

  // ── Resize ────────────────────────────────────────────────────────────────
  const resizeObserver = new ResizeObserver(() => {
    const nw = container.clientWidth
    const nh = container.clientHeight
    svg.attr('viewBox', `0 0 ${nw} ${nh}`)
    simulation.force('center', d3.forceCenter(nw / 2, nh / 2).strength(0.08))
    simulation.alpha(0.15).restart()
  })

  resizeObserver.observe(container)
}
