export function loadConfig() {
  return {
    feishuWebhookUrl: process.env.FEISHU_WEBHOOK_URL || "",
    siteBaseUrl: process.env.SITE_BASE_URL || "",
    title: process.env.BRIEF_TITLE || "Web3 市场探测器"
  };
}
