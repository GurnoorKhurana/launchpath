import { describe, it, expect } from "vitest";
import { extractJdFromHtml, JobFetchError } from "../lib/jobFetcher.ts";

describe("extractJdFromHtml — JSON-LD", () => {
  it("extracts a JobPosting from a JSON-LD script", () => {
    const html = `
      <!doctype html>
      <html><head>
        <title>Senior Backend Engineer — Acme</title>
        <script type="application/ld+json">
        ${JSON.stringify({
          "@context": "https://schema.org",
          "@type": "JobPosting",
          title: "Senior Backend Engineer",
          description:
            "We are looking for a senior backend engineer with 5+ years of experience in Node.js, Postgres, and distributed systems. You will lead the design of our payments platform and mentor junior engineers. Strong written communication required. Remote-first team based in Toronto.",
        })}
        </script>
      </head><body><p>fallback content</p></body></html>
    `;

    const result = extractJdFromHtml(html);
    expect(result.source).toBe("json-ld");
    expect(result.title).toBe("Senior Backend Engineer");
    expect(result.text).toContain("Node.js");
    expect(result.text).toContain("Toronto");
    expect(result.text.length).toBeGreaterThan(200);
  });

  it("walks @graph arrays to find a JobPosting", () => {
    const html = `
      <html><head>
        <script type="application/ld+json">
        ${JSON.stringify({
          "@context": "https://schema.org",
          "@graph": [
            { "@type": "Organization", name: "Acme" },
            {
              "@type": "JobPosting",
              title: "Site Inspector",
              description:
                "Construction site inspector role for a major infrastructure firm in Ontario. Must have 5+ years of field experience in roads, bridges, or water systems. WHMIS and Working at Heights certification required. Daily site visits across the GTA.",
            },
          ],
        })}
        </script>
      </head><body></body></html>
    `;

    const result = extractJdFromHtml(html);
    expect(result.source).toBe("json-ld");
    expect(result.title).toBe("Site Inspector");
    expect(result.text).toContain("WHMIS");
  });
});

describe("extractJdFromHtml — main-text fallback", () => {
  it("returns the largest <main> block when no JSON-LD is present", () => {
    const longText =
      "We are hiring a Registered Practical Nurse for a long-term care facility in Toronto. The successful candidate will provide direct patient care, administer medications, and document patient charts. Must be registered with the College of Nurses of Ontario. Two years of LTC experience preferred. Shift work including weekends. Comprehensive benefits package.";
    const html = `
      <html><head><title>RPN Role</title></head>
      <body>
        <nav>Home About Careers</nav>
        <main>
          <h1>Registered Practical Nurse</h1>
          <p>${longText}</p>
        </main>
        <footer>copyright 2026</footer>
      </body></html>
    `;

    const result = extractJdFromHtml(html);
    expect(result.source).toBe("main-text");
    expect(result.title).toBe("RPN Role");
    expect(result.text).toContain("College of Nurses of Ontario");
    expect(result.text).not.toContain("copyright 2026");
  });

  it("throws no_jd_found when body is too short", () => {
    const html = `<html><body><p>Nothing here</p></body></html>`;
    expect(() => extractJdFromHtml(html)).toThrow(JobFetchError);
    try {
      extractJdFromHtml(html);
    } catch (err) {
      expect(err).toBeInstanceOf(JobFetchError);
      expect((err as JobFetchError).reason).toBe("no_jd_found");
    }
  });
});
