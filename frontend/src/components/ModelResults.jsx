import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, RadarChart, Radar, PolarGrid, PolarAngleAxis, PolarRadiusAxis } from 'recharts'

function ModelResults({ recommendations, loading, onCompare, compareModels }) {
  if (loading) {
    return (
      <div className="loading">
        <div className="spinner"></div>
        <p>Analyzing {24} models across all providers...</p>
      </div>
    )
  }

  if (!recommendations) {
    return (
      <div className="empty-state">
        <div className="empty-state-icon">
          <svg width="28" height="28" viewBox="0 0 16 16" fill="#0078d4"><path d="M8 1l2 4 4.5.7-3.2 3.1.8 4.5L8 11.3 3.9 13.3l.8-4.5L1.5 5.7 6 5z"/></svg>
        </div>
        <h2>Find Your Ideal AI Model</h2>
        <p>Select a scenario or configure criteria on the left, then click "Find Best Model" to receive ranked recommendations powered by multi-criteria analysis.</p>
      </div>
    )
  }

  const { recommendations: models, total_models_evaluated } = recommendations

  if (models.length === 0) {
    return (
      <div className="empty-state">
        <div className="empty-state-icon">
          <svg width="28" height="28" viewBox="0 0 16 16" fill="#d13438"><path d="M8 1a7 7 0 100 14A7 7 0 008 1zm3.5 9.5l-1 1L8 9l-2.5 2.5-1-1L7 8 4.5 5.5l1-1L8 7l2.5-2.5 1 1L9 8z"/></svg>
        </div>
        <h2>No Matching Models</h2>
        <p>Try broadening your criteria — increase budget, relax context window requirements, or remove region constraints.</p>
      </div>
    )
  }

  const getScoreClass = (score) => {
    if (score >= 70) return 'high'
    if (score >= 40) return 'medium'
    return 'low'
  }

  const isInCompare = (modelId) => compareModels.some(m => m.model_id === modelId)

  // Chart data for top models
  const chartData = models.slice(0, 8).map(m => ({
    name: m.name.length > 15 ? m.name.slice(0, 15) + '...' : m.name,
    score: m.match_score,
    cost: m.estimated_cost_input,
  }))

  // Radar chart for top model
  const topModel = models[0]
  const radarData = topModel ? [
    { metric: 'Match', value: topModel.match_score },
    { metric: 'Context', value: Math.min((topModel.context_window / 128000) * 100, 100) },
    { metric: 'Regions', value: (topModel.supported_regions.length / 19) * 100 },
    { metric: 'Capabilities', value: (topModel.capabilities.length / 8) * 100 },
    { metric: 'Cost Efficiency', value: topModel.pricing_tier === 'low' ? 95 : topModel.pricing_tier === 'medium' ? 70 : topModel.pricing_tier === 'high' ? 40 : 20 },
  ] : []

  const handleExportCSV = () => {
    const headers = 'Rank,Model,Provider,Score,Pricing,Context Window,Capabilities\n'
    const rows = models.map((m, i) =>
      `${i+1},"${m.name}","${m.provider}",${m.match_score}%,${m.pricing_tier},${m.context_window},"${m.capabilities.join('; ')}"`
    ).join('\n')
    const blob = new Blob([headers + rows], { type: 'text/csv' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = 'model-recommendations.csv'
    a.click()
    URL.revokeObjectURL(url)
  }

  return (
    <div>
      {/* Summary Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
        <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
          <strong>{models.length}</strong> recommendations from <strong>{total_models_evaluated}</strong> models evaluated
        </p>
        <div className="export-section">
          <button className="btn btn-ghost btn-sm" onClick={handleExportCSV}>
            Export CSV
          </button>
        </div>
      </div>

      {/* Score Chart */}
      <div className="chart-container">
        <div className="chart-title">Model Match Scores</div>
        <ResponsiveContainer width="100%" height={220}>
          <BarChart data={chartData} margin={{ top: 5, right: 20, left: 0, bottom: 5 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
            <XAxis dataKey="name" tick={{ fontSize: 11 }} />
            <YAxis domain={[0, 100]} tick={{ fontSize: 11 }} />
            <Tooltip
              contentStyle={{ borderRadius: 8, border: '1px solid #e0e0e0', boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }}
              formatter={(value) => [`${value}%`, 'Match Score']}
            />
            <Bar dataKey="score" fill="#0078d4" radius={[4, 4, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>

      {/* Top Pick with Radar */}
      {topModel && (
        <div className="model-card top-pick">
          <span className="top-pick-badge">Top Pick</span>
          <div className="model-card-header">
            <div>
              <h3>{topModel.name}</h3>
              <span className="provider">{topModel.provider}</span>
            </div>
            <div style={{ textAlign: 'right' }}>
              <span className={`match-score ${getScoreClass(topModel.match_score)}`}>
                {topModel.match_score}%
              </span>
              <div className="score-bar">
                <div className={`score-bar-fill ${getScoreClass(topModel.match_score)}`} style={{ width: `${topModel.match_score}%` }}></div>
              </div>
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 200px', gap: 20, alignItems: 'start' }}>
            <div>
              <div className="tags">
                <span className={`tag pricing-${topModel.pricing_tier}`}>{topModel.pricing_tier} tier</span>
                {topModel.capabilities.slice(0, 5).map(cap => (
                  <span key={cap} className="tag capability">{cap}</span>
                ))}
              </div>
              {topModel.strengths && <p className="strengths-text">{topModel.strengths}</p>}
              <div className="detail-grid" style={{ marginTop: 14 }}>
                <div className="detail-item">
                  <span className="detail-label">Input Cost</span>
                  <span className="detail-value">${topModel.estimated_cost_input}/1M tokens</span>
                </div>
                <div className="detail-item">
                  <span className="detail-label">Output Cost</span>
                  <span className="detail-value">{topModel.estimated_cost_output > 0 ? `$${topModel.estimated_cost_output}/1M tokens` : 'N/A'}</span>
                </div>
                <div className="detail-item">
                  <span className="detail-label">Context Window</span>
                  <span className="detail-value">{topModel.context_window > 0 ? `${(topModel.context_window/1000).toFixed(0)}K tokens` : 'N/A'}</span>
                </div>
                <div className="detail-item">
                  <span className="detail-label">Availability</span>
                  <span className="detail-value">{topModel.supported_regions.length} regions</span>
                </div>
              </div>
            </div>
            <ResponsiveContainer width="100%" height={180}>
              <RadarChart data={radarData}>
                <PolarGrid stroke="#e0e0e0" />
                <PolarAngleAxis dataKey="metric" tick={{ fontSize: 10 }} />
                <PolarRadiusAxis domain={[0, 100]} tick={false} axisLine={false} />
                <Radar dataKey="value" stroke="#0078d4" fill="#0078d4" fillOpacity={0.2} strokeWidth={2} />
              </RadarChart>
            </ResponsiveContainer>
          </div>

          <div style={{ marginTop: 14, display: 'flex', gap: 8 }}>
            <button
              className="btn btn-secondary btn-sm"
              onClick={() => onCompare(topModel)}
              disabled={isInCompare(topModel.model_id) || compareModels.length >= 4}
            >
              {isInCompare(topModel.model_id) ? '✓ In Compare' : '+ Add to Compare'}
            </button>
          </div>
        </div>
      )}

      {/* Other Results */}
      {models.slice(1).map((model, idx) => (
        <div key={model.model_id} className="model-card">
          <div className="model-card-header">
            <div>
              <h3>{idx + 2}. {model.name}</h3>
              <span className="provider">{model.provider}</span>
            </div>
            <div style={{ textAlign: 'right' }}>
              <span className={`match-score ${getScoreClass(model.match_score)}`}>
                {model.match_score}%
              </span>
              <div className="score-bar">
                <div className={`score-bar-fill ${getScoreClass(model.match_score)}`} style={{ width: `${model.match_score}%` }}></div>
              </div>
            </div>
          </div>

          <div className="tags">
            <span className={`tag pricing-${model.pricing_tier}`}>{model.pricing_tier} tier</span>
            {model.context_window > 0 && <span className="tag">{(model.context_window / 1000).toFixed(0)}K ctx</span>}
            {model.capabilities.slice(0, 4).map(cap => (
              <span key={cap} className="tag capability">{cap}</span>
            ))}
          </div>

          <div className="detail-grid" style={{ marginTop: 12 }}>
            <div className="detail-item">
              <span className="detail-label">Input Cost</span>
              <span className="detail-value">${model.estimated_cost_input}/1M</span>
            </div>
            <div className="detail-item">
              <span className="detail-label">Output Cost</span>
              <span className="detail-value">{model.estimated_cost_output > 0 ? `$${model.estimated_cost_output}/1M` : 'N/A'}</span>
            </div>
            <div className="detail-item">
              <span className="detail-label">Best For</span>
              <span className="detail-value">{model.best_for.slice(0, 2).join(', ')}</span>
            </div>
            <div className="detail-item">
              <span className="detail-label">Regions</span>
              <span className="detail-value">{model.supported_regions.length} available</span>
            </div>
          </div>

          <p className="explanation">{model.explanation}</p>

          <div style={{ marginTop: 12 }}>
            <button
              className="btn btn-secondary btn-sm"
              onClick={() => onCompare(model)}
              disabled={isInCompare(model.model_id) || compareModels.length >= 4}
            >
              {isInCompare(model.model_id) ? '✓ In Compare' : '+ Compare'}
            </button>
          </div>
        </div>
      ))}
    </div>
  )
}

export default ModelResults
