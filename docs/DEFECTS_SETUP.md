# A/C Defects — Setup & Operations

The **A/C Defects** module adds authenticated defect browsing + an AMOS PDF
upload/parse/publish pipeline to BAV AMT Toolkit. Fuel Calc, MEL, ECAM+ and
CAAV remain fully public and are unaffected.

> Status of this branch: the parser engine, domain logic, database schema and
> frontend client foundation are implemented and unit-tested. The interactive
> Defects UI, auth screens, `/api` functions and AI provider are wired against
> the interfaces documented here — see **Remaining work** at the bottom.

---

## Architecture

- **Frontend** (Vite/React, deployed on Vercel) — the existing PWA. New module
  under `src/features/defects/`. Uses only `VITE_SUPABASE_URL` +
  `VITE_SUPABASE_ANON_KEY`.
- **Supabase** — email/password auth, Postgres (RLS), private Storage bucket
  `defect-pdfs`, approval workflow, defect data + history + audit.
- **Vercel serverless functions** (`/api`) — everything needing the service role
  or heavy parsing: PDF download, parse, AI normalize, publish (transaction),
  corrections, 30-day PDF cleanup, user approval/role changes.

Secrets that must **never** reach the client: `SUPABASE_SERVICE_ROLE_KEY`,
`OPENAI_API_KEY`, `ANTHROPIC_API_KEY`, `CRON_SECRET`. The Vite bundle only ever
imports `src/lib/supabase.ts` (anon key). Server-only code (`parser/extractText.ts`,
`/api/**`) is never imported by client code, so pdfjs/service-role never bundle.

---

## 1. Supabase project setup

1. Create a project at https://supabase.com.
2. Project Settings → API: copy the **Project URL**, **anon public** key and
   **service_role** key.

## 2. Run migrations

Using the Supabase SQL editor (simplest) or the CLI:

```bash
# CLI option
supabase link --project-ref <ref>
supabase db push          # applies supabase/migrations/0001_defects_init.sql
```

Or paste `supabase/migrations/0001_defects_init.sql` into the SQL editor and run.
This creates all tables, enums, the pending-profile trigger, RLS policies, the
approval/role RPCs and the private `defect-pdfs` bucket + policies.

## 3. Private bucket

The migration creates bucket `defect-pdfs` (private). Confirm under Storage that
it is **not public**. No further action needed.

## 4. Auth settings

Authentication → Providers → **Email**: enabled. Disable other providers unless
needed. Add your production + `http://localhost:5173` URLs to Auth → URL
Configuration (redirect allow-list).

## 5. Email confirmation / reset password

- **Confirm email**: recommended ON for production. During pilot you may turn it
  off so testers can sign in immediately (they will still be `pending`).
- **Reset password**: enabled by default; the "Forgot password" link uses
  Supabase's recovery email. Customise templates under Auth → Email Templates.

## 6. Bootstrap the first Admin

New signups are always `role=viewer, approval_status=pending`. Promote your own
account once, via the SQL editor (service-role context — safe):

```sql
update public.profiles
set role = 'admin', approval_status = 'approved', approved_at = now()
where email = 'you@bambooairways.com';
```

Thereafter use the in-app **Manage → Users** screen; only admins can grant
`uploader`/`admin`, and uploaders can approve `viewer`s only. These rules are
enforced in the database RPCs, not just the UI.

## 7. Vercel environment variables

Set in Vercel Project → Settings → Environment Variables (Production + Preview):

| Variable | Scope | Notes |
|---|---|---|
| `VITE_SUPABASE_URL` | Build | Project URL |
| `VITE_SUPABASE_ANON_KEY` | Build | anon key |
| `SUPABASE_URL` | Server | Project URL |
| `SUPABASE_SERVICE_ROLE_KEY` | Server | **secret** |
| `AI_PROVIDER` | Server | `gemini` \| `none` |
| `AI_MODEL` | Server | default `gemini-2.5-flash` |
| `GEMINI_API_KEY` | Server | **secret**, PAID/no-train project; never `VITE_` |
| `CRON_SECRET` | Server | protects the cleanup endpoint |
| `APP_TIMEZONE` | Server | `Asia/Ho_Chi_Minh` |

## 8. AI provider

The deterministic parser is always the first pass (free, offline, private). An
AI provider is an **optional cleanup step** for aircraft the coordinate-band
parser mis-reads (statement drifting between columns, several ADD ids merged
into one card). It runs **server-side only**; the key is never bundled.

`AI_PROVIDER=none` runs parser-only — the app never crashes without a key; the
uploader gets *"AI chưa được bật — dùng bản nháp của parser và chỉnh tay."* and
edits the draft manually.

**Approved providers (both PAID / no-train):**

- **OpenAI** (recommended — simplest billing). Paid platform account; API data
  is **not** used for training by default. Set `AI_PROVIDER=openai`,
  `OPENAI_API_KEY` (a real `sk-…` key), `AI_MODEL` (default `gpt-4o-mini`;
  `gpt-4.1-mini` is a slightly stronger, still-cheap alternative).
- **Gemini** — MUST be a PAID project (the free AI Studio tier may train on the
  data). Set `AI_PROVIDER=gemini`, `GEMINI_API_KEY` (`AIza…`), `AI_MODEL`
  (default `gemini-2.5-flash`).

Module `src/features/defects/services/ai/` — `getAiProvider(env)` selects
openai/gemini/none; providers are swappable without DB/UI changes.

### Evaluate cleanup quality on real data before wiring the pipeline

A live eval runs the configured provider over the committed sample fixtures and
prints a draft-vs-AI comparison per aircraft. It is **skipped** unless a key is
present, so normal `vitest run` never calls the network. Put the key in env (do
**not** paste it into source), then:

```powershell
# OpenAI:
$env:AI_PROVIDER = "openai"; $env:OPENAI_API_KEY = "sk-..."
npx vitest run extract.eval
# or Gemini:
$env:AI_PROVIDER = "gemini"; $env:GEMINI_API_KEY = "AIza..."
npx vitest run extract.eval
```

It only reads fixtures and prints; it writes nothing. Cost is a few cents at
most (small inputs). See `services/ai/extract.eval.test.ts`.

## 9. PDF cleanup scheduling

Original PDFs are retained 30 days; parsed defects/history/audit are kept
indefinitely. `POST /api/defects/cleanup` (guarded by `CRON_SECRET`) deletes the
Storage object, sets `pdf_deleted_at`, and audit-logs it — without touching
parsed data. Schedule daily via Vercel Cron (`vercel.json`):

```json
{ "crons": [{ "path": "/api/defects/cleanup", "schedule": "0 18 * * *" }] }
```

Vercel Cron sends the secret via header; the endpoint also runs from the Admin →
Maintenance "Run cleanup" button. Cleanup logic is scheduler-independent.

## 10. Local development

```bash
cp .env.example .env.local   # fill in the four Supabase values
npm install
npm run dev
```

## 11. Sample PDFs

Place the two AMOS exports at `sample/ADD B DEFECT LIST.pdf` and
`sample/ADD C DEFECT LIST.pdf`. This folder is **git-ignored** (real maintenance
data is never committed). Regenerate the parser test fixtures after replacing
them:

```bash
node scripts/extract_defect_fixture.mjs "sample/ADD B DEFECT LIST.pdf" b
node scripts/extract_defect_fixture.mjs "sample/ADD C DEFECT LIST.pdf" c
```

The committed fixtures under `src/features/defects/parser/__fixtures__/` contain
extracted text runs only (no PDF binary), used by the unit tests.

## 12. Running tests

```bash
npm test          # full suite incl. parser + defects domain logic
npm run build     # tsc --noEmit + vite build
```

## 13. Deployment checklist

- [ ] Migration applied; `defect-pdfs` bucket private.
- [ ] Email auth on; redirect URLs allow-listed.
- [ ] All env vars set in Vercel (server vars not exposed to client).
- [ ] First Admin bootstrapped.
- [ ] Cron scheduled for `/api/defects/cleanup`.
- [ ] `npm run build` green; no service-role/AI key in the client bundle.

## 14. Security checklist

- [ ] RLS enabled on every table (migration does this); pending/rejected/
      suspended users cannot read defects.
- [ ] All sensitive writes go through the service role in `/api`, never the
      browser.
- [ ] PDF upload validates MIME + magic bytes + size; UUID storage paths.
- [ ] All API input validated with Zod.
- [ ] No `dangerouslySetInnerHTML`; descriptions are escaped.
- [ ] Publish runs in a DB transaction and is idempotent.

## 15. Known limitations

- **Part Request data is intentionally not parsed** (spec scope reduction).
- AMOS `Open Defects = N` counts limit **rows**; a multi-limit (Day/FH/FC)
  defect is shown as **one grouped card**, so the viewer card count can be lower
  than the header. Reconciliation compares the header against the parsed **row**
  count, so this does not raise a false COUNT_MISMATCH.
- FH/FC remaining values are shown as reported; the app never infers aircraft
  current FH/FC.
- OCR is not used (reports are text-based); a near-empty text layer would need a
  future OCR fallback.

---

## Remaining work (this branch)

Implemented + unit-tested: navigation, deterministic parser
(`parser/parseDefects.ts`), domain logic (`logic/*`), DB migration, Supabase
browser client. **Not yet wired:** the viewer UI (aircraft list/detail/cards),
auth screens, Manage/upload flow, `/api` functions and the AI provider
implementation. These consume the interfaces above and the `Defect`/`ParsedReport`
models in `src/features/defects/`.
