# Slack Message MCP

Tiny stdio MCP server that exposes one tool:

- `post_slack_message` posts text to the channel in `SLACK_CHANNEL_ID`

## Environment

Set these before starting the server:

```sh
export SLACK_BOT_TOKEN="xoxb-..."
export SLACK_CHANNEL_ID="C0123456789"
```

The Slack app needs `chat:write` and must be allowed to post in the target channel.

## Run

```sh
node server.js
```

## Claude Code Example

```sh
claude mcp add slack-message \
  --env SLACK_BOT_TOKEN="$SLACK_BOT_TOKEN" \
  --env SLACK_CHANNEL_ID="$SLACK_CHANNEL_ID" \
  -- node /Users/agruning/Documents/MCP/slack-message-mcp/server.js
```
