import { NextResponse } from 'next/server';
import { getAuthenticatedUser } from '@/lib/auth';

/**
 * Endpoint API per il caricamento e l'analisi di documenti (PDF o TXT).
 * Estrae il testo dal file fornito per poterlo utilizzare come contesto per l'AI.
 *
 * Richiede l'autenticazione dell'utente.
 * Aspetta un multipart/form-data con un campo 'file'.
 */
export async function POST(request: Request) {
  // Verifica che l'utente sia autenticato prima di procedere
  const user = await getAuthenticatedUser(request);
  if (!user) {
    return NextResponse.json({ message: 'Non autorizzato' }, { status: 401 });
  }

  try {
    const formData = await request.formData();
    const file = formData.get('file') as File | null;

    if (!file) {
      return NextResponse.json({ message: 'Nessun file fornito' }, { status: 400 });
    }

    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);

    let extractedText = '';

    // Gestione dei diversi formati di file supportati
    if (file.type === 'application/pdf') {
      // Caricamento dinamico di pdf-parse per l'estrazione del testo dai PDF
      const { createRequire } = await import('module');
      const require = createRequire(import.meta.url);
      const pdf = require('pdf-parse');
      const pdfData = await pdf(buffer);
      extractedText = pdfData.text;
    } else if (file.type === 'text/plain') {
      // Lettura semplice per i file di testo
      extractedText = buffer.toString('utf-8');
    } else {
      return NextResponse.json({
        message: 'Formato file non supportato. Carica un PDF o un file di testo (.txt).'
      }, { status: 400 });
    }

    // Pulizia del testo estratto: rimuove spazi multipli e newline eccessivi
    extractedText = extractedText.replace(/\s+/g, ' ').trim();
    // Tronca il testo per evitare di superare i limiti di contesto dell'AI (es. 16.000 caratteri)
    const textSample = extractedText.substring(0, 16000);

    return NextResponse.json({
      fileName: file.name,
      text: textSample,
      wordCount: textSample.split(/\s+/).length,
    });
  } catch (error: any) {
    console.error('Error parsing document:', error);
    return NextResponse.json({
      message: `Errore durante la lettura del documento: ${error.message}`
    }, { status: 500 });
  }
}
