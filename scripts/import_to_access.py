#!/usr/bin/env python3
"""
import_to_access.py
Importa el modelo de datos Cotizador a COTIZADOR-WEB.accdb (MS Access) via DAO.

Adaptaciones respecto a schema.sql (SQLite → Access/ACE):
  • AutoNumber  en lugar de INTEGER PRIMARY KEY AUTOINCREMENT
  • Long        en lugar de INTEGER
  • Double      en lugar de REAL
  • Short Text  (dbText)  en lugar de TEXT para campos cortos
  • Long Text   (dbMemo)  para campos de texto libre
  • Validation Rules por campo en lugar de CHECK constraints
  • Table Validation Rule para chk_bc_distintos
  • Índices parciales (WHERE ...) → índices regulares (ACE no los soporta)
  • Triggers   → no soportados; lógica delegada a la aplicación
  • Vista v_stock_cotizable → QueryDef guardada
"""
import sys
import os
import win32com.client

# ── DAO type constants ────────────────────────────────────────────────────────
dbText          = 10
dbLong          =  4
dbDouble        =  7
dbMemo          = 12
dbAutoIncrField = 16

# ── Relationship attribute constants ─────────────────────────────────────────
dbRelationUpdateCascade = 256
dbRelationDeleteCascade = 4096
# 0 = enforce RI, no cascade (equivalent to RESTRICT)

DB_PATH = os.path.abspath(r"c:\AI\cotizador-web-mp\COTIZADOR-WEB.accdb")
print(f"Base de datos: {DB_PATH}")

dao_engine = win32com.client.Dispatch("DAO.DBEngine.120")
db = dao_engine.OpenDatabase(DB_PATH)

# ── Helpers ───────────────────────────────────────────────────────────────────
def table_exists(name):
    for td in db.TableDefs:
        if td.Name.lower() == name.lower() and not td.Name.startswith("MSys"):
            return True
    return False

def drop_table(name):
    if table_exists(name):
        db.TableDefs.Delete(name)
        db.TableDefs.Refresh()
        print(f"    eliminada: {name}")

def relation_exists(name):
    for r in db.Relations:
        if r.Name.lower() == name.lower():
            return True
    return False

def drop_relation(name):
    if relation_exists(name):
        db.Relations.Delete(name)
        db.Relations.Refresh()

def query_exists(name):
    for q in db.QueryDefs:
        if q.Name.lower() == name.lower():
            return True
    return False

def add_field(td, name, ftype, size=None, required=False, allow_zero=None,
              default=None, validation=None, autonum=False):
    fld = td.CreateField(name, ftype)
    if size is not None:
        fld.Size = size
    if autonum:
        fld.Attributes = dbAutoIncrField
        fld.Required = False   # AutoNumber must be non-required
    else:
        fld.Required = required
    # AllowZeroLength solo aplica a Text y Memo
    if ftype in (dbText, dbMemo) and not autonum:
        if allow_zero is not None:
            fld.AllowZeroLength = allow_zero
        else:
            fld.AllowZeroLength = not required  # required → no empty strings
    if default is not None:
        fld.DefaultValue = str(default)
    if validation is not None:
        fld.ValidationRule = validation
    td.Fields.Append(fld)
    return fld

def pk_autonum(td, name):
    """Campo AutoNumber + índice PrimaryKey."""
    add_field(td, name, dbLong, autonum=True)
    idx = td.CreateIndex("PrimaryKey")
    idx.Primary = True
    idx.Unique = True
    idx.Required = True
    idx.Fields.Append(idx.CreateField(name))
    td.Indexes.Append(idx)

def pk_text(td, name, size=10):
    """PK sobre campo Text (para uf_valor.fecha)."""
    add_field(td, name, dbText, size=size, required=True, allow_zero=False)
    idx = td.CreateIndex("PrimaryKey")
    idx.Primary = True
    idx.Unique = True
    idx.Required = True
    idx.Fields.Append(idx.CreateField(name))
    td.Indexes.Append(idx)

def unique_idx(td, idx_name, fields):
    idx = td.CreateIndex(idx_name)
    idx.Unique = True
    idx.Required = False   # puede haber NULLs salvo que todos sean required
    for f in fields:
        idx.Fields.Append(idx.CreateField(f))
    td.Indexes.Append(idx)

def reg_idx(td, idx_name, fields):
    idx = td.CreateIndex(idx_name)
    idx.Unique = False
    for f in fields:
        idx.Fields.Append(idx.CreateField(f))
    td.Indexes.Append(idx)

def make_relation(name, parent_tbl, child_tbl, parent_fld, child_fld, attrs):
    if relation_exists(name):
        drop_relation(name)
    rel = db.CreateRelation(name, parent_tbl, child_tbl, attrs)
    rfld = rel.CreateField(parent_fld)
    rfld.ForeignName = child_fld
    rel.Fields.Append(rfld)
    db.Relations.Append(rel)
    print(f"    OK  {name}")

def append_table(td):
    db.TableDefs.Append(td)
    db.TableDefs.Refresh()
    print(f"    OK  {td.Name}")

# ══════════════════════════════════════════════════════════════════════════════
# 1. DROP en orden inverso de dependencias
# ══════════════════════════════════════════════════════════════════════════════
print("\n[1/4] Eliminando objetos existentes...")

for r in ["fk_cotizacion_condicion", "fk_cotizacion_unidad",
          "fk_bc_asociada", "fk_bc_principal",
          "fk_condicion_proyecto", "fk_unidad_proyecto",
          "fk_proyecto_inmobiliaria"]:
    drop_relation(r)

for t in ["cotizacion", "bien_conjunto", "condicion_comercial",
          "unidad", "proyecto", "inmobiliaria", "uf_valor", "parametro_cotizador"]:
    drop_table(t)

if query_exists("v_stock_cotizable"):
    db.QueryDefs.Delete("v_stock_cotizable")
    db.QueryDefs.Refresh()
    print("    eliminada query: v_stock_cotizable")

# ══════════════════════════════════════════════════════════════════════════════
# 2. CREATE TABLES
# ══════════════════════════════════════════════════════════════════════════════
print("\n[2/4] Creando tablas...")

# ── 1. inmobiliaria ───────────────────────────────────────────────────────────
td = db.CreateTableDef("inmobiliaria")
pk_autonum(td, "id_inmobiliaria")
add_field(td, "nombre",     dbText, 100, required=True)
add_field(td, "activo",     dbLong,      required=True, default=1,
          validation="=0 Or =1")
add_field(td, "created_at", dbText, 19,  required=True)
add_field(td, "updated_at", dbText, 19,  required=True)
unique_idx(td, "uq_inmobiliaria_nombre", ["nombre"])
append_table(td)

# ── 2. proyecto ───────────────────────────────────────────────────────────────
td = db.CreateTableDef("proyecto")
pk_autonum(td, "id_proyecto")
add_field(td, "id_inmobiliaria",  dbLong,       required=True)
add_field(td, "nemotecnico",      dbText, 20,   required=True)
add_field(td, "nombre_proyecto",  dbText, 200,  required=True)
add_field(td, "comuna",           dbText, 100,  required=True)
add_field(td, "direccion",        dbText, 200,  required=True)
add_field(td, "tipo_entrega",     dbText, 30,   required=True,
          default='"Entrega Futura"',
          validation='"Entrega Inmediata" Or "Entrega Futura"')
add_field(td, "periodo_entrega",  dbText, 30,   required=True)
add_field(td, "activo",           dbLong,       required=True, default=1,
          validation="=0 Or =1")
add_field(td, "created_at",       dbText, 19,   required=True)
add_field(td, "updated_at",       dbText, 19,   required=True)
unique_idx(td, "uq_proyecto_nemotecnico", ["nemotecnico"])
unique_idx(td, "uq_proyecto_nombre",     ["id_inmobiliaria", "nombre_proyecto"])
reg_idx(td,   "idx_proyecto_inmobiliaria", ["id_inmobiliaria"])
reg_idx(td,   "idx_proyecto_activo",       ["activo", "id_inmobiliaria"])
append_table(td)

# ── 3. unidad ─────────────────────────────────────────────────────────────────
# NOTA: índice parcial uq_unidad_por_proyecto (WHERE numero_unidad IS NOT NULL)
#       no soportado en Access → se convierte en índice regular sin unique.
#       La unicidad condicional se aplica en capa de aplicación.
td = db.CreateTableDef("unidad")
pk_autonum(td, "id_unidad")
add_field(td, "id_proyecto",           dbLong,       required=True)
add_field(td, "numero_unidad",         dbLong,       required=False)  # NULL p/ estac/bod
add_field(td, "tipo_unidad",           dbText, 50,   required=True)
add_field(td, "programa",              dbText, 100,  required=True)
add_field(td, "piso_producto",         dbLong,       required=True)
add_field(td, "orientacion",           dbText, 50,   required=False, allow_zero=True)
add_field(td, "dormitorios",           dbText, 20,   required=False, allow_zero=True)
add_field(td, "banios",                dbLong,       required=False)
add_field(td, "superficie_terreno_m2", dbDouble,     required=True,  default=0,
          validation=">=0")                          # 0 para departamentos
add_field(td, "superficie_util_m2",    dbDouble,     required=False, validation=">=0")
add_field(td, "superficie_terraza_m2", dbDouble,     required=False, validation=">=0")
add_field(td, "superficie_total_m2",   dbDouble,     required=True,  validation=">=0")
add_field(td, "precio_lista_uf",       dbDouble,     required=True,  validation=">0")
add_field(td, "estado_stock",          dbText, 30,   required=True,
          default='"Disponible"',
          validation='"Disponible" Or "Arrendado" Or "En Recolocación" Or "Reservado"')
add_field(td, "bienes_conjuntos",      dbText, 100,  required=False, allow_zero=True)
add_field(td, "created_at",            dbText, 19,   required=True)
add_field(td, "updated_at",            dbText, 19,   required=True)
# índice regular reemplazando el partial unique de SQLite
reg_idx(td, "idx_unidad_por_proyecto", ["id_proyecto", "tipo_unidad", "numero_unidad"])
reg_idx(td, "idx_unidad_proyecto",     ["id_proyecto"])
reg_idx(td, "idx_unidad_disponibles",  ["id_proyecto", "estado_stock", "tipo_unidad"])
reg_idx(td, "idx_unidad_numero",       ["numero_unidad"])
reg_idx(td, "idx_unidad_precio",       ["id_proyecto", "precio_lista_uf"])
reg_idx(td, "idx_unidad_condicion",    ["id_proyecto", "tipo_unidad", "programa"])
append_table(td)

# ── 4. condicion_comercial ────────────────────────────────────────────────────
# NOTA: índice parcial idx_condicion_join (WHERE activo=1) → índice regular.
td = db.CreateTableDef("condicion_comercial")
pk_autonum(td, "id_condicion")
add_field(td, "id_proyecto",              dbLong,       required=True)
add_field(td, "tipo_unidad",              dbText, 50,   required=True)
add_field(td, "programa",                 dbText, 100,  required=True)
add_field(td, "reserva_clp",              dbLong,       required=True, default=100000,
          validation=">=0")
add_field(td, "descuento",                dbDouble,     required=True, default=0,
          validation=">=0 And <=1")
add_field(td, "bono_pie",                 dbDouble,     required=True, default=0,
          validation=">=0 And <=1")
add_field(td, "cuotas_pie",               dbLong,       required=True, default=0,
          validation=">=0")
add_field(td, "pie_periodo_construccion", dbDouble,     required=True, default=0,
          validation=">=0 And <=1")
add_field(td, "cuoton",                   dbDouble,     required=True, default=0,
          validation=">=0 And <=1")
add_field(td, "pie_credito_directo",      dbDouble,     required=True, default=0,
          validation=">=0 And <=1")
add_field(td, "activo",                   dbLong,       required=True, default=1,
          validation="=0 Or =1")
add_field(td, "created_at",               dbText, 19,   required=True)
add_field(td, "updated_at",               dbText, 19,   required=True)
unique_idx(td, "uq_condicion",         ["id_proyecto", "tipo_unidad", "programa"])
reg_idx(td,   "idx_condicion_proyecto", ["id_proyecto", "activo"])
reg_idx(td,   "idx_condicion_join",     ["id_proyecto", "tipo_unidad", "programa"])
append_table(td)

# ── 5. bien_conjunto ──────────────────────────────────────────────────────────
# NOTA: chk_bc_distintos (id_principal != id_asociada) se aplica como
#       ValidationRule a nivel de tabla, y también en aplicación.
td = db.CreateTableDef("bien_conjunto")
pk_autonum(td, "id_bien_conjunto")
add_field(td, "id_unidad_principal", dbLong,    required=True)
add_field(td, "id_unidad_asociada",  dbLong,    required=True)
add_field(td, "descripcion",         dbMemo,    required=False, allow_zero=True)
add_field(td, "created_at",          dbText, 19, required=True)
# Validation a nivel de tabla: los dos IDs deben ser distintos
td.ValidationRule = "[id_unidad_principal] <> [id_unidad_asociada]"
td.ValidationText = "El bien asociado no puede ser el mismo que el principal"
unique_idx(td, "uq_bien_conjunto", ["id_unidad_principal", "id_unidad_asociada"])
reg_idx(td,   "idx_bc_principal",  ["id_unidad_principal"])
reg_idx(td,   "idx_bc_asociada",   ["id_unidad_asociada"])
append_table(td)

# ── 6. uf_valor ───────────────────────────────────────────────────────────────
# PK es el campo texto "fecha" ('YYYY-MM-DD'), no AutoNumber
td = db.CreateTableDef("uf_valor")
pk_text(td, "fecha", size=10)
add_field(td, "valor_uf",         dbDouble,    required=True,  validation=">0")
add_field(td, "variacion_diaria", dbDouble,    required=False)
add_field(td, "created_at",       dbText, 19,  required=True)
# índice descendente para lookup del valor más reciente
reg_idx(td, "idx_uf_fecha_desc", ["fecha"])  # ORDER BY fecha DESC en queries
append_table(td)

# ── 7. parametro_cotizador ────────────────────────────────────────────────────
td = db.CreateTableDef("parametro_cotizador")
pk_autonum(td, "id_parametro")
add_field(td, "categoria",      dbText, 20,   required=True,
          validation='"CAE" Or "PIE_PCT" Or "PLAZO" Or "CONSTANTE"')
add_field(td, "clave",          dbText, 50,   required=True)
add_field(td, "valor_numerico", dbDouble,     required=False)
add_field(td, "etiqueta",       dbText, 100,  required=True)
add_field(td, "orden",          dbLong,       required=True,  default=0)
add_field(td, "es_default",     dbLong,       required=True,  default=0,
          validation="=0 Or =1")
add_field(td, "activo",         dbLong,       required=True,  default=1,
          validation="=0 Or =1")
add_field(td, "created_at",     dbText, 19,   required=True)
add_field(td, "updated_at",     dbText, 19,   required=True)
unique_idx(td, "uq_parametro",           ["categoria", "clave"])
reg_idx(td,   "idx_parametro_categoria", ["categoria", "activo"])
append_table(td)

# ── 8. cotizacion ─────────────────────────────────────────────────────────────
td = db.CreateTableDef("cotizacion")
pk_autonum(td, "id_cotizacion")
add_field(td, "fecha_generacion",    dbText, 19,  required=True)
add_field(td, "id_unidad",           dbLong,      required=True)
add_field(td, "id_condicion",        dbLong,      required=True)
add_field(td, "nombre_broker",       dbText, 100, required=True)
add_field(td, "nombre_cliente",      dbText, 100, required=True)
add_field(td, "rut_cliente",         dbText, 20,  required=False, allow_zero=True)
add_field(td, "email_cliente",       dbText, 100, required=False, allow_zero=True)
add_field(td, "celular_cliente",     dbText, 20,  required=False, allow_zero=True)
add_field(td, "valor_uf_snapshot",   dbDouble,    required=True, validation=">0")
add_field(td, "pie_pct",             dbDouble,    required=True, validation=">=0 And <=1")
add_field(td, "n_cuotas_pie",        dbLong,      required=True, validation=">=0")
add_field(td, "cae_1",               dbDouble,    required=True, validation=">0")
add_field(td, "cae_2",               dbDouble,    required=True, validation=">0")
add_field(td, "cae_3",               dbDouble,    required=True, validation=">0")
add_field(td, "plazo_anios",         dbLong,      required=True, validation=">0")
add_field(td, "arriendo_1_clp",      dbLong,      required=False)
add_field(td, "arriendo_2_clp",      dbLong,      required=False)
add_field(td, "arriendo_3_clp",      dbLong,      required=False)
add_field(td, "plusvalia_anual_pct", dbDouble,    required=True, default=0.02,
          validation=">=0")
add_field(td, "precio_lista_uf",     dbDouble,    required=True, validation=">0")
add_field(td, "precio_venta_uf",     dbDouble,    required=True, validation=">0")
add_field(td, "tasacion_uf",         dbDouble,    required=False)
add_field(td, "pie_total_uf",        dbDouble,    required=True)
add_field(td, "ch_plan_uf",          dbDouble,    required=True)
add_field(td, "roi_5anios",          dbDouble,    required=False)
add_field(td, "roi_anual",           dbDouble,    required=False)
add_field(td, "cap_rate",            dbDouble,    required=False)
reg_idx(td, "idx_cotizacion_unidad", ["id_unidad"])
reg_idx(td, "idx_cotizacion_broker", ["nombre_broker", "fecha_generacion"])
reg_idx(td, "idx_cotizacion_fecha",  ["fecha_generacion"])
append_table(td)

# ══════════════════════════════════════════════════════════════════════════════
# 3. CREATE RELATIONSHIPS (con integridad referencial)
# ══════════════════════════════════════════════════════════════════════════════
print("\n[3/4] Creando relaciones...")

# inmobiliaria 1──N proyecto  (CASCADE UPDATE, RESTRICT DELETE)
make_relation("fk_proyecto_inmobiliaria",
              "inmobiliaria", "proyecto",
              "id_inmobiliaria", "id_inmobiliaria",
              dbRelationUpdateCascade)

# proyecto 1──N unidad  (CASCADE UPDATE, RESTRICT DELETE)
make_relation("fk_unidad_proyecto",
              "proyecto", "unidad",
              "id_proyecto", "id_proyecto",
              dbRelationUpdateCascade)

# proyecto 1──N condicion_comercial  (CASCADE UPDATE, RESTRICT DELETE)
make_relation("fk_condicion_proyecto",
              "proyecto", "condicion_comercial",
              "id_proyecto", "id_proyecto",
              dbRelationUpdateCascade)

# unidad 1──N bien_conjunto (via id_unidad_principal)  (CASCADE DELETE)
make_relation("fk_bc_principal",
              "unidad", "bien_conjunto",
              "id_unidad", "id_unidad_principal",
              dbRelationDeleteCascade)

# unidad 1──N bien_conjunto (via id_unidad_asociada)  (CASCADE DELETE)
# Access permite dos relaciones entre mismas tablas con distintos campos
try:
    make_relation("fk_bc_asociada",
                  "unidad", "bien_conjunto",
                  "id_unidad", "id_unidad_asociada",
                  dbRelationDeleteCascade)
except Exception as e:
    print(f"    AVISO fk_bc_asociada: {e}")
    print("    → Se aplica CASCADE DELETE solo via fk_bc_principal.")
    print("      La integridad de id_unidad_asociada se refuerza en la aplicación.")

# unidad 1──N cotizacion  (RESTRICT DELETE — snapshot histórico)
make_relation("fk_cotizacion_unidad",
              "unidad", "cotizacion",
              "id_unidad", "id_unidad",
              0)

# condicion_comercial 1──N cotizacion  (RESTRICT DELETE)
make_relation("fk_cotizacion_condicion",
              "condicion_comercial", "cotizacion",
              "id_condicion", "id_condicion",
              0)

# ══════════════════════════════════════════════════════════════════════════════
# 4. CREATE QUERY: v_stock_cotizable
# ══════════════════════════════════════════════════════════════════════════════
print("\n[4/4] Creando query v_stock_cotizable...")

# Access/Jet SQL: múltiples JOINs requieren paréntesis anidados.
# LEFT JOIN con condición compuesta en ON.
access_sql = """
SELECT
  u.id_unidad, u.id_proyecto, cc.id_condicion,
  i.nombre                    AS alianza,
  p.nemotecnico,
  p.nombre_proyecto,
  p.tipo_entrega,
  p.periodo_entrega,
  p.direccion,
  p.comuna,
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
  cc.reserva_clp,
  cc.descuento,
  cc.bono_pie,
  cc.cuotas_pie,
  cc.pie_periodo_construccion,
  cc.cuoton,
  cc.pie_credito_directo
FROM (((unidad AS u
  INNER JOIN proyecto AS p
    ON p.id_proyecto = u.id_proyecto)
  INNER JOIN inmobiliaria AS i
    ON i.id_inmobiliaria = p.id_inmobiliaria)
  LEFT JOIN condicion_comercial AS cc
    ON (cc.id_proyecto  = u.id_proyecto
    AND cc.tipo_unidad  = u.tipo_unidad
    AND cc.programa     = u.programa
    AND cc.activo       = 1))
WHERE u.estado_stock = 'Disponible'
  AND p.activo       = 1
  AND i.activo       = 1
""".strip()

qd = db.CreateQueryDef("v_stock_cotizable", access_sql)
db.QueryDefs.Refresh()
print("    OK  v_stock_cotizable")

# ══════════════════════════════════════════════════════════════════════════════
db.Close()

print("\n" + "="*65)
print("  COTIZADOR-WEB.accdb actualizado correctamente")
print("="*65)
print("  Tablas (8)    : inmobiliaria, proyecto, unidad,")
print("                  condicion_comercial, bien_conjunto,")
print("                  uf_valor, parametro_cotizador, cotizacion")
print("  Relaciones(7) : con integridad referencial y cascadas")
print("  Indices       : unicos + regulares por tabla")
print("  Query (1)     : v_stock_cotizable")
print("-"*65)
print("  LIMITACIONES respecto a schema.sql (SQLite):")
print("  * Indices parciales (WHERE ...) -> indices regulares")
print("  * Triggers updated_at -> logica en la aplicacion")
print("  * chk_unidad_tipo (enum largo) -> validacion en app")
print("  * INSERT OR IGNORE semilla -> ejecutar manualmente")
print("="*65)
