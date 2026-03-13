# ImmoSimple — Gestion locative moderne

Landing page et liste d'attente pour ImmoSimple, un outil de gestion locative destiné aux propriétaires en France.

## Prérequis

- Node.js 18+
- pnpm

## Installation

```bash
pnpm install
```

## Configuration locale

1. Copiez `.env.example` en `.env.local` :

```bash
cp .env.example .env.local
```

2. Remplissez les variables d'environnement :

- **`KV_REST_API_URL`** / **`KV_REST_API_TOKEN`** : créez une base Upstash Redis via le dashboard Vercel (Storage → Create → KV) ou directement sur [upstash.com](https://upstash.com)
- **`RESEND_API_KEY`** : créez un compte sur [resend.com](https://resend.com) et générez une clé API. En mode test, les emails sont envoyés uniquement à l'adresse du compte Resend.
- **`OWNER_EMAIL`** : l'email qui recevra les notifications d'inscription
- **`NEXT_PUBLIC_SITE_URL`** : `http://localhost:3000` en local

## Développement

```bash
pnpm dev
```

Le site est disponible sur [http://localhost:3000](http://localhost:3000).

## Déploiement

```bash
vercel deploy
```

Ou connectez le repo à Vercel pour un déploiement automatique à chaque push.

## Modifier le contenu

| Section | Fichier |
|---------|---------|
| Hero (titre, sous-titre) | `components/Hero.tsx` |
| Problèmes | `components/Problem.tsx` |
| Fonctionnalités | `components/Features.tsx` |
| Tarifs | `components/Pricing.tsx` |
| Formulaire | `components/WaitlistForm.tsx` |
| Footer | `components/Footer.tsx` |
| Mentions légales | `app/mentions-legales/page.tsx` |
| Politique de confidentialité | `app/politique-confidentialite/page.tsx` |
| Métadonnées SEO | `app/layout.tsx` |

## Changer le nom de marque

Recherchez « ImmoSimple » dans le projet et remplacez-le par votre nom de marque. Fichiers concernés :

- `components/Nav.tsx`
- `components/Hero.tsx`
- `components/Pricing.tsx`
- `components/Footer.tsx`
- `app/layout.tsx`
- `app/mentions-legales/page.tsx`
- `app/politique-confidentialite/page.tsx`
- `app/api/waitlist/route.ts`

## Consulter les inscriptions

Les inscriptions sont stockées dans Vercel KV (Upstash Redis) :

- **Compteur** : clé `waitlist_count`
- **Liste** : clé `waitlist_emails` (liste JSON)

Consultez-les via le [dashboard Vercel Storage](https://vercel.com/dashboard) ou le [dashboard Upstash](https://console.upstash.com).

## Stack technique

- Next.js (App Router)
- TypeScript
- Tailwind CSS
- shadcn/ui
- Upstash Redis (Vercel KV)
- Resend (emails)
- Vercel Analytics
- React Hook Form + Zod
