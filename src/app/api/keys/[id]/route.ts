import { NextResponse } from 'next/server'
import { getAuthenticatedUser } from '@/lib/auth'
import { revokeApiKey, findApiKeysByUserId } from '@/lib/db'

/**
 * Endpoint API per revocare una specifica chiave API.
 * Verifica che la chiave appartenga all'utente autenticato prima di procedere alla revoca.
 *
 * Parametro URL: id (l'ID univoco della chiave API da revocare).
 */
export async function DELETE(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const user = await getAuthenticatedUser(request)
  if (!user) return NextResponse.json({ message: 'Non autorizzato' }, { status: 401 })

  // Verifica che l'utente sia il proprietario della chiave
  const keys = await findApiKeysByUserId(user.id)
  const key = keys.find(k => k.id === id)
  if (!key) return NextResponse.json({ message: 'Chiave non trovata' }, { status: 404 })

  // Revoca la chiave nel database
  await revokeApiKey(id)

  return NextResponse.json({ message: 'Chiave revocata' })
}
