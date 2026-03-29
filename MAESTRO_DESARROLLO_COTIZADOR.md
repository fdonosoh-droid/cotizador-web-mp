# MAESTRO DE DESARROLLO — COTIZADOR WEB MERCADO PRIMARIO

<!-- META_START -->
| Campo | Valor |
|---|---|
| **Última actualización** | <!-- LAST_UPDATED -->2026-03-29 11:13:23<!-- /LAST_UPDATED --> |
| **Último commit** | <!-- COMMIT_HASH -->06126c6<!-- /COMMIT_HASH --> — <!-- COMMIT_MSG -->Inicio fase 1 desarrollo<!-- /COMMIT_MSG --> |
| **Branch** | <!-- BRANCH -->main<!-- /BRANCH --> |
| **Progreso general** | <!-- PROGRESS -->0 de 37 substages completadas (0%) — 0 en progreso<!-- /PROGRESS --> |
<!-- META_END -->

---

## RESUMEN DE ESTADO POR ETAPA

| # | Etapa | Substages | Estado |
|---|---|---|---|
| 0 | Correcciones al modelo de datos (schema.sql) | 0.1 → 0.4 | ⚠️ BLOQUEADO — requiere decisiones ES.1–ES.4 |
| 1 | Infraestructura de datos y stock | 1.1 → 1.5 | 🟡 EN PROGRESO — 1.2, 1.3, 1.4 ✅ · 1.1, 1.5 pendientes |
| 2 | Selección en cascada (Comuna→Entrega→Inmobiliaria→Proyecto→Unidad) | 2.1 → 2.6 | ✅ COMPLETADO — CascadeSelector + BrokerForm implementados |
| 3 | Precios, descuentos y bono pie | 3.1 → 3.6 | ⚠️ BLOQUEADO — requiere respuestas P3.B1–P3.B5 + Etapa 0 (C1, I1) |
| 4 | Plan de pago y estructura del pie | 4.1 → 4.5 | ⚠️ BLOQUEADO — depende de Etapa 3 |
| 5 | Simulación hipotecaria y flujo | 5.1 → 5.3 | ⚠️ BLOQUEADO — depende de Etapa 4 |
| 6 | Evaluación de inversión a 5 años | 6.1 → 6.4 | ⚠️ BLOQUEADO — depende de Etapa 5 |
| 7 | Output, PDF y cotización final | 7.1 → 7.4 | ⚠️ BLOQUEADO — depende de Etapa 0 (I4) + P6.1–P6.4 |

---

## PREGUNTAS BLOQUEANTES PENDIENTES DE RESPUESTA

> Las siguientes preguntas deben resolverse antes de iniciar las etapas indicadas.
> Marcar con [x] cuando estén respondidas y documentadas.

### Bloque A — Datos y stock (bloquea Etapa 1)
- [x] **P1.1** ¿El stock se carga desde Excel manual, base de datos o API? ¿Frecuencia de actualización?
  > **Respondida:** Fuente inicial = **Excel (INPUT_FILES.xlsx)**, hojas: STOCK NUEVOS, CONDICIONES_COMERCIALES, PROYECTOS, UF, aux. Fase producción = **PostgreSQL** (migración). Schema SQLite en `schema.sql` (dev), PostgreSQL en `schema_pg.sql` (prod). Actualización: carga manual.
- [ ] **P1.2** ¿Qué estados de stock existen además de "Disponible" y "Arrendado"? ¿Cuáles permiten cotizar?
- [ ] **P1.3** ¿Estacionamiento y Bodega se cotizan solo como añadido a un depto, o también como unidades independientes?
- [x] **P1.4** ¿Se usa API externa para el valor UF (CMF/Mindicador) o el archivo Excel? ¿Qué pasa si falla?
  > **Respondida:** Fase inicial = **hoja UF de INPUT_FILES.xlsx** (17.784 registros diarios 1977→2026, carga masiva única). Fase producción = API CMF (`api.cmfchile.cl`) con actualización diaria. Fallback: último valor registrado en tabla `uf_valor`.

### Bloque B — Selección (bloquea Etapa 2)
- [x] **P2.1** ¿La jerarquía de selección es siempre Inmobiliaria → Proyecto → Unidad, o hay flujos alternativos?
  > **Respondida:** El orden es **Comuna → Entrega Aprox → Inmobiliaria → Proyecto → N° Unidad** (ver REGLAS 2.1–3.2). Cada filtro depende de todos los anteriores.
- [ ] **P2.2** ¿El usuario puede filtrar unidades por tipología, orientación, piso, precio antes de seleccionar?
- [ ] **P2.3** ¿El campo BIENES CONJUNTOS indica que estac/bodega está incluido en el precio lista del depto?

### Bloque C — Precios críticos (bloquea Etapa 3 completa)
- [ ] **P3.A1** ¿El descuento aplica solo al departamento o puede aplicar al total (depto+estac+bodega)?
- [ ] **P3.A2** ¿El descuento siempre es porcentaje o puede ser un monto fijo en UF?
- [ ] **P3.A3** ¿Puede acumularse descuento del stock + descuento negociado adicional? ¿Quién autoriza?
- [ ] **P3.B1** ¿El Bono Pie es aporte al banco (eleva tasación) o subsidio directo al pie del cliente?
- [ ] **P3.B2** Para INGEVEC (DESCUENTO=0%, BONO PIE=15%): ¿cómo se calcula el valor de venta y el valor a financiar?
- [ ] **P3.B3** ¿Bono Pie y Descuento pueden coexistir activamente en la misma unidad? (MAESTRA los tiene ambos)
- [ ] **P3.B4** ¿El banco tasa el inmueble al precio lista, al precio con descuento, o a otro valor? ¿El Bono Pie cambia esa base?
- [ ] **P3.B5** Jerarquía cuando coexisten Descuento + Bono Pie: ¿cuál se aplica primero y sobre qué base?

### Bloque D — Plan de pago (bloquea Etapa 4)
- [ ] **P3.C1** ¿"Pie Período Construcción" reemplaza al pie estándar para proyectos "En Construcción", o se suma?
- [ ] **P3.C2** ¿Qué es el CUOTÓN (INGEVEC=2%)? ¿En qué hito del flujo se paga?
- [ ] **P3.C3** ¿Qué es PIE CRÉDITO DIRECTO? ¿Genera un plan de pago completamente diferente?
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
- [ ] **P6.1** ¿Qué formato tiene la cotización final: PDF, pantalla imprimible, email, todo?
- [ ] **P6.2** ¿Se muestran los 3 escenarios CAE juntos o el broker elige uno?
- [ ] **P6.3** ¿Debe registrarse quién generó cada cotización y cuándo (historial)?
- [ ] **P6.4** ¿La cotización requiere aprobación antes de enviarse al cliente?

### Bloque G — Correcciones al schema (bloquea Etapa 0 completa)

> Decisiones técnicas requeridas antes de aplicar correcciones al `schema.sql`.
> Identificadas en [EVALUACIÓN_SCHEMA_DATOS.md](EVALUACIÓN_SCHEMA_DATOS.md) (2026-03-24).

- [ ] **ES.1** ¿Se crea tabla maestra `programa` o se define un CHECK constraint con los valores válidos de programa en `unidad`? *(bloquea 0.1 → problema C2)*
- [ ] **ES.2** ¿Los escenarios CAE/resultados de la cotización se normalizan en tabla hija `cotizacion_escenario` ahora, o se deja como deuda técnica para v2? *(bloquea 0.2 → problema I1)*
- [ ] **ES.3** ¿Se agrega el discriminador `modalidad_pago` a `condicion_comercial` ahora o tras responder P3.C1–P3.C3? *(bloquea 0.3 → mejora M1)*
- [ ] **ES.4** ¿Se implementa la entidad `broker` en esta versión o se deja `nombre_broker TEXT` para v1? *(bloquea 0.4 → problema I4)*

---

## ETAPA 0 — CORRECCIONES AL MODELO DE DATOS

> **Objetivo:** Aplicar las correcciones identificadas en la evaluación de `schema.sql` antes de iniciar el desarrollo de las etapas funcionales. Garantiza integridad del histórico de cotizaciones, confiabilidad de joins y consistencia de tipos de datos.
> **Referencia:** [EVALUACIÓN_SCHEMA_DATOS.md](EVALUACIÓN_SCHEMA_DATOS.md)
> **Prerrequisito:** Respuestas a ES.1–ES.4.

---

### 0.1 — Correcciones críticas: snapshot y join de programa
<!-- SUBSTAGE:0.1 -->
**Estado:** `⚠️ BLOQUEADO`
**Archivos esperados:** `scripts/schema.sql` | `scripts/schema_v2.sql`
**Preguntas bloqueantes:** ES.1
**Descripción:** Resolver los dos problemas que afectan la integridad del negocio: (C1) la tabla `cotizacion` no guarda snapshot de las condiciones comerciales usadas, y (C2) `programa` es clave de JOIN sin validación.
**Faltantes para completar:**
- [ ] **C1** — Agregar campos snapshot en `cotizacion`: `descuento_pct_snapshot`, `bono_pie_pct_snapshot`, `aporte_inmob_pct_snapshot`, `reserva_clp_snapshot`, `tipo_financiamiento`
- [ ] **C2** — Crear tabla `programa` (opción A) o agregar CHECK constraint sobre `unidad.programa` (opción B) — requiere respuesta ES.1
- [ ] Actualizar `v_stock_cotizable` para incluir `id_condicion` en el resultado y validar join de programa
- [ ] Migración: script de conversión si ya hay datos en tabla `cotizacion`
<!-- /SUBSTAGE -->

---

### 0.2 — Normalización de datos: dormitorios y tipo_unidad
<!-- SUBSTAGE:0.2 -->
**Estado:** `⚠️ BLOQUEADO`
**Archivos esperados:** `scripts/schema.sql` | `scripts/import/normalize.py`
**Preguntas bloqueantes:** Ninguna (corrección técnica sin ambigüedad)
**Descripción:** Resolver problemas de tipado y valores canónicos que impiden filtros numéricos y generan lógica defensiva en queries.
**Faltantes para completar:**
- [ ] **I2** — Separar `unidad.dormitorios TEXT` en `dormitorios_num INTEGER NULL` + `dormitorios_display TEXT NULL`
- [ ] **I3** — Reducir CHECK constraint de `tipo_unidad` a valores canónicos sin duplicados de case (`'Local Comercial'`, `'Local comercial'` y `'Local'` → un único valor)
- [ ] **M3** — Definir ciclo de vida de `unidad.bienes_conjuntos`: marcar como campo de trazabilidad de importación (nunca usar en lógica de negocio)
- [ ] Actualizar script de importación para normalizar estos campos en la carga
<!-- /SUBSTAGE -->

---

### 0.3 — Corrección estructural: escenarios CAE y modalidad de pago
<!-- SUBSTAGE:0.3 -->
**Estado:** `⚠️ BLOQUEADO`
**Archivos esperados:** `scripts/schema.sql`
**Preguntas bloqueantes:** ES.2, ES.3
**Descripción:** Resolver la denormalización de los 3 escenarios CAE en columnas de `cotizacion` y agregar discriminador de modalidad a `condicion_comercial`.
**Faltantes para completar:**
- [ ] **I1** — Decidir si crear tabla `cotizacion_escenario` ahora o diferir a v2 (requiere ES.2)
- [ ] **M1** — Agregar campo `modalidad_pago TEXT` a `condicion_comercial` con CHECK `('ESTANDAR', 'CONSTRUCCION', 'CREDITO_DIRECTO')` — requiere respuestas P3.C1–P3.C3 y ES.3
- [ ] Si se crea `cotizacion_escenario`: mover columnas `cae_1/2/3`, `arriendo_1/2/3_clp`, `roi_anual`, `cap_rate` a la tabla hija
<!-- /SUBSTAGE -->

---

### 0.4 — Entidad Broker
<!-- SUBSTAGE:0.4 -->
**Estado:** `⚠️ BLOQUEADO`
**Archivos esperados:** `scripts/schema.sql`
**Preguntas bloqueantes:** ES.4, P6.3
**Descripción:** Definir si el broker es una entidad de primera clase en el modelo (con autenticación y permisos) o solo un texto libre en la cotización para v1.
**Faltantes para completar:**
- [ ] **I4** — Crear tabla `broker (id_broker, nombre, email, activo)` y reemplazar `cotizacion.nombre_broker TEXT` por FK — requiere ES.4
- [ ] Definir si broker tiene login propio o si el campo es solo descriptivo
- [ ] Evaluar si se necesitan permisos por broker (qué proyectos puede cotizar)
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
**Estado:** `🔴 PENDIENTE`
**Archivos esperados:** `src/models/inmobiliaria.ts`
**Preguntas bloqueantes:** P3.B1, P3.B2, P3.B5
**Descripción:** Modelo que define las reglas comerciales propias de cada inmobiliaria (descuento, bono pie, tipo de pie, cuotas).
**Faltantes para completar:**
- [ ] Confirmar si las reglas vienen todas del stock o hay config adicional por inmobiliaria
- [ ] Modelo de reglas: descuento, bono_pie, cuotas_pie, pie_construccion, cuoton, pie_credito_directo
- [ ] Validar que INGEVEC (descuento=0, bono=15%) y MAESTRA (descuento=10%, bono=10%) tienen modelos coherentes
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

### 3.1 — Precio lista por componente (depto, estac, bodega)
<!-- SUBSTAGE:3.1 -->
**Estado:** `⚠️ BLOQUEADO`
**Archivos esperados:** `src/calculators/precioLista.ts`
**Preguntas bloqueantes:** P2.3, P3.A1
**Descripción:** Calcular precio lista en UF, %, CLP para departamento, estacionamiento y bodega.
**Faltantes para completar:**
- [ ] Respuesta P2.3: ¿BIENES CONJUNTOS significa precio ya incluido?
- [ ] Precio Lista Depto UF = stock[unidad].precio_lista
- [ ] Precio Lista Estac/Bodega: ¿manual o del stock? ¿hay columna en STOCK NUEVOS?
- [ ] Total = Depto + Estac + Bodega
- [ ] % de cada ítem = ítem / total
- [ ] CLP = UF * valor_uf
<!-- /SUBSTAGE -->

---

### 3.2 — Aplicación del descuento por unidad
<!-- SUBSTAGE:3.2 -->
**Estado:** `⚠️ BLOQUEADO`
**Archivos esperados:** `src/calculators/descuento.ts`
**Preguntas bloqueantes:** P3.A1, P3.A2, P3.A3
**Descripción:** Aplicar el descuento de venta a los componentes del precio. Regla actual: solo al departamento.
**Regla actual (MAESTRA):**
```
precio_desc_depto = precio_lista_depto * (1 - descuento_pct)
precio_desc_estac = precio_lista_estac   // sin descuento
precio_desc_bodega = precio_lista_bodega // sin descuento
total_desc = suma de los tres
```
**Faltantes para completar:**
- [ ] Confirmar si el descuento aplica solo al depto o al total (P3.A1)
- [ ] Confirmar si puede ser monto fijo en UF (P3.A2)
- [ ] Definir si hay campo de descuento adicional negociado (P3.A3)
- [ ] Para INGEVEC: descuento=0% → precio_desc = precio_lista (sin cambio)
<!-- /SUBSTAGE -->

---

### 3.3 — Lógica del Bono Pie por inmobiliaria
<!-- SUBSTAGE:3.3 -->
**Estado:** `⚠️ BLOQUEADO`
**Archivos esperados:** `src/calculators/bonoPie.ts`
**Preguntas bloqueantes:** P3.B1, P3.B2, P3.B3, P3.B4, P3.B5 + **Etapa 0.1 completada** (C1: snapshot condiciones en `cotizacion`)
**Descripción:** El Bono Pie es el campo más crítico y diferenciador entre inmobiliarias. Su lógica exacta está pendiente de confirmación.
**Hipótesis actual (basada en COTIZADOR Excel MAESTRA):**
```
// El Bono Pie actúa como "Aporte Inmobiliaria" que eleva la tasación:
ch_ajustado_pct = 1 - pie_pct - bono_pie_pct   // ej: 1 - 0.10 - 0.10 = 0.80
tasacion_uf = ch_uf / ch_ajustado_pct            // base para el crédito hipotecario
```
**Faltantes para completar:**
- [ ] Confirmar hipótesis con respuesta P3.B1
- [ ] Documentar lógica para INGEVEC: DESCUENTO=0%, BONO PIE=15% (P3.B2)
- [ ] Confirmar jerarquía cuando ambos coexisten (P3.B5)
- [ ] Definir si Bono Pie modifica el precio de venta o solo la base de financiamiento
- [ ] Crear función paramétrica que funcione para todas las inmobiliarias
<!-- /SUBSTAGE -->

---

### 3.4 — Cálculo del valor de venta final (precio con descuento)
<!-- SUBSTAGE:3.4 -->
**Estado:** `⚠️ BLOQUEADO`
**Archivos esperados:** `src/calculators/valorVenta.ts`
**Preguntas bloqueantes:** P3.A1, P3.B1, P3.B5
**Descripción:** Valor final sobre el cual el cliente compra. Es la base del plan de pie.
**Regla actual:**
```
valor_venta_uf = total_desc_uf  (depto con descuento + estac + bodega)
valor_venta_clp = valor_venta_uf * valor_uf
```
**Faltantes para completar:**
- [ ] Depende de resolución de substages 3.2 y 3.3
- [ ] Validar que valor_venta > 0 antes de continuar
<!-- /SUBSTAGE -->

---

### 3.5 — Cálculo del valor de tasación (base del crédito hipotecario)
<!-- SUBSTAGE:3.5 -->
**Estado:** `⚠️ BLOQUEADO`
**Archivos esperados:** `src/calculators/tasacion.ts`
**Preguntas bloqueantes:** P3.B1, P3.B4
**Descripción:** Valor al que el banco tasa el inmueble para determinar el monto del crédito. Puede ser mayor al precio de venta cuando hay Bono Pie.
**Regla actual (MAESTRA):**
```
ch_uf = valor_venta_uf * (1 - pie_pct)
ch_ajustado_pct = 1 - pie_pct - bono_pie_pct
tasacion_uf = ch_uf / ch_ajustado_pct
```
**Faltantes para completar:**
- [ ] Confirmar fórmula con respuesta P3.B4
- [ ] Definir comportamiento cuando bono_pie_pct = 0 (sin aporte inmobiliaria)
- [ ] Definir comportamiento cuando descuento = 0 (INGEVEC)
<!-- /SUBSTAGE -->

---

### 3.6 — Matriz de reglas por inmobiliaria
<!-- SUBSTAGE:3.6 -->
**Estado:** `⚠️ BLOQUEADO`
**Archivos esperados:** `src/config/reglasInmobiliaria.ts`
**Preguntas bloqueantes:** P3.B1 a P3.B5, P3.C1 a P3.C3
**Descripción:** Tabla de reglas que parameteriza el cálculo para cada inmobiliaria, evitando hardcodear lógica.
**Estructura esperada:**
```typescript
interface ReglasInmobiliaria {
  descuento_aplica_solo_depto: boolean
  bono_pie_mecanismo: 'eleva_tasacion' | 'reduce_pie_cliente' | 'otro'
  jerarquia_descuento_bono: 'descuento_primero' | 'bono_primero' | 'independientes'
  pie_construccion_reemplaza: boolean
  cuoton_aplica: boolean
  credito_directo_disponible: boolean
}
```
**Faltantes para completar:**
- [ ] Respuestas a todo el Bloque C (P3.B1–P3.D2)
- [ ] Mapear cada inmobiliaria del stock a su configuración
- [ ] Validar con ejemplos reales de cada inmobiliaria
<!-- /SUBSTAGE -->

---

## ETAPA 4 — PLAN DE PAGO Y ESTRUCTURA DEL PIE

> **Objetivo:** Calcular la estructura completa del pie: reserva, upfront, saldo, cuotas.
> **Prerrequisito:** Etapa 3 completa. Respuestas a P4.1–P4.4 y P3.C1–P3.D2.

---

### 4.1 — Pie total y porcentaje de pie
<!-- SUBSTAGE:4.1 -->
**Estado:** `⚠️ BLOQUEADO`
**Archivos esperados:** `src/calculators/pie.ts`
**Preguntas bloqueantes:** P3.C1 (afecta el % de pie en proyectos En Construcción)
**Regla actual:**
```
pie_total_uf = valor_venta_uf * pie_pct
pie_pct default = 10%  (configurable: 0%–40% de a 5%)
```
**Faltantes para completar:**
- [ ] ¿Cuándo aplica PIE PERIODO CONSTRUCCION vs pie estándar? (P3.C1)
- [ ] Implementar selector de porcentaje de pie
- [ ] Validar que pie_total < valor_venta
<!-- /SUBSTAGE -->

---

### 4.2 — Reserva
<!-- SUBSTAGE:4.2 -->
**Estado:** `⚠️ BLOQUEADO`
**Archivos esperados:** (dentro de `src/calculators/pie.ts`)
**Preguntas bloqueantes:** P4.1
**Regla actual:**
```
reserva_clp = stock[unidad].reserva  // ej: $100.000 CLP
reserva_uf  = reserva_clp / valor_uf
reserva_pct = reserva_uf / valor_venta_uf
```
**Faltantes para completar:**
- [ ] Confirmar si la reserva puede estar en UF (P4.1)
- [ ] Confirmar si $100.000 CLP es fijo o varía por proyecto/inmobiliaria (P4.1)
<!-- /SUBSTAGE -->

---

### 4.3 — Upfront a la Promesa
<!-- SUBSTAGE:4.3 -->
**Estado:** `⚠️ BLOQUEADO`
**Archivos esperados:** (dentro de `src/calculators/pie.ts`)
**Preguntas bloqueantes:** P4.2, P4.4
**Regla actual:**
```
UPFRONT_PCT = 0.02  // 2% fijo
upfront_uf  = round(valor_venta_uf * UPFRONT_PCT, 2)
upfront_clp = round(upfront_uf * valor_uf, 0)
```
**Faltantes para completar:**
- [ ] Confirmar si el 2% es fijo para todas las inmobiliarias (P4.2)
- [ ] Confirmar relación entre Upfront y cuotas del pie (P4.4)
<!-- /SUBSTAGE -->

---

### 4.4 — Saldo pie, cuotas y plan de pago
<!-- SUBSTAGE:4.4 -->
**Estado:** `⚠️ BLOQUEADO`
**Archivos esperados:** `src/calculators/planPago.ts`
**Preguntas bloqueantes:** P3.D1, P3.D2, P4.3, P4.4
**Regla actual (MAESTRA — 60 cuotas):**
```
saldo_pie_uf = pie_total_uf - reserva_uf - upfront_uf
n_cuotas     = stock[unidad].cuotas_pie  // default 60
cuota_pie_uf = saldo_pie_uf / n_cuotas
```
**Regla pendiente (INGEVEC — 1 cuota):**
```
// CUOTAS PIE = 1 → pago único
// ¿Cuándo? ¿A la promesa, a la entrega? → PENDIENTE P3.D1
```
**Faltantes para completar:**
- [ ] Lógica para cuota única (P3.D1)
- [ ] Lógica para CUOTÓN (P3.C2)
- [ ] Hitos adicionales de pago (P4.3)
- [ ] Confirmar si cuotas son iguales o pueden variar (P3.D2)
<!-- /SUBSTAGE -->

---

### 4.5 — Crédito hipotecario sobre precio de venta
<!-- SUBSTAGE:4.5 -->
**Estado:** `⚠️ BLOQUEADO`
**Archivos esperados:** (dentro de `src/calculators/planPago.ts`)
**Preguntas bloqueantes:** P5.3
**Regla actual:**
```
ch_plan_uf  = valor_venta_uf - pie_total_uf
ch_plan_clp = ch_plan_uf * valor_uf   // ← input del PMT
```
**Faltantes para completar:**
- [ ] Confirmar si la base del PMT es ch_plan_clp o ch_ajustado_clp (P5.3)
<!-- /SUBSTAGE -->

---

## ETAPA 5 — SIMULACIÓN HIPOTECARIA Y FLUJO

> **Objetivo:** Calcular cuotas mensuales del crédito para 3 escenarios de CAE, y el flujo arriendo vs cuota.
> **Prerrequisito:** Etapa 4 completa. Respuestas a P5.1, P5.2, P5.3.

---

### 5.1 — Cálculo de cuota hipotecaria (PMT) — 3 escenarios
<!-- SUBSTAGE:5.1 -->
**Estado:** `⚠️ BLOQUEADO`
**Archivos esperados:** `src/calculators/creditoHipotecario.ts`
**Preguntas bloqueantes:** P5.1, P5.2, P5.3
**Regla actual:**
```
cuota_clp = ch_plan_clp * (r / (1 - (1+r)^-n))
donde r = CAE/12,  n = plazo_anios * 12
Escenarios: CAE [4%, 4.5%, 5%], Plazo [30 años]
```
**Faltantes para completar:**
- [ ] Confirmar si CAE y plazo son fijos o editables (P5.1, P5.2)
- [ ] Confirmar base: ch_plan_clp vs ch_ajustado_clp (P5.3)
- [ ] Convertir cuota a UF para mostrar
- [ ] Manejar edge case CAE = 0%
<!-- /SUBSTAGE -->

---

### 5.2 — Flujo mensual neto (arriendo vs cuota)
<!-- SUBSTAGE:5.2 -->
**Estado:** `🔴 PENDIENTE`
**Archivos esperados:** `src/calculators/flujo.ts`
**Preguntas bloqueantes:** Ninguna (depende solo de 5.1)
**Regla actual:**
```
flujo_clp = arriendo_clp - cuota_ch_clp   // por cada escenario
// arriendo_clp: input manual del broker (defaults: $380k, $390k, $400k)
```
**Faltantes para completar:**
- [ ] UI para ingresar 3 valores de arriendo estimado
- [ ] Mostrar flujo positivo/negativo con indicador visual
<!-- /SUBSTAGE -->

---

### 5.3 — Tabla de amortización hipotecaria
<!-- SUBSTAGE:5.3 -->
**Estado:** `🔴 PENDIENTE`
**Archivos esperados:** `src/calculators/amortizacion.ts`
**Preguntas bloqueantes:** Ninguna (depende de 5.1)
**Descripción:** Tabla mes a mes de capital/interés pagado. Base para el cálculo de 60 meses amortizados en Etapa 6.
**Faltantes para completar:**
- [ ] Calcular amortización mes a mes para los 3 escenarios
- [ ] Función que retorna saldo después de N cuotas (usada en 6.2)
<!-- /SUBSTAGE -->

---

## ETAPA 6 — EVALUACIÓN DE INVERSIÓN A 5 AÑOS

> **Objetivo:** Calcular el retorno de inversión, Cap Rate y ROI proyectado a 5 años.
> **Prerrequisito:** Etapa 5 completa.

---

### 6.1 — Flujo acumulado y plusvalía
<!-- SUBSTAGE:6.1 -->
**Estado:** `🔴 PENDIENTE`
**Archivos esperados:** `src/calculators/evaluacion5anios.ts`
**Preguntas bloqueantes:** Ninguna
**Regla actual:**
```
MESES_ARRIENDO_ANUAL = 11   // 1 mes vacío por año
flujo_acum = flujo_clp * 11 * 5

HAIRCUT_VENTA = 0.95
plusvalia_acum = (1 + plusvalia_anual_pct)^5 - 1
precio_venta_5 = (1 + plusvalia_acum) * valor_venta_clp * HAIRCUT_VENTA
```
**Faltantes para completar:**
- [ ] UI para ingresar plusvalía anual estimada (default 2%)
- [ ] Cálculo idéntico para los 3 escenarios (plusvalía no depende de CAE)
<!-- /SUBSTAGE -->

---

### 6.2 — CH amortizado en 60 meses (factor LTV 0.67)
<!-- SUBSTAGE:6.2 -->
**Estado:** `🔴 PENDIENTE`
**Archivos esperados:** (dentro de `src/calculators/evaluacion5anios.ts`)
**Preguntas bloqueantes:** Ninguna
**Regla actual:**
```
FACTOR_LTV = 0.67
n = min(60, plazo_anios * 12)
Si CAE > 0:
  saldo = ch_plan_clp*(1+r)^n - cuota*((1+r)^n - 1)/r
  amortizado = (ch_plan_clp - saldo) * FACTOR_LTV
Si CAE = 0:
  amortizado = ch_plan_clp * n / (plazo_anios*12) * FACTOR_LTV
```
**Faltantes para completar:**
- [ ] Implementar para los 3 escenarios
- [ ] Documentar el origen del factor 0.67 con el equipo
<!-- /SUBSTAGE -->

---

### 6.3 — Cap Rate
<!-- SUBSTAGE:6.3 -->
**Estado:** `🔴 PENDIENTE`
**Archivos esperados:** (dentro de `src/calculators/evaluacion5anios.ts`)
**Preguntas bloqueantes:** Ninguna
**Regla actual:**
```
cap_rate = (arriendo_clp * 11 / valor_uf) / tasacion_uf
// = arriendo anual en UF / tasación en UF
```
**Faltantes para completar:**
- [ ] Implementar para los 3 escenarios (distinto arriendo por escenario)
- [ ] Mostrar como % con 2 decimales
<!-- /SUBSTAGE -->

---

### 6.4 — ROI a 5 años y ROI anual compuesto
<!-- SUBSTAGE:6.4 -->
**Estado:** `🔴 PENDIENTE`
**Archivos esperados:** (dentro de `src/calculators/evaluacion5anios.ts`)
**Preguntas bloqueantes:** P3.B1 (afecta base del ROI: tasacion vs ch_ajustado)
**Regla actual:**
```
// Solo escenario 1 (CAE 4%)
Si bono_pie_pct == 0:
    roi_5a = (precio_venta_5 - tasacion_clp) / tasacion_clp
Sino:
    roi_5a = (precio_venta_5 - ch_ajustado_clp) / ch_ajustado_clp

roi_anual = (1 + roi_5a)^(1/5) - 1
```
**Faltantes para completar:**
- [ ] Confirmar base del ROI con respuesta P3.B1
- [ ] Mostrar como % con 2 decimales
<!-- /SUBSTAGE -->

---

## ETAPA 7 — OUTPUT, PDF Y COTIZACIÓN FINAL

> **Objetivo:** Generar la cotización en el formato requerido con todos los datos calculados.
> **Prerrequisito:** Etapas 1–6 completas. Respuestas a P6.1–P6.4.

---

### 7.1 — Diseño del documento de cotización
<!-- SUBSTAGE:7.1 -->
**Estado:** `🔴 PENDIENTE`
**Archivos esperados:** `src/templates/cotizacion.tsx` | `src/styles/cotizacion.css`
**Preguntas bloqueantes:** P6.1, P6.2
**Faltantes para completar:**
- [ ] Confirmar formato (PDF / pantalla / email) — P6.1
- [ ] Definir si muestra 1 o 3 escenarios CAE — P6.2
- [ ] Incluir disclaimer legal (texto fijo, obligatorio)
- [ ] Definir logo y branding (VIVEPROP)
- [ ] Diseño de secciones: encabezado, características, valores, plan, crédito, flujo, ROI
<!-- /SUBSTAGE -->

---

### 7.2 — Generación de PDF
<!-- SUBSTAGE:7.2 -->
**Estado:** `🔴 PENDIENTE`
**Archivos esperados:** `src/services/pdfService.ts`
**Preguntas bloqueantes:** P6.1
**Faltantes para completar:**
- [ ] Confirmar si es PDF (P6.1)
- [ ] Elegir librería: react-pdf, puppeteer, jsPDF
- [ ] Incluir fecha y número de cotización en el PDF
<!-- /SUBSTAGE -->

---

### 7.3 — Envío por email
<!-- SUBSTAGE:7.3 -->
**Estado:** `🔴 PENDIENTE`
**Archivos esperados:** `src/services/emailService.ts`
**Preguntas bloqueantes:** P6.1
**Faltantes para completar:**
- [ ] Confirmar si hay envío automático por email (P6.1)
- [ ] Definir proveedor de email (Resend, SendGrid, SMTP)
- [ ] Template del email con PDF adjunto
<!-- /SUBSTAGE -->

---

### 7.4 — Historial de cotizaciones
<!-- SUBSTAGE:7.4 -->
**Estado:** `⚠️ BLOQUEADO`
**Archivos esperados:** `src/services/historialService.ts` | `src/components/Historial.tsx`
**Preguntas bloqueantes:** P6.3, P6.4 + **Etapa 0.4 completada** (I4: entidad `broker` definida)
**Faltantes para completar:**
- [ ] Completar substage 0.4 (definir si broker es entidad o texto libre)
- [ ] Confirmar si se registra historial (P6.3)
- [ ] Definir campos a registrar: broker, cliente, unidad, fecha, valores snapshot
- [ ] Confirmar si hay flujo de aprobación antes de enviar (P6.4)
<!-- /SUBSTAGE -->

---

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
| 2026-03-29 | — | main | Etapas 1.2–1.4 + 2.1–2.6: data layer (IStockRepository+ExcelAdapter+ufService), CascadeSelector 5 pasos, BrokerForm RUT, CotizadorShell |
| 2026-03-29 | — | main | Scaffold Next.js 15 + React 19 + TypeScript strict + Tailwind CSS 4.x (package.json, next.config.ts, tsconfig.json, postcss.config.mjs) |
| 2026-03-24 | — | main | Rediseño filtrado en cascada: Comuna→Entrega→Inmobiliaria→Proyecto→Unidad (Etapa 2: 4→6 substages, nuevo idx_proyecto_cascada) |
| 2026-03-24 | — | main | Evaluación técnica schema.sql → EVALUACIÓN_SCHEMA_DATOS.md (9 problemas identificados) |
| 2026-03-24 | — | main | Genera MODELO_DATOS_COTIZADOR.xlsx (6 hojas: resumen, columnas, relaciones, índices, constraints, semilla) |
| 2026-03-23 | d0eea66 | main | carga archivo para determinar logicas y calculos |
| 2026-03-23 | 1f000af | main | crea docs de trabajo |
<!-- HISTORIAL_END -->
