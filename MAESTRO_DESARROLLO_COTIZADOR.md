# MAESTRO DE DESARROLLO — COTIZADOR WEB MERCADO PRIMARIO

<!-- META_START -->
| Campo | Valor |
|---|---|
| **Última actualización** | <!-- LAST_UPDATED -->2026-03-31 19:43:27<!-- /LAST_UPDATED --> |
| **Último commit** | <!-- COMMIT_HASH -->a7ed60a<!-- /COMMIT_HASH --> — <!-- COMMIT_MSG -->Actualizaciones MEJORAS Y CORRECCIONES 31032026.docx fase 2. 5b: Historial — botón Descargar exporta Excel Historial_cotizaciones.xlsx<!-- /COMMIT_MSG --> |
| **Branch** | <!-- BRANCH -->main<!-- /BRANCH --> |
| **Progreso general** | <!-- PROGRESS -->0 de 37 substages completadas (0%) — 0 en progreso<!-- /PROGRESS --> |
<!-- META_END -->

---

## RESUMEN DE ESTADO POR ETAPA

| # | Etapa | Substages | Estado |
|---|---|---|---|
| 0 | Correcciones al modelo de datos (schema.sql) | 0.1 → 0.4 | ✅ COMPLETADO — ES.1-ES.4 + fix id_condicion nullable |
| 1 | Infraestructura de datos y stock | 1.1 → 1.5 | ✅ COMPLETADO — ExcelAdapter + PgAdapter + import script · P1.3 y P1.5 respondidas |
| 2 | Selección en cascada (Comuna→Entrega→Inmobiliaria→Proyecto→Unidad) | 2.1 → 2.6 | ✅ COMPLETADO — CascadeSelector + BrokerForm implementados |
| 3 | Precios, descuentos y bono pie | 3.1 → 3.6 | ✅ COMPLETADO — motor de cálculo implementado (3.1–3.5 ✅, 3.6 ✅ parcial) |
| 4 | Plan de pago y estructura del pie | 4.1 → 4.5 | ✅ COMPLETADO — implementado en cotizador.ts (casos estándar) · P3.C1–C3 pendientes (modalidades especiales) |
| 5 | Simulación hipotecaria y flujo | 5.1 → 5.3 | ✅ COMPLETADO — PMT 3 escenarios CAE, flujo mensual en cotizador.ts · amortización detallada pendiente |
| 6 | Evaluación de inversión a 5 años | 6.1 → 6.4 | ✅ COMPLETADO — plusvalía, ROI, cap rate en cotizador.ts · factor LTV 0.67 pendiente confirmación |
| 7 | Output, PDF y cotización final | 7.1 → 7.4 | ✅ COMPLETADO — 7.1 HTML ✅ · 7.2 PDF ✅ · 7.3 Email ✅ · 7.4 Historial ✅ |

---

## PREGUNTAS BLOQUEANTES PENDIENTES DE RESPUESTA

> Las siguientes preguntas deben resolverse antes de iniciar las etapas indicadas.
> Marcar con [x] cuando estén respondidas y documentadas.

### Bloque A — Datos y stock (bloquea Etapa 1)
- [x] **P1.1** ¿El stock se carga desde Excel manual, base de datos o API? ¿Frecuencia de actualización?
  > **Respondida:** Fuente inicial = **Excel (INPUT_FILES.xlsx)**, hojas: STOCK NUEVOS, CONDICIONES_COMERCIALES, PROYECTOS, UF, aux. Fase producción = **PostgreSQL** (migración). Schema SQLite en `schema.sql` (dev), PostgreSQL en `schema_pg.sql` (prod). Actualización: carga manual.
- [ ] **P1.2** ¿Qué estados de stock existen además de "Disponible" y "Arrendado"? ¿Cuáles permiten cotizar?
- [x] **P1.3** ¿Estacionamiento y Bodega se cotizan solo como añadido a un depto, o también como unidades independientes?
  > **Respondida:** Solo como **bien conjunto obligatorio o complementario** a un departamento. No se cotizan como unidades independientes. La lógica actual de `getBienesConjuntos()` ya refleja esto correctamente.
- [x] **P1.4** ¿Se usa API externa para el valor UF (CMF/Mindicador) o el archivo Excel? ¿Qué pasa si falla?
  > **Respondida:** Fase inicial = **hoja UF de INPUT_FILES.xlsx** (17.784 registros diarios 1977→2026, carga masiva única). Fase producción = API CMF (`api.cmfchile.cl`) con actualización diaria. Fallback: último valor registrado en tabla `uf_valor`.

### Bloque B — Selección (bloquea Etapa 2)
- [x] **P2.1** ¿La jerarquía de selección es siempre Inmobiliaria → Proyecto → Unidad, o hay flujos alternativos?
  > **Respondida:** El orden es **Comuna → Entrega Aprox → Inmobiliaria → Proyecto → N° Unidad** (ver REGLAS 2.1–3.2). Cada filtro depende de todos los anteriores.
- [ ] **P2.2** ¿El usuario puede filtrar unidades por tipología, orientación, piso, precio antes de seleccionar?
- [x] **P2.3** ¿El campo BIENES CONJUNTOS indica que estac/bodega está incluido en el precio lista del depto?
  > **Respondida:** BIENES CONJUNTOS significa que la compra del estacionamiento/bodega indicado es **obligatoria** junto con el depto. **No están incluidos** en el precio lista del depto — se suman con su propio precio. El valor se obtiene buscando la unidad asociada en STOCK NUEVOS por número de unidad (formato "B - 64" = Bodega nro 64).

### Bloque C — Precios críticos (bloquea Etapa 3 completa)
- [x] **P3.A1** ¿El descuento aplica solo al departamento o puede aplicar al total (depto+estac+bodega)?
  > **Respondida (por Excel COTIZADOR E36):** El descuento aplica **solo al departamento**. Estacionamiento y bodega se suman sin descuento.
- [ ] **P3.A2** ¿El descuento siempre es porcentaje o puede ser un monto fijo en UF?
- [ ] **P3.A3** ¿Puede acumularse descuento del stock + descuento negociado adicional? ¿Quién autoriza?
- [x] **P3.B1** ¿El Bono Pie es aporte al banco (eleva tasación) o subsidio directo al pie del cliente?
  > **Respondida:** El Bono Pie **eleva el valor de compraventa ante el banco** (tasación), reduciendo el LTV que el banco percibe. Fórmula (del Excel COTIZADOR): `tasacion = credito_hip_base / (1 - pie_pct - bono_pie_pct)`. El banco ve un LTV de `(1-pie_pct-bono_pie_pct)` sobre la tasación, pero financia el mismo monto en UF (`valor_venta*(1-pie_pct)`).
- [ ] **P3.B2** Para INGEVEC (DESCUENTO=0%, BONO PIE=15%): ¿cómo se calcula el valor de venta y el valor a financiar?
- [ ] **P3.B3** ¿Bono Pie y Descuento pueden coexistir activamente en la misma unidad? (MAESTRA los tiene ambos)
- [ ] **P3.B4** ¿El banco tasa el inmueble al precio lista, al precio con descuento, o a otro valor? ¿El Bono Pie cambia esa base?
- [x] **P3.B5** Jerarquía cuando coexisten Descuento + Bono Pie: ¿cuál se aplica primero y sobre qué base?
  > **Respondida:** Se aplica **primero el descuento** al precio lista del depto → luego el **Bono Pie se calcula sobre el valor post-descuento** (valor_venta). Orden: precio_lista → aplicar descuento → valor_venta → calcular tasación con bono_pie.

### Bloque D — Plan de pago (bloquea Etapa 4)
- [x] **P3.C1** ¿"Pie Período Construcción" reemplaza al pie estándar para proyectos "En Construcción", o se suma?
  > **Respondida:** **Se suma** al pie estándar (no lo reemplaza). Porcentaje predefinido por inmobiliaria; cuotas decrecen mensualmente según avance de obra. Implementado en Camino B del cotizador.
- [x] **P3.C2** ¿Qué es el CUOTÓN (INGEVEC=2%)? ¿En qué hito del flujo se paga?
  > **Respondida:** Pago único adicional **a la inmobiliaria** (no al banco), pagado en promesa o escritura. Reduce el crédito hipotecario final. INGEVEC usa 2%. Implementado en Camino B.
- [x] **P3.C3** ¿Qué es PIE CRÉDITO DIRECTO? ¿Genera un plan de pago completamente diferente?
  > **Respondida:** La inmobiliaria financia directamente un porcentaje del valor. Tiene plan propio (% + plazo) y puede coexistir con el crédito hipotecario bancario. Implementado en Camino B.
- [ ] **P3.D1** INGEVEC tiene CUOTAS PIE=1 (pago único). ¿Cuándo se paga esa cuota?
- [ ] **P3.D2** ¿Las cuotas del pie son siempre mensuales e iguales, o pueden ser irregulares?
- [ ] **P4.1** ¿La Reserva es siempre $100.000 CLP o varía por proyecto/inmobiliaria? ¿Puede ser en UF?
- [ ] **P4.2** ¿El Upfront a la Promesa (2%) es fijo para todas las inmobiliarias o varía?
- [ ] **P4.3** ¿Existen hitos de pago adicionales (firma escritura, entrega llaves)? ¿Varían por inmobiliaria?
- [ ] **P4.4** ¿El Upfront es parte de las cuotas del pie o es un pago separado previo?

### Bloque E — Simulación (bloquea Etapa 5)
- [ ] **P5.1** ¿Los 3 escenarios de CAE son fijos (4%, 4.5%, 5%) o el broker puede cambiarlos?
- [ ] **P5.2** ¿El plazo de 30 años aplica a todas las inmobiliarias o hay restricciones?
- [ ] **P5.3** ¿La base del PMT es siempre Total_Descuento - Pie, o puede ser el CH_ajustado sobre tasación?

### Bloque F — Output (bloquea Etapa 7)
- [x] **P6.1** ¿Qué formato tiene la cotización final: PDF, pantalla imprimible, email, todo?
  > **Respondida:** Todos los formatos. Pantalla imprimible ✅ · PDF descargable ✅ · Envío por email ✅ (SMTP/nodemailer).
- [ ] **P6.2** ¿Se muestran los 3 escenarios CAE juntos o el broker elige uno?
- [x] **P6.3** ¿Debe registrarse quién generó cada cotización y cuándo (historial)?
  > **Respondida:** Sí. Implementado en `lib/services/historial.ts` + `TablaHistorial` + página `/historial`.
- [ ] **P6.4** ¿La cotización requiere aprobación antes de enviarse al cliente?

### Bloque G — Correcciones al schema (bloquea Etapa 0 completa)

> Decisiones técnicas requeridas antes de aplicar correcciones al `schema.sql`.
> Identificadas en [EVALUACIÓN_SCHEMA_DATOS.md](EVALUACIÓN_SCHEMA_DATOS.md) (2026-03-24).

- [x] **ES.1** ¿Se crea tabla maestra `programa` o se define un CHECK constraint? *(bloquea 0.1 → problema C2)*
  > **Respondida:** Opción A — tabla maestra `programa` con FK en `unidad` y `condicion_comercial`. Implementado en schema.sql v2 + schema_pg.sql v2.
- [x] **ES.2** ¿Los escenarios CAE se normalizan en tabla hija? *(bloquea 0.2 → problema I1)*
  > **Respondida:** Opción A — tabla `cotizacion_escenario` normaliza los 3 escenarios. Implementado.
- [x] **ES.3** ¿Se agrega `modalidad_pago` a `condicion_comercial`? *(bloquea 0.3 → mejora M1)*
  > **Respondida:** Opción A — campo `modalidad_pago TEXT CHECK(ESTANDAR|CONSTRUCCION|CREDITO_DIRECTO)`. Implementado.
- [x] **ES.4** ¿Se implementa la entidad `broker`? *(bloquea 0.4 → problema I4)*
  > **Respondida:** Opción A — entidad `broker` con FK en `cotizacion`. Upsert por RUT en servicio historial. Implementado.

---

## ETAPA 0 — CORRECCIONES AL MODELO DE DATOS

> **Objetivo:** Aplicar las correcciones identificadas en la evaluación de `schema.sql` antes de iniciar el desarrollo de las etapas funcionales. Garantiza integridad del histórico de cotizaciones, confiabilidad de joins y consistencia de tipos de datos.
> **Referencia:** [EVALUACIÓN_SCHEMA_DATOS.md](EVALUACIÓN_SCHEMA_DATOS.md)
> **Prerrequisito:** Respuestas a ES.1–ES.4.

---

### 0.1 — Correcciones críticas: snapshot y join de programa
<!-- SUBSTAGE:0.1 -->
**Estado:** `✅ COMPLETADO`
**Archivos modificados:** `scripts/schema.sql` · `scripts/schema_pg.sql`
**Implementado:**
- **C1** — Snapshot completo en `cotizacion`: descuento, bono_pie, cuoton, pie_periodo_constr, pie_credito_directo, reserva, modalidad_pago
- **C2** — Tabla maestra `programa` con FK en `unidad` y `condicion_comercial` (ES.1 ✅)
- Vista `v_stock_cotizable` actualizada con JOIN a `programa` y exposición de `id_condicion`
- Fix: `cotizacion.id_condicion` → NULL permitido (unidad puede no tener condición activa)
<!-- /SUBSTAGE -->

---

### 0.2 — Normalización de datos: dormitorios y tipo_unidad
<!-- SUBSTAGE:0.2 -->
**Estado:** `✅ COMPLETADO`
**Implementado:**
- **I2** — `dormitorios_num INTEGER` + `dormitorios_display TEXT` en schema y ExcelAdapter
- **I3** — CHECK constraint con 5 valores canónicos en `unidad.tipo_unidad`; import script normaliza con `TIPO_MAP`
- **M3** — `bienes_conjuntos` marcado como campo de trazabilidad (solo importación); lógica de negocio usa tabla `bien_conjunto`
<!-- /SUBSTAGE -->

---

### 0.3 — Corrección estructural: escenarios CAE y modalidad de pago
<!-- SUBSTAGE:0.3 -->
**Estado:** `✅ COMPLETADO`
**Implementado:**
- **I1** — Tabla `cotizacion_escenario` normaliza los 3 escenarios CAE (ES.2 ✅)
- **M1** — Campo `modalidad_pago TEXT CHECK` en `condicion_comercial` (ES.3 ✅); inferido al importar desde Excel
<!-- /SUBSTAGE -->

---

### 0.4 — Entidad Broker
<!-- SUBSTAGE:0.4 -->
**Estado:** `✅ COMPLETADO`
**Implementado:**
- **I4** — Tabla `broker (id_broker, nombre, rut, email, telefono, empresa, activo)` (ES.4 ✅)
- FK `cotizacion.id_broker` reemplaza `nombre_broker TEXT`
- Upsert por RUT en `lib/services/historial.ts` (`_guardarPG`)
<!-- /SUBSTAGE -->

---

## ETAPA 1 — INFRAESTRUCTURA DE DATOS Y STOCK

> **Objetivo:** Disponer de los datos del stock, la UF y los parámetros de configuración listos para ser consumidos por el cotizador.
> **Prerrequisito:** Respuestas a P1.1, P1.2, P1.3, P1.4.

---

### 1.1 — Modelo de datos del stock
<!-- SUBSTAGE:1.1 -->
**Estado:** `⚠️ BLOQUEADO`
**Archivos esperados:** `src/models/stock.ts` | `src/types/stock.ts`
**Preguntas bloqueantes:** P1.1, P1.2, P1.3 + **Etapa 0.2 completada** (I2: dormitorios_num, I3: tipo_unidad canónico)
**Descripción:** Definir el schema/tipo del objeto Unidad con todos los campos de STOCK NUEVOS.
**Faltantes para completar:**
- [ ] Completar substage 0.2 antes de definir tipos (dormitorios_num, tipo_unidad canónico)
- [ ] Confirmar campos obligatorios vs opcionales por inmobiliaria
- [ ] Definir tipos de datos (SUPERFICIE UTIL viene como texto con coma decimal → normalizar)
- [ ] Definir enum de ESTADO STOCK (Disponible, Arrendado, ¿otros?)
- [ ] Definir enum de TIPO ENTREGA (Entrega Inmediata, En Construcción)
- [ ] Respuesta a P1.3 sobre estacionamiento/bodega independientes
<!-- /SUBSTAGE -->

---

### 1.2 — Carga y normalización del stock
<!-- SUBSTAGE:1.2 -->
**Estado:** `✅ COMPLETADO`
**Archivos creados:**
- `lib/data/types.ts` — tipos TypeScript: StockRow, CondicionComercialRow, ProyectoRow, UnidadCotizable, UFRow
- `lib/data/repository.ts` — interfaz IStockRepository (getComunas, getEntregas, getInmobiliarias, getProyectos, getUnidades, getUFdelDia)
- `lib/data/excel-adapter.ts` — ExcelAdapter: parsea las 4 hojas de INPUT_FILES.xlsx con SheetJS, singleton cacheado, join stock+condiciones, split dormitorios
- `lib/data/index.ts` — exporta `stockRepository = new ExcelAdapter()`
**Notas de implementación:**
- Columnas con tildes mapeadas con escapes unicode (`BA\u00d1OS`, `CUOT\u00d3N`, etc.)
- `parseNum()` maneja texto con coma (`'43,35'` → `43.35`) y `#N/A`
- `parseDormitorios()` convierte `'1-1/2'` → `{ dormitoriosNum: 1.5, dormitoriosDisplay: '1-1/2' }`
- `PgAdapter` pendiente para Etapa de producción (fase 2)
<!-- /SUBSTAGE -->

---

### 1.3 — Servicio de valor UF
<!-- SUBSTAGE:1.3 -->
**Estado:** `✅ COMPLETADO`
**Archivos creados:**
- `lib/data/uf-service.ts` — `getUFdelDia()` con caché en memoria por día, `formatUF()`, `formatCLP()`, `ufToCLP()`
**Notas de implementación:**
- Caché diario en memoria (se limpia al reiniciar servidor)
- Fallback automático: si no hay registro del día → usa el último disponible en el archivo
- Fase producción: reemplazar `stockRepository.getUFdelDia()` por llamada a API CMF
<!-- /SUBSTAGE -->

---

### 1.4 — Tablas de configuración (parámetros)
<!-- SUBSTAGE:1.4 -->
**Estado:** `✅ COMPLETADO`
**Archivos creados:**
- `lib/config/cotizadorConfig.ts` — CAE_OPTIONS, PIE_OPTIONS, PLAZO_OPTIONS, CONSTANTES, DEFAULTS
<!-- /SUBSTAGE -->

---

### 1.5 — Estructura de datos de inmobiliarias y proyectos
<!-- SUBSTAGE:1.5 -->
**Estado:** `✅ COMPLETADO`
**Archivos:** `lib/data/excel-adapter.ts` · `lib/data/pg-adapter.ts` · `lib/data/types.ts`
**Implementado:**
- Reglas comerciales por inmobiliaria vienen 100% del Excel (hoja CONDICIONES_COMERCIALES): descuento, bono_pie, cuotas_pie, pie_periodo_construccion, cuoton, pie_credito_directo
- No hay config adicional por inmobiliaria fuera del Excel — confirmado (P1.5: actualización = carga manual Excel)
- INGEVEC (descuento=0, bono=15%) y MAESTRA (descuento=10%, bono=10%) ambos cubiertos por el modelo paramétrico de `calcularCotizacion()`
- Estacionamiento/Bodega solo como bien conjunto obligatorio al depto — nunca unidades independientes (P1.3 ✅)
- Actualización del stock: carga manual Excel (`INPUT_FILES.xlsx`) → en producción `scripts/import_excel_pg.ts`
<!-- /SUBSTAGE -->

---

## ETAPA 2 — SELECCIÓN EN CASCADA

> **Objetivo:** UI de selección encadenada **Comuna → Entrega Aprox → Inmobiliaria → Proyecto → N° Unidad**. Cada dropdown se recarga al cambiar el anterior. La selección de N° Unidad dispara el auto-completado de todas las características de la propiedad.
> **Prerrequisito:** Etapa 1 completa. Respuesta P2.1 ✅ (respondida). Respuestas P2.2, P2.3 pendientes.
> **Reglas de referencia:** REGLAS_COTIZADOR.xlsx — Sección 2 (2.1–2.4) y Sección 3 (3.1–3.2).

---

### 2.1 — Selector de Comuna
<!-- SUBSTAGE:2.1 -->
**Estado:** `✅ COMPLETADO` (implementado como parte de CascadeSelector)
**Archivos creados:** `components/cascade/CascadeSelector.tsx`
<!-- /SUBSTAGE -->

---

### 2.2 — Selector de Entrega Aprox.
<!-- SUBSTAGE:2.2 -->
**Estado:** `✅ COMPLETADO` (implementado como parte de CascadeSelector)
<!-- /SUBSTAGE -->

---

### 2.3 — Selector de Inmobiliaria
<!-- SUBSTAGE:2.3 -->
**Estado:** `✅ COMPLETADO` (implementado como parte de CascadeSelector)
<!-- /SUBSTAGE -->

---

### 2.4 — Selector de Proyecto
<!-- SUBSTAGE:2.4 -->
**Estado:** `✅ COMPLETADO` (implementado como parte de CascadeSelector)
<!-- /SUBSTAGE -->

---

### 2.5 — Selector de N° Unidad y auto-completado
<!-- SUBSTAGE:2.5 -->
**Estado:** `✅ COMPLETADO` (incluido en CascadeSelector — Paso 5 N°Unidad)
**Notas:** Implementado en `components/cascade/CascadeSelector.tsx`. Filtra unidades con `estadoStock='Disponible'`. El resumen de unidad seleccionada (precio, tipología, m²) se muestra en `CotizadorShell`. BIENES CONJUNTOS (P2.3) pendiente de definición para Etapa 3.
<!-- /SUBSTAGE -->

---

### 2.6 — Formulario de datos del broker/cliente
<!-- SUBSTAGE:2.6 -->
**Estado:** `✅ COMPLETADO`
**Archivos creados:**
- `lib/utils/rut.ts` — `validateRut()`, `formatRut()`, `cleanRut()`, `calcDV()`
- `components/broker/BrokerForm.tsx` — formulario con validación zod: nombre, RUT, email, teléfono, empresa
**Notas:** RUT se valida con algoritmo módulo-11 estándar chileno. Auto-formato al perder foco (blur).
<!-- /SUBSTAGE -->

---

## ETAPA 3 — PRECIOS, DESCUENTOS Y BONO PIE

> **Objetivo:** Calcular correctamente el precio de venta y el valor base para el crédito hipotecario, para cada inmobiliaria.
> **Prerrequisito:** Etapa 2 completa. **TODAS las preguntas del Bloque C y D deben estar respondidas.**
> ⚠️ **Esta etapa está completamente bloqueada hasta responder P3.B1, P3.B2, P3.B4 y P3.B5.**

---

### 3.1–3.5 — Motor de cálculo (precio, descuento, bono pie, tasación, PMT)
<!-- SUBSTAGE:3.1 -->
<!-- SUBSTAGE:3.2 -->
<!-- SUBSTAGE:3.3 -->
<!-- SUBSTAGE:3.4 -->
<!-- SUBSTAGE:3.5 -->
**Estado:** `✅ COMPLETADO`
**Archivos creados:**
- `lib/calculators/cotizador.ts` — función `calcularCotizacion(input)` con todo el pipeline:
  - Precios lista (depto + bienes conjuntos vía `getBienesConjuntos()`)
  - Descuento solo al depto (P3.A1 ✅)
  - Valor de venta = depto_desc + conjuntos (P3.B5 ✅: descuento primero)
  - Pie total, Reserva, Upfront (2%), Saldo Pie, Cuotas Pie (60 meses)
  - Tasación = creditoHipBase / (1 − pie − bonoPie) (P3.B1 ✅: eleva compraventa banco)
  - 3 escenarios CAE: PMT mensual CLP/UF, flujo mensual/acumulado 5 años
  - Evaluación 5 años: plusvalía, precio venta año 5 (haircut 95%), ROI 5 años, ROI anual, Cap Rate
- `lib/data/excel-adapter.ts` — `getBienesConjuntos()`: parsea "B - 64", "E - 50" y retorna unidades del stock
- `app/actions/stock.ts` — `getBienesConjuntos()` server action
- `components/cotizacion/PanelCotizacion.tsx` — UI completa con parámetros editables (pie%, plazo, 3 CAE, arriendo, plusvalía) y tablas de resultado
**Fórmulas verificadas celda a celda** contra `INPUT_FILES.xlsx → hoja COTIZADOR`.
<!-- /SUBSTAGE -->

---

### 3.6 — Matriz de reglas por inmobiliaria
<!-- SUBSTAGE:3.6 -->
**Estado:** `🟡 PARCIAL` — reglas de MAESTRA e INGEVEC cubiertas implícitamente. Pendiente tabla explícita.
**Notas:** El motor `calcularCotizacion` es paramétrico: acepta `descuentoPct=0` (INGEVEC) y `bonoPiePct=0` sin errores. La lógica de cuotón, pie construcción y crédito directo (P3.C1–P3.C3) aún pendiente.
<!-- /SUBSTAGE -->

---

## ETAPA 4 — PLAN DE PAGO Y ESTRUCTURA DEL PIE

> **Objetivo:** Calcular la estructura completa del pie: reserva, upfront, saldo, cuotas.
> **Prerrequisito:** Etapa 3 completa. Respuestas a P4.1–P4.4 y P3.C1–P3.D2.

---

### 4.1 — Pie total y porcentaje de pie
<!-- SUBSTAGE:4.1 -->
**Estado:** `✅ COMPLETADO` (caso estándar implementado en `lib/calculators/cotizador.ts`)
**Implementado:**
- `pieTotalUF = valorVentaUF * piePct` [E40]
- Selector de pie% en UI (5%–40% de a 5%) en `PanelCotizacion.tsx`
- P3.C1 (PIE PERÍODO CONSTRUCCIÓN) pendiente para modalidad especial
<!-- /SUBSTAGE -->

---

### 4.2 — Reserva
<!-- SUBSTAGE:4.2 -->
**Estado:** `✅ COMPLETADO` (implementado; P4.1 respuesta pendiente pero el motor funciona con el valor del stock)
**Implementado:**
- `reservaUF = reservaCLP / valorUF` [E41]
- `reservaCLP` se lee de `unidad.reserva` del stock
- P4.1: si la reserva puede estar en UF, se requiere ajuste menor
<!-- /SUBSTAGE -->

---

### 4.3 — Upfront a la Promesa
<!-- SUBSTAGE:4.3 -->
**Estado:** `✅ COMPLETADO` (implementado; confirmación P4.2 pendiente)
**Implementado:**
- `upfrontUF = round(valorVentaUF * 0.02, 2)` [E42] — 2% fijo (constante en `cotizadorConfig.ts`)
- P4.2: si varía por inmobiliaria, se parametriza desde `CondicionComercialRow`
<!-- /SUBSTAGE -->

---

### 4.4 — Saldo pie, cuotas y plan de pago
<!-- SUBSTAGE:4.4 -->
**Estado:** `✅ COMPLETADO` (caso estándar implementado; modalidades especiales pendientes)
**Implementado:**
- `saldoPieUF = pieTotalUF - reservaUF - upfrontUF` [E43]
- `cuotasPieN = 60` · `valorCuotaPieUF = saldoPieUF / 60` [E58]
- Para INGEVEC (cuotas=1): el motor calcula 1 cuota → correcto aritméticamente
**Pendiente:**
- P3.D1: ¿cuándo se paga la cuota única de INGEVEC?
- P3.C2: CUOTÓN (pago especial 2% INGEVEC)
- P4.3: hitos adicionales de pago
<!-- /SUBSTAGE -->

---

### 4.5 — Crédito hipotecario sobre precio de venta
<!-- SUBSTAGE:4.5 -->
**Estado:** `✅ COMPLETADO` (implementado; P5.3 pendiente pero motor funciona)
**Implementado:**
- `creditoHipFinalUF = valorVentaUF - piePagadoUF` [E60]
- Base del PMT = `creditoHipFinalUF * valorUF` (CLP)
- P5.3: si la base es ch_ajustado en lugar de ch_final, se ajusta el input del PMT
<!-- /SUBSTAGE -->

---

## ETAPA 5 — SIMULACIÓN HIPOTECARIA Y FLUJO

> **Objetivo:** Calcular cuotas mensuales del crédito para 3 escenarios de CAE, y el flujo arriendo vs cuota.
> **Prerrequisito:** Etapa 4 completa. Respuestas a P5.1, P5.2, P5.3.

---

### 5.1 — Cálculo de cuota hipotecaria (PMT) — 3 escenarios
<!-- SUBSTAGE:5.1 -->
**Estado:** `✅ COMPLETADO` (implementado en `lib/calculators/cotizador.ts`)
**Implementado:**
- `pmt(tasa, n, pv)` JavaScript equivalente a Excel PMT
- 3 escenarios CAE: editables en UI (selector), default [4%, 4.5%, 5%]
- Plazo: editable en UI (selector), default 30 años
- Cuota en CLP y UF para cada escenario
- Edge case CAE=0: `cuota = pv / n` (división lineal)
<!-- /SUBSTAGE -->

---

### 5.2 — Flujo mensual neto (arriendo vs cuota)
<!-- SUBSTAGE:5.2 -->
**Estado:** `✅ COMPLETADO` (implementado en `lib/calculators/cotizador.ts` + `PanelCotizacion.tsx`)
**Implementado:**
- `flujoMensual = arriendoCLP - cuotaCHP_clp` por cada escenario CAE
- `flujoAcumulado = flujoMensual * 11 * 5` (11 meses/año × 5 años)
- UI: campo de arriendo editable con formato CLP, 3 valores por escenario
- Indicador visual: verde (positivo) / rojo (negativo) en tabla de escenarios
<!-- /SUBSTAGE -->

---

### 5.3 — Tabla de amortización hipotecaria
<!-- SUBSTAGE:5.3 -->
**Estado:** `🔴 PENDIENTE` (cálculo de saldo a 60 meses implementado en 6.2 via fórmula cerrada; tabla completa no implementada)
**Faltantes para completar:**
- [ ] Calcular y mostrar tabla mes a mes de capital/interés pagado (no urgente)
- [ ] Fórmula cerrada del saldo a N meses ya existe en 6.2
<!-- /SUBSTAGE -->

---

## ETAPA 6 — EVALUACIÓN DE INVERSIÓN A 5 AÑOS

> **Objetivo:** Calcular el retorno de inversión, Cap Rate y ROI proyectado a 5 años.
> **Prerrequisito:** Etapa 5 completa.

---

### 6.1 — Flujo acumulado y plusvalía
<!-- SUBSTAGE:6.1 -->
**Estado:** `✅ COMPLETADO` (implementado en `lib/calculators/cotizador.ts` + UI)
**Implementado:**
- `flujoAcumulado = flujoMensual * 11 * 5` por escenario [E75]
- `plusvaliaAcumulada = (1 + plusvaliaAnualPct)^5 - 1`
- `precioVentaAnio5CLP = valorVentaCLP * (1 + plusvaliaAcumulada) * 0.95` [E82]
- UI: campo plusvalía% editable (default 2%), se aplica igual en los 3 escenarios
<!-- /SUBSTAGE -->

---

### 6.2 — CH amortizado en 60 meses (factor LTV 0.67)
<!-- SUBSTAGE:6.2 -->
**Estado:** `✅ COMPLETADO` (implementado en `lib/calculators/cotizador.ts`)
**Implementado:**
- Fórmula cerrada de saldo a 60 meses para los 3 escenarios
- `amortizado = (ch_plan_clp - saldo) * 0.67` (FACTOR_LTV constante)
- Edge case CAE=0: amortización lineal
**Pendiente:**
- [ ] Confirmar origen del factor 0.67 con el equipo (posiblemente restricción legal LTV máximo banco)
<!-- /SUBSTAGE -->

---

### 6.3 — Cap Rate
<!-- SUBSTAGE:6.3 -->
**Estado:** `✅ COMPLETADO` (implementado en `lib/calculators/cotizador.ts`)
**Implementado:**
- `capRate = (arriendoCLP * 11 / valorUF) / tasacionUF` [E86]
- Calculado para los 3 escenarios (cada uno con su arriendo)
- Mostrado como % con 2 decimales en CotizacionTemplate y CotizacionPDF
<!-- /SUBSTAGE -->

---

### 6.4 — ROI a 5 años y ROI anual compuesto
<!-- SUBSTAGE:6.4 -->
**Estado:** `✅ COMPLETADO` (implementado en `lib/calculators/cotizador.ts`)
**Implementado (P3.B1 ✅):**
- `Si bonoPie > 0: base = creditoHipFinalCLP; Si no: base = tasacionCLP`
- `roi5a = (precioVentaAnio5CLP - base + flujoAcumulado + amortizado) / base` [E88]
- `roiAnual = (1 + roi5a)^(1/5) - 1`
- Mostrado como % con 2 decimales
<!-- /SUBSTAGE -->

---

## ETAPA 7 — OUTPUT, PDF Y COTIZACIÓN FINAL

> **Objetivo:** Generar la cotización en el formato requerido con todos los datos calculados.
> **Prerrequisito:** Etapas 1–6 completas. Respuestas a P6.1–P6.4.

---

### 7.1 — Diseño del documento de cotización
<!-- SUBSTAGE:7.1 -->
**Estado:** `✅ COMPLETADO`
**Archivos creados:**
- `components/cotizacion/CotizacionTemplate.tsx` — documento HTML imprimible con @media print
  - 7 secciones: corredor, proyecto, características, precios, plan de pie, crédito hipotecario, 3 escenarios CAE, evaluación 5 años, disclaimer
  - `#print-cotizacion` wrapper + `app/globals.css` @media print (A4 portrait, 15mm/12mm márgenes)
**Notas:** Muestra 3 escenarios CAE (P6.2 ✅ implícito). Disclaimer legal incluido. Branding VIVEPROP pendiente (logo).
<!-- /SUBSTAGE -->

---

### 7.2 — Generación de PDF
<!-- SUBSTAGE:7.2 -->
**Estado:** `✅ COMPLETADO`
**Archivos creados:**
- `components/cotizacion/CotizacionPDF.tsx` — documento @react-pdf/renderer (StyleSheet, Document/Page/View/Text)
- `app/api/cotizacion/pdf/route.ts` — POST /api/cotizacion/pdf → renderToBuffer → descarga .pdf
- `lib/utils/correlativo.ts` — `siguienteNumeroCotizacion()`, formato COT-2026-0001, resets anual
- `app/actions/stock.ts` — `getNumeroCotizacion()` server action
**Notas:** Número de cotización se genera al hacer "Ver Documento". Correlativo basado en archivo `.cotizaciones-seq.json` (ignorado en git). En prod migrar a tabla `cotizacion` en PostgreSQL.
<!-- /SUBSTAGE -->

---

### 7.3 — Envío por email
<!-- SUBSTAGE:7.3 -->
**Estado:** `✅ COMPLETADO`
**Archivos creados:**
- `lib/services/email.ts` — servicio nodemailer SMTP lazy; HTML con resumen + tabla escenarios CAE; PDF como adjunto
- `app/api/cotizacion/email/route.ts` — POST /api/cotizacion/email: genera PDF + llama enviarCotizacion()
**Integración UI:** botón "✉ Enviar por Email" en PanelCotizacion → formulario inline teal con campo email cliente (opcional); siempre envía al broker; toast ok/error
**Variables necesarias en .env.local:** `SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, `SMTP_PASS`, `EMAIL_FROM`
<!-- /SUBSTAGE -->

---

### 7.4 — Historial de cotizaciones
<!-- SUBSTAGE:7.4 -->
**Estado:** `✅ COMPLETADO`
**Archivos creados:**
- `lib/services/historial.ts` — dual-mode: JSON dev (`.cotizaciones-historial.json`) / PostgreSQL prod; upsert broker por RUT; inserta cotizacion + 3 escenarios
- `app/actions/stock.ts` — `guardarCotizacionAction()` + `listarCotizacionesAction()`
- `components/historial/TablaHistorial.tsx` — Server Component; tabla 10 columnas
- `app/historial/page.tsx` — página /historial con Suspense fallback
**Integración UI:** "Ver Documento" dispara guardar (fire-and-forget); enlace "Historial" en header de CotizadorShell
<!-- /SUBSTAGE -->

---


---

## INFRAESTRUCTURA ADICIONAL (fuera del plan original)

> Componentes implementados que no estaban en el plan de etapas original pero son necesarios para producción.

### PgAdapter — Adaptador PostgreSQL
**Estado:** `✅ COMPLETADO`
**Archivos creados:**
- `lib/db/client.ts` — cliente PostgreSQL lazy via `getDb()`; singleton con hot-reload seguro en dev
- `lib/data/pg-adapter.ts` — `PgAdapter` implementa los 7 métodos de `IStockRepository` sobre `v_stock_cotizable`
- `lib/data/uf-format.ts` — funciones puras client-safe (`formatUF`, `formatCLP`, `ufToCLP`); rompe cadena de import hacia `postgres` en bundle cliente
- `lib/data/index.ts` — require dinámico según `DATA_SOURCE`; evita bundling de `postgres` en cliente
- `next.config.ts` — `serverExternalPackages: ['postgres']`
**Activación:** `DATA_SOURCE=postgres` en `.env.local` (requiere `DATABASE_URL` y datos importados)

### Script de importación Excel → PostgreSQL
**Estado:** `✅ COMPLETADO`
**Archivos creados:**
- `scripts/import_excel_pg.ts` — 7 pasos: programa → inmobiliaria → proyecto → unidad → condicion_comercial → uf_valor → bien_conjunto; idempotente (ON CONFLICT upsert); batches de 500 filas; carga .env.local automáticamente
**Uso:** `npm run import:excel` (requiere `DATABASE_URL` en entorno o `.env.local`)

### Correlativo dual-mode
**Estado:** `✅ COMPLETADO`
**Implementado:** `lib/utils/correlativo.ts` — dual-mode: JSON dev / tabla `correlativo` PG prod. Clave `cotizacion_<YYYY>` con `INSERT ... ON CONFLICT DO UPDATE` (atómico, reinicio anual automático). Tabla agregada a `schema.sql` y `schema_pg.sql`.

## TECH STACK DECIDIDO

> Decisiones de arquitectura técnica confirmadas. Estas decisiones son vinculantes para todas las etapas.

### Framework y runtime

| Capa | Tecnología | Versión | Notas |
|---|---|---|---|
| **UI / Frontend** | React | **19** | Server Components, Actions, `use()` hook |
| **Framework web** | Next.js | **15** (App Router) | Bundla React 19; Server Actions para data layer |
| **Lenguaje** | TypeScript | 5.x | Strict mode |
| **Estilos** | Tailwind CSS | 4.x | + shadcn/ui para componentes |

### Base de datos y datos

| Fase | Motor | Herramienta | Archivo de schema |
|---|---|---|---|
| **Desarrollo / inicial** | SQLite (embebido) | `better-sqlite3` | `scripts/schema.sql` |
| **Producción** | **PostgreSQL 15+** | `drizzle-orm` + `postgres` | `scripts/schema_pg.sql` |
| **Fuente de datos** | Excel | `xlsx` library | `INPUT_FILES.xlsx` |

### Patrón de acceso a datos

```
src/lib/data/
  types.ts          ← tipos compartidos
  repository.ts     ← interfaz IStockRepository (misma API en ambas fases)
  excel-adapter.ts  ← fase inicial: lee INPUT_FILES.xlsx
  pg-adapter.ts     ← fase producción: lee PostgreSQL
  index.ts          ← exporta el adaptador activo (ENV: DATA_SOURCE=excel|postgres)
```

### Librerías clave confirmadas

| Propósito | Librería |
|---|---|
| Parser Excel | `xlsx` (SheetJS) |
| PDF generation | `@react-pdf/renderer` |
| PostgreSQL client | `postgres` (Drizzle) |
| Validación formularios | `react-hook-form` + `zod` |
| RUT chileno | `rutjs` o validación custom |

---

## DOCUMENTOS DE REFERENCIA

| Documento | Descripción |
|---|---|
| [scripts/schema.sql](scripts/schema.sql) | DDL SQLite — 8 tablas, 1 vista, 19 índices, 5 triggers |
| [EVALUACIÓN_SCHEMA_DATOS.md](EVALUACIÓN_SCHEMA_DATOS.md) | Evaluación técnica del schema con 9 problemas identificados y plan de corrección |
| [MODELO_DATOS_COTIZADOR.md](MODELO_DATOS_COTIZADOR.md) | Documentación completa del modelo de datos |
| [ERD_COTIZADOR.md](ERD_COTIZADOR.md) | Diagrama entidad-relación (Mermaid) |
| [MODELO_DATOS_COTIZADOR.xlsx](MODELO_DATOS_COTIZADOR.xlsx) | Modelo en Excel con PKs, FKs, índices, constraints y datos semilla |
| [REGLAS_COTIZADOR.xlsx](REGLAS_COTIZADOR.xlsx) | Reglas de cálculo y selección documentadas desde el COTIZADOR Excel |

---

## HISTORIAL DE COMMITS

<!-- HISTORIAL_START -->
| Fecha | Commit | Branch | Descripción |
|---|---|---|---|
| 2026-03-30 | — | main | Etapa 0 completa: schema.sql y schema_pg.sql v2 — tabla programa (ES.1), cotizacion_escenario (ES.2), modalidad_pago (ES.3), entidad broker (ES.4), snapshots C1, I3, I4 |
| 2026-03-30 | — | main | Camino B completo: CUOTÓN (P3.C2), PIE PERÍODO CONSTRUCCIÓN (P3.C1), PIE CRÉDITO DIRECTO (P3.C3) — motor + UI + template HTML + PDF |
| 2026-03-30 | d80d79c | main | MAESTRO actualizado: progreso real 22/37 (59%). Etapas 4-6 marcadas ✅ (implementadas en cotizador.ts). 7.1 y 7.2 ✅ Camino A completo |
| 2026-03-29 | ae3c337 | main | Camino A completado: CotizacionTemplate HTML + @media print, CotizacionPDF @react-pdf/renderer, correlativo COT-2026-XXXX, POST /api/cotizacion/pdf |
| 2026-03-29 | — | main | Etapa 3 completa: motor calcularCotizacion (fórmulas Excel verificadas), PanelCotizacion 3 escenarios CAE, getBienesConjuntos, P3.B1/B5/A1/P2.3 respondidas |
| 2026-03-29 | — | main | Etapas 1.2–1.4 + 2.1–2.6: data layer (IStockRepository+ExcelAdapter+ufService), CascadeSelector 5 pasos, BrokerForm RUT, CotizadorShell |
| 2026-03-29 | — | main | Scaffold Next.js 15 + React 19 + TypeScript strict + Tailwind CSS 4.x (package.json, next.config.ts, tsconfig.json, postcss.config.mjs) |
| 2026-03-24 | — | main | Rediseño filtrado en cascada: Comuna→Entrega→Inmobiliaria→Proyecto→Unidad (Etapa 2: 4→6 substages, nuevo idx_proyecto_cascada) |
| 2026-03-24 | — | main | Evaluación técnica schema.sql → EVALUACIÓN_SCHEMA_DATOS.md (9 problemas identificados) |
| 2026-03-24 | — | main | Genera MODELO_DATOS_COTIZADOR.xlsx (6 hojas: resumen, columnas, relaciones, índices, constraints, semilla) |
| 2026-03-23 | d0eea66 | main | carga archivo para determinar logicas y calculos |
| 2026-03-23 | 1f000af | main | crea docs de trabajo |
<!-- HISTORIAL_END -->
