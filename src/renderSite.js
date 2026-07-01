import fs from "node:fs";
import path from "node:path";

export function renderSite(radar, outputDir) {
  fs.mkdirSync(outputDir, { recursive: true });

  const page = renderPage(radar);
  const dailyFile = `${radar.date}.html`;

  fs.writeFileSync(path.join(outputDir, dailyFile), page, "utf8");
  fs.writeFileSync(path.join(outputDir, "index.html"), page, "utf8");

  return dailyFile;
}

function renderPage(radar) {
  const cards = radar.items.map((item) => `
    <section class="card" id="${escapeHtml(item.code)}">
      <div class="code">${escapeHtml(item.code)} · ${escapeHtml(item.type)}</div>
      <h2>${escapeHtml(item.title)}</h2>
      <p>${escapeHtml(item.detail)}</p>
    </section>
  `).join("\n");

  const sources = radar.sources.map((item) => `
    <li><a href="${escapeHtml(item.link)}">${escapeHtml(item.title)}</a><span>${escapeHtml(item.source)}</span></li>
  `).join("\n");

  return `<!doctype html>
<html lang="zh-CN">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>${escapeHtml(radar.title)}</title>
  <style>
    :root { color-scheme: light; --fg:#16181d; --muted:#667085; --line:#e5e7eb; --bg:#f7f8fa; --card:#ffffff; }
    * { box-sizing: border-box; }
    body { margin: 0; font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif; color: var(--fg); background: var(--bg); }
    main { max-width: 860px; margin: 0 auto; padding: 28px 18px 48px; }
    header { padding: 8px 0 20px; border-bottom: 1px solid var(--line); }
    h1 { margin: 0 0 8px; font-size: 28px; line-height: 1.2; }
    .sub { color: var(--muted); font-size: 14px; }
    .grid { display: grid; gap: 12px; margin-top: 18px; }
    .card { background: var(--card); border: 1px solid var(--line); border-radius: 8px; padding: 16px; }
    .code { color: #2563eb; font-weight: 700; font-size: 13px; margin-bottom: 8px; }
    h2 { margin: 0 0 10px; font-size: 18px; line-height: 1.35; }
    p { margin: 0; color: #344054; line-height: 1.7; }
    h3 { margin: 26px 0 10px; }
    ul { padding-left: 18px; }
    li { margin: 8px 0; line-height: 1.5; }
    a { color: #1d4ed8; text-decoration: none; }
    span { display: block; color: var(--muted); font-size: 12px; margin-top: 2px; }
  </style>
</head>
<body>
  <main>
    <header>
      <h1>${escapeHtml(radar.title)}</h1>
      <div class="sub">编号详情页。飞书看摘要，这里看展开。</div>
    </header>
    <div class="grid">${cards}</div>
    <h3>参考来源</h3>
    <ul>${sources || "<li>暂无新闻源。</li>"}</ul>
  </main>
</body>
</html>`;
}

function escapeHtml(input) {
  return String(input || "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}
