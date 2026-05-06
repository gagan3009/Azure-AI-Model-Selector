import { useState, useEffect } from 'react'
import { getModels } from '../services/api'

function ModelCatalog({ onCompare, compareModels }) {
  const [models, setModels] = useState([])
  const [searchTerm, setSearchTerm] = useState('')
  const [categoryFilter, setCategoryFilter] = useState('')
  const [providerFilter, setProviderFilter] = useState('')
  const [loading, setLoading] = useState(true)
  const [expandedModel, setExpandedModel] = useState(null)

  useEffect(() => {
    setLoading(true)
    getModels({ category: categoryFilter || undefined, provider: providerFilter || undefined })
      .then(data => {
        setModels(data.models || [])
        setLoading(false)
      })
      .catch(() => setLoading(false))
  }, [categoryFilter, providerFilter])

  const filtered = models.filter(m =>
    m.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    m.provider.toLowerCase().includes(searchTerm.toLowerCase()) ||
    m.best_for.some(bf => bf.toLowerCase().includes(searchTerm.toLowerCase()))
  )

  const isInCompare = (modelId) => compareModels.some(m => m.model_id === modelId)

  const categories = [...new Set(models.map(m => m.category))].sort()
  const providers = [...new Set(models.map(m => m.provider))].sort()

  if (loading) {
    return (
      <div className="loading">
        <div className="spinner"></div>
        <p>Loading model catalog...</p>
      </div>
    )
  }

  return (
    <div>
      <div className="catalog-search">
        <input
          type="text"
          placeholder="Search by model name, provider, or use case..."
          value={searchTerm}
          onChange={e => setSearchTerm(e.target.value)}
        />
        <select value={categoryFilter} onChange={e => setCategoryFilter(e.target.value)}>
          <option value="">All Categories</option>
          {categories.map(c => (
            <option key={c} value={c}>{c.charAt(0).toUpperCase() + c.slice(1)}</option>
          ))}
        </select>
        <select value={providerFilter} onChange={e => setProviderFilter(e.target.value)}>
          <option value="">All Providers</option>
          {providers.map(p => (
            <option key={p} value={p}>{p}</option>
          ))}
        </select>
      </div>

      <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', marginBottom: 16 }}>
        Showing {filtered.length} of {models.length} models
      </p>

      <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
        <table className="comparison-table">
          <thead>
            <tr>
              <th style={{width: 40}}></th>
              <th>Model</th>
              <th>Provider</th>
              <th>Category</th>
              <th>Context</th>
              <th>Pricing</th>
              <th>Latency</th>
              <th>Regions</th>
              <th style={{width: 40}}></th>
            </tr>
          </thead>
          <tbody>
            {filtered.map(model => (
              <>
                <tr key={model.id} style={{ cursor: 'pointer' }} onClick={() => setExpandedModel(expandedModel === model.id ? null : model.id)}>
                  <td>
                    <button
                      className="btn btn-ghost btn-sm"
                      onClick={(e) => {
                        e.stopPropagation()
                        onCompare({
                          model_id: model.id,
                          name: model.name,
                          provider: model.provider,
                          category: model.category,
                          pricing_tier: model.pricing_tier,
                          context_window: model.context_window,
                          capabilities: model.capabilities,
                          best_for: model.best_for,
                          supported_regions: model.supported_regions,
                          estimated_cost_input: model.estimated_cost_input,
                          estimated_cost_output: model.estimated_cost_output,
                          latency_tier: model.latency_tier,
                          throughput_tier: model.throughput_tier,
                          strengths: model.strengths,
                        })
                      }}
                      disabled={isInCompare(model.id) || compareModels.length >= 4}
                      style={{ fontSize: '0.8rem', padding: '4px 8px' }}
                    >
                      {isInCompare(model.id) ? '✓' : '+'}
                    </button>
                  </td>
                  <td style={{ fontWeight: 600 }}>{model.name}</td>
                  <td style={{ fontSize: '0.75rem' }}>{model.provider}</td>
                  <td><span className="tag">{model.category}</span></td>
                  <td>{model.context_window > 0 ? `${(model.context_window / 1000).toFixed(0)}K` : '—'}</td>
                  <td><span className={`tag pricing-${model.pricing_tier}`}>{model.pricing_tier}</span></td>
                  <td><span className="tag">{model.latency_tier}</span></td>
                  <td>{model.supported_regions.length}</td>
                  <td style={{ fontSize: '0.8rem', color: 'var(--text-tertiary)' }}>
                    {expandedModel === model.id ? '▲' : '▼'}
                  </td>
                </tr>
                {expandedModel === model.id && (
                  <tr key={`${model.id}-detail`}>
                    <td colSpan={9} style={{ background: 'var(--bg-subtle)', padding: '16px 24px' }}>
                      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 16 }}>
                        <div>
                          <div className="detail-item">
                            <span className="detail-label">Strengths</span>
                            <span className="detail-value" style={{ fontSize: '0.78rem', fontWeight: 400 }}>{model.strengths}</span>
                          </div>
                        </div>
                        <div>
                          <div className="detail-item">
                            <span className="detail-label">Capabilities</span>
                            <span className="detail-value" style={{ fontSize: '0.78rem', fontWeight: 400 }}>{model.capabilities.join(', ')}</span>
                          </div>
                          <div className="detail-item" style={{ marginTop: 8 }}>
                            <span className="detail-label">Best For</span>
                            <span className="detail-value" style={{ fontSize: '0.78rem', fontWeight: 400 }}>{model.best_for.join(', ')}</span>
                          </div>
                        </div>
                        <div>
                          <div className="detail-item">
                            <span className="detail-label">Input Cost</span>
                            <span className="detail-value">${model.estimated_cost_input}/1M tokens</span>
                          </div>
                          <div className="detail-item" style={{ marginTop: 8 }}>
                            <span className="detail-label">Output Cost</span>
                            <span className="detail-value">{model.estimated_cost_output > 0 ? `$${model.estimated_cost_output}/1M tokens` : 'N/A'}</span>
                          </div>
                        </div>
                      </div>
                    </td>
                  </tr>
                )}
              </>
            ))}
          </tbody>
        </table>
        {filtered.length === 0 && (
          <p style={{ textAlign: 'center', padding: 40, color: 'var(--text-secondary)' }}>
            No models match your search criteria.
          </p>
        )}
      </div>
    </div>
  )
}

export default ModelCatalog
