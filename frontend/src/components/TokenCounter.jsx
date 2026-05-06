import { useState, useEffect, useMemo } from 'react'
import { getModels } from '../services/api'

// Approximate tokenizer (GPT-style: ~4 chars per token, adjust for whitespace/punctuation)
function estimateTokens(text) {
  if (!text) return 0
  // Split on whitespace and punctuation boundaries
  const words = text.split(/\s+/).filter(Boolean)
  let tokens = 0
  for (const word of words) {
    if (word.length <= 3) tokens += 1
    else if (word.length <= 8) tokens += Math.ceil(word.length / 4)
    else tokens += Math.ceil(word.length / 3.5)
  }
  return Math.max(tokens, Math.ceil(text.length / 4))
}

function TokenCounter() {
  const [text, setText] = useState('')
  const [models, setModels] = useState([])
  const [selectedModels, setSelectedModels] = useState([])

  useEffect(() => {
    getModels().then(data => {
      const chatModels = (data.models || []).filter(m => m.category === 'chat' || m.category === 'code')
      setModels(chatModels)
      setSelectedModels(chatModels.slice(0, 5).map(m => m.id))
    }).catch(console.error)
  }, [])

  const tokenCount = useMemo(() => estimateTokens(text), [text])
  const charCount = text.length
  const wordCount = text.split(/\s+/).filter(Boolean).length
  const lineCount = text.split('\n').length

  const costEstimates = useMemo(() => {
    return models
      .filter(m => selectedModels.includes(m.id))
      .map(m => ({
        id: m.id,
        name: m.name,
        inputCost: (tokenCount / 1_000_000) * m.estimated_cost_input,
        outputCost: (tokenCount / 1_000_000) * m.estimated_cost_output,
        totalCost: (tokenCount / 1_000_000) * (m.estimated_cost_input + m.estimated_cost_output),
        contextFit: m.context_window > 0 ? (tokenCount / m.context_window * 100).toFixed(1) : null,
        contextWindow: m.context_window,
      }))
      .sort((a, b) => a.totalCost - b.totalCost)
  }, [tokenCount, models, selectedModels])

  return (
    <div className="token-counter">
      <div className="token-input-section">
        <h2 className="card-title">Prompt Analyzer</h2>
        <textarea
          value={text}
          onChange={e => setText(e.target.value)}
          placeholder="Paste your prompt or sample text here to analyze token count and estimate per-call costs..."
        />
        <div style={{ marginTop: 12, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <span style={{ fontSize: '0.7rem', color: 'var(--text-tertiary)' }}>
            Estimation uses GPT-4 tokenizer approximation (~4 chars/token)
          </span>
          <button
            className="btn btn-ghost btn-sm"
            onClick={() => setText('')}
            disabled={!text}
          >
            Clear
          </button>
        </div>

        <div style={{ marginTop: 20 }}>
          <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 600, marginBottom: 8, color: 'var(--text)' }}>
            Models to Price Against
          </label>
          <div className="multi-select" style={{ maxHeight: 140, overflowY: 'auto' }}>
            {models.map(m => (
              <span
                key={m.id}
                className={`chip ${selectedModels.includes(m.id) ? 'selected' : ''}`}
                onClick={() => {
                  setSelectedModels(prev =>
                    prev.includes(m.id) ? prev.filter(id => id !== m.id) : [...prev, m.id]
                  )
                }}
              >
                {m.name}
              </span>
            ))}
          </div>
        </div>
      </div>

      <div className="token-result-section">
        <h2 className="card-title">Analysis Results</h2>

        <div className="token-stats">
          <div className="token-stat-card">
            <div className="stat-value">{tokenCount.toLocaleString()}</div>
            <div className="stat-name">Tokens (est.)</div>
          </div>
          <div className="token-stat-card">
            <div className="stat-value">{charCount.toLocaleString()}</div>
            <div className="stat-name">Characters</div>
          </div>
          <div className="token-stat-card">
            <div className="stat-value">{wordCount.toLocaleString()}</div>
            <div className="stat-name">Words</div>
          </div>
          <div className="token-stat-card">
            <div className="stat-value">{lineCount}</div>
            <div className="stat-name">Lines</div>
          </div>
        </div>

        {tokenCount > 0 && (
          <>
            <h3 style={{ fontSize: '0.85rem', fontWeight: 700, marginBottom: 12 }}>Cost Per Call (Input + Output)</h3>
            <div className="cost-per-call-grid">
              {costEstimates.map(est => (
                <div key={est.id} className="cost-per-call-row">
                  <div>
                    <div className="model-name">{est.name}</div>
                    <div style={{ fontSize: '0.65rem', color: 'var(--text-tertiary)' }}>
                      {est.contextFit !== null
                        ? `${est.contextFit}% of ${(est.contextWindow / 1000).toFixed(0)}K context used`
                        : 'No context limit'}
                    </div>
                  </div>
                  <div style={{ textAlign: 'right' }}>
                    <div className="cost-value">
                      ${est.totalCost < 0.001 ? est.totalCost.toExponential(2) : est.totalCost.toFixed(4)}
                    </div>
                    <div style={{ fontSize: '0.6rem', color: 'var(--text-tertiary)' }}>
                      ≈ ${(est.totalCost * 1000).toFixed(2)} per 1K calls
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {costEstimates.some(e => parseFloat(e.contextFit) > 100) && (
              <div style={{ marginTop: 12, padding: '10px 14px', background: 'var(--danger-light)', borderRadius: 'var(--radius-sm)', fontSize: '0.75rem', color: 'var(--danger)' }}>
                ⚠ Some models cannot fit this prompt — context window exceeded.
              </div>
            )}
          </>
        )}

        {tokenCount === 0 && (
          <div style={{ textAlign: 'center', padding: 40, color: 'var(--text-secondary)' }}>
            <p>Paste text on the left to see token analysis and per-call cost estimates.</p>
          </div>
        )}
      </div>
    </div>
  )
}

export default TokenCounter
