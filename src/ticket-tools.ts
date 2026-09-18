/** Minimal, read-only client/service projections for ticket association. */
import { z } from 'zod';
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { ISPKeeperClient } from './api-client.js';

type Row = Record<string, unknown>;
// ISPKeeper also uses negative client IDs (e.g. -100); zero is never valid.
const id = z.string().regex(/^-?[1-9][0-9]*$/, 'Expected a non-zero numeric ID');
const page = z.number().int().positive().max(1000000).default(1);
const perPage = z.number().int().min(1).max(50).default(20);
export const searchSchema = z.object({
  search_by: z.enum(['id', 'document', 'name', 'mobile']),
  query: z.string().trim().min(1).max(120),
  page,
  per_page: perPage,
});
export const connectionsSchema = z.object({
  client_id: id,
  service_type: z.enum(['internet', 'television', 'telefonia']).default('internet'),
  page,
  per_page: perPage,
});
function row(value: unknown): Row {
  if (!value || typeof value !== 'object' || Array.isArray(value))
    throw new Error('Unexpected ISP Keeper response');
  return value as Row;
}
function pick(value: Row, fields: readonly string[]): Row {
  return Object.fromEntries(fields.filter(k => ['string', 'number', 'boolean'].includes(typeof value[k]))
    .map(k => [k, typeof value[k] === 'string' ? (value[k] as string).slice(0, 1000) : value[k]]));
}
function sameId(value: unknown, expected?: string): string {
  const result = id.parse(String(value));
  if (expected && result !== expected) throw new Error('ISP Keeper returned a different owner or ID');
  return result;
}
const clientFields = ['cliente_nombre', 'cliente_apellido', 'cliente_dnicuit',
  'cliente_domicilioreal', 'cliente_telefono_celular', 'cliente_telefono_celular2',
  'cliente_telefono_celular3', 'cliente_borrado', 'cliente_cortado'] as const;
export function projectClient(value: unknown, expected?: string) {
  const r = row(value);
  return { ...pick(r, clientFields), cliente_id: sameId(r.cliente_id, expected) };
}
const services = {
  internet: {id: 'conexion_id', owner: 'conexion_cliente', fields: ['conexion_domicilio', 'conexion_plan', 'conexion_tipo', 'conexion_ip', 'conexion_mac', 'conexion_cortado', 'conexion_retiro']},
  television: {id: 'conexionTvId', owner: 'conexionTvCliente', fields: ['conexionTvPlan', 'conexionTvConexion', 'conexionTvHabilitada', 'conexionTvEliminada']},
  telefonia: {id: 'telefonia_id', owner: 'telefonia_cliente', fields: ['telefonia_plan', 'telefonia_domicilio', 'telefoniaNumero', 'telefonia_cortado', 'telefonia_borrado']},
} as const;
export function projectConnection(value: unknown, type: keyof typeof services, clientId: string) {
  const r = row(value), spec = services[type];
  return {...pick(r, spec.fields), connection_id: sameId(r[spec.id]),
    client_id: sameId(r[spec.owner], clientId), service_type: type};
}
function paginated(value: unknown) {
  const r = row(value);
  if (!Array.isArray(r.data) || !Number.isSafeInteger(r.current_page) || !Number.isSafeInteger(r.last_page)
      || !Number.isSafeInteger(r.total) || Number(r.current_page) < 1 || Number(r.last_page) < 1 || Number(r.total) < 0)
    throw new Error('Unexpected ISP Keeper pagination');
  return {rows: r.data, current_page: Number(r.current_page), last_page: Number(r.last_page),
    upstream_total: Number(r.total), has_more: Number(r.current_page) < Number(r.last_page)};
}
export async function searchTicketClients(api: ISPKeeperClient, input: unknown) {
  const p = searchSchema.parse(input);
  if (p.search_by === 'id') {
    const clientId = id.parse(p.query);
    return {data: [projectClient(await api.getClient(clientId), clientId)], has_more: false};
  }
  // Both name and mobile use the API's general q search unchanged.
  // Results are candidates; the caller chooses the client to associate.
  const result = paginated(await api.listClients({page:p.page, per_page:p.per_page,
    ...(p.search_by === 'document' ? {ident:p.query} : {q:p.query})}));
  const data = result.rows.map(r => projectClient(r));
  const {rows, ...pagination} = result;
  return {...pagination, data};
}
export async function listTicketConnections(api: ISPKeeperClient, input: unknown) {
  const p = connectionsSchema.parse(input);
  const result = paginated(await api.getClientConnections(p.client_id, p.service_type,
    {page:p.page, per_page:p.per_page}));
  const {rows, ...pagination} = result;
  return {...pagination, data: rows.map(r => projectConnection(r, p.service_type, p.client_id))};
}
export function registerTicketTools(server: McpServer, api: ISPKeeperClient) {
  const result = (data: unknown) => ({content: [{type: 'text' as const,
    text: JSON.stringify({_source:'ISP Keeper API', data})}]});
  server.tool('search_ticket_clients',
    'Find client candidates for an optional ticket association by client ID, DNI/CUIT, name, or mobile. Returns only identity/contact fields. Name and mobile both use the API general q search; candidates may match other fields too. Input formatting is preserved. Follow has_more with page+1. Confirm the chosen client; never invent matches.',
    searchSchema.shape, async p => result(await searchTicketClients(api, p)));
  server.tool('list_client_connections',
    'List a chosen client’s internet, television, or phone connections for ticket selection. Returns minimal fields and verifies each connection belongs to the client. Follow has_more with page+1. No ticket or service is modified.',
    connectionsSchema.shape, async p => result(await listTicketConnections(api, p)));
}
