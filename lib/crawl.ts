import { lookup } from "node:dns/promises";
import { isIP } from "node:net";
import { load } from "cheerio";
import { AppRouteError } from "@/lib/request-error";
import type { CrawlPage, CrawlResult, PageRole, PreviewTargets } from "@/lib/types";

const REQUEST_HEADERS = {
  "user-agent":
    "AI Website Operator/0.1 (+https://localhost demo bot; hackathon preview)",
  accept: "text/html,application/xhtml+xml",
};
const FETCH_TIMEOUT_MS = 12_000;
const MAX_HTML_BYTES = 1_500_000;
const MAX_REDIRECTS = 5;
const BLOCKED_HOSTNAME_SUFFIXES = [".localhost", ".local", ".internal"];

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

function isPrivateIpv4Address(address: string) {
  const [firstOctet = 0, secondOctet = 0] = address.split(".").map((segment) => Number(segment));

  if (firstOctet === 0 || firstOctet === 10 || firstOctet === 127) {
    return true;
  }

  if (firstOctet === 169 && secondOctet === 254) {
    return true;
  }

  if (firstOctet === 172 && secondOctet >= 16 && secondOctet <= 31) {
    return true;
  }

  return firstOctet === 192 && secondOctet === 168;
}

function isPrivateIpv6Address(address: string) {
  const normalized = address.toLowerCase();

  if (normalized === "::" || normalized === "::1") {
    return true;
  }

  if (normalized.startsWith("fc") || normalized.startsWith("fd")) {
    return true;
  }

  return /^fe[89ab]/.test(normalized);
}

function isPrivateIpAddress(address: string) {
  const version = isIP(address);

  if (version === 4) {
    return isPrivateIpv4Address(address);
  }

  if (version === 6) {
    return isPrivateIpv6Address(address);
  }

  return false;
}

async function assertPublicHostname(hostname: string) {
  const normalizedHostname = hostname.toLowerCase();

  if (
    normalizedHostname === "localhost" ||
    BLOCKED_HOSTNAME_SUFFIXES.some((suffix) => normalizedHostname.endsWith(suffix))
  ) {
    throw new AppRouteError("Only public http(s) websites are supported for live analysis.", 400);
  }

  if (isIP(normalizedHostname)) {
    if (isPrivateIpAddress(normalizedHostname)) {
      throw new AppRouteError("Only public http(s) websites are supported for live analysis.", 400);
    }

    return;
  }

  let addresses;

  try {
    addresses = await lookup(normalizedHostname, { all: true, verbatim: true });
  } catch {
    throw new AppRouteError(`Could not resolve ${normalizedHostname}.`, 400);
  }

  if (!addresses.length) {
    throw new AppRouteError(`Could not resolve ${normalizedHostname}.`, 400);
  }

  if (addresses.some((entry) => isPrivateIpAddress(entry.address))) {
    throw new AppRouteError("Only public http(s) websites are supported for live analysis.", 400);
  }
}

export async function normalizeInputUrl(rawUrl: string) {
  const trimmed = rawUrl.trim();

  if (!trimmed) {
    throw new AppRouteError("Enter a website URL first.", 400);
  }

  const withProtocol = /^https?:\/\//i.test(trimmed) ? trimmed : `https://${trimmed}`;
  let parsed: URL;

  try {
    parsed = new URL(withProtocol);
  } catch {
    throw new AppRouteError("Enter a valid website URL.", 400);
  }

  if (!/^https?:$/.test(parsed.protocol)) {
    throw new AppRouteError("Use an http or https website URL.", 400);
  }

  if (parsed.username || parsed.password) {
    throw new AppRouteError("Website URLs with embedded credentials are not supported.", 400);
  }

  parsed.hash = "";

  await assertPublicHostname(parsed.hostname);

  return parsed.toString();
}

export async function fetchHtml(rawUrl: string) {
  let currentUrl = await normalizeInputUrl(rawUrl);

  for (let redirectCount = 0; redirectCount <= MAX_REDIRECTS; redirectCount += 1) {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);
    let response: Response;

    try {
      response = await fetch(currentUrl, {
        cache: "no-store",
        headers: REQUEST_HEADERS,
        redirect: "manual",
        signal: controller.signal,
      });
    } catch (error) {
      if (error instanceof Error && error.name === "AbortError") {
        throw new AppRouteError(`Timed out while fetching ${currentUrl}.`, 504);
      }

      throw new AppRouteError(`Could not fetch ${currentUrl}.`, 502);
    } finally {
      clearTimeout(timeout);
    }

    if (response.status >= 300 && response.status < 400) {
      const location = response.headers.get("location");

      if (!location) {
        throw new AppRouteError(`Received a redirect without a location from ${currentUrl}.`, 502);
      }

      let redirectUrl: string;

      try {
        redirectUrl = new URL(location, currentUrl).toString();
      } catch {
        throw new AppRouteError(`Received an invalid redirect target from ${currentUrl}.`, 502);
      }

      currentUrl = await normalizeInputUrl(redirectUrl);
      continue;
    }

    if (!response.ok) {
      throw new AppRouteError(`Could not fetch ${currentUrl} (${response.status}).`, 502);
    }

    const contentType = response.headers.get("content-type") ?? "";
    if (!contentType.includes("text/html")) {
      throw new AppRouteError(
        `Expected HTML from ${currentUrl} but received ${contentType || "unknown content"}.`,
        415,
      );
    }

    const declaredLength = Number(response.headers.get("content-length") ?? "");
    if (Number.isFinite(declaredLength) && declaredLength > MAX_HTML_BYTES) {
      throw new AppRouteError("The target page is too large for a live crawl preview.", 413);
    }

    const html = await response.text();
    if (Buffer.byteLength(html, "utf8") > MAX_HTML_BYTES) {
      throw new AppRouteError("The target page is too large for a live crawl preview.", 413);
    }

    return {
      html,
      finalUrl: currentUrl,
    };
  }

  throw new AppRouteError(`Too many redirects while fetching ${rawUrl}.`, 502);
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
  const homepageResponse = await fetchHtml(rawUrl);
  const homepageHtml = homepageResponse.html;
  const homepageUrl = homepageResponse.finalUrl;
  const homepagePage = extractPage(homepageUrl, homepageHtml);
  const candidateLinks = collectCandidateLinks(homepageHtml, homepageUrl).slice(0, maxPages - 1);
  const pages: CrawlPage[] = [homepagePage];

  for (const link of candidateLinks) {
    try {
      const pageResponse = await fetchHtml(link);
      pages.push(extractPage(pageResponse.finalUrl, pageResponse.html));
    } catch {
      continue;
    }
  }

  return {
    normalizedUrl: homepageUrl,
    homepageUrl,
    domain: new URL(homepageUrl).hostname.replace(/^www\./, ""),
    pages,
    previewTargets: extractPreviewTargets(homepageHtml),
  };
}
