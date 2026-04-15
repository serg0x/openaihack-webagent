import { getOpenAIClient, getOpenAIModel } from "@/lib/openai";
import type { AnalysisResult, CrawlResult } from "@/lib/types";

const ANALYSIS_SCHEMA = {
  type: "object",
  additionalProperties: false,
  properties: {
    siteSummary: { type: "string" },
    overallScore: { type: "number" },
    rescoredOverall: { type: "number" },
    rubric: {
      type: "object",
      additionalProperties: false,
      properties: {
        clarity: { type: "number" },
        audienceFit: { type: "number" },
        proof: { type: "number" },
        cta: { type: "number" },
        aiAnswerability: { type: "number" },
      },
      required: ["clarity", "audienceFit", "proof", "cta", "aiAnswerability"],
    },
    buyerQuestions: {
      type: "array",
      minItems: 5,
      maxItems: 5,
      items: {
        type: "object",
        additionalProperties: false,
        properties: {
          question: { type: "string" },
          answer: { type: "string" },
          confidence: { type: "number" },
          score: { type: "number" },
          evidenceUrls: {
            type: "array",
            items: { type: "string" },
          },
          missingInfo: {
            type: "array",
            items: { type: "string" },
          },
        },
        required: ["question", "answer", "confidence", "score", "evidenceUrls", "missingInfo"],
      },
    },
    missingInformation: {
      type: "array",
      items: { type: "string" },
    },
    patch: {
      type: "object",
      additionalProperties: false,
      properties: {
        heroHeadline: { type: "string" },
        heroSubheadline: { type: "string" },
        primaryCta: { type: "string" },
        faqs: {
          type: "array",
          minItems: 3,
          maxItems: 3,
          items: {
            type: "object",
            additionalProperties: false,
            properties: {
              question: { type: "string" },
              answer: { type: "string" },
            },
            required: ["question", "answer"],
          },
        },
        jsonLd: { type: "string" },
        rationale: {
          type: "array",
          items: { type: "string" },
        },
        diffNotes: {
          type: "array",
          items: { type: "string" },
        },
      },
      required: [
        "heroHeadline",
        "heroSubheadline",
        "primaryCta",
        "faqs",
        "jsonLd",
        "rationale",
        "diffNotes",
      ],
    },
  },
  required: [
    "siteSummary",
    "overallScore",
    "rescoredOverall",
    "rubric",
    "buyerQuestions",
    "missingInformation",
    "patch",
  ],
} as const;

type AnalyzeSiteArgs = {
  url: string;
  persona: string;
  crawl: CrawlResult;
};

function clampScore(value: number, min = 0, max = 100) {
  return Math.max(min, Math.min(max, Math.round(value)));
}

function buildSiteDossier(crawl: CrawlResult) {
  return crawl.pages
    .map((page, index) => {
      const label = index === 0 ? "homepage" : page.role;
      return [
        `PAGE ${index + 1} (${label})`,
        `URL: ${page.url}`,
        `Title: ${page.title || "n/a"}`,
        `Meta description: ${page.metaDescription || "n/a"}`,
        `H1: ${page.h1 || "n/a"}`,
        `Headings: ${page.headings.slice(0, 6).join(" | ") || "n/a"}`,
        `Excerpt: ${page.excerpt || "n/a"}`,
        `Main text:\n${page.mainText.slice(0, 2400) || "n/a"}`,
      ].join("\n");
    })
    .join("\n\n---\n\n");
}

export async function analyzeSite({
  url,
  persona,
  crawl,
}: AnalyzeSiteArgs): Promise<AnalysisResult> {
  const client = getOpenAIClient();

  if (!client) {
    throw new Error("Missing OPENAI_API_KEY. Add one to run live analysis.");
  }

  const evidenceUrls = crawl.pages.map((page) => page.url);
  const response = await client.responses.create({
    model: getOpenAIModel(),
    reasoning: { effort: "medium" },
    store: false,
    max_output_tokens: 3200,
    text: {
      format: {
        type: "json_schema",
        name: "website_operator_analysis",
        strict: true,
        schema: ANALYSIS_SCHEMA,
      },
    },
    instructions: [
      "You are an exacting website strategist auditing whether AI assistants can explain a startup clearly.",
      "Use only the evidence provided. Do not invent features, pricing, claims, or proof points.",
      "If the site is missing something, say it is missing.",
      "Optimize the patch for honesty, clarity, trust, and a stronger action bias for the target persona.",
      "Keep hero copy tight and natural, not generic marketing fluff.",
      "For JSON-LD, choose Organization unless SoftwareApplication is strongly supported by evidence.",
      `Only cite these evidence URLs: ${evidenceUrls.join(", ")}.`,
    ].join("\n"),
    input: [
      {
        role: "user",
        content: [
          {
            type: "input_text",
            text: [
              `Target URL: ${url}`,
              `Target persona: ${persona}`,
              `Known evidence URLs: ${evidenceUrls.join(", ")}`,
              "",
              "Evaluate the current site with these exact questions:",
              "1. What does this company do?",
              "2. Who is it for?",
              "3. Why should I trust it?",
              "4. What should I do next?",
              "5. How confidently could an AI assistant explain the company from this website alone?",
              "",
              "Then generate a patch with:",
              "- hero headline",
              "- hero subheadline",
              "- primary CTA",
              "- exactly 3 FAQs",
              "- JSON-LD snippet",
              "- short rationale bullets",
              "- short visual diff notes for a preview overlay",
              "",
              "Return numeric scores as 0-100, confidence as 0-100, and buyer-question score as 0-5.",
              "",
              buildSiteDossier(crawl),
            ].join("\n"),
          },
        ],
      },
    ],
  });

  if (!response.output_text) {
    throw new Error("The model returned an empty analysis.");
  }

  const parsed = JSON.parse(response.output_text) as Omit<
    AnalysisResult,
    "mode" | "input" | "crawl" | "generatedAt" | "preview"
  >;

  return {
    mode: "live",
    input: { url, persona },
    crawl,
    siteSummary: parsed.siteSummary,
    overallScore: clampScore(parsed.overallScore),
    rescoredOverall: clampScore(parsed.rescoredOverall),
    rubric: {
      clarity: clampScore(parsed.rubric.clarity),
      audienceFit: clampScore(parsed.rubric.audienceFit),
      proof: clampScore(parsed.rubric.proof),
      cta: clampScore(parsed.rubric.cta),
      aiAnswerability: clampScore(parsed.rubric.aiAnswerability),
    },
    buyerQuestions: parsed.buyerQuestions.map((question) => ({
      ...question,
      confidence: clampScore(question.confidence),
      score: clampScore(question.score, 0, 5),
    })),
    missingInformation: parsed.missingInformation,
    patch: parsed.patch,
    generatedAt: new Date().toISOString(),
    preview: {
      homepageUrl: crawl.homepageUrl,
      supportsPatchedPreview: true,
    },
  };
}
