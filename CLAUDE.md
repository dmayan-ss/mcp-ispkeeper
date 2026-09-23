# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What This Is

Read-only MCP server for ISPKeeper (ISP management software). Exposes 32 tools that query clients, invoices, collections, internet/TV/phone connections, subscriptions, suppliers, support tickets, network status, FTTx infrastructure, and auxiliary data via the ISPKeeper REST API. All requests are GET-only.

## Commands

```bash
npm run build    # Build with esbuild → dist/index.js (single bundled ESM file)
npm run dev      # Run with tsx (hot reload, no build needed)
npm run start    # Run built output
npm run bundle   # Build + create .mcpb package for Claude App installation
```

No test framework is configured. No linter is configured.

## Architecture

Three source files in `src/`:

- **`index.ts`** — Entry point. Creates `McpServer`, calls `registerTools()`, connects via stdio transport. Top-level `await`.
- **`api-client.ts`** — `ISPKeeperClient` class with ~50 methods, each mapping to one ISPKeeper REST endpoint (`GET /api/...`). Reads `ISPKEEPER_API_KEY` and `ISPKEEPER_BASE_URL` from env at module load. All methods go through a single `get()` method that builds URLs, sets headers (`x-api-key`, `X-Requested-With`, `Accept`), and handles errors.
- **`tools.ts`** — `registerTools()` registers all 32 MCP tools using `server.tool()`. Uses Zod for input schemas. Several tools use an `include` or `resource_type` enum parameter to multiplex related API calls into a single tool (e.g., `get_client` can fetch detail, log, or payment commitment).

The pattern for adding a new tool: add API method to `ISPKeeperClient`, then register the tool in `registerTools()` with Zod schema.

## Build Details

- ESM (`"type": "module"`) — all local imports use `.js` extension
- esbuild bundles everything into a single `dist/index.js` with shebang
- Target: Node 18+
- `scripts/bundle.js` creates a `.mcpb` zip containing `manifest.json`, `package.json`, and `dist/index.js` using a custom zero-dependency zip implementation

## Platform Compatibility

Runs on Windows, Linux, and WSL without changes. No native dependencies — pure JS (Node 18+ with native `fetch`), stdio transport, and ESM. The shebang (`#!/usr/bin/env node`) enables direct execution on Unix-like systems and is harmlessly ignored on Windows.

## API Notes

- API paths use Spanish names (e.g., `/clientes`, `/facturas`, `/cobranzas`, `/conexiones-internet`)
- Many list endpoints support `relaciones` param for eager-loading related data (comma-separated short codes like `cli,usu,cat`)
- Pagination via `page` and `per_page` (default 50)
- Date filters use `altaDesde`/`altaHasta` or `logDesde`/`logHasta` format `YYYY-MM-DD`
- API paths verified against official docs at docs.anatod.com (`/llms.txt` indexes every page; append `.md` to a page URL for its OpenAPI block) **and** the live API on 2026-09-23. The docs alone are not enough: several routes the code used before (plural `/nodos`, `/pons`, `/cajas`, ...) never existed and return 404 "Ruta no soportada" — probe any new path with a real GET before adding it
- Network and FTTx list resources are singular (`/nodo`, `/subnodo`, `/vlan`, `/svlan`, `/backbone`, `/pon`, `/caja`, `/puerto`); upward traces are `/{pon|caja|puerto}/{id}/mapeo`
- `json()` in `tools.ts` masks any field whose name ends in `pass`/`password`/`secret`/`token` (the API returns router and PPPoE passwords in plain text); `ISPKEEPER_SHOW_SECRETS=1` disables it
- `node_modules` binaries may lose their exec bit when the folder is synced (Syncthing); if `npm run build` fails with `Permission denied`, `chmod +x node_modules/.bin/* node_modules/@esbuild/*/bin/esbuild`
