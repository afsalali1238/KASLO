# Kasper — Connection Setup Guide

Everything you need to go from mock data to live connected system.
**Total time: ~30 minutes.**

---

## What gets connected

| When client does... | Ops/driver sees instantly |
|---|---|
| Fills booking form | New job appears in Ops Dashboard with all details |
| Approves a quote | Job moves to "Confirmed" — ops gets a WhatsApp (set up via Make) |
| Submits ePOD | Status updates live on tracking page, invoice auto-triggers |
| Tracks order | Sees real GPS, real driver details, real status |

---

## Step 1 — Create a Supabase project (5 minutes)

1. Go to **https://supabase.com** → Sign up (free)
2. New project → choose a name (e.g. "kasper-logistics") → set a DB password → **Save it**
3. Wait ~2 minutes for project to spin up
4. Go to: **Settings → API**
5. Copy two things:
   - **Project URL** — looks like `https://abcdefgh.supabase.co`
   - **anon public** key — long string starting with `eyJ...`

---

## Step 2 — Create the database (2 minutes)

1. In Supabase: **SQL Editor → New query**
2. Paste the entire contents of `supabase_setup.sql`
3. Click **Run**
4. You should see: "Success. No rows returned."

---

## Step 3 — Fill in your credentials (5 minutes)

Open **both** of these files and replace the placeholder values:

### `portal/js/kasper-db.js`

```javascript
const KASPER_CONFIG = {
  supabaseUrl: 'https://YOUR_PROJECT.supabase.co',  // ← your URL
  supabaseKey: 'eyJ...',                             // ← your anon key
  // EmailJS fields — see Step 4
  emailjsServiceId:  'service_xxxxxx',
  emailjsTemplateId: 'template_xxxxxx',
  emailjsPublicKey:  'xxxxxxxxxxxxxx',
  // Your site URL (where the portal HTML files are hosted)
  // If running locally: 'http://localhost:3000'
  // If hosted: 'https://kasper.ae/portal'
};
```

### `kasper_mobile_app.html` (top of the `<script>` block)

```javascript
const SUPA_URL  = 'https://YOUR_PROJECT.supabase.co';
const SUPA_KEY  = 'eyJ...';
const EMAILJS_SVC  = 'service_xxxxxx';
const EMAILJS_TPL  = 'template_xxxxxx';
const EMAILJS_KEY  = 'xxxxxxxxxxxxxx';
const SITE_URL  = 'https://kasper.ae/portal'; // or localhost URL
```

---

## Step 4 — Set up EmailJS (quote email to client) (10 minutes)

When ops sends a quote from the mobile app, the system emails the client
an approval link. This uses EmailJS (free, 200 emails/month).

1. Go to **https://emailjs.com** → Sign up (free)
2. **Email Services** → Add New Service → Gmail (or any SMTP)
   - Authorise with your Kasper Gmail account
   - Copy the **Service ID** (e.g. `service_k9abc12`)

3. **Email Templates** → Create New Template
   - Set **To email**: `{{to_email}}`
   - Set **Subject**: `Your Kasper Quote — {{job_code}}`
   - Paste this body:

```
Hi {{to_name}},

Your quote from Kasper Technologies is ready.

Job Reference: {{job_code}}
Service: {{service}}
Quoted Price: {{price}}

{{#if notes}}Additional notes: {{notes}}{{/if}}

This quote is valid for {{valid_hours}} hours.

To approve and confirm your order, click the link below:
{{approve_url}}

If you have any questions, contact us on WhatsApp or reply to this email.

Kasper Technologies FZ-LLC
kasper.ae
```

   - Copy the **Template ID** (e.g. `template_q7xyz99`)

4. **Account → API Keys** → Copy your **Public Key**

5. Paste all three IDs into the config from Step 3.

---

## Step 5 — Test the full flow (10 minutes)

Run through this sequence to verify everything is connected:

**Test 1: Client books → Ops sees it**
1. Open `portal/book.html` in a browser
2. Fill the form (any tab) — use your own email
3. Submit → you should see a job code
4. Open `kasper_mobile_app.html` → tap Operations
5. Dashboard should show "1 New Enquiry" and the job in the list

**Test 2: Ops sends quote → Client gets email + approves**
1. In mobile app (ops), tap the new job
2. Tap "Send Quote" → enter a price (e.g. 1200)
3. Tap "Send Quote + Email Client"
4. Check the email address you used — you should receive the quote email
5. Click the approve link in the email
6. On the approve page, click Approve
7. Back in mobile app → Refresh → job should now show "Confirmed"

**Test 3: Driver marks in transit → Client sees GPS**
1. In mobile app → switch to Driver role
2. Find the job → tap "Start Trip"
3. Open tracking page: `portal/track-result.html?job_id=KSP-XXXXXXXX-XXXX`
4. Timeline should show "In Transit" as active step
5. If you pasted a Traccar link, GPS embed appears

**Test 4: Delivered → ePOD → Invoice**
1. In mobile app (driver), mark job as Delivered
2. On tracking page, the ePOD module should appear
3. Client signs on the tracking page → submits
4. In mobile app (ops), job moves to ePOD Pending
5. Tap "Generate & Send Invoice" — job moves to Invoiced

---

## File list — what changed

```
portal/
├── js/
│   ├── kasper-db.js     ← NEW: Supabase + EmailJS shared client
│   └── app.js           ← UPDATED: all mockDb replaced with Supabase
├── book.html            ← UPDATED: contact fields added + Supabase submit
├── approve.html         ← UPDATED: reads live job from Supabase
├── track-result.html    ← UPDATED: reads live job, GPS, ePOD → Supabase
kasper_mobile_app.html   ← UPDATED: all live data, quote-send modal, assign driver
```

**Unchanged (copy as-is from original):**
```
portal/index.html
portal/track.html
portal/decline.html
portal/404.html
portal/css/style.css
portal/assets/
```

---

## Hosting options

**Local testing:** Open files directly in browser. Works for everything except
the book → track redirect (CORS). Use a local server:
```bash
cd portal
npx serve . -p 3000
# Then open http://localhost:3000
```

**Production hosting (free):**
- Drag the `portal/` folder to **Netlify** (netlify.com) → Deploy
- You get a URL like `https://kasper.netlify.app`
- Update `SITE_URL` in both config files to that URL
- Done.

---

## Troubleshooting

**Jobs not loading in mobile app:**
- Check browser console for errors
- Verify SUPA_URL and SUPA_KEY are correct (no trailing slash on URL)
- Check Supabase: Table Editor → jobs → verify rows exist

**Email not sending:**
- Check browser console for EmailJS errors
- Verify all 3 EmailJS IDs are correct
- Check EmailJS dashboard → Email History for failures
- If client has no email, quote link still works — ops copies and shares it manually

**Approve page shows "Job not found":**
- Verify the job_code in the URL matches exactly what's in Supabase
- Check Supabase: Table Editor → jobs → search for that code

**CORS errors when opening HTML files directly:**
- Use `npx serve` or any local HTTP server instead of file:// protocol

---

## Adding real GPS (optional)

1. Install Traccar on DigitalOcean (see `ARCHITECTURE.md`)
2. In Traccar admin: Devices → Share → copy the shareable link
3. In mobile app (ops): paste link into the job's "Traccar GPS Link" field when assigning driver
4. That URL auto-embeds as an iframe on the client tracking page when status = in_transit
