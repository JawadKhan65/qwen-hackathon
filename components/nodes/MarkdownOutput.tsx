import type { ReactNode } from "react";

function renderInline(text: string): ReactNode[] {
  const parts = text.split(/(`[^`]+`|\*\*[^*]+\*\*)/g);

  return parts.map((part, index) => {
    if (part.startsWith("**") && part.endsWith("**")) {
      return (
        <strong key={index} className="font-semibold text-slate-950">
          {part.slice(2, -2)}
        </strong>
      );
    }

    if (part.startsWith("`") && part.endsWith("`")) {
      return (
        <code
          key={index}
          className="rounded bg-slate-100 px-1 py-0.5 font-mono text-[11px] text-slate-800"
        >
          {part.slice(1, -1)}
        </code>
      );
    }

    return part;
  });
}

export default function MarkdownOutput({ value }: { value: string }) {
  const lines = value.trim().split(/\r?\n/);
  const blocks: ReactNode[] = [];
  let listItems: string[] = [];

  const flushList = () => {
    if (listItems.length === 0) return;
    blocks.push(
      <ul key={`list-${blocks.length}`} className="my-2 space-y-1.5 pl-4">
        {listItems.map((item, index) => (
          <li key={`${item}-${index}`} className="list-disc pl-1">
            {renderInline(item)}
          </li>
        ))}
      </ul>,
    );
    listItems = [];
  };

  lines.forEach((line, index) => {
    const trimmed = line.trim();

    if (!trimmed) {
      flushList();
      return;
    }

    const heading = trimmed.match(/^(#{1,3})\s+(.+)$/);
    if (heading) {
      flushList();
      blocks.push(
        <h4
          key={`heading-${index}`}
          className="mt-3 text-xs font-semibold uppercase tracking-[0.12em] text-slate-950"
        >
          {heading[2]}
        </h4>,
      );
      return;
    }

    const bullet = trimmed.match(/^[-*]\s+(.+)$/) ?? trimmed.match(/^\d+\.\s+(.+)$/);
    if (bullet) {
      listItems.push(bullet[1]);
      return;
    }

    flushList();
    blocks.push(
      <p key={`paragraph-${index}`} className="my-2">
        {renderInline(trimmed)}
      </p>,
    );
  });

  flushList();

  return <div className="text-xs leading-6 text-slate-700">{blocks}</div>;
}
