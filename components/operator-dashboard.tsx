"use client";

import { FormEvent, useState } from "react";
import { CopyButton } from "@/components/copy-button";
import type { AnalysisResult } from "@/lib/types";

const DEFAULT_PERSONA =
  "A B2B startup buyer who wants to understand the product fast, see proof, and know the best next step.";

function formatTimestamp(isoString: string) {
  return new Intl.DateTimeFormat("en", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(isoString));
}

function scoreTone(score: number) {
  if (score >= 80) return "text-[var(--accent-deep)]";
  if (score >= 60) return "text-[#856322]";
  return "text-[var(--warning)]";
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
  }

  return `/api/preview?${params.toString()}`;
}

type SectionCardProps = {
  title: string;
  eyebrow?: string;
  children: React.ReactNode;
};

function SectionCard({ title, eyebrow, children }: SectionCardProps) {
  return (
    <section className="rounded-[28px] border border-[var(--line)] bg-[var(--surface)] p-6 shadow-[var(--shadow)] backdrop-blur">
      {eyebrow ? (
        <p className="mb-2 text-[11px] font-semibold tracking-[0.24em] text-[var(--ink-soft)] uppercase">
          {eyebrow}
        </p>
      ) : null}
      <h2 className="text-xl font-semibold tracking-[-0.03em]">{title}</h2>
      <div className="mt-4">{children}</div>
    </section>
  );
}

function ScoreBar({ label, score }: { label: string; score: number }) {
  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between text-sm">
        <span className="text-[var(--ink-soft)]">{label}</span>
        <span className={`font-semibold ${scoreTone(score)}`}>{score}</span>
      </div>
      <div className="h-2 overflow-hidden rounded-full bg-black/8">
        <div
          className="h-full rounded-full bg-[linear-gradient(90deg,#0f7e63,#27d090)]"
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
        demoAvailable?: boolean;
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
    <main className="mx-auto flex min-h-screen w-full max-w-[1440px] flex-col gap-8 px-5 py-8 text-[var(--foreground)] sm:px-8 lg:px-10">
      <section className="overflow-hidden rounded-[34px] border border-[var(--line)] bg-[linear-gradient(135deg,rgba(255,255,255,0.88),rgba(233,251,243,0.92))] p-6 shadow-[var(--shadow)] lg:p-8">
        <div className="grid gap-8 lg:grid-cols-[1.25fr_0.75fr]">
          <div className="space-y-5">
            <div className="inline-flex items-center gap-2 rounded-full border border-[var(--line)] bg-white/70 px-3 py-1 text-[11px] font-semibold tracking-[0.24em] uppercase text-[var(--ink-soft)]">
              Live hackathon MVP
              <span className="h-2 w-2 rounded-full bg-[var(--accent)]" />
            </div>
            <h1 className="max-w-3xl text-4xl font-semibold leading-none tracking-[-0.06em] sm:text-5xl lg:text-6xl">
              Can AI explain your startup before a human bounces?
            </h1>
            <p className="max-w-2xl text-base leading-7 text-[var(--ink-soft)] sm:text-lg">
              Drop in a real startup URL and a target buyer. The app crawls the site, scores how
              answerable it is for AI assistants, writes a sharper hero and FAQ set, then previews
              those edits directly on a proxied version of the live homepage.
            </p>
            <div className="flex flex-wrap gap-3 text-sm text-[var(--ink-soft)]">
              <span className="rounded-full border border-[var(--line)] bg-white/75 px-3 py-2">
                Requires <code>OPENAI_API_KEY</code> for live analysis
              </span>
              <span className="rounded-full border border-[var(--line)] bg-white/75 px-3 py-2">
                ChatGPT Pro is separate from API billing
              </span>
              <span className="rounded-full border border-[var(--line)] bg-white/75 px-3 py-2">
                Live crawl + AI audit + patch preview
              </span>
            </div>
          </div>
          <div className="rounded-[28px] border border-[var(--line)] bg-[#142311] p-5 text-[#ecfff7]">
            <p className="text-[11px] font-semibold tracking-[0.22em] uppercase text-[#96dbbf]">
              Demo script
            </p>
            <ol className="mt-4 space-y-3 text-sm leading-6 text-[#d7f6e9]">
              <li>1. Enter a startup site from the room and choose the buyer persona.</li>
              <li>2. Show the weak spots in clarity, trust, and CTA confidence.</li>
              <li>3. Reveal the rewritten hero, CTA, FAQ, and schema block.</li>
              <li>4. Flip to the patched homepage preview for the visual wow moment.</li>
            </ol>
          </div>
        </div>
      </section>

      <SectionCard title="Run the operator" eyebrow="Input">
        <form className="grid gap-4 lg:grid-cols-[1.1fr_1.3fr_auto]" onSubmit={handleSubmit}>
          <label className="space-y-2">
            <span className="text-sm font-medium text-[var(--ink-soft)]">Website URL</span>
            <input
              value={url}
              onChange={(event) => setUrl(event.target.value)}
              placeholder="https://example.com"
              className="h-14 w-full rounded-2xl border border-[var(--line)] bg-white/80 px-4 outline-none transition focus:border-[var(--accent)] focus:ring-4 focus:ring-[rgba(31,185,129,0.15)]"
            />
          </label>
          <label className="space-y-2">
            <span className="text-sm font-medium text-[var(--ink-soft)]">Target buyer persona</span>
            <textarea
              value={persona}
              onChange={(event) => setPersona(event.target.value)}
              rows={3}
              className="w-full rounded-2xl border border-[var(--line)] bg-white/80 px-4 py-3 outline-none transition focus:border-[var(--accent)] focus:ring-4 focus:ring-[rgba(31,185,129,0.15)]"
            />
          </label>
          <div className="flex flex-col justify-end gap-3">
            <button
              type="submit"
              disabled={isLoading}
              className="h-14 rounded-2xl bg-[#142311] px-5 text-sm font-semibold tracking-[0.14em] text-white uppercase transition hover:bg-[#0f190d] disabled:cursor-wait disabled:opacity-70"
            >
              {isLoading ? "Running…" : "Analyze live site"}
            </button>
            <button
              type="button"
              onClick={() => void runAnalysis(true)}
              disabled={isLoading}
              className="h-12 rounded-2xl border border-[var(--line-strong)] bg-white/75 px-5 text-sm font-semibold tracking-[0.12em] text-[var(--ink-soft)] uppercase transition hover:border-[var(--accent)] hover:text-[var(--accent-deep)] disabled:cursor-wait disabled:opacity-70"
            >
              Load demo fixture
            </button>
          </div>
        </form>
        {error ? (
          <div className="mt-4 rounded-2xl border border-[rgba(255,123,84,0.28)] bg-[rgba(255,123,84,0.08)] px-4 py-3 text-sm text-[#6b3a2c]">
            {error}
          </div>
        ) : null}
      </SectionCard>

      {result ? (
        <>
          <section className="grid gap-6 lg:grid-cols-[1.05fr_0.95fr]">
            <SectionCard title="Answerability snapshot" eyebrow="Scores">
              <div className="grid gap-5">
                <div className="grid gap-4 rounded-[24px] border border-[var(--line)] bg-white/75 p-5 sm:grid-cols-2">
                  <div>
                    <p className="text-[11px] font-semibold tracking-[0.22em] text-[var(--ink-soft)] uppercase">
                      Current
                    </p>
                    <p className={`mt-2 text-5xl font-semibold tracking-[-0.06em] ${scoreTone(result.overallScore)}`}>
                      {result.overallScore}
                    </p>
                  </div>
                  <div>
                    <p className="text-[11px] font-semibold tracking-[0.22em] text-[var(--ink-soft)] uppercase">
                      Predicted after patch
                    </p>
                    <p
                      className={`mt-2 text-5xl font-semibold tracking-[-0.06em] ${scoreTone(
                        result.rescoredOverall,
                      )}`}
                    >
                      {result.rescoredOverall}
                    </p>
                  </div>
                </div>
                <div className="grid gap-4 sm:grid-cols-2">
                  <ScoreBar label="Clarity" score={result.rubric.clarity} />
                  <ScoreBar label="Audience fit" score={result.rubric.audienceFit} />
                  <ScoreBar label="Proof" score={result.rubric.proof} />
                  <ScoreBar label="CTA" score={result.rubric.cta} />
                  <ScoreBar label="AI answerability" score={result.rubric.aiAnswerability} />
                </div>
                <div className="rounded-[24px] border border-[var(--line)] bg-[#142311] p-5 text-[#eefef8]">
                  <p className="text-[11px] font-semibold tracking-[0.22em] text-[#96dbbf] uppercase">
                    Site summary
                  </p>
                  <p className="mt-3 text-sm leading-7 text-[#dcfaf0]">{result.siteSummary}</p>
                  <p className="mt-4 text-xs text-[#b9e7d4]">
                    {result.mode === "demo" ? "Fixture data" : "Generated live"} ·{" "}
                    {formatTimestamp(result.generatedAt)}
                  </p>
                </div>
              </div>
            </SectionCard>

            <SectionCard title="Buyer questions" eyebrow="Audit">
              <div className="space-y-4">
                {result.buyerQuestions.map((item) => (
                  <article key={item.question} className="rounded-[24px] border border-[var(--line)] bg-white/75 p-4">
                    <div className="flex flex-wrap items-center justify-between gap-3">
                      <h3 className="max-w-xl text-base font-semibold tracking-[-0.03em]">
                        {item.question}
                      </h3>
                      <div className="flex items-center gap-3 text-sm">
                        <span className="rounded-full bg-black/5 px-3 py-1">
                          Score {item.score}/5
                        </span>
                        <span className="rounded-full bg-black/5 px-3 py-1">
                          Confidence {item.confidence}
                        </span>
                      </div>
                    </div>
                    <p className="mt-3 text-sm leading-7 text-[var(--ink-soft)]">{item.answer}</p>
                    <div className="mt-4 flex flex-wrap gap-2">
                      {item.evidenceUrls.map((evidenceUrl) => (
                        <span
                          key={evidenceUrl}
                          className="rounded-full border border-[var(--line)] bg-[var(--accent-muted)] px-3 py-1 text-xs text-[var(--accent-deep)]"
                        >
                          {new URL(evidenceUrl).pathname === "/" ? "homepage" : new URL(evidenceUrl).pathname}
                        </span>
                      ))}
                    </div>
                    {item.missingInfo.length ? (
                      <div className="mt-4 rounded-2xl bg-black/4 p-3 text-sm text-[var(--ink-soft)]">
                        Missing: {item.missingInfo.join(" · ")}
                      </div>
                    ) : null}
                  </article>
                ))}
              </div>
            </SectionCard>
          </section>

          <section className="grid gap-6 xl:grid-cols-[1fr_0.92fr]">
            <SectionCard title="Generated patch" eyebrow="Copy">
              <div className="space-y-5">
                <article className="rounded-[24px] border border-[var(--line)] bg-white/75 p-5">
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <p className="text-[11px] font-semibold tracking-[0.22em] text-[var(--ink-soft)] uppercase">
                        Hero headline
                      </p>
                      <p className="mt-3 text-2xl font-semibold tracking-[-0.04em]">
                        {result.patch.heroHeadline}
                      </p>
                    </div>
                    <CopyButton value={result.patch.heroHeadline} />
                  </div>
                </article>
                <article className="rounded-[24px] border border-[var(--line)] bg-white/75 p-5">
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <p className="text-[11px] font-semibold tracking-[0.22em] text-[var(--ink-soft)] uppercase">
                        Hero subheadline
                      </p>
                      <p className="mt-3 text-base leading-7 text-[var(--ink-soft)]">
                        {result.patch.heroSubheadline}
                      </p>
                    </div>
                    <CopyButton value={result.patch.heroSubheadline} />
                  </div>
                </article>
                <article className="rounded-[24px] border border-[var(--line)] bg-white/75 p-5">
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <p className="text-[11px] font-semibold tracking-[0.22em] text-[var(--ink-soft)] uppercase">
                        Primary CTA
                      </p>
                      <p className="mt-3 inline-flex rounded-full bg-[#142311] px-4 py-2 text-sm font-semibold text-white">
                        {result.patch.primaryCta}
                      </p>
                    </div>
                    <CopyButton value={result.patch.primaryCta} />
                  </div>
                </article>
                <article className="rounded-[24px] border border-[var(--line)] bg-white/75 p-5">
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <p className="text-[11px] font-semibold tracking-[0.22em] text-[var(--ink-soft)] uppercase">
                        FAQ block
                      </p>
                      <div className="mt-4 space-y-3">
                        {result.patch.faqs.map((faq) => (
                          <div key={faq.question} className="rounded-2xl bg-black/4 p-4">
                            <p className="font-semibold tracking-[-0.02em]">{faq.question}</p>
                            <p className="mt-2 text-sm leading-7 text-[var(--ink-soft)]">{faq.answer}</p>
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
                </article>
                <article className="rounded-[24px] border border-[var(--line)] bg-[#142311] p-5 text-[#eefef8]">
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <p className="text-[11px] font-semibold tracking-[0.22em] text-[#96dbbf] uppercase">
                        JSON-LD
                      </p>
                      <pre className="mt-4 overflow-x-auto rounded-2xl bg-black/20 p-4 text-xs leading-6 text-[#dcfaf0]">
                        {result.patch.jsonLd}
                      </pre>
                    </div>
                    <CopyButton value={result.patch.jsonLd} label="Copy schema" />
                  </div>
                </article>
              </div>
            </SectionCard>

            <SectionCard title="Why this patch works" eyebrow="Rationale">
              <div className="space-y-4">
                <div className="rounded-[24px] border border-[var(--line)] bg-white/75 p-5">
                  <p className="text-[11px] font-semibold tracking-[0.22em] text-[var(--ink-soft)] uppercase">
                    Rationale
                  </p>
                  <ul className="mt-4 space-y-3 text-sm leading-7 text-[var(--ink-soft)]">
                    {result.patch.rationale.map((point) => (
                      <li key={point} className="rounded-2xl bg-black/4 px-4 py-3">
                        {point}
                      </li>
                    ))}
                  </ul>
                </div>
                <div className="rounded-[24px] border border-[var(--line)] bg-white/75 p-5">
                  <p className="text-[11px] font-semibold tracking-[0.22em] text-[var(--ink-soft)] uppercase">
                    Visual patch notes
                  </p>
                  <ul className="mt-4 space-y-3 text-sm leading-7 text-[var(--ink-soft)]">
                    {result.patch.diffNotes.map((point) => (
                      <li key={point} className="rounded-2xl border border-[var(--line)] px-4 py-3">
                        {point}
                      </li>
                    ))}
                  </ul>
                </div>
                <div className="rounded-[24px] border border-[rgba(255,123,84,0.24)] bg-[rgba(255,123,84,0.08)] p-5">
                  <p className="text-[11px] font-semibold tracking-[0.22em] text-[#8a4a38] uppercase">
                    Missing information
                  </p>
                  <div className="mt-4 flex flex-wrap gap-2">
                    {result.missingInformation.map((item) => (
                      <span
                        key={item}
                        className="rounded-full border border-[rgba(255,123,84,0.24)] px-3 py-2 text-sm text-[#6e3b2d]"
                      >
                        {item}
                      </span>
                    ))}
                  </div>
                </div>
              </div>
            </SectionCard>
          </section>

          <section className="grid gap-6 lg:grid-cols-[0.82fr_1.18fr]">
            <SectionCard title="Evidence by page" eyebrow="Crawl">
              <div className="space-y-4">
                {result.crawl.pages.map((page) => (
                  <article key={page.url} className="rounded-[24px] border border-[var(--line)] bg-white/75 p-4">
                    <div className="flex items-start justify-between gap-4">
                      <div>
                        <p className="text-[11px] font-semibold tracking-[0.22em] text-[var(--ink-soft)] uppercase">
                          {page.role}
                        </p>
                        <h3 className="mt-2 text-base font-semibold tracking-[-0.02em]">
                          {page.title || page.url}
                        </h3>
                      </div>
                      <span className="rounded-full bg-black/5 px-3 py-1 text-xs text-[var(--ink-soft)]">
                        {new URL(page.url).pathname}
                      </span>
                    </div>
                    {page.h1 ? (
                      <p className="mt-3 text-sm font-medium text-[var(--foreground)]">H1: {page.h1}</p>
                    ) : null}
                    <p className="mt-3 text-sm leading-7 text-[var(--ink-soft)]">{page.excerpt}</p>
                  </article>
                ))}
              </div>
            </SectionCard>

            <SectionCard title="Visual patch preview" eyebrow="Live homepage overlay">
              {result.preview.supportsPatchedPreview ? (
                <div className="grid gap-4 xl:grid-cols-2">
                  <div className="overflow-hidden rounded-[24px] border border-[var(--line)] bg-white/80">
                    <div className="border-b border-[var(--line)] px-4 py-3 text-sm font-medium text-[var(--ink-soft)]">
                      Original snapshot
                    </div>
                    <iframe
                      title="Original homepage preview"
                      src={buildPreviewUrl(result, "original")}
                      className="h-[620px] w-full bg-white"
                      sandbox=""
                    />
                  </div>
                  <div className="overflow-hidden rounded-[24px] border border-[var(--line)] bg-white/80">
                    <div className="border-b border-[var(--line)] px-4 py-3 text-sm font-medium text-[var(--ink-soft)]">
                      Patched homepage preview
                    </div>
                    <iframe
                      title="Patched homepage preview"
                      src={buildPreviewUrl(result, "patched")}
                      className="h-[620px] w-full bg-white"
                      sandbox=""
                    />
                  </div>
                </div>
              ) : (
                <div className="rounded-[24px] border border-[var(--line)] bg-white/75 p-5 text-sm leading-7 text-[var(--ink-soft)]">
                  The demo fixture does not ship with a live preview overlay, but the full live mode
                  will proxy the homepage and patch the hero area in place.
                </div>
              )}
            </SectionCard>
          </section>
        </>
      ) : null}
    </main>
  );
}
