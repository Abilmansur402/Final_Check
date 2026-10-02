# NeoOutcome AI

NeoOutcome AI is a research/demo NICU decision-support prototype. This repository contains both the React frontend and the local Python demo inference API.

> Research/demo only. Do not use this project for clinical decisions, diagnosis, treatment, triage, or real patient care.

## Repository layout

```text
neooutcome-ai/          React + Vite frontend
neooutcome-ai-backend/  Local Python XGBoost demo API
```

## What is safe to upload

Safe for this public GitHub repository:

- Source code in `neooutcome-ai/` and `neooutcome-ai-backend/`.
- Synthetic demo files named `SYN-NICU-0001...` in `neooutcome-ai/public/demo/`.
- `.env.example` with placeholders only.
- The small demo model artifact `neooutcome-ai-backend/neooutcome_xgb.joblib`, if it was trained only for demonstration and contains no patient-identifying records.

Do not upload:

- Real patient CSV, XLSX, JSON, PDF, DOCX, screenshots, exports, database dumps, or raw EHR/monitoring files.
- Any file containing patient names, IIN/passport numbers, dates of birth, phone numbers, addresses, MRNs, encounter IDs, admission notes, diagnoses tied to a real person, or clinician notes from real care.
- `.env`, `.env.local`, Supabase service_role keys, database passwords, API keys, SSH keys, VPS credentials, S3 access keys, or cloud config files.
- The `Winnie.pdf` file from the Desktop. It contains infrastructure credentials and must stay out of GitHub.

If a secret or real patient file was ever committed, rotate the secret or remove the repository immediately. Deleting it in a later commit is not enough for public repositories.

## Local setup

Frontend:

```powershell
cd neooutcome-ai
npm install
npm run dev
```

Backend demo API:

```powershell
cd neooutcome-ai-backend
pip install -r requirements-demo.txt
python patient_demo.py serve --host 127.0.0.1 --port 8000
```

Open the protected intake workflow at:

```text
http://127.0.0.1:5173/intake
```

## GitHub upload

From this folder:

```powershell
git init
git add .
git commit -m "Initial NeoOutcome AI monorepo"
git branch -M main
git remote add origin https://github.com/YOUR-USER/YOUR-REPO.git
git push -u origin main
```

## Deployment and domain

Recommended setup:

1. Push this repository to GitHub.
2. Import it in Vercel.
3. Set the Vercel Root Directory to `neooutcome-ai`.
4. Use:
   - Framework Preset: `Vite`
   - Build Command: `npm run build`
   - Output Directory: `dist`
5. Add frontend environment variables in Vercel:
   - `VITE_ML_API_URL`
   - `VITE_SUPABASE_URL` if using Supabase
   - `VITE_SUPABASE_PUBLISHABLE_KEY` if using Supabase

For a custom domain in Vercel:

1. Open the Vercel project.
2. Go to Settings -> Domains.
3. Add your domain, for example `neooutcome.kz` or `app.neooutcome.kz`.
4. In your domain registrar DNS settings, add the records Vercel shows.
   - For an apex/root domain, Vercel usually asks for an `A` record.
   - For a subdomain like `app.neooutcome.kz`, Vercel usually asks for a `CNAME`.
5. Wait for DNS verification and HTTPS certificate provisioning.

Deploy the Python ML API separately on a private backend service. Do not expose real patient inference endpoints publicly without authentication, authorization, audit logging, encryption, and institutional approval.

