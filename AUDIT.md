# Audit isimple — 2026-04-23

## 1. Vue d'ensemble

- Chemin absolu : `/Users/victorsoto/DocumentsLocal/work/isimple`
- Taille totale (hors `node_modules`, `.next`, `.git`, `.turbo`, `dist`, `build`, `.venv`) : **~110 MB** (dominée par `backend/uv.lock` 403 KB, `frontend/src` et `design-reference/claude-design/*.html`)
- Nombre de fichiers (mêmes exclusions) : **5 448**
- Taille `node_modules` :
  - `./node_modules` : 13 MB (ne contient que `concurrently`)
  - `./frontend/node_modules` : 482 MB (455 entrées `.pnpm/`)
  - Pas de `node_modules` dans `backend/` (Python).
- Branche git courante : `main`
- 10 derniers commits :

| Hash | Date | Message |
|---|---|---|
| a0dfc83 | 2026-04-17 | feat(documents): multi-tenant docs, auto-matching, queue review UX |
| e869408 | 2026-04-16 | refactor: collapse monorepo into frontend/ + backend/ |
| 53cf0d2 | 2026-04-16 | fix(app): add root page redirect to /inbox |
| f4bf529 | 2026-04-16 | fix(documents): include saving state in review render guard |
| a8e8538 | 2026-04-16 | revert: remove root vercel.json — use Root Directory=apps/app instead |
| 8896930 | 2026-04-16 | build: pin Vercel build to @isimple/app via vercel.json |
| 28c71d2 | 2026-04-16 | feat: document vault, sidebar redesign, profile page |
| cea595e | 2026-04-16 | fix: use NEXT_PUBLIC_SITE_URL as fallback for app URL in landing nav |
| 49cb2f1 | 2026-04-16 | feat: AI form fill, delete workspace, landing login button |
| 03c4350 | 2026-04-16 | feat: match orianna-crm sidebar layout, add missing pages |

- Fichiers non commités (`git status --short`) :
  ```
  ?? design-reference/
  ```
  → tout le dossier `design-reference/` (HTML + JSX) est **non suivi par git**.

## 2. Arborescence racine (profondeur 3, hors ignorés)

```
.
├── .env.example
├── .github
│   └── workflows
│       ├── ci-agent.yml
│       └── ci-frontend.yml
├── .gitignore
├── .nvmrc                      # 22.14.0
├── .python-version             # 3.14
├── README.md                   # 2.5 KB — obsolète (décrit la landing + waitlist)
├── backend
│   ├── .env                    # (non vide — potentiels secrets, non lu)
│   ├── .env.example
│   ├── .venv                   # ignoré
│   ├── openapi.json            # 11 KB, généré
│   ├── pyproject.toml
│   ├── scripts
│   │   └── export_openapi.py
│   ├── src
│   │   └── immosimple_agent
│   └── uv.lock                 # 403 KB
├── design-reference            # non suivi git
│   └── claude-design
│       ├── .DS_Store
│       ├── App.html
│       ├── Document Review.html
│       ├── Landing Page.html
│       ├── Onboarding.html
│       └── app
├── frontend
│   ├── .env.local              # 988 B — 7 variables
│   ├── .turbo                  # 1 fichier de log
│   ├── components.json         # shadcn config
│   ├── eslint.config.mjs
│   ├── middleware.ts
│   ├── next-env.d.ts
│   ├── next.config.ts
│   ├── package.json
│   ├── pnpm-lock.yaml          # 6 KB — dupliqué avec la racine
│   ├── postcss.config.mjs
│   ├── scripts
│   │   ├── gen-db-types.sh
│   │   └── seed.js
│   ├── src
│   │   ├── app
│   │   ├── components
│   │   ├── contexts
│   │   ├── db
│   │   ├── hooks
│   │   ├── i18n
│   │   └── lib
│   ├── supabase
│   │   ├── migrations          # 12 fichiers
│   │   └── schema.sql
│   ├── tsconfig.json
│   └── tsconfig.tsbuildinfo
├── node_modules                # ignoré
├── package.json
└── pnpm-lock.yaml              # 6 KB (racine)
```

## 3. Package manager & monorepo

- `package.json` racine existe : **oui**
- Déclare `"workspaces"` : **non** — aucune clé `workspaces`.
- `pnpm-workspace.yaml` : **non**
- `turbo.json` : **non** (le `.turbo/` du frontend est un artefact de cache orphelin — `package.json:9` appelle simplement `tsc --noEmit`).
- `pnpm-lock.yaml` présent : **oui**, à deux endroits :
  - racine : 6 008 octets, ne verrouille que `concurrently@9.2.1`
  - `frontend/pnpm-lock.yaml` : présent (taille non inspectée individuellement mais couverte par `frontend/node_modules` 482 MB)
- Version Node : `.nvmrc` → **22.14.0**. `frontend/package.json` déclare `"packageManager": "pnpm@10.28.0"`.
- Version Python : `.python-version` → **3.14**. `backend/pyproject.toml:5` → `requires-python = ">=3.12"`.
- Scripts npm racine (`package.json:4-11`) :
  - `dev` : `concurrently` lance `pnpm --dir frontend dev` **et** `cd backend && uv run uvicorn src.immosimple_agent.main:app --reload --port 8000`
  - `dev:frontend`, `dev:backend` : idem, séparément
  - `build` : `pnpm --dir frontend build`
  - `lint` : `pnpm --dir frontend lint`
  - `typecheck` : `pnpm --dir frontend typecheck`
  - `seed` : `pnpm --dir frontend seed`
- **Les deux sous-projets sont isolés** : pas de `workspaces`, pas de `turbo.json`. Le couplage se fait par `concurrently` + `pnpm --dir`.

## 4. Dossier `frontend/`

- Existe : **oui**
- Framework détecté : **Next.js 16** (`frontend/package.json:32` → `"next": "16.1.6"`)
- Dependencies principales (`frontend/package.json:11-45`) :
  1. `@anthropic-ai/sdk@^0.39.0`
  2. `@hookform/resolvers@^3.9.1`
  3. `@radix-ui/react-alert-dialog@^1.1.15`
  4. `@radix-ui/react-avatar@^1.1.11`
  5. `@radix-ui/react-checkbox@^1.3.3`
  6. `@radix-ui/react-dialog@^1.1.15`
  7. `@radix-ui/react-dropdown-menu@^2.1.16`
  8. `@radix-ui/react-label@^2.1.8`
  9. `@radix-ui/react-progress@^1.1.8`
  10. `@radix-ui/react-select@^2.2.6`
  11. `@radix-ui/react-separator@^1.1.8`
  12. `@radix-ui/react-slot@^1.2.4`
  13. `@radix-ui/react-switch@^1.2.6`
  14. `@radix-ui/react-tabs@^1.1.13`
  15. `@radix-ui/react-tooltip@^1.2.8`
  - également : `@supabase/ssr@^0.6.1`, `@supabase/supabase-js@^2.49.2`, `@vercel/analytics@^2.0.1`, `class-variance-authority`, `clsx`, `lucide-react@^0.577.0`, `next@16.1.6`, `next-themes`, `react@19.2.3`, `react-dom@19.2.3`, `react-hook-form`, `sonner`, `tailwind-merge`, `tw-animate-css`, `zod@3.24.4`
- devDependencies principales :
  1. `@tailwindcss/postcss@^4`
  2. `@types/node@^20`
  3. `@types/react@^19`
  4. `@types/react-dom@^19`
  5. `dotenv@^16`
  6. `eslint@^9`
  7. `eslint-config-next@16.1.6`
  8. `tailwindcss@^4`
  9. `typescript@^5`
- Tailwind version : **v4** (dépendance `tailwindcss@^4`, `@tailwindcss/postcss@^4`, directive `@import "tailwindcss";` dans `frontend/src/app/globals.css:1`).
- shadcn/ui installé : **oui**
  - `frontend/components.json` présent (style `new-york`, baseColor `neutral`, `rsc: true`, `iconLibrary: lucide`)
  - `frontend/src/components/ui/` contient 16 composants : `alert`, `avatar`, `badge`, `button`, `card`, `checkbox`, `dialog`, `dropdown-menu`, `input`, `label`, `separator`, `sheet`, `sidebar` (603 lignes — le plus gros), `skeleton`, `sonner`, `tooltip`.
- TypeScript : **oui**, `tsconfig.json` avec `"strict": true`, `moduleResolution: "bundler"`, paths `@/* → ./src/*`.
- Fichiers clés présents :
  - `middleware.ts` : **oui** (75 lignes, protège `/inbox`, `/tickets`, `/lots`, `/tenants`, `/prospects`, `/agenda`, `/prestataires`, `/analytics`, `/settings`, rafraîchit la session Supabase via `@supabase/ssr`)
  - `next.config.ts` : **oui**, minimal : déclare uniquement `turbopack.root = __dirname`
  - `tailwind.config.*` : **absent** (Tailwind v4 utilise la config inline dans `globals.css` via `@theme inline {...}` et `@custom-variant dark`)
  - `postcss.config.mjs` : **oui**, plugin unique `@tailwindcss/postcss`
- Structure `src/app/` (profondeur 2) :

  ```
  src/app/
  ├── (app)                     # groupe protégé
  │   ├── agenda/page.tsx
  │   ├── analytics/page.tsx
  │   ├── documents/page.tsx
  │   ├── documents/upload/page.tsx   # 762 lignes
  │   ├── inbox/page.tsx
  │   ├── layout.tsx
  │   ├── lots/[id]/page.tsx
  │   ├── lots/page.tsx
  │   ├── prestataires/page.tsx
  │   ├── profile/page.tsx
  │   ├── settings/page.tsx
  │   ├── tenants/page.tsx
  │   └── tickets/page.tsx
  ├── (auth)
  │   ├── invite/[token]/page.tsx
  │   ├── login/page.tsx
  │   └── signup/page.tsx
  ├── api
  │   ├── agent/classify/route.ts
  │   ├── agent/draft/route.ts
  │   ├── ai/parse/route.ts
  │   ├── documents/[id]/route.ts
  │   ├── documents/[id]/url/route.ts
  │   ├── documents/upload/route.ts   # 353 lignes
  │   ├── invitations/accept/route.ts
  │   ├── workspaces/[id]/route.ts
  │   └── workspaces/route.ts
  ├── create-workspace/page.tsx
  ├── globals.css                     # 137 lignes, Tailwind v4 + vars oklch
  ├── layout.tsx                      # police Inter + IBM_Plex_Mono via next/font
  └── page.tsx                        # redirect('/inbox')
  ```

- Fichiers notables repérés :
  - `src/lib/supabase.ts` — wrapper singleton browser + `getServiceSupabase()` service-role.
  - `src/lib/supabase-browser.ts`, `src/lib/supabase-server.ts` — helpers SSR.
  - `src/lib/utils.ts`
  - `src/db/types.ts` (généré à la main selon son en-tête), `src/db/index.ts` (ré-exports).
  - `src/contexts/language-context.tsx`, `src/contexts/workspace-context.tsx`
  - `src/hooks/use-mobile.tsx`
  - `src/i18n/fr.ts`, `src/i18n/en.ts`, `src/i18n/index.ts` (~157 lignes chacun pour fr/en)
  - 9 composants métier de haut niveau dans `src/components/` : `app-sidebar.tsx`, `auth-layout.tsx`, `inbox-view.tsx` (403 l.), `login-form.tsx`, `lot-detail-view.tsx` (**602 l.**), `lots-view.tsx` (254 l.), `signup-form.tsx`, `smart-fill-panel.tsx`, `tenants-view.tsx` (450 l.)
  - Aucun `lib/redis.ts`, aucun `app/api/waitlist/*` — la landing mentionnée dans le README n'est pas présente dans `frontend/`.
- Env vars référencées dans le code (`grep process.env.*` sur `frontend/src`, `frontend/middleware.ts`, `frontend/next.config.ts`, `frontend/scripts`) — union unique :
  - `AGENT_URL` — `src/app/api/agent/classify/route.ts:5`, `src/app/api/agent/draft/route.ts:5`
  - `ANTHROPIC_API_KEY` — `src/app/api/ai/parse/route.ts:4`, `src/app/api/documents/upload/route.ts:7`
  - `NEXT_PUBLIC_SUPABASE_ANON_KEY` — 6 fichiers
  - `NEXT_PUBLIC_SUPABASE_URL` — 6 fichiers
  - `SUPABASE_SERVICE_ROLE_KEY` — `src/lib/supabase.ts:28`, route handlers, `scripts/seed.js:19`

## 5. Dossier `backend/`

- Existe : **oui**
- Contenu (`ls -la backend/`) :
  ```
  .env               692 B
  .env.example
  .venv/             (ignoré)
  openapi.json       11 KB, généré
  pyproject.toml
  scripts/export_openapi.py
  src/immosimple_agent/
  uv.lock            403 KB
  ```
- Langage détecté : **Python**
- `pyproject.toml` : oui. `uv.lock` : oui (gestionnaire `uv`). Pas de `requirements.txt`.
- Framework : **FastAPI** (`backend/pyproject.toml:11` → `fastapi>=0.115.0`, `uvicorn[standard]>=0.34.0`).
- Fichiers Python présents (16 fichiers, 504 lignes au total hors `__init__`) :
  - `main.py` (38 l.) — `create_app()`, CORS vers `http://localhost:3001` et `https://app.immosimple.fr`, routes `/api/chat`, `/api/draft`, `/api/classify`, endpoint `/health`.
  - `graphs/inbox.py` (64 l.) — LangGraph `StateGraph` à 2 nœuds : `fetch_context` → `generate_reply`, modèle `claude-sonnet-4-6`.
  - `graphs/draft.py` (86 l.)
  - `models/requests.py` (30 l.), `models/responses.py` (26 l.) — Pydantic.
  - `routes/chat.py` (39 l.), `routes/classify.py` (48 l. — structured output `Literal` catégories maintenance/paiement/réclamation/document/information/autre), `routes/draft.py` (31 l.).
  - `services/ai.py` (31 l.) — constante `MODEL = "claude-sonnet-4-6"` + `SYSTEM_PROMPT` français spécialisé gestion locative.
  - `tools/supabase_tools.py` (73 l.) — `fetch_tenant_context()` synchrone via `supabase-py`, enveloppé dans `asyncio.to_thread`, `@lru_cache` sur le client.
- LangGraph / LangChain : **présents** dans les deps → `langgraph>=0.2`, `langchain-anthropic>=0.3`, `langchain-core>=0.3`. `langsmith` déclaré en env (`.env.example` racine) mais pas de dépendance explicite dans `pyproject.toml`.
- `supabase>=2.7` (client Python Supabase) est dans les deps.
- **Aucun Node / package.json** dans `backend/`.

## 6. Dossier `design-reference/claude-design/`

### 6.1 Fichiers HTML (originaux)

| Fichier | Taille | 1re ligne | `<title>` |
|---|---|---|---|
| `App.html` | 3 983 B (110 lignes) | `<!DOCTYPE html>` | `isimple — Dashboard` |
| `Document Review.html` | 35 341 B (609 lignes) | `<!DOCTYPE html>` | `iSimple — Validation des documents` |
| `Landing Page.html` | 37 453 B (686 lignes) | `<!DOCTYPE html>` | `iSimple — Gestion immobilière, simplifiée` |
| `Onboarding.html` | 23 810 B (438 lignes) | `<!DOCTYPE html>` | `iSimple — Créer un compte` |

`App.html` charge React 18.3.1 via UMD + `@babel/standalone@7.29.0` et inclut les 7 fichiers de `app/` dans l'ordre `data.js → icons.jsx → shell.jsx → inbox.jsx → tickets.jsx → properties.jsx → pages.jsx → main.jsx` (`App.html:9-11,99-108`).

### 6.2 Dossier `app/` (JSX)

**`main.jsx`** (25 lignes)
- Aucun `import` (tout est global via `window.*`).
- Définit `function App()` : router manuel basé sur un `useState` persistant via `localStorage` (clé `isimple_page`).
- Pages : `inbox | tickets | agenda | properties | tenants | providers | documents | analytics | settings`.
- Bundler déduit : **aucun** — rendu via `ReactDOM.createRoot(document.getElementById('root')).render(<App />)`, le code est transpilé en direct par Babel dans le navigateur.
- React : **18.3.1** (chargé par script tag dans `App.html:9-10`).

**`shell.jsx`** (281 lignes)
- Aucun `import`.
- Destructure `React.useState/useEffect/useContext/createContext/useRef/useCallback`.
- Exporte (via `Object.assign(window, {...})`) : `Shell`, `DarkCtx`, `DensityCtx`, `NavCtx`, `ACCENT`, `ACCENT_DIM`, `ACCENT_DIMMER`.
- Composants/fonctions définis : `useDark`, `useDensity`, `Sidebar`, `Topbar`, `CommandPalette`, `useGlobalKeys`, `Shell`.
- Utilise `lucide-react` : **non** — les icônes viennent du fichier local `icons.jsx` (SVG inline pré-définis).
- shadcn / Radix / Headless UI : **non**.
- Classes Tailwind : **non** (0 `className=` dans tout le dossier `app/`).
- Styling : **inline styles** (`style={{ ... }}`) — 442 occurrences au total dans le dossier. Les couleurs principales sont des HEX `#1c1c1a`, `#2a2a28`, `#f0efe9` + `oklch(...)` via constantes `ACCENT = 'oklch(0.55 0.18 320)'`.
- Props / state : navigation (`page, go`), thèmes (`dark, toggleDark, compact, toggleCompact`), palette de commandes (`openCmd`).
- Raccourcis clavier (détectés via `useGlobalKeys`, `shell.jsx:239-255`) :
  - `⌘K` / `Ctrl+K` → ouvre la palette
  - `/` → ouvre la palette
  - `G I` → inbox, `G T` → tickets, `G A` → agenda, `G P` → properties, `G L` → tenants, `G R` → analytics (séquence deux touches avec timeout 800 ms).
  - `N` → raccourci « Nouveau ticket » affiché mais non câblé.
  - Dans `CommandPalette` : `↑/↓/Enter/Escape`.
- Navigation (`NAV_ITEMS`) : 9 entrées + 3 dividers : Inbox, Tickets, Agenda, Propriétés, Locataires, Prestataires, Documents, Analytics, Paramètres. Les badges Inbox/Tickets se recalculent depuis `AppData.conversations` et `AppData.tickets`.

**`inbox.jsx`** (317 lignes)
- Aucun `import`.
- Fonctions : `ChannelBadge`, `ContactBadge`, `ConvList`, `Thread`, `ContactPanel`, `InboxPage`.
- Canaux : WhatsApp, Email, Phone, Chat, SMS (objets `CHANNEL_ICONS` avec couleurs).
- Types de contact : `locataire` / `prospect` / `inconnu` (couleurs vert, magenta, gris).
- Statuts de conversation : `arbitrage`, `ia_en_cours`, `ticket_cree`, `resolu`.
- Styling : inline uniquement. 43 patterns Tailwind-like détectés dans les chaînes (false positives, pas de classes réelles).

**`tickets.jsx`** (278 lignes)
- Fonctions : `UrgencePill`, `StatutPill`, `SLACell`, `TicketDrawer`, `TicketsPage`.
- Types de données : ticket avec `urgence` (critique/haute/moyenne/basse), `statut` (ouvert/en_cours/planifie/resolu), `sla`, `prestataire`, `timeline`.
- Styling : inline.

**`properties.jsx`** (208 lignes)
- Fonctions : `DPEBadge`, `PropertyDetail`, `PropertiesPage`.
- Champs bien immobilier : `ref`, `adresse`, `ville`, `type`, `surface`, `loyer`, `locataire`, `statut`, `taches`, `dpe`, `alerts`.

**`pages.jsx`** (434 lignes)
- Hub regroupant les pages secondaires : `AgendaPage`, `AnalyticsPage`, `LocatairesPage`, `PrestatairesPage`, `DocumentsPage`, `ParametresPage`. **Ce n'est pas un routeur** — le routage est dans `main.jsx`. Aucun `react-router` / `next/router` / équivalent.

**`icons.jsx`** (51 lignes)
- Aucun `import`. Pas de `lucide-react`. Factory `Icon({ d, size, stroke, ... })` et objet `Icons` exposant **40 icônes** custom (SVG paths) : Inbox, Inbox2, Ticket, Building, Users, Calendar, Wrench, FileText, BarChart, Settings, Search, Command, X, Plus, ChevronRight, ChevronDown, Bot, Sparkles, Phone, Mail, MessageCircle, AlertTriangle, Clock, Check, CheckCircle, ArrowRight, Moon, Sun, LayoutList, Filter, Send, Zap, Flag, User, Hash, Star, Download, Eye, RefreshCw, Layers.
- Exposé via `Object.assign(window, { Icon, Icons })`.

**`data.js`** (133 lignes)
- **Données mockées uniquement**, aucune logique. Assigné à `window.AppData`.
- Entités détectées :
  - `conversations` (5 exemples) : `{ id, contact, type, channel, property, lot, status, lastMsg, time, unread, aiHandled, messages[] }`. Chaque message : `{ id, from: 'contact'|'ai', text, time, channel?, aiAction?, ticketId?, typing? }`.
  - `tickets` (7 exemples) : `{ id, titre, lot, adresse, locataire, categorie, urgence, statut, prestataire, sla, cree, aiCree, timeline[] }`. `timeline` : `{ type, text, time, ai }`.
  - `properties` (12 exemples) : `{ id, ref, adresse, ville, type, surface, loyer, locataire, statut, taches, dpe, alerts[] }`.
  - `tenants` (4 exemples) : `{ id, nom, lot, adresse, loyer, debutBail, finBail, paiement, humeur, tickets, email, tel, resume, flag? }`.
  - `providers` (5 exemples) : `{ id, nom, categorie, zones[], score, reponse, interventions, disponible, tel }`.
  - `analytics` : `{ kpis[], insights[] }`.
- **Divergences avec le schéma Supabase actuel** : les données de design utilisent `lot` (string comme `LOT-042`), `adresse` / `nom` / `prestataires` (FR), alors que `frontend/supabase/schema.sql` utilise `lots.address`, `tenants.first_name/last_name`, et n'a pas de table `providers` ni de champ DPE.

### 6.3 `package.json` de `claude-design/app/`

- **Absent**. Pas de `package.json`, pas de `node_modules`, pas de bundler. Tout est exécuté côté navigateur via `@babel/standalone` chargé en CDN.
- Scripts : aucun.
- Build tool : aucun.

### 6.4 Styling dans les JSX

- Classes Tailwind : **aucune** (0 `className=` dans les 7 fichiers — grep exhaustif).
- CSS custom : **oui**, styles inline + variables CSS déclarées dans chaque fichier HTML (`:root { --bg, --fg, --fg2, --fg3, --surface, --border, --accent }` + `html.dark { ... }` dans `App.html:15-32`).
- CSS-in-JS : non (pas de styled-components / emotion / stitches) ; uniquement `style={{ ... }}`.
- Variables CSS : `--bg`, `--fg`, `--fg2`, `--fg3`, `--surface`, `--border`, `--accent`, `--serif`, `--sans` (détectées dans `App.html:16-32` + HTML divers).
- Famille de couleurs dominante :
  - Accent principal : `oklch(0.55 0.18 320)` (magenta / rose profond) + ses variantes `oklch(0.55 0.18 320 / 0.15)` et `/ 0.08)`.
  - Neutres sombres : `#1c1c1a`, `#2a2a28`, `#3a3a38`, `#f0efe9`.
  - Couleurs fonctionnelles : `#f97316` (orange, 16 occurrences), `#22c55e` (vert, 13 occurrences), `#ef4444` (rouge, 8), `#5a8dee` (bleu, 7), `#eab308` (ambre, 3), `#8b5cf6` (violet, 3).
  - Le frontend **n'utilise pas** cet accent magenta : `frontend/src/app/globals.css:54,65` → `--primary` et `--ring` sont `oklch(0.15 0 0)` (quasi-noir) en clair, `oklch(0.95 0 0)` en sombre.
- Polices détectées dans le design : **DM Serif Display** (logo, titres de section `fontFamily: 'DM Serif Display, serif'`) et **DM Sans** (corps). Chargées via `fonts.googleapis.com` dans chaque HTML.
- Polices du frontend actuel : **Inter** + **IBM_Plex_Mono** via `next/font/google` (`frontend/src/app/layout.tsx:2,6-15`).

## 7. Dossier `design-reference/` (hors `claude-design`)

- Un seul sous-dossier : `claude-design/`. Pas d'autre contenu (ni screenshots, ni notes séparées). Un `.DS_Store` est présent à la racine de `claude-design/`.

## 8. Supabase / DB

- Dossier `supabase/` à la racine ? **Non** — le dossier vit dans `frontend/supabase/`.
- Migrations présentes : **12 fichiers** dans `frontend/supabase/migrations/` :
  - `0001_workspaces.sql` (12 l.)
  - `0002_workspace_members.sql` (49 l.)
  - `0003_workspace_invitations.sql` (54 l.)
  - `0004_lots.sql` (27 l.)
  - `0005_tenants.sql` (24 l.)
  - `0006_leases.sql` (28 l.)
  - `0007_conversations.sql` (27 l.)
  - `0008_messages.sql` (37 l.)
  - `0009_fix_workspace_members_rls_recursion.sql` (40 l.)
  - `0010_fix_rls_no_recursion.sql` (32 l.)
  - `0011_documents.sql` (47 l.)
  - `0012_document_tenants.sql` (31 l.)
  - Total : 408 lignes de SQL.
- `supabase/config.toml` : **absent**.
- `schema.sql` visible : **oui** (`frontend/supabase/schema.sql`, 258 lignes) — représente le schéma consolidé des migrations 0001-0008 + triggers. Tables déclarées : `workspaces`, `workspace_members`, `workspace_invitations`, `lots`, `tenants`, `leases`, `conversations`, `messages`, plus la fonction/trigger `update_conversation_last_message_at`.
- Types TS correspondants : `frontend/src/db/types.ts` (générés à la main selon l'en-tête du fichier ; script `frontend/scripts/gen-db-types.sh` contient un `echo "TODO :"` avec la commande à exécuter).
- Bucket Storage : `0011_documents.sql:31-48` crée un bucket `documents` (privé, 50 MB, `application/pdf, image/jpeg|png|webp`).

## 9. Intégrations externes détectées

| Intégration | Présent | Où |
|---|---|---|
| Supabase (`@supabase/*`) | **oui** | `frontend/package.json:30-31` (`@supabase/ssr`, `@supabase/supabase-js`), `frontend/src/lib/supabase*.ts`, `frontend/middleware.ts`, routes `api/*`, `scripts/seed.js`. Côté Python : `backend/pyproject.toml:11` (`supabase>=2.7`), utilisé dans `backend/src/immosimple_agent/tools/supabase_tools.py`. |
| Upstash Redis | **non** dans le code | Mentionné uniquement dans `.env.example` (racine, `KV_REST_API_URL`, `KV_REST_API_TOKEN`) et dans `README.md`. Aucun import dans `frontend/` ou `backend/`. |
| Resend | **non** dans le code | Mentionné dans `.env.example` (`RESEND_API_KEY`, `OWNER_EMAIL`) et `README.md`. Aucun import. |
| Anthropic SDK (JS) | **oui** | `frontend/package.json:12` (`@anthropic-ai/sdk@^0.39.0`), utilisé dans `frontend/src/app/api/ai/parse/route.ts:2`, `frontend/src/app/api/documents/upload/route.ts:5`. Modèle hardcodé : `claude-haiku-4-5-20251001`. |
| Anthropic SDK (Python) | **oui** | `backend/pyproject.toml:7` (`anthropic>=0.50.0`) + `langchain-anthropic` (`services/ai.py` : `MODEL = "claude-sonnet-4-6"`). |
| OpenAI SDK | **non** dans le code | Variable `OPENAI_API_KEY` déclarée dans `.env.example` racine et `frontend/.env.local`, mais aucun `import openai` / `OpenAI` / `@ai-sdk/openai` trouvé dans `frontend/src` ou `backend/src`. |
| Twilio / WhatsApp | **non** | Aucun import. Mention textuelle dans le design mock (`whatsapp` comme `channel`). |
| Sentry | **non** dans le code | Variable `SENTRY_DSN_AGENT` mentionnée dans `.env.example` racine. Pas d'import `@sentry/*`. |
| LangGraph / LangChain | **oui (backend seulement)** | `backend/pyproject.toml:8-10` + usage dans `backend/src/immosimple_agent/graphs/*.py`, `routes/*.py`. |
| LangSmith | **non dans les deps** | Variables `LANGSMITH_API_KEY`, `LANGSMITH_PROJECT`, `LANGSMITH_TRACING` déclarées dans `.env.example` racine mais pas de package `langsmith` dans `pyproject.toml`. |
| Vercel AI SDK (`ai`, `@ai-sdk/*`) | **non** | Aucune dépendance, aucun import. |
| `@vercel/analytics` | **oui** | `frontend/package.json:32` ; pas d'usage direct détecté dans `frontend/src` (grep vide sur `@vercel/analytics`). |

## 10. CI / CD

- `.github/workflows/` :
  - `ci-frontend.yml` : sur `push`/`PR` vers `main` ; Ubuntu ; `pnpm@10` + Node 22 ; cache sur `frontend/pnpm-lock.yaml` ; `pnpm install --frozen-lockfile` + `pnpm typecheck` + `pnpm build`. Utilise quatre env placeholders : `NEXT_PUBLIC_SUPABASE_URL/_ANON_KEY`, `NEXT_PUBLIC_AGENT_URL`, `NEXT_PUBLIC_SITE_URL`.
  - `ci-agent.yml` : sur `push`/`PR` vers `main` ; Ubuntu ; `astral-sh/setup-uv@v3` ; `cd backend && uv sync && uv run ruff check .`. **Ni `mypy`, ni tests.**
- `vercel.json` : **absent** (commit `a8e8538` — « revert: remove root vercel.json — use Root Directory=apps/app instead » — a supprimé celui qui existait).
- `Dockerfile` : **absent**.
- Autres configs de déploiement : aucune.

## 11. Env vars consolidées

Union de tous les `process.env.*` (frontend) et `os.environ.get(*)` (backend) rencontrés dans le code, triée :

| Variable | Trouvée dans le code ? | Déclarée dans `.env.example` / `.env` ? |
|---|---|---|
| `AGENT_URL` | frontend (`api/agent/*`) | — *(synonyme implicite de `NEXT_PUBLIC_AGENT_URL`)* |
| `ANTHROPIC_API_KEY` | frontend (`api/ai/parse`, `api/documents/upload`) | racine `.env.example`, `backend/.env.example`, `frontend/.env.local`, `backend/.env` |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | frontend (6 fichiers) + CI | racine `.env.example`, `frontend/.env.local`, CI |
| `NEXT_PUBLIC_SUPABASE_URL` | frontend (6 fichiers) + CI | idem |
| `SUPABASE_SERVICE_ROLE_KEY` | frontend (`lib/supabase.ts`, routes, seed), backend (`tools/supabase_tools.py`) | racine, `backend/.env.example`, `frontend/.env.local`, `backend/.env` |
| `SUPABASE_URL` | backend (`tools/supabase_tools.py`) | `backend/.env.example`, `backend/.env` |

Variables **déclarées mais non référencées dans le code** (candidates à suppression ou usage futur) :
- `.env.example` racine : `RESEND_API_KEY`, `KV_REST_API_URL`, `KV_REST_API_TOKEN`, `OWNER_EMAIL`, `NEXT_PUBLIC_SITE_URL`, `AGENT_SHARED_SECRET`, `NEXT_PUBLIC_AGENT_URL`, `OPENAI_API_KEY`, `LANGSMITH_API_KEY`, `LANGSMITH_PROJECT`, `LANGSMITH_TRACING`, `SENTRY_DSN_AGENT`.
- `frontend/.env.local` : `AGENT_SHARED_SECRET`, `NEXT_PUBLIC_AGENT_URL`, `OPENAI_API_KEY` (déclarés mais pas utilisés dans `frontend/src`).
- `backend/.env` : `AGENT_SHARED_SECRET`, `OPENAI_API_KEY` (pas d'usage dans `backend/src`).
- Variables du workflow CI : `NEXT_PUBLIC_AGENT_URL`, `NEXT_PUBLIC_SITE_URL` (alors que le code lit `AGENT_URL` sans préfixe `NEXT_PUBLIC_`).

## 12. Sync avec l'objectif cible (monorepo `apps/*` + `packages/*`)

| Cible | État actuel | Gap |
|---|---|---|
| `apps/web` (landing) | **Absent** — le dossier `frontend/` contient le dashboard SaaS, pas de landing. Le README décrit encore l'ancienne landing (Hero, Pricing, WaitlistForm), mais aucun de ces composants n'existe dans `frontend/src/`. | À créer (rien à déplacer). |
| `apps/app` (dashboard SaaS) | **Présent** dans `frontend/` (Next.js 16, App Router, Supabase SSR, shadcn, Tailwind v4). | À déplacer/renommer `frontend/` → `apps/app/`. Le commit `8896930` évoque un ciblage Vercel `apps/app` (ensuite reverté). |
| `apps/agent` (FastAPI + LangGraph) | **Présent** dans `backend/` (FastAPI, LangGraph, Anthropic, Supabase-py). | À déplacer `backend/` → `apps/agent/`. `.gitignore:42` ignore déjà `apps/agent/.venv` — l'intention semble déjà là. |
| `packages/ui` | **Absent** — les composants shadcn vivent dans `frontend/src/components/ui/`. | À créer (extraire). |
| `packages/db` | **Absent** — types `Database` générés à la main dans `frontend/src/db/types.ts`, migrations dans `frontend/supabase/`, schéma consolidé dans `frontend/supabase/schema.sql`. | À créer (extraire `db/` + `supabase/`). |
| `packages/contracts` | **Absent** — aucun schema Zod partagé backend/frontend, aucun client OpenAPI généré côté TS (alors que `backend/openapi.json` est exporté). | À créer. |
| `packages/config` | **Absent** — pas de `tsconfig.base.json`, pas d'`eslint-config` partagée, pas de `prettier` partagé. Chaque sous-projet a sa propre config. | À créer. |
| `packages/i18n` | **Absent** — `frontend/src/i18n/{fr,en,index}.ts` est local au frontend. | À créer / extraire. |
| `pnpm-workspace.yaml` | **Absent.** `package.json` racine n'a pas de `workspaces`. | À créer. |
| `turbo.json` | **Absent.** Les cibles sont pilotées par `concurrently` + `pnpm --dir` depuis le `package.json` racine. | À créer. |

## 13. Risques et points d'attention

Observations factuelles relevées dans le repo, citations incluses. Aucune recommandation.

1. **Dossier `design-reference/` non commité.** `git status --short` → `?? design-reference/`. Aucun fichier du dossier (ni HTML, ni JSX, ni `.DS_Store`) n'est versionné. Un `git clean -fd` non prudent le supprimerait.
2. **React 18 (design) vs React 19 (frontend).** `App.html:9-10` charge `react@18.3.1` UMD ; `frontend/package.json:33-34` déclare `react@19.2.3`. Le portage doit tenir compte des ruptures React 19 (Server Components, refs, etc.). De plus le design référence `React.useState` directement (pas d'import) et `Object.assign(window, ...)` — 100 % incompatible avec un bundler ES modules tel que quel.
3. **Styling 100 % inline dans `design-reference/`, 0 classe Tailwind.** 442 `style={{...}}` vs 0 `className="..."`. Le portage 1:1 vers Tailwind v4 du frontend nécessitera la réécriture complète des styles.
4. **Palette de couleurs divergente.** Le design utilise `oklch(0.55 0.18 320)` (magenta) comme accent (`shell.jsx:8-10`), le frontend actuel (`globals.css:54,65`) a `--primary: oklch(0.15 0 0)` (neutre). Pas d'accent coloré défini dans le frontend.
5. **Polices divergentes.** Design : `DM Serif Display` + `DM Sans` (`App.html:8`). Frontend : `Inter` + `IBM_Plex_Mono` (`layout.tsx:2,6-15`). Aucun lien de parenté.
6. **Icônes non interchangeables.** Design : 40 icônes SVG maison dans `icons.jsx` accessibles via `window.Icons.Name`. Frontend : `lucide-react@0.577.0` (`package.json:33`). Le set n'est pas 1:1 ; par ex. `Icons.Inbox2` (design) n'existe pas tel quel dans lucide.
7. **README.md obsolète.** Décrit la stack landing + waitlist (Upstash KV, Resend, composants `Hero.tsx`, `Pricing.tsx`, `WaitlistForm.tsx`, `app/api/waitlist/route.ts`). Aucun de ces fichiers n'existe dans `frontend/src/`. Le commit `e869408` (« refactor: collapse monorepo into frontend/ + backend/ ») a rebasé la structure sans mettre à jour le README.
8. **Mismatch `.python-version` vs `pyproject.toml`.** `.python-version` : `3.14`. `backend/pyproject.toml:5` : `requires-python = ">=3.12"`. Les `__pycache__` sont `cpython-314.pyc` (donc Python 3.14 utilisé localement).
9. **Deux lockfiles pnpm.** `./pnpm-lock.yaml` (racine, ne verrouille que `concurrently`) + `./frontend/pnpm-lock.yaml`. Les commandes `pnpm --dir frontend ...` utilisent le second ; le workflow CI aussi (`ci-frontend.yml:29`). Le lockfile racine est essentiellement inutile sans `workspaces`.
10. **Secrets potentiels en clair dans `backend/.env`.** `backend/.env` existe (692 octets, 5 variables : `AGENT_SHARED_SECRET`, `ANTHROPIC_API_KEY`, `OPENAI_API_KEY`, `SUPABASE_SERVICE_ROLE_KEY`, `SUPABASE_URL`). Il est ignoré par `.gitignore:32` (`.env*`) mais présent dans le workspace. Contenu non lu par cet audit. De même pour `frontend/.env.local` (988 octets, 7 variables) non ignoré par défaut mais couvert par `.env*`. `backend/.env.example:1-3` contient des exemples de forme `sk-ant-...` / `eyJ...` (placeholder).
11. **Variables env « mortes ».** `AGENT_SHARED_SECRET`, `OPENAI_API_KEY`, `NEXT_PUBLIC_AGENT_URL`, `LANGSMITH_*`, `SENTRY_DSN_AGENT`, `RESEND_API_KEY`, `KV_REST_API_URL`, `KV_REST_API_TOKEN`, `OWNER_EMAIL`, `NEXT_PUBLIC_SITE_URL` sont déclarées dans `.env*` ou CI mais **ne sont référencées nulle part dans le code** au jour de l'audit.
12. **Incohérence nom de variable `AGENT_URL`.** `src/app/api/agent/classify/route.ts:5` et `.../draft/route.ts:5` utilisent `process.env.AGENT_URL`. Le `.env.example` racine déclare `NEXT_PUBLIC_AGENT_URL`. Le CI définit `NEXT_PUBLIC_AGENT_URL`. Conséquence observable : en CI la variable est présente mais non lue par le code.
13. **Types DB générés à la main.** `frontend/src/db/types.ts:1-2` (« Types Supabase — générés manuellement pour Phase 1–4 (migrations 0001–0008) / À régénérer via scripts/gen-db-types.sh après chaque migration »). Or 4 migrations supplémentaires (`0009`-`0012`) ont été ajoutées depuis. Le script `frontend/scripts/gen-db-types.sh:6` contient `echo "TODO :"` — il n'exécute pas réellement la génération.
14. **Mismatch schéma SQL vs données mock du design.** Les mocks de `design-reference/.../data.js` utilisent des champs FR (`adresse`, `ville`, `nom`, `loyer`, `prestataires`) ; le schéma (`frontend/supabase/schema.sql:116-151`) utilise `address`, `city`, `first_name`, `last_name`, `rent_amount`. Le design référence aussi des entités `providers` et `DPE` qui n'ont pas de tables dans le schéma actuel.
15. **CORS backend dur.** `backend/src/immosimple_agent/main.py:21` autorise uniquement `http://localhost:3001` (alors que Next dev tourne par défaut sur `3000`) et `https://app.immosimple.fr`. Pas d'override via env.
16. **Pas de tests.** Aucun fichier `*.test.ts`, `*.spec.ts`, `test_*.py` trouvé. Le CI backend n'exécute que `ruff check`, le CI frontend n'exécute que `typecheck` + `build`.
17. **Artefacts `.turbo/` sans `turbo.json`.** `frontend/.turbo/turbo-typecheck.log` existe alors qu'aucun `turbo.json` n'est présent — artefact d'une configuration antérieure.
18. **`frontend/node_modules` volumineux (482 MB).** À anticiper si on extrait `frontend/` dans un workspace avec hoisting (`packages/ui`, etc.).
19. **Pas de `vercel.json`.** Commit `a8e8538` a explicitement enlevé celui qui existait. La configuration Vercel vit désormais uniquement dans le dashboard (« Root Directory=apps/app » mentionné dans le message de commit), mais comme `apps/app/` n'existe pas dans le repo, le déploiement Vercel actuel est cassé ou pointe vers un chemin qui n'existe plus. À valider.
20. **`next.config.ts` minimal.** Ne déclare aucun `output`, `images.domains`, `headers`, `rewrites`. Un déplacement du frontend impactera peu la config.
21. **404 à la racine en dev sans middleware.** `frontend/src/app/page.tsx` fait `redirect('/inbox')`. Si `/inbox` n'est pas accessible (pas de session), le middleware redirige vers `/login` — OK en prod, mais une boucle est possible si Supabase renvoie une erreur silencieuse (`middleware.ts:64` swallow les exceptions avec `NextResponse.next()`).

## 14. Questions ouvertes

1. **Landing page manquante.** Le README, les entrées `.env.example` (`RESEND_API_KEY`, `KV_REST_API_URL`, `OWNER_EMAIL`, `NEXT_PUBLIC_SITE_URL`) et le commit `cea595e` (« use NEXT_PUBLIC_SITE_URL as fallback for app URL in landing nav ») supposent qu'une landing existait. Est-elle archivée ailleurs, ou faut-il la reconstruire from scratch pour `apps/web` ?
2. **`backend/openapi.json` en versionné.** Exporté manuellement via `backend/scripts/export_openapi.py`. Faut-il le générer à la volée (packages/contracts) ou continuer à le commiter ?
3. **`AGENT_URL` vs `NEXT_PUBLIC_AGENT_URL`.** Le code lit `AGENT_URL` (non public, côté serveur) ; le CI et l'`.env.example` utilisent `NEXT_PUBLIC_AGENT_URL`. Laquelle est la cible ? (Impact : si l'appel se fait uniquement depuis les route handlers serveur, `AGENT_URL` suffit ; si un appel côté client est prévu, il faut `NEXT_PUBLIC_`.)
4. **Script `gen-db-types.sh` stub.** Faut-il réellement passer à `supabase gen types` (nécessite un `SUPABASE_PROJECT_ID` et le CLI Supabase) ou continuer à maintenir `db/types.ts` à la main ?
5. **`backend/.env` et `frontend/.env.local` contiennent-ils des credentials de production ?** (Non lus par l'audit.) À vérifier avant tout `git clean -fdx` éventuel.
6. **Design Claude vs frontend actuel.** Le design `design-reference/` est radicalement différent du frontend actuel (palette, polices, structure de navigation avec `providers`/`prestataires`, entités `DPE`, icônes custom). Est-ce :
   - une refonte UI en préparation à appliquer sur `frontend/` ?
   - une référence conceptuelle pour `apps/app` future ?
   - un draft à archiver ?
7. **Python 3.14.** Choix assumé (fichier `.python-version` récent) ou artefact d'un environnement local ? Le CI `ci-agent.yml:14` ne pin pas la version Python — il laisse `astral-sh/setup-uv@v3` décider.
8. **Déploiement Vercel actuel.** Le dernier `vercel.json` a été supprimé dans `a8e8538` au profit d'un « Root Directory=apps/app » côté dashboard, mais `apps/app/` n'existe pas dans le repo (le code vit dans `frontend/`). Le projet Vercel est-il cassé ? Déployé depuis un autre repo / branche ?
9. **Aucune table `providers` / `prestataires` en base.** Les mocks du design et la page `/prestataires/page.tsx` existent, mais aucune migration ne crée de table. Où sont gérés les prestataires actuellement ?
10. **Multi-tenant via RLS : 2 refactorings en 2 migrations (`0009`, `0010`).** `0009_fix_workspace_members_rls_recursion.sql` + `0010_fix_rls_no_recursion.sql` — la stratégie finale utilise la fonction `get_my_workspace_ids()` (cf. `0011_documents.sql:19,22,25,28`). Cette fonction est-elle définie dans `0010` ou ailleurs ? À vérifier avant toute nouvelle migration.
11. **`NEXT_PUBLIC_SUPABASE_ANON_KEY` en middleware.** `middleware.ts:13-32` utilise l'anon key côté serveur. Comportement standard pour `@supabase/ssr`, mais à confirmer comme voulu si un `packages/db` centralise ensuite la création du client.
12. **LangSmith déclaré mais non installé.** `.env.example` racine référence `LANGSMITH_API_KEY` / `LANGSMITH_PROJECT` / `LANGSMITH_TRACING` mais `backend/pyproject.toml` n'inclut pas `langsmith`. Prévu pour une prochaine itération ?

---

Fin du rapport.
