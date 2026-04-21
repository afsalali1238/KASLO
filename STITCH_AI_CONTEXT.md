# Kasper Logistics SaaS MVP — Project Architecture & Context Document

## 1. High-Level Overview
This project is an ultra-fast, multi-tenant logistics Software-as-a-Service (SaaS) platform built for the B2B construction tech vertical.
Its primary objective is to manage the end-to-end freight lifecycle: **Enquiry → Quote Approval → PO Approval → Dispatch → Tracking → ePOD (Electronic Proof of Delivery) → Invoicing**.

**Tech Stack:**
*   **Framework:** None. Pure Vanilla HTML5 & JavaScript for maximum performance and zero build/compilation time.
*   **Styling:** Custom Vanilla CSS utilizing CSS Variables (`style.css`) for a highly themeable (Kasper Core Teal vs. Al Hamd Vendor Amber), robust dark-mode design system. No Tailwind or third-party CSS libraries. 
*   **Backend/Database:** Supabase (PostgreSQL) directly accessed via REST API calls from the frontend using the `KasperDB` wrapper object.
*   **Hosting:** Vercel (static deployment).

## 2. Directory Structure
```text
/kasper_connected
├── assets/                  # Static media, icons, and mock maps
├── css/
│   └── style.css            # Global stylesheet, CSS variables, and layout systems
├── docs/                    # Internal documentation and strategy files
├── js/
│   └── app.js               # Global JavaScript Logic, Supabase fetch wrapper, State Manager
├── migrations/              # SQL files for Supabase database schema setup
├── index.html               # Public Landing Page & Booking Intake Form
├── approve.html             # Client-facing Quotation Approval flow
├── track.html               # Public tracking search interface
├── track-result.html        # Public shipment details, GPS mock, and ePOD sign-off
├── ops.html                 # The Single Page App (SPA) for Operations & Drivers
├── 404.html                 # Error page
└── decline.html             # Quote decline intake page
```

## 3. Routing & Pages Map

| Route / URL | Core Functionality | Data Fetching & State |
| :--- | :--- | :--- |
| `/index.html` | Homepage. Showcases value proposition. Contains the core **Freight/Equipment Booking Form**. | **State:** No fetch. **Submit:** Posts new job to Supabase with `status='enquiry'` and defaults to Kasper `vendor_id`. |
| `/track.html` | Tracking portal landing. User inputs their `job_code`. | **State:** Reads `kasper_last_job` from `localStorage` to pre-fill search input. Passes ID via URL params. |
| `/track-result.html?job_id=XYZ` | Displays specific job timeline, GPS map module, documents list, and embedded ePOD canvas. | **State:** Fetches single job from Supabase. Relies purely on URL parameter `job_id`. |
| `/approve.html?job_id=XYZ` | Hosted checkout/approval screen for clients to review quoted price and submit PO. | **State:** Fetches single job from Supabase via URL param. Transitions job `status` to `po_pending`. |
| `/ops.html` | Complex SPA containing the **Login Portal**, **SaaS Ops Dashboard**, and **Driver App**. | **State:** heavily JS driven. Maintains an internal state object `state { view, vendor_id, jobs[] }`. Fetches list of jobs filtering by `vendor_id`. |

## 4. Global State & Context
Because the system avoids heavy frameworks, it uses a hybrid state management philosophy:

*   **URL Query Parameters (Prop Drilling via URL):** Used strictly for public-facing client pages (Tracking, Approval). `app.js` parses constraints using `window.location.search`.
*   **Local Storage (Persistence):** Used across the board to save API boundaries. `kasper_user` tracks logged-in demo state for `ops.html`. `kasper_last_job` ensures recent public bookings are remembered. 
*   **Global Wrapper (`app.js` -> `KasperDB`):** The `KasperDB` object is globally attached to `window`. It orchestrates all HTTP requests to `REST Supabase`, formatting the output.
*   **Virtual DOM State (`ops.html`):** Inside `ops.html`, an internal constant `state` acts functionally similar to a generic reducer. Instead of React hooks, interacting with a button mutates `state` and immediately calls the vanilla `render()` function, completely redrawing the required UI container via `innerHTML` or precise appending techniques.

## 5. Key Components & Vanilla DOM Engine
The UI does not use JSX. In `ops.html`, UI structures are built using native `document.createElement()` wrappers for speed:
*   `el(tag, props)`: Generates DOM elements natively.
*   `txt(tag, text, class)`: Generates a text DOM node.
*   `renderOpsJobs()`: Generates the highly responsive grid tracking jobs from Enquiries to Delivered.
*   `renderTopBar(title, onBack, right)`: Universal responsive navigation bar handling dynamic text routing.
*   `forceNextStep(job)`: A critical demo-only utility that synthetically ages a job through the `STATUS_PIPELINE`.

## 6. External Integrations
*   **Supabase (REST API):** Main data store for all jobs, vendors, and clients. Accessed purely via `fetch()`. (No heavy `@supabase/supabase-js` library dependency).
*   **EmailJS:** Integrated externally to handle mock email routing for "Sent Quote" triggers.
