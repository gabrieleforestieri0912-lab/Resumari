"use client";

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <div className="min-h-screen bg-white flex flex-col items-center justify-center px-6">
      <div className="text-center max-w-md">
        <div className="w-16 h-16 mx-auto mb-6 rounded-2xl bg-red-100 flex items-center justify-center">
          <svg className="w-8 h-8 text-red-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z" />
          </svg>
        </div>
        <h1 className="text-2xl font-black text-gray-900 mb-3">
          Qualcosa è andato storto
        </h1>
        <p className="text-gray-500 mb-2">
          Si è verificato un errore imprevisto. Il nostro team è stato notificato.
        </p>
        <p className="text-xs text-gray-400 mb-8 font-mono bg-gray-50 p-2 rounded-lg">
          {error.digest ? `Error ID: ${error.digest}` : error.message}
        </p>
        <button
          onClick={reset}
          className="inline-flex px-6 py-3 bg-gradient-to-r from-purple-600 to-red-500 text-white rounded-xl font-bold text-sm hover:opacity-90 transition-all shadow-lg shadow-purple-200"
        >
          Riprova
        </button>
      </div>
    </div>
  );
}
