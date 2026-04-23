// app.js — Portal logic
// Requires kasper-db.js to be loaded first on every page.
// ════════════════════════════════════════════════════════════════

document.addEventListener('DOMContentLoaded', async () => {

  // ── Asset injection ─────────────────────────────────────────
  const root = document.documentElement;
  root.style.setProperty('--bg-hero-img-url', `url('assets/hero-construction-bg.png')`);
  ['gps-map','epod-tablet','boom-truck','flatbed-truck','lowbed-truck'].forEach(id => {
    const el = document.getElementById(`${id}-img`);
    if (el) el.style.backgroundImage = `url('assets/${id}.png')`;
  });

  // ── Smooth scroll ───────────────────────────────────────────
  document.querySelectorAll('a[href^="#"]').forEach(a => {
    a.addEventListener('click', e => {
      e.preventDefault();
      document.querySelector(a.getAttribute('href'))?.scrollIntoView({ behavior: 'smooth' });
    });
  });

  // ── URL params ──────────────────────────────────────────────
  const params  = new URLSearchParams(window.location.search);
  const jobCode = params.get('job_id');
  const path = window.location.pathname.toLowerCase();
  
  // Determine page safely regardless of .html extension
  let page = 'unknown';
  if (path.includes('book')) page = 'book.html';
  else if (path.includes('approve')) page = 'approve.html';
  else if (path.includes('track-result')) page = 'track-result.html';
  else if (path.includes('track')) page = 'track.html';
  else if (path.includes('ops')) page = 'ops.html';
  else if (path.includes('vendor')) page = 'vendor.html';
  else if (path.includes('driver')) page = 'driver.html';

  // ── Force Next Step pipeline (shared by all pages) ──────────
  function fmtStatus(s) {
    const map = {
      'enquiry':'Enquiry','rfq_sent':'RFQ Sent','quoted':'Quoted','po_pending':'PO Verification',
      'confirmed':'Confirmed','vendor_po_sent':'Vendor PO','assigned':'Assigned','in_transit':'In Transit',
      'delivered':'Delivered','epod_pending':'ePOD Pending','epod_done':'ePOD Signed',
      'invoiced':'Invoiced','paid':'Paid'
    };
    return map[s] || s;
  }
  const PIPELINE=['enquiry','rfq_sent','quoted','po_pending','confirmed','vendor_po_sent','assigned','in_transit','delivered','epod_pending','epod_done','invoiced','paid'];
  function getNextStatus(current){ const i=PIPELINE.indexOf(current); return i>=0 && i<PIPELINE.length-1 ? PIPELINE[i+1] : null; }
  async function forceNextStep(job){
    const ns=getNextStatus(job.status);
    if(!ns) return;
    const extras={};
    if(ns==='rfq_sent') { /* just status advance */ }
    if(ns==='quoted'){ extras.quoted_price=job.quoted_price||2500; extras.vendor_price=job.vendor_price||1800; }
    if(ns==='confirmed'){ extras.approval_timestamp=new Date().toISOString(); extras.quoted_price=job.quoted_price||2500; }
    if(ns==='vendor_po_sent'){ extras.vendor_po_sent=true; }
    if(ns==='assigned'){ extras.driver_name='Ahmed Al Rashidi'; extras.vehicle_plate='Dubai A 12345'; extras.driver_phone='+971501234567'; }
    if(ns==='in_transit'){ extras.driver_lat=25.2048; extras.driver_lng=55.2708; extras.driver_location_updated_at=new Date().toISOString(); }
    await KasperDB.updateJob(job.job_code, {status:ns, ...extras});
    window.location.reload();
  }
  // Wire Force Next Step button (exists on approve.html and track-result.html)
  if(jobCode){
    const forceBtn=document.getElementById('btn-force-next');
    if(forceBtn){
      try{
        const j=await KasperDB.getJob(jobCode);
        if(j){
          const ns=getNextStatus(j.status);
          if(ns) forceBtn.textContent=`Force → ${ns.replace(/_/g,' ').replace(/\b\w/g,c=>c.toUpperCase())}`;
          else { forceBtn.textContent='Pipeline Complete'; forceBtn.disabled=true; }
          forceBtn.addEventListener('click', async()=>{ forceBtn.disabled=true; forceBtn.textContent='Advancing…'; await forceNextStep(j); });
        }
      }catch(e){ console.warn('Force btn init failed',e); }
    }
  }

  // ════════════════════════════════════════════════════════════
  // BOOK PAGE
  // ════════════════════════════════════════════════════════════
  if (page === 'book.html') {

    // Tab switcher
    document.querySelectorAll('.tab').forEach(tab => {
      tab.addEventListener('click', () => {
        document.querySelectorAll('.tab').forEach(t => t.classList.remove('active'));
        document.querySelectorAll('.tab-content').forEach(c => c.classList.remove('active'));
        tab.classList.add('active');
        document.getElementById(`${tab.dataset.tab}-tab`)?.classList.add('active');
      });
    });

    // Pre-select tab from URL
    const bookType = params.get('type');
    const bookItem = params.get('item');
    if (bookType) {
      const tabKey = bookType === 'freight' ? 'logistics' : bookType;
      document.querySelector(`.tab[data-tab="${tabKey}"]`)?.click();
      if (bookItem && bookType === 'equipment') {
        const sel = document.getElementById('eq-type-select');
        if (sel) sel.value = bookItem;
      }
    }

    // Form submit handler
    document.querySelectorAll('.submit-book-btn').forEach(btn => {
      btn.addEventListener('click', async e => {
        e.preventDefault();
        const type = btn.getAttribute('data-type'); // 'equipment' | 'logistics'
        const form = document.getElementById(`${type}-booking-form`);
        if (!form) return;

        // Collect contact fields
        const clientName  = form.querySelector('[name="client_name"]')?.value?.trim();
        const clientPhone = form.querySelector('[name="client_phone"]')?.value?.trim();
        const clientEmail = form.querySelector('[name="client_email"]')?.value?.trim();
        const company     = form.querySelector('[name="company_name"]')?.value?.trim();

        if (!clientName || !clientPhone) {
          showToast('Missing info', 'Please enter your name and phone number.', 'warn');
          return;
        }

        btn.textContent = 'Submitting…';
        btn.disabled = true;

        try {
          const jobCode = KasperDB.generateJobCode();
          const baseData = {
            job_code: jobCode,
            vendor_id: '11111111-1111-1111-1111-111111111111', // Default to Kasper core
            status: 'enquiry',
            service_type: type,
            client_name:  clientName,
            client_phone: clientPhone,
            client_email: clientEmail || null,
            company_name: company || null,
          };

          let extraData = {};
          if (type === 'equipment') {
            extraData = {
              equipment_type: form.querySelector('[name="equipment_type"]')?.value,
              duration:       form.querySelector('[name="duration"]')?.value,
              start_date:     form.querySelector('[name="start_date"]')?.value || null,
              emirate:        form.querySelector('[name="emirate"]')?.value,
              site_address:   form.querySelector('[name="site_address"]')?.value?.trim() || null,
            };
          } else {
            const cargo = form.querySelector('[name="cargo_type"]')?.value;
            const weightVal = form.querySelector('[name="weight"]')?.value;
            extraData = {
              origin:      form.querySelector('[name="origin"]')?.value,
              destination: form.querySelector('[name="destination"]')?.value,
              cargo_type:  weightVal ? `${cargo} (Weight: ${weightVal})` : cargo,
              pickup_date: form.querySelector('[name="pickup_date"]')?.value || null,
            };
          }

          await KasperDB.createJob({ ...baseData, ...extraData });

          showToast('Request Received', `Job Code: <strong>${jobCode}</strong> — Our team will contact you shortly.`);
          btn.style.background = 'var(--accent-teal)';
          btn.textContent = `Submitted! Ref: ${jobCode}`;

          // Store code so client can track
          localStorage.setItem('kasper_last_job', jobCode);

          // Redirect to track after 2.5s
          setTimeout(() => {
            const isLocal = window.location.pathname.endsWith('.html');
            window.location.href = `${isLocal ? 'track-result.html' : 'track-result'}?job_id=${encodeURIComponent(jobCode)}`;
          }, 2500);

        } catch (err) {
          console.error(err);
          showToast('Error', 'Could not submit request. Please try again.', 'error');
          btn.textContent = 'Retry Request';
          btn.disabled = false;
        }
      });
    });
  }

  // ════════════════════════════════════════════════════════════
  // APPROVE PAGE
  // ════════════════════════════════════════════════════════════
  if (page === 'approve.html') {
    const isLocal = window.location.pathname.endsWith('.html');
    const notFoundUrl = isLocal ? '404.html' : '404';

    if (!jobCode) { window.location.href = notFoundUrl; return; }

    const approveBtn = document.getElementById('btn-approve-quote');
    if (!approveBtn) return;

    approveBtn.disabled = true;
    approveBtn.textContent = 'Loading quote…';

    try {
      const job = await KasperDB.getJob(jobCode);
      if (!job) { window.location.href = notFoundUrl; return; }

      // Populate UI
      const setText = (id, val) => { const el = document.getElementById(id); if (el) el.textContent = val || '—'; };
      const route = job.service_type === 'equipment'
        ? `${job.equipment_type || 'Equipment'} (${job.duration || ''})`
        : `${job.origin || ''} → ${job.destination || ''}`;

      setText('mock-job-id', job.job_code);
      setText('mock-route', route);
      setText('mock-price', job.quoted_price ? `AED ${Number(job.quoted_price).toLocaleString()}` : 'Pending');
      setText('mock-contact-name', job.client_name);
      if (document.getElementById('mock-contact-phone'))
        document.getElementById('mock-contact-phone').innerHTML = `📞 ${job.client_phone || 'N/A'}`;
      if (document.getElementById('mock-contact-email'))
        document.getElementById('mock-contact-email').innerHTML = `✉️ ${job.client_email || 'N/A'}`;

      // Quote document
      const now = new Date();
      const expiry = job.quote_sent_at
        ? new Date(new Date(job.quote_sent_at).getTime() + 48 * 3600 * 1000)
        : new Date(now.getTime() + 48 * 3600 * 1000);

      setText('mock-quote-date', now.toLocaleDateString('en-GB'));
      setText('mock-quote-expiry', expiry.toLocaleDateString('en-GB'));
      setText('quote-table-desc', `${job.service_type === 'equipment' ? 'Equipment Rental' : 'Freight Booking'} — ${route}`);

      if (job.quoted_price) {
        const price = Number(job.quoted_price);
        const vat = (price * 0.05).toFixed(2);
        const total = (price * 1.05).toFixed(2);
        setText('quote-table-price', `AED ${price.toLocaleString()}`);
        setText('quote-table-vat', `AED ${vat}`);
        setText('quote-table-total', `AED ${Number(total).toLocaleString()}`);
      }

      // Status checks
      if (['po_pending', 'confirmed', 'assigned', 'in_transit', 'delivered', 'epod_pending', 'invoiced'].includes(job.status)) {
        approveBtn.disabled = true;
        approveBtn.style.background = 'var(--accent-teal)';
        approveBtn.textContent = '✓ QUOTE APPROVED (PO UNDER REVIEW)';
        return;
      }

      if (!job.quoted_price) {
        approveBtn.disabled = true;
        approveBtn.textContent = 'Quote not yet sent — our team will contact you shortly';
        return;
      }

      if (job.quote_sent_at && now > expiry) {
        approveBtn.disabled = true;
        approveBtn.style.background = 'var(--text-muted)';
        approveBtn.textContent = 'QUOTE EXPIRED — Contact ops for a new quote';
        return;
      }

      // Ready to approve
      approveBtn.disabled = false;
      approveBtn.textContent = 'I APPROVE THIS QUOTE AND UPLOAD PO';

      approveBtn.addEventListener('click', async () => {
        approveBtn.disabled = true;
        approveBtn.textContent = 'Confirming…';

        try {
          await KasperDB.updateJob(job.job_code, {
            status: 'po_pending',
            approval_timestamp: new Date().toISOString(),
          });

          approveBtn.style.background = 'var(--accent-teal)';
          approveBtn.textContent = `PO SUBMITTED — Track: ${job.job_code}`;

          showToast('Quote Approved!', `Your tracking code is <strong>${job.job_code}</strong>. Ops will review your PO shortly.`);

          setTimeout(() => {
            window.location.href = KasperDB.trackLink(job.job_code);
          }, 2500);

        } catch (err) {
          console.error(err);
          showToast('Error', 'Could not confirm order. Please retry.', 'error');
          approveBtn.disabled = false;
          approveBtn.textContent = 'I APPROVE THIS QUOTE AND CONFIRM THE ORDER';
        }
      });

    } catch (err) {
      console.error(err);
      approveBtn.textContent = 'Failed to load — check your connection';
      showToast('Error', 'Could not load quote. Check your internet connection.', 'error');
    }
  }

  // ════════════════════════════════════════════════════════════
  // TRACK SEARCH PAGE
  // ════════════════════════════════════════════════════════════
  const searchForm = document.getElementById('search-job-form');
  if (searchForm) {
    // Pre-fill from localStorage if client just booked
    const lastJob = localStorage.getItem('kasper_last_job');
    const input = document.getElementById('job-search-input');
    if (lastJob && input) input.value = lastJob;

    searchForm.addEventListener('submit', e => {
      e.preventDefault();
      const val = input?.value?.trim().toUpperCase();
      // Handle extension stripping by navigating based on current host URL structure
      if (val) {
        if(window.location.pathname.endsWith('.html')) {
          window.location.href = `track-result.html?job_id=${encodeURIComponent(val)}`;
        } else {
          // If server suppresses extensions, navigate without it
          window.location.href = `track-result?job_id=${encodeURIComponent(val)}`;
        }
      }
    });
  }

  // ════════════════════════════════════════════════════════════
  // TRACK RESULT PAGE
  // ════════════════════════════════════════════════════════════
  if (page === 'track-result.html' || document.getElementById('tracking-result-UI')) {
    if (!jobCode) { window.location.href = 'track'; return; }

    try {
      const job = await KasperDB.getJob(jobCode);

      if (!job) {
        document.getElementById('search-hero-UI')?.style && (document.getElementById('search-hero-UI').style.display = 'none');
        document.getElementById('tracking-result-UI')?.style && (document.getElementById('tracking-result-UI').style.display = 'none');
        const err = document.getElementById('error-UI');
        if (err) err.style.display = 'block';
        return;
      }

      // Show result panel
      document.getElementById('search-hero-UI')?.style && (document.getElementById('search-hero-UI').style.display = 'none');
      const resultUI = document.getElementById('tracking-result-UI');
      if (resultUI) resultUI.style.display = 'block';

      const route = job.service_type === 'equipment'
        ? `${job.equipment_type || 'Equipment'} (${job.duration || ''})`
        : `${job.origin || ''} → ${job.destination || ''}`;

      // Header
      const setText = (id, val) => { const el = document.getElementById(id); if (el) el.textContent = val || '—'; };
      setText('tr-job-id', job.job_code);
      setText('tr-route', route);
      setText('tr-service', job.service_type === 'equipment' ? 'Equipment Rental' : 'Freight Booking');
      setText('tr-route-detail', route);
      setText('tr-date', job.pickup_date || job.start_date || '—');
      let cargoStr = job.cargo_type || job.equipment_type || '—';
      if (job.weight) cargoStr += ` (${job.weight})`;
      setText('tr-cargo', cargoStr);
      setText('tr-rate', job.quoted_price ? `AED ${Number(job.quoted_price).toLocaleString()}` : 'Pending');
      setText('tr-status', fmtStatus(job.status));

      // Quote Action Banner
      if (job.status === 'quoted') {
        const qBanner = document.getElementById('quote-action-banner');
        const qBtn = document.getElementById('btn-goto-approve');
        if (qBanner && qBtn) {
          qBanner.style.display = 'block';
          qBtn.addEventListener('click', () => {
            const isLocal = window.location.pathname.endsWith('.html');
            window.location.href = `${isLocal ? 'approve.html' : 'approve'}?job_id=${encodeURIComponent(job.job_code)}`;
          });
        }
      }

      // Driver
      if (job.driver_name) {
        setText('tr-driver', job.driver_name);
        setText('tr-plate', job.vehicle_plate || '—');
        setText('tr-driver-phone', job.driver_phone || '—');
      }

      // Timeline — map internal marketplace states to client-visible states
      const statusOrder = ['enquiry','quoted','confirmed','assigned','in_transit','delivered','epod_pending','invoiced','paid'];
      const stepIds     = ['ts-enq','ts-quo','ts-con','ts-ass','ts-int','ts-del','ts-epo','ts-inv','ts-pai'];
      // Map internal states to client-facing equivalents
      const clientStatus = {'rfq_sent':'enquiry', 'po_pending':'quoted', 'vendor_po_sent':'confirmed'}[job.status] || job.status;
      const curIdx      = statusOrder.indexOf(clientStatus);

      stepIds.forEach((id, i) => {
        const el = document.getElementById(id);
        if (!el) return;
        if (i < curIdx) el.classList.add('completed');
        else if (i === curIdx) el.classList.add('active');
      });

      // GPS
      if (['in_transit','delivered'].includes(job.status)) {
        const gps = document.getElementById('gps-module');
        if (gps) {
          gps.style.display = 'block';
          if (job.traccar_link) {
            const iframe = document.createElement('iframe');
            iframe.src = job.traccar_link;
            iframe.style.cssText = 'width:100%;height:340px;border:none;border-radius:8px;';
            const placeholder = gps.querySelector('.pdf-placeholder');
            if (placeholder) placeholder.replaceWith(iframe);
          }
        }
      }

      // ePOD module
      if (job.status === 'delivered' && !job.epod_client_done) {
        const epodEl = document.getElementById('epod-module');
        if (epodEl) {
          epodEl.style.display = 'block';
          initEPOD(job);
        }
      } else if (job.epod_client_done) {
        const dlText = document.getElementById('dl-epod-text');
        const dlBtn  = document.getElementById('dl-epod-btn');
        if (dlText) dlText.style.color = 'var(--text-main)';
        if (dlBtn)  { dlBtn.disabled = false; dlBtn.style.opacity = '1'; dlBtn.textContent = 'Download'; }
      }

    } catch (err) {
      console.error(err);
      showToast('Error', 'Could not load job. Check your connection.', 'error');
    }
  }

  // ── ePOD sign-off logic ──────────────────────────────────────
  function initEPOD(job) {
    const canvas = document.getElementById('signature-pad');
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    let painting = false;

    const getPos = e => {
      const r = canvas.getBoundingClientRect();
      const src = e.touches ? e.touches[0] : e;
      return { x: src.clientX - r.left, y: src.clientY - r.top };
    };
    canvas.addEventListener('mousedown',  e => { painting = true; draw(e); });
    canvas.addEventListener('mouseup',    () => { painting = false; ctx.beginPath(); });
    canvas.addEventListener('mouseleave', () => { painting = false; ctx.beginPath(); });
    canvas.addEventListener('mousemove',  e => draw(e));
    canvas.addEventListener('touchstart', e => { painting = true; draw(e); }, { passive: false });
    canvas.addEventListener('touchend',   () => { painting = false; ctx.beginPath(); });
    canvas.addEventListener('touchmove',  e => { draw(e); e.preventDefault(); }, { passive: false });

    function draw(e) {
      if (!painting) return;
      const { x, y } = getPos(e);
      ctx.lineWidth = 3; ctx.lineCap = 'round'; ctx.strokeStyle = '#1A2B4A';
      ctx.lineTo(x, y); ctx.stroke(); ctx.beginPath(); ctx.moveTo(x, y);
    }

    document.getElementById('clear-sig')?.addEventListener('click', () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
    });

    const submitBtn = document.getElementById('submit-epod');
    if (!submitBtn) return;

    submitBtn.addEventListener('click', async () => {
      const name   = document.getElementById('epod-name')?.value?.trim();
      const phone  = document.getElementById('epod-phone')?.value?.trim();
      const method = document.getElementById('epod-payment')?.value;

      if (!name) {
        showToast('Required', 'Please enter the receiver name.', 'warn');
        return;
      }

      submitBtn.disabled = true;
      submitBtn.textContent = 'Saving…';

      try {
        await KasperDB.updateJob(job.job_code, {
          status: 'epod_pending',
          epod_client_done: true,
          epod_timestamp: new Date().toISOString(),
          epod_notes: `Received by: ${name}${phone ? ' (' + phone + ')' : ''}. Payment: ${method}.`,
        });

        const epodEl = document.getElementById('epod-module');
        if (epodEl) {
          epodEl.innerHTML = `
            <div class="text-center" style="padding:40px">
              <div style="font-size:3rem;margin-bottom:16px">✅</div>
              <h3 style="color:var(--accent-teal);margin-bottom:10px">Delivery Confirmed!</h3>
              <p style="color:var(--text-muted)">Invoice &amp; Delivery Note are ready for download.</p>
            </div>`;
        }

        showToast('ePOD Approved', 'Delivery confirmed. Invoice has been triggered.');

        // Advance timeline
        const ts = { del:'ts-del', epo:'ts-epo', inv:'ts-inv' };
        Object.values(ts).forEach((id, i) => {
          const el = document.getElementById(id);
          if (!el) return;
          if (i < 2) { el.classList.remove('active'); el.classList.add('completed'); }
          else el.classList.add('active');
        });

        const dlText = document.getElementById('dl-epod-text');
        const dlBtn  = document.getElementById('dl-epod-btn');
        if (dlText) dlText.style.color = 'var(--text-main)';
        if (dlBtn)  { dlBtn.disabled = false; dlBtn.style.opacity = '1'; dlBtn.textContent = 'Download'; }

      } catch (err) {
        console.error(err);
        showToast('Error', 'Could not save ePOD. Please retry.', 'error');
        submitBtn.disabled = false;
        submitBtn.textContent = 'APPROVE DELIVERY & SIGN OFF';
      }
    });
  }

});
