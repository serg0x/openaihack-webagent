import { load } from "cheerio";
import type { CrawlPage, CrawlResult, PageRole, PreviewTargets } from "@/lib/types";

const REQUEST_HEADERS = {
  "user-agent":
    "AI Website Operator/0.1 (+https://localhost demo bot; hackathon preview)",
  accept: "text/html,application/xhtml+xml",
};

const PAGE_ROLE_RULES: Array<{ role: PageRole; patterns: RegExp[] }> = [
  { role: "pricing", patterns: [/pricing/i, /plans?/i] },
  { role: "faq", patterns: [/faq/i, /questions/i, /help/i] },
  { role: "product", patterns: [/product/i, /platform/i, /features?/i, /solution/i] },
  { role: "about", patterns: [/about/i, /company/i, /team/i, /story/i] },
  { role: "trust", patterns: [/security/i, /compliance/i, /customers?/i, /trust/i] },
  { role: "docs", patterns: [/docs/i, /guide/i, /developers?/i] },
];

function clip(text: string, maxLength: number) {
  return text.length <= maxLength ? text : `${text.slice(0, maxLength - 1).trimEnd()}…`;
}

function normalizeWhitespace(value: string) {
  return value.replace(/\s+/g, " ").trim();
}

function sameHostname(inputA: string, inputB: string) {
  const hostnameA = new URL(inputA).hostname.replace(/^www\./, "");
  const hostnameB = new URL(inputB).hostname.replace(/^www\./, "");
  return hostnameA === hostnameB;
}

export function normalizeInputUrl(rawUrl: string) {
  const trimmed = rawUrl.trim();

  if (!trimmed) {
    throw new Error("Enter a website URL first.");
  }

  const withProtocol = /^https?:\/\//i.test(trimmed) ? trimmed : `https://${trimmed}`;
  const parsed = new URL(withProtocol);
  parsed.hash = "";
  return parsed.toString();
}

export async function fetchHtml(url: string) {
  const response = await fetch(url, {
    cache: "no-store",
    headers: REQUEST_HEADERS,
    redirect: "follow",
  });

  if (!response.ok) {
    throw new Error(`Could not fetch ${url} (${response.status}).`);
  }

  const contentType = response.headers.get("content-type") ?? "";
  if (!contentType.includes("text/html")) {
    throw new Error(`Expected HTML from ${url} but received ${contentType || "unknown content"}.`);
  }

  return response.text();
}

function classifyRole(url: string) {
  const pathname = new URL(url).pathname;

  if (pathname === "/" || pathname === "") {
    return "homepage";
  }

  for (const rule of PAGE_ROLE_RULES) {
    if (rule.patterns.some((pattern) => pattern.test(pathname))) {
      return rule.role;
    }
  }

  return "other";
}

function scoreLink(url: string, text: string) {
  const pathname = new URL(url).pathname;
  const joined = `${pathname} ${text}`.toLowerCase();
  let score = 0;

  if (pathname === "/" || pathname === "") score += 100;
  if (/pricing|plans?/.test(joined)) score += 90;
  if (/product|platform|features?|solution/.test(joined)) score += 80;
  if (/about|company|team|story/.test(joined)) score += 70;
  if (/faq|help|questions/.test(joined)) score += 65;
  if (/security|trust|customer|case-study|testimonial/.test(joined)) score += 60;
  if (/docs|guide|developer/.test(joined)) score += 40;
  if (/blog|news|careers|privacy|terms/.test(joined)) score -= 30;
  score -= pathname.split("/").filter(Boolean).length * 5;

  return score;
}

function cleanNodesForTextExtraction(html: string) {
  const $ = load(html);

  $("script, style, noscript, svg, form, aside, footer").remove();
  return $;
}

function extractTextBlocks(html: string) {
  const $ = cleanNodesForTextExtraction(html);
  const mainCandidate =
    $("main").first() ||
    $("article").first() ||
    $("[role='main']").first() ||
    $("body").first();
  const root = mainCandidate.length ? mainCandidate : $("body").first();

  const headings = root
    .find("h1, h2, h3")
    .map((_, element) => normalizeWhitespace($(element).text()))
    .get()
    .filter(Boolean);

  const contentBlocks = root
    .find("p, li")
    .map((_, element) => normalizeWhitespace($(element).text()))
    .get()
    .filter((text) => text.length >= 30);

  const mainText = clip(contentBlocks.join("\n\n"), 5000);
  const excerpt = clip(contentBlocks[0] || headings[0] || "", 240);

  return { $, headings, mainText, excerpt };
}

function findHeroSubheadline($: ReturnType<typeof load>) {
  const heroSection =
    $("main h1").first().closest("section, div") ||
    $("h1").first().closest("section, div");
  const scopedParagraph =
    heroSection.find("p").filter((_, element) => normalizeWhitespace($(element).text()).length > 35).first() ||
    $("main p").filter((_, element) => normalizeWhitespace($(element).text()).length > 35).first() ||
    $("p").filter((_, element) => normalizeWhitespace($(element).text()).length > 35).first();

  return normalizeWhitespace(scopedParagraph.text());
}

function findHeroCta($: ReturnType<typeof load>) {
  const candidates = $("main a, main button, header a, header button, a, button")
    .map((_, element) => {
      const text = normalizeWhitespace($(element).text());
      const href = $(element).attr("href") || "";

      if (!text || text.length > 40 || text.length < 2) {
        return null;
      }

      let score = 0;
      if (/demo|start|sign up|book|talk|try|get started|contact|learn more/i.test(text)) {
        score += 80;
      }
      if (href && href !== "#") {
        score += 20;
      }
      if ($(element).closest("nav").length) {
        score -= 25;
      }

      return { text, score };
    })
    .get()
    .filter((item): item is { text: string; score: number } => Boolean(item))
    .sort((left, right) => right.score - left.score);

  return candidates[0]?.text || "";
}

function extractPreviewTargets(html: string): PreviewTargets {
  const $ = cleanNodesForTextExtraction(html);
  const headlineText = normalizeWhitespace($("h1").first().text());
  const subheadlineText = findHeroSubheadline($);
  const ctaText = findHeroCta($);

  return {
    headlineText,
    subheadlineText,
    ctaText,
  };
}

function extractPage(url: string, html: string): CrawlPage {
  const $ = load(html);
  const title = normalizeWhitespace($("title").first().text());
  const metaDescription = normalizeWhitespace(
    $("meta[name='description']").attr("content") || "",
  );
  const canonicalHref = $("link[rel='canonical']").attr("href");
  const canonicalUrl = canonicalHref ? new URL(canonicalHref, url).toString() : url;
  const h1 = normalizeWhitespace($("h1").first().text());
  const { headings, mainText, excerpt } = extractTextBlocks(html);

  return {
    url,
    role: classifyRole(url),
    title,
    metaDescription,
    canonicalUrl,
    h1,
    headings,
    excerpt,
    mainText,
  };
}

function collectCandidateLinks(html: string, homepageUrl: string) {
  const $ = load(html);
  const links = $("a[href]")
    .map((_, element) => {
      const href = $(element).attr("href");
      const text = normalizeWhitespace($(element).text());

      if (!href || href.startsWith("#") || href.startsWith("mailto:") || href.startsWith("tel:")) {
        return null;
      }

      const nextUrl = new URL(href, homepageUrl).toString();
      if (!sameHostname(nextUrl, homepageUrl)) {
        return null;
      }

      return {
        url: nextUrl,
        score: scoreLink(nextUrl, text),
      };
    })
    .get()
    .filter((item): item is { url: string; score: number } => Boolean(item))
    .sort((left, right) => right.score - left.score);

  const deduped = new Map<string, number>();

  for (const link of links) {
    const normalized = new URL(link.url);
    normalized.hash = "";
    normalized.search = "";
    const key = normalized.toString();

    if (!deduped.has(key) || (deduped.get(key) ?? 0) < link.score) {
      deduped.set(key, link.score);
    }
  }

  return [...deduped.entries()]
    .sort((left, right) => right[1] - left[1])
    .map(([url]) => url)
    .filter((url) => url !== homepageUrl);
}

export async function crawlSite(rawUrl: string, maxPages = 5): Promise<CrawlResult> {
  const normalizedUrl = normalizeInputUrl(rawUrl);
  const homepageHtml = await fetchHtml(normalizedUrl);
  const homepagePage = extractPage(normalizedUrl, homepageHtml);
  const candidateLinks = collectCandidateLinks(homepageHtml, normalizedUrl).slice(0, maxPages - 1);
  const pages: CrawlPage[] = [homepagePage];

  for (const link of candidateLinks) {
    try {
      const html = await fetchHtml(link);
      pages.push(extractPage(link, html));
    } catch {
      continue;
    }
  }

  return {
    normalizedUrl,
    homepageUrl: normalizedUrl,
    domain: new URL(normalizedUrl).hostname.replace(/^www\./, ""),
    pages,
    previewTargets: extractPreviewTargets(homepageHtml),
  };
}
