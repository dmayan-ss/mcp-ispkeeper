# mcp-ispkeeper

Read-only MCP (Model Context Protocol) server for [ISPKeeper](https://ispkeeper.com) — ISP management software.

Query clients, invoices, collections, internet connections, support tickets, network status, FTTx infrastructure, and more through any MCP-compatible client (Claude Desktop, Claude Code, etc.).

## Features

- **Clients** — Search, filter, and retrieve client details with expandable relations (connections, billing, categories)
- **Invoices** — List and inspect invoices with items and consolidated data
- **Collections** — Browse payment collections with user and date filters
- **Internet Connections** — Query connections by technology, plan, status, and more
- **Support Tickets** — List tickets, view details, photos, movement logs, checkin/checkout records, and chat attachments
- **Network** — Check network status and outages, list plans
- **FTTx Infrastructure** — Navigate the fiber hierarchy: backbones, PONs, NAP boxes, ports, seals, and trace elements upward
- **Auxiliary Data** — Localities, branches, users, warehouses, client categories, additionals

## Available Tools

| Tool | Description |
|------|-------------|
| `search_clients` | Search clients with text, date, tax status, and cut-off filters |
| `get_client` | Get client details with expandable relations (internet/TV/phone via `relaciones`) |
| `get_clients_summary` | Quick summary of total and active client counts |
| `get_client_services` | Get client invoices, collections, tickets, or additionals |
| `list_invoices` | List invoices filtered by date, type, and point of sale |
| `get_invoice` | Get invoice detail, items, or consolidated data |
| `list_collections` | List payment collections filtered by date and user |
| `get_collection` | Get collection detail or consolidated data |
| `list_internet_connections` | List connections filtered by technology, plan, status, client |
| `get_internet_connection` | Get full details of an internet connection |
| `list_tickets` | List support tickets filtered by date, category, status |
| `get_ticket` | Get ticket detail, photos, movement log, checkin/checkout, or chat attachments |
| `list_tickets_log` | List ticket activity logs across all tickets |
| `get_network_status` | Get network status with optional outage date filter |
| `list_plans` | List internet plans with deleted/discontinued filters |
| `list_fttx_infrastructure` | Query FTTx resources (backbones, PONs, boxes, ports, seals) with drill-down |
| `get_fttx_trace` | Trace a FTTx element upward: port → box → PON → backbone |
| `list_auxiliary_data` | List localities, branches, users, warehouses, categories, additionals |
| `get_network_element` | Get details of a subnode, VLAN, SVLAN, user, branch, warehouse, or additional |

## Installation

### Claude Desktop / Claude Code (MCP config)

Add to your MCP settings:

```json
{
  "mcpServers": {
    "ispkeeper": {
      "command": "node",
      "args": ["path/to/mcp-ispkeeper/dist/index.js"],
      "env": {
        "ISPKEEPER_API_KEY": "your-api-key",
        "ISPKEEPER_BASE_URL": "https://api.anatod.ar"
      }
    }
  }
}
```

### From source

```bash
git clone https://github.com/dmayan-ss/mcp-ispkeeper.git
cd mcp-ispkeeper
npm install
npm run build
```

## Configuration

| Environment Variable | Required | Default | Description |
|---------------------|----------|---------|-------------|
| `ISPKEEPER_API_KEY` | Yes | — | ISPKeeper API key (`x-api-key` header) |
| `ISPKEEPER_BASE_URL` | No | `https://api.anatod.ar` | Base URL of your ISPKeeper instance |

## Development

```bash
npm run dev      # Run with tsx (hot reload)
npm run build    # Build with esbuild
npm run bundle   # Build + create .mcpb package
```

## License

MIT
