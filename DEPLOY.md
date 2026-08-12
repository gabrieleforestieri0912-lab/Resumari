# Deploy su Vercel — Checklist

La configurazione di deploy è già nel repo: `vercel.json` imposta il build command
`npm run build:extension` (che esegue `next build` **e** genera il bundle dell'estensione
in `dist-extension/`).

## 1. Connessione del progetto

1. Su [vercel.com](https://vercel.com) → **Add New Project** → importa il repo GitHub `Resumari`.
2. Framework rilevato: **Next.js** (conferma). Il build command è già letto da `vercel.json`
   (`npm run build:extension`); lascia **Output Directory vuota** — Vercel gestisce `.next` da solo.
3. Premi **Deploy**. La prima build richiede qualche minuto.

## 2. Variabili d'ambiente (Project Settings → Environment Variables)

Impostale **prima** del primo deploy per il ramo `production` (le `NEXT_PUBLIC_*` vengono
incorporate al momento della build):

| Variabile | Valore di produzione |
|---|---|
| `NEXT_PUBLIC_APP_URL` | `https://resumari.it` |
| `NEXTAUTH_URL` | `https://resumari.it` |
| `NEXTAUTH_SECRET` | segreto nuovo, lungo e casuale |
| `JWT_SECRET` | segreto nuovo, lungo e casuale (diverso dal precedente) |
| `NEXT_PUBLIC_SUPABASE_URL` | URL del progetto Supabase di produzione |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | anon key di produzione |
| `SUPABASE_SERVICE_ROLE_KEY` | service role key di produzione (mai esposta al client) |
| `YOUTUBE_API_KEY` | chiave Google Cloud |
| `GROQ_API_KEY` o `OPENAI_API_KEY` | almeno una chiave AI |
| `GOOGLE_CLIENT_ID` / `GOOGLE_CLIENT_SECRET` | OAuth di produzione |
| `STRIPE_SECRET_KEY` | chiave **live** (sk_live_...) |
| `STRIPE_WEBHOOK_SECRET` | whsec_ dell'endpoint webhook di produzione |
| `RESEND_API_KEY` | chiave Resend |
| `SUPPORT_EMAIL` | `support@resumari.it` — **obbligatoria**: se non impostata il codice usa il fallback su un indirizzo personale |

## 3. Dopo il deploy

- **Stripe**: registra il webhook endpoint `https://resumari.it/api/webhooks/stripe` con gli eventi
  `checkout.session.completed`, `customer.subscription.updated`, `customer.subscription.deleted`
  e incolla il secret in `STRIPE_WEBHOOK_SECRET`.
- **Google OAuth**: nella Google Cloud Console aggiungi `https://resumari.it/api/auth/callback/google`
  (e l'URI di callback di NextAuth) alle **Authorized redirect URIs**.
- **Resend**: verifica il dominio `resumari.it` (record DNS SPF/DKIM) così le email da
  `noreply@resumari.it` non finiscono in spam.
- **Supabase**: applica le migration (`scripts/migration-api-keys.sql`, `scripts/migration-transcripts.sql`) e verifica le policy RLS.
- **SEO**: la sitemap è in `public/sitemap.xml` e referenziata dal `robots.txt`; registra
  il dominio nella **Google Search Console** e invia la sitemap.
- **Estensione**: verifica che `dist-extension/` contenga il bundle aggiornato
  (manifest, content.js, background.js, panel.html, panel.css, panel.js, popup.html, popup.js)
  dopo la build.

> ⚠️ **`NEXT_PUBLIC_APP_URL` è critica per l'estensione.** Il side panel gira su un'origine
> `chrome-extension://` e chiama le API con URL assoluti: il valore di `NEXT_PUBLIC_APP_URL`
> viene **incorporato in `panel.js` al momento della build** (placeholder sostituito da
> `scripts/build-extension.js`). Se su Vercel non è impostata a `https://resumari.it`, il
> pannello pubblicato punterà a localhost o a un altro host e non funzionerà. Non fare build
> locali con `.env.local` che la punti a localhost e poi caricare quel bundle nello store.

## 4. Cosa fa il build command

`npm run build:extension` esegue:
1. `next build` → output di produzione in `.next/` (serve solo al sito);
2. `node scripts/build-extension.js` → genera il bundle dell'estensione in `dist-extension/`.
   Il side panel è **standalone**: `panel.html` + `panel.css` + `panel.js` (vanilla JS, nessuna
   dipendenza dal build Next) vivono in `scripts/extension-panel/` e vengono copiati così come
   sono (con l'URL dell'API iniettato in `panel.js`).

La cartella generata (`dist-extension/`) è in `.gitignore`, quindi viene ricreata a ogni
build su Vercel e non finisce nel repository.
