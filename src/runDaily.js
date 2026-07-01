import path from "node:path";
import { fileURLToPath } from "node:url";
import { loadConfig } from "./config.js";
import { sendFeishuText } from "./feishu.js";
import { buildFeishuMessage, buildRadar } from "./radar.js";
import { renderSite } from "./renderSite.js";
import { collectSources } from "./sources.js";

const dryRun = process.argv.includes("--dry-run");
const rootDir = path.resolve(fileURLToPath(new URL("..", import.meta.url)));
const config = loadConfig();

const data = await collectSources();
const radar = buildRadar(data, { title: config.title });
const dailyFile = renderSite(radar, path.join(rootDir, "public"));
const siteUrl = config.siteBaseUrl ? `${config.siteBaseUrl.replace(/\/$/, "")}/${dailyFile}` : "";
const message = buildFeishuMessage(radar, siteUrl);

console.log(message);

if (!dryRun) {
  await sendFeishuText(config.feishuWebhookUrl, message);
  console.log("Pushed to Feishu.");
}
