const NEWS_FEEDS = [
  {
    name: "CoinDesk",
    url: "https://www.coindesk.com/arc/outboundfeeds/rss/"
  },
  {
    name: "The Defiant",
    url: "https://thedefiant.io/api/feed"
  },
  {
    name: "Cointelegraph",
    url: "https://cointelegraph.com/rss"
  }
];

export async function collectSources() {
  const [prices, defi, news] = await Promise.all([
    safeSource(getPrices, { btc: null, eth: null, hype: null }),
    safeSource(getDefi, {}),
    safeSource(getNews, [])
  ]);

  return { prices, defi, news };
}

async function safeSource(fn, fallback) {
  try {
    return await fn();
  } catch (error) {
    console.warn(`Source failed: ${error.message}`);
    return fallback;
  }
}

async function getPrices() {
  try {
    const url = "https://api.coingecko.com/api/v3/simple/price?ids=bitcoin,ethereum,hyperliquid&vs_currencies=usd&include_24hr_change=true";
    const json = await fetchJson(url);

    return {
      btc: normalizePrice(json.bitcoin),
      eth: normalizePrice(json.ethereum),
      hype: normalizePrice(json.hyperliquid)
    };
  } catch {
    return getBinancePrices();
  }
}

async function getBinancePrices() {
  const rows = await fetchJson("https://api.binance.com/api/v3/ticker/24hr?symbols=%5B%22BTCUSDT%22,%22ETHUSDT%22%5D");
  const bySymbol = Object.fromEntries(rows.map((row) => [row.symbol, row]));

  return {
    btc: normalizeBinancePrice(bySymbol.BTCUSDT),
    eth: normalizeBinancePrice(bySymbol.ETHUSDT),
    hype: null
  };
}

async function getDefi() {
  const [protocols, stablecoins] = await Promise.allSettled([
    fetchJson("https://api.llama.fi/protocols"),
    fetchJson("https://stablecoins.llama.fi/stablecoins?includePrices=true")
  ]);

  const protocolRows = protocols.status === "fulfilled" ? protocols.value : [];
  const stableRows = stablecoins.status === "fulfilled" ? stablecoins.value?.peggedAssets || [] : [];

  const pickProtocol = (name) => protocolRows.find((item) => item.name?.toLowerCase() === name.toLowerCase());
  const pickStable = (symbol) => stableRows.find((item) => item.symbol?.toLowerCase() === symbol.toLowerCase());

  return {
    aave: pickProtocol("AAVE"),
    uniswap: pickProtocol("Uniswap"),
    ethena: pickProtocol("Ethena"),
    usde: pickStable("USDe")
  };
}

async function getNews() {
  const settled = await Promise.allSettled(
    NEWS_FEEDS.map(async (feed) => ({
      source: feed.name,
      items: parseRss(await fetchText(feed.url), feed.name)
    }))
  );

  return settled
    .filter((item) => item.status === "fulfilled")
    .flatMap((item) => item.value.items)
    .filter((item) => isRelevant(item.title))
    .slice(0, 12);
}

function normalizePrice(row) {
  if (!row) return null;
  return {
    usd: row.usd,
    change24h: row.usd_24h_change
  };
}

function normalizeBinancePrice(row) {
  if (!row) return null;
  return {
    usd: Number(row.lastPrice),
    change24h: Number(row.priceChangePercent)
  };
}

function parseRss(xml, source) {
  const itemBlocks = [...xml.matchAll(/<item[\s\S]*?<\/item>/g)].map((match) => match[0]);
  return itemBlocks.map((block) => ({
    source,
    title: decodeXml(pickTag(block, "title")),
    link: decodeXml(pickTag(block, "link")),
    pubDate: decodeXml(pickTag(block, "pubDate"))
  })).filter((item) => item.title);
}

function isRelevant(title) {
  return /bitcoin|btc|ethereum|eth|etf|stablecoin|defi|rwa|tokenization|ai|agent|hyperliquid|aave|uniswap|ethena|solana|l2|hack|security|sec|fed|blackrock|coinbase|binance/i.test(title);
}

function pickTag(input, tag) {
  const match = input.match(new RegExp(`<${tag}[^>]*>([\\s\\S]*?)<\\/${tag}>`, "i"));
  return match ? match[1].replace(/^<!\[CDATA\[/, "").replace(/\]\]>$/, "").trim() : "";
}

function decodeXml(input) {
  return input
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'");
}

async function fetchJson(url) {
  const response = await fetch(url, {
    headers: { "User-Agent": "web3-market-radar/0.1" }
  });
  if (!response.ok) throw new Error(`Fetch failed ${response.status}: ${url}`);
  return response.json();
}

async function fetchText(url) {
  const response = await fetch(url, {
    headers: { "User-Agent": "web3-market-radar/0.1" }
  });
  if (!response.ok) throw new Error(`Fetch failed ${response.status}: ${url}`);
  return response.text();
}
