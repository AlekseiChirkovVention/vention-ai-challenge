---
trigger: model_decision
description: Use when working on task-4 (MCP server implementation)
---
MCP tactics:
- Use the official SDK (`@modelcontextprotocol/sdk` for TS, `mcp` for Python). No hand-rolled JSON-RPC.
- Stdio transport by default; HTTP only if spec demands.
- Implement only the capability(ies) required (tools / resources / prompts). Don't expose extras.
- Each tool: strict input schema, narrow description, deterministic output, explicit errors.
- Verify with `mcp` inspector or a minimal client script — list tools, call each tool, assert response shape.
- README: install command, run command, sample client snippet, list of exposed capabilities.
