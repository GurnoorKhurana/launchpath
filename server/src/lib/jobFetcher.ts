import * as cheerio from "cheerio";

export type JdSource = "json-ld" | "main-text";

export interface FetchedJd {
  text: string;
  title?: string;
  source: JdSource;
}

export class JobFetchError extends Error {
  reason: "fetch_failed" | "no_jd_found" | "too_short" | "invalid_url";
  constructor(reason: JobFetchError["reason"], message: string) {
    super(message);
    this.reason = reason;
  }
}

const MIN_TEXT_LENGTH = 200;
const MAX_TEXT_LENGTH = 12_000;
const FETCH_TIMEOUT_MS = 10_000;

function isPrivateHostname(hostname: string): boolean {
  const h = hostname.toLowerCase();
  if (h === "localhost" || h.endsWith(".localhost")) return true;
  if (h === "127.0.0.1" || h === "::1" || h === "0.0.0.0") return true;
  const v4 = h.match(/^(\d{1,3})\.(\d{1,3})\.(\d{1,3})\.(\d{1,3})$/);
  if (v4) {
    const [, a, b] = v4.map(Number);
    if (a === 10) return true;
    if (a === 192 && b === 168) return true;
    if (a === 172 && b >= 16 && b <= 31) return true;
    if (a === 169 && b === 254) return true;
    if (a === 127) return true;
  }
  return false;
}

function validateUrl(url: string): URL {
  let parsed: URL;
  try {
    parsed = new URL(url);
  } catch {
    throw new JobFetchError("invalid_url", "URL is not parseable");
  }
  if (parsed.protocol !== "http:" && parsed.protocol !== "https:") {
    throw new JobFetchError("invalid_url", "URL must be http or https");
  }
  if (isPrivateHostname(parsed.hostname)) {
    throw new JobFetchError("invalid_url", "URL host is not allowed");
  }
  return parsed;
}

function htmlToPlainText(html: string): string {
  const $ = cheerio.load(`<div id="__lp_root">${html}</div>`);
  return ($("#__lp_root").text() ?? "").replace(/\s+/g, " ").trim();
}

function collapseWhitespace(s: string): string {
  return s.replace(/\s+/g, " ").trim();
}

function findJobPostingFromJsonLd($: cheerio.CheerioAPI): { description: string; title?: string } | null {
  const blocks = $('script[type="application/ld+json"]').toArray();

  const visit = (node: any): { description: string; title?: string } | null => {
    if (!node) return null;
    if (Array.isArray(node)) {
      for (const item of node) {
        const found = visit(item);
        if (found) return found;
      }
      return null;
    }
    if (typeof node === "object") {
      const type = node["@type"];
      const isPosting =
        type === "JobPosting" ||
        (Array.isArray(type) && type.includes("JobPosting"));
      if (isPosting && typeof node.description === "string") {
        return {
          description: htmlToPlainText(node.description),
          title: typeof node.title === "string" ? node.title : undefined,
        };
      }
      if (Array.isArray(node["@graph"])) {
        const found = visit(node["@graph"]);
        if (found) return found;
      }
      for (const key of Object.keys(node)) {
        const v = node[key];
        if (v && typeof v === "object") {
          const found = visit(v);
          if (found) return found;
        }
      }
    }
    return null;
  };

  for (const block of blocks) {
    const raw = $(block).contents().text();
    if (!raw) continue;
    try {
      const parsed = JSON.parse(raw);
      const found = visit(parsed);
      if (found && found.description.length >= MIN_TEXT_LENGTH) {
        return found;
      }
    } catch {
      // JSON-LD that's malformed is common; ignore and try the next block.
    }
  }
  return null;
}

function extractMainText($: cheerio.CheerioAPI): { description: string; title?: string } | null {
  $("script, style, noscript, svg, header, footer, nav, form").remove();

  const candidates = [
    "main",
    "article",
    '[role="main"]',
    "#content",
    "#main",
    ".job-description",
    ".jobsearch-jobDescriptionText",
    ".description__text",
  ];

  let best: { el: cheerio.Cheerio<any>; len: number } | null = null;
  for (const sel of candidates) {
    $(sel).each((_, el) => {
      const $el = $(el);
      const text = collapseWhitespace($el.text());
      const len = text.length;
      if (!best || len > best.len) {
        best = { el: $el, len };
      }
    });
  }

  if (!best || best.len < MIN_TEXT_LENGTH) {
    const bodyText = collapseWhitespace($("body").text());
    if (bodyText.length < MIN_TEXT_LENGTH) return null;
    return {
      description: bodyText,
      title: $("title").first().text().trim() || undefined,
    };
  }

  return {
    description: collapseWhitespace(best.el.text()),
    title: $("title").first().text().trim() || undefined,
  };
}

export function extractJdFromHtml(html: string): FetchedJd {
  const $ = cheerio.load(html);

  const fromJsonLd = findJobPostingFromJsonLd($);
  if (fromJsonLd) {
    const truncated =
      fromJsonLd.description.length > MAX_TEXT_LENGTH
        ? fromJsonLd.description.slice(0, MAX_TEXT_LENGTH)
        : fromJsonLd.description;
    return { text: truncated, title: fromJsonLd.title, source: "json-ld" };
  }

  const fromMain = extractMainText($);
  if (!fromMain || fromMain.description.length < MIN_TEXT_LENGTH) {
    throw new JobFetchError("no_jd_found", "Page did not contain a recognisable job posting");
  }

  const truncated =
    fromMain.description.length > MAX_TEXT_LENGTH
      ? fromMain.description.slice(0, MAX_TEXT_LENGTH)
      : fromMain.description;
  return { text: truncated, title: fromMain.title, source: "main-text" };
}

export async function fetchJobDescription(url: string): Promise<FetchedJd> {
  validateUrl(url);

  let response: Response;
  try {
    response = await fetch(url, {
      redirect: "follow",
      signal: AbortSignal.timeout(FETCH_TIMEOUT_MS),
      headers: {
        "User-Agent":
          "Mozilla/5.0 (compatible; LaunchPath/1.0; +https://github.com/GurnoorKhurana/launchpath)",
        Accept: "text/html,application/xhtml+xml,*/*;q=0.8",
        "Accept-Language": "en-US,en;q=0.9",
      },
    });
  } catch (err: any) {
    throw new JobFetchError("fetch_failed", err?.message ?? "Fetch failed");
  }

  if (!response.ok) {
    throw new JobFetchError("fetch_failed", `Upstream returned ${response.status}`);
  }

  const html = await response.text();
  if (html.length < MIN_TEXT_LENGTH) {
    throw new JobFetchError("too_short", "Response body was too short to contain a job posting");
  }

  return extractJdFromHtml(html);
}
