# Resumari — Trascrizioni AI per YouTube

Piattaforma SaaS che trasforma i video YouTube in trascrizioni istantanee, riassunti intelligenti
e chat interattive. Include un'**estensione Chrome**, un **server MCP** e una **API pubblica**.

## Funzionalità

- **Trascrizione istantanea** di video YouTube (con rilevamento automatico della lingua)
- **Riassunti e chat** con i video tramite AI (Groq con API key configurata in `.env.local`)
- **Estensione Chrome** — bottone "Trascrivi" su YouTube, side panel, pulsanti sulle thumbnail
- **Server MCP** — integra Resumari in Claude, Codex e altri client MCP (vedi `/mcp`)
- **API pubblica** con chiavi API (`/api/v1/transcript`, anche in modalità bulk/SSE)
- **11 strumenti gratuiti**: calcolatore guadagni, timer per script, show notes, convertitore e
  validatore sottotitoli, generatore di tag, downloader thumbnail, timestamp, contatore titoli,
  pulizia trascrizioni
- **Crediti e piani** (Free / Pro / Business) con pagamenti Stripe
- **Autenticazione** via email+codice, password o Google OAuth

## Stack tecnico

| Area | Tecnologia |
|---|---|
| Framework | Next.js 16 (App Router, Turbopack), React 19 |
| Linguaggio | TypeScript 6 |
| Stile | Tailwind CSS 4, Framer Motion, Lucide |
| Database/Auth | Supabase (PostgreSQL + JWT custom) |
| Pagamenti | Stripe (checkout + webhook) |
| AI | Groq SDK |
| Email | Resend |
| Auth social | NextAuth (Google) |

## Avvio in locale

Prerequisiti: **Node.js ≥ 20.9**.

```bash
npm install
cp .env.example .env.local   # poi compila le variabili (vedi sotto)
npm run dev
```

Apri [https://resumari.vercel.app](https://resumari.vercel.app).

### Se il dev server congela il PC (nota Turbopack)

Turbopack può andare in loop di risoluzione moduli se indovina male la "workspace root" (questo
progetto vive in una cartella con molti progetti fratelli). La root è già fissata in
`next.config.ts` (`turbopack.root`) e la cache avvelenata si recupera così:

```bash
npm run dev:clean   # cancella .next e riavvia il dev server
```

### Variabili d'ambiente

Tutte le variabili sono documentate in [`.env.example`](.env.example). Le essenziali:

- `NEXT_PUBLIC_SUPABASE_URL` / `NEXT_PUBLIC_SUPABASE_ANON_KEY` / `SUPABASE_SERVICE_ROLE_KEY`
- `JWT_SECRET` / `NEXTAUTH_SECRET` / `NEXTAUTH_URL`
- `YOUTUBE_API_KEY`
- `GROQ_API_KEY`
- `RESEND_API_KEY`, `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET`, `GOOGLE_CLIENT_ID/SECRET`

## Script

```bash
npm run dev              # dev server (Turbopack)
npm run dev:clean        # pulisce la cache .next e avvia il dev server
npm run build            # build di produzione (Next.js)
npm run lint             # ESLint
npm run test             # suite di test (Vitest)
npm run test:coverage    # test con coverage
```

## Deploy su Vercel

La configurazione è già pronta (`vercel.json` con `buildCommand: npm run build`).
Segui la checklist completa in **[`DEPLOY.md`](DEPLOY.md)** per: variabili d'ambiente di
produzione, webhook Stripe, redirect Google OAuth, verifica dominio Resend, migration Supabase
e invio della sitemap a Google.

## Struttura del progetto

```
src/
├── app/
│   ├── api/          # route API (auth, v1/transcript, mcp, keys, webhooks, ...)
│   ├── tools/        # 11 strumenti gratuiti
│   └── ...           # pagine (home, login, dashboard, mcp, supporto, ...)
├── components/       # UI (auth, chat, hero, pricing, ...)
├── lib/              # logica (ai, db, auth, rate-limit, mcp-jobs, ...)
supabase/migrations/  # migration SQL per Supabase
public/               # risorse statiche, robots.txt, sitemap.xml
```

## Licenza

Progetto privato.
