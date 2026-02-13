import Link from 'next/link';

export default function NotFound() {
  return (
    <div className="min-h-[70vh] flex items-center justify-center">
      <div className="w-full max-w-xl bg-slate-800/50 border border-slate-700 rounded-2xl p-6 sm:p-8 text-center">
        <div className="text-4xl mb-4">🔍</div>
        <h1 className="text-2xl font-bold text-white mb-2">Page not found</h1>
        <p className="text-slate-400 mb-6">
          The page you’re looking for doesn’t exist (or may have moved).
        </p>
        <Link
          href="/"
          className="inline-flex items-center justify-center bg-indigo-600 hover:bg-indigo-500 text-white font-semibold px-5 py-3 rounded-xl transition-all"
        >
          Go home
        </Link>
      </div>
    </div>
  );
}
