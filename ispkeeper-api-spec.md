# ISPKeeper API - Specification for MCP Server (Read-Only)

## Base URL
```
https://api.anatod.ar/api/
```

## Authentication
- Header: `x-api-key: <token>`
- Additional required header: `X-Requested-With: XMLHttpRequest`

## General Pattern
- REST JSON, paginated with `page` and `per_page` (default 50)
- Expandable relations via query param `relaciones` (e.g.: `relaciones=cli,usu`)
- Date filters: `altaDesde`, `altaHasta` (date format)
- Text search: `q`
- Responses: 200 OK (object), 400/404 error

---

## READ-ONLY ENDPOINTS (GET)

### CLIENTS

#### GET /api/clientes
List clients.
Query params:
- `relaciones` (string, default: "cat,subz") - See references
- `page` (string) - Page number
- `per_page` (string, default: "50") - Records per page
- `borrado` (enum: "1"|"0", default: "0") - Deleted filter
- `cortado` (enum: "Y"|"N", default: "N") - Cut-off filter
- `altaDesde` (date) - Created from date
- `altaHasta` (date) - Created until date
- `contribuyente` (string, default: "C,R") - Tax type (C: final consumer, R: registered taxpayer, M: simplified regime, E: exempt)
- `q` (string) - Text search
- `ident` (string) - ID document (DNI/INE/RFC/NIF)

#### GET /api/cliente/{cliente_id}
Get a client.
Path params: `cliente_id` (string, required)
Query params: `relaciones` (string, default: "cat,subz")

Available relations for Clients:
- cat: Client category
- intco: How did you find us
- locfi: Tax locality
- locre: Real locality
- loc: Locality
- subz: Subzone
- medp: Payment method
- tkcli: Client ticket
- email: Client emails
- adic: Billing additionals
- contel: Phone connections
- contv: TV connections
- coninter: Internet connections

#### GET /api/clientes/resumen
Summary of total/active clients. No additional params.

#### GET /api/cliente/{cliente_id}/facturas
Invoices for a client. Path: `cliente_id` (required)

#### GET /api/cliente/{cliente_id}/adicionales
Additionals for a client.

#### GET /api/cliente/{cliente_id}/cobranzas
Collections for a client.

#### GET /api/cliente/{cliente_id}/conexiones/internet
Internet services for a client (paginated).

#### GET /api/cliente/{cliente_id}/conexiones/telefonia
Phone services for a client (paginated).

#### GET /api/cliente/{cliente_id}/conexiones/television
TV services for a client (paginated).

#### GET /api/cliente/{cliente_id}/archivos
Files attached to a client.

#### GET /api/cliente/{cliente_id}/compromiso-pago/listado
Payment commitment history for a client.

#### GET /api/cliente/{cliente_id}/tickets
Tickets for a client.

#### GET /api/categorias-cliente
List client categories.

#### GET /api/cliente-log/{cliente_id}
Client change log.

#### GET /api/clientes-log
List client change logs.

#### GET /api/cliente/{cliente_id}/compromiso-pago/check
Check payment commitment for a client.

---

### COLLECTIONS

#### GET /api/cobranzas
List collections.
Query params:
- `relaciones` (string, default: "cli,usu")
- `page`, `per_page`
- `altaDesde`, `altaHasta` (date)
- `usuario` (string) - Filter by user

#### GET /api/cobranza/{cobranza_id}
Get a collection. Path: `cobranza_id` (required)

#### GET /api/cobranza/{cobranza_id}/consolidado
Consolidated collection data.
Path: `cobranza_id` (required)
Query: `per_page`, `relaciones`

Available relations for Collections:
- cli: Client
- usu: User

---

### INVOICES

#### GET /api/facturas
List invoices.
Query params:
- `relaciones` (string, default: "cli,usu")
- `page`, `per_page`
- `altaDesde`, `altaHasta` (date)
- `tipo` (string, default: "FA,FX") - Invoice type (CA,CB,CX,DA,DB,DX,FA,FB,FX)
- `puntoVenta` (string) - Point of sale

#### GET /api/factura/{factura_id}
Get an invoice. Path: `factura_id` (required)

#### GET /api/factura/{factura_id}/items
Invoice items.

#### GET /api/factura/{factura_id}/consolidado
Consolidated invoice data.

#### GET /api/factura/{factura_id}/print
Invoice PDF link.

Available relations for Invoices:
- cli: Client
- anurel: Related voided invoice
- clitmp: Temporary client
- facrel: Related invoice
- tck: Ticket
- usu: User
- desde: Payment method from (consolidated only)
- hacia: Payment method to (consolidated only)
- conso: Consolidated collections

---

### INTERNET SERVICES

#### GET /api/conexiones-internet
List internet services.
Query params:
- `relaciones` (string, default: "cli,suc")
- `page`, `per_page`
- `tecnologia` (string) - Technology (R, T, O, H, S, P, D)
- `plan` (string) - Plan
- `altaDesde`, `altaHasta` (date)
- `cortado` (enum: "Y"|"N")
- `cliente` (string) - Client ID
- `q` (string) - Text search

#### GET /api/conexion-internet/{conexion_id}
Get an internet service. Path: `conexion_id` (required)

#### GET /api/conexion-internet-log/{conexion_id}
Internet service change log.

#### GET /api/conexiones-internet-log
List internet service change logs.

Available relations:
- cli: Client
- boc: FTTH port
- ip: IP address
- ippub: Public IP address
- pre: FTTH seal
- rou: Router
- sto: Stock
- subz: Subzone
- suc: Branch
- mac: MAC address
- vlan: VLAN
- svlan: SVLAN
- loc: Locality
- mik: Mikrotik
- pl: Connection plan
- plp: Prepaid connection plan
- caja: FTTH box
- extra: Connection extra

---

### FTTx INFRASTRUCTURE

Resource names are **singular** (`/backbone`, `/pon`, `/caja`, `/puerto`); the plural forms return 404 "Ruta no soportada".

#### GET /api/backbone
FTTx Backbone - List. Query: `q`

#### GET /api/backbone/{id}/pon
FTTx Backbone - List PONs (backbone object with nested `pon` array)

#### GET /api/pon
FTTx PON - List. Query: `backbone`, `q`

#### GET /api/pon/{id}/caja
FTTx PON - List NAP Boxes (PON object with nested boxes)

#### GET /api/pon/{id}/mapeo
FTTx PON - Get Backbone

#### GET /api/caja
FTTx NAP Box - List. Query: `pon`, `q`

#### GET /api/caja/{id}/puerto
FTTx NAP Box - List Ports (box object with nested ports)

#### GET /api/caja/{id}/mapeo
FTTx NAP Box - Get PON and Backbone

#### GET /api/puerto
FTTx Port - List. Query: `caja`, `q`

#### GET /api/puerto/{id}/mapeo
FTTx Port - Get NAP Box, PON, and Backbone

#### GET /api/precintos
Seals - List. Query: `libre` (Y|N, default Y), `q`

All FTTx lists are paginated (`page`, `per_page`); without `per_page` the API returns up to 1000 rows.

---

### PLANS & NETWORK

#### GET /api/planes
Internet Plans - List.
Query params:
- `borrado` (enum: "Y"|"N")
- `discontinuo` (enum: "Y"|"N")
- `q` (string) - Text search

#### GET /api/nodo
Nodes - List. Query: `borrado` (1|0)

#### GET /api/nodo/{id}
Get node

#### GET /api/subnodo
Subnodes - List. Query: `borrado` (Y|N)

#### GET /api/subnodo/{id}
Get subnode

#### GET /api/vlan
VLANs - List. Query: `borrado` (Y|N)

#### GET /api/vlan/{id}
Get VLAN

#### GET /api/svlan
SVLANs - List. Query: `borrado` (Y|N)

#### GET /api/svlan/{id}
Get SVLAN

#### GET /api/estado-red
Network Status - List.
Query params:
- `fechaDesdeCaida` (string) - Outage from date
- `fechaHastaCaida` (string) - Outage until date

#### GET /api/conexiones/categoria-extra
Extra connection categories - List

---

### TV SERVICES

#### GET /api/conexion-television/{id}
Get TV service

#### GET /api/conexion-television/dgo/{id}
DirecTV Go account data for a TV service

#### GET /api/conexiones-television
List TV services

---

### PHONE SERVICES

#### GET /api/conexion-telefonia/{id}
Get phone service

#### GET /api/conexion-telefonia/{id}/imowi
Live line data from the Imowi mobile platform (SSMovil): number, ICCID, holder, status

#### GET /api/conexiones-telefonia
List phone services

---

### TICKETS

#### GET /api/tickets
List tickets.
Query params:
- `relaciones` (string, default: "usu,cat")
- `page`, `per_page`
- `altaDesde`, `altaHasta` (date)
- `categoria` (string) - Category
- `estado` (string) - Status

#### GET /api/ticket/{ticket_id}
Get a ticket

#### GET /api/ticket-log/{ticket_id}
Ticket movement log

#### GET /api/tickets-log
List ticket logs

#### GET /api/ticket/{ticket_id}/fotos
Ticket photos

#### GET /api/ticket/{ticket_id}/checkin
Ticket checkin/checkout

#### GET /api/ticket-categorias
List ticket categories

#### GET /api/ticket-categoria/{id}
Get ticket category

#### GET /api/ticket-subcategorias
List ticket subcategories

#### GET /api/ticket-subcategoria/{id}
Get ticket subcategory

#### GET /api/ticket-estados
List ticket statuses

#### GET /api/ticket-estado/{id}
Get ticket status

#### GET /api/cliente-tickets/como-conocio
How did you find us - List

#### GET /api/cliente-tickets/proveedor-anterior
Previous providers - List

#### GET /api/cliente-tickets/categorias-bajas
Service cancellation categories - List

#### GET /api/ticket/materiales/{ticket_id}
Materials (stock) used in a ticket

Chat messages and files have no dedicated endpoint (`/ticket/{id}/chat-adjuntos` returns 404): request `/api/ticket/{id}?relaciones=chat,archivos`.

---

### SUBSCRIPTION SERVICES

Relations: `cli`, `pl`, `subcat`, `cat`, `subz`, `loc`. There is no client-scoped route; filter the list by `cliente`.

#### GET /api/conexiones-suscripcion
List subscriptions. Query: `relaciones`, `page`, `per_page`, `altaDesde`, `altaHasta`, `activa` (Y|N), `cliente`, `plan`, `subcat`, `q`

#### GET /api/conexion-suscripcion/{id}
Get subscription

#### GET /api/suscripciones-planes
Subscription plans. Query: `borrado`, `subcat`, `precioDesde`, `precioHasta`, `nombre`, `q`

#### GET /api/suscripciones-categorias
Subscription categories. Query: `borrado`, `nombre`

#### GET /api/suscripciones-subcategorias
Subscription subcategories. Query: `borrado`, `categoria`, `nombre`

---

### SUPPLIERS

#### GET /api/proveedores
List suppliers. Query: `relaciones` (loc,cat), `borrado`, `loc`, `iva`, `q`

#### GET /api/proveedor/{id}
Get supplier. Query: `relaciones`

#### GET /api/facturas-proveedores
List supplier invoices. Query: `relaciones` (prov), `borrado`, `anulado`, `puntoventa`, `fechadesde`, `fechahasta`

#### GET /api/factura-proveedor/{id}
Get supplier invoice. Query: `relaciones`

#### GET /api/facturas-proveedores-impuestos
Supplier invoice tax lines. Query: `borrado`, `factura`

#### GET /api/facturas-proveedores-impuestos-categorias
Supplier tax categories. Query: `borrado`

---

### NOT IMPLEMENTED (read-only GETs intentionally left out)

- `GET /api/ping-mikrotik/{id}` - triggers a ping from the node's MikroTik; an action, not a data read.

---

### ADDITIONALS

#### GET /api/adicionales
List additionals

#### GET /api/adicional/{id}
Get additional

---

### STOCK / WAREHOUSES

#### GET /api/deposito/{id}
Get warehouse

#### GET /api/depositos
List warehouses

---

### LOCALITIES

#### GET /api/localidades
List localities

---

### USERS

#### GET /api/usuario/{id}
Get user

#### GET /api/usuarios
List users

---

### BRANCHES

#### GET /api/sucursal/{id}
Get branch

#### GET /api/sucursales
List branches

---

### PAYMENT METHODS

#### GET /api/medio-pago/{id}
Get payment method

#### GET /api/medios-pagos
List payment methods

---

## NOTES FOR MCP SERVER

1. **Only implement GET operations** (read-only)
2. Paths verified against docs.anatod.com and the live API on 2026-09-23. `/facturas`, `/cobranzas`, `/tickets`, `/ticket/{id}` and `/cliente/{id}` are no longer in the published docs but still work
3. All endpoints require `x-api-key` and `X-Requested-With: XMLHttpRequest` headers
4. Pagination is consistent: `page` + `per_page`
5. The `relaciones` param expands related data in each response
6. Most useful endpoints for operational queries:
   - `/api/clientes` + `/api/cliente/{id}` - Client base
   - `/api/clientes/resumen` - Quick dashboard
   - `/api/facturas` - Billing
   - `/api/cobranzas` - Collections
   - `/api/conexiones-internet` - Active services
   - `/api/tickets` - Technical support
   - `/api/estado-red` - Network status
   - `/api/planes` - Available plans
   - FTTx infrastructure (backbones, PONs, boxes, ports)
