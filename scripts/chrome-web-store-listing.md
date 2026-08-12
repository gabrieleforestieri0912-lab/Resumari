# Chrome Web Store — Testi del listing

Testi pronti da incollare nel **Developer Dashboard** (https://chrome.google.com/webstore/devconsole).

---

## Item summary (dal manifest)

> Il campo *Item summary* è sincronizzato con `description` in `scripts/build-extension.js`
> e viene mostrato in `chrome://extensions` e nelle schede di ricerca dello Store.
> Massimo consentito: **132 caratteri** — non modificarlo manualmente qui, aggiornalo nel manifest.

```
Assistente AI per YouTube: trascrizioni istantanee, riassunti intelligenti e chat con i video, senza cambiare scheda.
```

---

## Detailed description (campo "Descrizione dettagliata")

> Nessun limite di lunghezza. Incolla questo testo nel campo **Detailed description**
> della scheda **Store listing**. Evita keyword-stuffing (policy anti-spam di Google).

```
Resumari è il tuo assistente AI per YouTube, direttamente nel browser.

📝 TRASCRIZIONI ISTANTANEE
Un solo click e trasformi qualsiasi video YouTube in una trascrizione completa e accurata, con rilevamento automatico della lingua. Perfetta per studenti, ricercatori, creator e professionisti che devono prendere appunti, citare fonti o riutilizzare contenuti.

🤖 RIASSUNTI INTELLIGENTI
Non hai tempo di guardare un video di un'ora? Resumari lo analizza e ti restituisce un riassunto chiaro, strutturato e fedele al contenuto, così catturi i punti chiave in pochi secondi.

💬 CHAT INTERATTIVA CON I VIDEO
Fai domande direttamente al contenuto: chiarisci un concetto, cerca un'informazione specifica, confronta passaggi o prepara domande per un esame o un incontro. L'AI risponde citando ciò che è stato detto nel video.

▶️ PULSANTE SU OGNI THUMBNAIL
Il bottone "Trascrivi" appare sulle miniature di YouTube: passa il mouse su un video e avvia la trascrizione con un click, senza interrompere la navigazione. Lo stile del pulsante si adatta alla nuova interfaccia di YouTube (2025).

⌨️ SCORCIATOIA DA TASTIERA
Premi Alt+R su un video YouTube per trascriverlo al volo, e usa il popup dell'icona per trascrivere il video corrente o aprire il pannello in un click.

⚡ SIDE PANEL INTEGRATO
Un pannello laterale si apre accanto a YouTube mentre guardi: trascrizione sincronizzata, riassunto e chat sempre a portata di mano, senza cambiare scheda.

🔗 INTEGRAZIONE CON RESUMARI.IT
Accedi con il tuo account Resumari per sincronizzare crediti, cronologia e API. Le trascrizioni salvate sono disponibili anche sul sito.

🔒 PRIVACY E SICUREZZA
- I tuoi dati di accesso non vengono mai condivisi con terze parti.
- Le trascrizioni richiedono il tuo consenso esplicito e vengono elaborate tramite i servizi Resumari.
- Nessun dato viene venduto o usato per profilazione pubblicitaria.
- L'estensione è gratuita da installare; il consumo di crediti AI segue il piano del tuo account Resumari (Free / Pro / Business).

COSA PUOI FARE CON RESUMARI
- Trascrivere video YouTube per appunti e ricerca
- Riassumere lezioni, conferenze, podcast e interviste
- Chattare con i contenuti per studiare più velocemente
- Estrarre citazioni esatte per articoli e tesi
- Convertire e pulire trascrizioni con i tool gratuiti di Resumari.it

COME SI USA
1. Installa l'estensione e apri YouTube.
2. Passa il mouse su un video e clicca il pulsante "Trascrivi" (oppure usa il bottone "Trascrivi" nella pagina del video, la scorciatoia Alt+R o il popup dell'icona).
3. Il side panel si apre e trascrive il video da solo: copia la trascrizione, riassumila con l'IA o apri il risultato sul sito.
4. Se non hai un account, creane uno gratis su resumari.it.

SUPPORTO
Per assistenza: support@resumari.it

Resumari — Trascrizioni AI per YouTube
```

---

## Note sui metadati del listing

| Campo dashboard | Valore consigliato |
|---|---|
| **Category** | Productivity |
| **Language** | Italiano (aggiungi anche English se pubblichi la traduzione) |
| **Single purpose** | Trascrizioni e riassunti AI per YouTube |
| **Permission justification** | Descrivi perché servono i permessi (`sidePanel`, `storage`): apertura del pannello laterale e salvataggio locale della sessione |

### Permessi e motivazione (campo *Permission justification*)

```
- sidePanel: consente di aprire il pannello laterale di Resumari accanto a YouTube
  per mostrare trascrizioni, riassunti e chat senza cambiare scheda.
- storage: sincronizza la sessione (token di accesso e utente) tra il sito
  resumari.it e il side panel — basta accedere una volta — e salva localmente
  il video in attesa di trascrizione per ripristinare il pannello tra le sessioni.
Nessun dato viene trasmesso a terze parti; le trascrizioni vengono elaborate
tramite i servizi Resumari con il consenso esplicito dell'utente.
```

---

## Politica privacy (campo *Privacy practices*)

Quando richiesto, indica:

- **Single purpose**: Trascrizioni AI e riassunti di video YouTube.
- **Dati raccolti**: nessun dato personale viene raccolto dall'estensione in modo
  autonomo; l'accesso avviene tramite l'account Resumari. Le trascrizioni elaborate
  restano associate all'account e non vengono condivise con terze parti.
- **Remote code**: l'estensione non esegue codice remoto non firmato.
- **Sicurezza**: le comunicazioni avvengono su HTTPS verso resumari.it.
