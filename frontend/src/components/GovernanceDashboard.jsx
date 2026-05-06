import { useState, useEffect } from 'react'
import {
  adminGetModels, adminCreateModel, adminUpdateModel,
  adminDeleteModel, adminRestoreModel, adminGetAuditLog, adminSeedModels,
} from '../services/api'

function GovernanceDashboard() {
  const [models, setModels] = useState([])
  const [auditLogs, setAuditLogs] = useState([])
  const [loading, setLoading] = useState(true)
  const [activeView, setActiveView] = useState('models') // models | audit | create
  const [editingModel, setEditingModel] = useState(null)
  const [showInactive, setShowInactive] = useState(false)
  const [searchTerm, setSearchTerm] = useState('')
  const [notification, setNotification] = useState(null)
  const [error, setError] = useState(null)

  useEffect(() => {
    loadModels()
  }, [showInactive])

  const notify = (msg, type = 'success') => {
    setNotification({ msg, type })
    setTimeout(() => setNotification(null), 4000)
  }

  const loadModels = async () => {
    setLoading(true)
    setError(null)
    try {
      const data = await adminGetModels({ includeInactive: showInactive })
      setModels(data.models || [])
    } catch (e) {
      setError('Failed to load models. Is the database running?')
    } finally {
      setLoading(false)
    }
  }

  const loadAuditLog = async (modelId) => {
    try {
      const data = await adminGetAuditLog(modelId)
      setAuditLogs(data.logs || [])
    } catch (e) {
      setError('Failed to load audit log')
    }
  }

  const handleDelete = async (modelId, modelName) => {
    if (!confirm(`Deactivate model "${modelName}"? It can be restored later.`)) return
    try {
      await adminDeleteModel(modelId)
      notify(`Model "${modelName}" deactivated`)
      loadModels()
    } catch (e) {
      notify(e.message, 'error')
    }
  }

  const handleRestore = async (modelId, modelName) => {
    try {
      await adminRestoreModel(modelId)
      notify(`Model "${modelName}" restored`)
      loadModels()
    } catch (e) {
      notify(e.message, 'error')
    }
  }

  const handleSeed = async () => {
    if (!confirm('Seed database from models.json? This will add/update all models.')) return
    try {
      const data = await adminSeedModels()
      notify(`Seeded ${data.count} models`)
      loadModels()
    } catch (e) {
      notify(e.message, 'error')
    }
  }

  const filteredModels = models.filter(m =>
    m.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    m.id.toLowerCase().includes(searchTerm.toLowerCase()) ||
    m.provider.toLowerCase().includes(searchTerm.toLowerCase())
  )

  return (
    <div className="governance-dashboard">
      {notification && (
        <div className={`gov-notification ${notification.type}`}>
          {notification.type === 'success' ? '✓' : '✗'} {notification.msg}
        </div>
      )}

      <div className="gov-header">
        <h2>Model Governance</h2>
        <div className="gov-nav">
          <button
            className={`gov-nav-btn ${activeView === 'models' ? 'active' : ''}`}
            onClick={() => setActiveView('models')}
          >
            Models ({models.length})
          </button>
          <button
            className={`gov-nav-btn ${activeView === 'audit' ? 'active' : ''}`}
            onClick={() => { setActiveView('audit'); loadAuditLog(); }}
          >
            Audit Log
          </button>
          <button
            className={`gov-nav-btn ${activeView === 'create' ? 'active' : ''}`}
            onClick={() => { setActiveView('create'); setEditingModel(null); }}
          >
            + Add Model
          </button>
        </div>
      </div>

      {error && <div className="gov-error">{error}</div>}

      {activeView === 'models' && (
        <ModelsListView
          models={filteredModels}
          loading={loading}
          showInactive={showInactive}
          setShowInactive={setShowInactive}
          searchTerm={searchTerm}
          setSearchTerm={setSearchTerm}
          onDelete={handleDelete}
          onRestore={handleRestore}
          onEdit={(m) => { setEditingModel(m); setActiveView('create'); }}
          onViewAudit={(modelId) => { loadAuditLog(modelId); setActiveView('audit'); }}
          onSeed={handleSeed}
        />
      )}

      {activeView === 'audit' && (
        <AuditLogView logs={auditLogs} onBack={() => setActiveView('models')} />
      )}

      {activeView === 'create' && (
        <ModelForm
          model={editingModel}
          onSave={async (data) => {
            try {
              if (editingModel) {
                await adminUpdateModel(editingModel.id, data)
                notify(`Model "${data.name || editingModel.name}" updated`)
              } else {
                await adminCreateModel(data)
                notify(`Model "${data.name}" created`)
              }
              setActiveView('models')
              setEditingModel(null)
              loadModels()
            } catch (e) {
              notify(e.message, 'error')
            }
          }}
          onCancel={() => { setActiveView('models'); setEditingModel(null); }}
        />
      )}
    </div>
  )
}

function ModelsListView({ models, loading, showInactive, setShowInactive, searchTerm, setSearchTerm, onDelete, onRestore, onEdit, onViewAudit, onSeed }) {
  if (loading) {
    return <div className="gov-loading">Loading models...</div>
  }

  return (
    <div className="gov-models-view">
      <div className="gov-toolbar">
        <div className="gov-search">
          <input
            type="text"
            placeholder="Search models..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
        <label className="gov-toggle">
          <input type="checkbox" checked={showInactive} onChange={(e) => setShowInactive(e.target.checked)} />
          Show Inactive
        </label>
        <button className="btn btn-ghost" onClick={onSeed} title="Seed from models.json">
          ⟳ Seed DB
        </button>
      </div>

      <div className="gov-table-wrapper">
        <table className="gov-table">
          <thead>
            <tr>
              <th>Model</th>
              <th>Provider</th>
              <th>Category</th>
              <th>Tier</th>
              <th>Status</th>
              <th>Version</th>
              <th>Updated</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {models.map(model => (
              <tr key={model.id} className={!model.is_active ? 'inactive-row' : ''}>
                <td>
                  <div className="gov-model-name">{model.name}</div>
                  <div className="gov-model-id">{model.id}</div>
                </td>
                <td>{model.provider}</td>
                <td><span className="gov-badge category">{model.category}</span></td>
                <td><span className={`gov-badge tier-${model.pricing_tier}`}>{model.pricing_tier}</span></td>
                <td>
                  <span className={`gov-badge ${model.is_active ? 'status-active' : 'status-inactive'}`}>
                    {model.is_active ? 'Active' : 'Inactive'}
                  </span>
                </td>
                <td><span className="gov-version">v{model.version}</span></td>
                <td className="gov-date">
                  {model.updated_at ? new Date(model.updated_at).toLocaleDateString() : '—'}
                </td>
                <td className="gov-actions">
                  <button className="gov-action-btn edit" onClick={() => onEdit(model)} title="Edit">✎</button>
                  <button className="gov-action-btn audit" onClick={() => onViewAudit(model.id)} title="Audit Log">⧉</button>
                  {model.is_active ? (
                    <button className="gov-action-btn delete" onClick={() => onDelete(model.id, model.name)} title="Deactivate">✗</button>
                  ) : (
                    <button className="gov-action-btn restore" onClick={() => onRestore(model.id, model.name)} title="Restore">↺</button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {models.length === 0 && <div className="gov-empty">No models found</div>}
      </div>
    </div>
  )
}

function AuditLogView({ logs, onBack }) {
  return (
    <div className="gov-audit-view">
      <button className="btn btn-ghost" onClick={onBack}>← Back to Models</button>
      <div className="gov-table-wrapper">
        <table className="gov-table audit-table">
          <thead>
            <tr>
              <th>Time</th>
              <th>Model</th>
              <th>Action</th>
              <th>By</th>
              <th>Changes</th>
            </tr>
          </thead>
          <tbody>
            {logs.map(log => (
              <tr key={log.id}>
                <td className="gov-date">{new Date(log.performed_at).toLocaleString()}</td>
                <td><code>{log.model_id}</code></td>
                <td>
                  <span className={`gov-badge action-${log.action}`}>{log.action}</span>
                </td>
                <td>{log.performed_by}</td>
                <td className="gov-changes">
                  {log.changes ? (
                    <details>
                      <summary>{Object.keys(log.changes).length} field(s)</summary>
                      <pre>{JSON.stringify(log.changes, null, 2)}</pre>
                    </details>
                  ) : '—'}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {logs.length === 0 && <div className="gov-empty">No audit records found</div>}
      </div>
    </div>
  )
}

function ModelForm({ model, onSave, onCancel }) {
  const [form, setForm] = useState({
    id: model?.id || '',
    name: model?.name || '',
    provider: model?.provider || '',
    category: model?.category || 'chat',
    context_window: model?.context_window || 0,
    max_output_tokens: model?.max_output_tokens || 0,
    pricing_tier: model?.pricing_tier || 'medium',
    estimated_cost_input: model?.estimated_cost_input || 0,
    estimated_cost_output: model?.estimated_cost_output || 0,
    latency_tier: model?.latency_tier || 'medium',
    throughput_tier: model?.throughput_tier || 'medium',
    supported_regions: model?.supported_regions?.join(', ') || '',
    capabilities: model?.capabilities?.join(', ') || '',
    strengths: model?.strengths || '',
    best_for: model?.best_for?.join(', ') || '',
  })

  const handleSubmit = (e) => {
    e.preventDefault()
    const data = {
      ...form,
      context_window: parseInt(form.context_window) || 0,
      max_output_tokens: parseInt(form.max_output_tokens) || 0,
      estimated_cost_input: parseFloat(form.estimated_cost_input) || 0,
      estimated_cost_output: parseFloat(form.estimated_cost_output) || 0,
      supported_regions: form.supported_regions.split(',').map(s => s.trim()).filter(Boolean),
      capabilities: form.capabilities.split(',').map(s => s.trim()).filter(Boolean),
      best_for: form.best_for.split(',').map(s => s.trim()).filter(Boolean),
    }
    onSave(data)
  }

  const update = (field, value) => setForm({ ...form, [field]: value })

  return (
    <div className="gov-form-view">
      <h3>{model ? `Edit: ${model.name}` : 'Create New Model'}</h3>
      <form onSubmit={handleSubmit} className="gov-form">
        <div className="gov-form-grid">
          <div className="form-group">
            <label>Model ID *</label>
            <input required value={form.id} onChange={(e) => update('id', e.target.value)} disabled={!!model} placeholder="e.g. gpt-4o" />
          </div>
          <div className="form-group">
            <label>Name *</label>
            <input required value={form.name} onChange={(e) => update('name', e.target.value)} placeholder="e.g. GPT-4o" />
          </div>
          <div className="form-group">
            <label>Provider *</label>
            <input required value={form.provider} onChange={(e) => update('provider', e.target.value)} placeholder="e.g. Azure OpenAI" />
          </div>
          <div className="form-group">
            <label>Category *</label>
            <select value={form.category} onChange={(e) => update('category', e.target.value)}>
              <option value="chat">Chat</option>
              <option value="embedding">Embedding</option>
              <option value="image">Image</option>
              <option value="speech">Speech</option>
              <option value="vision">Vision</option>
              <option value="document">Document</option>
              <option value="translation">Translation</option>
            </select>
          </div>
          <div className="form-group">
            <label>Pricing Tier *</label>
            <select value={form.pricing_tier} onChange={(e) => update('pricing_tier', e.target.value)}>
              <option value="low">Low</option>
              <option value="medium">Medium</option>
              <option value="high">High</option>
              <option value="premium">Premium</option>
            </select>
          </div>
          <div className="form-group">
            <label>Latency Tier</label>
            <select value={form.latency_tier} onChange={(e) => update('latency_tier', e.target.value)}>
              <option value="low">Low</option>
              <option value="medium">Medium</option>
              <option value="high">High</option>
            </select>
          </div>
          <div className="form-group">
            <label>Throughput Tier</label>
            <select value={form.throughput_tier} onChange={(e) => update('throughput_tier', e.target.value)}>
              <option value="low">Low</option>
              <option value="medium">Medium</option>
              <option value="high">High</option>
            </select>
          </div>
          <div className="form-group">
            <label>Context Window</label>
            <input type="number" value={form.context_window} onChange={(e) => update('context_window', e.target.value)} />
          </div>
          <div className="form-group">
            <label>Max Output Tokens</label>
            <input type="number" value={form.max_output_tokens} onChange={(e) => update('max_output_tokens', e.target.value)} />
          </div>
          <div className="form-group">
            <label>Cost/M Input Tokens ($)</label>
            <input type="number" step="0.01" value={form.estimated_cost_input} onChange={(e) => update('estimated_cost_input', e.target.value)} />
          </div>
          <div className="form-group">
            <label>Cost/M Output Tokens ($)</label>
            <input type="number" step="0.01" value={form.estimated_cost_output} onChange={(e) => update('estimated_cost_output', e.target.value)} />
          </div>
        </div>

        <div className="form-group full-width">
          <label>Supported Regions (comma-separated)</label>
          <input value={form.supported_regions} onChange={(e) => update('supported_regions', e.target.value)} placeholder="eastus, westeurope, swedencentral" />
        </div>
        <div className="form-group full-width">
          <label>Capabilities (comma-separated)</label>
          <input value={form.capabilities} onChange={(e) => update('capabilities', e.target.value)} placeholder="chat, completion, function_calling" />
        </div>
        <div className="form-group full-width">
          <label>Strengths</label>
          <textarea value={form.strengths} onChange={(e) => update('strengths', e.target.value)} rows={2} placeholder="Model strengths description" />
        </div>
        <div className="form-group full-width">
          <label>Best For (comma-separated)</label>
          <input value={form.best_for} onChange={(e) => update('best_for', e.target.value)} placeholder="general chat, complex reasoning, code generation" />
        </div>

        <div className="gov-form-actions">
          <button type="button" className="btn btn-ghost" onClick={onCancel}>Cancel</button>
          <button type="submit" className="btn btn-primary">{model ? 'Update Model' : 'Create Model'}</button>
        </div>
      </form>
    </div>
  )
}

export default GovernanceDashboard
