import { Download } from "lucide-react";

type MediaDownloadLinkProps = {
  filename: string;
  label: string;
  tone?: "light" | "dark";
  url: string;
};

function downloadHref(url: string, filename: string): string {
  if (url.startsWith("data:")) {
    return url;
  }

  return `/api/download?url=${encodeURIComponent(url)}&filename=${encodeURIComponent(filename)}`;
}

export default function MediaDownloadLink({
  filename,
  label,
  tone = "light",
  url,
}: MediaDownloadLinkProps) {
  const toneClass =
    tone === "dark"
      ? "border-white/20 bg-slate-950/80 text-white hover:bg-slate-800"
      : "border-slate-200 bg-white/90 text-slate-700 hover:bg-slate-50";

  return (
    <a
      href={downloadHref(url, filename)}
      download={filename}
      className={`nodrag nopan inline-flex h-8 items-center gap-1.5 rounded-md border px-2.5 text-[11px] font-semibold shadow-sm transition ${toneClass}`}
      title={label}
    >
      <Download className="h-3.5 w-3.5" aria-hidden="true" />
      {label}
    </a>
  );
}
