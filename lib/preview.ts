import { load, type Cheerio, type CheerioAPI } from "cheerio";
import type { AnyNode } from "domhandler";
import { fetchHtml, normalizeInputUrl } from "@/lib/crawl";

type PreviewPatch = {
  heroHeadline?: string;
  heroSubheadline?: string;
  primaryCta?: string;
};

type BuildPreviewArgs = {
  url: string;
  mode: "original" | "patched";
  patch?: PreviewPatch;
};

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

function locateHeadline($: CheerioAPI) {
  return $("main h1").first() || $("h1").first() || $("main h2").first();
}

function locateSubheadline($: CheerioAPI) {
  const scoped = locateHeadline($).closest("section, div");
  const scopedParagraph = scoped
    .find("p")
    .filter((_, element) => $(element).text().trim().length > 30)
    .first();

  if (scopedParagraph.length) {
    return scopedParagraph;
  }

  return $("main p")
    .filter((_, element) => $(element).text().trim().length > 30)
    .first();
}

function locateCta($: CheerioAPI) {
  const target = $("main a, main button, header a, header button, a, button")
    .filter((_, element) => {
      const text = $(element).text().trim();
      return text.length >= 2 && text.length <= 40;
    })
    .first();

  return target;
}

function patchTextNode(
  $: CheerioAPI,
  element: Cheerio<AnyNode>,
  nextText: string,
  label: string,
) {
  if (!element.length || !nextText.trim()) {
    return;
  }

  element.attr("data-awo-patch", label);
  element.text(nextText.trim());
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

export async function buildPreviewHtml({ url, mode, patch }: BuildPreviewArgs) {
  const normalizedUrl = normalizeInputUrl(url);
  const html = await fetchHtml(normalizedUrl);
  const $ = load(html);

  removeDangerousNodes($);

  if (mode === "patched" && patch) {
    patchTextNode($, locateHeadline($), patch.heroHeadline || "", "headline");
    patchTextNode($, locateSubheadline($), patch.heroSubheadline || "", "subheadline");
    patchTextNode($, locateCta($), patch.primaryCta || "", "cta");
  }

  injectShell($, normalizedUrl, mode);

  return $.html();
}
