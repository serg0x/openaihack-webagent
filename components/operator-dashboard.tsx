"use client";

import { FormEvent, useState } from "react";
import { CopyButton } from "@/components/copy-button";
import type { AnalysisResult } from "@/lib/types";

const DEFAULT_PERSONA =
  "A B2B startup buyer who wants to understand the product fast, see proof, and know the best next step.";

const EMPTY_LOOP = [
  "Crawl the homepage plus the most relevant internal pages.",
  "Score answerability around clarity, trust, audience fit, CTA, and evidence.",
  "Generate a homepage patch with sharper copy and schema.",
  "Preview the patch on a proxied version of the live homepage.",
];

const DELIVERABLES = [
  "5 buyer questions with evidence",
  "Hero, CTA, FAQ, and schema patch",
  "Side-by-side original and patched homepage preview",
];

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

function joinClasses(...values: Array<string | false | null | undefined>) {
  return values.filter(Boolean).join(" ");
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

type SectionShellProps = {
  title: string;
  eyebrow?: string;
  summary?: string;
  className?: string;
  children: React.ReactNode;
};

function SectionShell({
  title,
  eyebrow,
  summary,
  className,
  children,
}: SectionShellProps) {
  return (
    <section
      className={joinClasses(
        "rounded-[30px] border border-[var(--line)] bg-[var(--surface)] p-6 shadow-[var(--shadow)] backdrop-blur lg:p-7",
        className,
      )}
    >
      {eyebrow ? (
        <p className="text-[11px] font-semibold tracking-[0.24em] text-[var(--ink-soft)] uppercase">
          {eyebrow}
        </p>
      ) : null}
      <div className="mt-2 flex flex-col gap-3 border-b border-[var(--line)] pb-4 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <h2 className="text-2xl font-semibold tracking-[-0.04em]">{title}</h2>
          {summary ? (
            <p className="mt-2 max-w-2xl text-sm leading-7 text-[var(--ink-soft)]">{summary}</p>
          ) : null}
        </div>
      </div>
      <div className="mt-5">{children}</div>
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

function OperatorPoster({ result }: { result: AnalysisResult | null }) {
  const currentScore = result?.overallScore ?? 63;
  const patchedScore = result?.rescoredOverall ?? 84;
  const beforeHeadline =
    result?.crawl.previewTargets.headlineText || "Most startup websites still undersell the product.";
  const afterHeadline =
    result?.patch.heroHeadline || "Make your startup legible to humans and AI in one pass.";

  return (
    <div className="relative overflow-hidden rounded-[32px] border border-white/12 bg-[#142311] p-5 text-[#eefef8] shadow-[0_28px_120px_rgba(20,35,17,0.28)] lg:p-6">
      <div className="absolute -top-16 right-0 h-52 w-52 rounded-full bg-[rgba(31,185,129,0.22)] blur-3xl animate-orbit-slow" />
      <div className="absolute bottom-2 left-4 h-36 w-36 rounded-full bg-[rgba(72,154,255,0.16)] blur-3xl animate-float-slow" />
      <div className="absolute inset-0 bg-[linear-gradient(180deg,rgba(255,255,255,0.06),transparent_36%,rgba(0,0,0,0.08))]" />

      <div className="relative space-y-6">
        <div className="flex items-center justify-between text-[11px] font-semibold tracking-[0.22em] uppercase text-[#96dbbf]">
          <span className="inline-flex items-center gap-2">
            <span className="h-2 w-2 rounded-full bg-[#3cffa7] animate-pulse-soft" />
            Live operator loop
          </span>
          <span>Before → patch → preview</span>
        </div>

        <div className="grid gap-5 rounded-[28px] border border-white/10 bg-white/6 p-5 backdrop-blur">
          <div className="flex items-end justify-between gap-4">
            <div>
              <p className="text-[11px] font-semibold tracking-[0.22em] text-[#96dbbf] uppercase">
                Answerability delta
              </p>
              <div className="mt-3 flex items-end gap-3">
                <span className="text-6xl font-semibold tracking-[-0.08em] text-[#f6fff9]">
                  {currentScore}
                </span>
                <span className="mb-2 text-xl text-[#96dbbf]">→</span>
                <span className="text-6xl font-semibold tracking-[-0.08em] text-[#62f0bd]">
                  {patchedScore}
                </span>
              </div>
            </div>
            <div className="rounded-full border border-white/12 bg-white/8 px-3 py-2 text-xs text-[#d7f6e9]">
              {patchedScore - currentScore >= 0 ? "+" : ""}
              {patchedScore - currentScore} projected lift
            </div>
          </div>

          <div className="space-y-3 text-sm text-[#dff9ef]">
            {EMPTY_LOOP.map((item, index) => (
              <div key={item} className="flex gap-3 border-t border-white/8 pt-3 first:border-t-0 first:pt-0">
                <span className="inline-flex h-6 w-6 flex-none items-center justify-center rounded-full bg-white/10 text-xs font-semibold">
                  {index + 1}
                </span>
                <p className="leading-6">{item}</p>
              </div>
            ))}
          </div>
        </div>

        <div className="grid gap-3 rounded-[28px] border border-white/10 bg-white/6 p-5 backdrop-blur">
          <p className="text-[11px] font-semibold tracking-[0.22em] text-[#96dbbf] uppercase">
            Hero patch preview
          </p>
          <div className="rounded-[24px] border border-white/10 bg-black/16 p-4">
            <p className="text-xs uppercase tracking-[0.2em] text-[#86c9af]">Before</p>
            <p className="mt-2 text-sm leading-6 text-[#d4f2e5]">{beforeHeadline}</p>
          </div>
          <div className="rounded-[24px] border border-[rgba(98,240,189,0.28)] bg-[rgba(98,240,189,0.08)] p-4">
            <p className="text-xs uppercase tracking-[0.2em] text-[#95f7cb]">After</p>
            <p className="mt-2 text-lg font-semibold tracking-[-0.03em] text-[#f7fffb]">
              {afterHeadline}
            </p>
          </div>
        </div>
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
    <main className="mx-auto flex min-h-screen w-full max-w-[1480px] flex-col gap-7 px-5 py-6 text-[var(--foreground)] sm:px-8 lg:px-10 lg:py-8">
      <section className="relative overflow-hidden rounded-[38px] border border-[var(--line)] bg-[linear-gradient(140deg,rgba(255,255,255,0.92),rgba(231,250,242,0.88)_45%,rgba(255,243,225,0.94))] px-6 py-7 shadow-[var(--shadow)] lg:min-h-[calc(100svh-4rem)] lg:px-8 lg:py-8">
        <div className="absolute inset-y-0 right-0 w-[44%] bg-[radial-gradient(circle_at_top,rgba(31,185,129,0.15),transparent_48%)]" />
        <div className="absolute -left-20 top-10 h-56 w-56 rounded-full bg-[rgba(31,185,129,0.12)] blur-3xl animate-float-slow" />
        <div className="absolute bottom-6 right-20 h-48 w-48 rounded-full bg-[rgba(72,154,255,0.08)] blur-3xl animate-orbit-slow" />

        <div className="relative grid gap-8 lg:grid-cols-[minmax(0,1.08fr)_minmax(360px,0.92fr)] lg:items-stretch">
          <div className="flex flex-col justify-between">
            <div className="space-y-6 animate-rise-in">
              <div className="inline-flex items-center gap-2 rounded-full border border-[var(--line)] bg-white/80 px-3 py-1 text-[11px] font-semibold tracking-[0.24em] uppercase text-[var(--ink-soft)]">
                AI Website Operator
                <span className="h-2 w-2 rounded-full bg-[var(--accent)] animate-pulse-soft" />
              </div>

              <div className="max-w-4xl space-y-5">
                <h1 className="max-w-4xl text-[clamp(3rem,7vw,6rem)] font-semibold leading-[0.92] tracking-[-0.08em] text-[#10200f]">
                  Make your startup easy to explain before the room loses interest.
                </h1>
                <p className="max-w-2xl text-base leading-8 text-[var(--ink-soft)] sm:text-lg">
                  Drop in a live startup URL and a buyer persona. The app audits whether an AI
                  assistant can explain the company clearly, writes a sharper homepage patch, and
                  previews those edits directly on a proxied version of the real site.
                </p>
              </div>

              <div className="flex flex-wrap gap-3 text-sm text-[var(--ink-soft)]">
                {DELIVERABLES.map((item) => (
                  <span
                    key={item}
                    className="rounded-full border border-[var(--line)] bg-white/75 px-3 py-2"
                  >
                    {item}
                  </span>
                ))}
              </div>
            </div>

            <form
              className="mt-7 grid gap-4 rounded-[30px] border border-[var(--line)] bg-[var(--surface-strong)] p-5 shadow-[0_20px_60px_rgba(20,35,17,0.08)] backdrop-blur lg:mt-8 animate-rise-in"
              onSubmit={handleSubmit}
            >
              <div className="grid gap-4 xl:grid-cols-[0.95fr_1.15fr]">
                <label className="space-y-2">
                  <span className="text-sm font-medium text-[var(--ink-soft)]">Website URL</span>
                  <input
                    value={url}
                    onChange={(event) => setUrl(event.target.value)}
                    placeholder="https://example.com"
                    className="h-14 w-full rounded-2xl border border-[var(--line)] bg-white/88 px-4 outline-none transition focus:border-[var(--accent)] focus:ring-4 focus:ring-[rgba(31,185,129,0.15)]"
                  />
                </label>

                <label className="space-y-2">
                  <span className="text-sm font-medium text-[var(--ink-soft)]">Target buyer persona</span>
                  <textarea
                    value={persona}
                    onChange={(event) => setPersona(event.target.value)}
                    rows={3}
                    className="w-full rounded-2xl border border-[var(--line)] bg-white/88 px-4 py-3 outline-none transition focus:border-[var(--accent)] focus:ring-4 focus:ring-[rgba(31,185,129,0.15)]"
                  />
                </label>
              </div>

              <div className="flex flex-col gap-3 border-t border-[var(--line)] pt-4 lg:flex-row lg:items-center lg:justify-between">
                <div className="text-sm leading-7 text-[var(--ink-soft)]">
                  Live mode uses the OpenAI API from the server. Demo mode keeps the pitch reliable
                  if a real site is slow or blocks crawling.
                </div>
                <div className="flex flex-wrap gap-3">
                  <button
                    type="submit"
                    disabled={isLoading}
                    className="h-13 rounded-full bg-[#142311] px-5 py-3 text-sm font-semibold tracking-[0.14em] text-white uppercase transition hover:bg-[#0f190d] disabled:cursor-wait disabled:opacity-70"
                  >
                    {isLoading ? "Running…" : "Analyze live site"}
                  </button>
                  <button
                    type="button"
                    onClick={() => void runAnalysis(true)}
                    disabled={isLoading}
                    className="h-13 rounded-full border border-[var(--line-strong)] bg-white/88 px-5 py-3 text-sm font-semibold tracking-[0.12em] text-[var(--ink-soft)] uppercase transition hover:border-[var(--accent)] hover:text-[var(--accent-deep)] disabled:cursor-wait disabled:opacity-70"
                  >
                    Load demo fixture
                  </button>
                </div>
              </div>
            </form>

            {error ? (
              <div className="mt-4 rounded-2xl border border-[rgba(255,123,84,0.28)] bg-[rgba(255,123,84,0.08)] px-4 py-3 text-sm text-[#6b3a2c] animate-rise-in">
                {error}
              </div>
            ) : null}
          </div>

          <div className="lg:pl-2">
            <OperatorPoster result={result} />
          </div>
        </div>
      </section>

      {!result ? (
        <section className="grid gap-6 xl:grid-cols-[1.08fr_0.92fr]">
          <SectionShell
            title="What happens in the room"
            eyebrow="Flow"
            summary="Keep the demo legible and fast: one URL in, one before-and-after story out."
          >
            <div className="grid gap-4 lg:grid-cols-3">
              {[
                {
                  title: "Audit",
                  body: "Answer the five buyer questions with evidence pulled directly from the site so the critique feels grounded, not generic.",
                },
                {
                  title: "Patch",
                  body: "Generate the homepage rewrite people actually remember: sharper hero, CTA, FAQ block, and machine-readable schema.",
                },
                {
                  title: "Preview",
                  body: "Flip from the original homepage to the patched version for the visual payoff without rebuilding the target site locally.",
                },
              ].map((item, index) => (
                <article
                  key={item.title}
                  className="rounded-[24px] border border-[var(--line)] bg-white/76 p-5 animate-rise-in"
                  style={{ animationDelay: `${index * 120}ms` }}
                >
                  <p className="text-[11px] font-semibold tracking-[0.22em] text-[var(--ink-soft)] uppercase">
                    0{index + 1}
                  </p>
                  <h3 className="mt-3 text-xl font-semibold tracking-[-0.03em]">{item.title}</h3>
                  <p className="mt-3 text-sm leading-7 text-[var(--ink-soft)]">{item.body}</p>
                </article>
              ))}
            </div>
          </SectionShell>

          <SectionShell
            title="What gets scored"
            eyebrow="Rubric"
            summary="The app is opinionated about what a good startup website should answer immediately."
          >
            <div className="grid gap-4 text-sm text-[var(--ink-soft)]">
              {[
                "What does this company do?",
                "Who is it for?",
                "Why should I trust it?",
                "What should I do next?",
                "How confidently could an AI assistant explain it from the site alone?",
              ].map((question) => (
                <div
                  key={question}
                  className="flex items-start gap-3 border-b border-[var(--line)] pb-4 last:border-b-0 last:pb-0"
                >
                  <span className="mt-1 h-2.5 w-2.5 flex-none rounded-full bg-[var(--accent)]" />
                  <p className="leading-7">{question}</p>
                </div>
              ))}
            </div>
          </SectionShell>
        </section>
      ) : null}

      {result ? (
        <>
          <section className="grid gap-6 xl:grid-cols-[0.9fr_1.1fr]">
            <SectionShell
              title="Operator verdict"
              eyebrow="Overview"
              summary="A tight read on whether the current site is understandable, trustworthy, and easy for AI assistants to restate."
              className="animate-rise-in"
            >
              <div className="grid gap-6">
                <div className="grid gap-4 rounded-[26px] border border-[var(--line)] bg-white/76 p-5 sm:grid-cols-2">
                  <div>
                    <p className="text-[11px] font-semibold tracking-[0.22em] text-[var(--ink-soft)] uppercase">
                      Current score
                    </p>
                    <p className={`mt-3 text-6xl font-semibold tracking-[-0.08em] ${scoreTone(result.overallScore)}`}>
                      {result.overallScore}
                    </p>
                  </div>
                  <div>
                    <p className="text-[11px] font-semibold tracking-[0.22em] text-[var(--ink-soft)] uppercase">
                      Projected after patch
                    </p>
                    <p
                      className={`mt-3 text-6xl font-semibold tracking-[-0.08em] ${scoreTone(
                        result.rescoredOverall,
                      )}`}
                    >
                      {result.rescoredOverall}
                    </p>
                  </div>
                </div>

                <div className="space-y-4 rounded-[26px] border border-[var(--line)] bg-[#142311] p-5 text-[#eefef8]">
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <p className="text-[11px] font-semibold tracking-[0.22em] text-[#96dbbf] uppercase">
                      Summary
                    </p>
                    <span className="rounded-full border border-white/12 bg-white/6 px-3 py-1 text-xs text-[#cbeedf]">
                      {result.mode === "demo" ? "Fixture data" : "Generated live"} ·{" "}
                      {formatTimestamp(result.generatedAt)}
                    </span>
                  </div>
                  <p className="text-sm leading-7 text-[#dcfaf0]">{result.siteSummary}</p>
                </div>

                <div className="grid gap-4">
                  <ScoreBar label="Clarity" score={result.rubric.clarity} />
                  <ScoreBar label="Audience fit" score={result.rubric.audienceFit} />
                  <ScoreBar label="Proof" score={result.rubric.proof} />
                  <ScoreBar label="CTA" score={result.rubric.cta} />
                  <ScoreBar label="AI answerability" score={result.rubric.aiAnswerability} />
                </div>

                <div className="rounded-[26px] border border-[rgba(255,123,84,0.24)] bg-[rgba(255,123,84,0.08)] p-5">
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
            </SectionShell>

            <SectionShell
              title="Patch payload"
              eyebrow="Output"
              summary="This is the material you can paste into the homepage, CMS, or design file immediately after the demo."
              className="animate-rise-in"
            >
              <div className="grid gap-6">
                <div className="grid gap-5 rounded-[26px] border border-[var(--line)] bg-white/76 p-5">
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <p className="text-[11px] font-semibold tracking-[0.22em] text-[var(--ink-soft)] uppercase">
                        Hero headline
                      </p>
                      <p className="mt-3 text-3xl font-semibold tracking-[-0.05em]">
                        {result.patch.heroHeadline}
                      </p>
                    </div>
                    <CopyButton value={result.patch.heroHeadline} />
                  </div>

                  <div className="border-t border-[var(--line)] pt-5">
                    <div className="flex items-start justify-between gap-4">
                      <div>
                        <p className="text-[11px] font-semibold tracking-[0.22em] text-[var(--ink-soft)] uppercase">
                          Hero subheadline
                        </p>
                        <p className="mt-3 max-w-3xl text-base leading-7 text-[var(--ink-soft)]">
                          {result.patch.heroSubheadline}
                        </p>
                      </div>
                      <CopyButton value={result.patch.heroSubheadline} />
                    </div>
                  </div>

                  <div className="border-t border-[var(--line)] pt-5">
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
                  </div>
                </div>

                <div className="grid gap-5 rounded-[26px] border border-[var(--line)] bg-white/76 p-5">
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <p className="text-[11px] font-semibold tracking-[0.22em] text-[var(--ink-soft)] uppercase">
                        FAQ block
                      </p>
                      <div className="mt-4 space-y-4">
                        {result.patch.faqs.map((faq) => (
                          <div key={faq.question} className="border-t border-[var(--line)] pt-4 first:border-t-0 first:pt-0">
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
                </div>

                <div className="grid gap-5 rounded-[26px] border border-[var(--line)] bg-[#142311] p-5 text-[#eefef8]">
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
                </div>

                <div className="grid gap-6 lg:grid-cols-2">
                  <div className="rounded-[26px] border border-[var(--line)] bg-white/76 p-5">
                    <p className="text-[11px] font-semibold tracking-[0.22em] text-[var(--ink-soft)] uppercase">
                      Why this patch works
                    </p>
                    <ul className="mt-4 space-y-3 text-sm leading-7 text-[var(--ink-soft)]">
                      {result.patch.rationale.map((point) => (
                        <li key={point} className="border-t border-[var(--line)] pt-3 first:border-t-0 first:pt-0">
                          {point}
                        </li>
                      ))}
                    </ul>
                  </div>

                  <div className="rounded-[26px] border border-[var(--line)] bg-white/76 p-5">
                    <p className="text-[11px] font-semibold tracking-[0.22em] text-[var(--ink-soft)] uppercase">
                      Visual patch notes
                    </p>
                    <ul className="mt-4 space-y-3 text-sm leading-7 text-[var(--ink-soft)]">
                      {result.patch.diffNotes.map((point) => (
                        <li key={point} className="border-t border-[var(--line)] pt-3 first:border-t-0 first:pt-0">
                          {point}
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>
              </div>
            </SectionShell>
          </section>

          <section className="grid gap-6 xl:grid-cols-[1.04fr_0.96fr]">
            <SectionShell
              title="Buyer-question audit"
              eyebrow="Evidence"
              summary="This is the argument you can narrate live while the audience watches the score move."
              className="animate-rise-in"
            >
              <div className="grid gap-4">
                {result.buyerQuestions.map((item) => (
                  <article
                    key={item.question}
                    className="rounded-[24px] border border-[var(--line)] bg-white/76 p-5"
                  >
                    <div className="flex flex-wrap items-center justify-between gap-3">
                      <h3 className="max-w-2xl text-lg font-semibold tracking-[-0.03em]">
                        {item.question}
                      </h3>
                      <div className="flex items-center gap-3 text-sm">
                        <span className="rounded-full bg-black/5 px-3 py-1">Score {item.score}/5</span>
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
                          {formatEvidenceLabel(evidenceUrl)}
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
            </SectionShell>

            <SectionShell
              title="Crawled pages"
              eyebrow="Source material"
              summary="These are the pages the operator actually used, so the critique remains grounded in evidence instead of generic SEO advice."
              className="animate-rise-in"
            >
              <div className="space-y-4">
                {result.crawl.pages.map((page) => (
                  <article
                    key={page.url}
                    className="rounded-[24px] border border-[var(--line)] bg-white/76 p-5"
                  >
                    <div className="flex items-start justify-between gap-4">
                      <div>
                        <p className="text-[11px] font-semibold tracking-[0.22em] text-[var(--ink-soft)] uppercase">
                          {page.role}
                        </p>
                        <h3 className="mt-2 text-lg font-semibold tracking-[-0.03em]">
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
                    {page.metaDescription ? (
                      <p className="mt-2 text-sm leading-7 text-[var(--ink-soft)]">
                        {page.metaDescription}
                      </p>
                    ) : null}
                    <p className="mt-3 text-sm leading-7 text-[var(--ink-soft)]">{page.excerpt}</p>
                  </article>
                ))}
              </div>
            </SectionShell>
          </section>

          <SectionShell
            title="Patched homepage preview"
            eyebrow="Live payoff"
            summary="The original site stays recognizable, but the key message, supporting line, and CTA are swapped so the audience can feel the improvement immediately."
            className="animate-rise-in"
          >
            {result.preview.supportsPatchedPreview ? (
              <div className="grid gap-4 xl:grid-cols-2">
                <div className="overflow-hidden rounded-[26px] border border-[var(--line)] bg-white/88">
                  <div className="border-b border-[var(--line)] px-4 py-3 text-sm font-medium text-[var(--ink-soft)]">
                    Original snapshot
                  </div>
                  <iframe
                    title="Original homepage preview"
                    src={buildPreviewUrl(result, "original")}
                    className="h-[680px] w-full bg-white"
                    sandbox=""
                  />
                </div>

                <div className="overflow-hidden rounded-[26px] border border-[var(--line)] bg-white/88">
                  <div className="border-b border-[var(--line)] px-4 py-3 text-sm font-medium text-[var(--ink-soft)]">
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
            ) : (
              <div className="rounded-[24px] border border-[var(--line)] bg-white/75 p-5 text-sm leading-7 text-[var(--ink-soft)]">
                The demo fixture does not ship with a live preview overlay, but the live path still
                supports proxied homepage patching when you run a real analysis.
              </div>
            )}
          </SectionShell>
        </>
      ) : null}
    </main>
  );
}
