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

test("rejects requests without a supplied token", async () => {
  process.env.TELEGRAM_BOT_TOKEN = "server-secret-token-123456789";
  const response = await invoke("POST", { message: "hello" });
  assert.equal(response.statusCode, 401);
  assert.equal(response.body.ok, false);
});

test("rejects arbitrary long tokens", async () => {
  process.env.TELEGRAM_BOT_TOKEN = "server-secret-token-123456789";
  const response = await invoke("POST", {
    token: "attacker-controlled-token-123",
    message: "hello",
  });
  assert.equal(response.statusCode, 401);
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
  assert.equal(response.statusCode, 401);
});

test("rejects non-POST methods", async () => {
  const response = await invoke("GET");
  assert.equal(response.statusCode, 405);
  assert.equal(response.headers.Allow, "POST");
});
