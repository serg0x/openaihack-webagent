# Can-AI-Explain-You?

AI Website Operator for startup messaging.

**Can-AI-Explain-You?** is a webentity.ai MVP that checks whether a startup website is legible to both buyers and AI assistants. Paste in a URL and target persona, and it crawls the site, audits five core buyer questions, scores clarity, trust, CTA strength, and AI answerability, and generates a ready-to-use homepage patch with a live before-and-after preview on the real site shell.

## What It Does

More and more discovery happens through AI before it happens through a sales call or even a direct website visit. A model summarizes your company, compares you with alternatives, answers buyer questions, and shapes first impressions.

Most startup websites are still written for design reviews, traditional search, and human readers alone.

**Can-AI-Explain-You?** turns that problem into a concrete workflow:

1. Enter a live company URL and a target buyer persona.
2. Crawl the homepage plus a handful of high-signal internal pages.
3. Audit whether the site clearly answers five core buyer questions.
4. Score the site across clarity, audience fit, proof, CTA strength, and AI answerability.
5. Generate a concrete homepage patch instead of abstract feedback.
6. Preview the patch on the real site shell in a side-by-side before/after view so you can see what the improved homepage could look like immediately.

## Core Buyer Questions

The app evaluates whether the site clearly answers:

- What does this company do?
- Who is it for?
- Why should I trust it?
- What should I do next?
- How confidently could an AI assistant explain it from the site alone?

## Current MVP Outputs

- Buyer-question audit with evidence-backed answers
- Crawl evidence from real source pages
- Site score and projected improved score
- Rewritten hero headline
- Rewritten hero subheadline
- Stronger primary CTA
- Three FAQs
- JSON-LD
- Rationale and patch notes
- Live before/after preview on the original site shell
- A tangible "this is what your updated site could look like" demo moment

## Feature Overview

### Live site analysis

The app accepts a public website URL and a target buyer persona, then runs a shallow crawl across the homepage and a few high-value supporting pages such as product, pricing, FAQ, trust, or docs pages.

### Explainability audit

It evaluates the site against five core buyer questions and surfaces where the story is clear, vague, weak, or unsupported.

### Structured scoring

The audit scores the site across:

- Clarity
- Audience fit
- Proof
- CTA
- AI answerability

### Homepage patch generation

Instead of stopping at critique, the app generates a concrete patch payload:

- Hero headline
- Hero subheadline
- Primary CTA
- FAQs
- JSON-LD
- Rationale notes
- Visual diff notes

### Live patch preview

This is the biggest product moment in the MVP.

The app proxies the original page and applies the generated hero patch directly on the live site shell, so you can compare the original and patched states side by side instead of looking at a detached mockup.

That means a founder, marketer, or demo audience can immediately see how the updated homepage could look if the new messaging were shipped.

### Demo fixture mode

When a live site is blocked, slow, or unreliable, the app can run from a built-in fixture so the whole workflow is still demoable.

## Stack

- Next.js 16
- React 19
- TypeScript
- Tailwind CSS 4
- OpenAI API
- Cheerio for crawl and HTML extraction

## Local Development

### 1. Install dependencies

```bash
npm install
```

### 2. Configure environment variables

Copy `.env.example` to `.env` or `.env.local` and set your API key:

```bash
OPENAI_API_KEY=your_api_key_here
OPENAI_MODEL=gpt-5.4-mini
```

`OPENAI_API_KEY` is required for live analysis mode.

### 3. Start the app

```bash
npm run dev
```

Then open [http://localhost:3000](http://localhost:3000).

## Scripts

```bash
npm run dev
npm run build
npm run start
npm run lint
```

## How To Use

1. Paste a public company URL.
2. Enter a target buyer persona.
3. Run a live analysis, or use the demo fixture.
4. Review the score, missing information, buyer-question audit, and crawled pages.
5. Inspect the live before/after preview to see how the updated homepage could look on the real page shell.
6. Copy the patch payload into a CMS draft, design review, or live site update.

## Notes On Live Crawling

This app works best on public marketing pages.

Some websites may fail in live mode because they:

- block automated crawling
- require authentication
- rely heavily on client-side rendering
- rate-limit or firewall server-side requests

The demo fixture exists to make the workflow reliable even when a target site is not.

## Current Scope

This is intentionally a narrow MVP:

- single-session
- homepage-first
- one recommendation path at a time
- shallow crawl depth
- preview focused on hero-level changes

The goal is not to be a full CMS or optimization suite. The goal is to answer one question clearly:

**Can AI explain your company?**

And then make the answer tangible by showing the updated homepage live, not just describing it.

## Deploying

This app deploys cleanly to Vercel as a standard Next.js app.

At minimum, set:

- `OPENAI_API_KEY`
- `OPENAI_MODEL`

in your Vercel project environment variables.

## Why This Exists

A good website should not only convert. It should also be explainable.

Your website is no longer read only by humans.

And feedback is more persuasive when you can see the improved page, not just read a list of suggestions.
