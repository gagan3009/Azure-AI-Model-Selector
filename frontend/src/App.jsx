import { useState, useEffect } from 'react'
import SelectionForm from './components/SelectionForm'
import ModelResults from './components/ModelResults'
import ModelCatalog from './components/ModelCatalog'
import ModelComparison from './components/ModelComparison'
import CostCalculator from './components/CostCalculator'
import TokenCounter from './components/TokenCounter'
import CodeSnippetGenerator from './components/CodeSnippetGenerator'
import { getAzureStatus, getModels } from './services/api'

function App() {
  const [activeTab, setActiveTab] = useState('recommend')
  const [recommendations, setRecommendations] = useState(null)
  const [compareModels, setCompareModels] = useState([])
  const [azureConnected, setAzureConnected] = useState(false)
  const [loading, setLoading] = useState(false)
  const [stats, setStats] = useState({ total: 0, providers: 0, categories: 0 })
  const [darkMode, setDarkMode] = useState(() => localStorage.getItem('theme') === 'dark')

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', darkMode ? 'dark' : 'light')
    localStorage.setItem('theme', darkMode ? 'dark' : 'light')
  }, [darkMode])

  useEffect(() => {
    getAzureStatus().then(data => setAzureConnected(data.connected)).catch(() => {})
    getModels().then(data => {
      const models = data.models || []
      setStats({
        total: models.length,
        providers: new Set(models.map(m => m.provider)).size,
        categories: new Set(models.map(m => m.category)).size,
      })
    }).catch(() => {})
  }, [])

  const handleAddToCompare = (model) => {
    if (compareModels.length < 4 && !compareModels.find(m => m.model_id === model.model_id)) {
      setCompareModels([...compareModels, model])
    }
  }

  const handleRemoveFromCompare = (modelId) => {
    setCompareModels(compareModels.filter(m => m.model_id !== modelId))
  }

  return (
    <div className="app">
      <header className="header">
        <div className="header-left">
          <div className="header-logo">
            <svg width="32" height="32" viewBox="0 0 32 32" fill="none">
              <rect width="32" height="32" rx="8" fill="rgba(255,255,255,0.15)"/>
              <path d="M8 16L16 8L24 16L16 24L8 16Z" fill="white" opacity="0.9"/>
              <path d="M12 16L16 12L20 16L16 20L12 16Z" fill="rgba(0,120,212,0.8)"/>
            </svg>
          </div>
          <div>
            <h1>Azure AI Model Advisor</h1>
            <span className="subtitle">Intelligent model selection for enterprise workloads</span>
          </div>
        </div>
        <div className="header-right">
          <div className="header-stats">
            <div className="stat-pill">
              <span className="stat-number">{stats.total}</span>
              <span className="stat-label">Models</span>
            </div>
            <div className="stat-pill">
              <span className="stat-number">{stats.providers}</span>
              <span className="stat-label">Providers</span>
            </div>
            <div className="stat-pill">
              <span className="stat-number">{stats.categories}</span>
              <span className="stat-label">Categories</span>
            </div>
          </div>
          <button className="theme-toggle" onClick={() => setDarkMode(!darkMode)}>
            {darkMode ? '☀️' : '🌙'}
            {darkMode ? 'Light' : 'Dark'}
          </button>
          <div className="azure-status">
            <span className={`status-dot ${azureConnected ? 'connected' : 'disconnected'}`}></span>
            <span>{azureConnected ? 'Azure Live' : 'Catalog Mode'}</span>
          </div>
        </div>
      </header>

      <div className="main-content">
        <aside className="sidebar">
          <SelectionForm
            onResults={setRecommendations}
            onLoading={setLoading}
            setActiveTab={setActiveTab}
          />
        </aside>

        <main className="results-area">
          <nav className="tabs">
            <button className={`tab ${activeTab === 'recommend' ? 'active' : ''}`} onClick={() => setActiveTab('recommend')}>
              <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor"><path d="M8 1l2 4 4.5.7-3.2 3.1.8 4.5L8 11.3 3.9 13.3l.8-4.5L1.5 5.7 6 5z"/></svg>
              Recommendations
            </button>
            <button className={`tab ${activeTab === 'catalog' ? 'active' : ''}`} onClick={() => setActiveTab('catalog')}>
              <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor"><path d="M2 2h5v5H2zM9 2h5v5H9zM2 9h5v5H2zM9 9h5v5H9z"/></svg>
              Model Catalog
            </button>
            <button className={`tab ${activeTab === 'compare' ? 'active' : ''}`} onClick={() => setActiveTab('compare')}>
              <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor"><path d="M1 3h6v2H1zM1 7h10v2H1zM1 11h14v2H1zM9 3h6v2H9z"/></svg>
              Compare {compareModels.length > 0 && <span className="tab-badge">{compareModels.length}</span>}
            </button>
            <button className={`tab ${activeTab === 'cost' ? 'active' : ''}`} onClick={() => setActiveTab('cost')}>
              <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor"><path d="M8 1a7 7 0 100 14A7 7 0 008 1zm.5 3v1.5H10v2H8.5V9H10v2H8.5V12.5h-1V11H6V9h1.5V7.5H6v-2h1.5V4h1z"/></svg>
              Cost Calculator
            </button>
            <button className={`tab ${activeTab === 'tokens' ? 'active' : ''}`} onClick={() => setActiveTab('tokens')}>
              <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor"><path d="M2 3h12v1H2zm0 3h8v1H2zm0 3h10v1H2zm0 3h6v1H2z"/></svg>
              Token Counter
            </button>
            <button className={`tab ${activeTab === 'code' ? 'active' : ''}`} onClick={() => setActiveTab('code')}>
              <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor"><path d="M5.854 4.146a.5.5 0 010 .708L3.207 7.5l2.647 2.646a.5.5 0 01-.708.708l-3-3a.5.5 0 010-.708l3-3a.5.5 0 01.708 0zm4.292 0a.5.5 0 01.708 0l3 3a.5.5 0 010 .708l-3 3a.5.5 0 01-.708-.708L12.793 7.5l-2.647-2.646a.5.5 0 010-.708z"/></svg>
              Code Snippets
            </button>
          </nav>

          {activeTab === 'recommend' && (
            <ModelResults
              recommendations={recommendations}
              loading={loading}
              onCompare={handleAddToCompare}
              compareModels={compareModels}
            />
          )}
          {activeTab === 'catalog' && (
            <ModelCatalog onCompare={handleAddToCompare} compareModels={compareModels} />
          )}
          {activeTab === 'compare' && (
            <ModelComparison
              models={compareModels}
              onRemove={handleRemoveFromCompare}
            />
          )}
          {activeTab === 'cost' && (
            <CostCalculator />
          )}
          {activeTab === 'tokens' && (
            <TokenCounter />
          )}
          {activeTab === 'code' && (
            <CodeSnippetGenerator />
          )}
        </main>
      </div>

      {compareModels.length > 0 && activeTab !== 'compare' && (
        <div className="comparison-bar">
          <div className="comparison-bar-models">
            {compareModels.map(m => (
              <span key={m.model_id} className="comparison-bar-chip">
                {m.name}
                <button onClick={() => handleRemoveFromCompare(m.model_id)}>×</button>
              </span>
            ))}
          </div>
          <div className="comparison-bar-actions">
            <button className="btn btn-ghost" onClick={() => setCompareModels([])}>Clear All</button>
            <button className="btn btn-primary" style={{width: 'auto'}} onClick={() => setActiveTab('compare')}>
              Compare Models →
            </button>
          </div>
        </div>
      )}
    </div>
  )
}

export default App
