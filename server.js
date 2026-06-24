#!/usr/bin/env node

const serverInfo = {
  name: "slack-message-mcp",
  version: "0.1.0",
};

const tool = {
  name: "post_slack_message",
  description: "Post a message to the Slack channel configured by SLACK_CHANNEL_ID.",
  inputSchema: {
    type: "object",
    properties: {
      text: {
        type: "string",
        description: "Message text to post to Slack.",
      },
    },
    required: ["text"],
    additionalProperties: false,
  },
};

let buffer = "";

process.stdin.setEncoding("utf8");
process.stdin.on("data", (chunk) => {
  buffer += chunk;
  const lines = buffer.split(/\r?\n/);
  buffer = lines.pop() ?? "";

  for (const line of lines) {
    if (line.trim()) {
      handleMessage(line).catch((error) => {
        writeError(null, -32603, error instanceof Error ? error.message : String(error));
      });
    }
  }
});

async function handleMessage(line) {
  let message;
  try {
    message = JSON.parse(line);
  } catch {
    writeError(null, -32700, "Parse error");
    return;
  }

  if (!("id" in message)) {
    return;
  }

  try {
    switch (message.method) {
      case "initialize":
        writeResult(message.id, {
          protocolVersion: message.params?.protocolVersion ?? "2024-11-05",
          capabilities: {
            tools: {},
          },
          serverInfo,
        });
        break;

      case "tools/list":
        writeResult(message.id, {
          tools: [tool],
        });
        break;

      case "tools/call":
        writeResult(message.id, await callTool(message.params));
        break;

      default:
        writeError(message.id, -32601, `Unknown method: ${message.method}`);
    }
  } catch (error) {
    writeError(message.id, -32603, error instanceof Error ? error.message : String(error));
  }
}

async function callTool(params) {
  if (params?.name !== tool.name) {
    throw new Error(`Unknown tool: ${params?.name}`);
  }

  const text = params.arguments?.text;
  if (typeof text !== "string" || text.trim().length === 0) {
    throw new Error("text must be a non-empty string");
  }

  const token = process.env.SLACK_BOT_TOKEN;
  const channel = process.env.SLACK_CHANNEL_ID;

  if (!token) {
    throw new Error("Missing SLACK_BOT_TOKEN environment variable");
  }
  if (!channel) {
    throw new Error("Missing SLACK_CHANNEL_ID environment variable");
  }

  const response = await fetch("https://slack.com/api/chat.postMessage", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json; charset=utf-8",
    },
    body: JSON.stringify({ channel, text }),
  });

  const result = await response.json();
  if (!response.ok || !result.ok) {
    throw new Error(`Slack API error: ${result.error ?? response.statusText}`);
  }

  return {
    content: [
      {
        type: "text",
        text: `Posted message to ${channel} at ${result.ts}.`,
      },
    ],
  };
}

function writeResult(id, result) {
  writeMessage({
    jsonrpc: "2.0",
    id,
    result,
  });
}

function writeError(id, code, message) {
  writeMessage({
    jsonrpc: "2.0",
    id,
    error: {
      code,
      message,
    },
  });
}

function writeMessage(message) {
  process.stdout.write(`${JSON.stringify(message)}\n`);
}
