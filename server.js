const http = require('node:http');
const fs = require('node:fs');
const path = require('node:path');

const PORT = Number(process.env.PORT || 3000);
const TELEGRAM_DISPATCH_PATH = '/telegram/dispatch';
const HEALTH_PATH = '/health';
const RUNTIME_MESH_PATH = path.join(__dirname, '.mcp', 'mesh.json');
const MAX_BODY_BYTES = 64 * 1024;

let runtimeMeshCache = null;

function readJsonBody(req) {
  return new Promise((resolve, reject) => {
    let raw = '';
    let size = 0;
    req.on('data', (chunk) => {
      size += chunk.length;
      if (size > MAX_BODY_BYTES) {
        reject(new Error('Payload too large'));
        req.destroy();
        return;
      }
      raw += chunk;
    });
    req.on('end', () => {
      if (!raw) return resolve({});
      try {
        resolve(JSON.parse(raw));
      } catch {
        reject(new Error('Invalid JSON'));
      }
    });
    req.on('error', reject);
  });
}

function sendJson(res, statusCode, payload) {
  res.writeHead(statusCode, {
    'Content-Type': 'application/json; charset=utf-8',
    'Cache-Control': 'no-store'
  });
  res.end(JSON.stringify(payload));
}

function loadRuntimeMesh() {
  if (runtimeMeshCache) return runtimeMeshCache;
  try {
    runtimeMeshCache = JSON.parse(fs.readFileSync(RUNTIME_MESH_PATH, 'utf8'));
  } catch {
    runtimeMeshCache = { authority: { root: 'local_hyperai' }, hardware_nodes: {} };
  }
  return runtimeMeshCache;
}

function resolveRuntimeIdentity() {
  const mesh = loadRuntimeMesh();
  const hardwareNodes = mesh.hardware_nodes || {};
  const platform = process.platform;
  const runtimeNodeId = process.env.RUNTIME_NODE_ID || (platform === 'win32' ? 'msi_titan_gt77' : 'macbook_m2');
  const selectedNode = hardwareNodes[runtimeNodeId] || null;
  return {
    runtime_node_id: runtimeNodeId,
    runtime_node_name: selectedNode?.display_name || runtimeNodeId,
    runtime_node_role: selectedNode?.execution_role || 'local_execution',
    runtime_platform: selectedNode?.platform || platform,
    runtime_priority: selectedNode?.priority ?? null,
    runtime_source: selectedNode ? 'mesh.json' : 'process.platform'
  };
}

function validTelegramToken(token) {
  return /^\d{6,12}:[A-Za-z0-9_-]{30,}$/.test(String(token || '').trim());
}

const server = http.createServer(async (req, res) => {
  if (req.method === 'GET' && req.url === HEALTH_PATH) {
    const mesh = loadRuntimeMesh();
    sendJson(res, 200, {
      ok: true,
      authority: mesh.authority?.root || 'local_hyperai',
      runtime_identity: resolveRuntimeIdentity()
    });
    return;
  }

  if (req.method !== 'POST' || req.url !== TELEGRAM_DISPATCH_PATH) {
    sendJson(res, 404, { ok: false, routes: [HEALTH_PATH, TELEGRAM_DISPATCH_PATH] });
    return;
  }

  try {
    const body = await readJsonBody(req);
    if (Object.prototype.hasOwnProperty.call(body, 'token')) {
      sendJson(res, 400, { ok: false, error: 'Credentials are not accepted in request payloads' });
      return;
    }

    const tokenVerified = validTelegramToken(process.env.TELEGRAM_BOT_TOKEN);
    if (!tokenVerified) {
      sendJson(res, 503, { ok: false, error: 'Telegram connector is not configured' });
      return;
    }

    const runtimeIdentity = resolveRuntimeIdentity();
    const mesh = loadRuntimeMesh();
    sendJson(res, 200, {
      ok: true,
      endpoint: TELEGRAM_DISPATCH_PATH,
      token_verified: true,
      lifecycle: 'synced',
      mode: 'local-sovereign-dispatcher',
      runtime_identity: runtimeIdentity,
      runtime_mesh_synced: Boolean(mesh.hardware_nodes?.[runtimeIdentity.runtime_node_id]),
      event: {
        update_id: body.update_id ?? null,
        message_id: body.message?.message_id ?? null,
        chat_id: body.message?.chat?.id ?? null,
        text_present: Boolean(body.message?.text)
      }
    });
  } catch (error) {
    const status = error.message === 'Payload too large' ? 413 : 400;
    sendJson(res, status, { ok: false, error: error.message });
  }
});

server.listen(PORT, '127.0.0.1', () => {
  console.log(`local telegram dispatch endpoint listening on 127.0.0.1:${PORT}`);
});
