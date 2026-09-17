// API service functions for backend communication
// Add your API calls here

export const apiClient = {
  // Auth endpoints
  async getAuthStatus() {
    const res = await fetch('/api/auth/status');
    return res.ok ? res.json() : null;
  },

  async logout() {
    return fetch('/api/auth/logout', { method: 'POST' });
  },

  // Customer endpoints
  async getCustomers() {
    const res = await fetch('/api/customers');
    return res.ok ? res.json() : [];
  },

  async addCustomer(customer: any) {
    return fetch('/api/customers', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(customer),
    });
  },

  async updateCustomer(customerId: string, updates: any) {
    return fetch(`/api/customers/${customerId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(updates),
    });
  },
};
