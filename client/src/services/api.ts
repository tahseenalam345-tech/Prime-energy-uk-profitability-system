const BASE_URL = import.meta.env.VITE_API_BASE_URL || '/api';

function getHeaders(customHeaders: Record<string, string> = {}): Record<string, string> {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...customHeaders
  };

  if (typeof window !== 'undefined' && typeof localStorage !== 'undefined') {
    const token = localStorage.getItem('prime_energy_token');
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }
  }

  return headers;
}

export const api = {
  async login(email: string, password: string) {
    const res = await fetch(`${BASE_URL}/auth/login`, {
      method: 'POST',
      headers: getHeaders(),
      body: JSON.stringify({ email, password })
    });
    const data = await res.json();
    if (res.ok && data.token) {
      if (typeof localStorage !== 'undefined') {
        localStorage.setItem('prime_energy_token', data.token);
      }
    }
    return data;
  },

  async logout() {
    try {
      await fetch(`${BASE_URL}/auth/logout`, {
        method: 'POST',
        headers: getHeaders()
      });
    } catch {}
    if (typeof localStorage !== 'undefined') {
      localStorage.removeItem('prime_energy_token');
    }
  },

  async me() {
    const res = await fetch(`${BASE_URL}/auth/me`, {
      headers: getHeaders()
    });
    return res.json();
  },

  async getUsers() {
    const res = await fetch(`${BASE_URL}/auth/users`, {
      headers: getHeaders()
    });
    return res.json();
  },

  async getRoles() {
    const res = await fetch(`${BASE_URL}/auth/roles`, {
      headers: getHeaders()
    });
    return res.json();
  },

  async createUser(data: { name: string; email: string; role_name: string; password: string }) {
    const res = await fetch(`${BASE_URL}/auth/users`, {
      method: 'POST',
      headers: getHeaders(),
      body: JSON.stringify(data)
    });
    return res.json();
  },

  async updateUserRole(userId: string, role_name: string) {
    const res = await fetch(`${BASE_URL}/auth/users/${userId}/role`, {
      method: 'PUT',
      headers: getHeaders(),
      body: JSON.stringify({ role_name })
    });
    return res.json();
  },

  async toggleUserStatus(userId: string, active: boolean) {
    const res = await fetch(`${BASE_URL}/auth/users/${userId}/status`, {
      method: 'PATCH',
      headers: getHeaders(),
      body: JSON.stringify({ active })
    });
    return res.json();
  },

  async resetUserPassword(userId: string, newPassword: string) {
    const res = await fetch(`${BASE_URL}/auth/users/${userId}/reset-password`, {
      method: 'POST',
      headers: getHeaders(),
      body: JSON.stringify({ newPassword })
    });
    return res.json();
  },


  async getDashboardSummary() {
    const res = await fetch(`${BASE_URL}/reports/dashboard-summary`, {
      headers: getHeaders()
    });
    return res.json();
  },

  async getJobs() {
    const res = await fetch(`${BASE_URL}/reports/jobs`, {
      headers: getHeaders()
    });
    return res.json();
  },

  async updateJobStatus(id: string, status: string, userId = 'user_sales', userName = 'Sarah Jenkins (Sales)') {
    const res = await fetch(`${BASE_URL}/leads/${id}/status`, {
      method: 'PATCH',
      headers: getHeaders(),
      body: JSON.stringify({ status, userId, userName })
    });
    return res.json();
  },

  async getLeads() {
    const res = await fetch(`${BASE_URL}/leads`, {
      headers: getHeaders()
    });
    return res.json();
  },

  async getLead(id: string) {
    const res = await fetch(`${BASE_URL}/leads/${id}`, {
      headers: getHeaders()
    });
    return res.json();
  },

  async createLead(data: any) {
    const res = await fetch(`${BASE_URL}/leads`, {
      method: 'POST',
      headers: getHeaders(),
      body: JSON.stringify(data)
    });
    return res.json();
  },

  async updateLead(id: string, data: any) {
    const res = await fetch(`${BASE_URL}/leads/${id}`, {
      method: 'PUT',
      headers: getHeaders(),
      body: JSON.stringify(data)
    });
    return res.json();
  },

  async deleteLead(id: string) {
    const res = await fetch(`${BASE_URL}/leads/${id}`, {
      method: 'DELETE',
      headers: getHeaders()
    });
    return res.json();
  },

  async calculateNewLead(inputs: any) {
    const res = await fetch(`${BASE_URL}/calculator/new-lead`, {
      method: 'POST',
      headers: getHeaders(),
      body: JSON.stringify(inputs)
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error || 'Calculation error');
    }
    return res.json();
  },

  async calculateAfterSurvey(inputs: any) {
    const res = await fetch(`${BASE_URL}/calculator/after-survey`, {
      method: 'POST',
      headers: getHeaders(),
      body: JSON.stringify(inputs)
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error || 'Survey calculation error');
    }
    return res.json();
  },

  async getQuotes() {
    const res = await fetch(`${BASE_URL}/quotes`, {
      headers: getHeaders()
    });
    return res.json();
  },

  async getQuote(id: string) {
    const res = await fetch(`${BASE_URL}/quotes/${id}`, {
      headers: getHeaders()
    });
    return res.json();
  },

  async saveQuote(data: { leadId: string; calculationResult: any; userId?: string }) {
    const calc = data.calculationResult ? { ...data.calculationResult } : {};
    if (calc.ashp) {
      const { allAshpProducts, ...ashpClean } = calc.ashp;
      calc.ashp = ashpClean;
    }
    if (calc.cylinder) {
      const { allCylinders, ...cylClean } = calc.cylinder;
      calc.cylinder = cylClean;
    }
    const bodyStr = JSON.stringify({ ...data, calculationResult: calc });

    const res = await fetch(`${BASE_URL}/quotes`, {
      method: 'POST',
      headers: getHeaders(),
      body: bodyStr
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error || `HTTP ${res.status} - Failed to save quote`);
    }
    return res.json();
  },

  async saveQuoteSnapshot(data: { leadId: string; mode?: string; createdBy?: string; userId?: string; calculationResult: any; snapshotNotes?: string }) {
    const calc = data.calculationResult ? { ...data.calculationResult } : {};
    if (calc.ashp) {
      const { allAshpProducts, ...ashpClean } = calc.ashp;
      calc.ashp = ashpClean;
    }
    if (calc.cylinder) {
      const { allCylinders, ...cylClean } = calc.cylinder;
      calc.cylinder = cylClean;
    }
    const bodyObj = {
      leadId: data.leadId,
      calculationResult: calc,
      userId: data.createdBy || data.userId || 'user_sales'
    };
    const bodyStr = JSON.stringify(bodyObj);

    const res = await fetch(`${BASE_URL}/quotes`, {
      method: 'POST',
      headers: getHeaders(),
      body: bodyStr
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error || `HTTP ${res.status} - Failed to save quote snapshot`);
    }
    return res.json();
  },

  async getQuoteSnapshot(id: string) {
    const res = await fetch(`${BASE_URL}/quotes/${id}/snapshot`, {
      headers: getHeaders()
    });
    return res.json();
  },

  async verifySnapshot(id: string) {
    const res = await fetch(`${BASE_URL}/quotes/${id}/verify-snapshot`, {
      method: 'POST',
      headers: getHeaders()
    });
    return res.json();
  },

  async overrideQuote(id: string, data: { userId: string; reason: string; customerContributionOverride?: number; targetMarginOverride?: number }) {
    const res = await fetch(`${BASE_URL}/quotes/${id}/override`, {
      method: 'POST',
      headers: getHeaders(),
      body: JSON.stringify(data)
    });
    return res.json();
  },

  async getProducts(family?: string) {
    const url = family ? `${BASE_URL}/admin/products?family=${family}` : `${BASE_URL}/admin/products`;
    const res = await fetch(url, { headers: getHeaders() });
    return res.json();
  },

  async getProductsDetailed(params?: any) {
    const query = new URLSearchParams();
    if (params) {
      Object.keys(params).forEach(key => {
        if (params[key] !== undefined && params[key] !== null) {
          query.set(key, String(params[key]));
        }
      });
    }

    const res = await fetch(`${BASE_URL}/admin/products?${query.toString()}`, {
      headers: getHeaders()
    });
    return res.json();
  },

  async getProduct(id: string) {
    const res = await fetch(`${BASE_URL}/admin/products/${id}`, {
      headers: getHeaders()
    });
    return res.json();
  },

  async updateProduct(id: string, data: any) {
    const res = await fetch(`${BASE_URL}/admin/products/${id}`, {
      method: 'POST',
      headers: getHeaders(),
      body: JSON.stringify(data)
    });
    return res.json();
  },

  async getProductStatsSummary() {
    const res = await fetch(`${BASE_URL}/admin/products/stats/summary`, {
      headers: getHeaders()
    });
    return res.json();
  },

  async updateProductPrice(productId: string, data: any) {
    const res = await fetch(`${BASE_URL}/admin/products/${productId}/price`, {
      method: 'POST',
      headers: getHeaders(),
      body: JSON.stringify(data)
    });
    return res.json();
  },

  async getCommercialSettings() {
    const res = await fetch(`${BASE_URL}/admin/commercial-settings`, {
      headers: getHeaders()
    });
    return res.json();
  },

  async updateCommercialSettings(data: any) {
    const res = await fetch(`${BASE_URL}/admin/commercial-settings`, {
      method: 'POST',
      headers: getHeaders(),
      body: JSON.stringify(data)
    });
    return res.json();
  },

  async getBusRules() {
    const res = await fetch(`${BASE_URL}/admin/bus-rules`, {
      headers: getHeaders()
    });
    return res.json();
  },

  async getEstimationTables() {
    const res = await fetch(`${BASE_URL}/admin/estimation-tables`, {
      headers: getHeaders()
    });
    return res.json();
  },

  async getAuditLogs() {
    const res = await fetch(`${BASE_URL}/admin/audit-logs`, {
      headers: getHeaders()
    });
    return res.json();
  },

  async getRuleEvidence(params?: any) {
    const query = new URLSearchParams();
    if (params) {
      Object.keys(params).forEach(key => {
        if (params[key]) query.set(key, params[key]);
      });
    }

    const res = await fetch(`${BASE_URL}/admin/rule-evidence?${query.toString()}`, {
      headers: getHeaders()
    });
    return res.json();
  },

  async getCylinders() {
    const res = await fetch(`${BASE_URL}/admin/cylinders`, {
      headers: getHeaders()
    });
    return res.json();
  },

  async getRadiatorCatalogue(type?: string) {
    const query = type ? `?type=${encodeURIComponent(type)}` : '';
    const res = await fetch(`${BASE_URL}/admin/radiators${query}`, {
      headers: getHeaders()
    });
    return res.json();
  },

  async updateBusRules(id: string, data: any) {
    const res = await fetch(`${BASE_URL}/admin/bus-rules/${id}`, {
      method: 'POST',
      headers: getHeaders(),
      body: JSON.stringify(data)
    });
    return res.json();
  }
};
