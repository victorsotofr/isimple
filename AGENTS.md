# Agent Notes

This repository may have multiple workers active at the same time. Do not revert
or overwrite uncommitted changes you did not make.

## Project Shape

- `frontend/`: Next.js App Router, React, TypeScript, Tailwind v4, shadcn-style UI.
- `backend/`: FastAPI agent service for chat, draft, classify, and document indexing/search.
- Supabase is the source of truth for auth, workspaces, lots, tenants, leases,
  conversations, documents, Gmail connections, providers, and tickets.
- Frontend API routes authenticate users before calling Supabase service-role
  helpers or the backend agent.

## Commands

- Full local app: `pnpm dev`
- Frontend only: `pnpm --dir frontend dev`
- Backend only: `pnpm dev:backend`
- Frontend verification: `pnpm --dir frontend lint`, `pnpm --dir frontend typecheck`,
  `pnpm --dir frontend build`
- Backend lint: `cd backend && uv run ruff check src`
- Seed demo data: `pnpm seed`

## Current Product Priorities

- Keep workspace boundaries strict on all authenticated API routes.
- Use the backend provider abstraction for LLM work when practical.
- Treat confirmed documents as trusted context; pending documents require review.
- Tickets and providers now have an MVP schema and UI. Agenda and analytics are
  lightweight derived views rather than full scheduling/reporting systems.
- Gmail is the only connected external inbox channel. WhatsApp remains unavailable.

## Editing Rules

- Keep edits scoped to the assigned subsystem.
- Prefer existing patterns over new abstractions.
- Do not edit migrations or database types unless the task explicitly needs schema work.
- If touching files already modified by another worker, read the current diff first.
- Run the narrowest practical verification before handing work back, and mention any
  broader checks that were not run.
