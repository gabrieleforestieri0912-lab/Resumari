import { NextResponse } from "next/server";
import { generateChatCompletion } from "@/lib/ai";

export async function POST(request: Request) {
  try {
    const { context, videoId, videoTitle, channelTitle, type } = await request.json();

    let systemPrompt = type === "demo"
      ? `Sei un assistente che suggerisce domande pertinenti per un canale YouTube.
Il canale si chiama "${channelTitle || "sconosciuto"}".`

      : `Sei un assistente che suggerisce domande pertinenti per un video YouTube.
Il video si intitola "${videoTitle || "sconosciuto"}".

Genera 5 domande brevi e specifiche che un utente potrebbe fare su questo video.
Le domande devono essere in italiano, in formato lista semplice (una per riga), senza numeri o prefissi.
Devono essere pertinenti al contenuto del video e aiutare l'utente a esplorare i concetti chiave.`;

    if (context) {
      systemPrompt += `\n\nContesto disponibile: "${context.slice(0, 500)}"`;
    }

    const userPrompt = `Genera 5 domande brevi e pertinenti in italiano. Rispondi solo con le domande, una per riga, senza numeri o prefissi.`;

    const response = await generateChatCompletion([
      { role: "system", content: systemPrompt },
      { role: "user", content: userPrompt },
    ], "gpt-4o-mini");

    if (!response) {
      return NextResponse.json({ suggestions: getFallbackSuggestions(type) });
    }

    const suggestions = response
      .split("\n")
      .map((s) => s.replace(/^[\d\-*.\s)]+/, "").trim())
      .filter((s) => s.length > 10 && s.length < 200)
      .slice(0, 5);

    if (suggestions.length === 0) {
      return NextResponse.json({ suggestions: getFallbackSuggestions(type) });
    }

    return NextResponse.json({ suggestions });
  } catch {
    const type = (await request.json().catch(() => ({ type: "chat" }))).type || "chat";
    return NextResponse.json({ suggestions: getFallbackSuggestions(type) });
  }
}

function getFallbackSuggestions(type?: string) {
  if (type === "demo") {
    return [
      "Cosa rende unico questo canale?",
      "Quali sono i video più importanti?",
      "Che stile di comunicazione usa?",
      "Quali argomenti tratta principalmente?",
      "Consigliami da dove iniziare",
    ];
  }
  return [
    "Quali sono i concetti chiave di questo video?",
    "Puoi farmi una scaletta dettagliata degli argomenti?",
    "Spiega questo contenuto in modo semplice",
    "Quali sono le conclusioni principali?",
    "Crea un quiz basato su questo contenuto",
  ];
}
