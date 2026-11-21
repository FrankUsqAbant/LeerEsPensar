"""
Compresión de PDFs escaneados (nunca modifica el original). Úsala SOLO si la
biblioteca se acerca a los 10 GB gratuitos de R2: hoy no hace falta.

Uso:
  python scripts/biblioteca/comprimir.py ORIGEN.pdf DESTINO.pdf

Qué aprendimos con el inventario (2026-11-20):
  - Los PDFs de texto (la gran mayoría) apenas bajan 0-3 %: no vale la pena.
  - Los escaneados ya traen JPEG muy comprimidos: recomprimir a la misma
    resolución los AGRANDA. Solo ahorra bajar escaneos de ~300 ppp a 150 ppp
    (unos 35 %), con letras un poco más suaves al ampliar.

Qué hace: reduce a 150 ppp las páginas escaneadas que estén por encima de 250 ppp
(Pillow, LANCZOS, JPEG 85) y lo ACEPTA solo si conserva páginas y texto, se ve
igual a tamaño de lectura y ahorra al menos 20 %. Si no, borra el destino.
Imprime una línea JSON con el resultado.
"""
import io
import json
import os
import sys

import pymupdf
from PIL import Image, ImageChops, ImageStat

MIN_AHORRO = 0.20
MAX_DIFERENCIA = 2.0
DPI_UMBRAL = 250
DPI_OBJETIVO = 150
CALIDAD_JPEG = 85
DPI_COMPARACION = 72


def texto_normalizado(doc, paginas):
    return [" ".join(doc[i].get_text().split()) for i in paginas]


def paginas_muestra(n):
    """Primera, una del primer tercio, la del medio y la penúltima (sin repetir)."""
    if n <= 4:
        return list(range(n))
    return sorted({0, n // 3, n // 2, max(0, n - 2)})


def render(doc, i):
    pix = doc[i].get_pixmap(dpi=DPI_COMPARACION, alpha=False)
    return Image.frombytes("RGB", (pix.width, pix.height), pix.samples)


def diferencia(a, b):
    if a.size != b.size:
        b = b.resize(a.size)
    diff = ImageChops.difference(a.convert("L"), b.convert("L"))
    return ImageStat.Stat(diff).mean[0]


def comprimir(origen, destino):
    """Extrae cada imagen escaneada de alta resolución, la reduce y la reemplaza."""
    doc = pymupdf.open(origen)
    hechas = set()
    for page in doc:
        for info in page.get_image_info(xrefs=True):
            xref = info.get("xref")
            ancho_pulg = (info["bbox"][2] - info["bbox"][0]) / 72
            if not xref or xref in hechas or ancho_pulg <= 0:
                continue
            hechas.add(xref)
            ppp = info["width"] / ancho_pulg
            if ppp <= DPI_UMBRAL:
                continue
            img = Image.open(io.BytesIO(doc.extract_image(xref)["image"]))
            if img.mode not in ("RGB", "L"):
                img = img.convert("RGB")
            escala = DPI_OBJETIVO / ppp
            img = img.resize((max(1, round(img.width * escala)), max(1, round(img.height * escala))), Image.LANCZOS)
            buf = io.BytesIO()
            img.save(buf, "JPEG", quality=CALIDAD_JPEG, optimize=True, progressive=True)
            page.replace_image(xref, stream=buf.getvalue())
    doc.save(destino, garbage=4, deflate=True)
    doc.close()


def verificar(origen, destino):
    a = pymupdf.open(origen)
    b = pymupdf.open(destino)
    try:
        if a.page_count != b.page_count:
            return False, f"páginas distintas ({a.page_count} vs {b.page_count})", None
        muestra = paginas_muestra(a.page_count)
        if texto_normalizado(a, muestra) != texto_normalizado(b, muestra):
            return False, "el texto cambió", None
        peor = max(diferencia(render(a, i), render(b, i)) for i in muestra)
        if peor >= MAX_DIFERENCIA:
            return False, f"se ve distinto (diferencia {peor:.2f})", peor
        return True, "ok", peor
    finally:
        a.close()
        b.close()


def main():
    # En Windows la consola usa otra codificación: forzar UTF-8 para nombres con tildes.
    sys.stdout.reconfigure(encoding="utf-8")
    args =[x for x in sys.argv[1:] if not x.startswith("--")]
    if len(args) != 2:
        print(__doc__)
        sys.exit(1)
    origen, destino = args
    if os.path.abspath(origen) == os.path.abspath(destino):
        sys.exit("El destino no puede ser el original.")

    antes = os.path.getsize(origen)
    resultado = {"origen": origen, "antes": antes}
    try:
        comprimir(origen, destino)
        despues = os.path.getsize(destino)
        ok, motivo, peor = verificar(origen, destino)
        ahorro = 1 - despues / antes
        if ok and ahorro < MIN_AHORRO:
            ok, motivo = False, f"ahorro pequeño ({ahorro:.0%})"
        resultado.update(despues=despues, ahorro=round(ahorro, 3), aceptado=ok, motivo=motivo,
                         diferencia=None if peor is None else round(peor, 2))
    except Exception as exc:  # PDF raro: se sube el original
        ok = False
        resultado.update(aceptado=False, motivo=f"error: {exc}")
    if not ok and os.path.exists(destino):
        os.remove(destino)
    print(json.dumps(resultado, ensure_ascii=False))


if __name__ == "__main__":
    main()
