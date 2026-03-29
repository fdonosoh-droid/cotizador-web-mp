-- ============================================================
-- SCHEMA: COTIZADOR WEB MERCADO PRIMARIO — PostgreSQL
-- Motor:  PostgreSQL 15+ (producción)
-- Stack:  React 19 + Next.js 15 + Drizzle ORM / pg
-- Fuente: INPUT_FILES.xlsx → importación masiva + actualizaciones manuales
-- Migración desde: scripts/schema.sql (SQLite — desarrollo/prototipo)
-- ============================================================
-- Diferencias clave respecto al schema SQLite:
--   • INTEGER PRIMARY KEY → INTEGER GENERATED ALWAYS AS IDENTITY
--   • INTEGER 0/1 (booleano) → BOOLEAN
--   • TEXT 'YYYY-MM-DD' (fecha) → DATE / TIMESTAMPTZ
--   • REAL (finanzas) → NUMERIC(12,4) para precisión decimal exacta
--   • REAL (porcentajes) → NUMERIC(6,4)
--   • PRAGMA → eliminados (PostgreSQL no los usa)
--   • Triggers → PL/pgSQL con función compartida set_updated_at()
--   • INSERT OR IGNORE → INSERT ... ON CONFLICT DO NOTHING
--   • CREATE VIEW IF NOT EXISTS → CREATE OR REPLACE VIEW
--   • Índice parcial WHERE activo=1 → WHERE activo = TRUE
-- ============================================================

-- ============================================================
-- FUNCIÓN COMPARTIDA: set_updated_at()
-- Usada por todos los triggers de updated_at
-- ============================================================
CREATE OR REPLACE FUNCTION set_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;

-- ============================================================
-- TABLA 1: inmobiliaria
-- ============================================================
-- Fuente    : columna ALIANZA de PROYECTOS / STOCK NUEVOS
-- Cardinalidad : ~5 registros (INGEVEC, MAESTRA, RVC, TOCTOC, URMENETA)
-- ============================================================
CREATE TABLE IF NOT EXISTS inmobiliaria (
  id_inmobiliaria  INTEGER       GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  nombre           TEXT          NOT NULL,
  activo           BOOLEAN       NOT NULL DEFAULT TRUE,
  created_at       TIMESTAMPTZ   NOT NULL DEFAULT NOW(),
  updated_at       TIMESTAMPTZ   NOT NULL DEFAULT NOW(),

  CONSTRAINT uq_inmobiliaria_nombre UNIQUE (nombre)
);

CREATE TRIGGER trg_inmobiliaria_upd
  BEFORE UPDATE ON inmobiliaria
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- ============================================================
-- TABLA 2: proyecto
-- ============================================================
-- Fuente    : hoja PROYECTOS (99 filas, nemotecnico único)
-- ============================================================
CREATE TABLE IF NOT EXISTS proyecto (
  id_proyecto      INTEGER       GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  id_inmobiliaria  INTEGER       NOT NULL,
  nemotecnico      TEXT          NOT NULL,
  nombre_proyecto  TEXT          NOT NULL,
  comuna           TEXT          NOT NULL,
  direccion        TEXT          NOT NULL,
  tipo_entrega     TEXT          NOT NULL DEFAULT 'Entrega Futura',
  periodo_entrega  TEXT          NOT NULL,
  activo           BOOLEAN       NOT NULL DEFAULT TRUE,
  created_at       TIMESTAMPTZ   NOT NULL DEFAULT NOW(),
  updated_at       TIMESTAMPTZ   NOT NULL DEFAULT NOW(),

  CONSTRAINT fk_proyecto_inmobiliaria
    FOREIGN KEY (id_inmobiliaria) REFERENCES inmobiliaria(id_inmobiliaria)
    ON UPDATE CASCADE ON DELETE RESTRICT,
  CONSTRAINT uq_proyecto_nemotecnico UNIQUE (nemotecnico),
  CONSTRAINT uq_proyecto_nombre      UNIQUE (id_inmobiliaria, nombre_proyecto),
  CONSTRAINT chk_proyecto_tipo_entrega
    CHECK (tipo_entrega IN ('Entrega Inmediata', 'Entrega Futura'))
);

CREATE INDEX IF NOT EXISTS idx_proyecto_inmobiliaria ON proyecto (id_inmobiliaria);
CREATE INDEX IF NOT EXISTS idx_proyecto_activo       ON proyecto (activo, id_inmobiliaria);
-- Cubre el dropdown en cascada: Comuna → Entrega Aprox → Inmobiliaria → Proyecto
CREATE INDEX IF NOT EXISTS idx_proyecto_cascada
  ON proyecto (comuna, tipo_entrega, id_inmobiliaria, activo)
  WHERE activo = TRUE;

CREATE TRIGGER trg_proyecto_upd
  BEFORE UPDATE ON proyecto
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- ============================================================
-- TABLA 3: unidad
-- ============================================================
-- Fuente    : hoja STOCK NUEVOS (8.646 filas, 21 columnas)
-- ============================================================
CREATE TABLE IF NOT EXISTS unidad (
  id_unidad             INTEGER         GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  id_proyecto           INTEGER         NOT NULL,
  numero_unidad         INTEGER         NULL,         -- NULL para bienes sin número
  tipo_unidad           TEXT            NOT NULL,
  programa              TEXT            NOT NULL,     -- clave de JOIN con condicion_comercial
  piso_producto         INTEGER         NOT NULL,
  orientacion           TEXT            NULL,
  dormitorios           TEXT            NULL,         -- raw: '1', '2', '1-1/2', 'BO', '#N/A'
  banios                INTEGER         NULL,
  superficie_terreno_m2 NUMERIC(10,2)   NOT NULL DEFAULT 0,
  superficie_util_m2    NUMERIC(10,2)   NULL,
  superficie_terraza_m2 NUMERIC(10,2)   NULL,
  superficie_total_m2   NUMERIC(10,2)   NOT NULL,
  precio_lista_uf       NUMERIC(12,4)   NOT NULL,
  estado_stock          TEXT            NOT NULL DEFAULT 'Disponible',
  bienes_conjuntos      TEXT            NULL,         -- texto crudo de trazabilidad
  created_at            TIMESTAMPTZ     NOT NULL DEFAULT NOW(),
  updated_at            TIMESTAMPTZ     NOT NULL DEFAULT NOW(),

  CONSTRAINT fk_unidad_proyecto
    FOREIGN KEY (id_proyecto) REFERENCES proyecto(id_proyecto)
    ON UPDATE CASCADE ON DELETE RESTRICT,
  CONSTRAINT chk_unidad_tipo CHECK (tipo_unidad IN (
    'Departamento', 'Estacionamiento', 'Bodega',
    'Local Comercial', 'Local comercial', 'Local',
    'Estacionamiento Moto', 'Estacionamiento Comercial', 'Estacionamiento local'
  )),
  CONSTRAINT chk_unidad_estado CHECK (estado_stock IN (
    'Disponible', 'Arrendado', 'En Recolocación', 'Reservado'
  )),
  CONSTRAINT chk_unidad_precio CHECK (precio_lista_uf > 0),
  CONSTRAINT chk_unidad_sup    CHECK (superficie_total_m2 >= 0)
);

-- Unicidad parcial: solo cuando numero_unidad NO es NULL
CREATE UNIQUE INDEX IF NOT EXISTS uq_unidad_por_proyecto
  ON unidad (id_proyecto, tipo_unidad, numero_unidad)
  WHERE numero_unidad IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_unidad_proyecto    ON unidad (id_proyecto);
CREATE INDEX IF NOT EXISTS idx_unidad_disponibles ON unidad (id_proyecto, estado_stock, tipo_unidad);
CREATE INDEX IF NOT EXISTS idx_unidad_numero      ON unidad (numero_unidad);
CREATE INDEX IF NOT EXISTS idx_unidad_precio      ON unidad (id_proyecto, precio_lista_uf);
CREATE INDEX IF NOT EXISTS idx_unidad_condicion   ON unidad (id_proyecto, tipo_unidad, programa);

CREATE TRIGGER trg_unidad_upd
  BEFORE UPDATE ON unidad
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- ============================================================
-- TABLA 4: condicion_comercial
-- ============================================================
-- Fuente    : hoja CONDICIONES_COMERCIALES (309 filas)
-- Clave natural: (id_proyecto, tipo_unidad, programa)
-- ============================================================
CREATE TABLE IF NOT EXISTS condicion_comercial (
  id_condicion             INTEGER       GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  id_proyecto              INTEGER       NOT NULL,
  tipo_unidad              TEXT          NOT NULL,
  programa                 TEXT          NOT NULL,
  reserva_clp              INTEGER       NOT NULL DEFAULT 100000,
  descuento                NUMERIC(6,4)  NOT NULL DEFAULT 0.0,
  bono_pie                 NUMERIC(6,4)  NOT NULL DEFAULT 0.0,
  cuotas_pie               INTEGER       NOT NULL DEFAULT 0,
  pie_periodo_construccion NUMERIC(6,4)  NOT NULL DEFAULT 0.0,
  cuoton                   NUMERIC(6,4)  NOT NULL DEFAULT 0.0,
  pie_credito_directo      NUMERIC(6,4)  NOT NULL DEFAULT 0.0,
  activo                   BOOLEAN       NOT NULL DEFAULT TRUE,
  created_at               TIMESTAMPTZ   NOT NULL DEFAULT NOW(),
  updated_at               TIMESTAMPTZ   NOT NULL DEFAULT NOW(),

  CONSTRAINT fk_condicion_proyecto
    FOREIGN KEY (id_proyecto) REFERENCES proyecto(id_proyecto)
    ON UPDATE CASCADE ON DELETE RESTRICT,
  CONSTRAINT uq_condicion UNIQUE (id_proyecto, tipo_unidad, programa),
  CONSTRAINT chk_condicion_reserva    CHECK (reserva_clp >= 0),
  CONSTRAINT chk_condicion_descuento  CHECK (descuento  >= 0 AND descuento  <= 1),
  CONSTRAINT chk_condicion_bono_pie   CHECK (bono_pie   >= 0 AND bono_pie   <= 1),
  CONSTRAINT chk_condicion_cuotas     CHECK (cuotas_pie >= 0),
  CONSTRAINT chk_condicion_pie_constr CHECK (pie_periodo_construccion >= 0 AND pie_periodo_construccion <= 1),
  CONSTRAINT chk_condicion_cuoton     CHECK (cuoton >= 0 AND cuoton <= 1),
  CONSTRAINT chk_condicion_cred_dir   CHECK (pie_credito_directo >= 0 AND pie_credito_directo <= 1)
);

CREATE INDEX IF NOT EXISTS idx_condicion_proyecto ON condicion_comercial (id_proyecto, activo);
-- Índice parcial para el JOIN del cotizador (solo condiciones activas)
CREATE INDEX IF NOT EXISTS idx_condicion_join
  ON condicion_comercial (id_proyecto, tipo_unidad, programa)
  WHERE activo = TRUE;

CREATE TRIGGER trg_condicion_upd
  BEFORE UPDATE ON condicion_comercial
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- ============================================================
-- TABLA 5: bien_conjunto
-- ============================================================
-- Fuente    : columna BIENES_CONJUNTOS de STOCK NUEVOS (409 filas no nulas)
-- Resuelve la relación N:M Departamento ↔ Estacionamiento/Bodega
-- ============================================================
CREATE TABLE IF NOT EXISTS bien_conjunto (
  id_bien_conjunto    INTEGER     GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  id_unidad_principal INTEGER     NOT NULL,   -- FK → Departamento
  id_unidad_asociada  INTEGER     NOT NULL,   -- FK → Estacionamiento o Bodega
  descripcion         TEXT        NULL,
  created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  CONSTRAINT fk_bc_principal
    FOREIGN KEY (id_unidad_principal) REFERENCES unidad(id_unidad) ON DELETE CASCADE,
  CONSTRAINT fk_bc_asociada
    FOREIGN KEY (id_unidad_asociada)  REFERENCES unidad(id_unidad) ON DELETE CASCADE,
  CONSTRAINT uq_bien_conjunto UNIQUE (id_unidad_principal, id_unidad_asociada),
  CONSTRAINT chk_bc_distintos CHECK (id_unidad_principal != id_unidad_asociada)
);

CREATE INDEX IF NOT EXISTS idx_bc_principal ON bien_conjunto (id_unidad_principal);
CREATE INDEX IF NOT EXISTS idx_bc_asociada  ON bien_conjunto (id_unidad_asociada);

-- ============================================================
-- TABLA 6: uf_valor
-- ============================================================
-- Fuente    : hoja UF de INPUT_FILES.xlsx (17.784 registros diarios, 1977→2026)
-- Fase prod : actualizar diariamente via API CMF (api.cmfchile.cl)
-- ============================================================
CREATE TABLE IF NOT EXISTS uf_valor (
  fecha            DATE          PRIMARY KEY,   -- un registro por día
  valor_uf         NUMERIC(12,4) NOT NULL,
  variacion_diaria NUMERIC(8,6)  NULL,
  created_at       TIMESTAMPTZ   NOT NULL DEFAULT NOW(),

  CONSTRAINT chk_uf_valor CHECK (valor_uf > 0)
);

-- Índice DESC para lookup eficiente del valor más reciente
CREATE INDEX IF NOT EXISTS idx_uf_fecha_desc ON uf_valor (fecha DESC);

-- ============================================================
-- TABLA 7: parametro_cotizador
-- ============================================================
-- Fuente    : hoja aux + constantes del modelo de cálculo
-- ============================================================
CREATE TABLE IF NOT EXISTS parametro_cotizador (
  id_parametro    INTEGER       GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  categoria       TEXT          NOT NULL,
  clave           TEXT          NOT NULL,
  valor_numerico  NUMERIC(12,6) NULL,
  etiqueta        TEXT          NOT NULL,
  orden           INTEGER       NOT NULL DEFAULT 0,
  es_default      BOOLEAN       NOT NULL DEFAULT FALSE,
  activo          BOOLEAN       NOT NULL DEFAULT TRUE,
  created_at      TIMESTAMPTZ   NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ   NOT NULL DEFAULT NOW(),

  CONSTRAINT uq_parametro        UNIQUE (categoria, clave),
  CONSTRAINT chk_param_categoria CHECK (categoria IN ('CAE', 'PIE_PCT', 'PLAZO', 'CONSTANTE'))
);

CREATE INDEX IF NOT EXISTS idx_parametro_categoria ON parametro_cotizador (categoria, activo);

CREATE TRIGGER trg_parametro_upd
  BEFORE UPDATE ON parametro_cotizador
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- ============================================================
-- TABLA 8: cotizacion   [FASE 2 — histórico de cotizaciones]
-- ============================================================
CREATE TABLE IF NOT EXISTS cotizacion (
  id_cotizacion       INTEGER       GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  fecha_generacion    TIMESTAMPTZ   NOT NULL DEFAULT NOW(),
  -- Unidad y condición cotizadas
  id_unidad           INTEGER       NOT NULL,
  id_condicion        INTEGER       NOT NULL,
  -- Datos del broker y cliente
  nombre_broker       TEXT          NOT NULL,
  nombre_cliente      TEXT          NOT NULL,
  rut_cliente         TEXT          NULL,
  email_cliente       TEXT          NULL,
  celular_cliente     TEXT          NULL,
  -- Parámetros usados (snapshot al momento de generar)
  valor_uf_snapshot   NUMERIC(12,4) NOT NULL,
  pie_pct             NUMERIC(6,4)  NOT NULL,
  n_cuotas_pie        INTEGER       NOT NULL,
  cae_1               NUMERIC(6,4)  NOT NULL,
  cae_2               NUMERIC(6,4)  NOT NULL,
  cae_3               NUMERIC(6,4)  NOT NULL,
  plazo_anios         INTEGER       NOT NULL,
  arriendo_1_clp      INTEGER       NULL,
  arriendo_2_clp      INTEGER       NULL,
  arriendo_3_clp      INTEGER       NULL,
  plusvalia_anual_pct NUMERIC(6,4)  NOT NULL DEFAULT 0.02,
  -- Resultados calculados (snapshot para auditoría y reimpresión)
  precio_lista_uf     NUMERIC(12,4) NOT NULL,
  precio_venta_uf     NUMERIC(12,4) NOT NULL,
  tasacion_uf         NUMERIC(12,4) NULL,
  pie_total_uf        NUMERIC(12,4) NOT NULL,
  ch_plan_uf          NUMERIC(12,4) NOT NULL,
  roi_5anios          NUMERIC(8,6)  NULL,
  roi_anual           NUMERIC(8,6)  NULL,
  cap_rate            NUMERIC(8,6)  NULL,

  CONSTRAINT fk_cotizacion_unidad
    FOREIGN KEY (id_unidad)    REFERENCES unidad(id_unidad)                   ON DELETE RESTRICT,
  CONSTRAINT fk_cotizacion_condicion
    FOREIGN KEY (id_condicion) REFERENCES condicion_comercial(id_condicion)   ON DELETE RESTRICT
);

CREATE INDEX IF NOT EXISTS idx_cotizacion_unidad ON cotizacion (id_unidad);
CREATE INDEX IF NOT EXISTS idx_cotizacion_broker ON cotizacion (nombre_broker, fecha_generacion DESC);
CREATE INDEX IF NOT EXISTS idx_cotizacion_fecha  ON cotizacion (fecha_generacion DESC);

-- ============================================================
-- VISTA: v_stock_cotizable
-- ============================================================
-- JOIN operativo del cotizador. Solo unidades disponibles con condición activa.
-- ============================================================
CREATE OR REPLACE VIEW v_stock_cotizable AS
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
JOIN proyecto            p  ON  p.id_proyecto    = u.id_proyecto
JOIN inmobiliaria        i  ON  i.id_inmobiliaria = p.id_inmobiliaria
LEFT JOIN condicion_comercial cc
  ON  cc.id_proyecto = u.id_proyecto
  AND cc.tipo_unidad = u.tipo_unidad
  AND cc.programa    = u.programa
  AND cc.activo      = TRUE
WHERE
  u.estado_stock = 'Disponible'
  AND p.activo   = TRUE
  AND i.activo   = TRUE;

-- ============================================================
-- DATOS INICIALES: parametro_cotizador (22 registros)
-- ============================================================
INSERT INTO parametro_cotizador
  (categoria, clave, valor_numerico, etiqueta, orden, es_default, activo)
VALUES
  -- Tasas CAE
  ('CAE', 'cae_035', 0.035, '3.5%', 1, FALSE, TRUE),
  ('CAE', 'cae_040', 0.040, '4.0%', 2, TRUE,  TRUE),  -- default escenario 1
  ('CAE', 'cae_045', 0.045, '4.5%', 3, TRUE,  TRUE),  -- default escenario 2
  ('CAE', 'cae_050', 0.050, '5.0%', 4, TRUE,  TRUE),  -- default escenario 3
  -- Porcentajes de Pie
  ('PIE_PCT', 'pie_000', 0.00, '0%',  1, FALSE, TRUE),
  ('PIE_PCT', 'pie_005', 0.05, '5%',  2, FALSE, TRUE),
  ('PIE_PCT', 'pie_010', 0.10, '10%', 3, TRUE,  TRUE),  -- default
  ('PIE_PCT', 'pie_015', 0.15, '15%', 4, FALSE, TRUE),
  ('PIE_PCT', 'pie_020', 0.20, '20%', 5, FALSE, TRUE),
  ('PIE_PCT', 'pie_025', 0.25, '25%', 6, FALSE, TRUE),
  ('PIE_PCT', 'pie_030', 0.30, '30%', 7, FALSE, TRUE),
  ('PIE_PCT', 'pie_035', 0.35, '35%', 8, FALSE, TRUE),
  ('PIE_PCT', 'pie_040', 0.40, '40%', 9, FALSE, TRUE),
  -- Plazos hipotecarios
  ('PLAZO', 'plazo_20', 20, '20 años', 1, FALSE, TRUE),
  ('PLAZO', 'plazo_25', 25, '25 años', 2, FALSE, TRUE),
  ('PLAZO', 'plazo_30', 30, '30 años', 3, TRUE,  TRUE),  -- default
  -- Constantes del modelo
  ('CONSTANTE', 'UPFRONT_PCT',         0.02, 'Upfront a la Promesa (%)',          1, FALSE, TRUE),
  ('CONSTANTE', 'APORTE_INMOB_PCT',    0.10, 'Aporte Inmobiliaria (%)',           2, FALSE, TRUE),
  ('CONSTANTE', 'MESES_ARRIENDO_ANIO', 11,   'Meses de arriendo por año',         3, FALSE, TRUE),
  ('CONSTANTE', 'HAIRCUT_VENTA',       0.95, 'Factor precio de venta año 5',      4, FALSE, TRUE),
  ('CONSTANTE', 'FACTOR_LTV',          0.67, 'Factor LTV amortización 60 meses',  5, FALSE, TRUE),
  ('CONSTANTE', 'PLUSVALIA_DEFAULT',   0.02, 'Plusvalía anual estimada default',  6, FALSE, TRUE)
ON CONFLICT DO NOTHING;
