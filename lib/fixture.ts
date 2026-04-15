import type { AnalysisResult, CrawlResult } from "@/lib/types";

function buildDemoCrawl(url: string): CrawlResult {
  return {
    normalizedUrl: url,
    homepageUrl: url,
    domain: "auroraflows.ai",
    previewTargets: {
      headlineText: "AI Ops for warehouse teams",
      subheadlineText:
        "Reduce the manual follow-up that causes missed shipments and delayed restocks.",
      ctaText: "Book a demo",
    },
    pages: [
      {
        url,
        role: "homepage",
        title: "AuroraFlows | AI Ops for warehouse teams",
        metaDescription:
          "AI copilots that help warehouse operators coordinate exceptions, stockouts, and customer updates.",
        canonicalUrl: url,
        h1: "AI Ops for warehouse teams",
        headings: ["AI Ops for warehouse teams", "Trusted by fast-moving operators"],
        excerpt:
          "AuroraFlows helps warehouse teams coordinate exceptions, stockouts, and customer updates faster.",
        mainText:
          "AuroraFlows helps warehouse operations teams manage delayed shipments, low inventory, and customer coordination. Teams can automate repetitive follow-up, route issues, and monitor fulfillment exceptions from one place.",
      },
      {
        url: `${url}product`,
        role: "product",
        title: "Product | AuroraFlows",
        metaDescription: "Automate warehouse exception handling and shipment follow-up.",
        canonicalUrl: `${url}product`,
        h1: "Turn warehouse noise into action",
        headings: ["Turn warehouse noise into action", "Automate follow-up"],
        excerpt: "Detect issues, assign owners, and push the right customer updates automatically.",
        mainText:
          "The platform detects shipment exceptions, routes them to operations, and drafts the next best customer communication. Teams get one queue for urgent fixes, SLA tracking, and approval-ready updates.",
      },
      {
        url: `${url}customers`,
        role: "trust",
        title: "Customers | AuroraFlows",
        metaDescription: "How high-volume operations teams stay ahead of exceptions.",
        canonicalUrl: `${url}customers`,
        h1: "Teams use AuroraFlows to reduce firefighting",
        headings: ["Teams use AuroraFlows to reduce firefighting"],
        excerpt: "Operations teams reduce manual follow-up and recover revenue faster.",
        mainText:
          "Operations leaders use AuroraFlows to cut repetitive status checks and keep customer support aligned with real-time warehouse changes. Case studies focus on faster issue resolution and fewer silent failures.",
      },
    ],
  };
}

export function buildDemoAnalysis(url: string, persona: string): AnalysisResult {
  const demoUrl = "https://auroraflows.ai/";

  return {
    mode: "demo",
    input: { url, persona },
    crawl: buildDemoCrawl(demoUrl),
    siteSummary:
      "The site explains the product category and operational pain well, but it does not fully connect those capabilities to buyer trust and concrete next steps.",
    overallScore: 63,
    rescoredOverall: 84,
    rubric: {
      clarity: 78,
      audienceFit: 81,
      proof: 46,
      cta: 57,
      aiAnswerability: 54,
    },
    buyerQuestions: [
      {
        question: "What does this company do?",
        answer:
          "AuroraFlows helps warehouse operations teams manage shipment exceptions and customer follow-up with AI-driven workflows.",
        confidence: 90,
        score: 4,
        evidenceUrls: [demoUrl, `${demoUrl}product`],
        missingInfo: [],
      },
      {
        question: "Who is it for?",
        answer:
          "It appears aimed at warehouse and operations leaders dealing with high-volume order coordination.",
        confidence: 82,
        score: 4,
        evidenceUrls: [demoUrl, `${demoUrl}customers`],
        missingInfo: ["The ideal company size and buyer title are implied, not explicit."],
      },
      {
        question: "Why should I trust it?",
        answer:
          "The site hints at customer outcomes and case studies, but it lacks concrete proof like logos, metrics, or implementation specifics.",
        confidence: 66,
        score: 3,
        evidenceUrls: [`${demoUrl}customers`],
        missingInfo: ["Named customer proof", "Security or integration detail", "Outcome metrics"],
      },
      {
        question: "What should I do next?",
        answer:
          "The primary next step is to book a demo, but the benefit of taking that step could be more explicit.",
        confidence: 75,
        score: 3,
        evidenceUrls: [demoUrl],
        missingInfo: ["Expected time-to-value", "What happens after booking"],
      },
      {
        question: "How confidently could an AI assistant explain the company from this site alone?",
        answer:
          "An AI assistant could explain the product category, but it would be less confident when asked about trust, differentiation, and proof.",
        confidence: 71,
        score: 3,
        evidenceUrls: [demoUrl, `${demoUrl}product`, `${demoUrl}customers`],
        missingInfo: ["Specific integrations", "Buyer proof", "Implementation detail"],
      },
    ],
    missingInformation: [
      "Clear buyer title and company profile",
      "Concrete implementation proof or metrics",
      "What happens after the CTA",
      "Why AuroraFlows is different from workflow automation tools",
    ],
    patch: {
      heroHeadline: "Stop warehouse exceptions before they turn into customer chaos",
      heroSubheadline:
        "AuroraFlows helps operations teams detect shipment issues early, route the right owner, and send faster customer updates without more manual follow-up.",
      primaryCta: "See the ops workflow",
      faqs: [
        {
          question: "What does AuroraFlows automate?",
          answer:
            "AuroraFlows automates issue routing, shipment exception follow-up, and customer-ready status updates for warehouse operations teams.",
        },
        {
          question: "Who gets value first?",
          answer:
            "Operations leads, warehouse managers, and support teams benefit first because AuroraFlows reduces repetitive coordination work and missed handoffs.",
        },
        {
          question: "Why trust the system with live operations?",
          answer:
            "AuroraFlows keeps humans in the loop for approvals while giving teams a shared queue, audit trail, and clearer ownership on every exception.",
        },
      ],
      jsonLd: `{
  "@context": "https://schema.org",
  "@type": "SoftwareApplication",
  "name": "AuroraFlows",
  "applicationCategory": "BusinessApplication",
  "description": "AuroraFlows helps warehouse operations teams manage shipment exceptions, assign owners, and coordinate customer updates faster.",
  "audience": {
    "@type": "Audience",
    "audienceType": "Warehouse operations teams"
  },
  "url": "https://auroraflows.ai/"
}`,
      rationale: [
        "The new headline speaks to the operational pain before naming the product category.",
        "The subheadline makes the workflow concrete so an AI assistant can repeat it accurately.",
        "The CTA now previews the value of clicking instead of using a generic sales phrase.",
      ],
      diffNotes: [
        "Replace the abstract hero with a pain-to-outcome statement.",
        "Move workflow clarity into the first paragraph.",
        "Retitle the CTA so it promises a concrete walkthrough.",
      ],
    },
    generatedAt: new Date().toISOString(),
    preview: {
      homepageUrl: demoUrl,
      supportsPatchedPreview: false,
    },
  };
}
