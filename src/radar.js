const WEEKDAYS = ["周日", "周一", "周二", "周三", "周四", "周五", "周六"];

export function buildRadar(data, options = {}) {
  const now = options.now || new Date();
  const date = formatDate(now);
  const weekday = WEEKDAYS[now.getDay()];
  const items = [];

  const btc = data.prices.btc;
  const eth = data.prices.eth;
  const hype = data.prices.hype;
  const rankedNews = rankNews(data.news);
  const narrativeTags = getNarrativeTags(rankedNews);
  const primaryNews = rankedNews[0];
  const secondaryNews = rankedNews[1];
  const tertiaryNews = rankedNews[2];

  items.push({
    code: "T00",
    type: "总判断",
    title: buildThesis({ btc, eth, hype, news: rankedNews, tags: narrativeTags }),
    detail: "这条是当天内容的主线。它不负责预测涨跌，只负责判断今天市场更像风险扩张、风险收缩，还是主线缺失。"
  });

  items.push({
    code: "M01",
    type: "市场信号",
    title: `BTC ${formatUsd(btc?.usd)} (${formatPct(btc?.change24h)}), ETH ${formatUsd(eth?.usd)} (${formatPct(eth?.change24h)})`,
    detail: "先看 BTC/ETH 的相对强弱。BTC 稳、ETH 弱，通常说明风险偏好没有完全回来；ETH 强于 BTC，才更像链上风险资产有扩散。"
  });

  items.push({
    code: "M02",
    type: "市场信号",
    title: `HYPE ${hype ? `${formatUsd(hype.usd)} (${formatPct(hype.change24h)})` : "暂无价格数据"}，用来观察 Perp DEX 风险偏好`,
    detail: "Hyperliquid/HYPE 适合作为链上交易风险偏好的观察点。重点不是单日涨跌，而是交易量、OI、费用和代币强弱是否同步。"
  });

  items.push({
    code: "M03",
    type: "市场信号",
    title: buildNarrativeLine(rankedNews, narrativeTags),
    detail: primaryNews
      ? `今天最值得先核验的新闻来自 ${primaryNews.source}：${primaryNews.title}`
      : "今天新闻源没有抓到足够硬的主题，先不要强行拼主线。"
  });

  items.push({
    code: "X01",
    type: "可写切口",
    title: buildMarketAngle({ btc, eth }),
    detail: "写法：先说价格和风险温度，再说为什么它影响内容主线。避免写成行情喊单。"
  });

  items.push({
    code: "X02",
    type: "可写切口",
    title: buildDynamicAngle(primaryNews, narrativeTags, "把今天最热的新闻拆成一个普通人能懂的问题。"),
    detail: primaryNews
      ? `写法：不要复述新闻。先引用 ${primaryNews.source} 的标题，再解释它为什么影响 ${describeTags(narrativeTags)}。`
      : "写法：没有硬新闻时，就写“今天哪些信号不够硬”，比硬凑热点更可信。"
  });

  items.push({
    code: "X03",
    type: "可写切口",
    title: buildDynamicAngle(secondaryNews, narrativeTags, buildNewsAngle(rankedNews)),
    detail: secondaryNews
      ? `写法：把 ${secondaryNews.source} 这条新闻放进同一条主线里，看它是在强化还是反驳今天的叙事。`
      : "写法：用价格和新闻源互相校验，别只拿一个标题当结论。"
  });

  items.push({
    code: "W01",
    type: "盯盘项",
    title: "BTC/ETH 相对强弱是否延续",
    detail: "如果 ETH 连续弱于 BTC，说明风险偏好仍偏谨慎；如果 ETH 开始补强，可以观察 DeFi、L2、AI Agent 等高 beta 方向。"
  });

  items.push({
    code: "W02",
    type: "盯盘项",
    title: buildWatchFromNews(primaryNews, narrativeTags, "今天主线有没有连续第二天出现"),
    detail: primaryNews
      ? `明天看同一主题是否继续出现在不同来源，而不是只看 ${primaryNews.source} 单条新闻。`
      : "明天先看新闻主题有没有重新集中。没有集中，就继续降噪。"
  });

  items.push({
    code: "W03",
    type: "盯盘项",
    title: buildWatchFromNews(tertiaryNews, narrativeTags.slice(1), "是否出现新的非 BTC/ETH 热点"),
    detail: tertiaryNews
      ? `如果 ${tertiaryNews.source} 这条线明天还有后续，可以单独拆成 X 长线程或公众号素材。`
      : "如果明天还是只有价格波动，没有项目/监管/资金新信息，就不要强行扩写。"
  });

  return {
    title: `${options.title || "Web3 市场探测器"}｜${date} ${weekday}`,
    date,
    weekday,
    items,
    sources: rankedNews.slice(0, 8)
  };
}

export function buildFeishuMessage(radar, siteUrl) {
  const byCode = Object.fromEntries(radar.items.map((item) => [item.code, item]));
  const topSignal = byCode.M03;
  const writeOne = byCode.X02;
  const writeTwo = byCode.X03;
  const watchOne = byCode.W02;
  const watchTwo = byCode.W03;

  const lines = [
    radar.title,
    "",
    `【T00 总判断】`,
    byCode.T00 ? cleanFeishuLine(byCode.T00.title, 88) : "今天没有足够硬的主线。",
    "",
    `【M01 市场读数】`,
    byCode.M01 ? cleanFeishuLine(byCode.M01.title, 88) : "BTC/ETH 暂无价格数据。",
    byCode.M02 ? cleanFeishuLine(byCode.M02.title, 88) : "",
    "",
    `【M03 今日主线】`,
    topSignal ? cleanFeishuLine(topSignal.title, 96) : "新闻主题分散，先降噪。",
    topSignal?.detail ? `为什么重要：${cleanFeishuLine(topSignal.detail, 110)}` : "",
    "",
    `【X 可写切口】`,
    writeOne ? `X02｜${cleanFeishuLine(writeOne.title, 88)}` : "",
    writeTwo ? `X03｜${cleanFeishuLine(writeTwo.title, 88)}` : "",
    "",
    `【W 明天盯盘】`,
    watchOne ? `W02｜${cleanFeishuLine(watchOne.title, 88)}` : "",
    watchTwo ? `W03｜${cleanFeishuLine(watchTwo.title, 88)}` : ""
  ];

  if (siteUrl) {
    lines.push("", `详情页：${siteUrl}`);
  }

  return lines.filter(Boolean).join("\n").slice(0, 1800);
}

function buildThesis({ btc, eth, hype, news, tags }) {
  const btcChange = btc?.change24h ?? 0;
  const ethChange = eth?.change24h ?? 0;
  const hypeChange = hype?.change24h ?? 0;

  if (btcChange < -2 && ethChange < btcChange) return "风险偏好偏弱，ETH 弱于 BTC，今天别写成反弹叙事。";
  if (btcChange > 2 && ethChange > btcChange) return "风险偏好有扩散迹象，重点看 ETH 和链上 beta 是否接力。";
  if (Math.abs(hypeChange) > Math.abs(btcChange) + 3) return "大盘信号一般，但链上交易叙事有独立波动，适合盯 Perp DEX。";
  if (tags.includes("安全")) return "安全事件权重上升，今天先看风险外溢，不急着写机会。";
  if (tags.includes("BTC 财库")) return "BTC 财库公司出现卖出或融资信号，今天先看机构持币叙事有没有松动。";
  if (tags.includes("机构/ETF")) return "机构和 ETF 线索在抬头，今天先看资金，不急着写项目情绪。";
  if (tags.includes("RWA")) return "RWA 线索出现，重点看资产、赎回和合规，不写空泛叙事。";
  if (tags.includes("AI Agent")) return "AI Agent 线索出现，重点看钱包权限、自动执行和风控边界。";
  if (news[0]) return `今天先盯这条线：${shortTitle(news[0].title, 42)}`;
  return "今天主线不算硬，先用价格、资金、项目强弱做探测，不强行下结论。";
}

function buildNarrativeLine(news, tags) {
  const lead = news[0];
  if (!lead) return "今日新闻主题分散，暂时没有单一强叙事。";
  const tagText = tags.length ? tags.slice(0, 3).join("、") : "综合市场";
  return `${tagText}｜${lead.source}: ${shortTitle(lead.title, 76)}`;
}

function buildMarketAngle({ btc, eth }) {
  const btcChange = btc?.change24h ?? 0;
  const ethChange = eth?.change24h ?? 0;
  if (ethChange < btcChange) return "ETH 继续弱于 BTC，链上风险偏好还没真正回来。";
  if (ethChange > btcChange) return "ETH 开始强于 BTC，观察风险是否向 DeFi/L2 扩散。";
  return "BTC/ETH 同步波动，今天更适合写资金结构，不写单边情绪。";
}

function buildNewsAngle(news) {
  const first = news[0];
  if (!first) return "今天新闻噪音偏多，适合写“哪些信号值得忽略”。";
  return `从 ${first.source} 的这条新闻切入：${first.title}`;
}

function buildDynamicAngle(newsItem, tags, fallback) {
  if (!newsItem) return fallback;
  const tag = tags[0] || classifyTitle(newsItem.title)[0] || "市场";
  return `${tag}：${shortTitle(newsItem.title, 68)}`;
}

function buildWatchFromNews(newsItem, tags, fallback) {
  if (!newsItem) {
    const tag = tags[0];
    return tag ? `${tag} 明天有没有第二条独立来源确认` : fallback;
  }
  const tag = classifyTitle(newsItem.title)[0] || tags[0] || "这条线";
  return `${tag}｜继续看：${shortTitle(newsItem.title, 62)}`;
}

function rankNews(news) {
  const seen = new Set();
  return news
    .map((item) => ({
      ...item,
      tags: classifyTitle(item.title),
      score: scoreTitle(item.title)
    }))
    .filter((item) => {
      const key = item.title.toLowerCase().replace(/[^a-z0-9\u4e00-\u9fa5]+/g, " ").trim();
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    })
    .sort((a, b) => b.score - a.score)
    .slice(0, 12);
}

function getNarrativeTags(news) {
  const counts = new Map();
  for (const item of news) {
    for (const tag of item.tags) counts.set(tag, (counts.get(tag) || 0) + 1);
  }
  return [...counts.entries()]
    .sort((a, b) => b[1] - a[1])
    .map(([tag]) => tag)
    .slice(0, 4);
}

function classifyTitle(title) {
  const tags = [];
  if (/strategy|microstrategy|mstr|saylor|bitcoin treasury|btc treasury|corporate treasury|treasury company/i.test(title)) tags.push("BTC 财库");
  if (/etf|blackrock|coinbase|robinhood|institution|treasury|fund|flow/i.test(title)) tags.push("机构/ETF");
  if (/defi|aave|uniswap|ethena|stablecoin|usde|lending|dex|yield/i.test(title)) tags.push("DeFi/稳定币");
  if (/rwa|tokenization|tokenized|real.world|treasury|bond/i.test(title)) tags.push("RWA");
  if (/\b(ai|agent|agents|autonomous)\b|ai agent|agent wallet|smart wallet/i.test(title)) tags.push("AI Agent");
  if (/hack|security|exploit|attack|stolen|phishing|vulnerability/i.test(title)) tags.push("安全");
  if (/solana|ethereum|layer 2|l2|base|arbitrum|optimism|chain/i.test(title)) tags.push("公链/L2");
  if (/hyperliquid|perp|derivatives|futures|margin/i.test(title)) tags.push("Perp DEX");
  if (/sec|fed|powell|regulation|senate|congress|law|court/i.test(title)) tags.push("监管/宏观");
  if (/bitcoin|btc|ethereum|eth/i.test(title)) tags.push("BTC/ETH");
  return [...new Set(tags)];
}

function scoreTitle(title) {
  let score = 0;
  if (/strategy|microstrategy|mstr|saylor|bitcoin treasury|btc treasury|corporate treasury|treasury company/i.test(title)) score += 10;
  if (/sell|sells|sold|selling|offload|offloads|raise|raises|stock sale|debt|liquidat/i.test(title) && /bitcoin|btc|strategy|microstrategy|mstr|saylor/i.test(title)) score += 8;
  if (/etf|blackrock|fed|sec|coinbase|binance|robinhood/i.test(title)) score += 5;
  if (/hack|exploit|stolen|security/i.test(title)) score += 5;
  if (/hyperliquid|ethena|aave|uniswap|rwa|tokenization|\b(ai|agent|agents)\b/i.test(title)) score += 4;
  if (/bitcoin|btc|ethereum|eth|solana/i.test(title)) score += 2;
  if (/\$?\d+(\.\d+)?\s?(m|b|million|billion|%)/i.test(title)) score += 2;
  return score;
}

function describeTags(tags) {
  return tags.length ? tags.slice(0, 2).join(" / ") : "今天的市场主线";
}

function shortTitle(title, maxLength) {
  if (!title) return "";
  return title.length > maxLength ? `${title.slice(0, maxLength - 1)}…` : title;
}

function cleanFeishuLine(input, maxLength) {
  if (!input) return "";
  return shortTitle(String(input).replace(/\s+/g, " ").trim(), maxLength);
}

function formatUsd(value) {
  if (typeof value !== "number") return "N/A";
  if (value >= 1000) return `$${Math.round(value).toLocaleString("en-US")}`;
  return `$${value.toFixed(2)}`;
}

function formatPct(value) {
  if (typeof value !== "number") return "N/A";
  return `${value >= 0 ? "+" : ""}${value.toFixed(2)}%`;
}

function formatDate(date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
}
