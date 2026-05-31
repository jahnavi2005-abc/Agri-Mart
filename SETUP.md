# AgriMart Local Setup

## Requirements

- Node.js 20+
- npm
- PostgreSQL 14+
- Supabase project for auth
- Optional: AWS S3, SMTP, Razorpay test account

## Environment Files

Do not commit real `.env` files. They contain secrets.

1. Copy `backend/.env.example` to `backend/.env`.
2. Fill database, Supabase, SMTP, AWS, and Razorpay values.
3. Copy `frontend/.env.example` to `frontend/.env.local`.
4. Fill the frontend Supabase anon key and Razorpay public key.

## Backend

```bash
cd backend
npm install
node --env-file=.env db/setup.js
node --env-file=.env db/run_supabase_migration.js
node --env-file=.env db/run_phase3_migration.js
node --env-file=.env db/run_fts_migration.js
node --env-file=.env db/run_phase4_migration.js
node --env-file=.env db/run_phase5_migration.js
npm run seed
npm start
```

The backend reads `backend/.env` through `npm start`, which runs:

```bash
node --no-warnings --env-file=.env server.js
```

Some helper modules also call `dotenv.config()`, so run backend commands from the `backend` folder.

## Frontend

```bash
cd frontend
npm install
npm run dev -- --host 127.0.0.1
```

Open the URL printed by Vite, usually `http://127.0.0.1:8080/`.

## Before Pushing To GitHub

Check that no real env files or dependencies are staged:

```bash
git status --short
git check-ignore -v backend/.env frontend/.env.local backend/node_modules frontend/node_modules
```

If a real secret was already committed before, remove it from Git history and rotate that secret.

## Pushing Frontend And Backend In One Repo

This project should be pushed from the project root, `AgriMart`, if you want one GitHub repo containing both `backend` and `frontend`.

If Git shows only `frontend` as one entry, or shows it as mode `160000`, then `frontend` is still a nested Git repository. The root repo will not push the frontend files normally until you remove the nested frontend Git metadata.

Run this from the project root only if you want `frontend` to be a normal folder in the same repo:

```powershell
cd D:\AgriMart
Move-Item frontend\.git frontend\.git.backup
git rm --cached frontend
git add frontend
git add backend .gitignore SETUP.md agrimart_project_docs.md improvements.txt
git commit -m "Add frontend and backend project files"
git push origin main
```

After you confirm GitHub has the frontend files, you can delete `frontend\.git.backup`.

## Why Frontend Has Env Values

The frontend cannot read `backend/.env` directly because browser code runs on the user's machine. Vite only exposes variables prefixed with `VITE_`, and those values are public in the built frontend.

Keep secrets only in `backend/.env`. Frontend env values must be public config only, for example:

```env
VITE_SUPABASE_URL=...
VITE_SUPABASE_ANON_KEY=...
VITE_RAZORPAY_KEY_ID=...
VITE_RAZORPAY_ENABLED=true
```

Never put service-role keys, database passwords, AWS secret keys, SMTP passwords, or Razorpay secret keys in frontend env files.
