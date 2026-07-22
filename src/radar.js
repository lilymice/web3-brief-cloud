const WEEKDAYS = ["周日", "周一", "周二", "周三", "周四", "周五", "周六"];

export function buildRadar(data, options = {}) {
  const now = options.now || new Date();
  const date = formatDate(now);
  const weekday = WEEKDAYS[now.getDay()];
  const items = [];

  const btc = data.prices.btc;
  const eth = data.prices.eth;
  const hype = data.prices.hype;
  const stablecoins = data.defi?.stablecoins || {};
  const rankedNews = rankNews(data.news);
  const eventGroup = pickEventGroup(rankedNews, { btc, eth, hype });
  const narrativeTags = getNarrativeTags(eventGroup.items.length ? eventGroup.items : rankedNews);
  const primaryNews = eventGroup.items[0] || rankedNews[0];
  const secondaryNews = eventGroup.items[1] || rankedNews.find((item) => item.title !== primaryNews?.title);
  const tertiaryNews = eventGroup.items[2] || rankedNews.find((item) => item.title !== primaryNews?.title && item.title !== secondaryNews?.title);

  items.push({
    code: "T00",
    type: "总判断",
    title: buildThesis({ btc, eth, hype, news: eventGroup.items.length ? eventGroup.items : rankedNews, tags: narrativeTags, eventGroup }),
    detail: "这条是当天内容的主线。它不负责预测涨跌，只负责判断今天市场更像风险扩张、风险收缩，还是主线缺失。"
  });

  items.push({
    code: "M01",
    type: "市场信号",
    title: buildPriceLine({ btc, eth }),
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
    title: buildNarrativeLine(eventGroup, primaryNews, narrativeTags),
    detail: primaryNews
      ? `新鲜度 ${formatFreshness(primaryNews)}，来源 ${primaryNews.source}。先看它有没有第二来源确认。`
      : "过去 36 小时内没有抓到足够硬的新事件，今天不要复用旧热点。"
  });

  items.push({
    code: "S01",
    type: "稳定币",
    title: buildStablecoinLine(stablecoins, rankedNews),
    detail: buildStablecoinDetail(stablecoins, rankedNews)
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
      : "写法：没有新事件就别硬写旧闻。可以写“今天市场缺少一级信号，哪些东西只是噪音”。"
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
      : "明天优先扫一级事件：监管、ETF/机构资金、安全事故、交易所风险、BTC 财库和宏观冲击。"
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
    sources: (eventGroup.items.length ? eventGroup.items : rankedNews).slice(0, 8)
  };
}

export function buildFeishuMessage(radar, siteUrl) {
  const byCode = Object.fromEntries(radar.items.map((item) => [item.code, item]));
  const topSignal = byCode.M03;
  const stablecoin = byCode.S01;
  const market = byCode.M01;
  const writeOne = byCode.X02;
  const watchOne = byCode.W02;

  const lines = [
    radar.title,
    "",
    `一句话｜${byCode.T00 ? cleanFeishuLine(byCode.T00.title, 42) : "今天没有足够硬的主线。"}`,
    "",
    "三个信号",
    `M03｜${topSignal ? cleanFeishuLine(topSignal.title, 54) : "新闻主题分散，先降噪。"}`,
    `S01｜${stablecoin ? cleanFeishuLine(stablecoin.title, 54) : "稳定币暂无异常信号。"}`,
    `M01｜${market ? cleanFeishuLine(market.title, 54) : "BTC/ETH 暂无数据。"}`,
    "",
    `今天可写｜${writeOne ? cleanFeishuLine(writeOne.title, 48) : "今天不硬凑选题。"}`,
    "",
    `明天盯｜${watchOne ? cleanFeishuLine(watchOne.title, 48) : "明天看主线是否延续。"}`
  ];

  if (siteUrl) {
    lines.push("", `详情：${siteUrl}`);
  }

  return lines.filter(Boolean).join("\n").slice(0, 900);
}

export function buildFeishuCard(radar, siteUrl) {
  const byCode = Object.fromEntries(radar.items.map((item) => [item.code, item]));
  const topSignal = byCode.M03;
  const market = byCode.M01;
  const stablecoin = byCode.S01;
  const writeOne = byCode.X02;
  const watchOne = byCode.W02;

  const elements = [
    markdownBlock(`**一句话**\n${cleanFeishuLine(byCode.T00?.title || "今天没有足够硬的主线。", 86)}`),
    { tag: "hr" },
    markdownBlock(`**三个信号**\nM03｜${cleanFeishuLine(topSignal?.title || "新闻主题分散，先降噪。", 82)}\nS01｜${cleanFeishuLine(stablecoin?.title || "稳定币暂无异常信号", 82)}\nM01｜${cleanFeishuLine(market?.title || "BTC/ETH 暂无数据", 82)}`),
    { tag: "hr" },
    markdownBlock(`**今天可写**\n${cleanFeishuLine(writeOne?.title || "今天不硬凑选题。", 86)}`),
    markdownBlock(`**明天只盯一件事**\n${cleanFeishuLine(watchOne?.title || "明天看主线是否延续。", 86)}`)
  ];

  if (siteUrl) {
    elements.push({
      tag: "action",
      actions: [
        {
          tag: "button",
          text: { tag: "plain_text", content: "打开详情页" },
          url: siteUrl,
          type: "primary"
        }
      ]
    });
  }

  elements.push({
    tag: "note",
    elements: [
      {
        tag: "plain_text",
        content: "飞书只放主线。要展开就发编号，比如 M03、S01、X02。"
      }
    ]
  });

  return {
    msg_type: "interactive",
    card: {
      config: { wide_screen_mode: true },
      header: {
        template: "blue",
        title: {
          tag: "plain_text",
          content: radar.title
        }
      },
      elements
    }
  };
}

function markdownBlock(content) {
  return {
    tag: "div",
    text: {
      tag: "lark_md",
      content
    }
  };
}

function buildThesis({ btc, eth, hype, news, tags, eventGroup }) {
  const btcChange = btc?.change24h ?? 0;
  const ethChange = eth?.change24h ?? 0;
  const hypeChange = hype?.change24h ?? 0;

  if (eventGroup?.level === 1) return `一级事件：${eventGroup.reason}`;
  if (eventGroup?.level === 2) return `二级信号：${eventGroup.reason}`;
  if (eventGroup?.level === 3 && news.length) return `三级素材：${eventGroup.reason}`;
  if (btcChange < -2 && ethChange < btcChange) return "风险偏好偏弱，ETH 弱于 BTC，今天别写成反弹叙事。";
  if (btcChange > 2 && ethChange > btcChange) return "风险偏好有扩散迹象，重点看 ETH 和链上 beta 是否接力。";
  if (Math.abs(hypeChange) > Math.abs(btcChange) + 3) return "大盘信号一般，但链上交易叙事有独立波动，适合盯 Perp DEX。";
  if (tags.includes("安全")) return "安全事件权重上升，今天先看风险外溢，不急着写机会。";
  if (tags.includes("BTC 财库")) return "BTC 财库公司出现卖出或融资信号，今天先看机构持币叙事有没有松动。";
  if (tags.includes("机构/ETF")) return "机构和 ETF 线索在抬头，今天先看资金，不急着写项目情绪。";
  if (tags.includes("RWA")) return "RWA 线索出现，重点看资产、赎回和合规，不写空泛叙事。";
  if (tags.includes("AI Agent")) return "AI Agent 线索出现，重点看钱包权限、自动执行和风控边界。";
  if (news[0]) return `今天先盯这条线：${shortTitle(news[0].title, 42)}`;
  return "过去 36 小时没有抓到硬事件。今天只看市场温度，不拿旧新闻凑推送。";
}

function buildNarrativeLine(eventGroup, lead, tags) {
  if (!lead) return "L0｜无新鲜主线｜过去 36 小时未抓到可推送的大事件";
  const label = eventGroup.reason.replace(/[。.]$/, "");
  return `L${eventGroup.level}｜${label}｜${shortTitle(lead.title, 62)}`;
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
      level: classifyEventLevel(item.title),
      score: scoreTitle(item.title)
    }))
    .filter((item) => {
      const key = item.title.toLowerCase().replace(/[^a-z0-9\u4e00-\u9fa5]+/g, " ").trim();
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    })
    .sort((a, b) => a.level - b.level || b.score - a.score || (b.publishedAt || 0) - (a.publishedAt || 0))
    .slice(0, 12);
}

function pickEventGroup(news, prices) {
  const groups = [
    {
      level: 1,
      match: (item) => item.level === 1
    },
    {
      level: 2,
      match: (item) => item.level === 2
    },
    {
      level: 3,
      match: (item) => item.level === 3
    }
  ];

  for (const group of groups) {
    const items = news.filter(group.match).slice(0, 4);
    if (items.length) return { ...group, reason: buildLevelReason(group.level, items), items };
  }

  if (hasLargeMarketMove(prices)) {
    return {
      level: 2,
      reason: "BTC/ETH 出现明显波动，但新闻侧没有单一主线。",
      items: []
    };
  }

  return {
    level: 3,
    reason: news.length ? "今天没有明显大事件，先做低噪音观察。" : "今日暂无可用新事件，不复用旧热点。",
    items: news.slice(0, 3)
  };
}

function buildLevelReason(level, items) {
  const lead = items[0];
  const title = lead?.title || "";
  const tags = lead?.tags || classifyTitle(title);

  if (level === 1) {
    if (tags.includes("BTC 财库")) return "BTC 财库卖币/融资信号，机构持币叙事承压。";
    if (tags.includes("安全")) return "安全或攻击事件，先看风险是否外溢。";
    if (tags.includes("监管/宏观")) return "监管/宏观事件可能改变风险定价。";
    if (tags.includes("机构/ETF")) return "机构/ETF 事件可能改变资金方向。";
    return "市场结构级事件，优先核验影响范围。";
  }

  if (level === 2) {
    if (tags.includes("监管/宏观")) return "监管/宏观线索抬头，先看是否影响市场结构。";
    if (tags.includes("机构/ETF")) return "机构/ETF 事件可能改变资金方向。";
    if (tags.includes("RWA")) return "RWA/代币化出现可跟踪信号。";
    if (tags.includes("DeFi/稳定币")) return "DeFi/稳定币出现赛道级信号。";
    if (tags.includes("AI Agent")) return "AI Agent 出现产品或风控信号。";
    if (tags.includes("Perp DEX")) return "链上交易/Perp DEX 风险偏好变化。";
    return "赛道或机构层面的重要变化。";
  }

  return "项目动态或内容素材，可写但不当成市场主线。";
}

function classifyEventLevel(title) {
  if (isLevelOne(title)) return 1;
  if (isLevelTwo(title)) return 2;
  return 3;
}

function isLevelOne(title) {
  return /hack|exploit|stolen|attack|liquidat|bankrupt|insolven|halt|freeze|depeg|crash|lawsuit|charged|indict|settlement|etf approval|etf rejection|\bfed\b|rate cut|rate hike|\bsec\b|securities probe|binance.*(halt|freeze|hack|lawsuit|charged|settlement)|coinbase.*(halt|freeze|hack|lawsuit|charged|settlement)|strategy sells [\d,.]+ bitcoin|microstrategy sells [\d,.]+ bitcoin|strategy sells [\d,.]+ btc|microstrategy sells [\d,.]+ btc|bitcoin treasury.*sell/i.test(title);
}

function buildPriceLine({ btc, eth }) {
  if (typeof btc?.usd !== "number" && typeof eth?.usd !== "number") {
    return "BTC/ETH 价格源暂时不可用，今天先看新闻主线和稳定币供应。";
  }
  return `BTC ${formatUsd(btc?.usd)} (${formatPct(btc?.change24h)}), ETH ${formatUsd(eth?.usd)} (${formatPct(eth?.change24h)})`;
}

function buildStablecoinLine(stablecoins, news) {
  const rows = [
    stablecoins.usdt,
    stablecoins.usdc,
    stablecoins.usde
  ].filter(Boolean);
  const stableNews = news.find((item) => classifyTitle(item.title).includes("稳定币"));

  if (!rows.length && stableNews) return `稳定币新闻：${shortTitle(stableNews.title, 58)}`;
  if (!rows.length) return "暂无稳定币供应数据，先看监管和 USDT/USDC 新闻。";

  const parts = rows.map((row) => {
    const change = typeof row.change7dPct === "number" ? `, 7d ${formatPct(row.change7dPct)}` : "";
    return `${row.symbol} ${formatCompactUsd(row.supplyUsd)}${change}`;
  });

  return parts.join("｜");
}

function buildStablecoinDetail(stablecoins, news) {
  const stableNews = news.find((item) => classifyTitle(item.title).includes("稳定币"));
  if (stableNews) {
    return `新闻侧看 ${stableNews.source}：${stableNews.title}`;
  }
  const usde = stablecoins.usde;
  if (usde?.supplyUsd) return `USDe 供应 ${formatCompactUsd(usde.supplyUsd)}，用来观察 Ethena 风险偏好和收益需求。`;
  return "稳定币没有明显新事件时，只看供应变化、脱锚风险、监管口径和交易所/支付采用。";
}

function isLevelTwo(title) {
  return /etf|flow|treasury|strategy|microstrategy|mstr|saylor|rwa|tokenization|stablecoin|ethena|aave|uniswap|hyperliquid|perp|robinhood|solana|ethereum|l2|layer 2|\b(ai|agent|agents)\b|regulation|senate|congress|court/i.test(title);
}

function hasLargeMarketMove({ btc, eth, hype }) {
  return [btc?.change24h, eth?.change24h, hype?.change24h].some((value) => typeof value === "number" && Math.abs(value) >= 4);
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
  if (/stablecoin|usdt|usdc|usde|tether|circle|depeg/i.test(title)) tags.push("稳定币");
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
  if (isLevelOne(title)) score += 100;
  if (isLevelTwo(title)) score += 40;
  if (/clarity|market structure|senate|congress|white house|bill|law|regulation|regulatory/i.test(title)) score += 16;
  if (/stablecoin|usdt|usdc|usde|tether|circle|depeg/i.test(title)) score += 14;
  if (/etf|blackrock|flow|inflow|outflow|grayscale|coinshares/i.test(title)) score += 12;
  if (/fed|powell|rate cut|rate hike|cpi|pce|jobs report/i.test(title)) score += 12;
  if (/hack|exploit|stolen|security|depeg|halt|freeze|liquidat/i.test(title)) score += 12;
  if (/strategy|microstrategy|mstr|saylor|bitcoin treasury|btc treasury|corporate treasury|treasury company/i.test(title)) score += 10;
  if (/sell|sells|sold|selling|offload|offloads|raise|raises|stock sale|debt|liquidat/i.test(title) && /bitcoin|btc|strategy|microstrategy|mstr|saylor/i.test(title)) score += 8;
  if (/etf|blackrock|fed|sec|coinbase|binance|robinhood/i.test(title)) score += 5;
  if (/hack|exploit|stolen|security/i.test(title)) score += 5;
  if (/hyperliquid|ethena|aave|uniswap|rwa|tokenization|\b(ai|agent|agents)\b/i.test(title)) score += 4;
  if (/bitcoin|btc|ethereum|eth|solana/i.test(title)) score += 2;
  if (/\$?\d+(\.\d+)?\s?(m|b|million|billion|%)/i.test(title)) score += 2;
  if (/mstr shares|skips bitcoin|stock sale/i.test(title)) score -= 18;
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
  return shortTitle(humanizeTitle(String(input).replace(/\s+/g, " ").trim()), maxLength);
}

function formatCompactUsd(value) {
  if (typeof value !== "number") return "N/A";
  if (value >= 1e12) return `$${(value / 1e12).toFixed(2)}T`;
  if (value >= 1e9) return `$${(value / 1e9).toFixed(1)}B`;
  if (value >= 1e6) return `$${(value / 1e6).toFixed(0)}M`;
  return formatUsd(value);
}

function formatFreshness(item) {
  if (!item?.publishedAt) return "发布时间未知";
  const ageHours = Math.max(0, (Date.now() - item.publishedAt) / 36e5);
  if (ageHours < 1) return "1 小时内";
  if (ageHours < 24) return `${Math.round(ageHours)} 小时前`;
  return `${Math.round(ageHours / 24)} 天前`;
}

function humanizeTitle(input) {
  return input
    .replace(/^机构\/ETF：Strategy Sells 3,588 Bitcoin.*/i, "BTC 财库｜公司卖币付息，机构持币叙事开始接受压力测试")
    .replace(/^BTC 财库：Strategy Sells 3,588 Bitcoin.*/i, "BTC 财库｜公司卖币付息，机构持币叙事开始接受压力测试")
    .replace(/^BTC 财库、监管\/宏观、机构\/ETF｜The Defiant: Strategy Sells 3,588 Bitcoin for \$216M to Fund Dividend Payments/i, "BTC 财库｜Strategy 卖出 3,588 BTC 筹 2.16 亿美元付股息")
    .replace(/^BTC 财库：Strategy Sells 3,588 Bitcoin for \$216M to Fund Dividend Payments/i, "BTC 财库｜Strategy 卖币付股息，这条线可以拆")
    .replace(/^BTC 财库｜继续看：Strategy Sells 3,588 Bitcoin.*/i, "BTC 财库｜明天看 MSTR/STRC 和后续披露")
    .replace(/The Defiant:\s*/i, "")
    .replace(/CoinDesk:\s*/i, "")
    .replace(/Cointelegraph:\s*/i, "")
    .replace(/CryptoSlate:\s*/i, "")
    .replace(/Google News Strategy:\s*/i, "");
}

function formatUsd(value) {
  if (typeof value !== "number") return "N/A";
  if (value >= 1000) return `$${Math.round(value).toLocaleString("en-US")}`;
  return `$${value.toFixed(2)}`;
}

function formatPct(value) {
  if (typeof value !== "number") return "24h 暂无";
  return `${value >= 0 ? "+" : ""}${value.toFixed(2)}%`;
}

function formatDate(date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
}
