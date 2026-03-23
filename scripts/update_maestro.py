#!/usr/bin/env python3
"""
update_maestro.py
Actualiza automáticamente MAESTRO_DESARROLLO_COTIZADOR.md con:
  - Timestamp de última actualización
  - Hash y mensaje del último commit
  - Branch actual
  - Progreso general (conteo de substages completadas)
  - Fila nueva en la tabla de historial de commits

Llamado desde los hooks post-commit y pre-push de git.
"""

import subprocess
import re
import sys
from datetime import datetime
from pathlib import Path

REPO_ROOT  = Path(__file__).parent.parent
MAESTRO    = REPO_ROOT / "MAESTRO_DESARROLLO_COTIZADOR.md"
ENCODING   = "utf-8"

# ── Helpers git ───────────────────────────────────────────────────────────────

def git(*args):
    """Ejecuta un comando git y retorna stdout (str). Retorna '' si falla."""
    try:
        result = subprocess.run(
            ["git", "-C", str(REPO_ROOT)] + list(args),
            capture_output=True, text=True, encoding=ENCODING
        )
        return result.stdout.strip()
    except Exception:
        return ""

def get_git_info():
    commit_hash  = git("log", "-1", "--format=%h")
    commit_msg   = git("log", "-1", "--format=%s")
    commit_date  = git("log", "-1", "--format=%ai")   # ISO 8601
    branch       = git("branch", "--show-current") or "main"
    return commit_hash, commit_msg, commit_date, branch

# ── Conteo de progreso ────────────────────────────────────────────────────────

def count_progress(content):
    """Cuenta substages completadas vs total."""
    total     = len(re.findall(r"<!-- SUBSTAGE:", content))
    completed = len(re.findall(r"\*\*Estado:\*\* `🟢 COMPLETADO`", content))
    in_prog   = len(re.findall(r"\*\*Estado:\*\* `🟡 EN PROGRESO`", content))
    pct       = round(completed / total * 100) if total else 0
    return total, completed, in_prog, pct

# ── Actualización de marcadores ───────────────────────────────────────────────

def replace_marker(content, tag, new_value):
    """Reemplaza <!-- TAG -->...<!-- /TAG --> con nuevo valor."""
    pattern = rf"<!-- {tag} -->.*?<!-- /{tag} -->"
    replacement = f"<!-- {tag} -->{new_value}<!-- /{tag} -->"
    return re.sub(pattern, replacement, content, flags=re.DOTALL)

def update_historial(content, date_str, commit_hash, branch, commit_msg):
    """Agrega una fila al historial si el commit no está ya registrado."""
    # Verificar si el commit ya está en el historial
    if commit_hash and commit_hash in content:
        return content

    # Escapar pipes en el mensaje para no romper la tabla markdown
    safe_msg = commit_msg.replace("|", "\\|") if commit_msg else "-"
    safe_hash = commit_hash or "-"
    safe_date = date_str[:10] if date_str else "-"

    new_row = f"| {safe_date} | {safe_hash} | {branch} | {safe_msg} |"

    # Insertar antes del cierre del bloque historial
    content = content.replace(
        "<!-- HISTORIAL_END -->",
        f"{new_row}\n<!-- HISTORIAL_END -->"
    )
    return content

# ── Main ──────────────────────────────────────────────────────────────────────

def main():
    if not MAESTRO.exists():
        print(f"[update_maestro] Archivo no encontrado: {MAESTRO}")
        sys.exit(0)  # No fallar el hook si el archivo no existe

    content = MAESTRO.read_text(encoding=ENCODING)

    commit_hash, commit_msg, commit_date, branch = get_git_info()

    # Timestamp legible
    now_str = datetime.now().strftime("%Y-%m-%d %H:%M:%S")

    # Progreso
    total, completed, in_prog, pct = count_progress(content)
    progress_str = (
        f"{completed} de {total} substages completadas "
        f"({pct}%) — {in_prog} en progreso"
    )

    # Aplicar reemplazos en los marcadores META
    content = replace_marker(content, "LAST_UPDATED",  now_str)
    content = replace_marker(content, "COMMIT_HASH",   commit_hash or "-")
    content = replace_marker(content, "COMMIT_MSG",    commit_msg  or "-")
    content = replace_marker(content, "BRANCH",        branch)
    content = replace_marker(content, "PROGRESS",      progress_str)

    # Agregar fila al historial
    content = update_historial(
        content, commit_date, commit_hash, branch, commit_msg
    )

    MAESTRO.write_text(content, encoding=ENCODING)
    print(f"[update_maestro] Actualizado: {now_str} | {commit_hash} | {pct}% completado")

if __name__ == "__main__":
    main()
