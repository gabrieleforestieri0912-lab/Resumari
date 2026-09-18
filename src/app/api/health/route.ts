import { NextResponse } from 'next/server';

/**
 * Endpoint API per il monitoraggio dello stato di salute del server (Health Check).
 * Verifica la disponibilità del servizio e la presenza delle variabili d'ambiente critiche.
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

  // Definisce quali variabili sono assolutamente necessarie per il funzionamento del sistema
  const critical = ['NEXT_PUBLIC_SUPABASE_URL', 'SUPABASE_SERVICE_ROLE_KEY', 'JWT_SECRET'];
  const hasCriticalMissing = critical.some((k) => !process.env[k]);

  // Restituisce 503 (Service Unavailable) se manca una variabile critica, altrimenti 200 (OK)
  return NextResponse.json(checks, { status: hasCriticalMissing ? 503 : 200 });
}
