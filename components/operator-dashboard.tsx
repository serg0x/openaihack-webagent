"use client";

import { type FormEvent, type ReactNode, useState } from "react";
import { CopyButton } from "@/components/copy-button";
import type { AnalysisResult } from "@/lib/types";

const DEFAULT_PERSONA =
  "A B2B startup buyer who wants to understand the product fast, see proof, and know the best next step.";

const EMPTY_STEPS = [
  "Crawl the homepage and a few high-signal supporting pages.",
  "Test whether the site clearly answers the core buyer questions.",
  "Score clarity, proof, CTA strength, and AI answerability.",
  "Generate a homepage patch and preview it on the live site shell.",
];

const DELIVERABLES = [
  "Five-question explainability audit with evidence",
  "Hero, CTA, FAQ, and schema patch",
  "Live before-and-after homepage preview",
];

const SCORE_QUESTIONS = [
  "What does this company do?",
  "Who is it for?",
  "Why should I trust it?",
  "What should I do next?",
  "How confidently could an AI assistant explain it from the site alone?",
];

function formatTimestamp(isoString: string) {
  return new Intl.DateTimeFormat("en", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(isoString));
}

function scoreTone(score: number) {
  if (score >= 80) return "text-emerald-600";
  if (score >= 60) return "text-amber-600";
  return "text-rose-600";
}

function buildPreviewUrl(result: AnalysisResult, mode: "original" | "patched") {
  const params = new URLSearchParams({
    url: result.preview.homepageUrl,
    mode,
  });

  if (mode === "patched") {
    params.set("headline", result.patch.heroHeadline);
    params.set("subheadline", result.patch.heroSubheadline);
    params.set("cta", result.patch.primaryCta);
    params.set("originalHeadline", result.crawl.previewTargets.headlineText);
    params.set("originalSubheadline", result.crawl.previewTargets.subheadlineText);
    params.set("originalCta", result.crawl.previewTargets.ctaText);
  }

  return `/api/preview?${params.toString()}`;
}

function formatEvidenceLabel(evidenceUrl: string) {
  const pathname = new URL(evidenceUrl).pathname;

  if (pathname === "/") {
    return "homepage";
  }

  return pathname
    .replace(/^\//, "")
    .replace(/\//g, " / ")
    .replace(/-/g, " ");
}

function SectionHeading({
  title,
  description,
  actions,
}: {
  title: string;
  description?: string;
  actions?: ReactNode;
}) {
  return (
    <div className="md:flex md:items-end md:justify-between">
      <div className="min-w-0 flex-1">
        <h2 className="text-xl font-semibold tracking-tight text-gray-900 sm:text-2xl">{title}</h2>
        {description ? <p className="mt-2 max-w-3xl text-sm leading-6 text-gray-600">{description}</p> : null}
      </div>
      {actions ? <div className="mt-4 md:mt-0 md:ml-4">{actions}</div> : null}
    </div>
  );
}

function ScoreMeter({ label, score }: { label: string; score: number }) {
  return (
    <div>
      <div className="flex items-center justify-between text-sm">
        <span className="text-gray-600">{label}</span>
        <span className={`font-semibold ${scoreTone(score)}`}>{score}</span>
      </div>
      <div className="mt-2 h-2 rounded-full bg-gray-200">
        <div
          className="h-2 rounded-full bg-indigo-600"
          style={{ width: `${score}%` }}
        />
      </div>
    </div>
  );
}

export function OperatorDashboard() {
  const [url, setUrl] = useState("");
  const [persona, setPersona] = useState(DEFAULT_PERSONA);
  const [result, setResult] = useState<AnalysisResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  async function runAnalysis(useFixture = false) {
    setError(null);
    setIsLoading(true);

    try {
      const response = await fetch("/api/analyze", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          url,
          persona,
          useFixture,
        }),
      });

      const payload = (await response.json()) as AnalysisResult & {
        error?: string;
      };

      if (!response.ok || payload.error) {
        throw new Error(payload.error || "The analysis request failed.");
      }

      setResult(payload);
    } catch (nextError) {
      setResult(null);
      setError(nextError instanceof Error ? nextError.message : "The analysis request failed.");
    } finally {
      setIsLoading(false);
    }
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    await runAnalysis(false);
  }

  return (
    <main className="min-h-screen bg-gray-50">
      <div className="mx-auto max-w-7xl px-4 py-10 sm:px-6 lg:px-8">
        <div className="border-b border-gray-200 pb-10">
          <div className="grid gap-10 lg:grid-cols-[minmax(0,1.7fr)_minmax(260px,0.8fr)]">
            <div>
              <p className="text-sm font-semibold text-indigo-600">Website Explainability Audit</p>
              <h1 className="mt-2 max-w-4xl text-4xl font-semibold tracking-tight text-gray-900 sm:text-5xl">
                Can-AI-Explain-You?
              </h1>
              <p className="mt-4 max-w-3xl text-base leading-7 text-gray-600">
                A startup website explainability audit. Paste in a public URL and a target buyer
                persona, and the app checks whether your company is legible to both buyers and AI
                assistants, audits five core buyer questions, and generates a ready-to-use homepage
                patch with a live before-and-after preview.
              </p>

              <form
                className="mt-8 overflow-hidden rounded-xl bg-white p-6 shadow-sm ring-1 ring-gray-950/5"
                onSubmit={handleSubmit}
              >
                <div className="grid gap-6 lg:grid-cols-[minmax(0,0.9fr)_minmax(0,1.1fr)]">
                  <div>
                    <label htmlFor="website-url" className="block text-sm/6 font-medium text-gray-900">
                      Website URL
                    </label>
                    <div className="mt-2">
                      <input
                        id="website-url"
                        value={url}
                        onChange={(event) => setUrl(event.target.value)}
                        type="url"
                        placeholder="https://example.com"
                        className="block w-full rounded-md bg-white px-3 py-2 text-base text-gray-900 outline-1 -outline-offset-1 outline-gray-300 placeholder:text-gray-400 focus:outline-2 focus:-outline-offset-2 focus:outline-indigo-600"
                      />
                    </div>
                  </div>

                  <div>
                    <label htmlFor="buyer-persona" className="block text-sm/6 font-medium text-gray-900">
                      Target buyer persona
                    </label>
                    <div className="mt-2">
                      <textarea
                        id="buyer-persona"
                        value={persona}
                        onChange={(event) => setPersona(event.target.value)}
                        rows={4}
                        className="block w-full rounded-md bg-white px-3 py-2 text-base text-gray-900 outline-1 -outline-offset-1 outline-gray-300 placeholder:text-gray-400 focus:outline-2 focus:-outline-offset-2 focus:outline-indigo-600"
                      />
                    </div>
                  </div>
                </div>

                <div className="mt-6 flex flex-col gap-4 border-t border-gray-200 pt-6 lg:flex-row lg:items-center lg:justify-between">
                  <p className="max-w-2xl text-sm leading-6 text-gray-600">
                    Live mode audits a real site through the OpenAI API. Demo mode is the fallback
                    when a site is slow, blocked, or you want a reliable walkthrough.
                  </p>
                  <div className="flex flex-wrap gap-3">
                    <button
                      type="submit"
                      disabled={isLoading}
                      className="inline-flex items-center rounded-md bg-indigo-600 px-3.5 py-2.5 text-sm font-semibold text-white shadow-xs hover:bg-indigo-500 disabled:cursor-wait disabled:opacity-70"
                    >
                      {isLoading ? "Running..." : "Analyze live site"}
                    </button>
                    <button
                      type="button"
                      onClick={() => void runAnalysis(true)}
                      disabled={isLoading}
                      className="inline-flex items-center rounded-md bg-white px-3.5 py-2.5 text-sm font-semibold text-gray-900 shadow-xs ring-1 ring-inset ring-gray-300 hover:bg-gray-50 disabled:cursor-wait disabled:opacity-70"
                    >
                      Load demo fixture
                    </button>
                  </div>
                </div>
              </form>

              {error ? (
                <div className="mt-4 rounded-md bg-amber-50 p-4 ring-1 ring-inset ring-amber-200">
                  <div className="text-sm">
                    <h3 className="font-medium text-amber-800">Request could not be completed</h3>
                    <p className="mt-2 text-amber-700">{error}</p>
                  </div>
                </div>
              ) : null}
            </div>

            <aside className="border-t border-gray-200 pt-8 lg:border-t-0 lg:border-l lg:pl-8 lg:pt-0">
              <div>
                <p className="text-sm font-semibold text-gray-900">What you get</p>
                <ul className="mt-4 space-y-3 text-sm leading-6 text-gray-600">
                  {DELIVERABLES.map((item) => (
                    <li key={item} className="flex gap-3">
                      <span className="mt-2 h-1.5 w-1.5 rounded-full bg-indigo-600" />
                      <span>{item}</span>
                    </li>
                  ))}
                </ul>
              </div>

              <div className="mt-8">
                <p className="text-sm font-semibold text-gray-900">Flow</p>
                <ol className="mt-4 space-y-4 text-sm leading-6 text-gray-600">
                  {EMPTY_STEPS.map((item, index) => (
                    <li key={item} className="flex gap-3">
                      <span className="flex h-6 w-6 flex-none items-center justify-center rounded-full bg-gray-900 text-xs font-semibold text-white">
                        {index + 1}
                      </span>
                      <span>{item}</span>
                    </li>
                  ))}
                </ol>
              </div>
            </aside>
          </div>

          {!result ? (
            <div className="mt-10 grid gap-10 lg:grid-cols-2">
              <div>
                <h2 className="text-lg font-semibold text-gray-900">What gets tested</h2>
                <ul className="mt-4 divide-y divide-gray-200 rounded-xl bg-white shadow-sm ring-1 ring-gray-950/5">
                  {SCORE_QUESTIONS.map((question) => (
                    <li key={question} className="px-6 py-4 text-sm leading-6 text-gray-700">
                      {question}
                    </li>
                  ))}
                </ul>
              </div>

              <div>
                <h2 className="text-lg font-semibold text-gray-900">How it works</h2>
                <div className="mt-4 rounded-xl bg-white p-6 shadow-sm ring-1 ring-gray-950/5">
                  <ol className="space-y-4 text-sm leading-6 text-gray-600">
                    <li>Start with the demo fixture if you want to see the full workflow first.</li>
                    <li>Use a public homepage or product page for a live explainability audit.</li>
                    <li>Review the score, missing info, patch payload, evidence, and preview together.</li>
                  </ol>
                </div>
              </div>
            </div>
          ) : null}
        </div>

        {result ? (
          <>
            <section className="border-b border-gray-200 py-10">
              <SectionHeading
                title="Overview"
                description="A quick read on whether buyers and AI assistants can explain the company from the site alone."
              />

              <dl className="mt-6 grid grid-cols-1 divide-y divide-gray-200 overflow-hidden rounded-xl bg-white shadow-sm ring-1 ring-gray-950/5 md:grid-cols-3 md:divide-x md:divide-y-0">
                <div className="px-6 py-5">
                  <dt className="text-sm font-medium text-gray-500">Current score</dt>
                  <dd className={`mt-2 text-4xl font-semibold tracking-tight ${scoreTone(result.overallScore)}`}>
                    {result.overallScore}
                  </dd>
                </div>
                <div className="px-6 py-5">
                  <dt className="text-sm font-medium text-gray-500">Projected after patch</dt>
                  <dd
                    className={`mt-2 text-4xl font-semibold tracking-tight ${scoreTone(
                      result.rescoredOverall,
                    )}`}
                  >
                    {result.rescoredOverall}
                  </dd>
                </div>
                <div className="px-6 py-5">
                  <dt className="text-sm font-medium text-gray-500">Run</dt>
                  <dd className="mt-2 text-sm leading-6 text-gray-700">
                    {result.mode === "demo" ? "Fixture data" : "Generated live"}
                    <br />
                    {formatTimestamp(result.generatedAt)}
                  </dd>
                </div>
              </dl>

              <div className="mt-8 grid gap-10 lg:grid-cols-[minmax(0,1.4fr)_minmax(280px,1fr)]">
                <div>
                  <h3 className="text-sm font-semibold text-gray-900">Summary</h3>
                  <p className="mt-3 max-w-3xl text-sm leading-7 text-gray-600">{result.siteSummary}</p>

                  <div className="mt-8 grid gap-4 sm:grid-cols-2">
                    <ScoreMeter label="Clarity" score={result.rubric.clarity} />
                    <ScoreMeter label="Audience fit" score={result.rubric.audienceFit} />
                    <ScoreMeter label="Proof" score={result.rubric.proof} />
                    <ScoreMeter label="CTA" score={result.rubric.cta} />
                    <div className="sm:col-span-2">
                      <ScoreMeter label="AI answerability" score={result.rubric.aiAnswerability} />
                    </div>
                  </div>
                </div>

                <div>
                  <div className="rounded-md bg-amber-50 p-4 ring-1 ring-inset ring-amber-200">
                    <h3 className="text-sm font-medium text-amber-900">Missing information</h3>
                    <ul className="mt-3 space-y-2 text-sm leading-6 text-amber-800">
                      {result.missingInformation.map((item) => (
                        <li key={item}>• {item}</li>
                      ))}
                    </ul>
                  </div>
                </div>
              </div>
            </section>

            <section className="border-b border-gray-200 py-10">
              <SectionHeading
                title="Patch payload"
                description="Concrete homepage copy you can move into a CMS draft, design review, or live page update."
              />

              <div className="mt-6 overflow-hidden rounded-xl bg-white shadow-sm ring-1 ring-gray-950/5">
                <div className="px-6 py-6">
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <p className="text-sm font-medium text-gray-500">Hero headline</p>
                      <p className="mt-2 text-3xl font-semibold tracking-tight text-gray-900">
                        {result.patch.heroHeadline}
                      </p>
                    </div>
                    <CopyButton value={result.patch.heroHeadline} />
                  </div>
                </div>

                <div className="border-t border-gray-200 px-6 py-6">
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <p className="text-sm font-medium text-gray-500">Hero subheadline</p>
                      <p className="mt-2 max-w-3xl text-sm leading-7 text-gray-600">
                        {result.patch.heroSubheadline}
                      </p>
                    </div>
                    <CopyButton value={result.patch.heroSubheadline} />
                  </div>
                </div>

                <div className="border-t border-gray-200 px-6 py-6">
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <p className="text-sm font-medium text-gray-500">Primary CTA</p>
                      <p className="mt-2 inline-flex items-center rounded-md bg-indigo-600 px-3 py-2 text-sm font-semibold text-white">
                        {result.patch.primaryCta}
                      </p>
                    </div>
                    <CopyButton value={result.patch.primaryCta} />
                  </div>
                </div>

                <div className="border-t border-gray-200 px-6 py-6">
                  <div className="flex items-start justify-between gap-4">
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-medium text-gray-500">FAQ block</p>
                      <div className="mt-4 divide-y divide-gray-200">
                        {result.patch.faqs.map((faq) => (
                          <div key={faq.question} className="py-4 first:pt-0 last:pb-0">
                            <p className="font-semibold text-gray-900">{faq.question}</p>
                            <p className="mt-2 text-sm leading-7 text-gray-600">{faq.answer}</p>
                          </div>
                        ))}
                      </div>
                    </div>
                    <CopyButton
                      label="Copy FAQs"
                      value={result.patch.faqs
                        .map((faq) => `${faq.question}\n${faq.answer}`)
                        .join("\n\n")}
                    />
                  </div>
                </div>

                <div className="border-t border-gray-200 px-6 py-6">
                  <div className="flex items-start justify-between gap-4">
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-medium text-gray-500">JSON-LD</p>
                      <pre className="mt-4 overflow-x-auto rounded-lg bg-gray-50 p-4 text-xs leading-6 text-gray-700 ring-1 ring-inset ring-gray-200">
                        {result.patch.jsonLd}
                      </pre>
                    </div>
                    <CopyButton value={result.patch.jsonLd} label="Copy schema" />
                  </div>
                </div>

                <div className="grid gap-0 border-t border-gray-200 lg:grid-cols-2 lg:divide-x lg:divide-gray-200">
                  <div className="px-6 py-6">
                    <p className="text-sm font-medium text-gray-500">Why this patch works</p>
                    <ul className="mt-4 space-y-3 text-sm leading-7 text-gray-600">
                      {result.patch.rationale.map((point) => (
                        <li key={point}>• {point}</li>
                      ))}
                    </ul>
                  </div>
                  <div className="border-t border-gray-200 px-6 py-6 lg:border-t-0">
                    <p className="text-sm font-medium text-gray-500">Visual patch notes</p>
                    <ul className="mt-4 space-y-3 text-sm leading-7 text-gray-600">
                      {result.patch.diffNotes.map((point) => (
                        <li key={point}>• {point}</li>
                      ))}
                    </ul>
                  </div>
                </div>
              </div>
            </section>

            <section className="grid gap-10 border-b border-gray-200 py-10 lg:grid-cols-2">
              <div>
                <SectionHeading
                  title="Buyer-question audit"
                  description="The evidence-backed read on the five questions a buyer or AI assistant should be able to answer."
                />
                <div className="mt-6 overflow-hidden rounded-xl bg-white shadow-sm ring-1 ring-gray-950/5">
                  <ul className="divide-y divide-gray-200">
                    {result.buyerQuestions.map((item) => (
                      <li key={item.question} className="px-6 py-6">
                        <div className="flex flex-wrap items-start justify-between gap-3">
                          <h3 className="max-w-2xl text-base font-semibold text-gray-900">
                            {item.question}
                          </h3>
                          <div className="flex flex-wrap gap-2 text-xs font-medium text-gray-600">
                            <span className="rounded-md bg-gray-100 px-2 py-1">
                              Score {item.score}/5
                            </span>
                            <span className="rounded-md bg-gray-100 px-2 py-1">
                              Confidence {item.confidence}
                            </span>
                          </div>
                        </div>

                        <p className="mt-3 text-sm leading-7 text-gray-600">{item.answer}</p>

                        <div className="mt-4 flex flex-wrap gap-2">
                          {item.evidenceUrls.map((evidenceUrl) => (
                            <span
                              key={evidenceUrl}
                              className="rounded-md bg-indigo-50 px-2.5 py-1 text-xs font-medium text-indigo-700 ring-1 ring-inset ring-indigo-200"
                            >
                              {formatEvidenceLabel(evidenceUrl)}
                            </span>
                          ))}
                        </div>

                        {item.missingInfo.length ? (
                          <p className="mt-4 text-sm text-gray-500">
                            Missing: {item.missingInfo.join(" · ")}
                          </p>
                        ) : null}
                      </li>
                    ))}
                  </ul>
                </div>
              </div>

              <div>
                <SectionHeading
                  title="Crawled pages"
                  description="The source pages that informed the explainability audit."
                />
                <div className="mt-6 overflow-hidden rounded-xl bg-white shadow-sm ring-1 ring-gray-950/5">
                  <ul className="divide-y divide-gray-200">
                    {result.crawl.pages.map((page) => (
                      <li key={page.url} className="px-6 py-6">
                        <div className="flex flex-wrap items-start justify-between gap-3">
                          <div>
                            <p className="text-xs font-medium uppercase tracking-wide text-gray-500">
                              {page.role}
                            </p>
                            <h3 className="mt-1 text-base font-semibold text-gray-900">
                              {page.title || page.url}
                            </h3>
                          </div>
                          <span className="rounded-md bg-gray-100 px-2 py-1 text-xs text-gray-600">
                            {new URL(page.url).pathname || "/"}
                          </span>
                        </div>

                        {page.h1 ? (
                          <p className="mt-3 text-sm font-medium text-gray-900">H1: {page.h1}</p>
                        ) : null}
                        {page.metaDescription ? (
                          <p className="mt-2 text-sm leading-7 text-gray-600">{page.metaDescription}</p>
                        ) : null}
                        <p className="mt-2 text-sm leading-7 text-gray-600">{page.excerpt}</p>
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            </section>

            <section className="py-10">
              <SectionHeading
                title="Patched homepage preview"
                description="A direct before-and-after view of the live homepage shell with the patched hero copy applied."
              />

              {result.preview.supportsPatchedPreview ? (
                <div className="mt-6 overflow-hidden rounded-xl bg-white shadow-sm ring-1 ring-gray-950/5">
                  <div className="grid gap-px bg-gray-200 xl:grid-cols-2">
                    <div className="bg-white">
                      <div className="border-b border-gray-200 px-4 py-3 text-sm font-medium text-gray-600">
                        Original snapshot
                      </div>
                      <iframe
                        title="Original homepage preview"
                        src={buildPreviewUrl(result, "original")}
                        className="h-[680px] w-full bg-white"
                        sandbox=""
                      />
                    </div>

                    <div className="bg-white">
                      <div className="border-b border-gray-200 px-4 py-3 text-sm font-medium text-gray-600">
                        Patched homepage preview
                      </div>
                      <iframe
                        title="Patched homepage preview"
                        src={buildPreviewUrl(result, "patched")}
                        className="h-[680px] w-full bg-white"
                        sandbox=""
                      />
                    </div>
                  </div>
                </div>
              ) : (
                <div className="mt-6 rounded-md bg-amber-50 p-4 ring-1 ring-inset ring-amber-200">
                  <p className="text-sm text-amber-800">
                    The demo fixture does not include a live preview overlay, but live analyses still
                    support proxied homepage patching.
                  </p>
                </div>
              )}
            </section>
          </>
        ) : null}
      </div>
    </main>
  );
}
