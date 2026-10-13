# 0011. Serve MCP from the token API, as a stateless HTTP endpoint

**Status:** Accepted. Extends [0007](0007-token-api-for-the-browser-extension.md).

## Context

People keep prompts, commands and snippets in BitBin and do much of their work beside an AI assistant. The assistant should be able to look something up in the bin and save what it just worked out, when asked to. The Model Context Protocol (MCP) is how assistants such as Claude connect to outside tools.

An MCP server can run on the user's machine (a package started over stdio) or be a URL the assistant connects to. A local package has to be published, installed and kept up to date, and it would be a second codebase calling the token API from outside. The token API until now could only write: the extension and the desktop app never read items back.

## Decision

- **A remote endpoint in the app**: `POST /api/v1/mcp`, authenticated by the same personal access tokens as the rest of `/api/v1`. Connecting is one command and a token; there is nothing to install.
- **Stateless Streamable HTTP, written by hand.** Each request carries a JSON-RPC message and gets a JSON answer. No sessions and no server-sent stream: the tools are plain request and response, the app runs on serverless functions, and the four methods needed (`initialize`, `ping`, `tools/list`, `tools/call`) are small enough that a dependency would add more than it saves.
- **Four tools**: search, read one item, list collections, save an item. Each calls the library code the app already uses (`searchItems`, `getItemById`, `createItemForUser`, `createCollectionForUser`), so limits and validation are shared.
- **A new scope, `items:read`**, for searching and reading, also exposed as `GET /api/v1/items` and `GET /api/v1/items/{id}`. Each tool names the scope it needs; a token sees only the tools it may use.
- **No AI tools.** The assistant chooses tags and titles itself, so the MCP server never spends the user's AI quota.

## Consequences

- An assistant holding a token with `items:read` can read everything in the bin. The permission is separate, named for what it does in Settings, and a token can be made without it.
- Stored files stay out: an item's file name and size are returned, never its address or bytes.
- The protocol code is ours to keep current. A new protocol revision means adding it to `MCP_PROTOCOL_VERSIONS` and checking what changed.
- An assistant adds to the bin; changing or removing what is there stays in the app.
