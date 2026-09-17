# Deploy su Vercel — Checklist

La configurazione di deploy è già nel repo: `vercel.json` usa `npm run build` per creare la build Next.js.

## 1. Connessione del progetto

1. Su [vercel.com](https://vercel.com) → **Add New Project** → importa il repo GitHub `Resumari`.
2. Framework rilevato: **Next.js** (conferma). Il build command è già letto da `vercel.json`
   (`npm run build`); lascia **Output Directory vuota** — Vercel gestisce `.next` da solo.
3. Premi **Deploy**. La prima build richiede qualche minuto.

## 2. Variabili d'ambiente (Project Settings → Environment Variables)

Impostale **prima** del primo deploy per il ramo `production` (le `NEXT_PUBLIC_*` vengono
incorporate al momento della build):

| Variabile | Valore di produzione |
|---|---|
| `NEXT_PUBLIC_APP_URL` | `https://resumari.vercel.app` |
| `NEXTAUTH_URL` | `https://resumari.vercel.app` |
| `NEXTAUTH_SECRET` | segreto nuovo, lungo e casuale |
| `JWT_SECRET` | segreto nuovo, lungo e casuale (diverso dal precedente) |
| `NEXT_PUBLIC_SUPABASE_URL` | URL del progetto Supabase di produzione |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | anon key di produzione |
| `SUPABASE_SERVICE_ROLE_KEY` | service role key di produzione (mai esposta al client) |
| `YOUTUBE_API_KEY` | chiave Google Cloud |
| `GROQ_API_KEY` | chiave API Groq |
| `GOOGLE_CLIENT_ID` / `GOOGLE_CLIENT_SECRET` | OAuth di produzione |
| `STRIPE_SECRET_KEY` | chiave **live** (sk_live_...) |
| `STRIPE_WEBHOOK_SECRET` | whsec_ dell'endpoint webhook di produzione |
| `RESEND_API_KEY` | chiave Resend |
| `SUPPORT_EMAIL` | `support@resumari.com` — **obbligatoria**: se non impostata il codice usa il fallback su un indirizzo personale |

## 3. Dopo il deploy

- **Stripe**: registra il webhook endpoint `https://resumari.vercel.app/api/webhooks/stripe` con gli eventi
  `checkout.session.completed`, `customer.subscription.updated`, `customer.subscription.deleted`
  e incolla il secret in `STRIPE_WEBHOOK_SECRET`.
- **Google OAuth**: nella Google Cloud Console aggiungi `https://resumari.vercel.app/api/auth/callback/google`
  (e l'URI di callback di NextAuth) alle **Authorized redirect URIs**.
- **Resend**: verifica il dominio `resumari.vercel.app` (record DNS SPF/DKIM) così le email da
  `noreply@resumari.com` non finiscono in spam.
- **Supabase**: applica le migration (`supabase/migrations/migration-api-keys.sql`, `supabase/migrations/migration-transcripts.sql`, `supabase/migrations/migration-waitlist.sql`) e verifica le policy RLS.
- **SEO**: la sitemap è in `public/sitemap.xml` e referenziata dal `robots.txt`; registra
  il dominio nella **Google Search Console** e invia la sitemap.

