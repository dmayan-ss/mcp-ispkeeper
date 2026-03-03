/**
 * MCP Server for ISPKeeper - ISP management software.
 * Read-only access to clients, invoices, collections, connections, tickets, and infrastructure.
 */

import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { registerTools } from "./tools.js";

const server = new McpServer({
  name: "ispkeeper",
  version: "0.2.0",
});

registerTools(server);

const transport = new StdioServerTransport();
await server.connect(transport);
console.error("[ISPKeeper MCP] Server started on stdio");
