const BASE_URL = 'http://localhost:3000/api';

async function request<T>(path: string, options?: RequestInit): Promise<T> {
  const res = await fetch(`${BASE_URL}${path}`, {
    headers: { 'Content-Type': 'application/json' },
    ...options,
  });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return res.json();
}

export const api = {
  getStartupData: () => request<import('../types').StartupData>('/startup'),
  getReports: () =>
    request<{ inventory: import('../types').InventoryRow[]; tsReport: Record<string, import('../types').TsReportItem[]> }>('/reports'),
  validateAndSave: (formData: unknown) =>
    request('/outbound', { method: 'POST', body: JSON.stringify(formData) }),
};
