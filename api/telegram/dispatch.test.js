import assert from "node:assert/strict";
import test from "node:test";

import handler from "./dispatch.js";

function responseRecorder() {
  return {
    headers: {},
    statusCode: null,
    body: null,
    setHeader(name, value) {
      this.headers[name] = value;
    },
    status(code) {
      this.statusCode = code;
      return this;
    },
    json(body) {
      this.body = body;
      return this;
    },
  };
}

async function invoke(method, body) {
  const response = responseRecorder();
  await handler({ method, body }, response);
  return response;
}

function assertUnauthorized(response) {
  assert.equal(response.statusCode, 401);
  assert.deepEqual(response.body, {
    ok: false,
    error: "unauthorized",
    endpoint: "/api/telegram/dispatch",
  });
  assert.equal("runtime_identity" in response.body, false);
  assert.equal("runtime_mesh_synced" in response.body, false);
  assert.equal("payload" in response.body, false);
}

test("rejects requests without a supplied token without exposing runtime metadata", async () => {
  process.env.TELEGRAM_BOT_TOKEN = "server-secret-token-123456789";
  const response = await invoke("POST", { message: "hello" });
  assertUnauthorized(response);
});

test("rejects arbitrary long tokens", async () => {
  process.env.TELEGRAM_BOT_TOKEN = "server-secret-token-123456789";
  const response = await invoke("POST", {
    token: "attacker-controlled-token-123",
    message: "hello",
  });
  assertUnauthorized(response);
});

test("rejects same-character-length unicode tokens without throwing", async () => {
  process.env.TELEGRAM_BOT_TOKEN = "server-secret-token-123456789";
  const response = await invoke("POST", {
    token: "é".repeat(process.env.TELEGRAM_BOT_TOKEN.length),
    message: "hello",
  });
  assertUnauthorized(response);
});

test("accepts only the configured token and redacts it", async () => {
  const token = "server-secret-token-123456789";
  process.env.TELEGRAM_BOT_TOKEN = token;
  const response = await invoke("POST", { token, message: "hello" });
  assert.equal(response.statusCode, 200);
  assert.equal(response.body.ok, true);
  assert.deepEqual(response.body.payload, { message: "hello" });
  assert.equal(JSON.stringify(response.body).includes(token), false);
});

test("rejects authentication when server secret is absent", async () => {
  delete process.env.TELEGRAM_BOT_TOKEN;
  const response = await invoke("POST", {
    token: "attacker-controlled-token-123",
  });
  assertUnauthorized(response);
});

test("rejects non-POST methods", async () => {
  const response = await invoke("GET");
  assert.equal(response.statusCode, 405);
  assert.equal(response.headers.Allow, "POST");
});
