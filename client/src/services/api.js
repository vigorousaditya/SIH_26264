// Dynamic API Base URL resolution:
// Supports cross-domain hosting (e.g. Vercel frontend + Render backend) via VITE_API_URL
// Defaults to relative '/api' for unified hosts (Render, Docker, Local, or Vercel Root)
const envApiUrl = (import.meta.env.VITE_API_BASE_URL || import.meta.env.VITE_API_URL || '').trim();
const API_BASE = envApiUrl ? `${envApiUrl.replace(/\/$/, '')}/api` : '/api';

async function request(endpoint, options = {}) {
  const token = localStorage.getItem('casebridge_token');
  const headers = {
    'Content-Type': 'application/json',
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
    ...options.headers
  };

  const config = {
    ...options,
    headers
  };

  try {
    const res = await fetch(`${API_BASE}${endpoint}`, config);
    
    // Handle CSV download
    if (options.isBlob) {
      if (!res.ok) throw new Error('Failed to download report.');
      return await res.blob();
    }

    const contentType = res.headers.get('content-type') || '';
    if (!contentType.includes('application/json')) {
      if (res.status === 404) {
        throw new Error(
          `API endpoint not found at ${API_BASE}${endpoint} (HTTP 404). ` +
          `If hosting frontend on Vercel and backend on Render, add VITE_API_URL in Vercel environment variables.`
        );
      }
      throw new Error(`Server returned non-JSON ${res.status} response.`);
    }

    const data = await res.json();
    if (!res.ok) {
      throw new Error(data.message || `Request failed with status ${res.status}`);
    }
    return data;
  } catch (err) {
    console.error(`API Error on ${endpoint}:`, err);
    throw err;
  }
}

export const api = {
  // Auth
  login: (credentials) => request('/auth/login', { method: 'POST', body: JSON.stringify(credentials) }),
  demoSwitch: (role) => request('/auth/demo-switch', { method: 'POST', body: JSON.stringify({ role }) }),
  getMe: () => request('/auth/me'),
  resetDemo: () => request('/auth/reset-demo', { method: 'POST' }),

  // Institutions
  getInstitutions: (params = '') => request(`/institutions${params}`),
  getInstitution: (id) => request(`/institutions/${id}`),
  createInstitution: (data) => request('/institutions', { method: 'POST', body: JSON.stringify(data) }),
  updateInstitution: (id, data) => request(`/institutions/${id}`, { method: 'PUT', body: JSON.stringify(data) }),

  // Cases
  getCases: (params = '') => request(`/cases${params}`),
  getCase: (id) => request(`/cases/${id}`),
  getUnassignedCases: () => request('/cases/unassigned'),
  previewAssignment: (data) => request('/cases/preview-assignment', { method: 'POST', body: JSON.stringify(data) }),
  registerCase: (data) => request('/cases', { method: 'POST', body: JSON.stringify(data) }),
  updateCaseStatus: (id, data) => request(`/cases/${id}/status`, { method: 'PUT', body: JSON.stringify(data) }),
  assignCase: (id, data) => request(`/cases/${id}/assign`, { method: 'PUT', body: JSON.stringify(data) }),
  addCaseRemarks: (id, data) => request(`/cases/${id}/remarks`, { method: 'POST', body: JSON.stringify(data) }),

  // Officials
  getOfficials: (params = '') => request(`/officials${params}`),
  getOfficial: (id) => request(`/officials/${id}`),
  updateOfficialLimit: (id, maxActiveCases) => request(`/officials/${id}/limit`, { method: 'PUT', body: JSON.stringify({ maxActiveCases }) }),
  updateOfficialAvailability: (id, availabilityStatus) => request(`/officials/${id}/availability`, { method: 'PUT', body: JSON.stringify({ availabilityStatus }) }),

  // Similar Complaint Intelligence & Groups
  getIssueGroups: (params = '') => request(`/issue-groups${params}`),
  getIssueGroup: (id) => request(`/issue-groups/${id}`),
  createIssueGroup: (data) => request('/issue-groups', { method: 'POST', body: JSON.stringify(data) }),
  updateIssueGroupStatus: (id, data) => request(`/issue-groups/${id}/status`, { method: 'PUT', body: JSON.stringify(data) }),
  scanSuggestions: (institutionId) => request('/issue-groups/scan-suggestions', { method: 'POST', body: JSON.stringify({ institutionId }) }),

  // Relationships & Impact Map
  getGraphData: (params = '') => request(`/relationships/graph${params}`),
  createRelationship: (data) => request('/relationships', { method: 'POST', body: JSON.stringify(data) }),
  updateRelationshipStatus: (id, reviewStatus) => request(`/relationships/${id}/status`, { method: 'PUT', body: JSON.stringify({ reviewStatus }) }),

  // Notifications
  getNotifications: (params = '') => request(`/notifications${params}`),
  markNotificationRead: (id) => request(`/notifications/${id}/read`, { method: 'PUT' }),
  markAllNotificationsRead: () => request('/notifications/read-all', { method: 'PUT' }),
  acknowledgeNotification: (id, remarks) => request(`/notifications/${id}/acknowledge`, { method: 'PUT', body: JSON.stringify({ remarks }) }),

  // Reports
  getDashboardStats: () => request('/reports/dashboard-stats'),
  getAnalyticsDetailed: () => request('/reports/analytics-detailed'),
  exportCsv: () => request('/reports/export-csv', { isBlob: true }),

  // Audit
  getAuditLogs: (params = '') => request(`/audit${params}`)
};
