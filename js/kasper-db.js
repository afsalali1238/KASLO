// kasper-db.js — Shared backend client
// ════════════════════════════════════════════════════════════════
// STEP 1: Fill in your credentials below, then save.
// Get them from: https://supabase.com → Your Project → Settings → API
// Get EmailJS from: https://emailjs.com → Account → API Keys
// ════════════════════════════════════════════════════════════════

const KASPER_CONFIG = {
  supabaseUrl:        'https://qxnggifmmozngzguteen.supabase.co',          // e.g. https://abcxyz.supabase.co
  supabaseKey:        'sb_publishable_gUOvqITZjbThOGB6_ZBadg_I7mNT6kM',     // starts with "eyJ..."
  emailjsServiceId:   'YOUR_EMAILJS_SERVICE_ID',    // e.g. service_xxxxxx
  emailjsTemplateId:  'YOUR_EMAILJS_TEMPLATE_ID',   // e.g. template_xxxxxx
  emailjsPublicKey:   'YOUR_EMAILJS_PUBLIC_KEY',    // e.g. xxxxxxxxxxxxxx
  // Auto-detected site URL for links
  siteUrl: window.location.origin,
};

// ── Supabase REST helpers ─────────────────────────────────────────
const KasperDB = {

  async _req(path, opts = {}) {
    const url = `${KASPER_CONFIG.supabaseUrl}/rest/v1/${path}`;
    const headers = {
      'apikey': KASPER_CONFIG.supabaseKey,
      'Authorization': `Bearer ${KASPER_CONFIG.supabaseKey}`,
      'Content-Type': 'application/json',
      'Prefer': opts.prefer || 'return=representation',
    };
    const res = await fetch(url, { ...opts, headers: { ...headers, ...opts.headers } });
    if (!res.ok) {
      const err = await res.text();
      throw new Error(`DB error ${res.status}: ${err}`);
    }
    if (res.status === 204) return null;
    return res.json();
  },

  // ── Read ──────────────────────────────────────────────────────
  async getJob(jobCode) {
    const rows = await this._req(
      `jobs?job_code=eq.${encodeURIComponent(jobCode)}&limit=1`
    );
    return rows?.[0] || null;
  },

  async getAllJobs() {
    return this._req('jobs?order=created_at.desc');
  },

  async getJobsByStatus(status) {
    return this._req(`jobs?status=eq.${status}&order=created_at.desc`);
  },

  // ── Write ─────────────────────────────────────────────────────
  async createJob(data) {
    const rows = await this._req('jobs', {
      method: 'POST',
      body: JSON.stringify(data),
    });
    return rows?.[0];
  },

  async updateJob(jobCode, updates) {
    return this._req(
      `jobs?job_code=eq.${encodeURIComponent(jobCode)}`,
      {
        method: 'PATCH',
        prefer: 'return=minimal',
        body: JSON.stringify(updates),
      }
    );
  },

  // ── Job code generator ────────────────────────────────────────
  generateJobCode() {
    const now = new Date();
    const d = now.toISOString().slice(0, 10).replace(/-/g, '');
    const n = String(Math.floor(Math.random() * 9000) + 1000);
    return `KSP-${d}-${n}`;
  },

  // ── Approve link builder ──────────────────────────────────────
  approveLink(jobCode) {
    return `${KASPER_CONFIG.siteUrl}/approve.html?job_id=${encodeURIComponent(jobCode)}`;
  },

  trackLink(jobCode) {
    return `${KASPER_CONFIG.siteUrl}/track-result.html?job_id=${encodeURIComponent(jobCode)}`;
  },
};

// ── EmailJS quote sender ──────────────────────────────────────────
const KasperEmail = {

  _loaded: false,

  async _ensureLoaded() {
    if (this._loaded) return;
    await new Promise((resolve, reject) => {
      if (window.emailjs) { this._loaded = true; resolve(); return; }
      const s = document.createElement('script');
      s.src = 'https://cdn.jsdelivr.net/npm/@emailjs/browser@4/dist/email.min.js';
      s.onload = () => {
        emailjs.init(KASPER_CONFIG.emailjsPublicKey);
        this._loaded = true;
        resolve();
      };
      s.onerror = reject;
      document.head.appendChild(s);
    });
  },

  async sendQuote(job) {
    await this._ensureLoaded();
    const approveUrl = KasperDB.approveLink(job.job_code);
    const params = {
      to_name:    job.client_name || 'Valued Client',
      to_email:   job.client_email,
      job_code:   job.job_code,
      service:    job.service_type === 'equipment'
                    ? `Equipment Rental — ${job.equipment_type || ''} (${job.duration || ''})`
                    : `Freight: ${job.origin || ''} → ${job.destination || ''}`,
      price:      `AED ${Number(job.quoted_price).toLocaleString()}`,
      notes:      job.quote_notes || 'No additional notes.',
      approve_url: approveUrl,
      valid_hours: '48',
    };
    return emailjs.send(
      KASPER_CONFIG.emailjsServiceId,
      KASPER_CONFIG.emailjsTemplateId,
      params
    );
  },
};

// ── UI Utilities ──────────────────────────────────────────────────
function showToast(title, body, type = 'info') {
  const colours = { info: '#1D9E75', warn: '#BA7517', error: '#E24B4A' };
  const container = document.getElementById('toast-container');
  if (!container) return;
  const t = document.createElement('div');
  t.className = 'toast';
  t.style.borderLeftColor = colours[type] || colours.info;
  t.innerHTML = `<strong style="font-size:.8rem;color:#aaa;text-transform:uppercase;display:block;margin-bottom:5px">${title}</strong>${body}`;
  container.appendChild(t);
  setTimeout(() => t.classList.add('show'), 10);
  setTimeout(() => { t.classList.remove('show'); setTimeout(() => t.remove(), 400); }, 5000);
}

function fmtStatus(s) {
  return { enquiry:'Enquiry', quoted:'Quoted', confirmed:'Confirmed',
    assigned:'Assigned', in_transit:'In Transit', delivered:'Delivered',
    epod_pending:'ePOD Pending', invoiced:'Invoiced', paid:'Paid' }[s] || s;
}
