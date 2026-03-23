-- ============================================================
-- SCHEMA: COTIZADOR WEB MERCADO PRIMARIO
-- Motor:  SQLite (embebido, convive dentro de la aplicación)
-- Fuente: INPUT_FILES.xlsx — hojas STOCK NUEVOS, CONDICIONES_COMERCIALES,
--         PROYECTOS, UF, aux
-- ============================================================
-- Convenciones:
--   • Surrogate PK INTEGER en todas las entidades
--   • TEXT en lugar de VARCHAR (SQLite ignora longitud, documenta intención)
--   • Booleanos como INTEGER 0/1 (SQLite no tiene BOOLEAN nativo)
--   • Fechas como TEXT 'YYYY-MM-DD' para portabilidad
--   • Todos los porcentajes almacenados como decimal [0,1]
--   • created_at / updated_at en todas las tablas editables
--   • Triggers automáticos para updated_at
-- ============================================================

PRAGMA foreign_keys  = ON;
PRAGMA journal_mode  = WAL;
PRAGMA synchronous   = NORMAL;

-- ============================================================
-- TABLA 1: inmobiliaria
-- ============================================================
-- Fuente    : columna ALIANZA de PROYECTOS / STOCK NUEVOS
-- Cardinalidad : 5 registros (INGEVEC, MAESTRA, RVC, TOCTOC, URMENETA)
-- Mantenedor   : Admin — CRUD completo
-- ============================================================
CREATE TABLE IF NOT EXISTS inmobiliaria (
  id_inmobiliaria   INTEGER   PRIMARY KEY,
  nombre            TEXT      NOT NULL,
  activo            INTEGER   NOT NULL DEFAULT 1,
  created_at        TEXT      NOT NULL DEFAULT (datetime('now')),
  updated_at        TEXT      NOT NULL DEFAULT (datetime('now')),

  CONSTRAINT uq_inmobiliaria_nombre  UNIQUE (nombre),
  CONSTRAINT chk_inmobiliaria_activo CHECK (activo IN (0, 1))
);

CREATE TRIGGER IF NOT EXISTS trg_inmobiliaria_upd
  AFTER UPDATE ON inmobiliaria FOR EACH ROW
  BEGIN
    UPDATE inmobiliaria SET updated_at = datetime('now')
    WHERE id_inmobiliaria = NEW.id_inmobiliaria;
  END;

-- ============================================================
-- TABLA 2: proyecto
-- ============================================================
-- Fuente    : hoja PROYECTOS (99 filas, nemotecnico único)
-- ESTADO PROYECTO de CONDICIONES_COMERCIALES se mapea a campo activo
-- Mantenedor   : Admin — CRUD completo
-- ============================================================
CREATE TABLE IF NOT EXISTS proyecto (
  id_proyecto       INTEGER   PRIMARY KEY,
  id_inmobiliaria   INTEGER   NOT NULL,
  nemotecnico       TEXT      NOT NULL,   -- clave natural (ABD, TOC, etc.)
  nombre_proyecto   TEXT      NOT NULL,
  comuna            TEXT      NOT NULL,
  direccion         TEXT      NOT NULL,
  tipo_entrega      TEXT      NOT NULL DEFAULT 'Entrega Futura',
  periodo_entrega   TEXT      NOT NULL,
  activo            INTEGER   NOT NULL DEFAULT 1,
  created_at        TEXT      NOT NULL DEFAULT (datetime('now')),
  updated_at        TEXT      NOT NULL DEFAULT (datetime('now')),

  CONSTRAINT fk_proyecto_inmobiliaria
    FOREIGN KEY (id_inmobiliaria) REFERENCES inmobiliaria(id_inmobiliaria)
    ON UPDATE CASCADE ON DELETE RESTRICT,
  CONSTRAINT uq_proyecto_nemotecnico   UNIQUE (nemotecnico),
  CONSTRAINT uq_proyecto_nombre        UNIQUE (id_inmobiliaria, nombre_proyecto),
  CONSTRAINT chk_proyecto_tipo_entrega CHECK (tipo_entrega IN ('Entrega Inmediata', 'Entrega Futura')),
  CONSTRAINT chk_proyecto_activo       CHECK (activo IN (0, 1))
);

CREATE INDEX IF NOT EXISTS idx_proyecto_inmobiliaria ON proyecto (id_inmobiliaria);
CREATE INDEX IF NOT EXISTS idx_proyecto_activo       ON proyecto (activo, id_inmobiliaria);
-- idx sobre nemotecnico ya cubierto por el UNIQUE

CREATE TRIGGER IF NOT EXISTS trg_proyecto_upd
  AFTER UPDATE ON proyecto FOR EACH ROW
  BEGIN
    UPDATE proyecto SET updated_at = datetime('now')
    WHERE id_proyecto = NEW.id_proyecto;
  END;

-- ============================================================
-- TABLA 3: unidad
-- ============================================================
-- Fuente    : hoja STOCK NUEVOS (8.646 filas, 21 columnas)
-- Normalizado: ESTADO STOCK → solo valores canónicos (ver constraint)
--              SUPERFICIE UTIL / TERRAZA → texto con coma → REAL
-- Surrogate PK: necesaria porque (nemo + tipo_unidad + num_unidad)
--               tiene 73 duplicados y 916 valores NULL en num_unidad
-- Mantenedor   : Admin — CRUD + importación masiva desde Excel
-- ============================================================
CREATE TABLE IF NOT EXISTS unidad (
  id_unidad             INTEGER   PRIMARY KEY,
  id_proyecto           INTEGER   NOT NULL,
  numero_unidad         INTEGER   NULL,      -- NULL para bodegas/estac sin número asignado
  tipo_unidad           TEXT      NOT NULL,
  programa              TEXT      NOT NULL,
  piso_producto         INTEGER   NOT NULL,
  orientacion           TEXT      NULL,
  dormitorios           TEXT      NULL,      -- puede ser '1', '2', '1-1/2', 'BO', '#N/A'
  banios                INTEGER   NULL,
  superficie_terreno_m2 REAL      NOT NULL DEFAULT 0,  -- Casas; 0 para departamentos
  superficie_util_m2    REAL      NULL,      -- parseado desde texto '43,35' → 43.35
  superficie_terraza_m2 REAL      NULL,      -- parseado desde texto '5,03'  →  5.03
  superficie_total_m2   REAL      NOT NULL,
  precio_lista_uf       REAL      NOT NULL,
  estado_stock          TEXT      NOT NULL DEFAULT 'Disponible',
  bienes_conjuntos      TEXT      NULL,      -- texto crudo 'B - 1', 'B - 1 B', etc.
  created_at            TEXT      NOT NULL DEFAULT (datetime('now')),
  updated_at            TEXT      NOT NULL DEFAULT (datetime('now')),

  CONSTRAINT fk_unidad_proyecto
    FOREIGN KEY (id_proyecto) REFERENCES proyecto(id_proyecto)
    ON UPDATE CASCADE ON DELETE RESTRICT,

  -- Tipos de unidad válidos (normalizar case en importación)
  CONSTRAINT chk_unidad_tipo CHECK (tipo_unidad IN (
    'Departamento', 'Estacionamiento', 'Bodega',
    'Local Comercial', 'Local comercial', 'Local',
    'Estacionamiento Moto', 'Estacionamiento Comercial', 'Estacionamiento local'
  )),
  -- Estados válidos — normalizar 'DISPONIBLE' → 'Disponible' en la carga
  CONSTRAINT chk_unidad_estado CHECK (estado_stock IN (
    'Disponible', 'Arrendado', 'En Recolocación', 'Reservado'
  )),
  CONSTRAINT chk_unidad_precio   CHECK (precio_lista_uf > 0),
  CONSTRAINT chk_unidad_sup      CHECK (superficie_total_m2 >= 0)
);

-- Unicidad parcial: solo cuando numero_unidad NO es NULL
-- Evita duplicados reales manteniendo NULLs libres
CREATE UNIQUE INDEX IF NOT EXISTS uq_unidad_por_proyecto
  ON unidad (id_proyecto, tipo_unidad, numero_unidad)
  WHERE numero_unidad IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_unidad_proyecto    ON unidad (id_proyecto);
CREATE INDEX IF NOT EXISTS idx_unidad_disponibles ON unidad (id_proyecto, estado_stock, tipo_unidad);
CREATE INDEX IF NOT EXISTS idx_unidad_numero      ON unidad (numero_unidad);
CREATE INDEX IF NOT EXISTS idx_unidad_precio      ON unidad (id_proyecto, precio_lista_uf);
-- Índice para el JOIN con condicion_comercial
CREATE INDEX IF NOT EXISTS idx_unidad_condicion   ON unidad (id_proyecto, tipo_unidad, programa);

CREATE TRIGGER IF NOT EXISTS trg_unidad_upd
  AFTER UPDATE ON unidad FOR EACH ROW
  BEGIN
    UPDATE unidad SET updated_at = datetime('now')
    WHERE id_unidad = NEW.id_unidad;
  END;

-- ============================================================
-- TABLA 4: condicion_comercial
-- ============================================================
-- Fuente    : hoja CONDICIONES_COMERCIALES (309 filas)
-- Clave natural: (id_proyecto, tipo_unidad, programa) — 0 duplicados
-- Relación con unidad: JOIN por (id_proyecto + tipo_unidad + programa)
--   → relación lógica, no FK física (el campo programa en unidad
--     referencia el campo programa aquí)
-- Mantenedor   : Admin — CRUD + importación masiva desde Excel
-- ============================================================
CREATE TABLE IF NOT EXISTS condicion_comercial (
  id_condicion             INTEGER   PRIMARY KEY,
  id_proyecto              INTEGER   NOT NULL,
  tipo_unidad              TEXT      NOT NULL,
  programa                 TEXT      NOT NULL,
  reserva_clp              INTEGER   NOT NULL DEFAULT 100000,
  descuento                REAL      NOT NULL DEFAULT 0.0,
  bono_pie                 REAL      NOT NULL DEFAULT 0.0,
  cuotas_pie               INTEGER   NOT NULL DEFAULT 0,
  pie_periodo_construccion REAL      NOT NULL DEFAULT 0.0,
  cuoton                   REAL      NOT NULL DEFAULT 0.0,
  pie_credito_directo      REAL      NOT NULL DEFAULT 0.0,
  activo                   INTEGER   NOT NULL DEFAULT 1,
  created_at               TEXT      NOT NULL DEFAULT (datetime('now')),
  updated_at               TEXT      NOT NULL DEFAULT (datetime('now')),

  CONSTRAINT fk_condicion_proyecto
    FOREIGN KEY (id_proyecto) REFERENCES proyecto(id_proyecto)
    ON UPDATE CASCADE ON DELETE RESTRICT,

  -- Clave natural: una condición por proyecto + tipo + programa
  CONSTRAINT uq_condicion UNIQUE (id_proyecto, tipo_unidad, programa),

  CONSTRAINT chk_condicion_reserva    CHECK (reserva_clp >= 0),
  CONSTRAINT chk_condicion_descuento  CHECK (descuento >= 0 AND descuento <= 1),
  CONSTRAINT chk_condicion_bono_pie   CHECK (bono_pie >= 0 AND bono_pie <= 1),
  CONSTRAINT chk_condicion_cuotas     CHECK (cuotas_pie >= 0),
  CONSTRAINT chk_condicion_pie_constr CHECK (pie_periodo_construccion >= 0 AND pie_periodo_construccion <= 1),
  CONSTRAINT chk_condicion_cuoton     CHECK (cuoton >= 0 AND cuoton <= 1),
  CONSTRAINT chk_condicion_cred_dir   CHECK (pie_credito_directo >= 0 AND pie_credito_directo <= 1),
  CONSTRAINT chk_condicion_activo     CHECK (activo IN (0, 1))
);

CREATE INDEX IF NOT EXISTS idx_condicion_proyecto ON condicion_comercial (id_proyecto, activo);
-- Índice para el JOIN cotizador: proyecto + tipo_unidad + programa
CREATE INDEX IF NOT EXISTS idx_condicion_join     ON condicion_comercial (id_proyecto, tipo_unidad, programa)
  WHERE activo = 1;

CREATE TRIGGER IF NOT EXISTS trg_condicion_upd
  AFTER UPDATE ON condicion_comercial FOR EACH ROW
  BEGIN
    UPDATE condicion_comercial SET updated_at = datetime('now')
    WHERE id_condicion = NEW.id_condicion;
  END;

-- ============================================================
-- TABLA 5: bien_conjunto
-- ============================================================
-- Fuente    : columna BIENES_CONJUNTOS de STOCK NUEVOS
--             409 filas no nulas, 332 valores únicos
--             Formato: 'B - 1', 'B - 1 B', 'B - 10 A', etc.
-- Función   : resuelve la relación N:M entre Departamento y
--             sus bienes adicionales (estac. y/o bodega)
-- Mantenedor : Admin — CRUD + auto-población en importación
-- ============================================================
CREATE TABLE IF NOT EXISTS bien_conjunto (
  id_bien_conjunto    INTEGER   PRIMARY KEY,
  id_unidad_principal INTEGER   NOT NULL,   -- FK → Departamento
  id_unidad_asociada  INTEGER   NOT NULL,   -- FK → Estacionamiento o Bodega
  descripcion         TEXT      NULL,       -- texto crudo original para trazabilidad
  created_at          TEXT      NOT NULL DEFAULT (datetime('now')),

  CONSTRAINT fk_bc_principal
    FOREIGN KEY (id_unidad_principal) REFERENCES unidad(id_unidad)
    ON DELETE CASCADE,
  CONSTRAINT fk_bc_asociada
    FOREIGN KEY (id_unidad_asociada) REFERENCES unidad(id_unidad)
    ON DELETE CASCADE,

  CONSTRAINT uq_bien_conjunto    UNIQUE (id_unidad_principal, id_unidad_asociada),
  CONSTRAINT chk_bc_distintos    CHECK (id_unidad_principal != id_unidad_asociada)
);

CREATE INDEX IF NOT EXISTS idx_bc_principal ON bien_conjunto (id_unidad_principal);
CREATE INDEX IF NOT EXISTS idx_bc_asociada  ON bien_conjunto (id_unidad_asociada);

-- ============================================================
-- TABLA 6: uf_valor
-- ============================================================
-- Fuente    : hoja UF (17.784 registros diarios, 1977-08-01 al 2026-04-09)
-- Columnas descartadas: MONEDA (siempre 'UF'), PERIODO (derivado de fecha)
-- Clave     : fecha DATE como texto 'YYYY-MM-DD' — valores únicos garantizados
-- Mantenedor : Admin — INSERT periódico de nuevos valores + importación masiva
-- ============================================================
CREATE TABLE IF NOT EXISTS uf_valor (
  fecha             TEXT    PRIMARY KEY,        -- 'YYYY-MM-DD', único por día
  valor_uf          REAL    NOT NULL,
  variacion_diaria  REAL    NULL,
  created_at        TEXT    NOT NULL DEFAULT (datetime('now')),

  CONSTRAINT chk_uf_valor CHECK (valor_uf > 0)
);

-- Índice DESC para lookup eficiente del valor más reciente
CREATE INDEX IF NOT EXISTS idx_uf_fecha_desc ON uf_valor (fecha DESC);

-- ============================================================
-- TABLA 7: parametro_cotizador
-- ============================================================
-- Fuente    : hoja aux (CAE, Pie%, Plazo) + constantes del sistema
-- Reemplaza : hoja aux como fuente de configuración de UI
-- Categorías:
--   CAE       → tasas anuales de crédito hipotecario disponibles
--   PIE_PCT   → porcentajes de pie disponibles para seleccionar
--   PLAZO     → plazos hipotecarios disponibles (años)
--   CONSTANTE → valores fijos del modelo de cálculo
-- Mantenedor : Admin — CRUD completo (afecta directamente los cálculos)
-- ============================================================
CREATE TABLE IF NOT EXISTS parametro_cotizador (
  id_parametro    INTEGER   PRIMARY KEY,
  categoria       TEXT      NOT NULL,
  clave           TEXT      NOT NULL,
  valor_numerico  REAL      NULL,
  etiqueta        TEXT      NOT NULL,
  orden           INTEGER   NOT NULL DEFAULT 0,
  es_default      INTEGER   NOT NULL DEFAULT 0,   -- valor preseleccionado en UI
  activo          INTEGER   NOT NULL DEFAULT 1,
  created_at      TEXT      NOT NULL DEFAULT (datetime('now')),
  updated_at      TEXT      NOT NULL DEFAULT (datetime('now')),

  CONSTRAINT uq_parametro        UNIQUE (categoria, clave),
  CONSTRAINT chk_param_categoria CHECK (categoria IN ('CAE', 'PIE_PCT', 'PLAZO', 'CONSTANTE')),
  CONSTRAINT chk_param_default   CHECK (es_default IN (0, 1)),
  CONSTRAINT chk_param_activo    CHECK (activo IN (0, 1))
);

CREATE INDEX IF NOT EXISTS idx_parametro_categoria ON parametro_cotizador (categoria, activo);

CREATE TRIGGER IF NOT EXISTS trg_parametro_upd
  AFTER UPDATE ON parametro_cotizador FOR EACH ROW
  BEGIN
    UPDATE parametro_cotizador SET updated_at = datetime('now')
    WHERE id_parametro = NEW.id_parametro;
  END;

-- ============================================================
-- TABLA 8: cotizacion   [FASE 2 — histórico de cotizaciones]
-- ============================================================
-- Snapshot inmutable de cada cotización generada.
-- Guarda los valores usados en el momento del cálculo para
-- trazabilidad y auditoría (los precios del stock pueden cambiar).
-- Mantenedor : Solo lectura para Admin; INSERT desde la app
-- ============================================================
CREATE TABLE IF NOT EXISTS cotizacion (
  id_cotizacion        INTEGER   PRIMARY KEY,
  fecha_generacion     TEXT      NOT NULL DEFAULT (datetime('now')),
  -- Unidad y condición cotizadas
  id_unidad            INTEGER   NOT NULL,
  id_condicion         INTEGER   NOT NULL,
  -- Datos del broker y cliente
  nombre_broker        TEXT      NOT NULL,
  nombre_cliente       TEXT      NOT NULL,
  rut_cliente          TEXT      NULL,
  email_cliente        TEXT      NULL,
  celular_cliente      TEXT      NULL,
  -- Parámetros usados en el cálculo (snapshot al momento de generar)
  valor_uf_snapshot    REAL      NOT NULL,
  pie_pct              REAL      NOT NULL,
  n_cuotas_pie         INTEGER   NOT NULL,
  cae_1                REAL      NOT NULL,
  cae_2                REAL      NOT NULL,
  cae_3                REAL      NOT NULL,
  plazo_anios          INTEGER   NOT NULL,
  arriendo_1_clp       INTEGER   NULL,
  arriendo_2_clp       INTEGER   NULL,
  arriendo_3_clp       INTEGER   NULL,
  plusvalia_anual_pct  REAL      NOT NULL DEFAULT 0.02,
  -- Resultados calculados (snapshot para auditoría y reimpresión)
  precio_lista_uf      REAL      NOT NULL,
  precio_venta_uf      REAL      NOT NULL,
  tasacion_uf          REAL      NULL,
  pie_total_uf         REAL      NOT NULL,
  ch_plan_uf           REAL      NOT NULL,
  roi_5anios           REAL      NULL,
  roi_anual            REAL      NULL,
  cap_rate             REAL      NULL,

  CONSTRAINT fk_cotizacion_unidad
    FOREIGN KEY (id_unidad) REFERENCES unidad(id_unidad)
    ON DELETE RESTRICT,
  CONSTRAINT fk_cotizacion_condicion
    FOREIGN KEY (id_condicion) REFERENCES condicion_comercial(id_condicion)
    ON DELETE RESTRICT
);

CREATE INDEX IF NOT EXISTS idx_cotizacion_unidad  ON cotizacion (id_unidad);
CREATE INDEX IF NOT EXISTS idx_cotizacion_broker  ON cotizacion (nombre_broker, fecha_generacion DESC);
CREATE INDEX IF NOT EXISTS idx_cotizacion_fecha   ON cotizacion (fecha_generacion DESC);

-- ============================================================
-- VISTA: v_stock_cotizable
-- ============================================================
-- JOIN operativo que el cotizador usa en tiempo real.
-- Combina unidad + condicion_comercial + proyecto + inmobiliaria.
-- Solo unidades disponibles con condición activa.
-- ============================================================
CREATE VIEW IF NOT EXISTS v_stock_cotizable AS
SELECT
  -- Identificadores
  u.id_unidad,
  u.id_proyecto,
  cc.id_condicion,
  -- Proyecto / Inmobiliaria
  i.nombre                    AS alianza,
  p.nemotecnico,
  p.nombre_proyecto,
  p.tipo_entrega,
  p.periodo_entrega,
  p.direccion,
  p.comuna,
  -- Unidad
  u.numero_unidad,
  u.tipo_unidad,
  u.programa,
  u.piso_producto,
  u.orientacion,
  u.dormitorios,
  u.banios,
  u.superficie_terreno_m2,
  u.superficie_util_m2,
  u.superficie_terraza_m2,
  u.superficie_total_m2,
  u.precio_lista_uf,
  u.estado_stock,
  u.bienes_conjuntos,
  -- Condiciones comerciales
  cc.reserva_clp,
  cc.descuento,
  cc.bono_pie,
  cc.cuotas_pie,
  cc.pie_periodo_construccion,
  cc.cuoton,
  cc.pie_credito_directo
FROM unidad u
JOIN proyecto            p   ON p.id_proyecto   = u.id_proyecto
JOIN inmobiliaria        i   ON i.id_inmobiliaria = p.id_inmobiliaria
LEFT JOIN condicion_comercial cc
  ON  cc.id_proyecto  = u.id_proyecto
  AND cc.tipo_unidad  = u.tipo_unidad
  AND cc.programa     = u.programa
  AND cc.activo       = 1
WHERE
  u.estado_stock  = 'Disponible'
  AND p.activo    = 1
  AND i.activo    = 1;

-- ============================================================
-- DATOS INICIALES: parametro_cotizador
-- Fuente: hoja aux + constantes del modelo COTIZADOR
-- ============================================================
INSERT OR IGNORE INTO parametro_cotizador
  (categoria, clave, valor_numerico, etiqueta, orden, es_default, activo)
VALUES
  -- ── Tasas CAE (hoja aux, col C) ─────────────────────────
  ('CAE', 'cae_035', 0.035, '3.5%', 1, 0, 1),
  ('CAE', 'cae_040', 0.040, '4.0%', 2, 1, 1),   -- default escenario 1
  ('CAE', 'cae_045', 0.045, '4.5%', 3, 1, 1),   -- default escenario 2
  ('CAE', 'cae_050', 0.050, '5.0%', 4, 1, 1),   -- default escenario 3
  -- ── Porcentajes de Pie (hoja aux, col D) ─────────────────
  ('PIE_PCT', 'pie_000', 0.00, '0%',  1, 0, 1),
  ('PIE_PCT', 'pie_005', 0.05, '5%',  2, 0, 1),
  ('PIE_PCT', 'pie_010', 0.10, '10%', 3, 1, 1),  -- default
  ('PIE_PCT', 'pie_015', 0.15, '15%', 4, 0, 1),
  ('PIE_PCT', 'pie_020', 0.20, '20%', 5, 0, 1),
  ('PIE_PCT', 'pie_025', 0.25, '25%', 6, 0, 1),
  ('PIE_PCT', 'pie_030', 0.30, '30%', 7, 0, 1),
  ('PIE_PCT', 'pie_035', 0.35, '35%', 8, 0, 1),
  ('PIE_PCT', 'pie_040', 0.40, '40%', 9, 0, 1),
  -- ── Plazos hipotecarios (hoja aux, col F) ────────────────
  ('PLAZO', 'plazo_20', 20, '20 años', 1, 0, 1),
  ('PLAZO', 'plazo_25', 25, '25 años', 2, 0, 1),
  ('PLAZO', 'plazo_30', 30, '30 años', 3, 1, 1),  -- default
  -- ── Constantes del modelo de cálculo ────────────────────
  -- (extraídas de las fórmulas fijas del COTIZADOR Excel)
  ('CONSTANTE', 'UPFRONT_PCT',         0.02,  'Upfront a la Promesa (%)',          1, 0, 1),
  ('CONSTANTE', 'APORTE_INMOB_PCT',    0.10,  'Aporte Inmobiliaria (%)',           2, 0, 1),
  ('CONSTANTE', 'MESES_ARRIENDO_ANIO', 11,    'Meses de arriendo por año',         3, 0, 1),
  ('CONSTANTE', 'HAIRCUT_VENTA',       0.95,  'Factor precio de venta año 5',      4, 0, 1),
  ('CONSTANTE', 'FACTOR_LTV',          0.67,  'Factor LTV amortización 60 meses',  5, 0, 1),
  ('CONSTANTE', 'PLUSVALIA_DEFAULT',   0.02,  'Plusvalía anual estimada default',  6, 0, 1);
