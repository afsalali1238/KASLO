# Kasper — API & Integration Reference

**Base URL:** `https://qxnggifmmozngzguteen.supabase.co/rest/v1`

---

## Authentication

All API requests require the following headers:

```
apikey: YOUR_SUPABASE_KEY
Authorization: Bearer YOUR_SUPABASE_KEY
Content-Type: application/json
```

---

## Endpoints

### List All Jobs
```
GET /jobs?order=created_at.desc
```

### Get Single Job
```
GET /jobs?job_code=eq.KSP-20260419-0042
```

### Create Job (New Booking)
```
POST /jobs
Headers: Prefer: return=representation

Body:
{
  "job_code": "KSP-20260419-0050",
  "status": "enquiry",
  "service_type": "logistics",
  "client_name": "Mohammed Al Rashidi",
  "client_phone": "050 123 4567",
  "client_email": "client@company.com",
  "origin": "Khor Fakkan",
  "destination": "Dubai",
  "cargo_type": "container",
  "pickup_date": "2026-04-20"
}
```

### Update Job Status
```
PATCH /jobs?job_code=eq.KSP-20260419-0050
Headers: Prefer: return=minimal

Body:
{
  "status": "quoted",
  "quoted_price": 1200,
  "quote_sent_at": "2026-04-19T12:00:00Z"
}
```

---

## Status Values

| Status | Description |
|--------|------------|
| `enquiry` | New booking received |
| `quoted` | Price sent to client |
| `confirmed` | Client approved PO |
| `assigned` | Driver assigned |
| `in_transit` | Trip in progress |
| `delivered` | Cargo arrived |
| `epod_pending` | ePOD submitted |
| `invoiced` | Invoice generated |
| `paid` | Payment received |

---

## Webhook & Real-time

Supabase supports real-time subscriptions via WebSocket:

```javascript
const channel = supabase
  .channel('jobs-changes')
  .on('postgres_changes', { event: '*', schema: 'public', table: 'jobs' }, (payload) => {
    console.log('Job updated:', payload);
  })
  .subscribe();
```

This enables building:
- Real-time notifications for new bookings
- Live dashboard updates without polling
- WhatsApp/SMS alerts via webhook → Make.com/Zapier

---

## Integration Examples

### Zapier / Make.com
1. Trigger: New row in Supabase `jobs` table
2. Action: Send WhatsApp message via Twilio
3. Action: Create invoice in Zoho / Xero / QuickBooks

### ERP Integration
- Export jobs as CSV via Supabase dashboard
- REST API supports any integration (SAP, Oracle, custom)
- Webhook-ready for event-driven architecture

---

*For API access or integration support, contact the Kasper technical team.*
