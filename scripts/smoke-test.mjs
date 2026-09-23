#!/usr/bin/env node
/**
 * Live smoke test: spawns dist/index.js over stdio and calls every tool against
 * the real ISPKeeper API. GET-only, modifies nothing. IDs are discovered from
 * list calls, so it runs on any instance.
 *
 * Usage: ISPKEEPER_API_KEY=... node scripts/smoke-test.mjs
 * Exit code 1 if any call fails.
 */
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StdioClientTransport } from "@modelcontextprotocol/sdk/client/stdio.js";
import { fileURLToPath } from "node:url";

if (!process.env.ISPKEEPER_API_KEY) {
  console.error("ISPKEEPER_API_KEY is not set");
  process.exit(2);
}

const server = fileURLToPath(new URL("../dist/index.js", import.meta.url));
const client = new Client({ name: "smoke-test", version: "1" });
await client.connect(new StdioClientTransport({ command: "node", args: [server], env: process.env }));

let failures = 0;
const called = new Set();

async function call(name, args = {}) {
  called.add(name);
  try {
    const res = await client.callTool({ name, arguments: args });
    const data = JSON.parse(res.content[0].text).data;
    const summary = Array.isArray(data) ? `array[${data.length}]`
      : data?.data && Array.isArray(data.data) ? `page ${data.data.length}/${data.total}`
      : "object";
    if (res.isError) throw new Error(res.content[0].text.slice(0, 200));
    console.log(`ok   ${name} ${JSON.stringify(args)} -> ${summary}`);
    return data;
  } catch (e) {
    failures++;
    console.log(`FAIL ${name} ${JSON.stringify(args)} -> ${e.message.slice(0, 200)}`);
    return undefined;
  }
}

const first = (page) => page?.data?.[0];
const idOf = (row, key) => (row ? String(row[key]) : undefined);

// Clients
const clients = await call("search_clients", { per_page: 1 });
const clientId = idOf(first(clients), "cliente_id");
await call("get_clients_summary");
await call("list_clients_log", { per_page: 1 });
if (clientId) {
  for (const include of ["detail", "log", "payment_commitment", "payment_commitment_history", "files"])
    await call("get_client", { client_id: clientId, include });
  for (const service of ["invoices", "collections", "tickets", "additionals",
    "internet_connections", "tv_connections", "phone_connections", "subscriptions"])
    await call("get_client_services", { client_id: clientId, service, per_page: 1 });
}

// Invoices & collections
const invoiceId = idOf(first(await call("list_invoices", { per_page: 1 })), "factura_id");
if (invoiceId)
  for (const include of ["detail", "items", "consolidated"])
    await call("get_invoice", { invoice_id: invoiceId, include });
const collectionId = idOf(first(await call("list_collections", { per_page: 1 })), "cobranza_id");
if (collectionId) {
  await call("get_collection", { collection_id: collectionId });
  await call("get_collection", { collection_id: collectionId, consolidated: true });
}

// Connections
const connId = idOf(first(await call("list_internet_connections", { per_page: 1 })), "conexion_id");
if (connId) {
  await call("get_internet_connection", { connection_id: connId });
  await call("get_internet_connection", { connection_id: connId, include: "log" });
}
await call("list_internet_connections_log", { per_page: 1 });
const tvId = idOf(first(await call("list_tv_connections", { per_page: 1 })), "conexionTvId");
if (tvId) await call("get_tv_connection", { connection_id: tvId });
const phone = first(await call("list_phone_connections", { per_page: 1 }));
if (phone) {
  await call("get_phone_connection", { connection_id: String(phone.telefonia_id) });
  if (phone.telefonia_iccid || phone.telefoniaIccid)
    await call("get_phone_connection", { connection_id: String(phone.telefonia_id), include: "imowi" });
}

// Subscriptions
const subId = idOf(first(await call("list_subscriptions", { per_page: 1 })), "suscripcionId");
if (subId) await call("get_subscription", { subscription_id: subId });
for (const resource of ["plans", "categories", "subcategories"])
  await call("list_subscription_catalog", { resource });

// Tickets
const ticketId = idOf(first(await call("list_tickets", { per_page: 1 })), "ticket_id");
if (ticketId)
  for (const include of ["detail", "photos", "log", "checkin", "materials", "chat_attachments"])
    await call("get_ticket", { ticket_id: ticketId, include });
await call("list_tickets_log", { per_page: 1 });

// Network, plans, FTTx
await call("get_network_status");
await call("list_plans");
const backboneId = idOf(first(await call("list_fttx_infrastructure", { resource_type: "backbones", per_page: 1 })), "fttxBackboneId");
const ponId = idOf(first(await call("list_fttx_infrastructure", { resource_type: "pons", per_page: 1 })), "ftth_pon_id");
const boxId = idOf(first(await call("list_fttx_infrastructure", { resource_type: "boxes", per_page: 1 })), "ftth_caja_id");
const portId = idOf(first(await call("list_fttx_infrastructure", { resource_type: "ports", per_page: 1 })), "ftth_boca_id");
await call("list_fttx_infrastructure", { resource_type: "seals", per_page: 1 });
if (backboneId) await call("list_fttx_infrastructure", { resource_type: "pons", parent_id: backboneId });
if (ponId) {
  await call("list_fttx_infrastructure", { resource_type: "boxes", parent_id: ponId });
  await call("get_fttx_trace", { resource_type: "pon", resource_id: ponId });
}
if (boxId) {
  await call("list_fttx_infrastructure", { resource_type: "ports", parent_id: boxId });
  await call("get_fttx_trace", { resource_type: "box", resource_id: boxId });
}
if (portId) await call("get_fttx_trace", { resource_type: "port", resource_id: portId });

// Suppliers
const supplierId = idOf(first(await call("list_suppliers", {})), "proveedor_id");
if (supplierId) await call("get_supplier", { supplier_id: supplierId });
const supInvId = idOf(first(await call("list_supplier_invoices", { per_page: 1 })), "factura_proveedor_id");
if (supInvId) {
  await call("get_supplier_invoice", { invoice_id: supInvId });
  await call("get_supplier_invoice", { invoice_id: supInvId, include: "taxes" });
}

// Auxiliary data + element detail
const aux = {};
for (const resource of ["localities", "branches", "users", "warehouses", "client_categories", "additionals",
  "payment_methods", "nodes", "subnodes", "vlans", "svlans", "ticket_categories", "ticket_subcategories",
  "ticket_statuses", "extra_connection_categories", "how_did_you_find_us", "previous_providers",
  "service_cancellation_categories", "supplier_tax_categories"])
  aux[resource] = first(await call("list_auxiliary_data", { resource }));
const elements = {
  node: ["nodes", "mikrotik_id"], subnode: ["subnodes", "subnodo_id"], vlan: ["vlans", "vlanID"],
  svlan: ["svlans", "svlanID"], user: ["users", "usuario_id"], branch: ["branches", "sucursal_id"],
  warehouse: ["warehouses", "depositoId"], additional: ["additionals", "adicional_id"],
  payment_method: ["payment_methods", "medio_id"], ticket_category: ["ticket_categories", "ticket_categoria_id"],
  ticket_subcategory: ["ticket_subcategories", "ticket_subcategoria_id"], ticket_status: ["ticket_statuses", "estado_tickets_id"],
};
for (const [element_type, [resource, key]] of Object.entries(elements)) {
  const id = idOf(aux[resource], key);
  if (id) await call("get_network_element", { element_type, element_id: id });
}

const { tools } = await client.listTools();
const untested = tools.map((t) => t.name).filter((n) => !called.has(n));
console.log(`\n${tools.length} tools registered, ${called.size} exercised, ${failures} failures`);
if (untested.length) console.log(`not exercised: ${untested.join(", ")}`);
await client.close();
process.exit(failures ? 1 : 0);
