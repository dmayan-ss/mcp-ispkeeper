/**
 * MCP tool definitions for ISPKeeper.
 *
 * Paths verified against official docs at docs.anatod.com and the live API (2026-09-23).
 */

import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { ISPKeeperClient } from "./api-client.js";

const client = new ISPKeeperClient();

const HALLUCINATION_WARNING =
  "CRITICAL: This tool returns REAL business data from ISPKeeper. " +
  "If the tool call fails or is unavailable, you MUST tell the user you could not retrieve the data. " +
  "NEVER fabricate, guess, or invent client names, IDs, balances, addresses, or any other data. " +
  "Only present data that appears in the tool response below.";

const NO_FABRICATE = " ⚠️ NEVER fabricate data if this tool fails — report the error to the user instead.";

// Router, PPPoE, RADIUS and Wi-Fi passwords come back in plain text (e.g. mikrotik_pass,
// subnodo_pass, conexion_pppoe_pass). Mask them unless ISPKEEPER_SHOW_SECRETS=1.
const SHOW_SECRETS = process.env.ISPKEEPER_SHOW_SECRETS === "1";
const SECRET_KEY = /(pass(word)?|secret|token)$/i;

function redact(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(redact);
  if (value && typeof value === "object") {
    return Object.fromEntries(Object.entries(value).map(([k, v]) =>
      [k, SECRET_KEY.test(k) && v !== null && v !== "" ? "[REDACTED]" : redact(v)]));
  }
  return value;
}

function json(data: unknown): string {
  const envelope = {
    _source: "ISPKeeper API — live data",
    _retrieved_at: new Date().toISOString(),
    _warning: HALLUCINATION_WARNING,
    data: SHOW_SECRETS ? data : redact(data),
  };
  return JSON.stringify(envelope, null, 2);
}

export function registerTools(server: McpServer): void {
  // ──────────────────────────────────────────────
  // CLIENTS
  // ──────────────────────────────────────────────

  server.tool(
    "search_clients",
    "Search and list ISPKeeper clients with filters. Supports text search, date range, tax status, and more." + NO_FABRICATE,
    {
      q: z.string().optional().describe("Text search (name, address, etc.)"),
      ident: z.string().optional().describe("ID document (DNI/INE/RFC/NIF)"),
      page: z.number().optional().describe("Page number"),
      per_page: z.number().optional().describe("Results per page (default 50)"),
      cortado: z.enum(["Y", "N"]).optional().describe("Filter by cut-off status"),
      borrado: z.enum(["1", "0"]).optional().describe("Include deleted (1) or not (0, default)"),
      altaDesde: z.string().optional().describe("Created from date (YYYY-MM-DD)"),
      altaHasta: z.string().optional().describe("Created until date (YYYY-MM-DD)"),
      contribuyente: z.string().optional().describe("Tax type: C=final consumer, R=registered taxpayer, M=simplified regime, E=exempt. Comma-separated."),
      cat: z.number().optional().describe("Client category ID (see list_auxiliary_data client_categories)"),
      relaciones: z.string().optional().describe("Expand relations: cat,subz,locfi,locre,loc,medp,tkcli,email,adic,contel,contv,coninter,caja,consus,intco"),
    },
    async (params) => {
      const data = await client.listClients(params);
      return { content: [{ type: "text", text: json(data) }] };
    }
  );

  server.tool(
    "get_client",
    "Get detailed information about a specific client. Use include to get change log, payment commitments, or attached files. Use relaciones to expand connections (coninter,contv,contel,consus for internet/TV/phone/subscriptions)." + NO_FABRICATE,
    {
      client_id: z.string().describe("Client ID"),
      include: z.enum(["detail", "log", "payment_commitment", "payment_commitment_history", "files"]).optional()
        .describe("What to retrieve: detail (default), log (change history), payment_commitment (check active commitment), payment_commitment_history (all commitments), or files (attached files)"),
      relaciones: z.string().optional().describe("Expand relations (only for detail): cat,subz,locfi,locre,loc,medp,tkcli,email,adic,contel,contv,coninter,caja,consus,intco"),
    },
    async ({ client_id, include, relaciones }) => {
      let data: unknown;
      switch (include) {
        case "log":
          data = await client.getClientLog(client_id);
          break;
        case "payment_commitment":
          data = await client.checkPaymentCommitment(client_id);
          break;
        case "payment_commitment_history":
          data = await client.listPaymentCommitments(client_id);
          break;
        case "files":
          data = await client.getClientFiles(client_id);
          break;
        default:
          data = await client.getClient(client_id, relaciones);
          break;
      }
      return { content: [{ type: "text", text: json(data) }] };
    }
  );

  server.tool(
    "get_clients_summary",
    "Get a quick summary of total and active client counts." + NO_FABRICATE,
    {},
    async () => {
      const data = await client.getClientsSummary();
      return { content: [{ type: "text", text: json(data) }] };
    }
  );

  server.tool(
    "get_client_services",
    "Get services for a specific client: invoices, collections, tickets, additionals, internet/TV/phone connections, or subscriptions." + NO_FABRICATE,
    {
      client_id: z.string().describe("Client ID"),
      service: z.enum([
        "invoices", "collections", "tickets", "additionals",
        "internet_connections", "tv_connections", "phone_connections", "subscriptions",
      ]).describe("Type of service/data to retrieve"),
      page: z.number().optional().describe("Page number (connections and subscriptions only)"),
      per_page: z.number().optional().describe("Results per page (connections and subscriptions only)"),
    },
    async ({ client_id, service, page, per_page }) => {
      let data: unknown;
      switch (service) {
        case "invoices":
          data = await client.getClientInvoices(client_id);
          break;
        case "collections":
          data = await client.getClientCollections(client_id);
          break;
        case "tickets":
          data = await client.getClientTickets(client_id);
          break;
        case "additionals":
          data = await client.getClientAdditionals(client_id);
          break;
        case "internet_connections":
          data = await client.getClientConnections(client_id, "internet", { page, per_page });
          break;
        case "tv_connections":
          data = await client.getClientConnections(client_id, "television", { page, per_page });
          break;
        case "phone_connections":
          data = await client.getClientConnections(client_id, "telefonia", { page, per_page });
          break;
        case "subscriptions":
          data = await client.listSubscriptions({ cliente: Number(client_id), page, per_page });
          break;
      }
      return { content: [{ type: "text", text: json(data) }] };
    }
  );

  server.tool(
    "list_clients_log",
    "List change history logs across all clients. Returns database record snapshots before modifications with timestamps and users." + NO_FABRICATE,
    {
      page: z.number().optional().describe("Page number"),
      per_page: z.number().optional().describe("Results per page (default 50)"),
      logDesde: z.string().optional().describe("Log from date (YYYY-MM-DD)"),
      logHasta: z.string().optional().describe("Log until date (YYYY-MM-DD)"),
    },
    async (params) => {
      const data = await client.listClientsLog(params);
      return { content: [{ type: "text", text: json(data) }] };
    }
  );

  // ──────────────────────────────────────────────
  // INVOICES
  // ──────────────────────────────────────────────

  server.tool(
    "list_invoices",
    "List invoices with filters by date, type, point of sale. Types: FA,FB,FX (invoices), CA,CB,CX (credit notes), DA,DB,DX (debit notes)." + NO_FABRICATE,
    {
      page: z.number().optional().describe("Page number"),
      per_page: z.number().optional().describe("Results per page (default 50)"),
      altaDesde: z.string().optional().describe("Created from date (YYYY-MM-DD)"),
      altaHasta: z.string().optional().describe("Created until date (YYYY-MM-DD)"),
      tipo: z.string().optional().describe("Invoice type: FA,FB,FX,CA,CB,CX,DA,DB,DX (default FA,FX)"),
      puntoVenta: z.string().optional().describe("Point of sale number"),
      relaciones: z.string().optional().describe("Expand relations: cli,anurel,clitmp,facrel,tck,usu"),
    },
    async (params) => {
      const data = await client.listInvoices(params);
      return { content: [{ type: "text", text: json(data) }] };
    }
  );

  server.tool(
    "get_invoice",
    "Get detailed information about a specific invoice, including items, consolidated data, or PDF print link." + NO_FABRICATE,
    {
      invoice_id: z.string().describe("Invoice ID"),
      include: z.enum(["detail", "items", "consolidated", "print_link"]).optional()
        .describe("What to include: detail (default), items, consolidated, or print_link (PDF URL hosted on AWS, valid 30 days)"),
    },
    async ({ invoice_id, include }) => {
      let data: unknown;
      switch (include) {
        case "items":
          data = await client.getInvoiceItems(invoice_id);
          break;
        case "consolidated":
          data = await client.getInvoiceConsolidated(invoice_id);
          break;
        case "print_link":
          data = await client.getInvoicePrintLink(invoice_id);
          break;
        default:
          data = await client.getInvoice(invoice_id);
          break;
      }
      return { content: [{ type: "text", text: json(data) }] };
    }
  );

  // ──────────────────────────────────────────────
  // COLLECTIONS
  // ──────────────────────────────────────────────

  server.tool(
    "list_collections",
    "List payment collections with filters by date and user." + NO_FABRICATE,
    {
      page: z.number().optional().describe("Page number"),
      per_page: z.number().optional().describe("Results per page (default 50)"),
      altaDesde: z.string().optional().describe("Created from date (YYYY-MM-DD)"),
      altaHasta: z.string().optional().describe("Created until date (YYYY-MM-DD)"),
      usuario: z.string().optional().describe("Filter by user"),
      relaciones: z.string().optional().describe("Expand relations: cli,usu"),
    },
    async (params) => {
      const data = await client.listCollections(params);
      return { content: [{ type: "text", text: json(data) }] };
    }
  );

  server.tool(
    "get_collection",
    "Get details of a specific collection/payment, optionally with consolidated data." + NO_FABRICATE,
    {
      collection_id: z.string().describe("Collection ID"),
      consolidated: z.boolean().optional().describe("Include consolidated data instead of basic detail"),
    },
    async ({ collection_id, consolidated }) => {
      const data = consolidated
        ? await client.getCollectionConsolidated(collection_id)
        : await client.getCollection(collection_id);
      return { content: [{ type: "text", text: json(data) }] };
    }
  );

  // ──────────────────────────────────────────────
  // INTERNET CONNECTIONS
  // ──────────────────────────────────────────────

  server.tool(
    "list_internet_connections",
    "List internet service connections with filters. Technologies: R=Radio, T=Torre, O=ONU, H=HFC, S=Switch, P=PPPoE, D=DHCP." + NO_FABRICATE,
    {
      q: z.string().optional().describe("Text search"),
      page: z.number().optional().describe("Page number"),
      per_page: z.number().optional().describe("Results per page (default 50)"),
      tecnologia: z.string().optional().describe("Technology: R,T,O,H,S,P,D"),
      plan: z.string().optional().describe("Plan ID"),
      cortado: z.enum(["Y", "N"]).optional().describe("Filter cut-off connections"),
      cliente: z.string().optional().describe("Client ID"),
      suc: z.number().optional().describe("Branch ID (see list_auxiliary_data branches)"),
      altaDesde: z.string().optional().describe("Created from date (YYYY-MM-DD)"),
      altaHasta: z.string().optional().describe("Created until date (YYYY-MM-DD)"),
      relaciones: z.string().optional().describe("Expand relations: cli,boc,ip,ippub,pre,rou,sto,subz,suc,mac,vlan,svlan,loc,mik,pl,plp,caja,extra"),
    },
    async (params) => {
      const data = await client.listInternetConnections(params);
      return { content: [{ type: "text", text: json(data) }] };
    }
  );

  server.tool(
    "get_internet_connection",
    "Get detailed information about a specific internet connection, or its change log." + NO_FABRICATE,
    {
      connection_id: z.string().describe("Internet connection ID"),
      include: z.enum(["detail", "log"]).optional()
        .describe("What to retrieve: detail (default) or log (change history)"),
    },
    async ({ connection_id, include }) => {
      const data = include === "log"
        ? await client.getInternetConnectionLog(connection_id)
        : await client.getInternetConnection(connection_id);
      return { content: [{ type: "text", text: json(data) }] };
    }
  );

  server.tool(
    "list_internet_connections_log",
    "List change history logs across all internet connections with date filters." + NO_FABRICATE,
    {
      page: z.number().optional().describe("Page number"),
      per_page: z.number().optional().describe("Results per page (default 50)"),
      logDesde: z.string().optional().describe("Log from date (YYYY-MM-DD)"),
      logHasta: z.string().optional().describe("Log until date (YYYY-MM-DD)"),
    },
    async (params) => {
      const data = await client.listInternetConnectionsLog(params);
      return { content: [{ type: "text", text: json(data) }] };
    }
  );

  // ──────────────────────────────────────────────
  // TV & PHONE
  // ──────────────────────────────────────────────

  server.tool(
    "list_tv_connections",
    "List TV service connections with filters by client, date, and status." + NO_FABRICATE,
    {
      page: z.number().optional().describe("Page number"),
      per_page: z.number().optional().describe("Results per page (default 50)"),
      cliente: z.string().optional().describe("Filter by client ID"),
      altaDesde: z.string().optional().describe("Created from date (YYYY-MM-DD)"),
      altaHasta: z.string().optional().describe("Created until date (YYYY-MM-DD)"),
      eliminada: z.enum(["Y", "N"]).optional().describe("Filter deleted connections"),
      habilitada: z.enum(["Y", "N"]).optional().describe("Filter enabled connections"),
      relaciones: z.string().optional().describe("Expand relations: cli,pl"),
    },
    async (params) => {
      const data = await client.listTVConnections(params);
      return { content: [{ type: "text", text: json(data) }] };
    }
  );

  server.tool(
    "get_tv_connection",
    "Get detailed information about a specific TV connection, or its DirecTV Go account data." + NO_FABRICATE,
    {
      connection_id: z.string().describe("TV connection ID"),
      include: z.enum(["detail", "dgo"]).optional()
        .describe("What to retrieve: detail (default) or dgo (DirecTV Go account data)"),
    },
    async ({ connection_id, include }) => {
      const data = include === "dgo"
        ? await client.getTVConnectionDGO(connection_id)
        : await client.getTVConnection(connection_id);
      return { content: [{ type: "text", text: json(data) }] };
    }
  );

  server.tool(
    "list_phone_connections",
    "List phone/telephony service connections (includes SSMovil mobile). Filter by client, date, cut-off status. Plans with telefonia_plan_movil=Y are mobile/SSMovil." + NO_FABRICATE,
    {
      page: z.number().optional().describe("Page number"),
      per_page: z.number().optional().describe("Results per page (default 50)"),
      cliente: z.string().optional().describe("Filter by client ID"),
      altaDesde: z.string().optional().describe("Created from date (YYYY-MM-DD)"),
      altaHasta: z.string().optional().describe("Created until date (YYYY-MM-DD)"),
      eliminada: z.enum(["Y", "N"]).optional().describe("Filter deleted connections"),
      cortada: z.enum(["Y", "N"]).optional().describe("Filter cut-off connections"),
      relaciones: z.string().optional().describe("Expand relations: cli,pl,coni,ic"),
    },
    async (params) => {
      const data = await client.listPhoneConnections(params);
      return { content: [{ type: "text", text: json(data) }] };
    }
  );

  server.tool(
    "get_phone_connection",
    "Get detailed information about a specific phone/telephony connection (includes SSMovil mobile), or live line data from the Imowi mobile platform." + NO_FABRICATE,
    {
      connection_id: z.string().describe("Phone connection ID"),
      include: z.enum(["detail", "imowi"]).optional()
        .describe("What to retrieve: detail (default) or imowi (live SSMovil line data from Imowi: number, ICCID, holder, status)"),
    },
    async ({ connection_id, include }) => {
      const data = include === "imowi"
        ? await client.getPhoneConnectionImowi(connection_id)
        : await client.getPhoneConnection(connection_id);
      return { content: [{ type: "text", text: json(data) }] };
    }
  );

  // ──────────────────────────────────────────────
  // SUBSCRIPTIONS
  // ──────────────────────────────────────────────

  server.tool(
    "list_subscriptions",
    "List subscription services (e.g. SS Seguridad alarm monitoring) with filters by client, plan, subcategory, date, and active status." + NO_FABRICATE,
    {
      q: z.string().optional().describe("Text search"),
      page: z.number().optional().describe("Page number"),
      per_page: z.number().optional().describe("Results per page (default 50)"),
      cliente: z.number().optional().describe("Filter by client ID"),
      plan: z.number().optional().describe("Filter by subscription plan ID"),
      subcat: z.number().optional().describe("Filter by subscription subcategory ID"),
      activa: z.enum(["Y", "N"]).optional().describe("Filter active subscriptions"),
      altaDesde: z.string().optional().describe("Created from date (YYYY-MM-DD)"),
      altaHasta: z.string().optional().describe("Created until date (YYYY-MM-DD)"),
      relaciones: z.string().optional().describe("Expand relations: cli,pl,subcat,cat,subz,loc (default pl,subcat,cat,cli)"),
    },
    async (params) => {
      const data = await client.listSubscriptions(params);
      return { content: [{ type: "text", text: json(data) }] };
    }
  );

  server.tool(
    "get_subscription",
    "Get detailed information about a specific subscription service." + NO_FABRICATE,
    {
      subscription_id: z.string().describe("Subscription ID"),
    },
    async ({ subscription_id }) => {
      const data = await client.getSubscription(subscription_id);
      return { content: [{ type: "text", text: json(data) }] };
    }
  );

  server.tool(
    "list_subscription_catalog",
    "List the subscription catalog: plans, categories, or subcategories." + NO_FABRICATE,
    {
      resource: z.enum(["plans", "categories", "subcategories"]).describe("Catalog resource to list"),
      borrado: z.enum(["Y", "N"]).optional().describe("Filter deleted records"),
      parent_id: z.number().optional()
        .describe("For plans: subcategory ID. For subcategories: category ID."),
      q: z.string().optional().describe("Text search (plans only)"),
    },
    async ({ resource, borrado, parent_id, q }) => {
      let data: unknown;
      switch (resource) {
        case "plans":
          data = await client.listSubscriptionPlans({ borrado, subcat: parent_id, q });
          break;
        case "categories":
          data = await client.listSubscriptionCategories({ borrado });
          break;
        case "subcategories":
          data = await client.listSubscriptionSubcategories({ borrado, categoria: parent_id });
          break;
      }
      return { content: [{ type: "text", text: json(data) }] };
    }
  );

  // ──────────────────────────────────────────────
  // TICKETS
  // ──────────────────────────────────────────────

  server.tool(
    "list_tickets",
    "List support tickets with filters by date, category, and status." + NO_FABRICATE,
    {
      page: z.number().optional().describe("Page number"),
      per_page: z.number().optional().describe("Results per page (default 50)"),
      altaDesde: z.string().optional().describe("Created from date (YYYY-MM-DD)"),
      altaHasta: z.string().optional().describe("Created until date (YYYY-MM-DD)"),
      categoria: z.string().optional().describe("Category ID"),
      estado: z.string().optional().describe("Status ID"),
      relaciones: z.string().optional().describe("Expand relations: usu,cat"),
    },
    async (params) => {
      const data = await client.listTickets(params);
      return { content: [{ type: "text", text: json(data) }] };
    }
  );

  server.tool(
    "get_ticket",
    "Get detailed information about a support ticket, optionally with photos, movement log, checkin/checkout, materials used, or chat messages and files." + NO_FABRICATE,
    {
      ticket_id: z.string().describe("Ticket ID"),
      include: z.enum(["detail", "photos", "log", "checkin", "materials", "chat_attachments"]).optional()
        .describe("What to retrieve: detail (default), photos, log (movement history), checkin (field visit checkin/checkout), materials (stock used), or chat_attachments (ticket detail with chat messages and files)"),
      relaciones: z.string().optional().describe("Expand relations (only for detail): usu,tec,tecaco,sol,motb,suc,subn,pl,cli,clitmp,cat,subcat,asig,stat,chat,archivos,checkin"),
    },
    async ({ ticket_id, include, relaciones }) => {
      let data: unknown;
      switch (include) {
        case "photos":
          data = await client.getTicketPhotos(ticket_id);
          break;
        case "log":
          data = await client.getTicketLog(ticket_id);
          break;
        case "checkin":
          data = await client.getTicketCheckin(ticket_id);
          break;
        case "materials":
          data = await client.getTicketMaterials(ticket_id);
          break;
        case "chat_attachments":
          data = await client.getTicket(ticket_id, "chat,archivos");
          break;
        default:
          data = await client.getTicket(ticket_id, relaciones);
          break;
      }
      return { content: [{ type: "text", text: json(data) }] };
    }
  );

  server.tool(
    "list_tickets_log",
    "List ticket activity logs across all tickets. Returns movement/change history with timestamps and users." + NO_FABRICATE,
    {
      page: z.number().optional().describe("Page number"),
      per_page: z.number().optional().describe("Results per page (default 50)"),
      logDesde: z.string().optional().describe("Log from date (YYYY-MM-DD)"),
      logHasta: z.string().optional().describe("Log until date (YYYY-MM-DD)"),
    },
    async (params) => {
      const data = await client.listTicketsLog(params);
      return { content: [{ type: "text", text: json(data) }] };
    }
  );

  // ──────────────────────────────────────────────
  // NETWORK & PLANS
  // ──────────────────────────────────────────────

  server.tool(
    "get_network_status",
    "Get current network status, optionally filtered by outage date range." + NO_FABRICATE,
    {
      fechaDesdeCaida: z.string().optional().describe("Outage from date"),
      fechaHastaCaida: z.string().optional().describe("Outage until date"),
    },
    async (params) => {
      const data = await client.getNetworkStatus(params);
      return { content: [{ type: "text", text: json(data) }] };
    }
  );

  server.tool(
    "list_plans",
    "List available internet plans, with optional filters for deleted or discontinued plans." + NO_FABRICATE,
    {
      q: z.string().optional().describe("Text search"),
      borrado: z.enum(["Y", "N"]).optional().describe("Include deleted plans"),
      discontinuo: z.enum(["Y", "N"]).optional().describe("Include discontinued plans"),
    },
    async (params) => {
      const data = await client.listPlans(params);
      return { content: [{ type: "text", text: json(data) }] };
    }
  );

  // ──────────────────────────────────────────────
  // FTTx INFRASTRUCTURE
  // ──────────────────────────────────────────────

  server.tool(
    "list_fttx_infrastructure",
    "Query FTTx fiber infrastructure: backbones, PONs, NAP boxes, ports, and seals. Use resource_type to select what to list. Use parent_id to drill down the hierarchy (backbone→PONs→boxes→ports) and q for text search." + NO_FABRICATE,
    {
      resource_type: z.enum(["backbones", "pons", "boxes", "ports", "seals"])
        .describe("Type of FTTx resource to list"),
      parent_id: z.string().optional()
        .describe("Parent resource ID to drill down: backbone ID for PONs, PON ID for boxes, box ID for ports. Returns the parent with its children nested."),
      q: z.string().optional().describe("Text search (ignored when parent_id is set)"),
      libre: z.enum(["Y", "N"]).optional().describe("Seals only: Y = not linked to a connection, N = linked"),
      page: z.number().optional().describe("Page number (ignored when parent_id is set)"),
      per_page: z.number().optional().describe("Results per page (default 50; ignored when parent_id is set)"),
    },
    async ({ resource_type, parent_id, q, libre, page, per_page }) => {
      const paging = { page, per_page: per_page ?? 50 };
      let data: unknown;
      switch (resource_type) {
        case "backbones":
          data = await client.listBackbones({ q, ...paging });
          break;
        case "pons":
          data = parent_id
            ? await client.getBackbonePons(parent_id)
            : await client.listPons({ q, ...paging });
          break;
        case "boxes":
          data = parent_id
            ? await client.getPonBoxes(parent_id)
            : await client.listBoxes({ q, ...paging });
          break;
        case "ports":
          data = parent_id
            ? await client.getBoxPorts(parent_id)
            : await client.listPorts({ q, ...paging });
          break;
        case "seals":
          data = await client.listSeals({ libre, q, ...paging });
          break;
      }
      return { content: [{ type: "text", text: json(data) }] };
    }
  );

  server.tool(
    "get_fttx_trace",
    "Trace a FTTx element upward through the hierarchy. Get the full chain: port→box→PON→backbone." + NO_FABRICATE,
    {
      resource_type: z.enum(["port", "box", "pon"])
        .describe("Type of resource to trace from"),
      resource_id: z.string().describe("Resource ID"),
    },
    async ({ resource_type, resource_id }) => {
      let data: unknown;
      switch (resource_type) {
        case "port":
          data = await client.getPortBoxPonBackbone(resource_id);
          break;
        case "box":
          data = await client.getBoxPonBackbone(resource_id);
          break;
        case "pon":
          data = await client.getPonBackbone(resource_id);
          break;
      }
      return { content: [{ type: "text", text: json(data) }] };
    }
  );

  // ──────────────────────────────────────────────
  // SUPPLIERS
  // ──────────────────────────────────────────────

  server.tool(
    "list_suppliers",
    "List suppliers (proveedores) with filters by text, locality, VAT type, and deleted status." + NO_FABRICATE,
    {
      q: z.string().optional().describe("Text search"),
      borrado: z.enum(["Y", "N"]).optional().describe("Filter deleted suppliers (API default N)"),
      loc: z.number().optional().describe("Locality ID"),
      iva: z.string().optional().describe("VAT type code"),
      relaciones: z.string().optional().describe("Expand relations: loc,cat"),
    },
    async (params) => {
      const data = await client.listSuppliers(params);
      return { content: [{ type: "text", text: json(data) }] };
    }
  );

  server.tool(
    "get_supplier",
    "Get detailed information about a specific supplier." + NO_FABRICATE,
    {
      supplier_id: z.string().describe("Supplier ID"),
      relaciones: z.string().optional().describe("Expand relations: loc,cat"),
    },
    async ({ supplier_id, relaciones }) => {
      const data = await client.getSupplier(supplier_id, relaciones);
      return { content: [{ type: "text", text: json(data) }] };
    }
  );

  server.tool(
    "list_supplier_invoices",
    "List supplier invoices (facturas de proveedores) with filters by date, point of sale, voided and deleted status." + NO_FABRICATE,
    {
      page: z.number().optional().describe("Page number"),
      per_page: z.number().optional().describe("Results per page (default 50)"),
      fechadesde: z.string().optional().describe("Invoice date from (YYYY-MM-DD)"),
      fechahasta: z.string().optional().describe("Invoice date until (YYYY-MM-DD)"),
      puntoventa: z.number().optional().describe("Point of sale number"),
      anulado: z.enum(["Y", "N"]).optional().describe("Filter voided invoices (API default N)"),
      borrado: z.enum(["Y", "N"]).optional().describe("Filter deleted invoices (API default N)"),
      relaciones: z.string().optional().describe("Expand relations: prov (default)"),
    },
    async (params) => {
      const data = await client.listSupplierInvoices(params);
      return { content: [{ type: "text", text: json(data) }] };
    }
  );

  server.tool(
    "get_supplier_invoice",
    "Get a specific supplier invoice, or its tax lines." + NO_FABRICATE,
    {
      invoice_id: z.string().describe("Supplier invoice ID"),
      include: z.enum(["detail", "taxes"]).optional()
        .describe("What to retrieve: detail (default) or taxes (tax lines of the invoice)"),
    },
    async ({ invoice_id, include }) => {
      const data = include === "taxes"
        ? await client.listSupplierInvoiceTaxes(invoice_id)
        : await client.getSupplierInvoice(invoice_id);
      return { content: [{ type: "text", text: json(data) }] };
    }
  );

  // ──────────────────────────────────────────────
  // AUXILIARY DATA
  // ──────────────────────────────────────────────

  server.tool(
    "list_auxiliary_data",
    "List auxiliary/reference data: localities, branches, users, warehouses, categories, payment methods, ticket metadata, and more." + NO_FABRICATE,
    {
      resource: z.enum([
        "localities", "branches", "users", "warehouses",
        "client_categories", "additionals", "payment_methods",
        "nodes", "subnodes", "vlans", "svlans",
        "ticket_categories", "ticket_subcategories", "ticket_statuses",
        "extra_connection_categories",
        "how_did_you_find_us", "previous_providers", "service_cancellation_categories",
        "supplier_tax_categories",
      ]).describe("Type of auxiliary data to list"),
      include_deleted: z.boolean().optional()
        .describe("nodes/subnodes/vlans/svlans only: true = deleted records, false = active records, omitted = API default"),
    },
    async ({ resource, include_deleted }) => {
      const yn = include_deleted === undefined ? undefined : include_deleted ? "Y" as const : "N" as const;
      let data: unknown;
      switch (resource) {
        case "localities":
          data = await client.listLocalities();
          break;
        case "branches":
          data = await client.listBranches();
          break;
        case "users":
          data = await client.listUsers();
          break;
        case "warehouses":
          data = await client.listWarehouses();
          break;
        case "client_categories":
          data = await client.listClientCategories();
          break;
        case "additionals":
          data = await client.listAdditionals();
          break;
        case "payment_methods":
          data = await client.listPaymentMethods();
          break;
        case "nodes":
          data = await client.listNodes({ borrado: include_deleted === undefined ? undefined : include_deleted ? 1 : 0 });
          break;
        case "subnodes":
          data = await client.listSubnodes({ borrado: yn });
          break;
        case "vlans":
          data = await client.listVlans({ borrado: yn });
          break;
        case "svlans":
          data = await client.listSvlans({ borrado: yn });
          break;
        case "ticket_categories":
          data = await client.listTicketCategories();
          break;
        case "ticket_subcategories":
          data = await client.listTicketSubcategories();
          break;
        case "ticket_statuses":
          data = await client.listTicketStatuses();
          break;
        case "extra_connection_categories":
          data = await client.listExtraConnectionCategories();
          break;
        case "how_did_you_find_us":
          data = await client.listHowDidYouFindUs();
          break;
        case "previous_providers":
          data = await client.listPreviousProviders();
          break;
        case "service_cancellation_categories":
          data = await client.listServiceCancellationCategories();
          break;
        case "supplier_tax_categories":
          data = await client.listSupplierTaxCategories();
          break;
      }
      return { content: [{ type: "text", text: json(data) }] };
    }
  );

  server.tool(
    "get_network_element",
    "Get details of a specific element by type and ID: node, subnode, VLAN, SVLAN, user, branch, warehouse, additional, payment method, or ticket category/subcategory/status." + NO_FABRICATE,
    {
      element_type: z.enum([
        "node", "subnode", "vlan", "svlan",
        "user", "branch", "warehouse", "additional",
        "payment_method",
        "ticket_category", "ticket_subcategory", "ticket_status",
      ]).describe("Type of element"),
      element_id: z.string().describe("Element ID"),
    },
    async ({ element_type, element_id }) => {
      let data: unknown;
      switch (element_type) {
        case "node":
          data = await client.getNode(element_id);
          break;
        case "subnode":
          data = await client.getSubnode(element_id);
          break;
        case "vlan":
          data = await client.getVlan(element_id);
          break;
        case "svlan":
          data = await client.getSvlan(element_id);
          break;
        case "user":
          data = await client.getUser(element_id);
          break;
        case "branch":
          data = await client.getBranch(element_id);
          break;
        case "warehouse":
          data = await client.getWarehouse(element_id);
          break;
        case "additional":
          data = await client.getAdditional(element_id);
          break;
        case "payment_method":
          data = await client.getPaymentMethod(element_id);
          break;
        case "ticket_category":
          data = await client.getTicketCategory(element_id);
          break;
        case "ticket_subcategory":
          data = await client.getTicketSubcategory(element_id);
          break;
        case "ticket_status":
          data = await client.getTicketStatus(element_id);
          break;
      }
      return { content: [{ type: "text", text: json(data) }] };
    }
  );
}
