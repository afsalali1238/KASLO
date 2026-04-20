# Kasper Logistics Platform — Product Requirements Document (PRD)

**Version:** 1.0 MVP  
**Date:** April 2026  
**Author:** Kasper Technologies FZ-LLC  
**Status:** Live (MVP)  
**Live URL:** [kasperlogistics.vercel.app](https://kasperlogistics.vercel.app)

---

## 1. Executive Summary

Kasper is a **digital logistics platform** purpose-built for the UAE construction and port supply chain. It connects shippers (construction companies, contractors, freight forwarders) with a vetted network of 150+ trucks and heavy equipment operators through a single web-based portal.

The platform digitizes the entire lifecycle of a logistics transaction — from **booking and quoting** through **real-time GPS tracking**, **electronic proof of delivery (ePOD)**, and **automated invoicing** — replacing the fragmented phone calls, WhatsApp messages, and paper-based workflows that dominate UAE freight today.

### Problem Statement

UAE construction logistics suffers from:
- **Fragmented booking:** Clients call 5–10 operators to find availability
- **Zero visibility:** No tracking between dispatch and delivery
- **Manual paperwork:** Paper delivery notes lost, disputed, or delayed
- **Slow invoicing:** 7–14 day cycle from delivery to invoice
- **No audit trail:** Disputes over pricing, delivery times, and cargo condition

### Solution

Kasper provides:
- **1-click digital booking** with instant confirmation
- **Automated quote → approve → dispatch** workflow
- **Real-time GPS tracking** shared with clients via link
- **Digital ePOD** with signature capture, photos, and timestamps
- **Automated invoicing** triggered by delivery confirmation

---

## 2. Target Users

### 2.1 Clients (Shippers)
- Construction companies (contractors, developers)
- Freight forwarders
- Industrial manufacturers
- Port agents (Khor Fakkan, Fujairah, Jebel Ali)

**Key needs:** Speed, price transparency, delivery proof, tracking

### 2.2 Operations Team (Dispatchers)
- Internal Kasper staff
- Fleet coordinators
- Account managers

**Key needs:** Job pipeline visibility, quick dispatch, fleet utilization

### 2.3 Drivers
- Kasper-employed drivers
- Subcontracted fleet operators
- Owner-operators

**Key needs:** Clear job details, simple trip management, fast ePOD

---

## 3. Product Architecture

### 3.1 Technology Stack

| Layer | Technology | Purpose |
|-------|-----------|---------|
| Frontend | Vanilla HTML/CSS/JS + PWA | Zero-dependency, installable driver app |
| Backend | Supabase (PostgreSQL) | Real-time database, REST API |
| Email | EmailJS | Automated transactional emails |
| Hosting | Vercel | CDN, auto-deploy from GitHub |
| GPS | Native Phone GPS + Leaflet | Hardware-free live tracking |
| Repo | GitHub | Version control, CI/CD |

### 3.2 Page Architecture

| URL | Purpose | User |
|-----|---------|------|
| `/` | Marketing homepage + equipment marketplace | Client |
| `/book.html` | Booking form (equipment + freight) | Client |
| `/approve.html` | Quote review + PO approval | Client |
| `/track.html` | Job code search | Client |
| `/track-result.html` | Live tracking map + ePOD sign-off | Client |
| `/ops.html` | PWA: Ops dashboard + Driver app | Staff |
| `/decline.html` | Quote decline confirmation | Client |
| `/404.html` | Error page | All |

### 3.3 Database Schema

```
jobs (
  id              UUID PRIMARY KEY
  job_code        TEXT UNIQUE        -- e.g. KSP-20260419-0042
  status          TEXT               -- enquiry → quoted → confirmed → assigned → in_transit → delivered → epod_pending → invoiced → paid
  service_type    TEXT               -- 'equipment' | 'logistics'
  
  -- Client
  client_name, client_phone, client_email, company_name
  
  -- Equipment fields
  equipment_type, duration, start_date, emirate, site_address
  
  -- Logistics fields
  origin, destination, cargo_type, pickup_date
  
  -- Quote
  quoted_price, quote_notes, quote_sent_at
  
  -- Approval
  approval_timestamp
  
  -- Assignment
  driver_name, driver_phone, vehicle_plate, traccar_link
  
  -- Live GPS Tracking (Native Phone)
  driver_lat, driver_lng, driver_location_updated_at
  
  -- ePOD
  epod_driver_done, epod_client_done, epod_client_link
  epod_photo_url, epod_notes, epod_timestamp
  
  -- Finance
  invoice_url, payment_status
  
  created_at, updated_at
)
```

---

## 4. Feature Specifications

### 4.1 Client Booking Portal

**Endpoint:** `/book.html`

| Feature | Description |
|---------|------------|
| Dual-tab form | Equipment Rental / Logistics & Freight |
| Equipment booking | Type selector, duration, start date, emirate, site address |
| Freight booking | Origin/destination selectors, cargo type, pickup date |
| Contact capture | Name*, phone*, email, company |
| Auto-redirect | After submission → tracking page with job code |
| Job code generation | Format: `KSP-YYYYMMDD-NNNN` |

**Acceptance criteria:**
- Form validates required fields before submission
- Job is created in Supabase with status `enquiry`
- Client receives job code immediately
- Job appears in Ops dashboard within 15 seconds

### 4.2 Quote & Approval Workflow

**Flow:** `Enquiry → Quoted → Confirmed`

| Step | Actor | Action |
|------|-------|--------|
| 1 | Client | Submits booking → status: `enquiry` |
| 2 | Ops | Reviews job, sets price → clicks "Send Quote" → status: `quoted` |
| 3 | System | Sends email to client with approval link |
| 4 | Client | Opens `/approve.html`, reviews quotation document |
| 5 | Client | Clicks "I APPROVE THIS QUOTE" → status: `confirmed` |
| alt | Ops | Can "Force Approve" to skip client (internal override) |

**Quotation document includes:**
- Job reference, route/service description
- Line item pricing with 5% VAT calculation
- 48-hour validity period
- Terms and conditions
- Client contact details

### 4.3 Vehicle Dispatch (7-Day Calendar)

**Endpoint:** Ops dashboard → Job detail → Assign Driver

| Feature | Description |
|---------|------------|
| Visual 7-day grid | Shows next 7 days with availability per vehicle |
| Fleet roster | 5 vehicles with driver name, plate, type |
| Click-to-select | Tap a vehicle row to assign |
| Availability visualization | Green = available, Red = booked |
| Traccar link (legacy) | Optional legacy hardware tracking URL |
| Auto-status update | Sets status to `assigned` on confirm |

### 4.4 Driver Mobile App (PWA)

**Endpoint:** `/ops.html` → Driver role

| Feature | Description |
|---------|------------|
| PWA Installable | "Add to Home Screen" prompts, standalone mode |
| Job dashboard | View all assigned jobs, active trip, ePOD alerts |
| Trip management | Start Trip → In Transit, Mark Delivered |
| Location sharing | Scheduled auto-share (configurable window) or active trip |
| Background GPS | PWA keeps GPS active by preventing screen sleep |
| ePOD capture | Photo upload + signature pad + condition notes |
| Client sign-off link | Generated automatically after driver ePOD |

### 4.5 Real-Time GPS Tracking

**Architecture: Driver Phone ➔ Supabase ➔ Client Leaflet Map**

| Feature | Description |
|---------|------------|
| Hardware-Free | Uses driver's native phone GPS (navigator.geolocation) |
| Active Pushing | Driver app pushes coords to database every 10 seconds |
| Client Polling | Tracking page polls database every 8 seconds via Leaflet |
| Fleet map (Ops) | UAE map with driver positions and status dots |
| Share link | Client receives tracking URL in confirmation email |

### 4.6 Electronic Proof of Delivery (ePOD)

**Two-party sign-off system:**

| Step | Actor | Action |
|------|-------|--------|
| 1 | Driver | Captures delivery photo + signs + adds notes |
| 2 | Driver | Generates client sign-off link |
| 3 | Client | Opens tracking page → sees ePOD module |
| 4 | Client | Enters receiver name, designation, signs on canvas |
| 5 | Client | Clicks "APPROVE DELIVERY & SIGN OFF" |
| 6 | System | Status → `epod_pending` with `epod_client_done: true` |
| 7 | Ops | Sees completed ePOD → clicks "Generate & Send Invoice" |

### 4.7 Operations Dashboard

| Feature | Description |
|---------|------------|
| KPI cards | New Enquiries, In Transit, ePOD Pending, Assigned |
| Job pipeline | Grouped by status with color-coded badges |
| Job detail view | Client info, service, route, timeline, action buttons |
| Auto-refresh | Polls every 15 seconds for new bookings |
| Fleet tracker | UAE map + driver list with active/idle status |

### 4.8 Document Generation (Planned)

| Document | Trigger | Contents |
|----------|---------|----------|
| Purchase Order | Client approves quote | Job details, pricing, VAT |
| Delivery Note | ePOD completed | Cargo details, signatures, photos |
| Invoice | Ops generates after ePOD | PO reference, line items, payment terms |

---

## 5. Job Status Lifecycle

```
enquiry ──→ quoted ──→ confirmed ──→ assigned ──→ in_transit ──→ delivered ──→ epod_pending ──→ invoiced ──→ paid
   │                      ↑
   └── Force Approve ─────┘ (internal override)
```

| Status | Description | Actor |
|--------|------------|-------|
| `enquiry` | New booking received | Client |
| `quoted` | Price sent, awaiting client approval | Ops |
| `confirmed` | Client approved the PO | Client / Ops |
| `assigned` | Vehicle + driver assigned | Ops |
| `in_transit` | Driver has started the trip | Driver |
| `delivered` | Cargo has arrived at destination | Driver |
| `epod_pending` | ePOD submitted, awaiting/completed client sign-off | Driver/Client |
| `invoiced` | Invoice generated and sent | Ops |
| `paid` | Payment received | Finance |

---

## 6. Non-Functional Requirements

### 6.1 Performance
- Page load time: < 2 seconds on 4G
- Zero framework dependencies (vanilla JS)
- CDN-hosted via Vercel edge network

### 6.2 Security
- Supabase Row-Level Security (RLS) enabled
- API key is publishable (read/write via RLS policies)
- No client-side authentication in MVP (planned for v2)

### 6.3 Compatibility
- Mobile-first responsive design
- Tested: Chrome, Safari, Firefox
- PWA-ready (can be saved to home screen)

### 6.4 Scalability
- Supabase free tier: 500MB database, 2GB bandwidth
- Vercel free tier: 100GB bandwidth
- Upgrade path: Supabase Pro ($25/mo), Vercel Pro ($20/mo)

---

## 7. Roadmap

### v1.0 — MVP (Current) ✅
- [x] Client booking portal
- [x] Quote & approval workflow
- [x] 7-day vehicle dispatch calendar
- [x] Driver mobile app with trip management
- [x] ePOD with dual sign-off
- [x] Real-time ops dashboard
- [x] GPS tracking integration (Traccar-ready)
- [x] Automated email notifications

### v1.1 — Polish (Next)
- [ ] PDF generation (PO, Invoice, Delivery Note)
- [ ] WhatsApp notification integration
- [ ] Client login & job history
- [ ] Driver login with phone OTP
- [ ] Photo upload to Supabase Storage

### v2.0 — Scale
- [ ] Multi-tenant architecture
- [ ] Subcontractor onboarding portal
- [ ] Rate card management
- [ ] Analytics dashboard (revenue, utilization, SLAs)
- [ ] Mobile native app (React Native)
- [ ] Integration with SAP/Oracle ERP

---

## 8. Success Metrics

| Metric | Target (3 months) |
|--------|-------------------|
| Bookings processed | 100+ per month |
| Quote → Confirm rate | > 60% |
| ePOD completion rate | > 90% |
| Average quote response time | < 30 minutes |
| Client NPS | > 40 |
| Invoice cycle time | < 24 hours from delivery |

---

## 9. Competitive Advantage

| Factor | Traditional Brokers | Kasper |
|--------|-------------------|--------|
| Booking | Phone calls, WhatsApp | 1-click digital |
| Quoting | Hours/days | Minutes |
| Tracking | "I'll call the driver" | Real-time GPS link |
| Delivery proof | Paper POD (often lost) | Digital ePOD with photos |
| Invoicing | 7-14 days | Same day |
| Audit trail | None | Full digital timeline |
| Price transparency | Hidden markups | Published rate cards |

---

*Kasper Technologies FZ-LLC — in5 / TECOM Group, Dubai*
