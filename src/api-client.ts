/**
 * HTTP client for ISPKeeper API.
 * All requests are read-only (GET).
 *
 * Paths verified against official docs at anatod.readme.io (2026-03-03).
 */

const API_KEY = process.env.ISPKEEPER_API_KEY ?? "";
const BASE_URL = (process.env.ISPKEEPER_BASE_URL ?? "https://api.anatod.ar").replace(/\/+$/, "");

interface RequestParams {
  [key: string]: string | number | undefined;
}

export class ISPKeeperClient {
  private headers: Record<string, string>;

  constructor() {
    if (!API_KEY) {
      console.error("[ISPKeeper] WARNING: ISPKEEPER_API_KEY is not set");
    }
    this.headers = {
      "x-api-key": API_KEY,
      "X-Requested-With": "XMLHttpRequest",
      "Accept": "application/json",
    };
  }

  /**
   * Generic GET request to the ISPKeeper API.
   */
  async get(endpoint: string, params?: RequestParams): Promise<unknown> {
    const url = new URL(`${BASE_URL}/api${endpoint}`);

    if (params) {
      for (const [key, value] of Object.entries(params)) {
        if (value !== undefined && value !== "") {
          url.searchParams.set(key, String(value));
        }
      }
    }

    const response = await fetch(url.toString(), {
      method: "GET",
      headers: this.headers,
    });

    if (!response.ok) {
      const body = await response.text().catch(() => "");
      throw new Error(
        `ISPKeeper API error: ${response.status} ${response.statusText}${body ? ` - ${body}` : ""}`
      );
    }

    return response.json();
  }

  // ─── Clientes (ALL OK) ───────────────────────────────────

  async listClients(params?: {
    relaciones?: string;
    page?: number;
    per_page?: number;
    borrado?: "1" | "0";
    cortado?: "Y" | "N";
    altaDesde?: string;
    altaHasta?: string;
    contribuyente?: string;
    q?: string;
    ident?: string;
  }) {
    return this.get("/clientes", {
      relaciones: params?.relaciones ?? "cat,subz",
      page: params?.page,
      per_page: params?.per_page ?? 50,
      borrado: params?.borrado ?? "0",
      cortado: params?.cortado,
      altaDesde: params?.altaDesde,
      altaHasta: params?.altaHasta,
      contribuyente: params?.contribuyente,
      q: params?.q,
      ident: params?.ident,
    });
  }

  async getClient(clienteId: string, relaciones?: string) {
    return this.get(`/cliente/${clienteId}`, {
      relaciones: relaciones ?? "cat,subz",
    });
  }

  async getClientsSummary() {
    return this.get("/clientes/resumen");
  }

  // ─── Servicios por Cliente (only confirmed 200) ──────────

  async getClientInvoices(clienteId: string) {
    return this.get(`/cliente/${clienteId}/facturas`);
  }

  async getClientCollections(clienteId: string) {
    return this.get(`/cliente/${clienteId}/cobranzas`);
  }

  async getClientTickets(clienteId: string) {
    return this.get(`/cliente/${clienteId}/tickets`);
  }

  async getClientAdditionals(clienteId: string) {
    return this.get(`/cliente/${clienteId}/adicionales`);
  }

  async getClientLog(clienteId: string, params?: {
    page?: number;
    per_page?: number;
  }) {
    return this.get(`/cliente-log/${clienteId}`, {
      page: params?.page,
      per_page: params?.per_page ?? 50,
    });
  }

  async listClientsLog(params?: {
    page?: number;
    per_page?: number;
    logDesde?: string;
    logHasta?: string;
  }) {
    return this.get("/clientes-log", {
      page: params?.page,
      per_page: params?.per_page ?? 50,
      logDesde: params?.logDesde,
      logHasta: params?.logHasta,
    });
  }

  async checkPaymentCommitment(clienteId: string) {
    return this.get(`/cliente/${clienteId}/compromiso-pago/check`);
  }

  async listClientCategories() {
    return this.get("/categorias-cliente");
  }

  // ─── Facturas ──────────────────────────────────────────

  async listInvoices(params?: {
    relaciones?: string;
    page?: number;
    per_page?: number;
    altaDesde?: string;
    altaHasta?: string;
    tipo?: string;
    puntoVenta?: string;
  }) {
    return this.get("/facturas", {
      relaciones: params?.relaciones ?? "cli,usu",
      page: params?.page,
      per_page: params?.per_page ?? 50,
      altaDesde: params?.altaDesde,
      altaHasta: params?.altaHasta,
      tipo: params?.tipo ?? "FA,FX",
      puntoVenta: params?.puntoVenta,
    });
  }

  async getInvoice(facturaId: string) {
    return this.get(`/factura/${facturaId}`);
  }

  async getInvoiceItems(facturaId: string) {
    return this.get(`/factura/${facturaId}/items`);
  }

  async getInvoiceConsolidated(facturaId: string) {
    return this.get(`/factura/${facturaId}/consolidado`);
  }

  async getInvoicePrintLink(facturaId: string) {
    return this.get(`/factura/${facturaId}/print`);
  }

  // ─── Cobranzas (ALL OK) ──────────────────────────────────

  async listCollections(params?: {
    relaciones?: string;
    page?: number;
    per_page?: number;
    altaDesde?: string;
    altaHasta?: string;
    usuario?: string;
  }) {
    return this.get("/cobranzas", {
      relaciones: params?.relaciones ?? "cli,usu",
      page: params?.page,
      per_page: params?.per_page ?? 50,
      altaDesde: params?.altaDesde,
      altaHasta: params?.altaHasta,
      usuario: params?.usuario,
    });
  }

  async getCollection(cobranzaId: string) {
    return this.get(`/cobranza/${cobranzaId}`);
  }

  async getCollectionConsolidated(cobranzaId: string, params?: {
    per_page?: number;
    relaciones?: string;
  }) {
    return this.get(`/cobranza/${cobranzaId}/consolidado`, {
      per_page: params?.per_page,
      relaciones: params?.relaciones,
    });
  }

  // ─── Conexiones Internet ────────────────────────────────

  async listInternetConnections(params?: {
    relaciones?: string;
    page?: number;
    per_page?: number;
    tecnologia?: string;
    plan?: string;
    altaDesde?: string;
    altaHasta?: string;
    cortado?: "Y" | "N";
    cliente?: string;
    q?: string;
  }) {
    return this.get("/conexiones-internet", {
      relaciones: params?.relaciones ?? "cli,suc",
      page: params?.page,
      per_page: params?.per_page ?? 50,
      tecnologia: params?.tecnologia,
      plan: params?.plan,
      altaDesde: params?.altaDesde,
      altaHasta: params?.altaHasta,
      cortado: params?.cortado,
      cliente: params?.cliente,
      q: params?.q,
    });
  }

  async getInternetConnection(conexionId: string) {
    return this.get(`/conexion-internet/${conexionId}`);
  }

  async getInternetConnectionLog(conexionId: string, params?: {
    page?: number;
    per_page?: number;
  }) {
    return this.get(`/conexion-internet-log/${conexionId}`, {
      page: params?.page,
      per_page: params?.per_page ?? 50,
    });
  }

  async listInternetConnectionsLog(params?: {
    page?: number;
    per_page?: number;
    logDesde?: string;
    logHasta?: string;
  }) {
    return this.get("/conexiones-internet-log", {
      page: params?.page,
      per_page: params?.per_page ?? 50,
      logDesde: params?.logDesde,
      logHasta: params?.logHasta,
    });
  }

  // ─── TV ──────────────────────────────────────────────────

  async listTVConnections() {
    return this.get("/conexiones-television");
  }

  async getTVConnection(id: string) {
    return this.get(`/conexion-television/${id}`);
  }

  // ─── Telefonía ───────────────────────────────────────────

  async listPhoneConnections() {
    return this.get("/conexiones-telefonia");
  }

  async getPhoneConnection(id: string) {
    return this.get(`/conexion-telefonia/${id}`);
  }

  // ─── Tickets ────────────────────────────────────────────

  async listTickets(params?: {
    relaciones?: string;
    page?: number;
    per_page?: number;
    altaDesde?: string;
    altaHasta?: string;
    categoria?: string;
    estado?: string;
  }) {
    return this.get("/tickets", {
      relaciones: params?.relaciones ?? "usu,cat",
      page: params?.page,
      per_page: params?.per_page ?? 50,
      altaDesde: params?.altaDesde,
      altaHasta: params?.altaHasta,
      categoria: params?.categoria,
      estado: params?.estado,
    });
  }

  async getTicket(ticketId: string) {
    return this.get(`/ticket/${ticketId}`);
  }

  async getTicketPhotos(ticketId: string) {
    return this.get(`/ticket/${ticketId}/fotos`);
  }

  async getTicketLog(ticketId: string) {
    return this.get(`/ticket-log/${ticketId}`);
  }

  async listTicketsLog(params?: {
    page?: number;
    per_page?: number;
  }) {
    return this.get("/tickets-log", {
      page: params?.page,
      per_page: params?.per_page ?? 50,
    });
  }

  async getTicketCheckin(ticketId: string) {
    return this.get(`/ticket/${ticketId}/checkin`);
  }

  async getTicketChatAttachments(ticketId: string) {
    return this.get(`/ticket/${ticketId}/chat-adjuntos`);
  }

  // ─── Ticket Metadata ────────────────────────────────────

  async listTicketCategories() {
    return this.get("/ticket-categorias");
  }

  async getTicketCategory(id: string) {
    return this.get(`/ticket-categoria/${id}`);
  }

  async listTicketSubcategories() {
    return this.get("/ticket-subcategorias");
  }

  async getTicketSubcategory(id: string) {
    return this.get(`/ticket-subcategoria/${id}`);
  }

  async listTicketStatuses() {
    return this.get("/ticket-estados");
  }

  async getTicketStatus(id: string) {
    return this.get(`/ticket-estado/${id}`);
  }

  // ─── Planes ───────────────────────────────────────────

  async listPlans(params?: {
    borrado?: "Y" | "N";
    discontinuo?: "Y" | "N";
    q?: string;
  }) {
    return this.get("/planes", {
      borrado: params?.borrado,
      discontinuo: params?.discontinuo,
      q: params?.q,
    });
  }

  // ─── Red (OK) ────────────────────────────────────────────

  async getNetworkStatus(params?: {
    fechaDesdeCaida?: string;
    fechaHastaCaida?: string;
  }) {
    return this.get("/estado-red", {
      fechaDesdeCaida: params?.fechaDesdeCaida,
      fechaHastaCaida: params?.fechaHastaCaida,
    });
  }

  async listNodes() {
    return this.get("/nodos");
  }

  async getNode(id: string) {
    return this.get(`/nodo/${id}`);
  }

  async listSubnodes() {
    return this.get("/subnodos");
  }

  async getSubnode(id: string) {
    return this.get(`/subnodo/${id}`);
  }

  async listVlans() {
    return this.get("/vlans");
  }

  async getVlan(id: string) {
    return this.get(`/vlan/${id}`);
  }

  async listSvlans() {
    return this.get("/svlans");
  }

  async getSvlan(id: string) {
    return this.get(`/svlan/${id}`);
  }

  // ─── FTTx ──────────────────────────────────────────────

  async listBackbones() {
    return this.get("/backbones");
  }

  async getBackbonePons(id: string) {
    return this.get(`/backbone/${id}/pons`);
  }

  async listPons() {
    return this.get("/pons");
  }

  async getPonBoxes(id: string) {
    return this.get(`/pon/${id}/cajas`);
  }

  async getPonBackbone(id: string) {
    return this.get(`/pon/${id}/backbone`);
  }

  async listBoxes() {
    return this.get("/cajas");
  }

  async getBoxPorts(id: string) {
    return this.get(`/caja/${id}/puertos`);
  }

  async getBoxPonBackbone(id: string) {
    return this.get(`/caja/${id}/pon-backbone`);
  }

  async listPorts() {
    return this.get("/puertos");
  }

  async getPortBoxPonBackbone(id: string) {
    return this.get(`/puerto/${id}/caja-pon-backbone`);
  }

  async listSeals() {
    return this.get("/precintos");
  }

  // ─── Adicionales (OK) ────────────────────────────────────

  async listAdditionals() {
    return this.get("/adicionales");
  }

  async getAdditional(id: string) {
    return this.get(`/adicional/${id}`);
  }

  // ─── Stock (OK) ──────────────────────────────────────────

  async listWarehouses() {
    return this.get("/depositos");
  }

  async getWarehouse(id: string) {
    return this.get(`/deposito/${id}`);
  }

  // ─── Auxiliares (only confirmed 200) ─────────────────────

  async listLocalities() {
    return this.get("/localidades");
  }

  async listUsers() {
    return this.get("/usuarios");
  }

  async getUser(id: string) {
    return this.get(`/usuario/${id}`);
  }

  async listBranches() {
    return this.get("/sucursales");
  }

  async getBranch(id: string) {
    return this.get(`/sucursal/${id}`);
  }

  // ─── Medios de Pago ─────────────────────────────────────

  async listPaymentMethods() {
    return this.get("/medios-pagos");
  }

  async getPaymentMethod(id: string) {
    return this.get(`/medio-pago/${id}`);
  }

  // ─── Datos de Referencia ───────────────────────────────

  async listHowDidYouFindUs() {
    return this.get("/cliente-tickets/como-conocio");
  }

  async listPreviousProviders() {
    return this.get("/cliente-tickets/proveedor-anterior");
  }

  async listServiceCancellationCategories() {
    return this.get("/cliente-tickets/categorias-bajas");
  }

  async listExtraConnectionCategories(borrado?: "Y" | "N") {
    return this.get("/conexiones/categoria-extra", { borrado });
  }
}
