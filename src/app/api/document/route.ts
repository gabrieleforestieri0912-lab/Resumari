import { NextResponse } from 'next/server';
import { getAuthenticatedUser } from '@/lib/auth';

export async function POST(request: Request) {
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

    if (file.type === 'application/pdf') {
      const { createRequire } = await import('module');
      const require = createRequire(import.meta.url);
      const pdf = require('pdf-parse');
      const pdfData = await pdf(buffer);
      extractedText = pdfData.text;
    } else if (file.type === 'text/plain') {
      extractedText = buffer.toString('utf-8');
    } else {
      return NextResponse.json({
        message: 'Formato file non supportato. Carica un PDF o un file di testo (.txt).'
      }, { status: 400 });
    }

    extractedText = extractedText.replace(/\s+/g, ' ').trim();
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
