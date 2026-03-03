# ISPkeeper API - Especificación para MCP Server (Read-Only)

## Base URL
```
https://api.anatod.ar/api/
```

## Autenticación
- Header: `x-api-key: <token>`
- Header adicional requerido: `X-Requested-With: XMLHttpRequest`

## Patrón General
- REST JSON, paginado con `page` y `per_page` (default 50)
- Relaciones expandibles via query param `relaciones` (ej: `relaciones=cli,usu`)
- Filtros por fecha: `altaDesde`, `altaHasta` (formato date)
- Búsqueda texto: `q`
- Respuestas: 200 OK (object), 400/404 error

---

## ENDPOINTS READ-ONLY (GET)

### CLIENTES

#### GET /api/clientes
Listado de clientes.
Query params:
- `relaciones` (string, default: "cat,subz") - Ver referencias
- `page` (string) - Página
- `per_page` (string, default: "50") - Registros por página
- `borrado` (enum: "1"|"0", default: "0") - Filtro borrado
- `cortado` (enum: "Y"|"N", default: "N") - Filtro cortado
- `altaDesde` (date) - Fecha alta desde
- `altaHasta` (date) - Fecha alta hasta
- `contribuyente` (string, default: "C,R") - Tipo contribuyente (C: consumidor final, R: responsable inscripto, M: monotributo, E: exento)
- `q` (string) - Búsqueda texto
- `ident` (string) - DNI/INE/RFC/NIF

#### GET /api/cliente/{cliente_id}
Obtener un cliente.
Path params: `cliente_id` (string, required)
Query params: `relaciones` (string, default: "cat,subz")

Relaciones disponibles para Clientes:
- cat: Categoría de cliente
- intco: Como nos conoció
- locfi: Localidad fiscal
- locre: Localidad real
- loc: Localidad
- subz: Subzona
- medp: Medio de pago
- tkcli: Ticket de cliente
- email: Emails del cliente
- adic: Adicionales de facturación
- contel: Conexiones de telefonía
- contv: Conexiones de TV
- coninter: Conexiones de internet

#### GET /api/clientes/resumen
Resumen total/activos de clientes. Sin params adicionales.

#### GET /api/cliente/{cliente_id}/facturas
Facturas de un cliente. Path: `cliente_id` (required)

#### GET /api/cliente/{cliente_id}/adicionales (inferido del sidebar)
Adicionales de un cliente.

#### GET /api/cliente/{cliente_id}/cobranzas (inferido del sidebar)
Cobranzas de un cliente.

#### GET /api/cliente/{cliente_id}/conexiones-internet (inferido del sidebar)
Servicios de internet de un cliente.

#### GET /api/cliente/{cliente_id}/conexiones-telefonia (inferido del sidebar)
Servicios de telefonía de un cliente.

#### GET /api/cliente/{cliente_id}/conexiones-television (inferido del sidebar)
Servicios de TV de un cliente.

#### GET /api/cliente/{cliente_id}/tickets (inferido del sidebar)
Tickets de un cliente.

#### GET /api/categorias-cliente
Listado de categorías de cliente.

#### GET /api/cliente/{cliente_id}/log
Log de un cliente.

#### GET /api/clientes/log
Listado de log de clientes.

#### GET /api/cliente/{cliente_id}/compromiso-de-pago (verificar)
Verificar compromiso de pago de un cliente.

---

### COBRANZAS

#### GET /api/cobranzas
Listado de cobranzas.
Query params:
- `relaciones` (string, default: "cli,usu")
- `page`, `per_page`
- `altaDesde`, `altaHasta` (date)
- `usuario` (string) - Filtro por usuario

#### GET /api/cobranza/{cobranza_id}
Obtener una cobranza. Path: `cobranza_id` (required)

#### GET /api/cobranza/{cobranza_id}/consolidado
Consolidado de cobranza.
Path: `cobranza_id` (required)
Query: `per_page`, `relaciones`

#### GET /api/link-de-cobranzas
Link de cobranzas.

Relaciones disponibles para Cobranzas:
- cli: Cliente
- usu: Usuario

---

### FACTURAS

#### GET /api/facturas
Listado de facturas.
Query params:
- `relaciones` (string, default: "cli,usu")
- `page`, `per_page`
- `altaDesde`, `altaHasta` (date)
- `tipo` (string, default: "FA,FX") - Tipo factura (CA,CB,CX,DA,DB,DX,FA,FB,FX)
- `puntoVenta` (string) - Punto de venta
- `convertir` (enum: "Y"|"N") - Filtro conversión

#### GET /api/factura/{factura_id}
Obtener una factura. Path: `factura_id` (required)

#### GET /api/factura/{factura_id}/items
Ítems de una factura.

#### GET /api/factura/{factura_id}/consolidado
Consolidado de factura.

#### GET /api/factura/{factura_id}/imprimir
Link PDF de factura.

Relaciones disponibles para Facturas:
- cli: Cliente
- anurel: Factura anulada asociada
- clitmp: Cliente temporal
- facrel: Factura relacionada
- tck: Ticket
- usu: Usuario
- desde: Medio de pago desde (solo consolidado)
- hacia: Medio de pago hacia (solo consolidado)
- conso: Cobranzas consolidadas

---

### SERVICIOS DE INTERNET

#### GET /api/conexiones-internet
Listado de servicios internet.
Query params:
- `relaciones` (string, default: "cli,suc")
- `page`, `per_page`
- `tecnologia` (string) - Tecnología (R, T, O, H, S, P, D)
- `plan` (string) - Plan
- `altaDesde`, `altaHasta` (date)
- `cortado` (enum: "Y"|"N")
- `cliente` (string) - ID del cliente
- `q` (string) - Búsqueda texto

#### GET /api/conexion-internet/{conexion_id}
Obtener un servicio internet. Path: `conexion_id` (required)

#### GET /api/conexion-internet/{conexion_id}/log
Log de servicio internet.

#### GET /api/conexiones-internet/log
Listado de logs de servicios internet.

Relaciones disponibles:
- cli: Cliente
- boc: Boca FTTH
- ip: Dirección IP
- ippub: Dirección IP pública
- pre: Precinto FTTH
- rou: Router
- sto: Stock
- subz: Subzona
- suc: Sucursal
- mac: Dirección MAC
- vlan: VLAN
- svlan: SVLAN
- loc: Localidad
- mik: Mikrotik
- pl: Plan de la conexión
- plp: Plan conexión prepago
- caja: Caja FTTH
- extra: Extra de la conexión

---

### INFRAESTRUCTURA FTTX

#### GET /api/backbones
FTTx Backbone - Listado

#### GET /api/backbone/{id}/pons
FTTx Backbone - Listado de PONs

#### GET /api/pons
FTTx PON - Listado

#### GET /api/pon/{id}/cajas
FTTx PON - Listado de Cajas NAPs

#### GET /api/pon/{id}/backbone
FTTx PON - Obtener Backbone

#### GET /api/cajas
FTTx Caja NAP - Listado

#### GET /api/caja/{id}/puertos
FTTx Caja NAP - Listado de Puertos

#### GET /api/caja/{id}/pon-backbone
FTTx Caja NAP - Obtener PON y Backbone

#### GET /api/puertos
FTTx Puerto - Listado

#### GET /api/puerto/{id}/caja-pon-backbone
FTTx Puerto - Obtener Caja NAP, PON y Backbone

#### GET /api/precintos
Precintos (Security Seal) - Listado

---

### PLANES Y RED

#### GET /api/planes
Plan Internet - Listado.
Query params:
- `borrado` (enum: "Y"|"N")
- `discontinuo` (enum: "Y"|"N")
- `q` (string) - Búsqueda texto

#### GET /api/nodos
Nodos - Listado

#### GET /api/nodo/{id}
Obtener nodo

#### GET /api/subnodos
Subnodo - Listado

#### GET /api/subnodo/{id}
Obtener subnodo

#### GET /api/vlans
VLAN - Listado

#### GET /api/vlan/{id}
Obtener VLAN

#### GET /api/svlans
SVLAN - Listado

#### GET /api/svlan/{id}
Obtener SVLAN

#### GET /api/estado-red
Estado de Red - Listado.
Query params:
- `fechaDesdeCaida` (string) - Fecha desde caída
- `fechaHastaCaida` (string) - Fecha hasta caída

#### GET /api/categorias-extra-conexion
Categorías extra de conexión - Listado

---

### SERVICIO DE TV

#### GET /api/conexion-television/{id}
Obtener servicio TV

#### GET /api/conexiones-television
Listado servicios TV

---

### SERVICIO DE TELEFONÍA

#### GET /api/conexion-telefonia/{id}
Obtener servicio telefonía

#### GET /api/conexiones-telefonia
Listado servicios telefonía

---

### TICKETS

#### GET /api/tickets
Listado de tickets.
Query params:
- `relaciones` (string, default: "usu,cat")
- `page`, `per_page`
- `altaDesde`, `altaHasta` (date)
- `categoria` (string) - Categoría
- `estado` (string) - Estado

#### GET /api/ticket/{ticket_id}
Obtener un ticket

#### GET /api/ticket/{ticket_id}/log
Log de ticket

#### GET /api/tickets/log
Listado de logs de tickets

#### GET /api/ticket/{ticket_id}/fotos
Fotos de un ticket

#### GET /api/ticket/{ticket_id}/checkin-checkout
Checkin/checkout de un ticket

#### GET /api/subcategoria-ticket/{id}
Obtener subcategoría ticket

#### GET /api/subcategorias-ticket
Listado subcategorías ticket

#### GET /api/categoria-ticket/{id}
Obtener categoría ticket

#### GET /api/categorias-ticket
Listado categorías ticket

#### GET /api/estado-ticket/{id}
Obtener estado ticket

#### GET /api/estados-ticket
Listado estados ticket

#### GET /api/como-nos-conocio
Como nos conoció - Listado

#### GET /api/proveedores-anteriores
Proveedores anteriores - Listado

#### GET /api/categorias-bajas-de-servicio
Categorías bajas de servicio - Listado

#### GET /api/ticket/{ticket_id}/chat-adjuntos
Ticket Chat adjuntos

---

### ADICIONALES

#### GET /api/adicionales
Listado de adicionales

#### GET /api/adicional/{id}
Obtener adicional

---

### STOCK

#### GET /api/deposito/{id}
Obtener depósito

#### GET /api/depositos
Listado depósitos

---

### LOCALIDADES

#### GET /api/localidades
Listado de localidades

---

### USUARIOS

#### GET /api/usuario/{id}
Obtener usuario

#### GET /api/usuarios
Listado de usuarios

---

### SUCURSALES

#### GET /api/sucursal/{id}
Obtener sucursal

#### GET /api/sucursales
Listado de sucursales

---

### MEDIOS DE PAGO

#### GET /api/medio-pago/{id}
Obtener medio de pago

#### GET /api/medios-de-pago
Listado medios de pago

---

## NOTAS PARA EL MCP SERVER

1. **Solo implementar operaciones GET** (read-only)
2. Las URLs exactas de los path pueden variar ligeramente del patrón inferido - verificar contra la API real
3. Todos los endpoints requieren los headers `x-api-key` y `X-Requested-With: XMLHttpRequest`
4. La paginación es consistente: `page` + `per_page`
5. El param `relaciones` permite expandir datos relacionados en cada respuesta
6. Los endpoints más útiles para consulta operativa:
   - `/api/clientes` + `/api/cliente/{id}` - Base de clientes
   - `/api/clientes/resumen` - Dashboard rápido
   - `/api/facturas` - Facturación
   - `/api/cobranzas` - Cobros
   - `/api/conexiones-internet` - Servicios activos
   - `/api/tickets` - Soporte técnico
   - `/api/estado-red` - Estado de red
   - `/api/planes` - Planes disponibles
   - Infraestructura FTTx (backbones, PONs, cajas, puertos)
