# mcp-ispkeeper

Read-only MCP (Model Context Protocol) server for [ISPKeeper](https://ispkeeper.com) — ISP management software.

Query clients, invoices, collections, internet connections, support tickets, network status, FTTx infrastructure, and more through any MCP-compatible client (Claude Desktop, Claude Code, etc.).

## Features

- **Clients** — Search, filter, and retrieve client details with expandable relations, change logs, and payment commitments
- **Invoices** — List and inspect invoices with items, consolidated data, and PDF print links
- **Collections** — Browse payment collections with user and date filters
- **Internet Connections** — Query connections by technology, plan, status; view change logs
- **TV & Phone** — List and inspect TV and telephony service connections, DirecTV Go data, and live SSMovil line data from Imowi
- **Subscriptions** — Subscription services (e.g. alarm monitoring) and their plan/category catalog
- **Suppliers** — Suppliers, supplier invoices, and their tax lines
- **Support Tickets** — List tickets, view details, photos, movement logs, checkin/checkout, chat attachments, and browse categories/subcategories/statuses
- **Network** — Check network status, outages, nodes, subnodes, VLANs, SVLANs, and plans
- **FTTx Infrastructure** — Navigate the fiber hierarchy: backbones, PONs, NAP boxes, ports, seals, and trace elements upward
- **Auxiliary Data** — Localities, branches, users, warehouses, payment methods, client categories, ticket metadata, and reference data

## Available Tools (34)

### Ticket integration
| Tool | Description |
|------|-------------|
| `search_ticket_clients` | Find candidates by client ID, DNI/CUIT, name, or mobile, returning only identity/contact fields |
| `list_client_connections` | List a selected client's Internet, TV, or phone connections, with verified ownership and minimal fields |

Name and mobile both use the API's general `q` search, preserving the entered
text. Results are candidates and may match another field. DNI/CUIT uses `ident`;
client ID uses `/cliente/{cliente_id}`. Choose the intended client explicitly.
These tools do not create or update tickets or services.

```json
{"search_by":"mobile","query":"+54 9 2902 123456","page":1,"per_page":20}
```

Use the returned `cliente_id` in the next call:

```json
{"client_id":"42","service_type":"internet","page":1,"per_page":20}
```

`service_type` accepts `internet`, `television`, and `telefonia`. Connection
results include `connection_id`, `client_id`, and `service_type`; store the
service type along with its ID because different services have separate ID
spaces. Follow `has_more` using the next `page`. `upstream_total` is the API's
candidate count. List searches allow 1–50 results per page. An unknown direct
client ID is an API error, not an invented or empty client record.

Only these two tools use minimal field projections. The general-purpose tools
return full API data, with password fields masked (see `ISPKEEPER_SHOW_SECRETS`).
All HTTP calls have a 20-second timeout, an 8 MiB response limit, disabled
redirects, and sanitized errors (`ISPKeeper API HTTP <status>`).

Contract sources reviewed on 2026-09-18:
[API introduction](https://docs.anatod.com/reference/inicio),
[client search](https://docs.anatod.com/reference/obtener-clientes), and
[client Internet connections](https://docs.anatod.com/reference/obtener-conexiones-de-internet-de-cliente).

### Clients
| Tool | Description |
|------|-------------|
| `search_clients` | Search clients with text, date, tax status, and cut-off filters |
| `get_client` | Get client details, change log, payment commitment (current or history), or attached files |
| `get_clients_summary` | Quick summary of total and active client counts |
| `get_client_services` | Get client invoices, collections, tickets, additionals, internet/TV/phone connections, or subscriptions |
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
| `get_tv_connection` | Get details of a specific TV connection, or its DirecTV Go data |
| `list_phone_connections` | List all phone/telephony connections |
| `get_phone_connection` | Get details of a specific phone connection, or live SSMovil line data from Imowi |

### Subscriptions
| Tool | Description |
|------|-------------|
| `list_subscriptions` | List subscriptions filtered by client, plan, subcategory, date, active status |
| `get_subscription` | Get details of a specific subscription |
| `list_subscription_catalog` | List subscription plans, categories, or subcategories |

### Support Tickets
| Tool | Description |
|------|-------------|
| `list_tickets` | List tickets filtered by date, category, status |
| `get_ticket` | Get ticket detail, photos, movement log, checkin/checkout, materials, or chat messages and files |
| `list_tickets_log` | List ticket activity logs across all tickets with date filters |

### Network & Plans
| Tool | Description |
|------|-------------|
| `get_network_status` | Get network status with optional outage date filter |
| `list_plans` | List internet plans with deleted/discontinued filters |

### FTTx Infrastructure
| Tool | Description |
|------|-------------|
| `list_fttx_infrastructure` | Query FTTx resources (backbones, PONs, boxes, ports, seals) with drill-down, text search, and paging |
| `get_fttx_trace` | Trace a FTTx element upward: port → box → PON → backbone |

### Suppliers
| Tool | Description |
|------|-------------|
| `list_suppliers` | List suppliers filtered by text, locality, VAT type |
| `get_supplier` | Get details of a specific supplier |
| `list_supplier_invoices` | List supplier invoices filtered by date, point of sale, voided/deleted |
| `get_supplier_invoice` | Get a supplier invoice or its tax lines |

### Auxiliary & Reference Data
| Tool | Description |
|------|-------------|
| `list_auxiliary_data` | List localities, branches, users, warehouses, payment methods, nodes, subnodes, VLANs, SVLANs, ticket categories/subcategories/statuses, supplier tax categories, and more |
| `get_network_element` | Get details of a node, subnode, VLAN, SVLAN, user, branch, warehouse, additional, payment method, or ticket category/subcategory/status |

## Usage Guide for Agents

### Response format

Every tool returns one JSON text block wrapped in an envelope:

```json
{ "_source": "ISPKeeper API — live data", "_retrieved_at": "<ISO timestamp>", "_warning": "...", "data": <API response> }
```

List endpoints return a Laravel paginator in `data`: the records are in `data.data`, next to `current_page`, `last_page`, `per_page`, `total` and `next_page_url`. Read `total` before concluding that a search found nothing or everything, and walk `page` while `current_page < last_page`. Detail endpoints return the record object directly. A few return a bare array, where `[]` means nothing found (client files, ticket photos/checkin/materials).

Password fields come back as `"[REDACTED]"` (see `ISPKEEPER_SHOW_SECRETS`). That is intentional, not missing data.

### Common tasks

| Goal | Call |
|---|---|
| Pick a client and one of its services for a ticket | `search_ticket_clients` then `list_client_connections` (minimal fields, ownership checked) |
| Find a client by DNI/CUIT | `search_clients` with `ident` (can return several records) |
| Find a client by name, address or phone number | `search_clients` with `q` |
| Include deleted clients | `search_clients` with `borrado: "1"` (default `"0"` hides them) |
| A client's internet / TV / phone services | `get_client_services` with `service: internet_connections \| tv_connections \| phone_connections` |
| A client's subscriptions | `get_client_services` with `service: subscriptions` (filters `list_subscriptions` by client; the API has no client-scoped route) |
| A client's billing history | `get_client_services` with `invoices` or `collections` |
| SSMovil line status, consumption, bonuses | `get_phone_connection` with `include: "imowi"` (live query to the Imowi platform; returns `{ok, data}`) |
| Chat messages and files of a ticket | `get_ticket` with `include: "chat_attachments"` |
| NAP box / PON / backbone of an internet connection | `get_internet_connection` → `conexion_boca_ftth` is the FTTx port ID → `get_fttx_trace` with `resource_type: "port"` returns `{puerto, caja, pon, backbone}`. Alternatively `list_internet_connections` with `relaciones: "boc"` nests the port and its box |
| Ports of a NAP box / boxes of a PON | `list_fttx_infrastructure` with `parent_id` |
| Network nodes | `list_auxiliary_data` with `resource: "nodes"`. A node in ISPKeeper is a MikroTik router (`mikrotik_*` fields) |

### Gotchas

- **Drill-down shape:** `list_fttx_infrastructure` with `parent_id` returns the *parent* object with its children nested (`pon` under a backbone, `caja` under a PON, `puerto` under a box), not a paginator. `q`, `page` and `per_page` are ignored in that mode.
- **FTTx lists are large:** thousands of boxes and tens of thousands of ports. Use `q` or `parent_id`. The tool defaults to `per_page: 50`; the raw API would return 1000.
- **`tecnologia` codes are instance-specific:** the docs list R,T,O,H,S,P,D, but a given instance may use others (e.g. H, S, Q, U) and a documented code can match nothing. Look at `conexion_tipo` on existing records first.
- **Deleted flags differ per resource:** clients use `borrado: "1" | "0"`, most other resources `"Y" | "N"`, nodes `1 | 0`. `list_auxiliary_data` hides this behind `include_deleted: true | false`.
- **Negative client IDs are real clients** (e.g. `-100`): records imported from the system that preceded ISPKeeper, about 11 years ago (confirmed by the ISPKeeper developer). The API serves them like any other client; do not treat them as test or invalid records, and never validate IDs as positive-only.
- **ID parameters are strings** (`client_id: "2"`); numeric filters such as `cat`, `suc` or `cliente` on `list_subscriptions` are numbers.
- **Relations:** `relaciones` takes comma-separated codes that expand related records in the same call (e.g. `get_client` with `relaciones: "coninter,contv,contel,consus"`). Codes per resource are in each tool's parameter description and in `ispkeeper-api-spec.md`.
- **Dates** are `YYYY-MM-DD`. `list_invoices` defaults to types `FA,FX` unless `tipo` is set.
- **SSMovil** mobile lines are phone connections with an ICCID; the API has no separate mobile service.

## Installation

### Claude Desktop / Claude Code (MCP config)

Add to your MCP settings, adjusting the path for your platform:

**Windows**
```json
{
  "mcpServers": {
    "ispkeeper": {
      "command": "node",
      "args": ["C:\\path\\to\\mcp-ispkeeper\\dist\\index.js"],
      "env": {
        "ISPKEEPER_API_KEY": "your-api-key",
        "ISPKEEPER_BASE_URL": "https://api.anatod.ar"
      }
    }
  }
}
```

**Linux / WSL**
```json
{
  "mcpServers": {
    "ispkeeper": {
      "command": "node",
      "args": ["/path/to/mcp-ispkeeper/dist/index.js"],
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

## Platform Compatibility

Works on **Windows**, **Linux**, and **WSL** with no changes. Requirements:

- Node.js >= 18 (uses native `fetch`)
- No native/compiled dependencies — pure JavaScript
- Stdio transport works across all platforms
- The shebang (`#!/usr/bin/env node`) allows direct execution on Unix-like systems and is ignored on Windows

## Configuration

| Environment Variable | Required | Default | Description |
|---------------------|----------|---------|-------------|
| `ISPKEEPER_API_KEY` | Yes | — | ISPKeeper API key (`x-api-key` header) |
| `ISPKEEPER_BASE_URL` | No | `https://api.anatod.ar` | Base URL of your ISPKeeper instance |
| `ISPKEEPER_SHOW_SECRETS` | No | — | Set to `1` to return password fields unmasked. By default any field ending in `pass`, `password`, `secret` or `token` (router, PPPoE, RADIUS, Wi-Fi passwords) is replaced with `[REDACTED]` |

## Development

```bash
npm test         # Isolated contract and projection tests (no credentials)
npm run typecheck # TypeScript validation
npm run dev      # Run with tsx (hot reload)
npm run build    # Build with esbuild
npm run bundle   # Build + create .mcpb package
ISPKEEPER_API_KEY=... npm run smoke   # Live smoke test of every tool (GET-only)
```

### Optional live validation

After building, run `ISPKEEPER_API_KEY_FILE=/path/to/key node tests/live-ticket-tools.mjs`.
The key file must contain only the API key. This explicitly performs read-only
requests against the real API and requires a dataset with an Internet connection
and a recent client with a mobile number. It prints check outcomes, not record
values. Upstream may retain normal access logs. The live check is separate from
`npm test` and never runs automatically.

## License

MIT
