"use client";

export default function GlobalError({
  error,
  reset,
}: Readonly<{
  error: Error & { digest?: string };
  reset: () => void;
}>) {
  return (
    <html lang="en">
      <body className="flex min-h-screen items-center justify-center bg-slate-950 text-slate-50">
        <main className="max-w-md rounded-2xl border border-white/10 bg-white/5 p-8 text-center shadow-2xl shadow-black/30">
          <h1 className="text-2xl font-semibold tracking-tight">LaunchShowrunner hit an error</h1>
          <p className="mt-3 text-sm text-slate-300">
            {error.message || "Something unexpected happened while rendering the workspace."}
          </p>
          <button
            type="button"
            onClick={reset}
            className="mt-6 inline-flex h-10 items-center justify-center rounded-md bg-white px-4 text-sm font-medium text-slate-950 transition hover:bg-slate-200"
          >
            Try again
          </button>
        </main>
      </body>
    </html>
  );
}