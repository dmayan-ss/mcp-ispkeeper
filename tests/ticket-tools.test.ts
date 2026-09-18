import test from 'node:test';
import assert from 'node:assert/strict';
import {ISPKeeperClient} from '../src/api-client.js';
import {projectClient, projectConnection, searchTicketClients, listTicketConnections} from '../src/ticket-tools.js';
const page = (data: unknown[], extra = {}) => ({data,current_page:1,last_page:1,total:data.length,...extra});
const fake = (methods: object) => methods as ISPKeeperClient;
const client = {cliente_id:42,cliente_nombre:'Test',cliente_telefono_celular:'+54 9 123 456789',cliente_cdcbu_cbu:'secret', unexpected:'secret'};
test('client projection excludes financial and future fields', () => {
  assert.deepEqual(projectClient(client), {cliente_id:'42',cliente_nombre:'Test',cliente_telefono_celular:'+54 9 123 456789'});
});
test('ID search checks returned identity and rejects path injection', async () => {
  const api=fake({getClient:async()=>client});
  assert.equal((await searchTicketClients(api,{search_by:'id',query:'42'})).data[0].cliente_id,'42');
  await assert.rejects(searchTicketClients(api,{search_by:'id',query:'43'}),/different/);
  await assert.rejects(searchTicketClients(api,{search_by:'id',query:'42\/facturas'}));
});
test('document filter uses ident and preserves leading zeros', async () => {
  await searchTicketClients(fake({listClients:async(p:unknown)=>{assert.deepEqual(p,{ident:'00123456',page:1,per_page:20});return page([client]);}}),{search_by:'document',query:'00123456'});
});
test('name uses q with bounded pagination', async () => {
  await searchTicketClients(fake({listClients:async(p:unknown)=>{assert.deepEqual(p,{q:'Test Name',page:2,per_page:5});return page([],{current_page:2,last_page:2});}}),{search_by:'name',query:' Test Name ',page:2,per_page:5});
  for (const per_page of [0,51,1.5]) await assert.rejects(searchTicketClients(fake({}),{search_by:'name',query:'A',per_page}));
});
test('mobile uses general q unchanged and preserves all candidate matches', async () => {
  const api=fake({listClients:async(p:{q:string})=>{assert.equal(p.q,'+54 9 123 456789');return page([client,{cliente_id:2,cliente_nombre:'Other match'}],{last_page:2,total:8});}});
  const result=await searchTicketClients(api,{search_by:'mobile',query:'+54 9 123 456789'});
  assert.equal(result.data.length,2);assert.equal(result.has_more,true);
  assert.equal('upstream_total' in result && result.upstream_total,8);
});
test('empty search remains empty without inventing clients', async () => {
  const result=await searchTicketClients(fake({listClients:async()=>page([])}),{search_by:'mobile',query:'123456'});
  assert.deepEqual(result.data,[]);assert.equal(result.has_more,false);
});
test('malformed upstream is not reported as no matches', async () => {
  await assert.rejects(searchTicketClients(fake({listClients:async()=>({error:'failure'})}),{search_by:'name',query:'A'}),/pagination/);
  assert.throws(()=>projectClient({cliente_nombre:'Test'}));
});
test('service projections exclude passwords and nested raw objects', () => {
  for (const [type, record] of [
    ['internet',{conexion_id:7,conexion_cliente:42,conexion_pppoe_pass:'secret'}],
    ['television',{conexionTvId:7,conexionTvCliente:42,conexionTVPass:'secret'}],
    ['telefonia',{telefonia_id:7,telefonia_cliente:42,unknown:'secret'}],
  ] as const) {
    assert.deepEqual(projectConnection({...record,cliente:client},type,'42'),{connection_id:'7',client_id:'42',service_type:type});
    assert.throws(()=>projectConnection(record,type,'43'),/different/);
  }
});
test('client scoped connections validate owner and retain pagination', async () => {
  const api=fake({getClientConnections:async(c:string,t:string,p:unknown)=>{
    assert.equal(c,'42');assert.equal(t,'internet');assert.deepEqual(p,{page:1,per_page:20});
    return page([{conexion_id:7,conexion_cliente:42}]);
  }});
  const result=await listTicketConnections(api,{client_id:'42'});
  assert.equal(result.data[0].connection_id,'7');assert.equal(result.has_more,false);
  await assert.rejects(listTicketConnections(fake({getClientConnections:async()=>page([{conexion_id:7,conexion_cliente:43}])}),{client_id:'42'}),/different/);
});
test('HTTP client constructs official route and does not leak errors', async () => {
  const original=globalThis.fetch;
  try {
    globalThis.fetch=async(input,init)=>{
      const u=new URL(String(input));assert.equal(u.pathname,'/api/cliente/42/conexiones/internet');
      assert.equal(u.searchParams.get('page'),'2');assert.equal(init?.method,'GET');
      assert.equal(init?.redirect,'error');assert.ok(init?.signal);
      return new Response(JSON.stringify(page([])),{status:200});
    };
    const api=new ISPKeeperClient();
    await api.getClientConnections('42','internet',{page:2});
    globalThis.fetch=async()=>new Response('sensitive upstream body',{status:403});
    await assert.rejects(api.getClient('42'),{message:'ISPKeeper API HTTP 403'});
    globalThis.fetch=async()=>new Response('sensitive invalid JSON');
    await assert.rejects(api.getClient('42'),{message:'ISPKeeper API returned invalid JSON'});
    globalThis.fetch=async()=>new Response('x'.repeat(8*1024*1024+1));
    await assert.rejects(api.getClient('42'),/exceeds 8 MiB/);
    globalThis.fetch=async()=>{throw new Error('sensitive network error');};
    await assert.rejects(api.getClient('42'),{message:'ISPKeeper API request failed or timed out'});
  } finally {globalThis.fetch=original;}
});
test('negative client IDs are valid in ISPKeeper; zero is not', async () => {
  const neg={cliente_id:-100,cliente_nombre:'Temp'};
  assert.equal((await searchTicketClients(fake({getClient:async()=>neg}),{search_by:'id',query:'-100'})).data[0].cliente_id,'-100');
  await assert.rejects(searchTicketClients(fake({}),{search_by:'id',query:'0'}));
  await assert.rejects(searchTicketClients(fake({}),{search_by:'id',query:'-0'}));
});
