"use client";

import { useEffect } from "react";
import Navbar from "../../components/Navbar";
import Footer from "../../components/Footer";

export default function PrivacyPolicy() {
  useEffect(() => {
    document.title = "Privacy Policy | Resumari";
  }, []);

  return (
    <div className="min-h-screen bg-white dark:bg-zinc-950 text-gray-900 dark:text-gray-100">
      <Navbar />
      <main className="max-w-3xl mx-auto px-6 pt-28 pb-20">
        <h1 className="text-4xl md:text-5xl font-black tracking-tight mb-4">
          Privacy{" "}
          <span className="bg-clip-text text-transparent bg-gradient-to-r from-purple-600 to-red-600">
            Policy
          </span>
        </h1>
        <p className="text-sm text-gray-400 dark:text-gray-500 mb-12">
          Ultimo aggiornamento: 28 marzo 2026
        </p>

        <div className="space-y-10 text-gray-600 dark:text-gray-300 leading-relaxed">
          <section>
            <h2 className="text-xl font-bold text-gray-900 dark:text-gray-100 mb-3">
              1. Introduzione
            </h2>
            <p>
              Resumari (&quot;noi&quot;, &quot;nostro&quot;, &quot;la
              Piattaforma&quot;) si impegna a proteggere la privacy dei propri
              utenti. La presente Privacy Policy descrive come raccogliamo,
              utilizziamo, conserviamo e proteggiamo le informazioni personali
              quando utilizzi il nostro sito web, le nostre estensioni del
              browser e i servizi correlati.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-bold text-gray-900 dark:text-gray-100 mb-3">
              2. Informazioni che raccogliamo
            </h2>
            <p className="mb-3">Raccogliamo le seguenti tipologie di dati:</p>
            <ul className="list-disc pl-6 space-y-2">
              <li>
                <strong>Dati di registrazione:</strong> indirizzo email e
                password (salvata in forma crittografata) necessari per creare e
                gestire il tuo account.
              </li>
              <li>
                <strong>Dati di utilizzo:</strong> conversazioni, link video
                inviati e contenuti caricati sulla piattaforma per fornire i
                servizi di riassunto e analisi.
              </li>
              <li>
                <strong>Dati di pagamento:</strong> elaborati in modo sicuro
                tramite Stripe. Non conserviamo i dati della tua carta di
                credito sui nostri server.
              </li>
              <li>
                <strong>Dati tecnici:</strong> indirizzo IP, tipo di browser,
                sistema operativo e pagine visitate, raccolti automaticamente
                per migliorare il servizio.
              </li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-bold text-gray-900 dark:text-gray-100 mb-3">
              3. Come utilizziamo le informazioni
            </h2>
            <ul className="list-disc pl-6 space-y-2">
              <li>
                Fornire, mantenere e migliorare la Piattaforma e i suoi servizi.
              </li>
              <li>Gestire il tuo account e autenticare gli accessi.</li>
              <li>
                Elaborare i pagamenti e gestire gli abbonamenti tramite Stripe.
              </li>
              <li>
                Comunicare con te per inviare notifiche, aggiornamenti e
                assistenza.
              </li>
              <li>
                Analizzare l&apos;utilizzo della piattaforma per migliorare
                l&apos;esperienza utente.
              </li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-bold text-gray-900 dark:text-gray-100 mb-3">
              4. Conservazione dei dati
            </h2>
            <p>
              Conserviamo i tuoi dati personali per il tempo necessario a
              fornire i servizi richiesti e come richiesto dalla legge. Le
              conversazioni e i contenuti generati vengono conservati finché il
              tuo account è attivo. Puoi richiedere la cancellazione dei tuoi
              dati in qualsiasi momento tramite le impostazioni del profilo o
              contattandoci.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-bold text-gray-900 dark:text-gray-100 mb-3">
              5. Condivisione dei dati
            </h2>
            <p className="mb-3">
              Non vendiamo né affittiamo i tuoi dati personali a terzi.
              Condividiamo le informazioni solo nei seguenti casi:
            </p>
            <ul className="list-disc pl-6 space-y-2">
              <li>
                <strong>Fornitori di servizi:</strong> Supabase (database e autenticazione),
                Stripe (pagamenti), Groq/OpenAI (AI), Resend (email), che operano sotto le rispettive politiche di
                privacy.
              </li>
              <li>
                <strong>Obblighi legali:</strong> quando richiesto dalla legge o
                per proteggere i nostri diritti.
              </li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-bold text-gray-900 dark:text-gray-100 mb-3">
              6. Sicurezza
            </h2>
            <p>
              Adottiamo misure di sicurezza tecniche e organizzative per
              proteggere i tuoi dati, tra cui crittografia delle password,
              connessioni HTTPS e accesso limitato ai dati da parte del
              personale autorizzato. Tuttavia, nessun metodo di trasmissione su
              Internet è completamente sicuro.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-bold text-gray-900 dark:text-gray-100 mb-3">
              7. I tuoi diritti (GDPR)
            </h2>
            <p className="mb-3">
              Se risiedi nell&apos;Unione Europea, hai il diritto di:
            </p>
            <ul className="list-disc pl-6 space-y-2">
              <li>Accedere ai tuoi dati personali.</li>
              <li>Richiedere la rettifica o la cancellazione dei dati.</li>
              <li>Portabilità dei dati.</li>
              <li>Opporti al trattamento dei dati.</li>
              <li>Revocare il consenso in qualsiasi momento.</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-bold text-gray-900 dark:text-gray-100 mb-3">8. Cookie</h2>
            <p>
              Utilizziamo cookie strettamente necessari per il funzionamento
              della piattaforma (autenticazione, sessione). Non utilizziamo
              cookie di profilazione o di terze parti a scopo pubblicitario.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-bold text-gray-900 dark:text-gray-100 mb-3">
              9. Modifiche a questa Privacy Policy
            </h2>
            <p>
              Ci riserviamo il diritto di aggiornare questa Privacy Policy. Le
              modifiche verranno pubblicate su questa pagina con la data di
              aggiornamento. Ti invitiamo a consultare periodicamente questa
              pagina.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-bold text-gray-900 dark:text-gray-100 mb-3">
              10. Contatti
            </h2>
            <p>
              Per qualsiasi domanda relativa a questa Privacy Policy, contattaci
              all&apos;indirizzo:{" "}
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
