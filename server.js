#!/usr/bin/env node

import { createError, handleMcpRequest } from "./mcp.js";

let buffer = "";

process.stdin.setEncoding("utf8");
process.stdin.on("data", (chunk) => {
  buffer += chunk;
  const lines = buffer.split(/\r?\n/);
  buffer = lines.pop() ?? "";

  for (const line of lines) {
    if (line.trim()) {
      handleMessage(line).catch((error) => {
        writeMessage(createError(null, -32603, error instanceof Error ? error.message : String(error)));
      });
    }
  }
});

async function handleMessage(line) {
  let message;
  try {
    message = JSON.parse(line);
  } catch {
    writeMessage(createError(null, -32700, "Parse error"));
    return;
  }

  const response = await handleMcpRequest(message);
  if (response) {
    writeMessage(response);
  }
}

function writeMessage(message) {
  process.stdout.write(`${JSON.stringify(message)}\n`);
}
