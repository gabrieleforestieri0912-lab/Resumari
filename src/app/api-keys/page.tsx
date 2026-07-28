"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import {
  Key,
  Copy,
  Check,
  Plus,
  Trash2,
  ChevronDown,
  ChevronUp,
  Code,
  Terminal,
  BookOpen,
  Shield,
  Zap,
  Clock,
  RefreshCw,
  FileText,
  Users,
} from "lucide-react";

type ApiKeyEntry = {
  id: string;
  name: string;
  key_prefix: string;
  created_at: string;
  last_used_at: string | null;
  revoked: boolean;
};

const codeExamples = {
  curl: `curl -X POST https://resumari.it/api/v1/transcript \\
  -H "Content-Type: application/json" \\
  -H "X-API-Key: rsm_live_YOUR_KEY_HERE" \\
  -d '{"video_id": "dQw4w9WgXcQ"}'`,
  python: `import requests

url = "https://resumari.it/api/v1/transcript"
headers = {"X-API-Key": "rsm_live_YOUR_KEY_HERE"}
data = {"video_id": "dQw4w9WgXcQ"}

response = requests.post(url, headers=headers, json=data)
print(response.json())`,
  node: `const fetch = require('node-fetch');

const url = "https://resumari.it/api/v1/transcript";
const headers = { "X-API-Key": "rsm_live_YOUR_KEY_HERE" };
const body = { video_id: "dQw4w9WgXcQ" };

fetch(url, { method: "POST", headers, body: JSON.stringify(body) })
  .then(res => res.json())
  .then(console.log);`,
  bulkCurl: `curl -N -X POST https://resumari.it/api/v1/transcript/bulk \\
  -H "Content-Type: application/json" \\
  -H "X-API-Key: rsm_live_YOUR_KEY_HERE" \\
  -d '{"url": "https://www.youtube.com/@edmundyong"}'`,
  bulkPython: `import requests

url = "https://resumari.it/api/v1/transcript/bulk"
headers = {"X-API-Key": "rsm_live_YOUR_KEY_HERE"}
data = {"url": "https://www.youtube.com/@edmundyong"}

response = requests.post(url, headers=headers, json=data, stream=True)
for line in response.iter_lines():
    if line:
        print(line.decode())`,
  bulkNode: `const fetch = require('node-fetch');

const url = "https://resumari.it/api/v1/transcript/bulk";
const headers = { "X-API-Key": "rsm_live_YOUR_KEY_HERE" };
const body = { url: "https://www.youtube.com/@edmundyong" };

fetch(url, { method: "POST", headers, body: JSON.stringify(body) }).then(async res => {
  const reader = res.body.getReader();
  const decoder = new TextDecoder();
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    console.log(decoder.decode(value));
  }
});`,
};

const errors = [
  { code: "missing_api_key", description: "Intestazione X-API-Key non fornita" },
  { code: "invalid_api_key", description: "Chiave non valida o revocata" },
  { code: "invalid_input", description: "Corpo della richiesta o URL YouTube non valido" },
  { code: "insufficient_credits", description: "Crediti insufficienti" },
  { code: "no_transcript", description: "Il video non ha sottotitoli disponibili" },
  { code: "resolution_failed", description: "URL canale/playlist non risolvibile" },
  { code: "no_videos", description: "Nessun video pubblico trovato" },
  { code: "rate_limited", description: "Limite richieste al minuto superato" },
];

const comparisons = [
  { name: "Resumari API", tag: "Pay-as-you-go, nessun abbonamento", credits: "25 crediti gratis" },
  { name: "youtube-transcript-api", tag: "Libreria open-source locale", credits: "Gratis (self-hosted)" },
  { name: "TranscriptAPI", tag: "Abbonamento mensile", credits: "A pagamento" },
  { name: "Supadata", tag: "API dati generici", credits: "A pagamento" },
  { name: "Apify Actors", tag: "Marketplace automation", credits: "A pagamento" },
];

const faqs = [
  { q: "Come funziona il pricing?", a: "Ogni richiesta API costa 2 crediti. I crediti non scadono mai. Puoi acquistare pacchetti a partire da €4,99 per 100 crediti. Gli account gratuiti ricevono 25 crediti di prova." },
  { q: "Cosa include la risposta API?", a: "La risposta include: video_id, titolo, canale, durata, transcript (array di segmenti con testo, start time e durata), testo completo, lingua, crediti usati e rimanenti." },
  { q: "Quali sono i rate limit?", a: "30 richieste al minuto per chiave API. Per volumi superiori, contattaci per un piano personalizzato." },
  { q: "Cosa succede se un video non ha transcript?", a: "La richiesta non va a buon fine e i crediti non vengono consumati. Le estrazioni fallite vengono rimborsate automaticamente." },
  { q: "Posso specificare una lingua?", a: "Al momento l'API tenta prima l'italiano, poi l'inglese. Il rilevamento è automatico." },
  { q: "Come mi autentico?", a: "Includi la tua chiave API nell'intestazione X-API-Key di ogni richiesta. Non serve OAuth." },
  { q: "Devo usare una chiave YouTube Data API?", a: "No. Resumari gestisce l'estrazione senza bisogno della YouTube Data API." },
];

export default function ApiKeysPage() {
  const router = useRouter();
  const [user, setUser] = useState<any>(null);
  const [keys, setKeys] = useState<ApiKeyEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [newKeyName, setNewKeyName] = useState("");
  const [showNewKeyForm, setShowNewKeyForm] = useState(false);
  const [newlyCreatedKey, setNewlyCreatedKey] = useState<string | null>(null);
  const [copiedKey, setCopiedKey] = useState<string | null>(null);
  const [expandedEndpoint, setExpandedEndpoint] = useState<"single" | "bulk" | null>("single");
  const [expandedCodeLang, setExpandedCodeLang] = useState<"curl" | "python" | "node">("curl");
  const [expandedBulkLang, setExpandedBulkLang] = useState<"curl" | "python" | "node">("curl");
  const [expandedFaq, setExpandedFaq] = useState<number | null>(null);
  const [credits, setCredits] = useState(0);

  useEffect(() => {
    const storedUser = localStorage.getItem("user");
    const token = localStorage.getItem("token");
    if (!storedUser || !token) {
      router.push("/login");
      return;
    }
    const parsed = JSON.parse(storedUser);
    setUser(parsed);
    setCredits(parsed.credits || 0);
    fetchKeys();
  }, []);

  async function fetchKeys() {
    const token = localStorage.getItem("token");
    try {
      const res = await fetch("/api/keys", { headers: { Authorization: `Bearer ${token}` } });
      const data = await res.json();
      if (data.keys) setKeys(data.keys);
    } catch {} finally {
      setLoading(false);
    }
  }

  async function createKey() {
    if (!newKeyName.trim()) return;
    const token = localStorage.getItem("token");
    try {
      const res = await fetch("/api/keys", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ name: newKeyName.trim() }),
      });
      const data = await res.json();
      if (data.key) {
        setNewlyCreatedKey(data.key);
        setNewKeyName("");
        setShowNewKeyForm(false);
        fetchKeys();
      }
    } catch {}
  }

  async function revokeKey(id: string) {
    if (!confirm("Revocare questa chiave? Le integrazioni che la usano smetteranno di funzionare.")) return;
    const token = localStorage.getItem("token");
    try {
      await fetch(`/api/keys/${id}`, { method: "DELETE", headers: { Authorization: `Bearer ${token}` } });
      fetchKeys();
    } catch {}
  }

  function copyKey(key: string) {
    navigator.clipboard.writeText(key);
    setCopiedKey(key);
    setTimeout(() => setCopiedKey(null), 2000);
  }

  if (!user) return null;

  return (
    <div className="min-h-screen bg-white">
      {/* ── Hero ── */}
      <section className="pt-32 pb-20 px-4">
        <div className="max-w-5xl mx-auto text-center">
          <div className="inline-flex items-center gap-2 px-4 py-1.5 bg-purple-50 rounded-full text-purple-700 text-sm font-bold mb-6">
            <Zap size={14} />
            API
          </div>
          <h1 className="text-5xl md:text-6xl font-black text-gray-900 mb-4 tracking-tight">
            YouTube Transcript API
          </h1>
          <p className="text-xl text-gray-500 font-semibold mb-3">
            Bulk transcript extraction. No monthly subscription.
          </p>
          <p className="text-gray-400 max-w-2xl mx-auto mb-10">
            Molte API di trascrizione richiedono abbonamenti o sono limitate a un video singolo.
            L'API di Resumari estrae dozzine di trascrizioni in una singola chiamata,
            con crediti pay-as-you-go che non scadono mai.
          </p>

          {/* API Key Generator */}
          <div className="max-w-lg mx-auto bg-gray-50 rounded-3xl p-8 border border-gray-100 shadow-sm">
            <div className="flex items-center gap-3 mb-4">
              <Key size={20} className="text-purple-600" />
              <h2 className="text-lg font-black text-gray-900">Get Your API Key — {credits > 0 ? credits : 25} Free Credits</h2>
            </div>

            <div className="space-y-3">
              {keys.filter(k => !k.revoked).map(key => (
                <div key={key.id} className="flex items-center justify-between bg-white rounded-xl px-4 py-3 border border-gray-200">
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-bold text-gray-400 uppercase">{key.name}</p>
                    <p className="text-sm font-mono text-gray-600 truncate">{key.key_prefix}</p>
                  </div>
                  <button
                    onClick={() => revokeKey(key.id)}
                    className="p-2 text-red-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-all"
                    title="Revoca"
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
              ))}
            </div>

            {newlyCreatedKey && (
              <div className="mt-4 bg-yellow-50 border border-yellow-200 rounded-xl p-4">
                <p className="text-xs font-bold text-yellow-700 uppercase mb-1">Chiave creata — copiala ora!</p>
                <div className="flex items-center gap-2">
                  <code className="flex-1 text-sm font-mono bg-white px-3 py-2 rounded-lg border border-yellow-200 text-gray-800 truncate">
                    {newlyCreatedKey}
                  </code>
                  <button
                    onClick={() => copyKey(newlyCreatedKey)}
                    className="p-2 bg-white rounded-lg border border-yellow-200 hover:bg-yellow-100 transition-all"
                  >
                    {copiedKey === newlyCreatedKey ? <Check size={16} className="text-green-600" /> : <Copy size={16} className="text-gray-500" />}
                  </button>
                </div>
                <p className="text-xs text-yellow-600 mt-2">Questa chiave viene mostrata una volta sola. Salvala in un posto sicuro.</p>
              </div>
            )}

            {showNewKeyForm ? (
              <div className="mt-4 space-y-3">
                <input
                  type="text"
                  value={newKeyName}
                  onChange={e => setNewKeyName(e.target.value)}
                  placeholder="Nome per la chiave (es. Produzione, Sviluppo)"
                  className="w-full px-4 py-3 rounded-xl border border-gray-200 text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-purple-500/20 focus:border-purple-400"
                  onKeyDown={e => e.key === 'Enter' && createKey()}
                />
                <div className="flex gap-2">
                  <button
                    onClick={createKey}
                    className="flex-1 px-4 py-3 bg-gray-900 text-white text-sm font-bold rounded-xl hover:bg-black transition-all"
                  >
                    Genera Chiave
                  </button>
                  <button
                    onClick={() => { setShowNewKeyForm(false); setNewKeyName(""); }}
                    className="px-4 py-3 text-sm font-semibold text-gray-500 hover:text-gray-700 transition-all"
                  >
                    Annulla
                  </button>
                </div>
              </div>
            ) : (
              <button
                onClick={() => setShowNewKeyForm(true)}
                className="mt-4 w-full flex items-center justify-center gap-2 px-4 py-3 border-2 border-dashed border-gray-300 text-gray-500 text-sm font-bold rounded-xl hover:border-purple-300 hover:text-purple-600 hover:bg-purple-50/50 transition-all"
              >
                <Plus size={16} />
                Genera nuova chiave API
              </button>
            )}
          </div>
        </div>
      </section>

      {/* ── Quick Start ── */}
      <section className="py-16 px-4 bg-gray-50">
        <div className="max-w-4xl mx-auto">
          <h2 className="text-3xl font-black text-gray-900 text-center mb-3">Quick Start</h2>
          <p className="text-gray-500 text-center mb-12 max-w-xl mx-auto">
            Ottieni la tua chiave API e inizia a estrarre trascrizioni in meno di un minuto.
            I video devono avere sottotitoli YouTube esistenti.
          </p>

          <div className="grid md:grid-cols-3 gap-6">
            {[
              { step: "1", icon: Users, title: "Create an Account", desc: "Registrati su Resumari. Gli account gratuiti ricevono 25 crediti per testare l'API — senza carta di credito." },
              { step: "2", icon: Key, title: "Generate an API Key", desc: "Vai alla sezione API Keys qui sopra, nomea la tua chiave e copiala. La chiave viene mostrata una volta — salvala in modo sicuro." },
              { step: "3", icon: Terminal, title: "Make Your First Request", desc: "Invia una richiesta POST con la tua chiave nell'intestazione X-API-Key e un video ID. Riceverai il JSON con la trascrizione completa." },
            ].map((item, i) => (
              <div key={i} className="bg-white rounded-2xl p-6 border border-gray-100 shadow-sm">
                <div className="w-10 h-10 rounded-xl bg-purple-100 text-purple-700 flex items-center justify-center font-black text-sm mb-4">
                  {item.step}
                </div>
                <item.icon size={20} className="text-purple-600 mb-3" />
                <h3 className="font-bold text-gray-900 mb-2">{item.title}</h3>
                <p className="text-sm text-gray-500">{item.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Authentication ── */}
      <section className="py-16 px-4">
        <div className="max-w-4xl mx-auto">
          <div className="flex items-center gap-3 mb-3">
            <Shield size={24} className="text-purple-600" />
            <h2 className="text-3xl font-black text-gray-900">Authentication</h2>
          </div>
          <p className="text-gray-500 mb-6">
            Includi la tua chiave API nell'intestazione <code className="bg-gray-100 px-2 py-0.5 rounded text-sm font-mono">X-API-Key</code> in ogni richiesta.
          </p>
          <div className="bg-gray-900 rounded-2xl p-6 overflow-x-auto">
            <pre className="text-sm text-gray-300 font-mono whitespace-pre">X-API-Key: rsm_live_YOUR_KEY_HERE</pre>
          </div>
        </div>
      </section>

      {/* ── Endpoints ── */}
      <section className="py-16 px-4 bg-gray-50">
        <div className="max-w-4xl mx-auto">
          <div className="flex items-center gap-3 mb-3">
            <Code size={24} className="text-purple-600" />
            <h2 className="text-3xl font-black text-gray-900">Endpoints</h2>
          </div>

          {/* Single */}
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden mb-6">
            <button
              onClick={() => setExpandedEndpoint(expandedEndpoint === "single" ? null : "single")}
              className="w-full flex items-center justify-between p-6 hover:bg-gray-50 transition-all text-left"
            >
              <div>
                <div className="flex items-center gap-3 mb-1">
                  <span className="px-2.5 py-0.5 bg-green-100 text-green-700 text-xs font-bold rounded-md">POST</span>
                  <code className="text-sm font-mono text-gray-800">/api/v1/transcript</code>
                </div>
                <p className="text-sm text-gray-500">Estrai la trascrizione da un singolo video YouTube. Costa 2 crediti.</p>
              </div>
              {expandedEndpoint === "single" ? <ChevronUp size={20} className="text-gray-400" /> : <ChevronDown size={20} className="text-gray-400" />}
            </button>
            {expandedEndpoint === "single" && (
              <div className="px-6 pb-6">
                {/* Lang tabs */}
                <div className="flex gap-1 mb-4 bg-gray-100 rounded-lg p-1 w-fit">
                  {(["curl", "python", "node"] as const).map(lang => (
                    <button
                      key={lang}
                      onClick={() => setExpandedCodeLang(lang)}
                      className={`px-4 py-1.5 text-xs font-bold rounded-md transition-all ${expandedCodeLang === lang ? "bg-white text-gray-900 shadow-sm" : "text-gray-500 hover:text-gray-700"}`}
                    >
                      {lang === "curl" ? "cURL" : lang === "python" ? "Python" : "Node.js"}
                    </button>
                  ))}
                </div>
                <div className="bg-gray-900 rounded-xl p-5 overflow-x-auto">
                  <pre className="text-sm text-gray-300 font-mono whitespace-pre">{codeExamples[expandedCodeLang]}</pre>
                </div>
              </div>
            )}
          </div>

          {/* Bulk */}
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
            <button
              onClick={() => setExpandedEndpoint(expandedEndpoint === "bulk" ? null : "bulk")}
              className="w-full flex items-center justify-between p-6 hover:bg-gray-50 transition-all text-left"
            >
              <div>
                <div className="flex items-center gap-3 mb-1">
                  <span className="px-2.5 py-0.5 bg-green-100 text-green-700 text-xs font-bold rounded-md">POST</span>
                  <code className="text-sm font-mono text-gray-800">/api/v1/transcript/bulk</code>
                </div>
                <p className="text-sm text-gray-500">Estrazione bulk da un canale o playlist. Stream di risultati via SSE. 2 crediti per video (fallimenti rimborsati).</p>
              </div>
              {expandedEndpoint === "bulk" ? <ChevronUp size={20} className="text-gray-400" /> : <ChevronDown size={20} className="text-gray-400" />}
            </button>
            {expandedEndpoint === "bulk" && (
              <div className="px-6 pb-6">
                <div className="flex gap-1 mb-4 bg-gray-100 rounded-lg p-1 w-fit">
                  {(["curl", "python", "node"] as const).map(lang => (
                    <button
                      key={lang}
                      onClick={() => setExpandedBulkLang(lang)}
                      className={`px-4 py-1.5 text-xs font-bold rounded-md transition-all ${expandedBulkLang === lang ? "bg-white text-gray-900 shadow-sm" : "text-gray-500 hover:text-gray-700"}`}
                    >
                      {lang === "curl" ? "cURL" : lang === "python" ? "Python" : "Node.js"}
                    </button>
                  ))}
                </div>
                <div className="bg-gray-900 rounded-xl p-5 overflow-x-auto">
                  <pre className="text-sm text-gray-300 font-mono whitespace-pre">{codeExamples[`bulk${expandedBulkLang.charAt(0).toUpperCase() + expandedBulkLang.slice(1)}` as keyof typeof codeExamples]}</pre>
                </div>
                <div className="mt-4 bg-gray-50 rounded-xl p-4">
                  <p className="text-xs font-bold text-gray-400 uppercase mb-2">SSE Events</p>
                  <pre className="text-sm text-gray-600 font-mono whitespace-pre">{`event: metadata
data: {"title":"Edmund Yong","source":"channel","totalVideos":21}

event: batch
data: {"batchIndex":0,"videos":[...],"stats":{"processed":21,...}}

event: done
data: {"stats":{"total":21,"succeeded":20,"failed":1}}`}</pre>
                </div>
              </div>
            )}
          </div>
        </div>
      </section>

      {/* ── Response Format ── */}
      <section className="py-16 px-4">
        <div className="max-w-4xl mx-auto">
          <div className="flex items-center gap-3 mb-3">
            <FileText size={24} className="text-purple-600" />
            <h2 className="text-3xl font-black text-gray-900">Response Format</h2>
          </div>
          <div className="bg-gray-900 rounded-2xl p-6 overflow-x-auto">
            <pre className="text-sm text-gray-300 font-mono whitespace-pre">{`{
  "video_id": "dQw4w9WgXcQ",
  "title": "Rick Astley - Never Gonna Give You Up",
  "channel": "Rick Astley",
  "duration": 212,
  "transcript": [
    { "text": "We're no strangers to love", "start": 18.0, "duration": 3.5 }
  ],
  "text": "We're no strangers to love ...",
  "language": "en",
  "credits_used": 2,
  "credits_remaining": 98
}`}</pre>
          </div>
        </div>
      </section>

      {/* ── Error Model ── */}
      <section className="py-16 px-4 bg-gray-50">
        <div className="max-w-4xl mx-auto">
          <div className="flex items-center gap-3 mb-3">
            <BookOpen size={24} className="text-purple-600" />
            <h2 className="text-3xl font-black text-gray-900">Error Model</h2>
          </div>
          <div className="grid md:grid-cols-2 gap-3">
            {errors.map((err, i) => (
              <div key={i} className="bg-white rounded-xl px-5 py-4 border border-gray-100 shadow-sm">
                <code className="text-sm font-bold text-red-600">{err.code}</code>
                <p className="text-sm text-gray-500 mt-1">{err.description}</p>
              </div>
            ))}
          </div>

          <div className="mt-10 bg-white rounded-2xl p-6 border border-gray-100 shadow-sm">
            <h3 className="font-bold text-gray-900 mb-3">Importable API docs</h3>
            <p className="text-sm text-gray-500 mb-4">
              Usa l'API per video che hanno già sottotitoli YouTube. Resumari restituisce JSON strutturato per video singoli
              e Server-Sent Events per job bulk su canali o playlist.
            </p>
            <div className="flex flex-wrap gap-3">
              {["OpenAPI 3.1 spec", "Postman collection", "llms.txt reference"].map((item, i) => (
                <span key={i} className="px-4 py-2 bg-purple-50 text-purple-700 text-sm font-bold rounded-xl">
                  {item}
                </span>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* ── Comparison ── */}
      <section className="py-16 px-4">
        <div className="max-w-4xl mx-auto">
          <div className="flex items-center gap-3 mb-3">
            <RefreshCw size={24} className="text-purple-600" />
            <h2 className="text-3xl font-black text-gray-900">API Comparison Snapshot</h2>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-200">
                  <th className="text-left py-3 px-4 font-bold text-gray-900">API</th>
                  <th className="text-left py-3 px-4 font-bold text-gray-900">Modello</th>
                  <th className="text-left py-3 px-4 font-bold text-gray-900">Prezzo</th>
                </tr>
              </thead>
              <tbody>
                {comparisons.map((c, i) => (
                  <tr key={i} className={`border-b border-gray-100 ${i === 0 ? "bg-purple-50" : ""}`}>
                    <td className="py-3 px-4 font-bold text-gray-900">{c.name}</td>
                    <td className="py-3 px-4 text-gray-600">{c.tag}</td>
                    <td className="py-3 px-4 text-gray-600">{c.credits}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </section>

      {/* ── Why Developers Switch ── */}
      <section className="py-16 px-4 bg-gray-50">
        <div className="max-w-4xl mx-auto">
          <h2 className="text-3xl font-black text-gray-900 text-center mb-12">
            Why Developers Switch to Resumari
          </h2>
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[
              { icon: Zap, title: "Bulk Extraction", desc: "Estrai dozzine di trascrizioni in una chiamata API. Processa playlist, crea dataset o controlla canali — senza scrivere un loop. I fallimenti vengono rimborsati automaticamente." },
              { icon: Clock, title: "Credits That Never Expire", desc: "Compra un pacchetto di crediti e usalo per settimane o mesi invece di impegnarti in un abbonamento ricorrente. I pacchetti partono da €4,99 per 100 crediti." },
              { icon: Terminal, title: "Simple REST API", desc: "Una richiesta POST per video. SSE streaming per bulk. Passa un URL o ID video, ottieni il transcript completo con timestamp. Niente OAuth, niente YouTube Data API key." },
              { icon: FileText, title: "Timestamps on Every Segment", desc: "Ogni segmento del transcript include start time e durata. Crea file di sottotitoli, indici di ricerca o dataset time-coded da JSON strutturato." },
              { icon: RefreshCw, title: "Automatic Refunds on Failure", desc: "Alcuni video non hanno sottotitoli. Quando l'estrazione fallisce, il tuo credito viene rimborsato istantaneamente — nessun ticket di supporto." },
              { icon: Key, title: "API Keys in Seconds", desc: "Genera fino a 3 chiavi API dalla tua dashboard. Traccia l'utilizzo per chiave. Revoca istantaneamente. Nessuna approvazione o attesa." },
            ].map((item, i) => (
              <div key={i} className="bg-white rounded-2xl p-6 border border-gray-100 shadow-sm">
                <item.icon size={24} className="text-purple-600 mb-4" />
                <h3 className="font-bold text-gray-900 mb-2">{item.title}</h3>
                <p className="text-sm text-gray-500 leading-relaxed">{item.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── How It Works ── */}
      <section className="py-16 px-4">
        <div className="max-w-4xl mx-auto">
          <h2 className="text-3xl font-black text-gray-900 text-center mb-3">How It Works</h2>
          <p className="text-gray-500 text-center mb-12">Tre passaggi per iniziare</p>
          <div className="grid md:grid-cols-3 gap-8">
            {[
              { num: "1", icon: Users, title: "Create an Account", desc: "Registrati su Resumari. Gli account gratuiti ricevono 25 crediti per testare l'API — senza carta di credito." },
              { num: "2", icon: Key, title: "Generate an API Key", desc: "Vai alla pagina API Keys, dai un nome alla tua chiave e copiala. La chiave viene mostrata una volta — salvala in modo sicuro." },
              { num: "3", icon: Terminal, title: "Make Your First Request", desc: "Invia una richiesta POST con la tua chiave API nell'intestazione X-API-Key e un video ID. Ricevi JSON con la trascrizione completa." },
            ].map((item, i) => (
              <div key={i} className="text-center">
                <div className="w-14 h-14 rounded-2xl bg-purple-100 text-purple-700 flex items-center justify-center font-black text-xl mx-auto mb-5">
                  {item.num}
                </div>
                <item.icon size={24} className="text-purple-600 mx-auto mb-3" />
                <h3 className="font-bold text-gray-900 mb-2">{item.title}</h3>
                <p className="text-sm text-gray-500 leading-relaxed">{item.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── FAQ ── */}
      <section className="py-16 px-4 bg-gray-50">
        <div className="max-w-3xl mx-auto">
          <h2 className="text-3xl font-black text-gray-900 text-center mb-3">FAQ</h2>
          <p className="text-gray-500 text-center mb-10">Domande frequenti sull'API</p>
          <div className="space-y-3">
            {faqs.map((faq, i) => (
              <div key={i} className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
                <button
                  onClick={() => setExpandedFaq(expandedFaq === i ? null : i)}
                  className="w-full flex items-center justify-between p-5 text-left"
                >
                  <span className="font-bold text-gray-900 pr-4">{faq.q}</span>
                  {expandedFaq === i ? <ChevronUp size={18} className="text-gray-400 shrink-0" /> : <ChevronDown size={18} className="text-gray-400 shrink-0" />}
                </button>
                {expandedFaq === i && (
                  <div className="px-5 pb-5">
                    <p className="text-sm text-gray-500 leading-relaxed">{faq.a}</p>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── CTA ── */}
      <section className="py-20 px-4">
        <div className="max-w-2xl mx-auto text-center">
          <h2 className="text-3xl md:text-4xl font-black text-gray-900 mb-4">
            The Only Transcript API Without a Monthly Bill
          </h2>
          <p className="text-gray-500 mb-8">
            Pay As You Go, No Subscription by Default. I crediti non scadono mai.
          </p>
          <div className="flex flex-wrap justify-center gap-4">
            <button
              onClick={() => document.getElementById("api-key-section")?.scrollIntoView({ behavior: "smooth" })}
              className="px-8 py-4 bg-gray-900 text-white font-bold rounded-2xl hover:bg-black transition-all shadow-xl shadow-gray-200"
            >
              25 free credits. No credit card.
            </button>
            <a
              href="/#pricing"
              className="px-8 py-4 bg-gray-100 text-gray-900 font-bold rounded-2xl hover:bg-gray-200 transition-all"
            >
              View Pricing
            </a>
          </div>
          <p className="text-sm text-gray-400 mt-6">
            Need high-volume access? <a href="/contattaci" className="text-purple-600 hover:underline font-semibold">Contact us</a> for a custom plan.
          </p>
        </div>
      </section>
    </div>
  );
}
