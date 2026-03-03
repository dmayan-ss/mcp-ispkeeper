# mcp-ispkeeper

Read-only MCP (Model Context Protocol) server for [ISPKeeper](https://ispkeeper.com) — ISP management software.

Query clients, invoices, collections, internet connections, support tickets, network status, FTTx infrastructure, and more through any MCP-compatible client (Claude Desktop, Claude Code, etc.).

## Features

- **Clients** — Search, filter, and retrieve client details with expandable relations, change logs, and payment commitments
- **Invoices** — List and inspect invoices with items, consolidated data, and PDF print links
- **Collections** — Browse payment collections with user and date filters
- **Internet Connections** — Query connections by technology, plan, status; view change logs
- **TV & Phone** — List and inspect TV and telephony service connections
- **Support Tickets** — List tickets, view details, photos, movement logs, checkin/checkout, chat attachments, and browse categories/subcategories/statuses
- **Network** — Check network status, outages, nodes, subnodes, VLANs, SVLANs, and plans
- **FTTx Infrastructure** — Navigate the fiber hierarchy: backbones, PONs, NAP boxes, ports, seals, and trace elements upward
- **Auxiliary Data** — Localities, branches, users, warehouses, payment methods, client categories, ticket metadata, and reference data

## Available Tools (27)

### Clients
| Tool | Description |
|------|-------------|
| `search_clients` | Search clients with text, date, tax status, and cut-off filters |
| `get_client` | Get client details, change log, or payment commitment check |
| `get_clients_summary` | Quick summary of total and active client counts |
| `get_client_services` | Get client invoices, collections, tickets, or additionals |
| `list_clients_log` | List change history logs across all clients with date filters |

### Invoices & Collections
| Tool | Description |
|------|-------------|
| `list_invoices` | List invoices filtered by date, type, and point of sale |
| `get_invoice` | Get invoice detail, items, consolidated data, or PDF print link |
| `list_collections` | List payment collections filtered by date and user |
| `get_collection` | Get collection detail or consolidated data |

### Service Connections
| Tool | Description |
|------|-------------|
| `list_internet_connections` | List connections filtered by technology, plan, status, client |
| `get_internet_connection` | Get internet connection details or change log |
| `list_internet_connections_log` | List change logs across all internet connections |
| `list_tv_connections` | List all TV service connections |
| `get_tv_connection` | Get details of a specific TV connection |
| `list_phone_connections` | List all phone/telephony connections |
| `get_phone_connection` | Get details of a specific phone connection |

### Support Tickets
| Tool | Description |
|------|-------------|
| `list_tickets` | List tickets filtered by date, category, status |
| `get_ticket` | Get ticket detail, photos, movement log, checkin/checkout, or chat attachments |
| `list_tickets_log` | List ticket activity logs across all tickets |

### Network & Plans
| Tool | Description |
|------|-------------|
| `get_network_status` | Get network status with optional outage date filter |
| `list_plans` | List internet plans with deleted/discontinued filters |

### FTTx Infrastructure
| Tool | Description |
|------|-------------|
| `list_fttx_infrastructure` | Query FTTx resources (backbones, PONs, boxes, ports, seals) with drill-down |
| `get_fttx_trace` | Trace a FTTx element upward: port → box → PON → backbone |

### Auxiliary & Reference Data
| Tool | Description |
|------|-------------|
| `list_auxiliary_data` | List localities, branches, users, warehouses, payment methods, ticket categories/subcategories/statuses, and more |
| `get_network_element` | Get details of a node, subnode, VLAN, SVLAN, user, branch, warehouse, additional, payment method, or ticket category/subcategory/status |

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
