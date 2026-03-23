# MODELO DE DATOS — COTIZADOR WEB MERCADO PRIMARIO

> Motor: **SQLite embebido** — convive dentro de la aplicación, sin conexión a bases de datos externas.
> DDL completo: [scripts/schema.sql](scripts/schema.sql)

---

## 1. DIAGRAMA ENTIDAD-RELACIÓN

```
┌──────────────────┐          ┌──────────────────────────┐
│   inmobiliaria   │  1     N │        proyecto          │
│──────────────────│──────────│──────────────────────────│
│PK id_inmobiliaria│          │PK id_proyecto            │
│UK nombre         │          │FK id_inmobiliaria        │
│   activo         │          │UK nemotecnico            │
└──────────────────┘          │UK (id_inmob,nombre_proy) │
                              │   tipo_entrega           │
                              │   periodo_entrega        │
                              │   comuna / direccion     │
                              │   activo                 │
                              └──────────────────────────┘
                                   │            │
                               1 ──┤            ├── 1
                               N   │            │   N
                    ┌──────────────┘            └──────────────────┐
                    ▼                                               ▼
     ┌──────────────────────────┐              ┌────────────────────────────────┐
     │          unidad          │              │      condicion_comercial       │
     │──────────────────────────│              │────────────────────────────────│
     │PK id_unidad              │              │PK id_condicion                 │
     │FK id_proyecto            │              │FK id_proyecto                  │
     │   numero_unidad (NULL ok)│              │UK (id_proyecto,tipo_u,programa)│
     │   tipo_unidad            │◄─── JOIN ───►│   tipo_unidad                  │
     │   programa               │  lógico por  │   programa                     │
     │   piso_producto          │  (proyecto + │   reserva_clp                  │
     │   orientacion            │  tipo_unidad │   descuento                    │
     │   dormitorios / banios   │  + programa) │   bono_pie                     │
     │   superficies (m2)       │              │   cuotas_pie                   │
     │   precio_lista_uf        │              │   pie_periodo_construccion     │
     │   estado_stock           │              │   cuoton                       │
     │   bienes_conjuntos       │              │   pie_credito_directo          │
     └──────────────────────────┘              │   activo                       │
              │        │                       └────────────────────────────────┘
              │N      N│
              │        │
     ┌────────┴────────┴────────┐
     │      bien_conjunto       │
     │──────────────────────────│
     │PK id_bien_conjunto       │
     │FK id_unidad_principal    │──► Departamento
     │FK id_unidad_asociada     │──► Estacionamiento / Bodega
     │UK (principal, asociada)  │
     │   descripcion            │
     └──────────────────────────┘

┌──────────────────┐     ┌──────────────────────────┐
│    uf_valor      │     │   parametro_cotizador    │
│──────────────────│     │──────────────────────────│
│PK fecha (DATE)   │     │PK id_parametro           │
│   valor_uf       │     │UK (categoria, clave)     │
│   variacion_diaria│    │   categoria              │
│                  │     │   valor_numerico         │
│  lookup por fecha│     │   etiqueta               │
│  17.784 filas    │     │   es_default             │
│  desde 1977      │     │   activo                 │
└──────────────────┘     └──────────────────────────┘

┌──────────────────────────────────────────────────────────────┐
│                 cotizacion  [FASE 2]                         │
│──────────────────────────────────────────────────────────────│
│PK id_cotizacion                                              │
│FK id_unidad        → unidad (inmutable)                      │
│FK id_condicion     → condicion_comercial (inmutable)         │
│   nombre_broker / nombre_cliente / rut / email / celular     │
│   SNAPSHOT parámetros: valor_uf, pie_pct, cae_1/2/3, plazo  │
│   SNAPSHOT resultados: precio_venta, tasacion, pie, ch, ROI  │
└──────────────────────────────────────────────────────────────┘

VISTA OPERATIVA:
┌──────────────────────────────────────────────────────────────┐
│              v_stock_cotizable                               │
│  JOIN: unidad + condicion_comercial + proyecto + inmobiliaria│
│  WHERE estado_stock = 'Disponible' AND activos = 1          │
│  → dataset listo para el cotizador                          │
└──────────────────────────────────────────────────────────────┘
```

---

## 2. TABLAS PRINCIPALES

### TABLA 1 — `inmobiliaria`
**Fuente:** columna ALIANZA de PROYECTOS y STOCK NUEVOS
**Cardinalidad:** 5 registros (INGEVEC, MAESTRA, RVC, TOCTOC, URMENETA)
**Mantenedor admin:** Alta / Baja lógica / Edición de nombre

| Columna | Tipo | Constraint | Descripción |
|---|---|---|---|
| `id_inmobiliaria` | INTEGER | **PK** | Surrogate key auto-increment |
| `nombre` | TEXT | **UK** NOT NULL | Nombre único de la inmobiliaria |
| `activo` | INTEGER | CHECK (0,1) DEFAULT 1 | Baja lógica |
| `created_at` | TEXT | NOT NULL DEFAULT now | Timestamp de creación |
| `updated_at` | TEXT | NOT NULL, trigger | Timestamp de última modificación |

**Índices:** PK implícito + UK sobre `nombre`

---

### TABLA 2 — `proyecto`
**Fuente:** hoja PROYECTOS (99 filas)
**Clave natural:** `nemotecnico` (ABD, TOC, BEL…) — único en toda la tabla
**Mantenedor admin:** CRUD completo + toggle activo/inactivo

| Columna | Tipo | Constraint | Descripción |
|---|---|---|---|
| `id_proyecto` | INTEGER | **PK** | Surrogate key |
| `id_inmobiliaria` | INTEGER | **FK** → inmobiliaria | Inmobiliaria dueña |
| `nemotecnico` | TEXT | **UK** NOT NULL | Código corto único (PK natural) |
| `nombre_proyecto` | TEXT | UK(inmob+nombre) NOT NULL | Nombre completo |
| `comuna` | TEXT | NOT NULL | |
| `direccion` | TEXT | NOT NULL | |
| `tipo_entrega` | TEXT | CHECK ('Entrega Inmediata','Entrega Futura') | |
| `periodo_entrega` | TEXT | NOT NULL | Ej: 'Inmediata', '1er semestre 2028' |
| `activo` | INTEGER | CHECK (0,1) DEFAULT 1 | Baja lógica (ex ESTADO_PROYECTO de CC) |
| `created_at` | TEXT | NOT NULL DEFAULT now | |
| `updated_at` | TEXT | NOT NULL, trigger | |

**Índices:**
- `idx_proyecto_inmobiliaria` → (id_inmobiliaria)
- `idx_proyecto_activo` → (activo, id_inmobiliaria)
- UK de nemotecnico ya crea índice

**FK:** `id_inmobiliaria` → ON UPDATE CASCADE, ON DELETE RESTRICT

---

### TABLA 3 — `unidad`
**Fuente:** hoja STOCK NUEVOS (8.646 filas, 21 columnas)
**Columna eliminada:** SUPERFICIE TERRENO (100% vacía)
**Surrogate PK** obligatoria: (nemo+tipo_unidad+num_unidad) tiene 73 duplicados y 916 nulls
**Mantenedor admin:** CRUD + importación masiva desde Excel (con normalización)

| Columna | Tipo | Constraint | Descripción |
|---|---|---|---|
| `id_unidad` | INTEGER | **PK** | Surrogate key |
| `id_proyecto` | INTEGER | **FK** → proyecto | |
| `numero_unidad` | INTEGER | NULL | Nulo para bodegas/estac sin número |
| `tipo_unidad` | TEXT | CHECK (lista) NOT NULL | Departamento, Estacionamiento, Bodega… |
| `programa` | TEXT | NOT NULL | Ej: '2D1B', '1D1B', 'Bodega' |
| `piso_producto` | INTEGER | NOT NULL | Incluye pisos negativos (-4 a -1 = subterráneo) |
| `orientacion` | TEXT | NULL | NORTE, SUR, ORIENTE, PONIENTE, combinaciones |
| `dormitorios` | TEXT | NULL | '1', '2', '3', '1-1/2', 'BO', '#N/A' |
| `banios` | INTEGER | NULL | 1 o 2 |
| `superficie_util_m2` | REAL | NULL | Parseado de texto con coma: '43,35' → 43.35 |
| `superficie_terraza_m2` | REAL | NULL | Parseado ídem |
| `superficie_total_m2` | REAL | CHECK ≥ 0, NOT NULL | |
| `precio_lista_uf` | REAL | CHECK > 0, NOT NULL | En UF |
| `estado_stock` | TEXT | CHECK (lista), DEFAULT 'Disponible' | Ver normalización abajo |
| `bienes_conjuntos` | TEXT | NULL | Texto crudo 'B - 1', 'B - 1 B', etc. |
| `created_at` | TEXT | NOT NULL DEFAULT now | |
| `updated_at` | TEXT | NOT NULL, trigger | |

**Normalización obligatoria en importación:**
- `'DISPONIBLE'` → `'Disponible'` (677 registros con case incorrecto)
- `superficie_util_m2`: replace `','` por `'.'` y convertir a REAL
- `superficie_terraza_m2`: ídem

**Índices:**
| Índice | Columnas | Tipo | Uso |
|---|---|---|---|
| `uq_unidad_por_proyecto` | (id_proyecto, tipo_unidad, numero_unidad) WHERE numero_unidad IS NOT NULL | **UNIQUE PARCIAL** | Unicidad real sin bloquear NULLs |
| `idx_unidad_proyecto` | (id_proyecto) | Normal | FK lookup |
| `idx_unidad_disponibles` | (id_proyecto, estado_stock, tipo_unidad) | Normal | Filtro cotizador |
| `idx_unidad_numero` | (numero_unidad) | Normal | Lookup por número de unidad |
| `idx_unidad_precio` | (id_proyecto, precio_lista_uf) | Normal | Ordenamiento por precio |
| `idx_unidad_condicion` | (id_proyecto, tipo_unidad, programa) | Normal | JOIN con condicion_comercial |

**FK:** `id_proyecto` → ON UPDATE CASCADE, ON DELETE RESTRICT

---

### TABLA 4 — `condicion_comercial`
**Fuente:** hoja CONDICIONES_COMERCIALES (309 filas)
**Clave natural:** `(id_proyecto, tipo_unidad, programa)` — 0 duplicados, integridad perfecta
**Relación con unidad:** JOIN lógico por `(id_proyecto + tipo_unidad + programa)` — no es FK física porque un mismo programa puede tener múltiples unidades
**Mantenedor admin:** CRUD + importación masiva. Cambios aquí afectan todos los cálculos del cotizador

| Columna | Tipo | Constraint | Descripción |
|---|---|---|---|
| `id_condicion` | INTEGER | **PK** | Surrogate key |
| `id_proyecto` | INTEGER | **FK** → proyecto | |
| `tipo_unidad` | TEXT | UK(proj+tipo+prog) NOT NULL | |
| `programa` | TEXT | UK(proj+tipo+prog) NOT NULL | Ej: '2D1B', 'Bodega', 'Estacionamiento' |
| `reserva_clp` | INTEGER | CHECK ≥ 0, DEFAULT 100000 | Monto en pesos chilenos |
| `descuento` | REAL | CHECK [0,1], DEFAULT 0 | Porcentaje: 0.10 = 10% |
| `bono_pie` | REAL | CHECK [0,1], DEFAULT 0 | Porcentaje: 0.10 = 10% |
| `cuotas_pie` | INTEGER | CHECK ≥ 0, DEFAULT 0 | N° de cuotas del saldo de pie |
| `pie_periodo_construccion` | REAL | CHECK [0,1], DEFAULT 0 | % pie para proyectos Entrega Futura |
| `cuoton` | REAL | CHECK [0,1], DEFAULT 0 | % cuotón especial |
| `pie_credito_directo` | REAL | CHECK [0,1], DEFAULT 0 | % para modalidad crédito directo |
| `activo` | INTEGER | CHECK (0,1) DEFAULT 1 | Baja lógica de la condición |
| `created_at` | TEXT | NOT NULL DEFAULT now | |
| `updated_at` | TEXT | NOT NULL, trigger | |

**Índices:**
| Índice | Columnas | Uso |
|---|---|---|
| `uq_condicion` | (id_proyecto, tipo_unidad, programa) | **UNIQUE** — clave natural |
| `idx_condicion_proyecto` | (id_proyecto, activo) | Filtro por proyecto |
| `idx_condicion_join` | (id_proyecto, tipo_unidad, programa) WHERE activo=1 | JOIN del cotizador |

**FK:** `id_proyecto` → ON UPDATE CASCADE, ON DELETE RESTRICT

---

### TABLA 5 — `bien_conjunto`
**Fuente:** columna BIENES_CONJUNTOS de STOCK NUEVOS (409 filas no nulas, 332 valores únicos)
**Función:** tabla junction N:M entre Departamento y sus bienes adicionales (estacionamiento/bodega)
**Mantenedor admin:** CRUD + auto-generación en importación de stock

| Columna | Tipo | Constraint | Descripción |
|---|---|---|---|
| `id_bien_conjunto` | INTEGER | **PK** | Surrogate key |
| `id_unidad_principal` | INTEGER | **FK** → unidad, CASCADE | Departamento al que pertenecen |
| `id_unidad_asociada` | INTEGER | **FK** → unidad, CASCADE | Estacionamiento o Bodega asociada |
| `descripcion` | TEXT | NULL | Texto original: 'B - 1 B', para trazabilidad |
| `created_at` | TEXT | NOT NULL DEFAULT now | |

**Constraints:**
- `uq_bien_conjunto`: UNIQUE (id_unidad_principal, id_unidad_asociada)
- `chk_bc_distintos`: CHECK (id_unidad_principal ≠ id_unidad_asociada)

**Índices:** `idx_bc_principal` (id_unidad_principal), `idx_bc_asociada` (id_unidad_asociada)

---

### TABLA 6 — `uf_valor`
**Fuente:** hoja UF (17.784 registros diarios desde 1977-08-01 al 2026-04-09)
**Columnas descartadas:** MONEDA (siempre 'UF'), PERIODO (derivado de fecha)
**Mantenedor admin:** INSERT periódico de nuevos valores + importación masiva anual

| Columna | Tipo | Constraint | Descripción |
|---|---|---|---|
| `fecha` | TEXT | **PK** ('YYYY-MM-DD') | Un valor por día calendario |
| `valor_uf` | REAL | CHECK > 0, NOT NULL | Valor en pesos chilenos |
| `variacion_diaria` | REAL | NULL | Diferencia respecto al día anterior |
| `created_at` | TEXT | NOT NULL DEFAULT now | |

**Índices:** PK implícito + `idx_uf_fecha_desc` (fecha DESC) — optimiza `MAX(fecha)` y lookup del día actual

---

### TABLA 7 — `parametro_cotizador`
**Fuente:** hoja aux (CAE, Pie%, Plazo) + constantes extraídas de las fórmulas del COTIZADOR Excel
**Función:** centraliza todos los valores configurables de la UI y del motor de cálculo
**Mantenedor admin:** CRUD completo. Modificar constantes afecta directamente todos los cálculos

| Columna | Tipo | Constraint | Descripción |
|---|---|---|---|
| `id_parametro` | INTEGER | **PK** | |
| `categoria` | TEXT | CHECK ('CAE','PIE_PCT','PLAZO','CONSTANTE') | Grupo funcional |
| `clave` | TEXT | UK(categoria,clave) | Identificador único dentro de la categoría |
| `valor_numerico` | REAL | NULL | Valor usado en cálculos |
| `etiqueta` | TEXT | NOT NULL | Texto para mostrar en UI: '4.0%', '30 años' |
| `orden` | INTEGER | NOT NULL DEFAULT 0 | Orden en dropdown |
| `es_default` | INTEGER | CHECK (0,1) | Valor preseleccionado en la UI |
| `activo` | INTEGER | CHECK (0,1) DEFAULT 1 | Ocultar sin eliminar |
| `created_at` | TEXT | NOT NULL DEFAULT now | |
| `updated_at` | TEXT | NOT NULL, trigger | |

**Datos precargados:**

| Categoría | Valores | Default |
|---|---|---|
| CAE | 3.5%, 4.0%, 4.5%, 5.0% | 4.0% (esc.1), 4.5% (esc.2), 5.0% (esc.3) |
| PIE_PCT | 0% a 40% de a 5% | 10% |
| PLAZO | 20, 25, 30 años | 30 años |
| CONSTANTE | UPFRONT_PCT=0.02, APORTE_INMOB=0.10, MESES_ARRIENDO=11, HAIRCUT_VENTA=0.95, FACTOR_LTV=0.67, PLUSVALIA_DEFAULT=0.02 | — |

---

### TABLA 8 — `cotizacion` *(Fase 2)*
**Función:** historial inmutable de cotizaciones generadas. Snapshot completo para trazabilidad y reimpresión.
**Mantenedor admin:** solo lectura. INSERT desde la app al generar una cotización.

| Grupo | Columnas |
|---|---|
| Identificación | id_cotizacion, fecha_generacion |
| Referencias | FK id_unidad, FK id_condicion |
| Broker/Cliente | nombre_broker, nombre_cliente, rut_cliente, email_cliente, celular_cliente |
| Parámetros snapshot | valor_uf_snapshot, pie_pct, cae_1/2/3, plazo_anios, arriendos 1/2/3, plusvalia_anual_pct |
| Resultados snapshot | precio_lista_uf, precio_venta_uf, tasacion_uf, pie_total_uf, ch_plan_uf, roi_5anios, roi_anual, cap_rate |

---

## 3. VISTA OPERATIVA — `v_stock_cotizable`

Vista que el cotizador consume directamente. No requiere JOIN en el código de aplicación.

```sql
SELECT * FROM v_stock_cotizable
WHERE alianza = 'MAESTRA'
  AND nombre_proyecto = 'PLAZA CERVANTES I'
  AND tipo_unidad = 'Departamento';
```

Combina: `unidad ⟕ condicion_comercial ⟕ proyecto ⟕ inmobiliaria`
Filtros fijos: `estado_stock = 'Disponible'` y todos los `activo = 1`

---

## 4. RELACIONES Y CARDINALIDADES

| Relación | Tipo | Descripción |
|---|---|---|
| inmobiliaria → proyecto | 1:N FK física | Una inmob. tiene muchos proyectos |
| proyecto → unidad | 1:N FK física | Un proyecto tiene muchas unidades |
| proyecto → condicion_comercial | 1:N FK física | Un proyecto tiene N condiciones (por tipo+programa) |
| unidad ↔ condicion_comercial | N:1 JOIN lógico | Unidad busca su condición por (proyecto+tipo+programa) |
| unidad ↔ unidad (vía bien_conjunto) | N:M junction | Depto ↔ sus Estac/Bodegas asociados |
| cotizacion → unidad | N:1 FK física | Muchas cotizaciones de la misma unidad |
| cotizacion → condicion_comercial | N:1 FK física | Snapshot de qué condición se usó |

---

## 5. DATOS DE LAS HOJAS AUXILIARES (no generan tablas)

### `aux2` — Vista de trabajo del COTIZADOR
No es una tabla independiente. Es un área de trabajo del Excel que replica en tiempo real los datos del proyecto/unidad seleccionados. En la web esto es un estado en memoria (React state / Pinia store) cargado desde `v_stock_cotizable`.

### `amort` — Tabla de amortización de ejemplo
No es una tabla de referencia. Contiene un cálculo de ejemplo (CH = $76.677.781, 3 escenarios CAE 4/4.5/5%, 60 cuotas). En la web la amortización se **calcula on-the-fly** con la función PMT/amortización estándar. No hay tabla en la DB.

---

## 6. RESUMEN DE MANTENEDORES (CRUD ADMIN)

| Tabla | Create | Read | Update | Delete | Observación |
|---|---|---|---|---|---|
| inmobiliaria | ✅ | ✅ | ✅ nombre | ❌ (baja lógica `activo=0`) | Solo 5 registros |
| proyecto | ✅ | ✅ | ✅ todos los campos | ❌ (baja lógica) | Import desde Excel o manual |
| unidad | ✅ | ✅ | ✅ precio, estado | ❌ (baja lógica via estado) | Import masivo Excel principal |
| condicion_comercial | ✅ | ✅ | ✅ todos los campos | ❌ (baja lógica `activo=0`) | Import masivo Excel + edición manual |
| bien_conjunto | ✅ | ✅ | ✅ descripcion | ✅ físico | Auto-generado en import de stock |
| uf_valor | ✅ masivo | ✅ | ❌ | ❌ | Solo INSERT de nuevos días |
| parametro_cotizador | ✅ | ✅ | ✅ valor, etiqueta, default, activo | ❌ (baja lógica) | Impacta cálculos: solo admin senior |
| cotizacion | ❌ (genera la app) | ✅ | ❌ | ❌ | Solo lectura para admin |

---

## 7. PROBLEMAS DE CALIDAD DE DATOS IDENTIFICADOS

| Problema | Tabla origen | Campo | Impacto | Solución |
|---|---|---|---|---|
| Case inconsistente | STOCK NUEVOS | ESTADO STOCK | `'DISPONIBLE'` no filtra con `'Disponible'` | Normalizar a `'Disponible'` en importación |
| Texto con coma decimal | STOCK NUEVOS | SUPERFICIE UTIL, SUPERFICIE TERRAZA | No es REAL directamente | `replace(',', '.')` antes de parsear |
| NUMERO UNIDAD nulo | STOCK NUEVOS | NUMERO UNIDAD | 916 filas sin número (10.6%) | Permitir NULL + surrogate PK |
| Duplicados (nemo+tipo+num) | STOCK NUEVOS | clave natural | 73 duplicados | Surrogate PK + unique parcial |
| SUPERFICIE TERRENO vacía | STOCK NUEVOS | SUPERFICIE TERRENO | Columna inútil | Eliminar en importación |
| BIENES CONJUNTOS texto | STOCK NUEVOS | BIENES CONJUNTOS | No hay FK directa a unidad | Parsear y poblar `bien_conjunto` en import |
| PERIODO ENTREGA sin normalizar | PROYECTOS | PERIODO ENTREGA | Variaciones de case: '1er semestre' vs '1er Semestre' | Normalizar en import |
