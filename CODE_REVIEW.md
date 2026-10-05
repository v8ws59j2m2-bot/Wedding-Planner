# Full Code Review: Wedding-Planner (GitHub Clone)

> Historical snapshot from 18 June 2026. It is not the operating guide. The live site now stores planner data in Supabase after sign-in. Use `docs/MAINTENANCE.md` and `docs/ARCHITECTURE.md`.

**Date**: 2026-06-18  
**Repo**: https://github.com/v8ws59j2m2-bot/Wedding-Planner  
**App**: Vite + React 19 + TypeScript + Supabase (local-first with migration path)  
**Purpose**: All-in-one planner for Jamie & Beth's destination wedding in Canggu, Bali (April 2028). Features guests, budget, seating, accommodation, mood board, itinerary, etc.  
**Storage**: Primarily localStorage + optional Supabase sync/auth. Data exported as JSON.

## Summary
This is a well-featured, thoughtfully designed local-first wedding planning tool tailored to a specific real-world use case (destination wedding with villas, currency mix, group activities). The architecture cleanly separates local and remote storage for future migration. UI is polished with good use of drag-and-drop, charts, and templates.

**Strengths**:
- Excellent domain modeling for wedding logistics (parties, rooms, events, payments).
- Strong focus on data portability (JSON/Excel export/import, templates).
- Progressive enhancement toward Supabase (migration page, separated services).
- Practical features like currency conversion, quota warnings, guided tour.
- Security headers in Netlify config.
- Good TypeScript types with legacy migration notes.

**Overall Verdict**: Solid foundation (8/10). Ready for personal use but has several areas needing hardening before broader sharing or production-like reliability. Main risks: data loss (localStorage), security (plaintext + client auth), and some brittle legacy code. The xlsx dependency has unfixable high-severity vulns.

**Key Recommendations**:
- Prioritize data backup UX and warnings.
- Audit and document Supabase RLS policies.
- Consider migrating away from xlsx or sandboxing it.
- Add tests for critical paths (import/export, drag-drop, sync).
- Clean up dual dnd libraries.
- Version the data schema explicitly.

## Issues

### Issue 1 — Severity: bug
- **File**: src/main.tsx:15-27
- **Description**: Manual parsing of Supabase auth token from localStorage using a fragile key derived from `import.meta.env.VITE_SUPABASE_URL`. This bypasses the official Supabase client session handling, risks desync, and exposes the app to token tampering or expiration edge cases not handled by the SDK.
- **Suggestion**: Rely solely on `supabase.auth.getSession()` and `onAuthStateChange`. Remove the custom `getInitialSession` logic and storage key construction.
- **Status**: open

### Issue 2 — Severity: bug
- **File**: src/lib/supabaseData.ts:22-47 (and similar load functions)
- **Description**: `loadAppData` and others use `.single()` without proper error handling for "no rows" cases (PGRST116). Returns defaults silently on any error, potentially hiding connection or permission issues. Also, userId check returns defaults without auth.
- **Suggestion**: Use `.maybeSingle()` and distinguish between "no data" (expected for new users) and real errors. Add better logging or user-facing errors. Ensure RLS allows anon reads for user-owned data or use proper auth.
- **Status**: open

### Issue 3 — Severity: bug
- **File**: src/services/dataService.ts:63-76 (writeJSON)
- **Description**: Quota errors are caught and an event dispatched, but the write is lost. No retry, no partial save, no user notification beyond the banner in some places. Large mood board base64 images easily trigger this.
- **Suggestion**: Implement a more robust storage layer (e.g., IndexedDB for images, or chunked saves). Show persistent warnings and force export on quota events.
- **Status**: open

### Issue 4 — Severity: bug
- **File**: src/lib/supabaseData.ts + useSupabaseStorage.ts (multiple places)
- **Description**: Migration logic for legacy `name` / `adults` / `children` fields is duplicated between local dataService and Supabase loader. Inconsistent handling can lead to data corruption during migration.
- **Suggestion**: Centralize migration in one place (e.g., a `migrateLegacyData` function called after load). Remove legacy fields from types after migration path is complete.
- **Status**: open

### Issue 5 — Severity: bug
- **File**: src/pages/SeatingChart.tsx:54-64 (and similar in Accommodation)
- **Description**: Falls back to localStorage on Supabase load failure, but save prefers Supabase and only falls back on error. Race conditions possible between local and remote. No conflict resolution.
- **Suggestion**: Decide on a single source of truth per session (auth = Supabase, no auth = local). Implement proper sync or last-write-wins with timestamps.
- **Status**: open

### Issue 6 — Severity: suggestion
- **File**: package.json (xlsx ^0.18.5)
- **Description**: The `xlsx` dependency has known high-severity vulnerabilities (prototype pollution, ReDoS) with no fix available. All guest/budget/vendor Excel import/export goes through it.
- **Suggestion**: Sandbox the library (e.g., in a Web Worker), replace with a safer alternative like `exceljs` or server-side processing if possible, or accept the risk and document it prominently.
- **Status**: open

### Issue 7 — Severity: suggestion
- **File**: src/lib/supabase.ts:3-15
- **Description**: Throws synchronously on missing env vars at import time. This crashes the entire app in dev if .env is missing. No graceful fallback.
- **Suggestion**: Make env vars optional for local-only mode. Use Vite's `import.meta.env` with proper typing and dev-mode warnings.
- **Status**: open

### Issue 8 — Severity: suggestion
- **File**: src/main.tsx:17-27 and throughout
- **Description**: Heavy direct use of localStorage for auth tokens, tour state, migration flags, etc. Bypasses React state and can cause hydration issues or stale data.
- **Suggestion**: Consolidate all persistent state through the existing storage hooks/services. Use React Context or a proper store.
- **Status**: open

### Issue 9 — Severity: suggestion
- **File**: src/App.tsx and pages (many)
- **Description**: Inline styles in several places (QuotaBanner, loading screens, etc.) instead of CSS modules or Tailwind. Inconsistent with the rest of the UI.
- **Suggestion**: Move to Tailwind classes or a design system for maintainability.
- **Status**: open

### Issue 10 — Severity: suggestion
- **File**: src/hooks/useSupabaseStorage.ts:33-51 (debounce)
- **Description**: Debounced save at 800ms on every `setData`. No batching, no conflict detection on concurrent edits (even with auth).
- **Suggestion**: Use Supabase realtime for multi-user, or add optimistic UI + server reconciliation. Increase debounce or batch changes.
- **Status**: open

### Issue 11 — Severity: nit
- **File**: src/types.ts (many legacy fields with @deprecated)
- **Description**: Types are polluted with backward-compat fields (`name`, `adults`, `children`, etc.). Makes the API confusing.
- **Suggestion**: Keep a separate `LegacyGuest` type internally during migration only. Clean up after one release.
- **Status**: open

### Issue 12 — Severity: nit
- **File**: netlify.toml
- **Description**: Good security headers, but no CSP defined. Allows inline scripts/styles which could be risky with user-uploaded images or future features.
- **Suggestion**: Add a strict Content-Security-Policy header.
- **Status**: open

### Issue 13 — Severity: bug
- **File**: src/pages/MoodBoard.tsx (inferred from types + README + quota code)
- **Description**: Images stored as base64 data URLs in localStorage / JSON. This quickly hits 5-10MB quotas on mobile and bloats exports/backups.
- **Suggestion**: Store images in IndexedDB or Supabase Storage with URLs. Keep only metadata + thumbnails in the main data.
- **Status**: open

## Other Observations
- **Architecture**: Clean separation between data layer and UI is excellent preparation for full Supabase migration. The "local first" design is appropriate for the stated use case.
- **Dependencies**: Mix of modern (dnd-kit, Radix, Tailwind 4 via Vite) and transitional libs. Two dnd solutions in use — consolidate.
- **Testing**: No tests visible. Critical paths (import, drag-drop assignment, sync, currency conversion) should be covered.
- **Accessibility**: Uses Radix primitives (good), but many custom components and inline event handlers. Test with screen readers.
- **Performance**: Fine for small wedding (34 pax), but base64 + no virtualization will degrade with larger lists or many images.
- **Deployment**: Netlify config is minimal and secure. Consider adding preview deploys and env var validation in build.
- **i18n / Currency**: Hardcoded GBP/IDR focus is fine for this wedding but limits reuse.

## Recommendations Priority
1. Fix data loss / quota risks (highest user impact).
2. Harden Supabase security (RLS, env handling).
3. Address the xlsx vulns.
4. Improve error handling and migration robustness.
5. Add tests and consolidate duplicate logic.
6. Clean legacy code and dual libraries.

Run `npm audit` regularly. Consider Dependabot for dependency updates.

Review file written to: /Users/jamiedepport/Wedding-Planner/CODE_REVIEW.md

**Final Verdict**: Promising app with strong domain fit. Address the data persistence and security gaps before relying on it for the real wedding planning. The migration path to Supabase is a smart long-term bet. 

If you provide more specific focus (e.g., only security, only UI components, or a particular page), I can deepen the review.