export interface RoadmapPath {
  title: string;
  timeline: string;
  steps: string[];
  certifications: string[];
  realistic_salary_range_cad: string;
}

export interface Roadmap {
  paths: RoadmapPath[];
}

export interface ParsedAssistantMessage {
  prose: string;
  roadmap: Roadmap | null;
}

const ROADMAP_RE = /<roadmap>\s*([\s\S]*?)\s*<\/roadmap>/i;

export function parseAssistantMessage(content: string): ParsedAssistantMessage {
  const match = content.match(ROADMAP_RE);
  if (!match) {
    return { prose: content, roadmap: null };
  }

  const jsonStr = match[1].trim();
  let roadmap: Roadmap | null = null;
  try {
    const parsed = JSON.parse(jsonStr);
    if (parsed && Array.isArray(parsed.paths)) {
      roadmap = parsed as Roadmap;
    }
  } catch {
    // Fall through — leave the raw block in prose so the user at least sees something.
  }

  const prose = roadmap ? content.replace(ROADMAP_RE, "").trim() : content;
  return { prose, roadmap };
}
