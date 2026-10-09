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
| `XKIRO_API_KEY` | chiave API xKiro (`sk-xt-…`) |
| `XKIRO_MODEL` | *(opzionale)* modello chat — default `openai/gpt-5.6-sol` |
| `XKIRO_VISION_MODEL` | *(opzionale)* modello vision — default = `XKIRO_MODEL` |
| `GROQ_API_KEY` | *(opzionale)* solo per trascrizione audio Whisper — xKiro non offre STT |
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
- **Supabase**: applica **tutte** le migration in `supabase/migrations/`, nell'ordine:
  `migration-api-keys.sql`, `migration-rate-limits.sql`, `migration-transcripts.sql`, `migration-mcp-jobs.sql`.
  `migration-api-keys.sql` e `migration-rate-limits.sql` sono obbligatorie per API key e rate limit,
  `migration-mcp-jobs.sql` per i job del server MCP. Tutte abilitano RLS: le tabelle sono
  gestite solo dal service role.
- **Verifica dopo il deploy**: apri `https://<dominio>/api/health` e controlla
  - `status: ok` (con `degraded` il DB non è raggiungibile o la chiave non è `service_role`);
  - `supabase_host` = il progetto Supabase **reale**;
  - `supabase_key_role: service_role`;
  - `db_users`, `db_api_keys`, `db_rate_limits`, `db_mcp_jobs` = `ok` (le migration sono applicate).
- **SEO**: la sitemap è in `public/sitemap.xml` e referenziata dal `robots.txt`; registra
  il dominio nella **Google Search Console** e invia la sitemap.
- **MCP**: `https://<dominio>/.well-known/oauth-protected-resource` e
  `https://<dominio>/.well-known/oauth-authorization-server` devono rispondere 200; l'`issuer`
  restituito deve coincidere con il dominio pubblico. Se i client MCP non autenticano, quasi
  sempre il problema è qui o in `NEXT_PUBLIC_APP_URL`.

