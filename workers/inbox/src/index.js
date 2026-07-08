const MAX_MESSAGE = 2000;
const MAX_NAME = 100;
const MAX_CONTACT = 200;
const RATE_LIMIT_MAX = 5;
const RATE_LIMIT_WINDOW_SEC = 3600;

function corsHeaders(origin, allowedOrigin) {
  const headers = {
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type",
    "Access-Control-Max-Age": "86400",
  };
  if (origin && origin === allowedOrigin) {
    headers["Access-Control-Allow-Origin"] = origin;
    headers.Vary = "Origin";
  }
  return headers;
}

function jsonResponse(status, body, extraHeaders = {}) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json", ...extraHeaders },
  });
}

function trimText(value, maxLen) {
  if (typeof value !== "string") return "";
  return value.trim().slice(0, maxLen);
}

function formatJstTitle() {
  const parts = new Intl.DateTimeFormat("ja-JP", {
    timeZone: "Asia/Tokyo",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).formatToParts(new Date());
  const get = (type) => parts.find((p) => p.type === type)?.value || "";
  return `${get("year")}-${get("month")}-${get("day")} ${get("hour")}:${get("minute")} JST`;
}

function buildIssueBody(message, name, contact) {
  const nameLine = name || "（未記入）";
  const contactLine = contact || "（未記入）";
  return [
    "## メッセージ",
    "",
    message,
    "",
    "## 送り手（任意）",
    "",
    `- **お名前:** ${nameLine}`,
    `- **連絡先:** ${contactLine}`,
    "",
    "---",
    "",
    "送信元: 個人Webサイト（匿名フォーム）",
  ].join("\n");
}

async function checkRateLimit(env, ip) {
  if (!env.RATE_LIMIT || !ip) return null;
  const key = `rl:${ip}`;
  const raw = await env.RATE_LIMIT.get(key);
  const count = raw ? parseInt(raw, 10) : 0;
  if (count >= RATE_LIMIT_MAX) {
    return "送信回数の上限に達しました。しばらくしてから再度お試しください。";
  }
  await env.RATE_LIMIT.put(key, String(count + 1), {
    expirationTtl: RATE_LIMIT_WINDOW_SEC,
  });
  return null;
}

async function createGitHubIssue(env, title, body) {
  const owner = env.GITHUB_OWNER;
  const repo = env.GITHUB_REPO;
  const token = env.GITHUB_TOKEN;
  if (!owner || !repo || !token) {
    throw new Error("Worker is not configured");
  }

  const res = await fetch(`https://api.github.com/repos/${owner}/${repo}/issues`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      Accept: "application/vnd.github+json",
      "Content-Type": "application/json",
      "User-Agent": "murakami-inbox-worker",
      "X-GitHub-Api-Version": "2022-11-28",
    },
    body: JSON.stringify({ title, body }),
  });

  if (!res.ok) {
    const detail = await res.text();
    console.error("GitHub API error", res.status, detail);
    throw new Error("Failed to create issue");
  }

  return res.json();
}

export default {
  async fetch(request, env) {
    const allowedOrigin = env.ALLOWED_ORIGIN || "https://ryomurakami-medrobo.github.io";
    const origin = request.headers.get("Origin");
    const cors = corsHeaders(origin, allowedOrigin);

    if (request.method === "OPTIONS") {
      return new Response(null, { status: 204, headers: cors });
    }

    if (request.method !== "POST") {
      return jsonResponse(405, { ok: false, error: "Method not allowed" }, cors);
    }

    if (origin && origin !== allowedOrigin) {
      return jsonResponse(403, { ok: false, error: "Forbidden" }, cors);
    }

    let payload;
    try {
      payload = await request.json();
    } catch {
      return jsonResponse(400, { ok: false, error: "Invalid JSON" }, cors);
    }

    // Honeypot: bots that fill hidden fields get a fake success.
    if (trimText(payload._hp, 200)) {
      return jsonResponse(200, { ok: true }, cors);
    }

    const message = trimText(payload.message, MAX_MESSAGE);
    const name = trimText(payload.name, MAX_NAME);
    const contact = trimText(payload.contact, MAX_CONTACT);

    if (!message) {
      return jsonResponse(400, { ok: false, error: "メッセージを入力してください。" }, cors);
    }
    if (message.length < 2) {
      return jsonResponse(400, { ok: false, error: "メッセージが短すぎます。" }, cors);
    }

    const ip = request.headers.get("CF-Connecting-IP") || "";
    const rateError = await checkRateLimit(env, ip);
    if (rateError) {
      return jsonResponse(429, { ok: false, error: rateError }, cors);
    }

    const titlePrefix = name ? `[サイト] ${name}` : "[サイト] 匿名";
    const title = `${titlePrefix} — ${formatJstTitle()}`;
    const body = buildIssueBody(message, name, contact);

    try {
      await createGitHubIssue(env, title, body);
      return jsonResponse(200, { ok: true }, cors);
    } catch {
      return jsonResponse(502, { ok: false, error: "送信に失敗しました。時間をおいて再度お試しください。" }, cors);
    }
  },
};