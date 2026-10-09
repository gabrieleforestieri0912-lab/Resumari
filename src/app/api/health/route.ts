import { NextResponse } from 'next/server';
import { getServiceClient, TABLES } from '@/lib/supabase';

/**
 * Ruolo dichiarato nel JWT della chiave Supabase (claim `role`).
 * Permette di distinguere una vera service role da una anon key sbagliata
 * senza esporre la chiave: è la causa più comune di insert che falliscono
 * con "new row violates row-level security policy".
 */
function supabaseKeyRole(key: string): string {
  if (!key) return 'missing';
  const parts = key.split('.');
  if (parts.length < 2) return 'opaque';
  try {
    const payload = JSON.parse(Buffer.from(parts[1], 'base64url').toString('utf8'));
    return typeof payload.role === 'string' ? payload.role : 'unknown';
  } catch {
    return 'opaque';
  }
}

/**
 * Verifica che una tabella sia raggiungibile e leggibile dal service client.
 * Serve a distinguere "migration non applicata" da "tabella vuota".
 */
async function tableStatus(table: string): Promise<string> {
  try {
    const { error } = await getServiceClient().from(table).select('*', { head: true, count: 'exact' }).limit(1);
    if (!error) return 'ok';
    const code = error.code || '';
    if (code === '42P01' || /does not exist|not found/i.test(error.message)) return 'missing';
    return `error:${code || 'unknown'}`;
  } catch (err) {
    return `error:${err instanceof Error ? err.message.slice(0, 60) : 'unknown'}`;
  }
}

/**
 * Endpoint API per il monitoraggio dello stato di salute del server (Health Check).
 * Verifica la disponibilità del servizio, la presenza delle variabili d'ambiente
 * critiche e che le tabelle usate da API key, rate limit e MCP esistano davvero.
 */
export async function GET() {
  // Stato di base del servizio
  const checks: Record<string, string> = {
    status: 'ok',
    timestamp: new Date().toISOString(),
    version: '1.1.2',
  };

  // Elenco delle variabili d'ambiente da monitorare
  const envVarChecks = [
    'NEXT_PUBLIC_SUPABASE_URL',
    'SUPABASE_SERVICE_ROLE_KEY',
    'JWT_SECRET',
    'NEXTAUTH_SECRET',
  ];

  // Verifica la presenza di ciascuna variabile d'ambiente
  for (const key of envVarChecks) {
    checks[`env_${key}`] = process.env[key] ? 'set' : 'missing';
  }

  // La chiave "service role" deve davvero avere il ruolo service_role: con la
  // anon key le scritture falliscono silenziosamente (RLS) e i crediti non
  // vengono mai scalati.
  checks.supabase_key_role = supabaseKeyRole(process.env.SUPABASE_SERVICE_ROLE_KEY || '');

  // Tabelle necessarie: senza `rate_limits` il rate limit delle API key decade
  // alla sola memoria, senza `mcp_jobs` i job MCP non sopravvivono al recycle.
  if (checks.env_NEXT_PUBLIC_SUPABASE_URL === 'set' && checks.env_SUPABASE_SERVICE_ROLE_KEY === 'set') {
    checks.db_users = await tableStatus(TABLES.USERS);
    checks.db_api_keys = await tableStatus(TABLES.API_KEYS);
    checks.db_rate_limits = await tableStatus(TABLES.RATE_LIMITS);
    checks.db_mcp_jobs = await tableStatus(TABLES.MCP_JOBS);
  }

  // Definisce quali variabili sono assolutamente necessarie per il funzionamento del sistema
  const critical = ['NEXT_PUBLIC_SUPABASE_URL', 'SUPABASE_SERVICE_ROLE_KEY', 'JWT_SECRET'];
  const hasCriticalMissing = critical.some((k) => !process.env[k]);

  // Una chiave non-service o una tabella mancante rendono il sistema non
  // funzionante anche se le env sono "presenti". `rate_limits` e `mcp_jobs`
  // hanno un fallback in memoria: la loro assenza viene segnalata ma non
  // porta il servizio in "degraded".
  const degraded =
    hasCriticalMissing ||
    checks.supabase_key_role !== 'service_role' ||
    checks.db_users !== 'ok' ||
    checks.db_api_keys !== 'ok';

  if (degraded) checks.status = 'degraded';

  // Restituisce 503 (Service Unavailable) se manca una variabile critica, altrimenti 200 (OK)
  return NextResponse.json(checks, { status: hasCriticalMissing ? 503 : 200 });
}
