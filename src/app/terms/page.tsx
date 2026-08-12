'use client'

import { useEffect } from "react";
import Navbar from "../../components/Navbar";
import Footer from "../../components/Footer";

export default function TermsOfService() {
  useEffect(() => {
    document.title = "Termini di Servizio | Resumari";
  }, []);

  return (
    <div className="min-h-screen bg-white dark:bg-zinc-950 text-gray-900 dark:text-gray-100">
      <Navbar />
      <main className="max-w-3xl mx-auto px-6 pt-28 pb-20">
        <h1 className="text-4xl md:text-5xl font-black tracking-tight mb-4">
          Terms of{" "}
          <span className="bg-clip-text text-transparent bg-gradient-to-r from-purple-600 to-red-600">
            Service
          </span>
        </h1>
        <p className="text-sm text-gray-400 dark:text-gray-500 mb-12">
          Ultimo aggiornamento: 28 marzo 2026
        </p>

        <div className="space-y-10 text-gray-600 dark:text-gray-300 leading-relaxed">
          <section>
            <h2 className="text-xl font-bold text-gray-900 dark:text-gray-100 mb-3">
              1. Accettazione dei Termini
            </h2>
            <p>
              Accedendo e utilizzando Resumari ("Piattaforma"), accetti di essere
              vincolato dai presenti Termini di Servizio. Se non accetti questi
              termini, non utilizzare la Piattaforma.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-bold text-gray-900 dark:text-gray-100 mb-3">
              2. Descrizione del Servizio
            </h2>
            <p>
              Resumari è una piattaforma basata su intelligenza artificiale che
              permette agli utenti di analizzare, trascrivere e riassumere contenuti
              multimediali come video YouTube, documenti PDF e altri file. Il servizio
              include un'interfaccia web e un'estensione per browser Chrome.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-bold text-gray-900 dark:text-gray-100 mb-3">
              3. Account Utente
            </h2>
            <ul className="list-disc pl-6 space-y-2">
              <li>
                Per utilizzare il servizio è necessario creare un account fornendo un
                indirizzo email valido e una password.
              </li>
              <li>
                Sei responsabile della riservatezza delle tue credenziali di accesso.
              </li>
              <li>
                Devi avere almeno 16 anni per creare un account e utilizzare la
                Piattaforma.
              </li>
              <li>
                Ti impegni a fornire informazioni accurate e aggiornate durante la
                registrazione.
              </li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-bold text-gray-900 dark:text-gray-100 mb-3">
              4. Piani e Pagamenti
            </h2>
            <ul className="list-disc pl-6 space-y-2">
              <li>
                Resumari offre un piano gratuito con funzionalità limitate e piani a
                pagamento (Pro e Business) con funzionalità avanzate.
              </li>
              <li>
                I pagamenti vengono elaborati tramite Stripe. Gli abbonamenti si
                rinnovano automaticamente fino alla disdetta.
              </li>
              <li>
                Puoi cancellare il tuo abbonamento in qualsiasi momento dalle
                impostazioni del profilo.
              </li>
              <li>
                I prezzi possono essere soggetti a modifiche con preavviso di almeno
                30 giorni.
              </li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-bold text-gray-900 dark:text-gray-100 mb-3">
              5. Utilizzo Consentito
            </h2>
            <p className="mb-3">Ti impegni a non utilizzare la Piattaforma per:</p>
            <ul className="list-disc pl-6 space-y-2">
              <li>Attività illegali o che violino diritti di terzi.</li>
              <li>
                Caricare contenuti che infrangono il copyright o altri diritti di
                proprietà intellettuale.
              </li>
              <li>Tentare di accedere non autorizzato ai sistemi della Piattaforma.</li>
              <li>
                Utilizzare bot, scraper o altri mezzi automatizzati per accedere al
                servizio.
              </li>
              <li>Sovraccaricare o interferire con il funzionamento della Piattaforma.</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-bold text-gray-900 dark:text-gray-100 mb-3">
              6. Proprietà Intellettuale
            </h2>
            <p>
              Tutti i diritti sulla Piattaforma, incluso il design, il codice, il
              marchio "Resumari" e i contenuti originali, appartengono a Resumari. I
              contenuti generati dall'IA sono forniti come output del servizio e
              l'utente è responsabile del loro utilizzo.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-bold text-gray-900 dark:text-gray-100 mb-3">
              7. Limitazione di Responsabilità
            </h2>
            <p>
              La Piattaforma viene fornita "così com'è" senza garanzie di alcun tipo.
              Resumari non garantisce l'accuratezza, la completezza o l'affidabilità
              dei risultati generati dall'IA. Non siamo responsabili per danni
              diretti, indiretti, incidentali o consequenziali derivanti dall'uso
              della Piattaforma.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-bold text-gray-900 dark:text-gray-100 mb-3">
              8. Sospensione e Terminazione
            </h2>
            <p>
              Ci riserviamo il diritto di sospendere o terminare il tuo account in
              caso di violazione dei presenti termini, con o senza preavviso. Puoi
              eliminare il tuo account in qualsiasi momento dalle impostazioni del
              profilo.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-bold text-gray-900 dark:text-gray-100 mb-3">
              9. Modifiche ai Termini
            </h2>
            <p>
              Possiamo aggiornare questi Termini di Servizio in qualsiasi momento. Le
              modifiche sostanziali verranno comunicate via email o tramite avviso
              sulla Piattaforma. L'uso continuato del servizio dopo le modifiche
              costituisce accettazione dei nuovi termini.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-bold text-gray-900 dark:text-gray-100 mb-3">
              10. Legge Applicabile
            </h2>
            <p>
              Questi termini sono regolati dalle leggi italiane. Qualsiasi controversia
              sarà sottoposta alla giurisdizione esclusiva dei tribunali italiani.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-bold text-gray-900 dark:text-gray-100 mb-3">11. Contatti</h2>
            <p>
              Per domande sui Termini di Servizio, contattaci all'indirizzo:{" "}
              <a
                href="mailto:support@resumari.com"
                className="text-purple-600 font-semibold hover:underline"
              >
                support@resumari.com
              </a>
            </p>
          </section>
        </div>
      </main>
      <Footer />
    </div>
  );
}
