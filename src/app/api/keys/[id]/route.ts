import { NextResponse } from 'next/server'
import { getAuthenticatedUser } from '@/lib/auth'
import { revokeApiKey, findApiKeysByUserId } from '@/lib/db'

export async function DELETE(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const user = await getAuthenticatedUser(request)
  if (!user) return NextResponse.json({ message: 'Non autorizzato' }, { status: 401 })

  const keys = await findApiKeysByUserId(user.id)
  const key = keys.find(k => k.id === id)
  if (!key) return NextResponse.json({ message: 'Chiave non trovata' }, { status: 404 })

  await revokeApiKey(id)

  return NextResponse.json({ message: 'Chiave revocata' })
}
