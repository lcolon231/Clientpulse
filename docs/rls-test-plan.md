---
title: "RLS Multi-Tenant Isolation Test Plan"
version: 1
---

## Why this exists

ClientPulse uses Postgres Row-Level Security (RLS) as its **primary tenant isolation mechanism** — it is not a belt-and-suspenders measure, it is the only thing standing between one MSP's data and another's. Every RLS policy lives in a single SQL migration (`prisma/migrations/manual/001_rls_policies.sql`), and a mistake there is a data breach, not a UI bug. This test plan exists to prove that isolation works **end-to-end in a real browser session**, not just in theory. It exercises the full stack: Next.js middleware → Supabase Auth JWT → custom org_id claim → Postgres policy evaluation. It is also designed to be screenshot-able for a portfolio case study so the evidence is permanent and reviewable.

---

## Prerequisites

Check every box before starting. A missed prerequisite will produce misleading results.

- [ ] `prisma db push` has been run against your Supabase project and the five tables exist (`organizations`, `users`, `clients`, `devices`, `audit_logs`)
- [ ] `001_rls_policies.sql` has been applied in Supabase SQL Editor (RLS enabled, 9 policies created, both helper functions present)
- [ ] All four verification queries (V1–V4) from the migration return passing results
- [ ] The Custom Access Token Hook is active: Supabase Dashboard → Authentication → Hooks → Custom Access Token → `public.custom_access_token_hook` selected and saved
- [ ] `pnpm dev` is running and `http://localhost:3000` is reachable
- [ ] The database is clean — no existing users, organizations, or client rows from previous test runs (use the Supabase SQL Editor to `TRUNCATE` if needed — see note below)

> **Truncate order matters** (foreign keys): run these in the SQL Editor before each full test run.
> ```sql
> TRUNCATE public.audit_logs, public.devices, public.clients, public.users, public.organizations CASCADE;
> -- Also clear Supabase Auth users:
> DELETE FROM auth.users;
> ```

---

## Test 1 — JWT claim is present

**Purpose:** Confirm that the Custom Access Token Hook fires correctly and embeds `org_id` in the JWT that Supabase issues after sign-up.

### Steps

1. Open `http://localhost:3000/signup` in a **normal browser window**.
2. Sign up with:
   - Email: `owner1@nodelink.test`
   - Password: any strong password (e.g. `NodeLink123!`)
3. After the form submits, confirm you are redirected to `/dashboard` and can see your name and organization name.
4. Open **DevTools → Application tab → Cookies** (Chrome) or **Storage → Cookies** (Firefox).
5. Find the cookie named `sb-<your-project-ref>-auth-token`. Copy its value — it is a JSON string. Inside it, find the `access_token` field and copy **only that value** (a long `eyJ…` string).

> ⚠️ **Do not paste the `refresh_token`.** Refresh tokens are long-lived credentials. The access token is safe to decode for inspection and expires in ~1 hour.

6. Go to [https://jwt.io](https://jwt.io) and paste the `access_token` into the **Encoded** box.
7. Inspect the **Payload** panel on the right.

### Expected result

The decoded payload contains a top-level `org_id` key with a UUID value:

```json
{
  "sub": "xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx",
  "email": "owner1@nodelink.test",
  "org_id": "clxxxxxxxxxxxxxxxxxxxxxxxx",
  ...
}
```

The `org_id` value should match the `id` column in the `organizations` table. Confirm in SQL Editor:

```sql
SELECT id, name FROM public.organizations LIMIT 5;
```

**Record this org_id — you will use it in Tests 2–5.** Call it `OWNER1_ORG_ID`.

### If it fails

`org_id` is missing or `null`. The hook is not firing. Re-check:
- Authentication → Hooks → Custom Access Token → is `public.custom_access_token_hook` selected?
- Did you click **Save** after selecting it?
- Log out and log back in (the hook fires on login, not on the existing cookie).

---

## Test 2 — Two-tenant isolation (the headline test)

**Purpose:** Prove that two separate MSP tenants cannot see each other's client records, even though they share the same database table.

### Steps

1. Open an **Incognito/Private window**. Go to `http://localhost:3000/signup`.
2. Sign up with:
   - Email: `owner2@acme.test`
   - Password: any strong password
3. Confirm owner2 lands on `/dashboard`. Decode their JWT the same way as Test 1 and record their org_id as `OWNER2_ORG_ID`.

4. **Seed a client row for owner1.** In the Supabase SQL Editor (this runs as the Postgres superuser, bypassing RLS — that's intentional for seeding):

   ```sql
   INSERT INTO public.clients (id, name, organization_id, created_at, updated_at)
   VALUES (
     gen_random_uuid(),
     'NodeLink Test Client',
     'OWNER1_ORG_ID',   -- ← replace with the real value from Test 1
     now(),
     now()
   );
   ```

5. **As owner1 (normal window),** query the clients table using the REST API from your browser DevTools console. Navigate to `http://localhost:3000/dashboard`, then open the Console tab and run:

   ```javascript
   // Gets the session from Supabase's localStorage key
   const raw = Object.entries(localStorage).find(([k]) => k.includes('auth-token'))?.[1];
   const token = JSON.parse(raw).access_token;

   const res = await fetch(`${location.origin}/api/test-clients`, {
     headers: { Authorization: `Bearer ${token}` }
   });
   ```

   > **Simpler alternative:** just check the Supabase Table Editor. It uses the service role (bypasses RLS), so it will always show all rows — that's fine for seeding verification, but not for RLS testing. For RLS testing you must go through the anon key + user JWT path.
   >
   > The easiest RLS-correct query is the Supabase JS client. Since the browser client is instantiated in the app, navigate to the dashboard and run this in the console:
   >
   > ```javascript
   > // This assumes the Supabase browser client is not globally exposed (it won't be by default).
   > // Use the fetch approach below instead.
   > ```
   >
   > **Fetch approach (works from any page in the app):**
   > ```javascript
   > const raw = Object.entries(localStorage).find(([k]) => k.includes('auth-token'))?.[1];
   > const token = JSON.parse(raw).access_token;
   > const anonKey = '<NEXT_PUBLIC_SUPABASE_ANON_KEY>';
   > const projectUrl = '<NEXT_PUBLIC_SUPABASE_URL>';
   >
   > const res = await fetch(`${projectUrl}/rest/v1/clients?select=id,name,organization_id`, {
   >   headers: {
   >     'apikey': anonKey,
   >     'Authorization': `Bearer ${token}`,
   >   }
   > });
   > console.log(await res.json());
   > ```

6. **Expected as owner1:** one row — `NodeLink Test Client`.

7. **As owner2 (Incognito window),** repeat the same fetch from the `/dashboard` page, using owner2's token.

8. **Expected as owner2:** empty array `[]`. No rows visible despite the data being in the table.

### Pass condition

owner1 sees `[{ name: "NodeLink Test Client", ... }]`.
owner2 sees `[]`.

The data exists in the table but Postgres filters it before the response leaves the database.

---

## Test 3 — Cross-tenant INSERT is blocked

**Purpose:** Prove that the `WITH CHECK` clause on the `clients` INSERT policy prevents a user from creating rows belonging to a different tenant.

### Steps

1. **Stay in the Incognito window as owner2.** Navigate to `http://localhost:3000/dashboard`.
2. Open DevTools Console and run:

   ```javascript
   const raw = Object.entries(localStorage).find(([k]) => k.includes('auth-token'))?.[1];
   const token = JSON.parse(raw).access_token;
   const anonKey = '<NEXT_PUBLIC_SUPABASE_ANON_KEY>';
   const projectUrl = '<NEXT_PUBLIC_SUPABASE_URL>';

   const res = await fetch(`${projectUrl}/rest/v1/clients`, {
     method: 'POST',
     headers: {
       'apikey': anonKey,
       'Authorization': `Bearer ${token}`,
       'Content-Type': 'application/json',
       'Prefer': 'return=representation',
     },
     body: JSON.stringify({
       id: crypto.randomUUID(),
       name: 'Unauthorized Client',
       organization_id: 'OWNER1_ORG_ID',  // ← owner1's org — should be rejected
       created_at: new Date().toISOString(),
       updated_at: new Date().toISOString(),
     }),
   });

   console.log('status:', res.status);
   console.log('body:  ', await res.json());
   ```

### Expected result

```
status: 403
body:   { code: '42501', details: null, hint: null,
          message: 'new row violates row-level security policy for table "clients"' }
```

The `WITH CHECK` clause evaluates `organization_id::text = requesting_org_id()` against the row owner2 is trying to insert. `OWNER1_ORG_ID ≠ OWNER2_ORG_ID`, so the check fails and Postgres raises `42501` (insufficient_privilege). The client receives a 403 — not a silent empty result, because this is a write operation.

### Confirm the row was not created

```sql
-- In Supabase SQL Editor — this bypasses RLS so it shows everything
SELECT name, organization_id FROM public.clients WHERE name = 'Unauthorized Client';
-- Expected: 0 rows
```

---

## Test 4 — Cross-tenant UPDATE is blocked (re-assignment attack)

**Purpose:** Prove that an attacker cannot "move" their own row into another tenant's org by updating `organization_id`. This is the test that justifies having `WITH CHECK` on the UPDATE policy — `USING` alone would not catch this.

### Steps

1. **As owner2 (Incognito),** first insert a legitimate client row **into owner2's own org**:

   ```javascript
   const raw = Object.entries(localStorage).find(([k]) => k.includes('auth-token'))?.[1];
   const token = JSON.parse(raw).access_token;
   const anonKey = '<NEXT_PUBLIC_SUPABASE_ANON_KEY>';
   const projectUrl = '<NEXT_PUBLIC_SUPABASE_URL>';

   // Step 1: Insert a valid client for owner2
   const insert = await fetch(`${projectUrl}/rest/v1/clients`, {
     method: 'POST',
     headers: {
       'apikey': anonKey,
       'Authorization': `Bearer ${token}`,
       'Content-Type': 'application/json',
       'Prefer': 'return=representation',
     },
     body: JSON.stringify({
       id: crypto.randomUUID(),
       name: 'Acme Legitimate Client',
       organization_id: 'OWNER2_ORG_ID',  // ← owner2's own org — should succeed
       created_at: new Date().toISOString(),
       updated_at: new Date().toISOString(),
     }),
   });
   const [newRow] = await insert.json();
   console.log('Inserted:', newRow);  // capture newRow.id
   ```

2. **Now attempt to re-assign that row to owner1's org:**

   ```javascript
   const update = await fetch(`${projectUrl}/rest/v1/clients?id=eq.${newRow.id}`, {
     method: 'PATCH',
     headers: {
       'apikey': anonKey,
       'Authorization': `Bearer ${token}`,
       'Content-Type': 'application/json',
       'Prefer': 'return=representation',
     },
     body: JSON.stringify({
       organization_id: 'OWNER1_ORG_ID',  // ← attempt to re-assign to owner1's org
     }),
   });

   console.log('status:', update.status);
   console.log('body:  ', await update.json());
   ```

### Expected result

```
status: 403
body:   { code: '42501', message: 'new row violates row-level security policy for table "clients"' }
```

**Why this matters:** The `USING` clause passed (owner2 *can* target that row — it belongs to their org). But `WITH CHECK` evaluates the **post-update** row values: `OWNER1_ORG_ID ≠ OWNER2_ORG_ID` → fail. Without `WITH CHECK` on UPDATE, this attack would silently succeed and owner1 would suddenly have a row they didn't create.

### Confirm the row is unchanged

```sql
SELECT name, organization_id FROM public.clients WHERE name = 'Acme Legitimate Client';
-- Expected: organization_id is still OWNER2_ORG_ID, not OWNER1_ORG_ID
```

---

## Test 5 — Devices isolation through the join

**Purpose:** Prove that the `EXISTS` subquery in the devices policies correctly enforces tenant isolation even though `devices` has no `organization_id` column of its own.

### Steps

1. **In Supabase SQL Editor, seed a device for owner1's client:**

   ```sql
   -- First get owner1's client id
   SELECT id FROM public.clients WHERE organization_id = 'OWNER1_ORG_ID' LIMIT 1;
   -- Record as OWNER1_CLIENT_ID

   INSERT INTO public.devices (
     id, hostname, type, os, os_version,
     last_seen, patch_age_days, tags, client_id,
     created_at, updated_at
   )
   VALUES (
     gen_random_uuid(),
     'ws-nodelink-01',
     'workstation',
     'Windows',
     '11 23H2',
     now(),
     3,
     ARRAY['managed', 'patched'],
     'OWNER1_CLIENT_ID',   -- ← replace with real value
     now(),
     now()
   );
   ```

2. **As owner2 (Incognito), attempt to read all devices:**

   ```javascript
   const res = await fetch(`${projectUrl}/rest/v1/devices?select=id,hostname,client_id`, {
     headers: { 'apikey': anonKey, 'Authorization': `Bearer ${token}` }
   });
   console.log(await res.json());
   // Expected: []
   ```

3. **As owner2, attempt to insert a device referencing owner1's client:**

   ```javascript
   const res = await fetch(`${projectUrl}/rest/v1/devices`, {
     method: 'POST',
     headers: {
       'apikey': anonKey,
       'Authorization': `Bearer ${token}`,
       'Content-Type': 'application/json',
       'Prefer': 'return=representation',
     },
     body: JSON.stringify({
       id: crypto.randomUUID(),
       hostname: 'evil-device',
       type: 'workstation',
       os: 'Linux',
       os_version: '22.04',
       last_seen: new Date().toISOString(),
       patch_age_days: 0,
       tags: [],
       client_id: 'OWNER1_CLIENT_ID',   // ← owner1's client — should be rejected
       created_at: new Date().toISOString(),
       updated_at: new Date().toISOString(),
     }),
   });
   console.log('status:', res.status);       // Expected: 403
   console.log('body:  ', await res.json()); // Expected: 42501 error
   ```

### Expected results

- Read: `[]` — the `EXISTS` join finds no `clients` rows where `organization_id = OWNER2_ORG_ID`, so all device rows are filtered.
- Insert: `403` — `WITH CHECK` runs the same `EXISTS` join and finds no valid parent client for owner2.

---

## Test 6 — Service-role key bypasses RLS (sanity check)

**Purpose:** Confirm that the service-role key sees all rows from all tenants. This is **correct and intentional** — the service role is used server-side for audit log writes, sync jobs, and admin operations. Verifying it works proves RLS is not misconfigured in a way that also blocks the server.

### Steps

Create a temporary script at the project root (delete it after testing):

```typescript
// scripts/test-service-role.ts
// Run with: npx tsx scripts/test-service-role.ts
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,  // service role — bypasses RLS
);

const { data, error } = await supabase.from('clients').select('id, name, organization_id');

console.log('All clients across all tenants:');
console.log(JSON.stringify(data, null, 2));
console.log('Error:', error);
// Expected: all rows visible — NodeLink Test Client AND Acme Legitimate Client
```

Run it:
```bash
# From the project root, with .env.local populated
npx tsx scripts/test-service-role.ts
```

> **Install tsx if needed:** `pnpm add -D tsx`
> **Delete the script after testing** — it has no place in production code.

### Expected result

Both client rows appear in the output — one belonging to `OWNER1_ORG_ID`, one to `OWNER2_ORG_ID`. The service role sees all tenants. This is the correct behavior and is what makes server-side audit logging and future integration syncs possible.

---

## Screenshot checklist (portfolio case study)

Capture these in order while running the tests above:

- [ ] **JWT payload** — jwt.io showing the decoded `access_token` with `org_id` present (Test 1, step 7)
- [ ] **Two-tenant isolation** — side-by-side: owner1's console showing `[{ name: "NodeLink Test Client" }]` and owner2's console showing `[]` (Test 2, steps 6–8)
- [ ] **Blocked INSERT** — browser console showing `status: 403` and the `42501` error body for the cross-tenant insert attempt (Test 3)
- [ ] **All 9 policies** — Supabase SQL Editor showing the V2 verification query result: 4 rows for clients, 4 for devices, 1 for audit_logs (from migration verification)
- [ ] **Blocked UPDATE** — console showing the re-assignment attempt failing with `42501`, and the follow-up SQL confirming `organization_id` was not changed (Test 4)

---

## Sign-off

```
Tested on [YYYY-MM-DD], by [your name], commit [git rev-parse --short HEAD]
```

Re-run this plan after any change to `001_rls_policies.sql` or the Prisma schema, and update the sign-off line.
