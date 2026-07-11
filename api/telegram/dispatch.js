import fs from "node:fs";
import path from "node:path";

const TELEGRAM_DISPATCH_PATH = "/api/telegram/dispatch";
const RUNTIME_MESH_PATH = path.join(process.cwd(), ".mcp", "mesh.json");

let runtimeMeshCache;

function loadRuntimeMesh() {
  if (runtimeMeshCache) return runtimeMeshCache;

  try {
    runtimeMeshCache = JSON.parse(fs.readFileSync(RUNTIME_MESH_PATH, "utf8"));
  } catch {
    runtimeMeshCache = { hardware_nodes: {} };
  }

  return runtimeMeshCache;
}

function resolveRuntimeIdentity() {
  const mesh = loadRuntimeMesh();
  const hardwareNodes = mesh.hardware_nodes || {};
  const runtimeNodeId = process.env.RUNTIME_NODE_ID || "vercel_serverless";
  const selectedNode = hardwareNodes[runtimeNodeId] || null;

  return {
    runtime_node_id: runtimeNodeId,
    runtime_node_name: selectedNode?.display_name || runtimeNodeId,
    runtime_node_role: selectedNode?.execution_role || "cloud_execution",
    runtime_platform: selectedNode?.platform || "vercel",
    runtime_priority: selectedNode?.priority ?? null,
    runtime_source: selectedNode ? "mesh.json" : "vercel_runtime",
  };
}

function sanitizePayload(body) {
  if (!body || typeof body !== "object" || Array.isArray(body)) return {};
  const { token: _token, ...safePayload } = body;
  return safePayload;
}

export default async function handler(request, response) {
  if (request.method !== "POST") {
    response.setHeader("Allow", "POST");
    return response.status(405).json({
      ok: false,
      error: "method_not_allowed",
      endpoint: TELEGRAM_DISPATCH_PATH,
    });
  }

  const body = request.body && typeof request.body === "object" ? request.body : {};
  const token = String(body.token || process.env.TELEGRAM_BOT_TOKEN || "").trim();
  const tokenVerified = token.length >= 20;
  const runtimeIdentity = resolveRuntimeIdentity();
  const mesh = loadRuntimeMesh();

  return response.status(tokenVerified ? 200 : 401).json({
    ok: tokenVerified,
    endpoint: TELEGRAM_DISPATCH_PATH,
    token_verified: tokenVerified,
    lifecycle: "synced",
    mode: "sovereign-dispatcher",
    runtime_identity: runtimeIdentity,
    runtime_mesh_synced: Boolean(
      mesh.hardware_nodes && mesh.hardware_nodes[runtimeIdentity.runtime_node_id],
    ),
    payload: sanitizePayload(body),
  });
}
