"""
Catálogo automático de la biblioteca (SOLO LECTURA sobre los PDFs).

Uso (después de inventario.mjs):
  python scripts/biblioteca/catalogo.py

Lee scripts/biblioteca/salida/inventario.json y genera en la misma carpeta:
  - catalogo-local.json   → un libro por PDF a subir (incluye la ruta local: NO se publica)
  - catalogo-revision.md  → qué revisar: dudosos, autores unificados, ediciones repetidas, muestra

Cómo decide autor y título:
  1. Separa "Autor - Título" (o al revés) por el primer " - ".
  2. Agrupa variantes de un mismo autor ("Grabiel"/"Gabriel", carpeta "Issac Asimov") y usa
     la escritura más frecuente (desempate: la que lleva tildes).
  3. Si el lado derecho es un autor conocido y el izquierdo no, invierte.
  4. Sin " - ": busca un autor conocido al final del nombre; si no, usa los metadatos del PDF
     cuando parecen fiables; si no, "Autor desconocido" y lo marca para revisión.
  5. Limpia el título (guiones bajos, sufijos basura, mayúsculas) y separa el año si lo trae.
Los duplicados exactos (misma huella SHA-1) se suben una sola vez.
"""
import difflib
import json
import os
import random
import re
import sys
import unicodedata
from collections import Counter, defaultdict

import pymupdf

sys.stdout.reconfigure(encoding="utf-8")
pymupdf.TOOLS.mupdf_display_errors(False)

SALIDA = os.path.join(os.path.dirname(os.path.abspath(__file__)), "salida")
DESCONOCIDO = "Autor desconocido"
SIN_GENERO = "Sin clasificar"
GENERO_POR_CARPETA = {"libros ciencia": "Ciencia"}
NO_AUTORES = {"mas libros", "libros zzz", "libros ciencia"}  # carpetas que no son autores
METADATA_BASURA = re.compile(
    r"(unknown|desconocid|admin|user|usuario|microsoft|word|adobe|acrobat|pdf|scan|calibre|"
    r"writer|www\.|http|\.com|lenovo|hp_|dell|owner|propietario|^\W*$)",
    re.I,
)


def norm(s):
    s = unicodedata.normalize("NFD", s)
    s = "".join(c for c in s if unicodedata.category(c) != "Mn")
    return re.sub(r"[^a-z0-9]+", " ", s.lower()).strip()


def tiene_tildes(s):
    return any(unicodedata.category(c) == "Mn" for c in unicodedata.normalize("NFD", s))


def slugify(s):
    return re.sub(r"\s+", "-", norm(s))[:90].strip("-")


def limpiar_espacios(s):
    s = s.replace("_", " ")
    s = re.sub(r"\s+", " ", s)
    return s.strip(" -·.,;")


def parece_nombre(s):
    """Heurística de nombre de persona: 1–5 palabras, sin dígitos, cortas y con mayúscula."""
    palabras = s.split()
    if not 1 <= len(palabras) <= 5 or re.search(r"\d", s):
        return False
    return all(p[:1].isupper() or p.lower() in {"de", "del", "la", "y", "van", "von", "da", "&"} for p in palabras)


def nombre_propio(s):
    """"GEORGE BORROW" → "George Borrow" (deja iniciales como "H." intactas)."""
    if s.isupper():
        return " ".join(p if p.endswith(".") else p.capitalize() for p in s.split())
    return s


def mismo_autor(a, b):
    """Mismo autor con faltas leves: nombre completo muy parecido Y apellido parecido."""
    if sorted(a.split()) == sorted(b.split()):
        return True
    if difflib.SequenceMatcher(None, a, b).ratio() < 0.84:
        return False
    apellido_a, apellido_b = a.split()[-1], b.split()[-1]
    return (difflib.SequenceMatcher(None, apellido_a, apellido_b).ratio() >= 0.75
            or apellido_a in b.split() or apellido_b in a.split())


def limpiar_titulo(t):
    t = limpiar_espacios(t)
    t = re.sub(r"\s*\(\d\)$", "", t)                        # "Mansfield Park (2)"
    t = re.sub(r"\s*pdf\s*·?\s*versi[oó]n\s*\d*$", "", t, flags=re.I)
    t = re.sub(r"(\D)\d{3,4}$", lambda m: m.group(1) if not 1500 <= int(m.group(0)[1:] or 0) <= 2030 else m.group(0), t)
    t = re.sub(r"(?<=[a-záéíóúñ])1{3,}$", "", t)          # "Contacto1111"
    t = re.sub(r"[-\s]+\d{1,2}$", "", t)                    # "...tránsito-1"
    t = re.sub(r"^\d{1,3}\s*(PC)?\s+", "", t)               # "02 Contacto", "11PC El Big Bang"
    t = re.sub(r"^\d{1,2}\s*-\s*", "", t)                   # "4 - Los hijos de la Tierra"
    t = limpiar_espacios(t)
    if t.isupper() and len(t) > 3:
        t = t[0] + t[1:].lower()
    elif t.islower():
        t = t[0].upper() + t[1:]
    return t


def extraer_anio(t):
    m = re.search(r"\s(1[5-9]\d{2}|20[0-2]\d)$", t)
    if m:
        return t[: m.start()].strip(" ,;-"), int(m.group(1))
    return t, None


def main():
    inv = json.load(open(os.path.join(SALIDA, "inventario.json"), encoding="utf-8"))
    raiz, recs = inv["raiz"], inv["records"]

    # --- Duplicados exactos: se elige la copia con mejor nombre (patrón + carpeta de autor) ---
    excluidos = set()
    por_hash = defaultdict(list)
    for r in recs:
        if r.get("sha1"):
            por_hash[r["sha1"]].append(r)
    for grupo in por_hash.values():
        if len(grupo) > 1:
            grupo.sort(key=lambda r: (not r["autor"], -len(r["ruta"].split("\\")), len(r["ruta"])))
            excluidos.update(r["ruta"] for r in grupo[1:])
    activos = [r for r in recs if r["ruta"] not in excluidos]

    # --- Candidatos a autor: carpetas de autor + lado izquierdo de "A - B" ---
    candidatos = Counter()      # cuántas veces aparece cada escritura en NOMBRES de archivo
    solo_carpeta = set()        # escrituras que solo existen como carpeta (ayudan a agrupar)
    for r in activos:
        if r["autor"] and parece_nombre(limpiar_espacios(r["autor"])):
            candidatos[nombre_propio(limpiar_espacios(r["autor"]))] += 1
    for r in activos:
        partes = r["ruta"].split("\\")
        if len(partes) >= 3 and norm(partes[1]) not in NO_AUTORES:
            nombre = limpiar_espacios(partes[1])
            if nombre not in candidatos:
                solo_carpeta.add(nombre)
                candidatos[nombre] += 0

    # --- Agrupar variantes del mismo autor ---
    canon_de = {}
    grupos = []
    for nombre, _ in candidatos.most_common():
        clave = norm(nombre)
        destino = None
        for g in grupos:
            if mismo_autor(clave, g["clave"]):
                destino = g
                break
        if destino is None:
            destino = {"clave": clave, "variantes": Counter()}
            grupos.append(destino)
        destino["variantes"][nombre] += candidatos[nombre]
    for g in grupos:
        # La escritura más frecuente en archivos; entre las que solo difieren en tildes, la que las tiene.
        en_archivos = {v: n for v, n in g["variantes"].items() if v not in solo_carpeta} or dict(g["variantes"])
        por_clave = Counter()
        for v, n in en_archivos.items():
            por_clave[norm(v)] += n
        clave_ganadora = por_clave.most_common(1)[0][0]
        mismas = [v for v in en_archivos if norm(v) == clave_ganadora]
        mejor = max(mismas, key=lambda v: (tiene_tildes(v), en_archivos[v]))
        g["canon"] = mejor
        for v in g["variantes"]:
            canon_de[norm(v)] = mejor
    conocidos = {norm(g["canon"]) for g in grupos
                 if sum(g["variantes"].values()) >= 2 or any(v in solo_carpeta for v in g["variantes"])}

    def canon(nombre):
        n = norm(nombre)
        if n in canon_de:
            return canon_de[n]
        mejor = difflib.get_close_matches(n, list(canon_de), n=1, cutoff=0.86)
        return canon_de[mejor[0]] if mejor else limpiar_espacios(nombre)

    def es_autor_conocido(nombre):
        n = norm(nombre)
        return n in canon_de and norm(canon_de[n]) in conocidos or bool(
            difflib.get_close_matches(n, list(conocidos), n=1, cutoff=0.86))

    libros, revisar, invertidos, slugs = [], [], [], Counter()
    for i, r in enumerate(activos):
        partes = r["ruta"].split("\\")
        base = re.sub(r"\.pdf$", "", partes[-1], flags=re.I)
        carpeta_autor = limpiar_espacios(partes[1]) if len(partes) >= 3 and norm(partes[1]) not in NO_AUTORES else ""
        genero = next((g for k, g in GENERO_POR_CARPETA.items() if k in norm(r["ruta"])), SIN_GENERO)
        confianza, nota = "alta", ""

        if " - " in base:
            izq, der = (limpiar_espacios(x) for x in base.split(" - ", 1))
            if not carpeta_autor and (
                (es_autor_conocido(der) and not es_autor_conocido(izq))
                or (parece_nombre(der) and not parece_nombre(izq))
            ):
                autor, titulo = der, izq
                invertidos.append(r["ruta"])
            else:
                autor, titulo = izq, der
            if not parece_nombre(autor):
                confianza, nota = "baja", "el lado del autor no parece un nombre"
        elif " " not in base and base.count("-") >= 2:
            titulo, autor = base.replace("-", " "), ""        # "el-lado-oscuro-del-poder"
        elif "-" in base and parece_nombre(limpiar_espacios(base.split("-", 1)[0])) \
                and not parece_nombre(limpiar_espacios(base.split("-", 1)[1])):
            autor, titulo = (limpiar_espacios(x) for x in base.split("-", 1))  # "Autor-Título"
        else:
            titulo, autor = limpiar_espacios(base), ""
        if not autor:
            # ¿Termina con un autor conocido? ("El_angel_caido_Fernando_Lalana")
            palabras = titulo.split()
            for k in range(min(4, len(palabras) - 1), 1, -1):
                cola = " ".join(palabras[-k:])
                if es_autor_conocido(cola):
                    autor, titulo = cola, " ".join(palabras[:-k])
                    break
            if not autor and carpeta_autor:
                autor = carpeta_autor
            if not autor:
                confianza, nota = "media", "sin autor en el nombre"

        paginas, meta_autor = None, ""
        try:
            with pymupdf.open(os.path.join(raiz, r["ruta"])) as doc:
                paginas = doc.page_count
                meta_autor = (doc.metadata or {}).get("author", "") or ""
        except Exception as exc:  # noqa: BLE001
            confianza, nota = "baja", f"no se pudo abrir: {exc}"

        if not autor:
            m = limpiar_espacios(meta_autor)
            if m and not METADATA_BASURA.search(m) and parece_nombre(m):
                autor, nota = m, "autor tomado de los metadatos del PDF"
            else:
                autor = DESCONOCIDO
        if autor != DESCONOCIDO:
            autor_canon = canon(nombre_propio(autor))
            if carpeta_autor and norm(canon(carpeta_autor)) != norm(autor_canon) and confianza == "alta":
                nota = f"carpeta «{carpeta_autor}» y nombre «{autor}» no coinciden"
                confianza = "media"
            autor = autor_canon

        titulo, anio = extraer_anio(limpiar_titulo(titulo))
        if not titulo:
            titulo, confianza, nota = limpiar_espacios(base), "baja", "título vacío tras limpiar"

        slug = slugify(f"{autor if autor != DESCONOCIDO else ''} {titulo}") or f"libro-{i}"
        slugs[slug] += 1
        if slugs[slug] > 1:
            slug = f"{slug}-{slugs[slug]}"

        libro = {
            "slug": slug,
            "titulo": titulo,
            "autor": autor,
            "anio": anio,
            "paginas": paginas,
            "bytes": r["bytes"],
            "genero": genero,
            "r2Key": f"libros/{slug}.pdf",
            "origen": r["ruta"],
            "confianza": confianza,
        }
        if nota:
            libro["nota"] = nota
        libros.append(libro)
        if confianza != "alta":
            revisar.append(libro)
        if (i + 1) % 300 == 0:
            print(f"  … {i + 1} de {len(activos)}")

    # --- Correcciones manuales (scripts/biblioteca/correcciones.json) ---
    ruta_corr = os.path.join(os.path.dirname(os.path.abspath(__file__)), "correcciones.json")
    corr = json.load(open(ruta_corr, encoding="utf-8")) if os.path.exists(ruta_corr) else {}
    por_autor, por_libro = corr.get("autores", {}), corr.get("libros", {})
    omitidos_manual = set()
    for b in libros:
        b["autor"] = por_autor.get(b["autor"], b["autor"])
        cambios = por_libro.get(b["origen"])
        if cambios:
            if cambios.get("omitir"):
                omitidos_manual.add(b["origen"])
            b.update({k: v for k, v in cambios.items() if k in ("titulo", "autor", "anio", "genero")})
            b["confianza"] = "alta"
            b.pop("nota", None)
    libros = [b for b in libros if b["origen"] not in omitidos_manual]
    revisar = [b for b in revisar if b["origen"] not in omitidos_manual and b["confianza"] != "alta"]
    # El slug y la clave en R2 se recalculan con los nombres ya corregidos, PERO los libros que ya
    # están subidos conservan su clave: corregir un título no obliga a volver a subir el archivo.
    claves_previas = {}
    ruta_prev = os.path.join(SALIDA, "catalogo-local.json")
    ruta_subidos = os.path.join(SALIDA, "subidos.json")
    if os.path.exists(ruta_prev) and os.path.exists(ruta_subidos):
        subidos = json.load(open(ruta_subidos, encoding="utf-8"))
        for prev in json.load(open(ruta_prev, encoding="utf-8")).get("libros", []):
            if prev.get("r2Key") in subidos:
                claves_previas[prev["origen"]] = prev["r2Key"]
    usados = set(claves_previas.values())
    slugs = Counter()
    for i, b in enumerate(libros):
        if b["origen"] in claves_previas:
            b["r2Key"] = claves_previas[b["origen"]]
            b["slug"] = b["r2Key"][len("libros/"):-len(".pdf")]
            continue
        slug = slugify(f"{b['autor'] if b['autor'] != DESCONOCIDO else ''} {b['titulo']}") or f"libro-{i}"
        slugs[slug] += 1
        candidato = slug if slugs[slug] == 1 else f"{slug}-{slugs[slug]}"
        while f"libros/{candidato}.pdf" in usados:
            slugs[slug] += 1
            candidato = f"{slug}-{slugs[slug]}"
        b["slug"] = candidato
        b["r2Key"] = f"libros/{candidato}.pdf"
        usados.add(b["r2Key"])

    # --- Mismo autor + título con distinto archivo (ediciones a elegir) ---
    por_obra = defaultdict(list)
    for b in libros:
        por_obra[(norm(b["autor"]), norm(b["titulo"]))].append(b)
    repetidos = [g for g in por_obra.values() if len(g) > 1]
    # Regla por defecto: queda la edición con más páginas (más completa); empate → la más liviana.
    # Para elegir otra, marca {"omitir": true} en correcciones.json para la que no quieras.
    ediciones_omitidas = set()
    for g in repetidos:
        g.sort(key=lambda b: (-(b["paginas"] or 0), b["bytes"]))
        ediciones_omitidas.update(b["origen"] for b in g[1:])
    libros = [b for b in libros if b["origen"] not in ediciones_omitidas]
    revisar = [b for b in revisar if b["origen"] not in ediciones_omitidas]

    fusiones = [g for g in grupos if len(g["variantes"]) > 1]
    random.seed(7)
    muestra = random.sample(libros, min(30, len(libros)))
    total = sum(b["bytes"] for b in libros)

    def fila(b):
        extra = f" — _{b['nota']}_" if b.get("nota") else ""
        return f"| {b['titulo']} | {b['autor']} | {b['anio'] or ''} | {b['paginas'] or '?'} | `{b['origen']}`{extra} |"

    md = [
        "# Revisión del catálogo",
        "",
        f"- Libros a subir: **{len(libros)}** ({total / 1024 ** 3:.2f} GB) · duplicados exactos omitidos: "
        f"{len(excluidos)} · ediciones repetidas omitidas: {len(ediciones_omitidas)}",
        f"- Confianza alta: {sum(b['confianza'] == 'alta' for b in libros)} · media: "
        f"{sum(b['confianza'] == 'media' for b in libros)} · baja: {sum(b['confianza'] == 'baja' for b in libros)}",
        f"- Nombres invertidos corregidos («Título - Autor»): {len(invertidos)}",
        f"- Autores con variantes unificadas: {len(fusiones)}",
        f"- Obras repetidas (otra edición/archivo): {len(repetidos)} grupos",
        f"- Autores distintos: {len({b['autor'] for b in libros})}",
        "",
        "## Muestra al azar (30)",
        "| Título | Autor | Año | Págs. | Archivo |",
        "|---|---|---|---:|---|",
        *[fila(b) for b in sorted(muestra, key=lambda b: b["autor"])],
        "",
        "## Obras repetidas: queda la primera (más páginas); las demás no se suben",
        *[
            "- **" + g[0]["titulo"] + "** (" + g[0]["autor"] + "): ✅ "
            + " · ❌ ".join(f"`{b['origen']}` ({b['bytes'] / 1e6:.1f} MB, {b['paginas']} págs.)" for b in g)
            for g in repetidos
        ],
        "",
        "## Autores unificados (variantes → nombre usado)",
        *[f"- {', '.join(sorted(g['variantes']))} → **{g['canon']}**" for g in fusiones],
        "",
        "## Nombres invertidos corregidos",
        *[f"- `{x}`" for x in invertidos],
        "",
        f"## Para revisar ({len(revisar)})",
        "| Título | Autor | Año | Págs. | Archivo |",
        "|---|---|---|---:|---|",
        *[fila(b) for b in sorted(revisar, key=lambda b: (b["confianza"], b["origen"]))],
        "",
    ]
    with open(os.path.join(SALIDA, "catalogo-local.json"), "w", encoding="utf-8") as fh:
        json.dump({"raiz": raiz, "libros": libros, "omitidos": sorted(excluidos | ediciones_omitidas | omitidos_manual)},
                  fh, ensure_ascii=False, indent=1)
    with open(os.path.join(SALIDA, "catalogo-revision.md"), "w", encoding="utf-8") as fh:
        fh.write("\n".join(md))
    print(f"\nListo: {len(libros)} libros · revisar {len(revisar)} · repetidos {len(repetidos)} · "
          f"invertidos {len(invertidos)} · autores unificados {len(fusiones)}")


if __name__ == "__main__":
    main()
