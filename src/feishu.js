export async function sendFeishuText(webhookUrl, text) {
  if (!webhookUrl) {
    console.log("No FEISHU_WEBHOOK_URL. Skip push.");
    return;
  }

  const response = await fetch(webhookUrl, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      msg_type: "text",
      content: { text }
    })
  });

  const body = await response.text();
  if (!response.ok) throw new Error(`Feishu push failed: ${response.status} ${body}`);

  const parsed = safeJson(body);
  if (parsed && parsed.code && parsed.code !== 0) {
    throw new Error(`Feishu push failed: ${body}`);
  }
}

function safeJson(input) {
  try {
    return JSON.parse(input);
  } catch {
    return null;
  }
}
