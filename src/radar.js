const WEEKDAYS = ["周日", "周一", "周二", "周三", "周四", "周五", "周六"];

export function buildRadar(data, options = {}) {
  const now = options.now || new Date();
  const date = formatDate(now);
  const weekday = WEEKDAYS[now.getDay()];
  const items = [];

  const btc = data.prices.btc;
  const eth = data.prices.eth;
  const hype = data.prices.hype;

  items.push({
    code: "T00",
    type: "总判断",
    title: buildThesis({ btc, eth, hype, news: data.news }),
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
    title: buildNarrativeLine(data.news),
    detail: "叙事强度看的是今天新闻和讨论是否集中在少数主题上。主题越集中，越容易形成内容主线；主题分散时，不要硬写大判断。"
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
    title: "弱市场里，哪些项目还能被单独拿出来讨论？",
    detail: "写法：用 Hyperliquid、Ethena、RWA 或 Aave/Uniswap 这类有真实产品和数据的项目做例子，不写泛泛赛道口号。"
  });

  items.push({
    code: "X03",
    type: "可写切口",
    title: buildNewsAngle(data.news),
    detail: "写法：选择一个新闻标题做入口，解释它背后的市场结构，而不是复述新闻。"
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
    title: "Hyperliquid、Ethena、RWA 是否有连续信号",
    detail: "单条新闻不够，连续数据才重要。看交易量、TVL、费用、稳定币规模、链上转账和赎回压力。"
  });

  items.push({
    code: "W03",
    type: "盯盘项",
    title: "宏观和机构线是否重新影响 crypto 风险偏好",
    detail: "重点看 ETF 资金、Fed 预期、BlackRock/Coinbase/Binance/Robinhood 等机构动作。"
  });

  return {
    title: `${options.title || "Web3 市场探测器"}｜${date} ${weekday}`,
    date,
    weekday,
    items,
    sources: data.news.slice(0, 6)
  };
}

export function buildFeishuMessage(radar, siteUrl) {
  const lines = [
    radar.title,
    "",
    ...radar.items.map((item) => `${item.code}｜${item.title}`)
  ];

  if (siteUrl) {
    lines.push("", `详情页：${siteUrl}`);
  }

  return lines.join("\n").slice(0, 1800);
}

function buildThesis({ btc, eth, hype, news }) {
  const btcChange = btc?.change24h ?? 0;
  const ethChange = eth?.change24h ?? 0;
  const hypeChange = hype?.change24h ?? 0;

  if (btcChange < -2 && ethChange < btcChange) return "风险偏好偏弱，ETH 弱于 BTC，今天别写成反弹叙事。";
  if (btcChange > 2 && ethChange > btcChange) return "风险偏好有扩散迹象，重点看 ETH 和链上 beta 是否接力。";
  if (Math.abs(hypeChange) > Math.abs(btcChange) + 3) return "大盘信号一般，但链上交易叙事有独立波动，适合盯 Perp DEX。";
  if (news.some((item) => /etf|blackrock|fed|sec/i.test(item.title))) return "机构和宏观线索在抬头，今天先看资金和监管，不急着写项目情绪。";
  return "今天主线不算硬，先用价格、资金、项目强弱做探测，不强行下结论。";
}

function buildNarrativeLine(news) {
  const text = news.map((item) => item.title).join(" ");
  const tags = [];
  if (/etf|blackrock|coinbase|robinhood/i.test(text)) tags.push("机构/ETF");
  if (/defi|aave|uniswap|ethena|stablecoin/i.test(text)) tags.push("DeFi/稳定币");
  if (/rwa|tokenization/i.test(text)) tags.push("RWA");
  if (/ai|agent/i.test(text)) tags.push("AI Agent");
  if (/hack|security|exploit/i.test(text)) tags.push("安全");
  if (/solana|ethereum|l2|layer 2/i.test(text)) tags.push("公链/L2");

  return tags.length ? `今日新闻叙事集中在：${tags.slice(0, 3).join("、")}` : "今日新闻主题分散，暂时没有单一强叙事。";
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
