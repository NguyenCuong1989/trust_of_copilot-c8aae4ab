import fs from "node:fs";
import path from "node:path";

const ROOT = path.resolve(new URL("..", import.meta.url).pathname);
const mesh = JSON.parse(fs.readFileSync(path.join(ROOT, ".mcp", "mesh.json"), "utf8"));
const timeoutMs = Number(process.env.CONNECTOR_TIMEOUT_MS || 8000);
const results = [];

async function probe(name, required, url, options = {}) {
  const started = Date.now();
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const response = await fetch(url, { ...options, signal: controller.signal });
    const body = await response.text();
    results.push({
      connector: name,
      required,
      status: response.ok ? "Ready" : "Not Ready",
      http_status: response.status,
      latency_ms: Date.now() - started,
      evidence: body.slice(0, 160).replace(/[\r\n]+/g, " ")
    });
  } catch (error) {
    results.push({
      connector: name,
      required,
      status: "Not Ready",
      latency_ms: Date.now() - started,
      error: error.name === "AbortError" ? "timeout" : error.message
    });
  } finally {
    clearTimeout(timer);
  }
}

function bearer(token) {
  return token ? { Authorization: `Bearer ${token}` } : {};
}

await probe(
  "local",
  true,
  process.env.LOCAL_CONNECTOR_HEALTH_URL || "http://127.0.0.1:3000/health"
);

if (mesh.connectors?.notion?.enabled) {
  const token = process.env.NOTION_API_KEY;
  if (!token) {
    results.push({ connector: "notion", required: false, status: "Not Ready", error: "missing token_ref LOCAL_SECRET_STORE/NOTION_API_KEY" });
  } else {
    await probe("notion", false, "https://api.notion.com/v1/users/me", {
      headers: {
        ...bearer(token),
        "Notion-Version": "2026-03-11"
      }
    });
  }
}

if (mesh.connectors?.github?.enabled) {
  const token = process.env.GITHUB_TOKEN;
  const repository = process.env.GITHUB_REPOSITORY || "NguyenCuong1989/trust_of_copilot-c8aae4ab";
  if (!token) {
    results.push({ connector: "github", required: false, status: "Partial", error: "no local token; public read probe only" });
  }
  await probe("github", false, `https://api.github.com/repos/${repository}`, {
    headers: {
      Accept: "application/vnd.github+json",
      "User-Agent": "hyperai-local-connector-health",
      ...bearer(token)
    }
  });
}

if (mesh.connectors?.telegram?.enabled) {
  const token = process.env.TELEGRAM_BOT_TOKEN;
  if (!token) {
    results.push({ connector: "telegram", required: false, status: "Not Ready", error: "missing token_ref LOCAL_SECRET_STORE/TELEGRAM_BOT_TOKEN" });
  } else {
    await probe("telegram", false, `https://api.telegram.org/bot${token}/getMe`);
  }
}

const timestamp = new Date().toISOString();
const summary = {
  event: "CONNECTOR_HEALTH",
  timestamp,
  authority: mesh.authority?.root || "local_hyperai",
  results
};

process.stdout.write(`${JSON.stringify(summary)}\n`);

const requiredFailure = results.some(result => result.required && result.status !== "Ready");
process.exitCode = requiredFailure ? 1 : 0;
