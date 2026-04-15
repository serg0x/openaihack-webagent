import { load, type Cheerio, type CheerioAPI } from "cheerio";
import type { AnyNode } from "domhandler";
import { fetchHtml } from "@/lib/crawl";
import type { PreviewTargets } from "@/lib/types";

type PreviewPatch = {
  heroHeadline?: string;
  heroSubheadline?: string;
  primaryCta?: string;
};

type BuildPreviewArgs = {
  url: string;
  mode: "original" | "patched";
  patch?: PreviewPatch;
  targets?: Partial<PreviewTargets>;
};

const HEADING_TAG_SCORES: Record<string, number> = {
  h1: 220,
  h2: 180,
  h3: 140,
  p: 90,
  div: 70,
  span: 60,
};

const CTA_TEXT_PATTERN =
  /apply|book|contact|explore|get started|join|learn more|request|see|start|submit|talk|try|watch/i;
const IGNORE_TEXT_PATTERN =
  /^(about|apply|blog|companies|contact|faq|home|learn more|log in|login|menu|open menu|people|pricing|resources|sign up)$/i;
const INLINE_TEXT_TAGS = new Set(["span", "strong", "em", "b", "i", "small", "mark", "sup", "sub", "br"]);

function normalizeText(value: string) {
  return value.replace(/\s+/g, " ").trim();
}

function matchesTarget(text: string, target: string) {
  const normalizedText = normalizeText(text).toLowerCase();
  const normalizedTarget = normalizeText(target).toLowerCase();

  if (!normalizedText || !normalizedTarget) {
    return false;
  }

  return normalizedText === normalizedTarget;
}

function isPatchableTextElement($: CheerioAPI, element: AnyNode) {
  if (element.type !== "tag") {
    return false;
  }

  const tagName = element.name;
  const children = $(element).children().toArray();

  if (tagName === "a" || tagName === "button") {
    return children.every(
      (child) => child.type !== "tag" || INLINE_TEXT_TAGS.has(child.name) || child.name === "svg",
    );
  }

  if (children.length === 0) {
    return true;
  }

  if (children.length > 3) {
    return false;
  }

  if ($(element).find("a, button, div, p, section, article, main, header, footer, nav, ul, ol, li, form").length) {
    return false;
  }

  return children.every((child) => child.type === "tag" && INLINE_TEXT_TAGS.has(child.name));
}

function getRoot($: CheerioAPI) {
  return $("main").first().length ? $("main").first() : $("body").first();
}

function getControl($: CheerioAPI, element: AnyNode) {
  const control = $(element).closest("a, button").first();
  return control.length ? control : $(element);
}

function isExcludedRegion($: CheerioAPI, element: AnyNode) {
  return $(element).closest("nav, header, footer, dialog, [role='navigation']").length > 0;
}

function scoreHeadlineCandidate(
  $: CheerioAPI,
  element: AnyNode,
  index: number,
  text: string,
) {
  const tagName = element.type === "tag" ? element.name : "";
  const wordCount = text.split(/\s+/).filter(Boolean).length;
  let score = HEADING_TAG_SCORES[tagName] ?? 0;

  score += Math.max(0, 220 - index * 4);

  if (text.length >= 18 && text.length <= 90) score += 60;
  if (wordCount >= 4 && wordCount <= 12) score += 40;
  if (!/[.!?]$/.test(text) && wordCount <= 14) score += 20;
  if ($(element).find("a, button").length > 0) score -= 40;

  return score;
}

function locateTargetMatch(
  $: CheerioAPI,
  selector: string,
  target: string,
  scorer?: (element: AnyNode, index: number, text: string) => number,
) {
  if (!target.trim()) {
    return null;
  }

  const root = getRoot($);
  const candidates = root.find(selector).toArray();
  let bestScore = -Infinity;
  let bestElement: AnyNode | null = null;

  candidates.forEach((element, index) => {
    if (isExcludedRegion($, element)) {
      return;
    }

    if (!isPatchableTextElement($, element)) {
      return;
    }

    const text = normalizeText($(element).text());

    if (!matchesTarget(text, target)) {
      return;
    }

    let score = Math.max(0, 200 - index * 4);

    if (normalizeText(text).toLowerCase() === normalizeText(target).toLowerCase()) {
      score += 240;
    } else {
      score += 120;
    }

    if (scorer) {
      score += scorer(element, index, text);
    }

    if (score > bestScore) {
      bestScore = score;
      bestElement = element;
    }
  });

  return bestElement ? $(bestElement) : null;
}

function locateHeadline($: CheerioAPI, targetText = "") {
  const targetMatch = locateTargetMatch($, "h1, h2, h3, p, div, span", targetText, (element, index, text) =>
    scoreHeadlineCandidate($, element, index, text),
  );

  if (targetMatch?.length) {
    return targetMatch;
  }

  const root = getRoot($);
  const candidates = root.find("h1, h2, h3, p, div, span").toArray();
  let bestScore = -Infinity;
  let bestElement: AnyNode | null = null;

  candidates.slice(0, 200).forEach((element, index) => {
    if (isExcludedRegion($, element)) {
      return;
    }

    if (!isPatchableTextElement($, element)) {
      return;
    }

    const text = normalizeText($(element).text());

    if (!text || text.length < 14 || text.length > 160 || IGNORE_TEXT_PATTERN.test(text)) {
      return;
    }

    if ($(element).children().length > 12 || $(element).find("a, button").length > 2) {
      return;
    }

    const score = scoreHeadlineCandidate($, element, index, text);

    if (score > bestScore) {
      bestScore = score;
      bestElement = element;
    }
  });

  return bestElement ? $(bestElement) : $("main h1").first();
}

function removeDangerousNodes($: CheerioAPI) {
  $("script, noscript, iframe, object, embed").remove();
  $("meta[http-equiv='Content-Security-Policy']").remove();

  $("*").each((_, element) => {
    const attribs = "attribs" in element ? element.attribs : {};

    for (const key of Object.keys(attribs)) {
      if (key.toLowerCase().startsWith("on")) {
        $(element).removeAttr(key);
      }
    }
  });
}

function locateSubheadline($: CheerioAPI, targetText = "") {
  const targetMatch = locateTargetMatch($, "p, div, span", targetText);

  if (targetMatch?.length) {
    return targetMatch;
  }

  const headline = locateHeadline($);
  const scope = headline.closest("section, article, main, div");
  const directCandidates = headline.nextAll("p, div, span").toArray();

  for (const element of directCandidates) {
    if (isExcludedRegion($, element)) {
      continue;
    }

    if (!isPatchableTextElement($, element)) {
      continue;
    }

    const text = normalizeText($(element).text());

    if (!text || text === normalizeText(headline.text()) || text.length < 40 || text.length > 280) {
      continue;
    }

    if ($(element).find("a, button").length > 2) {
      continue;
    }

    return $(element);
  }

  const scopeCandidates = (scope.length ? scope : getRoot($)).find("p, div, span").toArray();

  for (const element of scopeCandidates) {
    if (isExcludedRegion($, element)) {
      continue;
    }

    if (!isPatchableTextElement($, element)) {
      continue;
    }

    const text = normalizeText($(element).text());

    if (!text || text === normalizeText(headline.text()) || text.length < 40 || text.length > 280) {
      continue;
    }

    if ($(element).find("a, button").length > 0) {
      continue;
    }

    return $(element);
  }

  return $("main p").filter((_, element) => normalizeText($(element).text()).length > 40).first();
}

function locateCta($: CheerioAPI, targetText = "") {
  const targetMatch = locateTargetMatch($, "a span, button span, a, button", targetText, (element, index, text) => {
    const control = getControl($, element);
    let score = CTA_TEXT_PATTERN.test(text) ? 60 : 0;
    if (control[0]?.type === "tag" && control[0].name === "button") score += 20;
    if (control.attr("href") && control.attr("href") !== "#") score += 20;
    return score + Math.max(0, 80 - index * 3);
  });

  if (targetMatch?.length) {
    return targetMatch;
  }

  const headline = locateHeadline($);
  const scope = headline.closest("section, article, div, main");
  const candidates = (scope.length ? scope : getRoot($)).find("a span, button span, a, button").toArray();
  let bestScore = -Infinity;
  let bestElement: AnyNode | null = null;

  candidates.forEach((element, index) => {
    const control = getControl($, element);

    if (isExcludedRegion($, control[0] ?? element)) {
      return;
    }

    if (!isPatchableTextElement($, element)) {
      return;
    }

    const text = normalizeText($(element).text());

    if (!text || text.length < 2 || text.length > 40 || IGNORE_TEXT_PATTERN.test(text)) {
      return;
    }

    let score = Math.max(0, 140 - index * 6);
    if (CTA_TEXT_PATTERN.test(text)) score += 100;
    if (control[0]?.type === "tag" && control[0].name === "button") score += 30;
    if (control.attr("href") && control.attr("href") !== "#") score += 20;
    if (control.closest("nav").length) score -= 30;

    if (score > bestScore) {
      bestScore = score;
      bestElement = element;
    }
  });

  return bestElement ? $(bestElement) : $("main a span, main button span, main a, main button, a span, button span, a, button").first();
}

function patchTextNode(
  $: CheerioAPI,
  element: Cheerio<AnyNode>,
  nextText: string,
  label: string,
) {
  if (!element.length || !nextText.trim()) {
    return false;
  }

  if (!isPatchableTextElement($, element[0])) {
    return false;
  }

  const currentText = normalizeText(element.text());
  const desiredText = normalizeText(nextText);

  if (!desiredText || currentText === desiredText) {
    return false;
  }

  element.attr("data-awo-patch", label);
  element.text(desiredText);
  return true;
}

function injectPatchedHeroFallback($: CheerioAPI, patch: PreviewPatch) {
  if (!patch.heroHeadline && !patch.heroSubheadline && !patch.primaryCta) {
    return;
  }

  $("body").prepend(`
    <section data-awo-generated-hero>
      <div data-awo-generated-eyebrow>Suggested patch</div>
      ${patch.heroHeadline ? `<h1>${patch.heroHeadline}</h1>` : ""}
      ${patch.heroSubheadline ? `<p>${patch.heroSubheadline}</p>` : ""}
      ${patch.primaryCta ? `<div><a href="#">${patch.primaryCta}</a></div>` : ""}
    </section>
  `);
}

function injectShell($: CheerioAPI, url: string, mode: "original" | "patched") {
  const title = $("title").text().trim() || new URL(url).hostname;
  const badgeLabel = mode === "patched" ? "AI patch preview" : "Original snapshot";
  const badgeTone =
    mode === "patched"
      ? "linear-gradient(135deg, #1fb981, #158c6d)"
      : "linear-gradient(135deg, #263238, #49545d)";

  if ($("head").length === 0) {
    $("html").prepend("<head></head>");
  }

  const existingBase = $("base").first();
  if (existingBase.length) {
    existingBase.attr("href", url);
  } else {
    $("head").prepend(`<base href="${url}">`);
  }

  $("head").append(`
    <style>
      html { background: #f4efe7; }
      body { margin: 0 auto; max-width: 1600px; background: white; box-shadow: 0 30px 100px rgba(0,0,0,0.16); }
      [data-awo-badge] {
        position: sticky;
        top: 0;
        z-index: 999999;
        display: flex;
        align-items: center;
        gap: 12px;
        padding: 14px 18px;
        color: white;
        font: 600 14px/1.2 "Helvetica Neue", Arial, sans-serif;
        letter-spacing: 0.02em;
        background: ${badgeTone};
        box-shadow: 0 14px 30px rgba(0,0,0,0.16);
      }
      [data-awo-badge] small {
        opacity: 0.8;
        font-weight: 500;
      }
      [data-awo-patch] {
        outline: 3px solid rgba(31,185,129,0.55);
        outline-offset: 8px;
        border-radius: 8px;
        box-shadow: 0 0 0 8px rgba(31,185,129,0.12);
      }
      [data-awo-generated-hero] {
        margin: 24px;
        padding: 32px;
        border-radius: 24px;
        background: linear-gradient(135deg, #f1fff8, #ffffff);
        border: 2px solid rgba(31,185,129,0.35);
        box-shadow: 0 18px 50px rgba(15,126,99,0.12);
        color: #10200f;
        font-family: "Helvetica Neue", Arial, sans-serif;
      }
      [data-awo-generated-eyebrow] {
        margin-bottom: 12px;
        font-size: 12px;
        font-weight: 700;
        letter-spacing: 0.16em;
        text-transform: uppercase;
        color: #158c6d;
      }
      [data-awo-generated-hero] h1 {
        margin: 0;
        max-width: 18ch;
        font-size: clamp(2rem, 4vw, 3.5rem);
        line-height: 1;
        letter-spacing: -0.04em;
      }
      [data-awo-generated-hero] p {
        margin: 16px 0 0;
        max-width: 64ch;
        font-size: 17px;
        line-height: 1.7;
        color: #355245;
      }
      [data-awo-generated-hero] a {
        display: inline-flex;
        margin-top: 20px;
        align-items: center;
        justify-content: center;
        border-radius: 10px;
        background: #158c6d;
        padding: 12px 18px;
        color: white;
        font-weight: 700;
        text-decoration: none;
      }
      a, button {
        pointer-events: none !important;
      }
    </style>
  `);

  $("body").prepend(`
    <div data-awo-badge>
      <span>${badgeLabel}</span>
      <small>${title}</small>
    </div>
  `);
}

export async function buildPreviewHtml({ url, mode, patch, targets }: BuildPreviewArgs) {
  const { html, finalUrl } = await fetchHtml(url);
  const $ = load(html);

  removeDangerousNodes($);

  if (mode === "patched" && patch) {
    const headlinePatched = patchTextNode(
      $,
      locateHeadline($, targets?.headlineText || ""),
      patch.heroHeadline || "",
      "headline",
    );
    const subheadlinePatched = patchTextNode(
      $,
      locateSubheadline($, targets?.subheadlineText || ""),
      patch.heroSubheadline || "",
      "subheadline",
    );
    const ctaPatched = patchTextNode($, locateCta($, targets?.ctaText || ""), patch.primaryCta || "", "cta");

    void subheadlinePatched;
    void ctaPatched;

    if (!headlinePatched) {
      injectPatchedHeroFallback($, patch);
    }
  }

  injectShell($, finalUrl, mode);

  return $.html();
}
