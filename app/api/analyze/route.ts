import { NextResponse } from "next/server";
import { analyzeSite } from "@/lib/analysis";
import { crawlSite } from "@/lib/crawl";
import { buildDemoAnalysis } from "@/lib/fixture";
import type { AnalyzeRequest } from "@/lib/types";

export const runtime = "nodejs";
export const maxDuration = 60;

const DEFAULT_PERSONA =
  "A startup operator who wants to quickly understand the product, trust it, and decide whether to take the next step.";

function getErrorMessage(error: unknown) {
  if (error instanceof Error) {
    return error.message;
  }

  return "Something went wrong while analyzing the website.";
}

export async function POST(request: Request) {
  let body: AnalyzeRequest;

  try {
    body = (await request.json()) as AnalyzeRequest;
  } catch {
    return NextResponse.json({ error: "Send valid JSON in the request body." }, { status: 400 });
  }

  const url = body.url?.trim();
  const persona = body.persona?.trim() || DEFAULT_PERSONA;

  if (!url) {
    return NextResponse.json({ error: "Enter a website URL first." }, { status: 400 });
  }

  if (body.useFixture) {
    return NextResponse.json(buildDemoAnalysis(url, persona));
  }

  if (!process.env.OPENAI_API_KEY) {
    return NextResponse.json(
      {
        error: "Add OPENAI_API_KEY to run the live analysis. You can still load the demo fixture.",
        demoAvailable: true,
      },
      { status: 400 },
    );
  }

  try {
    const crawl = await crawlSite(url);
    const analysis = await analyzeSite({ url, persona, crawl });
    return NextResponse.json(analysis);
  } catch (error) {
    return NextResponse.json(
      {
        error: getErrorMessage(error),
        demoAvailable: true,
      },
      { status: 500 },
    );
  }
}
