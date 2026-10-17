# Elyra

Elyra is now a small multi-app system rather than one website with an `/admin` page.

- `apps/web` — public conversation website (port 3000)
- `apps/admin` — independent administration website (port 3001)
- `packages/shared` — shared contracts/config models for the next backend step

## Install

From the repository root:

```powershell
npm install
npm run typecheck
npm run build
```

## Run locally

Use two PowerShell windows:

```powershell
npm run dev:web
```

```powershell
npm run dev:admin
```

Public site: http://localhost:3000
Admin site: http://localhost:3001

## Current boundary

The public chat still uses the existing rule-based `/api/chat`. The Admin Appearance screen now models background type, image URL, overlay, glass opacity and accent color, with live preview. Cross-application persistence is intentionally not faked with localStorage because Web and Admin are separate origins. The next data step will connect both applications to Firebase so Admin changes persist and the public site reads the same configuration.

## Local appearance workflow
During local development, Admin (`localhost:3001`) can upload/save a background through the Web development API (`localhost:3000`). Uploaded files are stored under `apps/web/public/uploads` and the active appearance is stored in `packages/shared/runtime-site-config.json`. This is intentionally a local-development bridge; Cloud Run deployment will replace it with Firebase Storage + Firestore.

## Database foundation

The API now uses PostgreSQL through Prisma. Local configuration belongs in `services/api/.env` (ignored by Git). Start from `services/api/.env.example`, then run Prisma generate/migrate commands from the repository root using the API workspace.
