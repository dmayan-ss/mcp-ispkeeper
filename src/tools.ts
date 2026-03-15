/**
 * MCP tool definitions for ISPKeeper.
 *
 * Paths verified against official docs at anatod.readme.io (2026-03-03).
 */

import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { ISPKeeperClient } from "./api-client.js";

const client = new ISPKeeperClient();

function json(data: unknown): string {
  return JSON.stringify(data, null, 2);
}

export function registerTools(server: McpServer): void {
  // ──────────────────────────────────────────────
  // CLIENTS
  // ──────────────────────────────────────────────

  server.tool(
    "search_clients",
    "Search and list ISPKeeper clients with filters. Supports text search, date range, tax status, and more.",
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
      relaciones: z.string().optional().describe("Expand relations: cat,subz,locfi,locre,loc,medp,tkcli,email,adic,contel,contv,coninter,intco"),
    },
    async (params) => {
      const data = await client.listClients(params);
      return { content: [{ type: "text", text: json(data) }] };
    }
  );

  server.tool(
    "get_client",
    "Get detailed information about a specific client. Use include to get change log or payment commitment. Use relaciones to expand connections (coninter,contv,contel for internet/TV/phone).",
    {
      client_id: z.string().describe("Client ID"),
      include: z.enum(["detail", "log", "payment_commitment"]).optional()
        .describe("What to retrieve: detail (default), log (change history), or payment_commitment (check active commitment)"),
      relaciones: z.string().optional().describe("Expand relations (only for detail): cat,subz,locfi,locre,loc,medp,tkcli,email,adic,contel,contv,coninter,intco"),
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
        default:
          data = await client.getClient(client_id, relaciones);
          break;
      }
      return { content: [{ type: "text", text: json(data) }] };
    }
  );

  server.tool(
    "get_clients_summary",
    "Get a quick summary of total and active client counts.",
    {},
    async () => {
      const data = await client.getClientsSummary();
      return { content: [{ type: "text", text: json(data) }] };
    }
  );

  server.tool(
    "get_client_services",
    "Get services for a specific client: invoices, collections, tickets, or additionals. For internet/TV/phone connections, use get_client with relaciones=coninter,contv,contel instead.",
    {
      client_id: z.string().describe("Client ID"),
      service: z.enum([
        "invoices", "collections", "tickets", "additionals",
      ]).describe("Type of service/data to retrieve"),
    },
    async ({ client_id, service }) => {
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
      }
      return { content: [{ type: "text", text: json(data) }] };
    }
  );

  server.tool(
    "list_clients_log",
    "List change history logs across all clients. Returns database record snapshots before modifications with timestamps and users.",
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
    "List invoices with filters by date, type, point of sale. Types: FA,FB,FX (invoices), CA,CB,CX (credit notes), DA,DB,DX (debit notes).",
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
    "Get detailed information about a specific invoice, including items, consolidated data, or PDF print link.",
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
    "List payment collections with filters by date and user.",
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
    "Get details of a specific collection/payment, optionally with consolidated data.",
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
    "List internet service connections with filters. Technologies: R=Radio, T=Torre, O=ONU, H=HFC, S=Switch, P=PPPoE, D=DHCP.",
    {
      q: z.string().optional().describe("Text search"),
      page: z.number().optional().describe("Page number"),
      per_page: z.number().optional().describe("Results per page (default 50)"),
      tecnologia: z.string().optional().describe("Technology: R,T,O,H,S,P,D"),
      plan: z.string().optional().describe("Plan ID"),
      cortado: z.enum(["Y", "N"]).optional().describe("Filter cut-off connections"),
      cliente: z.string().optional().describe("Client ID"),
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
    "Get detailed information about a specific internet connection, or its change log.",
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
    "List change history logs across all internet connections with date filters.",
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
    "List TV service connections with filters by client, date, and status.",
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
    "Get detailed information about a specific TV connection.",
    {
      connection_id: z.string().describe("TV connection ID"),
    },
    async ({ connection_id }) => {
      const data = await client.getTVConnection(connection_id);
      return { content: [{ type: "text", text: json(data) }] };
    }
  );

  server.tool(
    "list_phone_connections",
    "List phone/telephony service connections (includes SSMovil mobile). Filter by client, date, cut-off status. Plans with telefonia_plan_movil=Y are mobile/SSMovil.",
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
    "Get detailed information about a specific phone/telephony connection (includes SSMovil mobile).",
    {
      connection_id: z.string().describe("Phone connection ID"),
    },
    async ({ connection_id }) => {
      const data = await client.getPhoneConnection(connection_id);
      return { content: [{ type: "text", text: json(data) }] };
    }
  );

  // ──────────────────────────────────────────────
  // TICKETS
  // ──────────────────────────────────────────────

  server.tool(
    "list_tickets",
    "List support tickets with filters by date, category, and status.",
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
    "Get detailed information about a support ticket, optionally with photos, movement log, checkin/checkout, or chat attachments.",
    {
      ticket_id: z.string().describe("Ticket ID"),
      include: z.enum(["detail", "photos", "log", "checkin", "chat_attachments"]).optional()
        .describe("What to retrieve: detail (default), photos, log (movement history), checkin (field visit checkin/checkout), or chat_attachments (chat messages and files)"),
    },
    async ({ ticket_id, include }) => {
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
        case "chat_attachments":
          data = await client.getTicketChatAttachments(ticket_id);
          break;
        default:
          data = await client.getTicket(ticket_id);
          break;
      }
      return { content: [{ type: "text", text: json(data) }] };
    }
  );

  server.tool(
    "list_tickets_log",
    "List ticket activity logs across all tickets. Returns movement/change history with timestamps and users.",
    {
      page: z.number().optional().describe("Page number"),
      per_page: z.number().optional().describe("Results per page (default 50)"),
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
    "Get current network status, optionally filtered by outage date range.",
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
    "List available internet plans, with optional filters for deleted or discontinued plans.",
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
    "Query FTTx fiber infrastructure: backbones, PONs, NAP boxes, ports, and seals. Use resource_type to select what to list. Use parent_id with resource_type to drill down the hierarchy (backbone→PONs→boxes→ports).",
    {
      resource_type: z.enum(["backbones", "pons", "boxes", "ports", "seals"])
        .describe("Type of FTTx resource to list"),
      parent_id: z.string().optional()
        .describe("Parent resource ID to drill down: backbone ID for PONs, PON ID for boxes, box ID for ports"),
    },
    async ({ resource_type, parent_id }) => {
      let data: unknown;
      switch (resource_type) {
        case "backbones":
          data = await client.listBackbones();
          break;
        case "pons":
          data = parent_id
            ? await client.getBackbonePons(parent_id)
            : await client.listPons();
          break;
        case "boxes":
          data = parent_id
            ? await client.getPonBoxes(parent_id)
            : await client.listBoxes();
          break;
        case "ports":
          data = parent_id
            ? await client.getBoxPorts(parent_id)
            : await client.listPorts();
          break;
        case "seals":
          data = await client.listSeals();
          break;
      }
      return { content: [{ type: "text", text: json(data) }] };
    }
  );

  server.tool(
    "get_fttx_trace",
    "Trace a FTTx element upward through the hierarchy. Get the full chain: port→box→PON→backbone.",
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
  // AUXILIARY DATA
  // ──────────────────────────────────────────────

  server.tool(
    "list_auxiliary_data",
    "List auxiliary/reference data: localities, branches, users, warehouses, categories, payment methods, ticket metadata, and more.",
    {
      resource: z.enum([
        "localities", "branches", "users", "warehouses",
        "client_categories", "additionals", "payment_methods",
        "nodes",
        "ticket_categories", "ticket_subcategories", "ticket_statuses",
        "extra_connection_categories",
        "how_did_you_find_us", "previous_providers", "service_cancellation_categories",
      ]).describe("Type of auxiliary data to list"),
    },
    async ({ resource }) => {
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
          data = await client.listNodes();
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
      }
      return { content: [{ type: "text", text: json(data) }] };
    }
  );

  server.tool(
    "get_network_element",
    "Get details of a specific element by type and ID: node, subnode, VLAN, SVLAN, user, branch, warehouse, additional, payment method, or ticket category/subcategory/status.",
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
