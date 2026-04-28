# isimple

AI-native SaaS for rental-property operations in France. The product goal is simple: one clear source of truth for properties, tenants, documents, messages, and interventions.

## Stack

- `frontend/`: Next.js 16 App Router, React 19, TypeScript, Tailwind CSS v4, shadcn-style UI components.
- `backend/`: FastAPI agent service with LangGraph/LangChain, provider-agnostic LLM calls, and safe AI observability logs.
- `Supabase`: Auth, Postgres, RLS, file storage, and local seed data.
- `Vercel`: frontend hosting.
- `Render`: backend hosting for the FastAPI agent.

## Local Setup

Requirements:

- Node.js 22+
- pnpm 10+
- Python 3.12+
- `uv`

Install dependencies:

```bash
pnpm install
pnpm --dir frontend install
cd backend && uv sync
```

Create env files:

```bash
cp frontend/.env.example frontend/.env.local
cp backend/.env.example backend/.env
```

Fill the Supabase values in both files. Put LLM keys only in `backend/.env`.

Run the full app:

```bash
pnpm dev
```

Local URLs:

- Frontend: `http://localhost:3000`
- Backend healthcheck: `http://localhost:8000/health`
- Backend API docs: `http://localhost:8000/docs`

Seed demo data:

```bash
pnpm seed
```

Demo credentials after seeding:

- Email: `demo@immosimple.fr`
- Password: `Demo1234!`

## AI Providers

The backend supports:

- Anthropic: `ANTHROPIC_API_KEY`, `ANTHROPIC_MODEL`
- OpenAI: `OPENAI_API_KEY`, `OPENAI_MODEL`
- Gemini: `GEMINI_API_KEY`, `GEMINI_MODEL`

Workspace admins can choose the active provider/model in `Settings -> Intelligence artificielle`.

If no workspace setting exists, the backend uses `AI_PROVIDER` and the matching default model.

AI logs include provider, model, operation, latency, and token counts when available. Secrets are never logged.

## Deployment

Frontend on Vercel:

- Root Directory: `frontend`
- Build Command: `pnpm run build`
- Install Command: `pnpm install`
- Output Directory: leave default
- Env: copy values from `frontend/.env.example`
- `AGENT_URL` must point to the Render backend URL, for example `https://isimple-agent.onrender.com`

Backend on Render:

- Create a new Web Service from this GitHub repo, or use the repo-root `render.yaml` Blueprint.
- If configuring manually, set Root Directory to `backend`.
- Build Command: `pip install uv && uv sync --frozen --no-dev`
- Start Command: `uv run uvicorn src.immosimple_agent.main:app --host 0.0.0.0 --port $PORT`
- Env: copy values from `backend/.env.example`.
- Healthcheck path: `/health`.

Supabase:

- Apply migrations from `frontend/supabase/migrations`.
- Enable email/password auth.
- Configure storage policies for documents before using uploads in production.
- Never expose `SUPABASE_SERVICE_ROLE_KEY` to the browser. It is server-only.

## Useful Commands

```bash
pnpm dev
pnpm lint
pnpm typecheck
pnpm build
pnpm seed
pnpm --dir frontend dev
cd backend && uv run uvicorn src.immosimple_agent.main:app --reload --port 8000
```

## Product Direction

isimple is an AI-native SaaS. Keep new features model-agnostic by routing LLM calls through the backend provider abstraction instead of importing model SDKs directly in UI code.

Short-term product flow:

1. Create workspace.
2. Add first property.
3. Upload first document.
4. Use inbox classification and AI drafts.
5. Convert operational requests into tickets.
