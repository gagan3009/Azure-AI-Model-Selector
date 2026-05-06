import { RadarChart, Radar, PolarGrid, PolarAngleAxis, PolarRadiusAxis, ResponsiveContainer, Legend, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip } from 'recharts'

const COLORS = ['#0078d4', '#107c10', '#d13438', '#6264a7']

function ModelComparison({ models, onRemove }) {
  if (models.length === 0) {
    return (
      <div className="empty-state">
        <div className="empty-state-icon">
          <svg width="28" height="28" viewBox="0 0 16 16" fill="#0078d4"><path d="M1 3h6v2H1zM1 7h10v2H1zM1 11h14v2H1zM9 3h6v2H9z"/></svg>
        </div>
        <h2>Compare Models Side by Side</h2>
        <p>Add up to 4 models from the Recommendations or Catalog tabs to compare capabilities, pricing, and performance visually.</p>
      </div>
    )
  }

  // Radar comparison data
  const radarMetrics = ['Match Score', 'Context Window', 'Cost Efficiency', 'Regions', 'Capabilities']
  const radarData = radarMetrics.map(metric => {
    const point = { metric }
    models.forEach(m => {
      let value = 0
      switch (metric) {
        case 'Match Score': value = m.match_score || 50; break
        case 'Context Window': value = Math.min((m.context_window / 128000) * 100, 100); break
        case 'Cost Efficiency': value = m.pricing_tier === 'low' ? 95 : m.pricing_tier === 'medium' ? 70 : m.pricing_tier === 'high' ? 40 : 20; break
        case 'Regions': value = (m.supported_regions.length / 19) * 100; break
        case 'Capabilities': value = (m.capabilities.length / 8) * 100; break
      }
      point[m.name] = Math.round(value)
    })
    return point
  })

  // Cost comparison
  const costData = models.map(m => ({
    name: m.name.length > 12 ? m.name.slice(0, 12) + '...' : m.name,
    'Input Cost': m.estimated_cost_input,
    'Output Cost': m.estimated_cost_output,
  }))

  const rows = [
    { label: 'Provider', key: 'provider' },
    { label: 'Category', key: 'category' },
    { label: 'Pricing Tier', key: 'pricing_tier', highlight: true },
    { label: 'Input Cost (per 1M tokens)', key: 'estimated_cost_input', format: v => `$${v.toFixed(2)}`, highlight: true, lower_better: true },
    { label: 'Output Cost (per 1M tokens)', key: 'estimated_cost_output', format: v => v > 0 ? `$${v.toFixed(2)}` : 'N/A' },
    { label: 'Context Window', key: 'context_window', format: v => v > 0 ? `${(v / 1000).toFixed(0)}K tokens` : 'N/A' },
    { label: 'Latency', key: 'latency_tier', format: v => v || 'N/A' },
    { label: 'Throughput', key: 'throughput_tier', format: v => v || 'N/A' },
    { label: 'Capabilities', key: 'capabilities', format: v => v.join(', ') },
    { label: 'Best For', key: 'best_for', format: v => v.join(', ') },
    { label: 'Regions Available', key: 'supported_regions', format: v => `${v.length} regions` },
    { label: 'Match Score', key: 'match_score', format: v => v !== undefined ? `${v}%` : 'N/A', highlight: true },
  ]

  // Determine winner for highlighted rows
  const getWinner = (row) => {
    if (!row.highlight || models.length < 2) return null
    const values = models.map(m => {
      const val = m[row.key]
      if (typeof val === 'number') return val
      return null
    })
    if (values.some(v => v === null)) return null
    if (row.lower_better) {
      const min = Math.min(...values)
      return values.indexOf(min)
    }
    const max = Math.max(...values)
    return values.indexOf(max)
  }

  const handleExportCSV = () => {
    const headers = ['Attribute', ...models.map(m => m.name)].join(',') + '\n'
    const dataRows = rows.map(row => {
      const values = models.map(m => {
        const val = row.format ? row.format(m[row.key]) : m[row.key]
        return `"${val}"`
      })
      return [`"${row.label}"`, ...values].join(',')
    }).join('\n')
    const blob = new Blob([headers + dataRows], { type: 'text/csv' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = 'model-comparison.csv'
    a.click()
    URL.revokeObjectURL(url)
  }

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
        <h2 style={{ fontSize: '1.1rem', fontWeight: 700 }}>Comparing {models.length} Models</h2>
        <button className="btn btn-ghost btn-sm" onClick={handleExportCSV}>Export CSV</button>
      </div>

      {/* Radar Chart */}
      <div className="chart-container">
        <div className="chart-title">Multi-Dimensional Comparison</div>
        <ResponsiveContainer width="100%" height={300}>
          <RadarChart data={radarData}>
            <PolarGrid stroke="#e0e0e0" />
            <PolarAngleAxis dataKey="metric" tick={{ fontSize: 12 }} />
            <PolarRadiusAxis domain={[0, 100]} tick={false} axisLine={false} />
            {models.map((m, i) => (
              <Radar key={m.model_id} name={m.name} dataKey={m.name} stroke={COLORS[i]} fill={COLORS[i]} fillOpacity={0.15} strokeWidth={2} />
            ))}
            <Legend wrapperStyle={{ fontSize: 12 }} />
          </RadarChart>
        </ResponsiveContainer>
      </div>

      {/* Cost Comparison Chart */}
      <div className="chart-container">
        <div className="chart-title">Cost Comparison (per 1M tokens)</div>
        <ResponsiveContainer width="100%" height={200}>
          <BarChart data={costData} margin={{ top: 5, right: 20, left: 0, bottom: 5 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
            <XAxis dataKey="name" tick={{ fontSize: 11 }} />
            <YAxis tick={{ fontSize: 11 }} />
            <Tooltip contentStyle={{ borderRadius: 8, fontSize: 12 }} />
            <Bar dataKey="Input Cost" fill="#0078d4" radius={[4, 4, 0, 0]} />
            <Bar dataKey="Output Cost" fill="#6264a7" radius={[4, 4, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>

      {/* Detailed Table */}
      <div className="card">
        <table className="comparison-table">
          <thead>
            <tr>
              <th style={{ minWidth: 160 }}>Attribute</th>
              {models.map((m, i) => (
                <th key={m.model_id}>
                  <span style={{ color: COLORS[i], fontWeight: 700 }}>●</span>{' '}
                  {m.name}
                  <button
                    onClick={() => onRemove(m.model_id)}
                    style={{ marginLeft: 8, cursor: 'pointer', background: 'none', border: 'none', color: 'var(--danger)', fontWeight: 'bold', fontSize: '1.1rem' }}
                    title="Remove from comparison"
                  >
                    ×
                  </button>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map(row => {
              const winner = getWinner(row)
              return (
                <tr key={row.key}>
                  <td style={{ fontWeight: 600, fontSize: '0.78rem' }}>{row.label}</td>
                  {models.map((m, i) => (
                    <td key={m.model_id} className={winner === i ? 'winner' : ''}>
                      {row.format ? row.format(m[row.key]) : m[row.key]}
                    </td>
                  ))}
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
    </div>
  )
}

export default ModelComparison
