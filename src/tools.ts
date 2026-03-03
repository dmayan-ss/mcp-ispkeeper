/**
 * MCP tool definitions for ISPKeeper.
 *
 * Validated against live API on 2026-02-27 (ispkeeper_eval.json).
 * Only endpoints confirmed working (HTTP 200) are exposed.
 * FTTx endpoints kept (eval tested wrong paths).
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
  // CLIENTES
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
      contribuyente: z.string().optional().describe("Tax type: C=consumidor final, R=responsable inscripto, M=monotributo, E=exento. Comma-separated."),
      relaciones: z.string().optional().describe("Expand relations: cat,subz,locfi,locre,loc,medp,tkcli,email,adic,contel,contv,coninter,intco"),
    },
    async (params) => {
      const data = await client.listClients(params);
      return { content: [{ type: "text", text: json(data) }] };
    }
  );

  server.tool(
    "get_client",
    "Get detailed information about a specific client, including expandable relations. To get internet/TV/phone connections for a client, use relaciones=coninter,contv,contel.",
    {
      client_id: z.string().describe("Client ID"),
      relaciones: z.string().optional().describe("Expand relations: cat,subz,locfi,locre,loc,medp,tkcli,email,adic,contel,contv,coninter,intco"),
    },
    async ({ client_id, relaciones }) => {
      const data = await client.getClient(client_id, relaciones);
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

  // ──────────────────────────────────────────────
  // FACTURAS
  // ──────────────────────────────────────────────

  server.tool(
    "list_invoices",
    "List invoices with filters by date, type, point of sale. Types: FA,FB,FX (facturas), CA,CB,CX (crédito), DA,DB,DX (débito).",
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
    "Get detailed information about a specific invoice, including items or consolidated data.",
    {
      invoice_id: z.string().describe("Invoice ID"),
      include: z.enum(["detail", "items", "consolidated"]).optional()
        .describe("What to include: detail (default), items, or consolidated"),
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
        default:
          data = await client.getInvoice(invoice_id);
          break;
      }
      return { content: [{ type: "text", text: json(data) }] };
    }
  );

  // ──────────────────────────────────────────────
  // COBRANZAS
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
  // CONEXIONES INTERNET
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
    "Get detailed information about a specific internet connection.",
    {
      connection_id: z.string().describe("Internet connection ID"),
    },
    async ({ connection_id }) => {
      const data = await client.getInternetConnection(connection_id);
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
  // RED Y PLANES
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
  // INFRAESTRUCTURA FTTx
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
  // DATOS AUXILIARES (only confirmed 200)
  // ──────────────────────────────────────────────

  server.tool(
    "list_auxiliary_data",
    "List auxiliary/reference data: localities, branches, users, warehouses, client categories, or additionals catalog.",
    {
      resource: z.enum([
        "localities", "branches", "users", "warehouses",
        "client_categories", "additionals",
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
      }
      return { content: [{ type: "text", text: json(data) }] };
    }
  );

  server.tool(
    "get_network_element",
    "Get details of a specific network element: subnode, VLAN, SVLAN, user, branch, warehouse, or additional.",
    {
      element_type: z.enum([
        "subnode", "vlan", "svlan",
        "user", "branch", "warehouse", "additional",
      ]).describe("Type of element"),
      element_id: z.string().describe("Element ID"),
    },
    async ({ element_type, element_id }) => {
      let data: unknown;
      switch (element_type) {
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
      }
      return { content: [{ type: "text", text: json(data) }] };
    }
  );
}
