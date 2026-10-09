# Regole per gli agenti su questo repository

## Progetto

Resumari: piattaforma Next.js 16 (App Router, React 19) che trascrive e riassume
video YouTube. Integra estensione Chrome, API REST con chiavi API e server MCP.
Backend: Supabase (service role) + xKiro per l'AI + Stripe.

## Dopo ogni modifica: commit e push automatici

Il plugin `.opencode/plugin/autosync.ts` (attivato da `opencode.json`) scatta dopo
ogni tool di modifica (`edit`, `write`, `patch`):

1. esegue i controlli in ordine — `tsc --noEmit`, `eslint src`, `vitest run`;
2. se **tutti** passano, committa **solo i file toccati da quella edit** e fa
   `git push` sul branch corrente;
3. se un controllo fallisce **non committa nulla**: la modifica resta locale e
   l'errore viene stampato.

Note pratiche:

- le edit ravvicinate vengono accorpate entro 1,5s: un refactor da 10 edit non
  genera 10 commit (e quindi 10 deploy su Vercel);
- `git add` è limitato ai file della singola edit, non `git add -A`: lavoro non
  finito del developer non viene pubblicato per errore;
- durante merge/rebase la sincronizzazione viene saltata;
- il commit è `chore(sync): N file aggiornati` con i percorsi nel corpo: non
  finge di conoscere l'intento della modifica.

Conseguenza pratica: `main` riceve un commit per ogni modifica e **Vercel fa
deploy a ogni push**. Un intervento che tocca più file arriva sul branch in più
passate: meglio ragionare in termini di "stato pubblicabile" prima di iniziare.

## Prima di dichiarare un intervento finito

- `npx tsc --noEmit`, `npx eslint src`, `npm test` (Vitest) e `npm run build`
  quando l'intervento tocca routing, build o bundle.
- I test sono in `src/**/__tests__` e `src/app/api/__tests__`; un bugfix senza
  test che lo copra va considerato incompleto.

## Come è scritto il codice

- Commenti e test in italiano, coerenti con lo stile già presente nei file.
- Niente segreti nel repository: le chiavi stanno in `.env` (gitignored);
  `.env.example` documenta le variabili.
- I limiti e i prezzi hanno una sola fonte: `src/lib/plans.ts` (e
  `src/lib/api-keys.ts` per le chiavi API). Le pagine client e le route
  server leggono da lì, così non divergono.
- Per i timestamp dei messaggi AI: mai fidarsi dei secondi prodotti dal
  modello, passano da `src/lib/timestamps.ts` (`alignTimestampsInMarkdown`),
  che li riallinea alla trascrizione reale e li rimuove se non verificabili.
