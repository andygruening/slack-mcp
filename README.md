# Slack Message MCP

Tiny MCP server that exposes one tool over stdio or HTTP:

- `post_slack_message` posts text to the Slack channel ID provided by the caller

## Environment

Set these before starting the server:

```sh
export SLACK_BOT_TOKEN="xoxb-..."
```

The Slack app needs `chat:write` and must be allowed to post in the target channel.

Optional for the HTTP server:

```sh
export PORT="3000"
```

The HTTP server does not perform app-level authentication. Deploy it only where the
managed agent runtime or private network controls who can reach the endpoint.

## Run Locally With Stdio

```sh
node server.js
```

## Claude Code Example

```sh
claude mcp add slack-message \
  --env SLACK_BOT_TOKEN="$SLACK_BOT_TOKEN" \
  -- node /Users/agruning/Documents/MCP/slack-message-mcp/server.js
```

## Run As Remote HTTP MCP

Claude managed agents and the Claude API MCP connector cannot connect to local stdio
servers. Deploy the HTTP server behind a public HTTPS URL:

```sh
npm run start:http
```

The MCP endpoint is:

```text
POST /mcp
```

Health check:

```text
GET /health
```

Claude managed agent / Messages API shape:

```json
{
  "mcp_servers": [
    {
      "type": "url",
      "url": "https://your-domain.example.com/mcp",
      "name": "Slack"
    }
  ],
  "tools": [
    {
      "type": "mcp_toolset",
      "mcp_server_name": "Slack",
      "default_config": {
        "enabled": false
      },
      "configs": {
        "post_slack_message": {
          "enabled": true
        }
      }
    }
  ]
}
```

Use the beta header required by Anthropic's MCP connector:

```http
anthropic-beta: mcp-client-2025-11-20
```

Tool call arguments:

```json
{
  "channel": "C0123456789",
  "text": "Hello from MCP"
}
```
