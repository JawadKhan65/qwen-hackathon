export default function NotFound() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-900 text-slate-100 font-mono">
      <div className="text-center p-8 max-w-md border border-slate-800 bg-slate-950 rounded-lg">
        <p className="text-xs text-red-400 uppercase tracking-widest mb-2">
          [Error 404: Not Found]
        </p>
        <h1 className="text-base font-bold mb-3">
          Specified path does not exist.
        </h1>
        <p className="text-xs text-slate-500 mb-6">
          The requested workflow canvas or studio route could not be found in the current workspace graph.
        </p>
        <a
          href="/"
          className="inline-block rounded border border-slate-700 bg-slate-900 hover:bg-slate-800 px-4 py-2 text-xs font-semibold text-slate-200 transition"
        >
          Return to LaunchGrid
        </a>
      </div>
    </div>
  );
}
