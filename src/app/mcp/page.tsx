"use client";

import { useState } from "react";
import {
  Server,
  Globe,
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  Copy,
  Check,
  BookOpen,
  Zap,
  Users,
  Play,
  Video,
} from "lucide-react";

const clients = [
  {
    name: "ChatGPT",
    desc: "Usa Resumari come connettore MCP remoto se il tuo workspace ChatGPT supporta connettori personalizzati.",
    steps: [
      "Apri le impostazioni dei connettori del tuo workspace.",
      "Crea un connettore personalizzato chiamato Resumari.",
      `Usa https://resumari.it/api/mcp come URL server Streamable HTTP.`,
    ],
    code: "https://resumari.it/api/mcp",
    codeLabel: "Server URL",
  },
  {
    name: "Claude.ai",
    desc: "Aggiungi Resumari come connettore personalizzato, poi approva la schermata di consenso OAuth quando Claude si connette.",
    steps: [
      "Apri le impostazioni di Claude e vai su Connectors.",
      "Aggiungi un connettore personalizzato chiamato Resumari.",
      `Usa https://resumari.it/api/mcp come URL server MCP remoto.`,
    ],
    code: "https://resumari.it/api/mcp",
    codeLabel: "Server URL",
  },
  {
    name: "Claude Code",
    desc: "Registra il server HTTP remoto, poi usa il menu MCP in-app per completare OAuth.",
    steps: [
      "Esegui il comando qui sotto nel terminale.",
      "Apri Claude Code ed esegui /mcp.",
      "Scegli Resumari e completa il login nel browser.",
    ],
    code: "claude mcp add --transport http transcribr https://resumari.it/api/mcp",
    codeLabel: "Terminal",
  },
  {
    name: "Codex",
    desc: "Aggiungi il server Streamable HTTP e lascia che Codex avvii il flusso di login OAuth.",
    steps: [
      "Aggiungi il server con codex mcp add.",
      "Approva il prompt OAuth nel browser che Codex apre durante la configurazione.",
      "L'auth dovrebbe mostrare OAuth invece di Unsupported.",
    ],
    code: "codex mcp add transcribr --url https://resumari.it/api/mcp\ncodex mcp list",
    codeLabel: "Terminal",
  },
  {
    name: "Cursor",
    desc: "Salva il server MCP remoto nelle impostazioni di Cursor o nella configurazione MCP a livello di progetto.",
    steps: [
      "Apri le impostazioni MCP di Cursor o modifica .cursor/mcp.json.",
      "Aggiungi la voce del server transcibr qui sotto.",
      "Connettiti e approva la schermata di consenso OAuth di Resumari.",
    ],
    code: JSON.stringify({ mcpServers: { transcribr: { url: "https://resumari.it/api/mcp" } } }, null, 2),
    codeLabel: "JSON",
  },
  {
    name: "VS Code agents",
    desc: "Aggiungi Resumari come server MCP HTTP remoto nei client agente che leggono la configurazione MCP in stile VS Code.",
    steps: [
      "Apri il tuo file di configurazione MCP.",
      "Aggiungi la voce del server transcibr qui sotto.",
      "Connettiti e completa il flusso di login OAuth di Resumari.",
    ],
    code: JSON.stringify({ servers: { transcribr: { type: "http", url: "https://resumari.it/api/mcp" } } }, null, 2),
    codeLabel: "JSON",
  },
];

const prompts = [
  { icon: Users, title: "Creator Strategy", label: "Turn a video into a teardown", prompt: "Use Transcribr MCP to get the transcript for this video, then break down the hook, audience tension, structure, examples, retention devices, and CTA." },
  { icon: BookOpen, title: "SEO Content", label: "Build an SEO brief", prompt: "Use Transcribr MCP to extract the transcript from this webinar, then turn it into an SEO brief with search intent, H1, meta description, H2/H3 outline, FAQs." },
  { icon: Zap, title: "Competitor Messaging", label: "Analyze a product demo", prompt: "Use Transcribr MCP on this competitor demo, then extract ICP, pain points, promised outcomes, feature hierarchy, objections." },
  { icon: Users, title: "Sales Enablement", label: "Create a sales battlecard", prompt: "Use Transcribr MCP to transcribe this competitor webinar, then create a sales battlecard with strongest claims, weak spots." },
  { icon: BookOpen, title: "Research", label: "Extract claims to verify", prompt: "Use Transcribr MCP on this expert interview, then extract every factual claim, definition, prediction into a table." },
  { icon: Zap, title: "Product", label: "Convert a review into a PM brief", prompt: "Use Transcribr MCP on this product review, then create a PM brief with pain points, delight moments, feature requests." },
];

export default function McpPage() {
  const [expandedClient, setExpandedClient] = useState<number | null>(0);
  const [copied, setCopied] = useState<string | null>(null);

  function copy(text: string, id: string) {
    navigator.clipboard.writeText(text);
    setCopied(id);
    setTimeout(() => setCopied(null), 2000);
  }

  return (
    <div className="min-h-screen bg-white dark:bg-zinc-950">
      {/* ── Hero ── */}
      <section className="pt-32 pb-20 px-4">
        <div className="max-w-5xl mx-auto text-center">
          <div className="inline-flex items-center gap-2 px-4 py-1.5 bg-purple-50 dark:bg-purple-950/40 rounded-full text-purple-700 dark:text-purple-300 text-sm font-bold mb-6">
            <Server size={14} />
            Remote MCP Server
          </div>
          <h1 className="text-5xl md:text-6xl font-black text-gray-900 dark:text-gray-100 mb-4 tracking-tight">
            YouTube Transcript MCP
          </h1>
          <p className="text-xl text-gray-500 dark:text-gray-400 font-semibold mb-3 max-w-3xl mx-auto">
            Trasforma video YouTube in contesto AI pulito e pronto per ChatGPT, Claude, Cursor e altri agenti compatibili con MCP.
          </p>
          <p className="text-gray-400 dark:text-gray-500 max-w-2xl mx-auto">
            Resumari usa i sottotitoli YouTube esistenti e non crea trascrizioni ASR per video senza didascalie.
          </p>

          {/* Client badges */}
          <div className="flex flex-wrap justify-center gap-3 mt-10">
            {["ChatGPT", "Claude", "Claude Code", "Cursor", "VS Code agents", "Registries"].map((name, i) => (
              <span key={i} className="px-5 py-2 bg-gray-100 dark:bg-zinc-800 text-gray-700 dark:text-gray-300 text-sm font-bold rounded-xl">
                {name}
              </span>
            ))}
          </div>
        </div>
      </section>

      {/* ── MCP Server URL ── */}
      <section className="py-12 px-4 bg-gray-50 dark:bg-zinc-900">
        <div className="max-w-2xl mx-auto text-center">
          <div className="flex items-center gap-2 justify-center mb-4">
            <Globe size={20} className="text-purple-600" />
            <h2 className="text-lg font-black text-gray-900 dark:text-gray-100">Server URL</h2>
          </div>
          <div className="bg-white dark:bg-zinc-900 rounded-2xl border border-gray-200 dark:border-zinc-800 shadow-sm p-2 flex items-center gap-2">
            <code className="flex-1 text-sm font-mono text-gray-800 dark:text-gray-200 px-4 py-3 truncate">
              https://resumari.it/api/mcp
            </code>
            <button
              onClick={() => copy("https://resumari.it/api/mcp", "server-url")}
              className="p-3 hover:bg-gray-100 rounded-xl transition-all"
            >
              {copied === "server-url" ? <Check size={18} className="text-green-600" /> : <Copy size={18} className="text-gray-400" />}
            </button>
          </div>
        </div>
      </section>

      {/* ── Tools ── */}
      <section className="py-16 px-4">
        <div className="max-w-4xl mx-auto">
          <h2 className="text-3xl font-black text-gray-900 dark:text-gray-100 text-center mb-3">Tools</h2>
          <p className="text-gray-500 dark:text-gray-400 text-center mb-10 max-w-xl mx-auto">
            Due strumenti MCP per inviare video e ricevere trascrizioni pulite in formato markdown.
          </p>
          <div className="grid md:grid-cols-2 gap-6">
            {/* youtube.transcribe */}
            <div className="bg-white dark:bg-zinc-900 rounded-2xl border border-gray-100 dark:border-zinc-800 shadow-sm p-6">
              <div className="flex items-center gap-2 mb-1">
                <Play size={18} className="text-purple-600" />
                <code className="text-sm font-mono font-bold text-gray-900 dark:text-gray-100">youtube.transcribe</code>
              </div>
              <p className="text-sm text-gray-500 dark:text-gray-400 mt-2">
                Invia un singolo URL o ID video YouTube e avvia un job di trascrizione asincrono.
                Restituisce un job_id da usare con <code className="text-xs font-mono bg-gray-100 dark:bg-zinc-800 px-1 rounded">youtube.get_transcript_job</code>.
              </p>
            </div>

            {/* youtube.get_transcript_job */}
            <div className="bg-white dark:bg-zinc-900 rounded-2xl border border-gray-100 dark:border-zinc-800 shadow-sm p-6">
              <div className="flex items-center gap-2 mb-1">
                <CheckCircle2 size={18} className="text-purple-600" />
                <code className="text-sm font-mono font-bold text-gray-900 dark:text-gray-100">youtube.get_transcript_job</code>
              </div>
              <p className="text-sm text-gray-500 dark:text-gray-400 mt-2">
                Interroga il job e ricevi la trascrizione in markdown pulito quando è pronta.
                Usa questo strumento dopo aver chiamato <code className="text-xs font-mono bg-gray-100 dark:bg-zinc-800 px-1 rounded">youtube.transcribe</code>.
              </p>
            </div>
          </div>

          {/* Response example */}
          <div className="mt-8 bg-gray-900 dark:bg-black rounded-2xl p-6 overflow-x-auto">
            <pre className="text-sm text-gray-300 font-mono whitespace-pre">{`{
  "job_id": "7e1f...",
  "status": "completed",
  "video": {
    "title": "How Transformers Work",
    "channel": "Example Channel"
  },
  "transcript": {
    "format": "markdown",
    "text": "# How Transformers Work\\n\\n..."
  },
  "usage": {
    "credits_used": 12
  }
}`}</pre>
          </div>
        </div>
      </section>

      {/* ── Client Setup ── */}
      <section className="py-16 px-4 bg-gray-50 dark:bg-zinc-900">
        <div className="max-w-4xl mx-auto">
          <h2 className="text-3xl font-black text-gray-900 dark:text-gray-100 text-center mb-3">Set up your MCP client</h2>
          <p className="text-gray-500 dark:text-gray-400 text-center mb-10 max-w-xl mx-auto">
            Resumari usa OAuth. Il client apre una schermata di consenso nel browser, poi salva e aggiorna il token per richieste future.
          </p>

          <div className="space-y-4">
            {clients.map((client, i) => (
              <div key={i} className="bg-white dark:bg-zinc-900 rounded-2xl border border-gray-100 dark:border-zinc-800 shadow-sm overflow-hidden">
                <button
                  onClick={() => setExpandedClient(expandedClient === i ? null : i)}
                  className="w-full flex items-center justify-between p-5 hover:bg-gray-50 dark:hover:bg-zinc-800 transition-all text-left"
                >
                  <div className="flex items-center gap-3">
                    <span className="font-bold text-gray-900 dark:text-gray-100">{client.name}</span>
                  </div>
                  {expandedClient === i ? <ChevronUp size={18} className="text-gray-400 shrink-0" /> : <ChevronDown size={18} className="text-gray-400 shrink-0" />}
                </button>
                {expandedClient === i && (
                  <div className="px-5 pb-6 border-t border-gray-100 dark:border-zinc-800">
                    <p className="text-sm text-gray-500 dark:text-gray-400 mt-4 mb-4">{client.desc}</p>
                    <ol className="space-y-3 mb-5">
                      {client.steps.map((step, j) => (
                        <li key={j} className="flex items-start gap-3 text-sm text-gray-700 dark:text-gray-300">
                          <span className="w-6 h-6 rounded-full bg-purple-100 text-purple-700 flex items-center justify-center font-bold text-xs shrink-0 mt-0.5">
                            {j + 1}
                          </span>
                          <span>{step}</span>
                        </li>
                      ))}
                    </ol>
                    <div className="bg-gray-50 dark:bg-zinc-800 rounded-xl p-1 flex items-center gap-2">
                      <span className="text-xs font-bold text-gray-400 uppercase px-3 shrink-0">{client.codeLabel}</span>
                      <code className="flex-1 text-xs font-mono text-gray-700 dark:text-gray-300 px-3 py-2 truncate">{client.code}</code>
                      <button
                        onClick={() => copy(client.code, `client-${i}`)}
                        className="p-2 hover:bg-gray-200 rounded-lg transition-all shrink-0"
                      >
                        {copied === `client-${i}` ? <Check size={14} className="text-green-600" /> : <Copy size={14} className="text-gray-400" />}
                      </button>
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Docker & Registries ── */}
      <section className="py-16 px-4">
        <div className="max-w-4xl mx-auto">
          <h2 className="text-3xl font-black text-gray-900 dark:text-gray-100 text-center mb-3">Docker and Registries</h2>
          <p className="text-gray-500 dark:text-gray-400 text-center mb-10 max-w-xl mx-auto">
            Usa l'URL del server remoto in Docker Desktop, Smithery-style o altre voci di registro MCP.
          </p>
          <div className="bg-white dark:bg-zinc-900 rounded-2xl border border-gray-100 dark:border-zinc-800 shadow-sm p-6">
            <ol className="space-y-3 mb-5">
              <li className="flex items-start gap-3 text-sm text-gray-700 dark:text-gray-300">
                <span className="w-6 h-6 rounded-full bg-purple-100 dark:bg-purple-950/50 text-purple-700 dark:text-purple-300 flex items-center justify-center font-bold text-xs shrink-0 mt-0.5">1</span>
                <span>Crea o seleziona una voce di server MCP remoto.</span>
              </li>
              <li className="flex items-start gap-3 text-sm text-gray-700 dark:text-gray-300">
                <span className="w-6 h-6 rounded-full bg-purple-100 dark:bg-purple-950/50 text-purple-700 dark:text-purple-300 flex items-center justify-center font-bold text-xs shrink-0 mt-0.5">2</span>
                <span>Imposta il trasporto su Streamable HTTP.</span>
              </li>
              <li className="flex items-start gap-3 text-sm text-gray-700 dark:text-gray-300">
                <span className="w-6 h-6 rounded-full bg-purple-100 dark:bg-purple-950/50 text-purple-700 dark:text-purple-300 flex items-center justify-center font-bold text-xs shrink-0 mt-0.5">3</span>
                <span>Usa OAuth per l'autorizzazione dell'account.</span>
              </li>
            </ol>
            <div className="bg-gray-900 rounded-xl p-5 overflow-x-auto">
              <pre className="text-sm text-gray-300 font-mono whitespace-pre">{`{
  "name": "transcribr",
  "transport": "streamable-http",
  "url": "https://resumari.it/api/mcp",
  "auth": "oauth"
}`}</pre>
            </div>
          </div>
        </div>
      </section>

      {/* ── Auth Troubleshooting ── */}
      <section className="py-16 px-4 bg-gray-50 dark:bg-zinc-900">
        <div className="max-w-3xl mx-auto">
          <h2 className="text-3xl font-black text-gray-900 dark:text-gray-100 text-center mb-3">Seeing Auth: Unsupported?</h2>
          <p className="text-gray-500 dark:text-gray-400 text-center mb-8">
            Verifica che i metadati della risorsa protetta usino l'URL HTTPS canonico, che OAuth Server e Dynamic Client Registration siano abilitati,
            poi rimuovi e riaggiungi il server MCP dopo il deploy.
          </p>
          <div className="bg-white dark:bg-zinc-900 rounded-2xl border border-gray-100 dark:border-zinc-800 shadow-sm p-6">
            <p className="text-xs font-bold text-gray-400 uppercase mb-3">Rimedi</p>
            <div className="space-y-2">
              {[
                "Verifica che l'URL del server sia HTTPS (non HTTP).",
                "Assicurati che .well-known/oauth-authorization-server sia accessibile.",
                "Rimuovi e riaggiungi il server MCP dopo il deploy.",
              ].map((tip, i) => (
                <p key={i} className="text-sm text-gray-600 dark:text-gray-300 flex items-start gap-2">
                  <span className="text-purple-600 mt-0.5">•</span>
                  {tip}
                </p>
              ))}
            </div>
            <div className="mt-4 bg-gray-50 dark:bg-zinc-800 rounded-xl p-4">
              <pre className="text-sm text-gray-600 dark:text-gray-300 font-mono whitespace-pre">{`codex mcp remove transcribr
codex mcp add transcribr --url https://resumari.it/api/mcp
codex mcp list`}</pre>
            </div>
          </div>
        </div>
      </section>

      {/* ── Prompts ── */}
      <section className="py-16 px-4">
        <div className="max-w-4xl mx-auto">
          <h2 className="text-3xl font-black text-gray-900 dark:text-gray-100 text-center mb-3">Prompts to Try</h2>
          <p className="text-gray-500 dark:text-gray-400 text-center mb-10 max-w-xl mx-auto">
            Workflow MCP pratici da incollare nel tuo agente una volta connesso Resumari.
          </p>
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
            {prompts.map((p, i) => (
              <div key={i} className="bg-gray-50 dark:bg-zinc-900 rounded-2xl p-5 border border-gray-100 dark:border-zinc-800 hover:border-purple-200 dark:hover:border-purple-700 transition-all cursor-pointer group"
                onClick={() => copy(p.prompt + " <YOUTUBE_URL>", `prompt-${i}`)}
              >
                <p className="text-xs font-bold text-gray-400 uppercase mb-1">{p.label}</p>
                <h3 className="font-bold text-gray-900 dark:text-gray-100 text-sm mb-1">{p.title}</h3>
                <p className="text-xs text-gray-500 dark:text-gray-400 line-clamp-2">{p.prompt}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── What the agent receives ── */}
      <section className="py-16 px-4 bg-gray-50 dark:bg-zinc-900">
        <div className="max-w-4xl mx-auto">
          <h2 className="text-3xl font-black text-gray-900 dark:text-gray-100 text-center mb-3">What the agent receives</h2>
          <p className="text-gray-500 dark:text-gray-400 text-center mb-10 max-w-xl mx-auto">
            Resumari estrae il transcript nativo, addebita crediti, esegue la pulizia in modo asincrono e restituisce markdown pronto per il contesto AI.
          </p>
          <div className="grid md:grid-cols-3 gap-4 text-center">
            {[
              { label: "One YouTube video per request", icon: Video },
              { label: "Clean markdown output", icon: CheckCircle2 },
              { label: "Existing YouTube captions only", icon: BookOpen },
            ].map((item, i) => (
              <div key={i} className="bg-white dark:bg-zinc-900 rounded-2xl p-5 border border-gray-100 dark:border-zinc-800 shadow-sm">
                <item.icon size={24} className="text-purple-600 mx-auto mb-3" />
                <p className="font-bold text-gray-900 dark:text-gray-100 text-sm">{item.label}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Footer note ── */}
      <section className="py-10 px-4">
        <p className="text-center text-xs text-gray-400">
          Client names and logos are trademarks of their respective owners. No endorsement implied.
        </p>
      </section>
    </div>
  );
}
