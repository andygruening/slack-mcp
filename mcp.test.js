import assert from "node:assert/strict";
import { afterEach, test } from "node:test";
import { callTool, tool } from "./mcp.js";

const originalToken = process.env.SLACK_BOT_TOKEN;
const originalFetch = globalThis.fetch;

afterEach(() => {
  if (originalToken === undefined) {
    delete process.env.SLACK_BOT_TOKEN;
  } else {
    process.env.SLACK_BOT_TOKEN = originalToken;
  }
  globalThis.fetch = originalFetch;
});

test("tool schema requires caller-provided channel and text", () => {
  assert.deepEqual(tool.inputSchema.required, ["channel", "text"]);
  assert.equal(tool.inputSchema.properties.channel.type, "string");
});

test("callTool posts to the channel argument", async () => {
  process.env.SLACK_BOT_TOKEN = "xoxb-test";

  let requestBody;
  globalThis.fetch = async (_url, options) => {
    requestBody = JSON.parse(options.body);
    return {
      ok: true,
      async json() {
        return { ok: true, ts: "123.456" };
      },
    };
  };

  const result = await callTool({
    name: "post_slack_message",
    arguments: {
      channel: "C0123456789",
      text: "hello",
    },
  });

  assert.deepEqual(requestBody, {
    channel: "C0123456789",
    text: "hello",
  });
  assert.equal(result.content[0].text, "Posted message to C0123456789 at 123.456.");
});

test("callTool rejects a missing channel argument", async () => {
  await assert.rejects(
    callTool({
      name: "post_slack_message",
      arguments: {
        text: "hello",
      },
    }),
    /channel must be a non-empty string/,
  );
});
