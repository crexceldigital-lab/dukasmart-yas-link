## Pro Plan for Duka Smart — Implementation Plan

A subscription tier (TZS 8,000/month) layered on top of the existing client-side state model, with the same Mixx by Yas mock payment flow reused for billing.

### 1. Data model (client-side store, mirrors existing pattern)

Extend the merchant/duka store (likely `src/lib/duka/store.ts` or similar — will confirm on read):
- `plan: 'free' | 'pro'` (default `'free'`)
- `proRenewalDate: string | null`
- `customSlug: string | null`
- `staffPhones: string[]` (max 2)
- Helper selectors: `isPro()`, `effectiveSlug()` (customSlug ?? duka_id)

Customers: derived client-side by grouping existing transactions by buyer phone — no new persisted table. Expose `useCustomers()` hook returning `{ phone, name, totalSpent, purchaseCount, lastPurchase }[]` sorted by totalSpent desc.

### 2. Shared primitives

- `src/components/duka/ProBadge.tsx` — gold pill (#F5A623), white "PRO", 9px bold, rounded.
- `src/components/duka/ProUpgradeModal.tsx` — bottom sheet matching existing modal style. Feature list with Check icons, price block, "Lipa kwa Mixx by Yas" button, reuses the existing Mixx pending/success/failed states. On success: set plan='pro', renewalDate = now+30d, toast.
- `src/components/duka/ProLockOverlay.tsx` — frosted blur + Lock icon + "Pro Feature" + small "Pandisha" button that opens the upgrade modal.
- `useProGate()` hook — `{ isPro, requirePro(action) }` that opens the upgrade modal when a Free user hits a gated action.

All copy goes through the existing `useI18n` hook (SW/EN keys added to `src/lib/duka/i18n.tsx`).

### 3. Mixx payment reuse

Locate the existing buyer Mixx flow (likely in `src/routes/pay.$slug.tsx` and a helper in `src/lib/duka/*`). Extract the state machine (idle → pending → confirmed/failed with retry) into a reusable hook `useMixxCharge({ phone, amount, label })` that both the buyer page and the Pro upgrade modal consume. The upgrade modal calls it with the merchant's own phone, amount 8000, label "Duka Smart Pro - Mwezi 1".

### 4. Akaunti page (`src/routes/akaunti.tsx`)

Top of page:
- Free → light upgrade card with PRO icon, heading, subtext, full-width "Pandisha Sasa" button.
- Pro → navy-gradient card with PRO badge, "Mwanachama wa Pro", renewal date, "Simamia Usajili" link → small modal with plan details + "Ghairi Usajili" (sets plan back to free).

Below business info form, Pro only:
- Custom slug field with live validation (regex `^[a-z0-9-]{3,30}$`), uniqueness check against other merchants in store, real-time availability indicator, save button.

Hide business-info edit + staff management UI for non-owner staff logins.

### 5. Dashboard (`src/routes/index.tsx`)

New "Wateja Wako" card below Top Products:
- Pro: top 5 customers from `useCustomers()`, "Tazama Wote" link to `/wateja`.
- Free: same card visually but wrapped in `ProLockOverlay`.

PRO badge next to business name in top bar (via `Shell`).

### 6. Products page (`src/routes/bidhaa.tsx`)

- Pro: unlimited products. On 21st add for Free, show upgrade modal (replaces generic error).
- Pro: low-stock badge ("Stoki Inaisha") on cards where `stockCount <= 5` and tracking enabled; dismissible banner at top counting low items.
- Add "Katalogi ya PDF" button (Pro only, Free shows lock → upgrade modal) using `jspdf` + `jspdf-autotable` (install if missing) to generate a branded PDF of all products with photo, name, price, business name/logo header.

### 7. Payment Link Modal (`src/components/duka/PaymentLinkModal.tsx`)

Add third tab "Wingi" (Bulk):
- Free: tab shows lock icon, tap → upgrade modal.
- Pro: select product or custom amount, repeating rows of name+phone (Add Buyer up to 50), "Tengeneza Viungo Vyote" generates a list; each row has WhatsApp share, plus a "Share All" that opens share intents sequentially with a small delay.

### 8. New routes

- `src/routes/wateja.tsx` — full customer list (Pro-gated; Free redirected with upgrade modal). Search input, sorted list, tap row → simple detail view of that buyer's purchases.

### 9. Public payment page (`src/routes/pay.$slug.tsx`)

- Resolve slug against both `customSlug` and `duka_id` (custom first).
- Show PRO badge next to business name when merchant is Pro.

### 10. Staff logins (lightweight)

- Login flow (OTP) accepts any phone in owner's `staffPhones` and signs them in scoped to that merchant_id with a `role: 'staff'` flag in session.
- Staff: hide Akaunti edit form, hide staff management, hide subscription management; everything else works.
- Owner gets a "Wafanyakazi" section in Akaunti (Pro only) to add/remove up to 2 phone numbers.

### Technical Details

- All visual styling uses existing navy/green/yellow tokens from `src/styles.css` — no new colors.
- All new strings added to `src/lib/duka/i18n.tsx` under SW/EN.
- PDF library: `jspdf` (small, client-side, Worker-safe — only used in browser).
- All Pro gating routes through `useProGate()` so behavior stays consistent.
- No backend changes — state persists in the existing client store (localStorage-backed, same as current merchant/product/transaction data).

### Files to create
- `src/components/duka/ProBadge.tsx`
- `src/components/duka/ProUpgradeModal.tsx`
- `src/components/duka/ProLockOverlay.tsx`
- `src/components/duka/ManageSubscriptionModal.tsx`
- `src/lib/duka/useProGate.ts`
- `src/lib/duka/useMixxCharge.ts` (extracted)
- `src/lib/duka/useCustomers.ts`
- `src/lib/duka/pdfCatalogue.ts`
- `src/routes/wateja.tsx`

### Files to edit
- `src/lib/duka/store.ts` (plan, renewal, customSlug, staffPhones, customers selector)
- `src/lib/duka/i18n.tsx` (new SW/EN keys)
- `src/components/duka/Shell.tsx` (PRO badge in top bar)
- `src/components/duka/PaymentLinkModal.tsx` (Wingi tab)
- `src/routes/akaunti.tsx` (upgrade card, custom slug, staff section)
- `src/routes/index.tsx` (customer database card)
- `src/routes/bidhaa.tsx` (unlimited cap, low-stock, PDF button)
- `src/routes/pay.$slug.tsx` (custom slug resolution, PRO badge)
- `src/routes/login.tsx` (staff phone acceptance)
- `src/styles.css` (PRO badge token if needed)

### "Done" verification
After implementation I'll exercise: upgrade flow end-to-end, 21st product gate, customer database (with and without Pro), bulk link generation, custom slug resolution on `/pay/:slug`, low-stock badge/banner, PDF catalogue, and staff login scoping.
