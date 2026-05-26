import { Fragment, type ReactNode } from "react";

/**
 * Tiny inline-markdown renderer. Handles **bold**, *italic*, and [label](url).
 * No external dependency. Designed for assistant chat messages and roadmap step
 * strings where Claude emits markdown-style emphasis or links.
 */

type Segment = { type: "text" | "bold" | "italic" | "link"; value: string; href?: string };

const LINK_RE = /\[([^\]]+)\]\((https?:\/\/[^\s)]+)\)/g;
const BOLD_RE = /\*\*([^*]+?)\*\*/g;
const ITALIC_RE = /(?<!\*)\*(?!\*)([^*\n]+?)(?<!\*)\*(?!\*)/g;

function tokenize(input: string): Segment[] {
  const segments: Segment[] = [];

  type Match = { start: number; end: number; segment: Segment };
  const matches: Match[] = [];

  let m: RegExpExecArray | null;
  while ((m = LINK_RE.exec(input)) !== null) {
    matches.push({
      start: m.index,
      end: m.index + m[0].length,
      segment: { type: "link", value: m[1], href: m[2] },
    });
  }
  while ((m = BOLD_RE.exec(input)) !== null) {
    matches.push({
      start: m.index,
      end: m.index + m[0].length,
      segment: { type: "bold", value: m[1] },
    });
  }
  while ((m = ITALIC_RE.exec(input)) !== null) {
    matches.push({
      start: m.index,
      end: m.index + m[0].length,
      segment: { type: "italic", value: m[1] },
    });
  }

  matches.sort((a, b) => a.start - b.start);

  // Remove overlapping matches — earlier match wins.
  const accepted: Match[] = [];
  let cursor = 0;
  for (const match of matches) {
    if (match.start < cursor) continue;
    accepted.push(match);
    cursor = match.end;
  }

  let pos = 0;
  for (const match of accepted) {
    if (match.start > pos) {
      segments.push({ type: "text", value: input.slice(pos, match.start) });
    }
    segments.push(match.segment);
    pos = match.end;
  }
  if (pos < input.length) {
    segments.push({ type: "text", value: input.slice(pos) });
  }

  return segments.length > 0 ? segments : [{ type: "text", value: input }];
}

export interface MarkdownProps {
  text: string;
  /** When true (default), preserve newlines via `white-space: pre-wrap`. */
  preserveWhitespace?: boolean;
  /** Optional className applied to the wrapper span. */
  className?: string;
}

export function Markdown({ text, preserveWhitespace = true, className }: MarkdownProps) {
  const segments = tokenize(text);

  const nodes: ReactNode[] = segments.map((seg, i) => {
    switch (seg.type) {
      case "bold":
        return (
          <strong key={i} className="font-semibold text-ink">
            {seg.value}
          </strong>
        );
      case "italic":
        return (
          <em key={i} className="italic">
            {seg.value}
          </em>
        );
      case "link":
        return (
          <a
            key={i}
            href={seg.href}
            target="_blank"
            rel="noopener noreferrer"
            className="text-accent underline decoration-accent/40 underline-offset-2 hover:decoration-accent"
          >
            {seg.value}
          </a>
        );
      default:
        return <Fragment key={i}>{seg.value}</Fragment>;
    }
  });

  return (
    <span
      className={
        (preserveWhitespace ? "whitespace-pre-wrap " : "") + (className ?? "")
      }
    >
      {nodes}
    </span>
  );
}
