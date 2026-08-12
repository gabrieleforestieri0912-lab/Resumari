# 🎬 Resumari — Trascrizioni AI per YouTube

Piattaforma SaaS che trasforma i video YouTube in trascrizioni istantanee, riassunti intelligenti
e chat interattive. Include un'**estensione Chrome**, un **server MCP** e una **API pubblica**.

## ✨ Funzionalità

- 📝 **Trascrizione istantanea** di video YouTube (con rilevamento automatico della lingua)
- 🤖 **Riassunti e chat** con i video tramite AI (OpenAI / Groq con fallback automatico)
- 🧩 **Estensione Chrome** — bottone "Trascrivi" su YouTube, side panel, pulsanti sulle thumbnail
- 🔌 **Server MCP** — integra Resumari in Claude, Codex e altri client MCP (vedi `/mcp`)
- 🔑 **API pubblica** con chiavi API (`/api/v1/transcript`, anche in modalità bulk/SSE)
- 🧰 **11 strumenti gratuiti**: calcolatore guadagni, timer per script, show notes, convertitore e
  validatore sottotitoli, generatore di tag, downloader thumbnail, timestamp, contatore titoli,
  pulizia trascrizioni
- 💳 **Crediti e piani** (Free / Pro / Business) con pagamenti Stripe
- 🔐 **Autenticazione** via email+codice, password o Google OAuth

## 🛠 Stack tecnico

| Area | Tecnologia |
|---|---|
| Framework | Next.js 16 (App Router, Turbopack), React 19 |
| Linguaggio | TypeScript 6 |
| Stile | Tailwind CSS 4, Framer Motion, Lucide |
| Database/Auth | Supabase (PostgreSQL + JWT custom) |
| Pagamenti | Stripe (checkout + webhook) |
| AI | OpenAI / Groq SDK |
| Email | Resend |
| Auth social | NextAuth (Google) |
| Test | Vitest |

## 🚀 Avvio in locale

Prerequisiti: **Node.js ≥ 20.9**.

```bash
npm install
cp .env.example .env.local   # poi compila le variabili (vedi sotto)
npm run dev
```

Apri [http://localhost:3000](http://localhost:3000).

### ⚠️ Se il dev server congela il PC (nota Turbopack)

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
- `GROQ_API_KEY` o `OPENAI_API_KEY` (almeno una)
- `RESEND_API_KEY`, `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET`, `GOOGLE_CLIENT_ID/SECRET`

## 📦 Script

```bash
npm run dev              # dev server (Turbopack)
npm run dev:clean        # pulisce la cache .next e avvia il dev server
npm run build            # build di produzione (Next.js)
npm run build:extension  # build di produzione + bundle dell'estensione
npm run copy:extension   # rigenera il bundle dell'estensione dalla build corrente
npm run lint             # ESLint
npm run test             # suite di test (Vitest)
npm run test:coverage    # test con coverage
```

## 🧩 Estensione Chrome

L'estensione viene **generata** da `scripts/build-extension.js` (manifest MV3, content script per
YouTube, background service worker, side panel) e **non** vive in un sorgente separato.

```bash
npm run build:extension
```

L'output finisce in `dist-extension/`.

> La versione dell'estensione è sincronizzata automaticamente con `package.json`.
> I testi del listing Chrome Web Store (descrizione dettagliata, permessi, privacy)
> sono pronti in [`scripts/chrome-web-store-listing.md`](scripts/chrome-web-store-listing.md).

Per installarla in sviluppo: `chrome://extensions` → *Modalità sviluppatore* → *Carica estensione
non pacchettizzata* → seleziona `dist-extension/`. Per la pubblicazione: comprimi `dist-extension/`
in uno zip e caricalo su
[Chrome Web Store](https://chrome.google.com/webstore/developer-dashboard).

## 🧪 Test

Suite in Vitest (**220+ test**), separata dal codice sorgente:

- `tests/api/` — test delle route API (auth, transcript, keys, MCP, webhook, ecc.)
- `tests/lib/` — test dei moduli e del bundle estensione (manifest, content script in VM,
  sitemap, config di deploy)
- `tests/helpers/` — mock di Supabase e utility per i test
- `tests/setup.ts` — variabili d'ambiente e setup di Vitest

```bash
npm test
```

## ☁️ Deploy su Vercel

La configurazione è già pronta (`vercel.json` con `buildCommand: npm run build:extension`).
Segui la checklist completa in **[`DEPLOY.md`](DEPLOY.md)** per: variabili d'ambiente di
produzione, webhook Stripe, redirect Google OAuth, verifica dominio Resend, migration Supabase
e invio della sitemap a Google.

## 🗂 Struttura del progetto

```
src/
├── app/
│   ├── api/          # route API (auth, v1/transcript, mcp, keys, webhooks, ...)
│   ├── tools/        # 11 strumenti gratuiti
│   └── ...           # pagine (home, login, dashboard, mcp, supporto, ...)
├── components/       # UI (auth, chat, hero, pricing, ...)
├── lib/              # logica (ai, db, auth, rate-limit, mcp-jobs, ...)
tests/                # suite Vitest separata dal sorgente (api/, lib/, helpers/)
scripts/              # build-extension.js, migration-api-keys.sql
public/               # risorse statiche, robots.txt, sitemap.xml
```

## 📄 Licenza

Progetto privato.
