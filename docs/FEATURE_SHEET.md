# Kasper — Product Feature Sheet

**One-liner:** Digital logistics platform for UAE construction & port supply chains.

---

## Core Features

### 🚛 Instant Freight Booking
Search and book from a verified network of 150+ trucks across the UAE. Submit your cargo details, select your route, and receive confirmed capacity — all without a single phone call.

- **Equipment rental** — Boom trucks, flatbeds, lowbeds, generators
- **Freight booking** — Port-to-site, cross-emirate, UAE-Oman
- **Published rate cards** — Fixed transparent pricing, no hidden markups
- **30-minute response** — Ops team contacts you within half an hour

### 📩 Digital Quote & Approval
Receive a professional quotation document via email. Review pricing, VAT breakdown, and terms online. Approve with one click to generate a Purchase Order instantly.

- Professional quotation PDF with line items + VAT
- 48-hour validity with auto-expiry
- One-click approval → instant PO generation
- Full audit trail of every quote and approval

### 📡 Real-Time GPS Tracking (Hardware-Free)
Track your shipment from dispatch to delivery with a shareable live tracking link. No telematics hardware needed — our system uses the driver's native phone GPS and updates the client's map every 8 seconds.

- Live Leaflet map embedded directly in your tracking page
- Shareable link for your team and site managers
- Driver app runs as a PWA (Progressive Web App) to keep GPS active
- Automated status updates at every milestone

### 📋 Electronic Proof of Delivery (ePOD)
Eliminate paper delivery notes forever. Our dual sign-off system captures photographic evidence, signatures, and timestamps from both the driver and the receiver.

- **Driver side:** Delivery photo + driver signature + condition notes
- **Client side:** Receiver name, designation, digital signature
- Geo-tagged timestamp for dispute resolution
- Instant availability for download after sign-off

### ⚡ Operations Command Center
A mobile-first dashboard for dispatchers to manage the entire fleet and job pipeline from anywhere.

- Real-time KPI cards (enquiries, in-transit, pending ePODs)
- 7-day visual vehicle dispatch calendar
- UAE fleet map with live driver positions
- Auto-refreshing dashboard (15-second polling)
- Job timeline with full status history

### 🧾 Automated Invoicing
From delivery confirmation to invoice in hours, not weeks. The system automatically advances the billing pipeline after ePOD completion.

- Invoice triggered by completed ePOD sign-off
- Linked to PO reference and delivery note
- Payment tracking (LPO, COD, credit card)
- Full document bundle: PO + Delivery Note + Invoice

---

## Platform Highlights

| Feature | Detail |
|---------|--------|
| **Zero downloads** | Fully web-based — works on any phone or desktop |
| **UAE-specific** | Built for Emirates logistics: routes, currencies, business culture |
| **Mobile-first** | Designed for drivers and site managers on the go |
| **Instant deploy** | New bookings appear in Ops within seconds |
| **Bilingual-ready** | English-first with Arabic UI expansion planned |
| **Cloud-native** | Hosted on Vercel CDN + Supabase for 99.9% uptime |

---

## Service Coverage

### Equipment Available
| Type | Capacity | Starting Rate |
|------|----------|---------------|
| Heavy Boom Truck | 10T / 20m lift | AED 1,800/day |
| 40ft Flatbed Trailer | Standard container | AED 800/day |
| Low-Bed Heavy | Oversized machinery | AED 2,500/day |
| Mobile Generator | Construction site | On request |

### Freight Routes
| Route | Rate |
|-------|------|
| Khor Fakkan → Jebel Ali | AED 1,000 |
| Khor Fakkan → Dubai | AED 900 |
| Fujairah → Abu Dhabi | AED 1,400 |
| UAE → Oman (Cross-border) | AED 2,500+ |

*All rates exclude 5% VAT. Subject to availability.*

---

## How It Works

```
Client Books Online         Ops Sends Quote          Client Approves PO
     ┌──────┐                ┌──────┐                 ┌──────┐
     │  📱  │  ───────────>  │  📡  │  ───────────>   │  ✅  │
     │ Book │                │Quote │                  │Approve│
     └──────┘                └──────┘                  └──────┘
                                                           │
     ┌──────┐                ┌──────┐                 ┌──────┐
     │  🧾  │  <───────────  │  📋  │  <───────────   │  🚛  │
     │Invoice│               │ ePOD │                 │Assign│
     └──────┘                └──────┘                  └──────┘
    Ops Invoices          Client Signs ePOD          Ops Dispatches
```

---

## Contact

**Kasper Technologies FZ-LLC**  
in5 / TECOM Group, Dubai  
Web: [kasperlogistics.vercel.app](https://kasperlogistics.vercel.app)
