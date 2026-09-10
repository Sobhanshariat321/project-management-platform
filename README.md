# Project Management Platform

Monorepo for **SOBA-35** — full-stack Project Management Platform (React + Express + Postgres + Prisma). Infra owned by **SOBA-41** (DevOps).

## Stack

| Layer | Choice |
|-------|--------|
| Frontend | React 19 + Vite 6, React Router 6, TanStack Query 5, Zustand, Tailwind 3.4 |
| Backend | Node 22 LTS + Express 4 + TypeScript (strict) |
| DB | PostgreSQL 16 (Docker `postgres:16-alpine`) + Prisma 6 |
| Auth | JWT httpOnly cookie (access 15m + refresh 7d rotation) + bcryptjs |
| Validation | Zod 3 (shared `packages/shared`) |

Architecture: [SOBA-37 doc](/SOBA/issues/SOBA-37#document-architecture) · Spec: SOBA-36 · DB: SOBA-38 · Design: SOBA-39

---

## Fresh-clone setup (MacBook)

Prereqs: Node 22 LTS, npm 10+, Docker Desktop **or** OrbStack.

```bash
# 1 — clone & install
git clone <repo> && cd <repo>
npm install

# 2 — env (never commit .env)
cp .env.example .env
# edit .env if you want different secrets — defaults work for local dev

# 3 — database
docker compose up -d          # starts postgres:16-alpine on :5432 (pgdata volume)
npm run db:migrate            # prisma migrate dev — creates tables
npm run db:seed               # idempotent seed: 3 users, 1 workspace, 1 project, 12 tasks, labels

# 4 — dev (two terminals or one)
npm run dev                   # concurrently: server :4000 + client :5173 (Vite proxies /api → :4000)
# or separately:
# npm run dev --workspace=server
# npm run dev --workspace=client

# 5 — verify
curl http://localhost:4000/api/health
open http://localhost:5173
```

**Fresh-clone one-liner** (after Docker is running):

```bash
docker compose up -d && npm run db:migrate && npm run db:seed && npm run dev
```

### Useful commands

| Command | What it does |
|---------|--------------|
| `npm run db:migrate` | `prisma migrate dev` (creates/updates migration + regenerates client) |
| `npm run db:seed` | `tsx prisma/seed.ts` — idempotent demo data |
| `npm run db:reset` | `prisma migrate reset --force` — drop, re-migrate, re-seed |
| `npm run db:studio` | Prisma Studio on :5555 |
| `npm run db:generate` | `prisma generate` |
| `npm run build` | generates Prisma client, then builds `packages/shared` → `server` → `client` (client emits `client/dist/`) |
| `npm run typecheck` | generates Prisma client, builds `@repo/shared` first, then `tsc --noEmit` per workspace |
| `npm run lint` | oxlint per workspace (if installed) |
| `npm run start` | `node server/dist/server.js` (after build) |
| `docker compose down` | stop DB (add `-v` to wipe pgdata) |
| `docker compose up -d --build` | production-ish via `docker-compose.prod.yml` |

### Env vars

All vars validated at boot via `server/src/config/env.ts` (Zod, fail-fast). See `.env.example`.

- `DATABASE_URL` must match `POSTGRES_*` (default `postgresql://app:app@localhost:5432/appdb?schema=public`).
- `JWT_*_SECRET` — 32+ random chars in prod (`openssl rand -base64 32`).
- `CLIENT_ORIGIN` — Vite origin for CORS (default `http://localhost:5173`). In prod, set to your deployed frontend URL.
- `VITE_API_BASE` — frontend API base (default `/api`, Vite proxy handles it in dev).

### Docker notes (MacBook)

- Apple Silicon native (`postgres:16-alpine` multi-arch). OrbStack is a lighter alternative to Docker Desktop — both work.
- Healthcheck: `pg_isready` every 5s, 10 retries. If `docker compose up` hangs, check RAM (`shared_buffers 128MB` by default; 8GB Air is fine).
- Volume `pgdata` persists between restarts. `docker compose down -v` wipes it.

### Production build

```bash
npm run build
# client: client/dist/ (static)
# server: server/dist/ (node)
# shared: packages/shared/dist/

# Docker production
docker compose -f docker-compose.prod.yml up -d --build
# or single image:
docker build -t pmp:latest .
docker run -p 4000:4000 --env-file .env pmp:latest
# runner does: prisma migrate deploy && node server/dist/server.js
```

In prod, set `NODE_ENV=production`, `secure:true` cookies (https), and real `DATABASE_URL` (managed Postgres: Railway/Neon/Supabase — same Prisma client).

### Troubleshooting

- `DATABASE_URL` connection refused → `docker compose ps` — is `pmp-db` healthy? `docker compose logs db`.
- `JWT_*_SECRET must be >=16 chars` → fill `.env` from `.env.example`.
- Prisma `Can't reach database` after sleep → `docker compose restart db`.
- Port in use (`EADDRINUSE :4000` or `:5173`) → change `PORT` / Vite port or `lsof -i :4000`.
- `prisma generate` not run → `npm run db:generate`.

### Repo layout

```
.
├── docker-compose.yml        # Postgres 16 for local dev
├── docker-compose.prod.yml   # db + app production
├── Dockerfile                # multi-stage (node:22-alpine)
├── .env.example              # committed template
├── package.json              # npm workspaces + root scripts
├── packages/shared/          # Zod schemas + TS types (single source of truth)
├── server/
│   ├── src/                  # app.ts, server.ts, config/env, lib/prisma, middleware
│   └── prisma/               # schema.prisma + seed.ts + migrations/
└── client/                   # Vite React (proxy /api → :4000)
```

Existing `calculator-app/` and `pomodoro-focus-timer/` are unrelated examples preserved in-repo.
