import { Client } from "@notionhq/client";

const notion = new Client({
  auth: process.env.NOTION_API_KEY,
  notionVersion: "2026-03-11"
});

const repoFull = process.env.GITHUB_REPOSITORY;
const ghToken = process.env.GITHUB_TOKEN;
const notionApiKey = process.env.NOTION_API_KEY;
const notionTargetId = process.env.NOTION_DATA_SOURCE_ID || process.env.NOTION_DATABASE_ID;

if (!repoFull) throw new Error("Missing GITHUB_REPOSITORY");
if (!ghToken) throw new Error("Missing GITHUB_TOKEN");
if (!notionApiKey) throw new Error("Missing NOTION_API_KEY");
if (!notionTargetId) throw new Error("Missing NOTION_DATA_SOURCE_ID or NOTION_DATABASE_ID");

const [owner, repo] = repoFull.split("/");

const ghHeaders = {
  Authorization: `Bearer ${ghToken}`,
  Accept: "application/vnd.github+json",
  "Content-Type": "application/json"
};

function richTextToString(arr = []) {
  return arr.map(x => x.plain_text || "").join("").trim();
}

function getTitle(page) {
  const props = page.properties || {};
  for (const key of Object.keys(props)) {
    if (props[key]?.type === "title") return richTextToString(props[key].title);
  }
  return "";
}

function getStatus(page) {
  const props = page.properties || {};
  for (const key of Object.keys(props)) {
    if (props[key]?.type === "status") return props[key].status?.name || "";
    if (props[key]?.type === "select" && /status/i.test(key)) return props[key].select?.name || "";
  }
  return "";
}

function slugify(s = "") {
  return s
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[^\w\s-]/g, "")
    .trim()
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-");
}

function isClosedStatus(status = "") {
  const s = status.toLowerCase();
  return ["done", "complete", "completed", "archived", "closed"].includes(s);
}

function normalizeNotionId(value, envName) {
  const raw = String(value || "").trim().replace(/^['\"]|['\"]$/g, "");
  const dashed = raw.match(/[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}/)?.[0];
  if (dashed) return dashed.toLowerCase();

  const compact = raw.match(/[0-9a-fA-F]{32}/)?.[0];
  if (compact) {
    return `${compact.slice(0, 8)}-${compact.slice(8, 12)}-${compact.slice(12, 16)}-${compact.slice(16, 20)}-${compact.slice(20)}`.toLowerCase();
  }

  throw new Error(`${envName} must contain a Notion UUID or URL containing a UUID`);
}

async function resolveDataSourceId() {
  const envName = process.env.NOTION_DATA_SOURCE_ID ? "NOTION_DATA_SOURCE_ID" : "NOTION_DATABASE_ID";
  const id = normalizeNotionId(notionTargetId, envName);

  if (process.env.NOTION_DATA_SOURCE_ID) return id;

  const database = await notion.databases.retrieve({ database_id: id });
  const dataSources = Array.isArray(database.data_sources) ? database.data_sources : [];
  const dataSourceId = dataSources[0]?.id;

  if (!dataSourceId) {
    throw new Error("NOTION_DATABASE_ID resolved, but the database has no visible data_sources for this integration");
  }

  return normalizeNotionId(dataSourceId, "database.data_sources[0].id");
}

function getBody(page) {
  const props = page.properties || {};
  const lines = [
    `Notion Page ID: ${page.id}`,
    `Notion URL: ${page.url}`
  ];

  for (const [key, value] of Object.entries(props)) {
    if (value?.type === "title") {
      const text = richTextToString(value.title);
      if (text) lines.push(`${key}: ${text}`);
    }
    if (value?.type === "rich_text") {
      const text = richTextToString(value.rich_text);
      if (text) lines.push(`${key}: ${text}`);
    }
    if (value?.type === "select" && value.select?.name) {
      lines.push(`${key}: ${value.select.name}`);
    }
    if (value?.type === "status" && value.status?.name) {
      lines.push(`${key}: ${value.status.name}`);
    }
  }

  return lines.join("\n");
}

async function gh(path, method = "GET", body) {
  const res = await fetch(`https://api.github.com${path}`, {
    method,
    headers: ghHeaders,
    body: body ? JSON.stringify(body) : undefined
  });

  if (!res.ok) {
    throw new Error(`${method} ${path} failed: ${res.status} ${await res.text()}`);
  }

  if (res.status === 204) return null;
  return res.json();
}

async function findExistingIssueByPageId(pageId) {
  const issues = await gh(`/repos/${owner}/${repo}/issues?state=all&per_page=100`);
  return issues.find(issue => (issue.body || "").includes(`Notion Page ID: ${pageId}`));
}

async function ensureLabel(name) {
  try {
    await gh(`/repos/${owner}/${repo}/labels/${encodeURIComponent(name)}`);
  } catch {
    await gh(`/repos/${owner}/${repo}/labels`, "POST", { name });
  }
}

async function syncPage(page) {
  const title = getTitle(page);
  const status = getStatus(page);
  const closed = isClosedStatus(status);
  const body = getBody(page);

  if (!title) return;

  const labels = ["notion-sync"];
  if (status) labels.push(`status:${slugify(status)}`);

  for (const label of labels) {
    await ensureLabel(label);
  }

  const existing = await findExistingIssueByPageId(page.id);

  if (!existing) {
    const created = await gh(`/repos/${owner}/${repo}/issues`, "POST", {
      title: `[Notion] ${title}`,
      body,
      labels
    });

    if (closed) {
      await gh(`/repos/${owner}/${repo}/issues/${created.number}`, "PATCH", {
        state: "closed"
      });
      console.log(`CREATED_AND_CLOSED #${created.number} ${title}`);
    } else {
      console.log(`CREATED_ISSUE #${created.number} ${title}`);
    }
    return;
  }

  const normalizedExisting = `${existing.title}\n${existing.body || ""}`.trim();
  const normalizedNext = `[Notion] ${title}\n${body}`.trim();
  const existingLabels = (existing.labels || []).map(x => x.name).sort().join(",");
  const nextLabels = labels.slice().sort().join(",");
  const desiredState = closed ? "closed" : "open";

  const patch = {};

  if (normalizedExisting !== normalizedNext) {
    patch.title = `[Notion] ${title}`;
    patch.body = body;
  }

  if (existingLabels !== nextLabels) {
    patch.labels = labels;
  }

  if (existing.state !== desiredState) {
    patch.state = desiredState;
  }

  if (Object.keys(patch).length > 0) {
    await gh(`/repos/${owner}/${repo}/issues/${existing.number}`, "PATCH", patch);
    console.log(`UPDATED_ISSUE #${existing.number} ${title} -> state=${desiredState} labels=${labels.join(",")}`);
  } else {
    console.log(`NO_CHANGE #${existing.number} ${title}`);
  }
}

const dataSourceId = await resolveDataSourceId();
let cursor = undefined;

do {
  const result = await notion.dataSources.query({
    data_source_id: dataSourceId,
    start_cursor: cursor
  });

  for (const page of result.results) {
    await syncPage(page);
  }

  cursor = result.has_more ? result.next_cursor : undefined;
} while (cursor);