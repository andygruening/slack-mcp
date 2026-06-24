export const serverInfo = {
  name: "slack-message-mcp",
  version: "0.2.0",
};

export const protocolVersion = "2024-11-05";

export const tool = {
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

export async function handleMcpRequest(message) {
  if (!message || typeof message !== "object") {
    return createError(null, -32600, "Invalid request");
  }

  if (!("id" in message)) {
    return null;
  }

  try {
    switch (message.method) {
      case "initialize":
        return createResult(message.id, {
          protocolVersion: message.params?.protocolVersion ?? protocolVersion,
          capabilities: {
            tools: {},
          },
          serverInfo,
        });

      case "tools/list":
        return createResult(message.id, {
          tools: [tool],
        });

      case "tools/call":
        return createResult(message.id, await callTool(message.params));

      default:
        return createError(message.id, -32601, `Unknown method: ${message.method}`);
    }
  } catch (error) {
    return createError(message.id, -32603, error instanceof Error ? error.message : String(error));
  }
}

export async function callTool(params) {
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

export function createResult(id, result) {
  return {
    jsonrpc: "2.0",
    id,
    result,
  };
}

export function createError(id, code, message) {
  return {
    jsonrpc: "2.0",
    id,
    error: {
      code,
      message,
    },
  };
}
