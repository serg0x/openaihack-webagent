import { buildPreviewHtml } from "@/lib/preview";

export const runtime = "nodejs";
export const maxDuration = 30;

function renderErrorPreview(message: string) {
  return `<!doctype html>
  <html>
    <head>
      <meta charset="utf-8" />
      <title>Preview unavailable</title>
      <style>
        body {
          margin: 0;
          min-height: 100vh;
          display: grid;
          place-items: center;
          background: linear-gradient(180deg, #f8f3ea, #efe3d0);
          color: #182414;
          font: 500 16px/1.5 "Helvetica Neue", Arial, sans-serif;
        }
        article {
          max-width: 520px;
          padding: 28px;
          border-radius: 22px;
          background: rgba(255,255,255,0.82);
          box-shadow: 0 24px 80px rgba(0,0,0,0.12);
        }
      </style>
    </head>
    <body>
      <article>
        <h1>Preview unavailable</h1>
        <p>${message}</p>
      </article>
    </body>
  </html>`;
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const url = searchParams.get("url");
  const mode = searchParams.get("mode") === "original" ? "original" : "patched";

  if (!url) {
    return new Response(renderErrorPreview("Missing the target URL for preview rendering."), {
      status: 400,
      headers: { "content-type": "text/html; charset=utf-8" },
    });
  }

  try {
    const html = await buildPreviewHtml({
      url,
      mode,
      patch:
        mode === "patched"
          ? {
              heroHeadline: searchParams.get("headline") || "",
              heroSubheadline: searchParams.get("subheadline") || "",
              primaryCta: searchParams.get("cta") || "",
            }
          : undefined,
    });

    return new Response(html, {
      headers: {
        "content-type": "text/html; charset=utf-8",
        "cache-control": "no-store",
      },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "The remote page could not be proxied.";
    return new Response(renderErrorPreview(message), {
      status: 500,
      headers: { "content-type": "text/html; charset=utf-8" },
    });
  }
}
