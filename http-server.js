#!/usr/bin/env node

import http from "node:http";
import { createError, handleMcpRequest } from "./mcp.js";

const port = Number.parseInt(process.env.PORT ?? "3000", 10);
const host = process.env.HOST ?? "0.0.0.0";

const httpServer = http.createServer(async (request, response) => {
  try {
    if (request.method === "GET" && new URL(request.url ?? "/", "http://localhost").pathname === "/health") {
      return writeJson(response, 200, { ok: true });
    }

    if (request.method === "OPTIONS") {
      response.writeHead(204, corsHeaders());
      response.end();
      return;
    }

    if (request.method !== "POST") {
      return writeJson(response, 405, { error: "Method not allowed" });
    }

    const pathname = new URL(request.url ?? "/", "http://localhost").pathname;
    if (pathname !== "/mcp" && pathname !== "/") {
      return writeJson(response, 404, { error: "Not found" });
    }

    const body = await readBody(request);
    let payload;
    try {
      payload = JSON.parse(body);
    } catch {
      return writeJson(response, 200, createError(null, -32700, "Parse error"));
    }

    if (Array.isArray(payload)) {
      const results = (await Promise.all(payload.map(handleMcpRequest))).filter(Boolean);
      return writeJson(response, 200, results);
    }

    const result = await handleMcpRequest(payload);
    if (!result) {
      response.writeHead(202, corsHeaders());
      response.end();
      return;
    }

    return writeJson(response, 200, result);
  } catch (error) {
    return writeJson(
      response,
      500,
      createError(null, -32603, error instanceof Error ? error.message : String(error)),
    );
  }
});

httpServer.listen(port, host, () => {
  console.error(`Slack MCP HTTP server listening on http://${host}:${port}/mcp`);
});

async function readBody(request) {
  const chunks = [];
  for await (const chunk of request) {
    chunks.push(chunk);
  }

  return Buffer.concat(chunks).toString("utf8");
}

function writeJson(response, statusCode, body) {
  response.writeHead(statusCode, {
    ...corsHeaders(),
    "Content-Type": "application/json",
  });
  response.end(JSON.stringify(body));
}

function corsHeaders() {
  return {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Headers": "content-type, mcp-protocol-version",
    "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
  };
}
