"use client";

import { AlertTriangle, CheckCircle2, FileVideo, Loader2, Users } from "lucide-react";

export type TranscriptionPhase = "fetching" | "transcribing" | "done" | "error";

export interface TranscriptionProgressState {
  variant: "video" | "channel";
  phase: TranscriptionPhase;
  /** Video completati (solo canale). */
  current?: number;
  /** Video totali da trascrivere (solo canale). */
  total?: number;
  /** Titolo del video in trascrizione in questo momento. */
  currentTitle?: string;
  /** Messaggio di stato (fallback quando manca quello derivato). */
  message?: string;
  /** Messaggio di errore (solo phase === "error"). */
  error?: string | null;
}

interface TranscriptionProgressProps {
  progress: TranscriptionProgressState;
}

/**
 * Barra di caricamento con progresso per le trascrizioni.
 * - Video singolo: fase di fetch con barra indeterminata.
 * - Intero canale: barra determinata (completati/totali + percentuale
 *   + titolo del video corrente).
 * Riutilizzata dalla pagina Trascrizioni per entrambi i flussi (anche quando
 * il flusso parte dal bottone "Trascrivi canale" dell'estensione).
 */
export default function TranscriptionProgress({ progress }: TranscriptionProgressProps) {
  const { variant, phase, current = 0, total = 0, currentTitle, message, error } = progress;
  const isChannel = variant === "channel";
  const isError = phase === "error";
  const hasTotal = isChannel && total > 0;
  const percent = hasTotal ? Math.min(100, Math.round((current / total) * 100)) : null;

  const headline = isError
    ? "Trascrizione non riuscita"
    : phase === "fetching" && isChannel
      ? "Raccolta video dal canale..."
      : isChannel
        ? `Trascrizione ${Math.min(current + (phase === "done" ? 0 : 1), total)} di ${total}...`
        : "Caricamento trascrizione...";

  return (
    <div className="bg-white dark:bg-zinc-900 rounded-2xl p-8 md:p-12 border border-gray-100 dark:border-zinc-800 shadow-lg shadow-gray-100/50 dark:shadow-none text-center max-w-2xl mx-auto w-full">
      <div
        className={`w-16 h-16 mx-auto mb-4 rounded-full flex items-center justify-center ${
          isError
            ? "bg-red-100 dark:bg-red-950/60"
            : "bg-purple-100 dark:bg-purple-900/40 animate-pulse"
        }`}
      >
        {isError ? (
          <AlertTriangle size={32} className="text-red-600 dark:text-red-400" />
        ) : phase === "done" ? (
          <CheckCircle2 size={32} className="text-green-600 dark:text-green-400" />
        ) : isChannel ? (
          <Users size={32} className="text-purple-600 dark:text-purple-400" />
        ) : (
          <FileVideo size={32} className="text-purple-600 dark:text-purple-400" />
        )}
      </div>

      <h3 className="text-lg font-black text-gray-900 dark:text-zinc-100 mb-2">{headline}</h3>

      {currentTitle && !isError && (
        <p className="text-sm font-bold text-purple-600 dark:text-purple-400 mb-3 line-clamp-1">
          {currentTitle}
        </p>
      )}

      {/* Barra di progresso */}
      <div
        className="h-3 w-full rounded-full bg-gray-100 dark:bg-zinc-800 overflow-hidden mb-3"
        role="progressbar"
        aria-valuemin={0}
        aria-valuemax={hasTotal ? total : undefined}
        aria-valuenow={hasTotal ? current : undefined}
        aria-label={isChannel ? "Progresso trascrizione canale" : "Progresso trascrizione video"}
      >
        {percent !== null ? (
          <div
            className="h-full rounded-full bg-gradient-to-r from-purple-600 to-red-500 transition-[width] duration-500 ease-out"
            style={{ width: `${percent}%` }}
          />
        ) : (
          !isError && (
            <div className="h-full w-1/3 rounded-full bg-gradient-to-r from-purple-600 to-red-500 resumari-progress-indeterminate" />
          )
        )}
      </div>

      <div className="flex items-center justify-center gap-2 text-sm">
        {isError ? (
          <p className="text-red-600 dark:text-red-400 font-bold">
            {error || message || "Si è verificato un errore."}
          </p>
        ) : (
          <>
            {hasTotal && (
              <span className="font-black text-gray-900 dark:text-zinc-100 tabular-nums">
                {current}/{total} · {percent}%
              </span>
            )}
            {hasTotal && <span className="text-gray-300 dark:text-zinc-700">•</span>}
            <span className="text-gray-500 dark:text-zinc-400 font-medium inline-flex items-center gap-1.5">
              {!hasTotal && <Loader2 size={14} className="animate-spin" />}
              {message || "Sto elaborando la richiesta"}
            </span>
          </>
        )}
      </div>

      {/* Animazione della barra indeterminata: tag style globale invece di
          style jsx, non supportato in modo affidabile in App Router e
          causa di possibili errori di build dell'intera app. */}
      <style>{`
        .resumari-progress-indeterminate {
          animation: resumari-progress-slide 1.2s ease-in-out infinite;
        }
        @keyframes resumari-progress-slide {
          0% {
            transform: translateX(-100%);
          }
          100% {
            transform: translateX(300%);
          }
        }
      `}</style>
    </div>
  );
}
