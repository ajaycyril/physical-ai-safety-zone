import { readFile } from "node:fs/promises";
import path from "node:path";

export const runtime = "nodejs";

export async function GET() {
  const publicDir = path.join(process.cwd(), "public");
  const [template, cssA, cssB, script, favicon, socialImage] = await Promise.all([
    readFile(path.join(publicDir, "analog-product-thesis.html"), "utf8"),
    readFile(path.join(publicDir, "styles-a.css"), "utf8"),
    readFile(path.join(publicDir, "styles-b.css"), "utf8"),
    readFile(path.join(publicDir, "script.js"), "utf8"),
    readFile(path.join(publicDir, "favicon.svg"), "utf8"),
    readFile(path.join(publicDir, "og.svg"), "utf8"),
  ]);

  const faviconData = `data:image/svg+xml;base64,${Buffer.from(favicon).toString("base64")}`;
  const socialData = `data:image/svg+xml;base64,${Buffer.from(socialImage).toString("base64")}`;
  const safeScript = script.replace(/<\/script/gi, "<\\/script");

  const html = template
    .replace('  <meta property="og:image" content="/og.svg" />', `  <meta property="og:image" content="${socialData}" />`)
    .replace('  <link rel="icon" href="/favicon.svg" type="image/svg+xml" />', `  <link rel="icon" href="${faviconData}" type="image/svg+xml" />`)
    .replace('  <link rel="preconnect" href="https://fonts.googleapis.com" />\n', "")
    .replace('  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin />\n', "")
    .replace(/  <link href="https:\/\/fonts\.googleapis\.com[^\n]+\n/, "")
    .replace('  <link rel="stylesheet" href="/styles-a.css" />\n  <link rel="stylesheet" href="/styles-b.css" />', `  <style>\n${cssA}\n${cssB}\n  </style>\n  <noscript><style>.reveal{opacity:1!important;transform:none!important}</style></noscript>`)
    .replace('  <script src="/script.js" defer></script>', `  <script>\n${safeScript}\n  </script>`);

  return new Response(html, {
    headers: {
      "content-type": "text/html; charset=utf-8",
      "cache-control": "public, max-age=0, must-revalidate",
    },
  });
}
