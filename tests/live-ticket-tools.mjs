import {readFileSync} from 'node:fs';
import {fileURLToPath} from 'node:url';
import {Client} from '@modelcontextprotocol/sdk/client/index.js';
import {StdioClientTransport} from '@modelcontextprotocol/sdk/client/stdio.js';
const transport=new StdioClientTransport({command:process.execPath,args:[fileURLToPath(new URL('../dist/index.js',import.meta.url))],env:{PATH:process.env.PATH,ISPKEEPER_API_KEY:readFileSync(process.env.ISPKEEPER_API_KEY_FILE,'utf8').trim(),ISPKEEPER_BASE_URL:'https://api.anatod.ar'},stderr:'pipe'});
const client=new Client({name:'ticket-integration-review',version:'1.0.0'});
async function call(name,args,label){const r=await client.callTool({name,arguments:args},undefined,{timeout:25000});if(r.isError){console.log(label+': MCP error (body withheld)');throw new Error('MCP tool failure');}const v=JSON.parse(r.content.find(x=>x.type==='text').text).data;console.log(label+': OK');return v;}
try{
 await client.connect(transport);
 const ts=await client.listTools();console.log('Registered tools: '+ts.tools.length);
 const connections=await call('list_internet_connections',{per_page:1},'Sample service');
 const owner=String(connections.data[0].conexion_cliente);
 const selected=await call('search_ticket_clients',{search_by:'id',query:owner},'New client ID search');
 if(selected.data[0].cliente_id!==owner) throw new Error('Client identity mismatch');
 for(const service_type of ['internet','television','telefonia']){
  const result=await call('list_client_connections',{client_id:owner,service_type,per_page:1},'New client connections: '+service_type);
  if(!result.data.every(x=>x.client_id===owner)) throw new Error('Owner mismatch');
 }
 const first=await call('search_clients',{per_page:5},'Pagination sample');
 const last=await call('search_clients',{per_page:5,page:first.last_page},'Recent client sample');
 const sample=last.data.find(r=>String(r.cliente_telefono_celular||'').replace(/[^0-9]/g,'').length>=8);
 if(!sample) throw new Error('No mobile sample');
 for(const [search_by,query] of [['mobile',sample.cliente_telefono_celular],['document',sample.cliente_dnicuit],['name',sample.cliente_apellido||sample.cliente_nombre]]){
  const found=await call('search_ticket_clients',{search_by,query:String(query),per_page:50},'New client search: '+search_by);
  if(!found.data.length) throw new Error('Expected client results');
  if(search_by==='mobile' && !found.data.some(x=>x.cliente_id===String(sample.cliente_id))) throw new Error('Mobile mismatch');
 }
 const empty=await call('search_ticket_clients',{search_by:'name',query:'zz_no_match_ticket_review_8ec263f4'},'New empty search');
 if(empty.data.length!==0) throw new Error('Expected empty result');
 console.log('Review completed (read-only)');
}catch(e){console.log('Review failed: '+e.constructor.name);process.exitCode=1;}finally{await client.close();}
