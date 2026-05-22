# Week 3 Manual Test Plan — ClientPulse

**Branch:** `main` | **Commit:** `e4173984d212f9b2868f27e6919a086ec36d758b`  
**Covers:** Goals 2–6 — Client CRUD, Device CRUD, CSV Import, UI Polish, Audit Log

---

## Setup

1. Confirm the dev server is running at [http://localhost:3000](http://localhost:3000).
2. Open **two browsers** (or one normal + one private/incognito window):
   - **Browser A** — Tenant A owner session
   - **Browser B** — Tenant B (incognito) — a completely separate org
3. Use believable demo org names and real-looking data throughout. Suggested:
   - Tenant A org: **Riverside Dental Group**
   - Tenant B org: **Summit Logistics LLC**
   - Client names: "Harbor Pediatrics", "Mesa Accounting", "Blue Ridge Law"
   - Do NOT use `test@test.com`, `test org`, or lorem ipsum — this is portfolio material.

---

## Section 1 — Tenant A Happy Path

Work entirely in **Browser A** for this section.

### 1.1 — Sign up and land on dashboard

1. Navigate to `http://localhost:3000/signup`.
2. Create an account using a real-looking email (e.g. `admin@riversidedental.com` or your real email).
3. Complete any email confirmation if required.
4. **Expected:** Land on the `/dashboard` page. The sidebar shows navigation items. No errors in the browser console.

---

### 1.2 — Navigate to Clients — empty state

1. Click **Clients** in the sidebar.
2. **Expected:**
   - URL is `/clients`.
   - Breadcrumb reads: **Dashboard › Clients**.
   - Page shows the empty state card: "No clients yet" with an "Add your first client" button.
   - The "New Client" button appears in the top-right.

---

### 1.3 — Create a client

1. Click **New Client** (top-right button). The sheet slides in from the right.
2. Fill in:
   - **Name:** `Harbor Pediatrics`
   - **Industry:** `Healthcare`
   - **SLA Tier:** `Premium`
   - **Primary Contact:** `Dr. Sarah Chen`
   - **Notes:** `Requires HIPAA-compliant handling. Monthly check-ins with IT lead.`
3. Click **Create Client**.
4. **Expected:**
   - A green success toast appears: "Client created successfully".
   - The sheet closes.
   - The client table now shows **Harbor Pediatrics** with a purple **Premium** SLA badge.
   - The breadcrumb and "1 client total" count update.

---

### 1.4 — Open the client detail page

1. Click on **Harbor Pediatrics** (the name link) or the **View** button.
2. **Expected:**
   - URL is `/clients/<id>?tab=overview` (or just `/clients/<id>`).
   - Breadcrumb reads: **Dashboard › Clients › Harbor Pediatrics**.
   - Four tabs are visible: **Overview**, **Devices**, **Tickets**, **Reports**.
   - The **Overview** tab is active by default.
   - The info card shows: Industry (Healthcare), SLA Tier (Premium badge), Primary Contact (Dr. Sarah Chen), Notes (your text), Created date, Last Updated date.
   - The **Tickets** tab shows "Ticket integration coming soon."
   - The **Reports** tab shows "Reports available after health scoring is configured."
   - Clicking a tab changes the URL (`?tab=devices`, etc.) without a full page reload.

---

### 1.5 — Edit the client

1. Click the **Edit** button (pencil icon, top-right of the detail page).
2. The edit sheet slides in pre-populated with the current values.
3. Change **SLA Tier** from `Premium` to `Enterprise`.
4. Change **Primary Contact** to `Dr. Sarah Chen / IT: Marcus Webb`.
5. Click **Save Changes**.
6. **Expected:**
   - A success toast: "Client updated successfully".
   - The sheet closes.
   - The SLA badge in the page header **immediately updates** to an amber **Enterprise** badge (no manual refresh needed).
   - The Overview card also reflects the new SLA tier and primary contact.

---

### 1.6 — Add a device manually

1. Click the **Devices** tab. The URL changes to `?tab=devices`.
2. The empty state shows: "No devices yet — add one manually or import from CSV."
3. Click **Add Device**.
4. Fill in:
   - **Hostname:** `wks-chen-01.riverside.local`
   - **Type:** `Workstation`
   - **OS:** `Windows`
   - **OS Version:** `11`
   - **Last Seen:** today's date
   - **Patch Age (days):** `12`
   - **Tags:** type `hipaa` and press Enter, then type `finance` and press Enter
5. Click **Add Device**.
6. **Expected:**
   - Success toast: "Device added successfully".
   - The devices table appears showing `wks-chen-01.riverside.local`.
   - Type column shows a badge: `Workstation`.
   - Patch age shows `12d` in **green** (≤30 days = green).
   - Tags show `hipaa` and `finance` as colored chips.
   - Last Seen shows "today".

> **Patch age color coding to verify:**
> - ≤30 days → green
> - 31–90 days → amber
> - >90 days → red

---

### 1.7 — CSV template download and import

1. Click **Import CSV** (next to Add Device).
2. Click **Download template**. Verify `devices-template.csv` downloads with the correct columns: `hostname, type, os, os_version, last_seen, patch_age_days, tags`.
3. Edit the template (or create a new CSV) with 3 rows:
   ```csv
   hostname,type,os,os_version,last_seen,patch_age_days,tags
   srv-dc01.riverside.local,Server,Windows,Server 2022,2026-05-01,45,domain-controller
   wks-webb-01.riverside.local,Workstation,Windows,11,2026-05-20,3,finance
   INVALID_ROW,,,,,,
   ```
   > Row 3 is intentionally invalid (missing hostname and type).
4. Drop or upload the file in the import sheet.
5. **Expected (preview step):**
   - File name appears in the summary bar.
   - Badge shows: **2 valid** | **1 invalid**.
   - The invalid row is highlighted in red; the Status column shows the error reason (e.g. "hostname required, type required").
   - The footer button reads: "Import 2 valid rows".
   - A note says "1 invalid row will be skipped."
6. Click **Import 2 valid rows**.
7. **Expected (after import):**
   - Toast: "Imported 2 devices, 1 skipped due to errors."
   - The sheet closes.
   - The devices table now shows 3 total devices.
   - `srv-dc01` shows patch age `45d` in **amber** (31–90 days).
   - `wks-webb-01` shows patch age `3d` in **green**.

---

### 1.8 — Delete a device, then delete the client

**Delete a device:**
1. Click the trash icon on `wks-chen-01.riverside.local`.
2. The delete confirmation dialog appears: "Delete wks-chen-01.riverside.local?" + "This will permanently remove this device. This cannot be undone."
3. Click **Delete Device**.
4. **Expected:** Toast "wks-chen-01.riverside.local removed". Device disappears from the table.

**Delete the client:**
1. Click the **Delete** button (destructive, top-right of the detail page). Only visible because you are an OWNER.
2. The AlertDialog appears: "Are you sure?" + "This will delete all devices associated with **Harbor Pediatrics**. This cannot be undone."
3. Click **Delete Client**.
4. **Expected:**
   - Toast: "Harbor Pediatrics deleted".
   - Redirected to `/clients`.
   - The clients list is empty again.

---

## Section 2 — Validation and Error Handling

Stay in **Browser A**.

### 2.1 — Submit create-client form empty

1. Click **New Client** to open the sheet.
2. Clear the Name field (if pre-filled) and click **Create Client** immediately.
3. **Expected:**
   - The form does NOT submit.
   - Inline error appears below the Name field: "Name must be at least 2 characters" (or "Required").
   - No toast appears. Sheet stays open.

### 2.2 — Name too short (1 character)

1. In the Name field, type `A`. Click **Create Client**.
2. **Expected:** Inline error: "Name must be at least 2 characters."

### 2.3 — Notes over 500 characters

1. Fill in a valid name. Paste 501+ characters into the Notes field. Click **Create Client**.
2. **Expected:** Inline error on the Notes field mentioning the 500-character limit.

### 2.4 — CSV import with malformed file

1. Open **Import CSV** on the Devices tab.
2. Upload a CSV that is missing the `hostname` column entirely (e.g. only has `type,os`):
   ```csv
   type,os
   Server,Windows
   Workstation,macOS
   ```
3. **Expected:**
   - All rows flagged as invalid (hostname required).
   - The "Import" button is disabled (0 valid rows).
   - No rows are imported.

---

## Section 3 — Multi-Tenant Isolation ⚠️ Critical Security Test

### 3.1 — Tenant B sees an empty org

1. In **Browser B** (incognito), navigate to `http://localhost:3000/signup`.
2. Sign up as a new user with a different email and org name (**Summit Logistics LLC**).
3. **Expected:** After sign-up, Tenant B lands on an empty dashboard and an empty `/clients` list with no data from Tenant A.

### 3.2 — Tenant B cannot see Tenant A's clients

1. While logged in as Tenant B, go to `/clients`.
2. **Expected:** Empty state — "No clients yet." Zero rows from Tenant A visible.

### 3.3 — Direct URL access to Tenant A's client (THE headline security test)

1. In **Browser A**, open any of Tenant A's client detail pages. Copy the client ID from the URL:
   ```
   http://localhost:3000/clients/<tenant-a-client-id>
   ```
2. In **Browser B**, paste that URL into the address bar and navigate to it.
3. **Expected:** **404 page** — Next.js `notFound()` fires. Tenant B sees NO data from Tenant A.
4. **Failure condition (must not happen):** If Tenant B sees Tenant A's client data, this is a critical RLS bypass.

> **Screenshot this result** — both the URL in the browser bar and the 404 page. This is the portfolio money shot.

### 3.4 — Cross-tenant write isolation

1. As **Tenant B**, create a client: `Summit HQ`.
2. Switch to **Browser A** (Tenant A). Refresh `/clients`.
3. **Expected:** Tenant A's client list does NOT show "Summit HQ". Only Tenant A's own clients appear.

---

## Section 4 — Role-Based UI (OWNER / TECHNICIAN / READONLY)

> If you have only one user per org at this stage, note the gaps rather than marking them as failures.

### 4.1 — OWNER can see all buttons

As the OWNER (your current Tenant A account):
- The **New Client** button is visible on the clients list.
- The **Edit** and **Delete** buttons are visible on the client detail page.
- The **Add Device** and **Import CSV** buttons are visible on the devices tab.
- **Expected:** All buttons present. ✅

### 4.2 — READONLY hides write actions (if testable)

If you can create a READONLY user (via Supabase dashboard — update the `role` column on a second user in `public.users`):
- Log in as that user.
- **Expected:** No "New Client", no "Edit", no "Delete", no "Add Device", no "Import CSV" buttons.
- **Known gap if untested:** Role UI enforcement confirmed in code but not browser-tested. Defer to a later week's user-management feature.

---

## Section 5 — Audit Log Verification

After completing Sections 1–3, run these queries in the **Supabase SQL Editor** (`Project → SQL Editor → New query`).

### 5.1 — Confirm all action types are present

```sql
SELECT
  action,
  entity_type,
  count(*) AS count
FROM audit_logs
GROUP BY action, entity_type
ORDER BY entity_type, action;
```

**Expected rows** (after running all Section 1 and 3 tests):

| action | entity_type | count |
|---|---|---|
| CLIENT_CREATE | Client | ≥2 |
| CLIENT_DELETE | Client | ≥1 |
| CLIENT_UPDATE | Client | ≥1 |
| DEVICE_CREATE | Device | ≥1 |
| DEVICE_DELETE | Device | ≥1 |
| DEVICE_IMPORT | Device | ≥1 |

---

### 5.2 — Verify org isolation in audit rows

```sql
SELECT
  al.action,
  al.entity_type,
  al.entity_id,
  al.organization_id,
  al.user_id,
  al.metadata,
  al.created_at
FROM audit_logs al
ORDER BY al.created_at DESC
LIMIT 20;
```

**Check:**
- Every row has a non-null `organization_id`.
- Every row has a non-null `user_id` (matches the user who performed the action).
- Tenant A's rows all share the same `organization_id`.
- Tenant B's rows have a **different** `organization_id`.
- No row has a `null` or mismatched org.

---

### 5.3 — Verify metadata payload

```sql
SELECT action, metadata
FROM audit_logs
WHERE entity_type = 'Client'
ORDER BY created_at DESC
LIMIT 5;
```

**Expected metadata shapes:**
- `CLIENT_CREATE`: `{ "name": "Harbor Pediatrics" }`
- `CLIENT_UPDATE`: `{ "name": "Harbor Pediatrics" }`
- `CLIENT_DELETE`: `{}` (empty object — client name already gone)

```sql
SELECT action, metadata
FROM audit_logs
WHERE entity_type = 'Device'
ORDER BY created_at DESC
LIMIT 10;
```

**Expected metadata shapes:**
- `DEVICE_CREATE`: `{ "hostname": "wks-chen-01.riverside.local", "clientId": "<id>" }`
- `DEVICE_IMPORT`: `{ "count": 2, "skipped": 1, "clientId": "<id>" }`
- `DEVICE_DELETE`: `{ "clientId": "<id>" }`

---

### 5.4 — Confirm audit_logs RLS is write-only from server

```sql
-- RLS check: audit_logs table should have exactly 1 policy (SELECT for org members)
-- Writes bypass RLS via Prisma's service connection
SELECT policyname, cmd, qual
FROM pg_policies
WHERE schemaname = 'public'
  AND tablename = 'audit_logs';
```

**Expected:** One policy — a SELECT policy for org members. No INSERT/UPDATE/DELETE policies (writes come from the server action, not from the client JWT).

---

## Screenshot Checklist

Capture these screenshots for the portfolio case study:

| # | What to capture | Why it matters |
|---|---|---|
| 1 | Clients list with SLA badge colors (Basic/Standard/Premium/Enterprise all visible) | Shows the full SLA system |
| 2 | Client detail page — Overview tab with all metadata fields filled in | Shows the data model in action |
| 3 | Client detail page — Devices tab with all 3 patch-age colors visible | Shows health monitoring UX |
| 4 | CSV import sheet — preview step with valid + invalid rows flagged | Shows data validation |
| 5 | Create-client form with inline Zod validation errors showing | Shows form validation |
| 6 | **Tenant B browser: 404 on Tenant A's client URL** | **THE security test — headline shot** |
| 7 | Tenant A client list after Tenant B creates a client (Tenant A sees nothing new) | Confirms write isolation |
| 8 | Supabase SQL Editor — audit log query results showing all 6 action types | Confirms audit trail |
| 9 | Supabase SQL Editor — metadata column showing correct payloads | Confirms audit correctness |
| 10 | Mobile viewport (DevTools responsive mode) — Devices tab with horizontal scroll | Shows responsive design |

---

## Sign-Off Block

```
Tested on: _________________ (date)
Commit:    e4173984d212f9b2868f27e6919a086ec36d758b
Tester:    _________________ (name / browser)
Result:    [ ] PASS  [ ] FAIL  [ ] PASS WITH NOTES

Section 1 — Tenant A happy path:     [ ] Pass  [ ] Fail  Notes: _______________
Section 2 — Validation:               [ ] Pass  [ ] Fail  Notes: _______________
Section 3 — Multi-tenant isolation:   [ ] Pass  [ ] Fail  Notes: _______________
Section 4 — Roles:                    [ ] Pass  [ ] Fail  Notes: _______________
Section 5 — Audit log:                [ ] Pass  [ ] Fail  Notes: _______________

Known gaps (not failures):
- [ ] TECHNICIAN/READONLY UI test deferred — no multi-user management UI yet
- [ ] No automated E2E tests yet (Playwright/Cypress planned for later)

Sign-off: ___________________________________  Date: __________
```
