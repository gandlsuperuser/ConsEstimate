# Project review and submittal repair — 2026-09-11

## Scope and architecture

Reviewed the Next.js App Router structure, project layout and project APIs, shared workflow persistence, submittal page/API/types, database schemas, and project-wide build/type/lint results. The app has estimating, expenses, bidding/contracts, drawings, submittals/RFIs, change management, billing, scheduling, and reporting modules. This was not an end-to-end functional certification of every module.

Projects and the project layout require Supabase. Many later workflow modules use `src/lib/workflow-store.ts`, which catches database failures and substitutes a process-local cache backed by a JSON file. Its file write errors are ignored. This is not reliable persistence on a serverless deployment. A successful database read can also hide records created only in that cache.

## Confirmed submittal problems and repair

- The configured Supabase database returned `PGRST205`: `public.submittals` was missing. Its schema existed in the repository but had not been applied. Applied `migrations/20260911_create_submittals.sql` to that database through its dashboard. The migration is included for other environments and inherits access from visible parent projects.
- Submittal CRUD now uses Supabase directly. Storage failures return HTTP 503, missing records return 404, invalid requests return 400, and updates/deletes are scoped to a project. An empty database result stays empty instead of reviving stale fallback data.
- Creation uses the saved database response, resets the active filter to All, displays success, and prevents concurrent submissions. Failed saves keep the form and values available. Status updates use the confirmed database response and display errors.
- All supported review statuses are represented in the filter and review control. Loading state, accessible input labels, a scrollable dialog, non-negative lead times, and cents in substitution costs are supported.
- Automatic submittal numbers use UUIDs instead of a collision-prone three-digit random number.

## Verification

- Production build and TypeScript check passed.
- Focused lint passed for changed application files; regression tests are available via `npm run test:submittals`.
- Regression tests cover create/read across handler instances, status persistence, project isolation, delete/empty results, invalid fields/JSON, and database failures.
- Browser test against the configured database: selected Approved, created a pending submittal with a blank number, confirmed immediate visibility, reloaded, changed status to Approved as Noted, reloaded, and verified persistence. Removed only that temporary test record through the API and verified deletion.
- Browser error test before schema installation confirmed that a failed save shows an error and retains the entered values.
- Existing local `data/workflow_store.json` changes were excluded from this repair. Its submittals collection was empty; no local submittal migration was needed.

## Findings outside this fix

- Initial full-project lint reported 94 errors and 59 warnings, including explicit `any`, React hook rules, and render-time impurity. The full project is not lint-clean.
- Other workflow modules still use the silent fallback storage described above and need separate persistence work before their successful API responses can be treated as proof of a durable save.
- The base schema allows public project access and the app has no user sign-in flow. The new submittal policy follows existing project visibility; it does not introduce tenant or role authorization.

## Other environments

Apply `migrations/20260911_create_submittals.sql` in the Supabase SQL editor for the database identified by `NEXT_PUBLIC_SUPABASE_URL` before releasing this code. The base `public.projects` table must already exist. The migration creates only the missing submittal table/index/access policy and reloads the API schema cache. A Git push alone does not apply database migrations.

If an older environment has submittals only in `data/workflow_store.json`, back up and import those records into Supabase with their original IDs before switching to this API. Do not overwrite existing database records with stale cache data.
