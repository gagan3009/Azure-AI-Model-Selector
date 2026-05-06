import { useState, useEffect } from 'react'
import { getFilters, recommendModels } from '../services/api'

const REGIONS_DISPLAY = {
  eastus: 'East US',
  eastus2: 'East US 2',
  westus: 'West US',
  westus2: 'West US 2',
  westus3: 'West US 3',
  northcentralus: 'N. Central US',
  southcentralus: 'S. Central US',
  westeurope: 'West Europe',
  northeurope: 'North Europe',
  swedencentral: 'Sweden Central',
  uksouth: 'UK South',
  francecentral: 'France Central',
  japaneast: 'Japan East',
  australiaeast: 'Australia East',
  canadaeast: 'Canada East',
  southeastasia: 'SE Asia',
  centralindia: 'Central India',
  brazilsouth: 'Brazil South',
  global: 'Global',
}

function SelectionForm({ onResults, onLoading, setActiveTab }) {
  const [filters, setFilters] = useState(null)
  const [selectedUseCase, setSelectedUseCase] = useState(null)
  const [criteria, setCriteria] = useState({
    task_type: 'chat',
    budget: 'medium',
    performance_priority: 'balanced',
    context_window: 'large',
    regions: [],
  })

  useEffect(() => {
    getFilters().then(setFilters).catch(console.error)
  }, [])

  const handleUseCaseSelect = (useCase) => {
    setSelectedUseCase(useCase.id)
    setCriteria(prev => ({
      ...prev,
      ...useCase.criteria,
      regions: prev.regions,
    }))
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    onLoading(true)
    try {
      const result = await recommendModels(criteria)
      onResults(result)
      setActiveTab('recommend')
    } catch (err) {
      console.error('Recommendation failed:', err)
    } finally {
      onLoading(false)
    }
  }

  const toggleRegion = (region) => {
    setCriteria(prev => ({
      ...prev,
      regions: prev.regions.includes(region)
        ? prev.regions.filter(r => r !== region)
        : [...prev.regions, region],
    }))
  }

  if (!filters) {
    return (
      <div className="card">
        <div className="loading">
          <div className="spinner"></div>
          <p style={{fontSize: '0.8rem'}}>Loading configuration...</p>
        </div>
      </div>
    )
  }

  return (
    <form onSubmit={handleSubmit}>
      {/* Use Case Scenarios */}
      <div className="card">
        <h2 className="card-title">Quick Start Scenarios</h2>
        <div className="use-case-grid">
          {(filters.use_cases || []).slice(0, 8).map(uc => (
            <div
              key={uc.id}
              className={`use-case-card ${selectedUseCase === uc.id ? 'selected' : ''}`}
              onClick={() => handleUseCaseSelect(uc)}
            >
              <h4>{uc.name}</h4>
              <p>{uc.description}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Detailed Criteria */}
      <div className="card">
        <h2 className="card-title">Detailed Criteria</h2>

        <div className="form-group">
          <label>Task Type</label>
          <select
            value={criteria.task_type}
            onChange={e => { setCriteria({ ...criteria, task_type: e.target.value }); setSelectedUseCase(null); }}
          >
            {filters.task_types.map(t => (
              <option key={t} value={t}>
                {t.charAt(0).toUpperCase() + t.slice(1).replace('_', ' ')}
              </option>
            ))}
          </select>
        </div>

        <div className="form-group">
          <label>Budget Tier</label>
          <select
            value={criteria.budget}
            onChange={e => setCriteria({ ...criteria, budget: e.target.value })}
          >
            <option value="low">Low — Cost-optimized</option>
            <option value="medium">Medium — Balanced</option>
            <option value="high">High — Performance-first</option>
            <option value="premium">Premium — Best available</option>
          </select>
          <div className="helper-text">Higher budget unlocks more capable models</div>
        </div>

        <div className="form-group">
          <label>Performance Priority</label>
          <select
            value={criteria.performance_priority}
            onChange={e => setCriteria({ ...criteria, performance_priority: e.target.value })}
          >
            <option value="latency">Low Latency — Real-time responses</option>
            <option value="throughput">High Throughput — Batch processing</option>
            <option value="balanced">Balanced — General purpose</option>
          </select>
        </div>

        <div className="form-group">
          <label>Context Window</label>
          <select
            value={criteria.context_window}
            onChange={e => setCriteria({ ...criteria, context_window: e.target.value })}
          >
            <option value="small">Small — Up to 8K tokens</option>
            <option value="medium">Medium — 8K to 32K tokens</option>
            <option value="large">Large — 32K to 128K tokens</option>
            <option value="very_large">Very Large — 128K+ tokens</option>
          </select>
          <div className="helper-text">Larger windows process more text but cost more</div>
        </div>

        <div className="form-group">
          <label>Target Regions</label>
          <div className="multi-select">
            {filters.regions.map(region => (
              <span
                key={region}
                className={`chip ${criteria.regions.includes(region) ? 'selected' : ''}`}
                onClick={() => toggleRegion(region)}
              >
                {REGIONS_DISPLAY[region] || region}
              </span>
            ))}
          </div>
          <div className="helper-text">{criteria.regions.length > 0 ? `${criteria.regions.length} region(s) selected` : 'No region constraint — all models shown'}</div>
        </div>

        <button type="submit" className="btn btn-primary">
          <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor"><path d="M8 1l2 4 4.5.7-3.2 3.1.8 4.5L8 11.3 3.9 13.3l.8-4.5L1.5 5.7 6 5z"/></svg>
          Find Best Model
        </button>
      </div>
    </form>
  )
}

export default SelectionForm
