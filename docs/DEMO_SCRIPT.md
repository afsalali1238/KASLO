# Kasper MVP — Live Demo Script

**Duration:** 8–10 minutes  
**Live URL:** [kasperlogistics.vercel.app](https://kasperlogistics.vercel.app)  
**Setup:** Open 2 browser tabs (or use phone + laptop)

---

## Demo Setup

Before the demo, make sure you have:
- Tab 1: `kasperlogistics.vercel.app` (Client view)
- Tab 2: `kasperlogistics.vercel.app/ops.html` (Staff view — enter as Operations)
- Optional: Your actual email address to receive the quote notification

---

## Scene 1: The Client Experience (2 min)

### Script:
> "Let me show you what a construction company sees when they need a truck."

1. **Open Tab 1** — the Kasper homepage loads
2. Scroll through the **Equipment Marketplace** — show the equipment cards with pricing
3. Scroll to the **Published Rate Cards** — highlight the transparent pricing
4. Click **"Book Freight In 2 Hours"** from the hero section

### On the Booking Page:
5. Select tab: **Logistics & Freight**
6. Fill in:
   - Origin: **Khor Fakkan**
   - Destination: **Dubai**
   - Cargo: **Standard Container**
   - Pickup Date: **Tomorrow's date**
   - Name: **Mohammed Al Rashidi**
   - Phone: **050 123 4567**
   - Email: **your real email** (to demo the email)
7. Click **"Request Freight Quote"**

> "The booking is instantly saved to our cloud database. The client gets a job reference code and is redirected to their live tracking page."

8. **Note the job code** displayed (e.g., KSP-20260419-0050)
9. Show the tracking page — timeline shows "Enquiry" as current step

---

## Scene 2: Operations Receives the Booking (2 min)

### Script:
> "Now let me switch to what our dispatcher sees — this booking just appeared automatically."

10. **Switch to Tab 2** — Operations Dashboard
11. Show the **KPI cards** — the New Enquiries count incremented
12. Scroll down and **tap the new job** in the job list

### On the Job Detail:
13. Show the job details: client info, route, timeline at "Enquiry"
14. Enter price: **1,200** in the price field
15. Add note: **"Standard container, single drop"**
16. Click **"📩 Send Quote to Client"**

> "The system moves the job to 'Quoted' status and sends a professional quotation email to the client with an approval link."

17. Show the **"Waiting for Client Approval"** card with the approval link
18. **Copy the approval link**

---

## Scene 3: Client Approves the Quote (1.5 min)

### Script:
> "Now the client receives this link via email or WhatsApp. Let me show you what they see."

19. Open the copied approval link in **Tab 1**
20. Show the **Quote Approval page**:
    - Job reference
    - Quotation document with line items, VAT calculation, total
    - Client contact details
    - Terms and conditions
21. Click **"I APPROVE THIS QUOTE AND CONFIRM THE ORDER"**

> "That's it — one click and the Purchase Order is generated. The job instantly moves to 'Confirmed' in our system."

22. Show the redirect to the **tracking page** — timeline now shows "Confirmed"

---

## Scene 4: Vehicle Dispatch (1.5 min)

### Script:
> "Back in Operations, the job is now confirmed and ready for dispatch."

23. **Switch to Tab 2** — tap the job (now showing "Confirmed")
24. Click **"Assign Driver"**
25. Show the **7-Day Visual Dispatch Calendar**:
    - Vehicle rows with availability blocks
    - Tap on **"Ahmed Al Rashidi — Flatbed 12m"**
    - The row highlights in teal
26. Click **"Assign & Notify"**

> "Ahmed is now assigned. The system records the driver, vehicle plate, and updates the status to 'Assigned'. The client's tracking page updates automatically."

---

## Scene 5: The Driver Journey (1.5 min)

### Script:
> "Now let me show you the driver's experience on their phone."

27. Go to Tab 2 → click **"Switch role"** → select **Driver**
28. Show the **Driver Dashboard**:
    - Driver card with status, location pill
    - Active job card
29. Tap the job → Show job detail
30. Click **"▶ Start Trip"**

> "The driver taps one button. The app, which is installed as a PWA on their phone, accesses their native GPS and starts beaming coordinates to our cloud every 10 seconds. We don't need any expensive Teltonika hardware."

31. Show status moved to "In Transit"
32. **Switch to Tab 1 (Client Tracking Page)** — Wait a few seconds and show the Leaflet map smoothly panning to the driver's live location. Points out the "12s ago" last updated timestamp, just like Keeta or Talabat.
33. **Switch to Tab 2 (Driver)** — Click **"Mark as Delivered"**

> "When the driver arrives, they mark the delivery complete."

33. Click **"Complete ePOD Sign-off →"**
34. Take/upload a photo (use any photo)
35. Sign on the signature pad
36. Click **"Submit & Generate Client Sign-off Link"**

> "The driver has captured the delivery evidence. Now a sign-off link is generated for the client."

---

## Scene 6: Client ePOD Sign-off (1 min)

### Script:
> "The final step — the client confirms they received the cargo."

37. **Switch to Tab 1** — open the tracking page for the job
38. Scroll to the **"Confirm Delivery Receipt"** section
39. Enter:
    - Receiver: **Ahmed Site Manager**
    - Designation: **Site Engineer**
40. Sign on the canvas
41. Click **"APPROVE DELIVERY & SIGN OFF"**

> "Done! The delivery is now fully confirmed with dual signatures. The system immediately triggers the invoice pipeline."

---

## Scene 7: Invoice Generation (30 sec)

### Script:
> "Finally, back in Operations..."

42. **Switch to Tab 2** → Switch back to Operations role
43. Open the job → status shows "ePOD Pending" with `epod_client_done: true`
44. Click **"Generate & Send Invoice"**

> "The invoice is generated and the job is complete. From booking to invoice — all digital, all auditable, all in one platform."

---

## Closing Statement

> "What you just saw took 8 minutes. In the traditional model, this same process takes 3–5 days with dozens of phone calls, lost paperwork, and no audit trail.
>
> Kasper compresses the entire logistics lifecycle into a single digital experience. Every transaction is tracked. Every delivery is proven. Every invoice is linked to real evidence.
>
> This is the future of UAE construction logistics."

---

## Talking Points for Q&A

| Question | Answer |
|----------|--------|
| "How many trucks?" | 150+ network across UAE. Mix of owned fleet and vetted subcontractors. |
| "What about payments?" | LPO, COD, and credit card supported. Net-30 for enterprise accounts. |
| "Is it mobile-friendly?" | 100% — designed mobile-first. Drivers use it on their phones daily. |
| "What about Arabic?" | English-first MVP. Arabic UI planned for v1.1. |
| "How secure is the data?" | Supabase (enterprise PostgreSQL) with Row-Level Security. SOC2-ready infrastructure. |
| "What's the pricing model?" | Transaction fee per booking + monthly subscription for enterprise features. |
| "Can I integrate with my ERP?" | API-ready. Supabase exposes a REST API for any integration. |
