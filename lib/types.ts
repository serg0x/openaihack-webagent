export type PageRole =
  | "homepage"
  | "about"
  | "product"
  | "pricing"
  | "faq"
  | "trust"
  | "docs"
  | "other";

export type CrawlPage = {
  url: string;
  role: PageRole;
  title: string;
  metaDescription: string;
  canonicalUrl: string;
  h1: string;
  headings: string[];
  excerpt: string;
  mainText: string;
};

export type PreviewTargets = {
  headlineText: string;
  subheadlineText: string;
  ctaText: string;
};

export type CrawlResult = {
  normalizedUrl: string;
  homepageUrl: string;
  domain: string;
  pages: CrawlPage[];
  previewTargets: PreviewTargets;
};

export type Rubric = {
  clarity: number;
  audienceFit: number;
  proof: number;
  cta: number;
  aiAnswerability: number;
};

export type BuyerQuestionAssessment = {
  question: string;
  answer: string;
  confidence: number;
  score: number;
  evidenceUrls: string[];
  missingInfo: string[];
};

export type FAQItem = {
  question: string;
  answer: string;
};

export type PatchSuggestion = {
  heroHeadline: string;
  heroSubheadline: string;
  primaryCta: string;
  faqs: FAQItem[];
  jsonLd: string;
  rationale: string[];
  diffNotes: string[];
};

export type AnalysisResult = {
  mode: "live" | "demo";
  input: {
    url: string;
    persona: string;
  };
  crawl: CrawlResult;
  siteSummary: string;
  overallScore: number;
  rescoredOverall: number;
  rubric: Rubric;
  buyerQuestions: BuyerQuestionAssessment[];
  missingInformation: string[];
  patch: PatchSuggestion;
  generatedAt: string;
  preview: {
    homepageUrl: string;
    supportsPatchedPreview: boolean;
  };
};

export type AnalyzeRequest = {
  url: string;
  persona: string;
  useFixture?: boolean;
};
