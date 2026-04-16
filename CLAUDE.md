# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

**Plutos** is a personal financial management system with a Node.js/TypeScript backend and a React/TypeScript frontend.

## Development Commands

### Backend (`/backend`)

```bash
# Start database (required before running the API)
docker-compose up -d

# Run in dev mode (hot reload)
npm run dev              # http://localhost:3333

# Database
npm run db:migrate       # apply migrations (also generates Prisma client)
npm run db:generate      # regenerate Prisma client without migrating
npm run db:studio        # open Prisma Studio GUI

# Type check
npx tsc --noEmit
```

### Frontend (`/frontend`)

```bash
npm run dev              # http://localhost:5173 (proxies /api → localhost:3333)
npm run build            # tsc + vite build
npm run lint
```

## Architecture

### Backend — Clean Architecture

```
src/
  domain/         # Entities (TypeScript types) + repository interfaces (contracts)
  application/    # Use cases — all business logic lives here
  infra/          # Prisma client singleton + concrete repository implementations
  interfaces/     # Express controllers, routes, JWT middleware, error handler
  server.ts       # Entry point: wires Express, mounts all routes
```

**Data flow:** `routes → controller → use case → repository interface → Prisma repository`

Controllers are thin: they parse/validate with Zod, call the use case, and delegate errors to the global `errorHandler` middleware via `next(err)`.

Repository interfaces live in `domain/repositories/` and are implemented in `infra/database/repositories/`. Use cases depend only on the interfaces, never on Prisma directly.

### Frontend — React + Vite

```
src/
  hooks/          # One hook file per resource: useAccounts, useCategories, useTransactions, useReports, useAuth
  services/api.ts # Axios instance with JWT interceptor; auto-redirects to /login on 401
  types/index.ts  # Shared TypeScript types mirroring backend entities
  components/ui/  # shadcn/ui components (Button, Card, Dialog, Select, Badge, Toast, etc.)
  components/layout/ # Sidebar + AppLayout (wraps all authenticated pages via <Outlet>)
  pages/          # One folder per route: auth/, dashboard/, accounts/, categories/, transactions/, reports/
  App.tsx         # Router setup: public routes (login/register) + private routes under AppLayout
```

**Data fetching:** All server state uses `@tanstack/react-query`. Each resource hook (e.g. `useAccounts`) exports both query hooks and mutation hooks. Mutations invalidate related query keys including `['accounts']` and `['reports']` since transactions affect balances.

**Auth:** JWT stored in `localStorage` (`plutos:token`, `plutos:user`). `AuthProvider` (in `useAuth.tsx`) wraps the app and exposes `login`, `register`, `logout`. The Axios interceptor attaches the token to every request.

### Database

PostgreSQL via Prisma. All entities use UUID primary keys. Key design decisions:

- `Account.balance` is a `Decimal(15,2)` — always read as `number` via `.toNumber()` in the repository mapper.
- `Transaction.parentTransactionId` is a **self-referencing FK** to link installments. The first installment has no parent; installments 2–N reference the first installment's real DB id (the id must exist before the FK can be set — see `TransactionsUseCase`).
- Transfers generate **two** transactions per installment: one `expense` on the source account and one `income` on the destination account.
- `Category.type` is a Prisma enum (`income | expense | transfer`) — categories must match the transaction type they are used with.

### Key Business Rules (enforced in use cases)

- All balance mutations go through `IAccountRepository.updateBalance(id, delta)`.
- Installment amounts: `Math.floor((total / n) * 100) / 100` for installments 1..n-1; last installment absorbs rounding remainder.
- Raw SQL reports (`getMonthlySummary`, `getCategorySummary`) use `Prisma.sql` and `Prisma.empty` for conditional clauses — never nest `prisma.$queryRaw` inside another `$queryRaw`.

## Environment

Backend `.env` (copy from `.env.example`):
```
DATABASE_URL="postgresql://postgres:postgres@localhost:5432/plutos"
JWT_SECRET="..."
JWT_EXPIRES_IN="7d"
PORT=3333
```

Frontend proxies `/api/*` → `http://localhost:3333/*` via `vite.config.ts`, so all API calls use `/api/...` paths.
