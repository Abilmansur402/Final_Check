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

### VPS deployment for `winnie.govtech-kz.com`

Use this route when the domain is already wired to the provided VPS and the panel expects the app on port `8023`.

```bash
ssh user@SERVER_IP
git clone https://github.com/YOUR-USER/YOUR-REPO.git
cd YOUR-REPO
docker compose up -d --build
```

The compose stack exposes only the frontend on port `8023`. The Python model API stays private inside the Docker network as `http://api:8000`, and nginx proxies browser requests from `/api/*` to that service.

Check it on the server:

```bash
curl http://localhost:8023
curl http://localhost:8023/api/health
```

Then open:

```text
https://winnie.govtech-kz.com
```

Do not commit the VPS, SSH, S3, or other infrastructure credentials from `Winnie.pdf`. Keep them only in the deployment environment, and rotate them if they were shared publicly.

If Docker is not available for the `winnie` user, use the non-Docker fallback:

```bash
cd hack-ccc78aa3-winnie

cd neooutcome-ai-backend
python3 -m venv .venv
. .venv/bin/activate
pip install -r requirements-demo.txt
nohup python patient_demo.py serve --host 127.0.0.1 --port 8000 > ../backend.log 2>&1 &
cd ..

cd neooutcome-ai
npm ci
VITE_ML_API_URL=/api npm run build
nohup env PORT=8023 HOST=0.0.0.0 API_BASE_URL=http://127.0.0.1:8000 npm run serve:production > ../frontend.log 2>&1 &
cd ..
```

Check the fallback deployment:

```bash
curl http://localhost:8023
curl http://localhost:8023/api/health
tail -n 80 backend.log
tail -n 80 frontend.log
```

### Vercel deployment

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
