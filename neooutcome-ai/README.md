Ссылка на сайт : https://neooutcome-ai-phi.vercel.app

# NeoOutcome AI — NICU Clinical Decision Support (Frontend)

A production-oriented frontend for **NeoOutcome AI**, a critical-care
decision-support system for NICU clinicians. It pairs an individual **24-hour
outcome prediction** view with an analytical **regional insight** dashboard,
designed around a *cognitive-load-balanced*, safety-first UX.

> **NeoOutcome AI is a decision-support tool. Clinical judgment takes priority.**
> This disclaimer is rendered as a permanent Safety Header on every page.

## Tech stack

- **React 19 + TypeScript**
- **Vite 6** (build/dev)
- **Tailwind CSS 3** + shadcn/UI-style component primitives (Radix UI)
- **Recharts** for medical data plotting
- **Lucide React** for iconography
- **React Router** for view switching

## Getting started

```bash
npm install
npm run dev        # start dev server (http://localhost:5173)
npm run build      # typecheck + production build
npm run lint       # eslint
npm run typecheck  # tsc project references, no emit
```

## Patient Intake demo

The protected `/intake` screen demonstrates a synthetic clinical workflow:

1. Upload the bundled CSV/JSON/PDF or select **Загрузить демо-пациента**.
2. Send the exact 31-feature vector to the local XGBoost API.
3. Review model risk, operating threshold, feature contributions and clinician review prompts.
4. Create an internal follow-up appointment without eGov integration.

The explanation panel uses TreeSHAP contributions returned by the XGBoost model. It shows the model baseline, the signed contribution of the strongest features, the summed raw margin and the final sigmoid probability. SHAP values are shown in log-odds, not as percentage points; the final percentage is what is compared with the operating threshold.

Start the trained-model API from the sibling `neooutcome-ai-backend` project before running inference:

```powershell
cd ..\neooutcome-ai-backend
python patient_demo.py serve --host 127.0.0.1 --port 8000
```

Then start this frontend from `neooutcome-ai` and open `http://127.0.0.1:5173/intake`. Demo documents are served from `public/demo`.

The appointment is intentionally stored in browser `localStorage` for the prototype. A clinical deployment must replace this with an authenticated backend, role-based access control, audit history, encryption and the institution's approved scheduling workflow.

## Safe deployment

This repository is frontend-only. The Vercel project should use:

```text
Framework preset: Vite
Build command: npm run build
Output directory: dist
```

The Python ML service must be deployed separately on a private service. Set `VITE_ML_API_URL` in Vercel to that service URL. Do not upload `ml/artifacts`, PhysioNet/PICDB files, `data/`, `.env`, CSV exports or real patient documents to GitHub or Vercel.

Supabase is used for database, Auth and RLS, not as a replacement for the Vercel frontend host. Run `supabase/schema.sql` in the Supabase SQL Editor. When `VITE_SUPABASE_URL` and `VITE_SUPABASE_PUBLISHABLE_KEY` are configured, the site uses Supabase Auth and saves appointments to `public.appointments`; without those variables it remains in safe local demo mode.

The `.env.example` file contains placeholders only. Put real values in Vercel Environment Variables or a local untracked `.env.local`; never commit `service_role` keys.

## UI/UX logic flow — presenting complex medical data safely

The interface is built to **reduce operator error** and avoid *alarm fatigue*:

1. **Safety first, always visible.** A permanent, non-intrusive Safety Header
   states that the tool supports — never replaces — clinical judgment.
2. **Non-alarming risk encoding.** Risk is shown on a soft **Mint → Amber →
   Muted Coral** gradient (`--risk-low/moderate/elevated/high`) rather than
   harsh red alerts, so elevated risk reads as *attention needed* not *panic*.
   The same scale is reused everywhere (gauge, indicator, charts, map) so a
   color means the same thing on every screen.
3. **Progressive disclosure.** Clinicians land on a **Welcome Dashboard**
   (ward-at-a-glance) before deep-diving into an individual patient. Within a
   patient, the headline number (Outcome Gauge) comes first, then the
   *why* (SHAP contributions), then the raw context (vitals).
4. **Explainability over black-box scores.** The SHAP waterfall shows how each
   factor moves the prediction from the model baseline, and every factor exposes
   a plain-language **Clinical Insight** so the number is auditable.
5. **Legibility.** Tabular numerals, large touch targets for bedside tablets,
   and high-density layouts for workstations (responsive grid/flex).
6. **Actionability with guardrails.** "Flag for Review" enqueues a task with an
   explicit priority and note, and the dialog reminds staff it does not replace
   direct escalation for emergencies.

## Dashboard layout (skeleton)

```
┌───────────────────────── Safety Header (permanent) ─────────────────────────┐
├──────────┬──────────────────────────────────────────────────────────────────┤
│ Side     │  Topbar: page title · Live-stream status · theme toggle          │
│ Rail     ├──────────────────────────────────────────────────────────────────┤
│ (nav)    │  <Outlet/> — switchable view                                     │
│ Welcome  │   • Welcome:  stat cards grid + patient list + risk distribution │
│ Patient  │   • Patient:  [roster | gauge + SHAP | vitals context sidebar]   │
│ Regional │   • Regional: filters + stats + map/table + comparison trend     │
└──────────┴──────────────────────────────────────────────────────────────────┘
```

Layout uses responsive CSS Grid/Flexbox: the side-rail collapses to a top
`MobileNav` on small screens, and content columns reflow to single-column.

## Core components

| Component | Responsibility |
| --- | --- |
| `layout/SafetyHeader.tsx` | Permanent clinical disclaimer |
| `layout/DashboardContainer.tsx` | Shell hosting the switchable views + nav + theme |
| `patient/RiskIndicator.tsx` | Compact, highly legible risk-score widget |
| `patient/RiskGauge.tsx` | The primary "Outcome Gauge" (24h risk) |
| `patient/SHAPWaterfall.tsx` | Interactive feature-contribution waterfall + insights |
| `patient/VitalsPanel.tsx` | Live vitals + HR sparkline |
| `patient/PatientCard.tsx` | Patient summary card / roster row |
| `patient/FlagForReview.tsx` | Actionability → hypothetical review queue |
| `regional/RegionalMap.tsx` | Choropleth tile-map of Kazakhstan regions |
| `regional/RegionTable.tsx` | Dense tabular view of regional metrics |
| `regional/RegionalTrendChart.tsx` | Facility trend + Regional-average comparison |
| `dashboard/StatCard.tsx` | KPI summary tiles |

## State strategy — live stream vs. static analytics

The app deliberately separates two data lifecycles:

- **Live streamed patient data** — hot, mutating. Managed by
  `hooks/useLivePatients.tsx`, which simulates a bedside monitor feed and
  re-publishes vitals on an interval. Every patient view subscribes to this
  provider and re-renders on each tick. The header exposes a Live/Pause toggle.
- **Static analytical dataset (AshyqData layer)** — cold, immutable. Regional
  metrics live in `data/regional.ts` and are imported directly where needed.
  They never stream, which keeps the live-vs-static boundary explicit and
  prevents analytical panels from re-rendering on vitals ticks.

The `lib/reviewQueue.ts` stub represents the backend task-queue integration.

## Notes

All patient and regional data in this repo is **synthetic mock data** for
demonstration only.
