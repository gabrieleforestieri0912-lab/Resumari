import Link from "next/link";

export default function NotFound() {
  return (
    <div className="min-h-screen bg-white flex flex-col items-center justify-center px-6">
      <div className="text-center max-w-md">
        <div className="text-8xl font-black text-gray-200 mb-4">404</div>
        <h1 className="text-3xl font-black text-gray-900 mb-3">
          Pagina non trovata
        </h1>
        <p className="text-gray-500 mb-8">
          La pagina che stai cercando non esiste o è stata spostata.
        </p>
        <Link
          href="/"
          className="inline-flex px-6 py-3 bg-gradient-to-r from-purple-600 to-red-500 text-white rounded-xl font-bold text-sm hover:opacity-90 transition-all shadow-lg shadow-purple-200"
        >
          Torna alla Home
        </Link>
      </div>
    </div>
  );
}
