const API_BASE = '/api';

export async function getFilters() {
  const res = await fetch(`${API_BASE}/filters`);
  if (!res.ok) throw new Error(`API error: ${res.status}`);
  return res.json();
}

export async function getModels(params = {}) {
  const query = new URLSearchParams();
  if (params.category) query.set('category', params.category);
  if (params.provider) query.set('provider', params.provider);
  if (params.region) query.set('region', params.region);
  const res = await fetch(`${API_BASE}/models?${query}`);
  if (!res.ok) throw new Error(`API error: ${res.status}`);
  return res.json();
}

export async function getModelById(modelId) {
  const res = await fetch(`${API_BASE}/models/${modelId}`);
  if (!res.ok) throw new Error(`API error: ${res.status}`);
  return res.json();
}

export async function recommendModels(criteria) {
  const res = await fetch(`${API_BASE}/models/recommend`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(criteria),
  });
  if (!res.ok) throw new Error(`API error: ${res.status}`);
  return res.json();
}

export async function estimateCost(modelId, monthlyInputTokens, monthlyOutputTokens) {
  const res = await fetch(`${API_BASE}/models/cost-estimate`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      model_id: modelId,
      monthly_input_tokens: monthlyInputTokens,
      monthly_output_tokens: monthlyOutputTokens,
    }),
  });
  if (!res.ok) throw new Error(`API error: ${res.status}`);
  return res.json();
}

export async function getAzureStatus() {
  const res = await fetch(`${API_BASE}/azure/status`);
  if (!res.ok) throw new Error(`API error: ${res.status}`);
  return res.json();
}

export async function getAzureDeployments(resourceGroup) {
  const query = resourceGroup ? `?resource_group=${resourceGroup}` : '';
  const res = await fetch(`${API_BASE}/azure/deployments${query}`);
  if (!res.ok) throw new Error(`API error: ${res.status}`);
  return res.json();
}

export async function validateModelInRegion(modelId, region) {
  const res = await fetch(`${API_BASE}/azure/validate/${modelId}?region=${region}`);
  if (!res.ok) throw new Error(`API error: ${res.status}`);
  return res.json();
}
