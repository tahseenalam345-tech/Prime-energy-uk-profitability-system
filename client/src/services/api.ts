const BASE_URL = '/api';

export const api = {
  async getUsers() {
    const res = await fetch(`${BASE_URL}/auth/users`);
    return res.json();
  },

  async getDashboardSummary() {
    const res = await fetch(`${BASE_URL}/reports/dashboard-summary`);
    return res.json();
  },

  async getJobs() {
    const res = await fetch(`${BASE_URL}/reports/jobs`);
    return res.json();
  },

  async updateJobStatus(id: string, status: string, userId = 'user_sales', userName = 'Sarah Jenkins (Sales)') {
    const res = await fetch(`${BASE_URL}/leads/${id}/status`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status, userId, userName })
    });
    return res.json();
  },

  async getLeads() {
    const res = await fetch(`${BASE_URL}/leads`);
    return res.json();
  },

  async getLead(id: string) {
    const res = await fetch(`${BASE_URL}/leads/${id}`);
    return res.json();
  },

  async createLead(data: any) {
    const res = await fetch(`${BASE_URL}/leads`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data)
    });
    return res.json();
  },

  async updateLead(id: string, data: any) {
    const res = await fetch(`${BASE_URL}/leads/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data)
    });
    return res.json();
  },

  async deleteLead(id: string) {
    const res = await fetch(`${BASE_URL}/leads/${id}`, {
      method: 'DELETE'
    });
    return res.json();
  },

  async calculateNewLead(inputs: any) {
    const res = await fetch(`${BASE_URL}/calculator/new-lead`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(inputs)
    });
    if (!res.ok) {
      const err = await res.json();
      throw new Error(err.error || 'Calculation error');
    }
    return res.json();
  },

  async calculateAfterSurvey(inputs: any) {
    const res = await fetch(`${BASE_URL}/calculator/after-survey`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(inputs)
    });
    if (!res.ok) {
      const err = await res.json();
      throw new Error(err.error || 'Survey calculation error');
    }
    return res.json();
  },

  async getQuotes() {
    const res = await fetch(`${BASE_URL}/quotes`);
    return res.json();
  },

  async getQuote(id: string) {
    const res = await fetch(`${BASE_URL}/quotes/${id}`);
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
    const bytes = new Blob([bodyStr]).size;
    console.log(`[API saveQuote] POST /api/quotes - Payload Size: ${bytes} bytes (${(bytes / 1024).toFixed(2)} KB)`);

    const res = await fetch(`${BASE_URL}/quotes`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
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
    const bytes = new Blob([bodyStr]).size;
    console.log(`[API saveQuoteSnapshot] POST /api/quotes - Payload Size: ${bytes} bytes (${(bytes / 1024).toFixed(2)} KB)`);

    const res = await fetch(`${BASE_URL}/quotes`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: bodyStr
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error || `HTTP ${res.status} - Failed to save quote snapshot`);
    }
    return res.json();
  },

  async getQuoteSnapshot(id: string) {
    const res = await fetch(`${BASE_URL}/quotes/${id}/snapshot`);
    return res.json();
  },

  async verifySnapshot(id: string) {
    const res = await fetch(`${BASE_URL}/quotes/${id}/verify-snapshot`, {
      method: 'POST'
    });
    return res.json();
  },

  async overrideQuote(id: string, data: { userId: string; reason: string; customerContributionOverride?: number; targetMarginOverride?: number }) {
    const res = await fetch(`${BASE_URL}/quotes/${id}/override`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data)
    });
    return res.json();
  },

  async getProducts(family?: string) {
    const url = family ? `${BASE_URL}/admin/products?family=${family}` : `${BASE_URL}/admin/products`;
    const res = await fetch(url);
    return res.json();
  },

  async getProductsDetailed(params?: { 
    family?: string; 
    brand?: string; 
    mcs_status?: string; 
    ofgem_pel_status?: string; 
    verification_status?: string; 
    search?: string;
    radiator_type?: string;
    height_mm?: string | number;
    length_mm?: string | number;
    min_kw?: string | number;
    max_kw?: string | number;
    kw_rating?: string | number;
    min_litres?: string | number;
    max_litres?: string | number;
    litres?: string | number;
    min_watts?: string | number;
    max_watts?: string | number;
    watts?: string | number;
    pipe_size_mm?: string | number;
    accessory_type?: string;
  }) {
    const query = new URLSearchParams();
    if (params?.family) query.set('family', params.family);
    if (params?.brand) query.set('brand', params.brand);
    if (params?.mcs_status) query.set('mcs_status', params.mcs_status);
    if (params?.ofgem_pel_status) query.set('ofgem_pel_status', params.ofgem_pel_status);
    if (params?.verification_status) query.set('verification_status', params.verification_status);
    if (params?.radiator_type) query.set('radiator_type', params.radiator_type);
    if (params?.height_mm) query.set('height_mm', String(params.height_mm));
    if (params?.length_mm) query.set('length_mm', String(params.length_mm));
    if (params?.min_kw) query.set('min_kw', String(params.min_kw));
    if (params?.max_kw) query.set('max_kw', String(params.max_kw));
    if (params?.kw_rating) query.set('kw_rating', String(params.kw_rating));
    if (params?.min_litres) query.set('min_litres', String(params.min_litres));
    if (params?.max_litres) query.set('max_litres', String(params.max_litres));
    if (params?.litres) query.set('litres', String(params.litres));
    if (params?.min_watts) query.set('min_watts', String(params.min_watts));
    if (params?.max_watts) query.set('max_watts', String(params.max_watts));
    if (params?.watts) query.set('watts', String(params.watts));
    if (params?.pipe_size_mm) query.set('pipe_size_mm', String(params.pipe_size_mm));
    if (params?.accessory_type) query.set('accessory_type', params.accessory_type);
    if (params?.search) query.set('search', params.search);

    const res = await fetch(`${BASE_URL}/admin/products?${query.toString()}`);
    return res.json();
  },

  async getProduct(id: string) {
    const res = await fetch(`${BASE_URL}/admin/products/${id}`);
    return res.json();
  },

  async updateProduct(id: string, data: any) {
    const res = await fetch(`${BASE_URL}/admin/products/${id}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data)
    });
    return res.json();
  },

  async getProductStatsSummary() {
    const res = await fetch(`${BASE_URL}/admin/products/stats/summary`);
    return res.json();
  },

  async updateProductPrice(productId: string, data: any) {
    const res = await fetch(`${BASE_URL}/admin/products/${productId}/price`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data)
    });
    return res.json();
  },

  async getCommercialSettings() {
    const res = await fetch(`${BASE_URL}/admin/commercial-settings`);
    return res.json();
  },

  async updateCommercialSettings(data: any) {
    const res = await fetch(`${BASE_URL}/admin/commercial-settings`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data)
    });
    return res.json();
  },

  async getBusRules() {
    const res = await fetch(`${BASE_URL}/admin/bus-rules`);
    return res.json();
  },

  async getEstimationTables() {
    const res = await fetch(`${BASE_URL}/admin/estimation-tables`);
    return res.json();
  },

  async getAuditLogs() {
    const res = await fetch(`${BASE_URL}/admin/audit-logs`);
    return res.json();
  },

  async getRuleEvidence(params?: { category?: string; status?: string; search?: string }) {
    const query = new URLSearchParams();
    if (params?.category) query.set('category', params.category);
    if (params?.status) query.set('status', params.status);
    if (params?.search) query.set('search', params.search);

    const res = await fetch(`${BASE_URL}/admin/rule-evidence?${query.toString()}`);
    return res.json();
  },

  async getCylinders() {
    const res = await fetch(`${BASE_URL}/admin/cylinders`);
    return res.json();
  },

  async getRadiatorCatalogue(type?: string) {
    const query = type ? `?type=${encodeURIComponent(type)}` : '';
    const res = await fetch(`${BASE_URL}/admin/radiators${query}`);
    return res.json();
  }
};
