import { NextResponse } from 'next/server';

export async function GET() {
  const checks: Record<string, string> = {
    status: 'ok',
    timestamp: new Date().toISOString(),
    version: '1.1.2',
  };

  const envVarChecks = [
    'NEXT_PUBLIC_SUPABASE_URL',
    'SUPABASE_SERVICE_ROLE_KEY',
    'JWT_SECRET',
    'NEXTAUTH_SECRET',
  ];

  for (const key of envVarChecks) {
    checks[`env_${key}`] = process.env[key] ? 'set' : 'missing';
  }

  const critical = ['NEXT_PUBLIC_SUPABASE_URL', 'SUPABASE_SERVICE_ROLE_KEY', 'JWT_SECRET'];
  const hasCriticalMissing = critical.some((k) => !process.env[k]);

  return NextResponse.json(checks, { status: hasCriticalMissing ? 503 : 200 });
}
