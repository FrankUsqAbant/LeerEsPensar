"""
Portadas reales de la biblioteca (SOLO LECTURA sobre los PDFs).

Uso (después de catalogo.py):
  python scripts/biblioteca/portadas.py            # todas las que falten
  python scripts/biblioteca/portadas.py --muestra 40

Para cada libro dibuja la página 1 como miniatura WebP (320 px de ancho) y le da un
puntaje de "buena portada" (0–100):
  + color (métrica de Hasler–Süsstrunk) y una imagen en la página,
  − página casi blanca, mucho texto corrido (es una página interior, no una portada),
  − forma que no parece de libro.
Solo las que llegan al mínimo (USABLE) se usan en el sitio; el resto conserva la portada
generada. Resultado en scripts/biblioteca/salida/:
  - portadas/<slug>.webp
  - portadas.json  → { slug: { puntaje, usable, ancho, alto } }
Es reanudable: no vuelve a procesar las que ya están.
"""
import json
import math
import os
import random
import sys

import pymupdf
from PIL import Image, ImageStat

sys.stdout.reconfigure(encoding="utf-8")
pymupdf.TOOLS.mupdf_display_errors(False)

SALIDA = os.path.join(os.path.dirname(os.path.abspath(__file__)), "salida")
CARPETA = os.path.join(SALIDA, "portadas")
INDICE = os.path.join(SALIDA, "portadas.json")
ANCHO = 320
CALIDAD = 72
USABLE = 45


def pixeles(img):
    """Píxeles de una imagen (compatible con Pillow 12–14+)."""
    return img.get_flattened_data() if hasattr(img, "get_flattened_data") else img.getdata()


def colorido(img):
    """Hasler & Süsstrunk (2003): ~0 gris, >40 bastante colorida, >80 muy colorida."""
    pequeña = img.resize((64, int(64 * img.height / img.width) or 1)).convert("RGB")
    rg, yb = [], []
    for r, g, b in pixeles(pequeña):
        rg.append(r - g)
        yb.append(0.5 * (r + g) - b)
    def media_desv(v):
        m = sum(v) / len(v)
        return m, math.sqrt(sum((x - m) ** 2 for x in v) / len(v))
    (m1, s1), (m2, s2) = media_desv(rg), media_desv(yb)
    return math.sqrt(s1 ** 2 + s2 ** 2) + 0.3 * math.sqrt(m1 ** 2 + m2 ** 2)


def fraccion_blanca(img):
    gris = img.convert("L").resize((64, int(64 * img.height / img.width) or 1))
    datos = list(pixeles(gris))
    return sum(1 for v in datos if v > 235) / len(datos)


def puntuar(img, caracteres, tiene_imagen, proporcion):
    color = min(1.0, colorido(img) / 60)               # 0..1
    blanco = fraccion_blanca(img)                       # 0..1
    contraste = min(1.0, ImageStat.Stat(img.convert("L")).stddev[0] / 70)
    p = 45 * color + 20 * contraste + (15 if tiene_imagen else 0)
    p += 20 * (1 - blanco)
    if caracteres > 400:                                # página de texto, no portada
        p -= 35
    elif caracteres > 150:
        p -= 15
    if not 0.55 <= proporcion <= 0.85:                  # no tiene forma de libro
        p -= 15
    return max(0, min(100, round(p)))


def procesar(raiz, libro):
    with pymupdf.open(os.path.join(raiz, libro["origen"])) as doc:
        pagina = doc[0]
        rect = pagina.rect
        escala = ANCHO / rect.width
        pix = pagina.get_pixmap(matrix=pymupdf.Matrix(escala, escala), alpha=False)
        img = Image.frombytes("RGB", (pix.width, pix.height), pix.samples)
        if img.height > ANCHO * 1.6:                    # páginas muy largas: se recorta arriba
            img = img.crop((0, 0, img.width, int(ANCHO * 1.6)))
        caracteres = len(pagina.get_text().strip())
        tiene_imagen = len(pagina.get_images()) > 0
    img.save(os.path.join(CARPETA, f"{libro['slug']}.webp"), "WEBP", quality=CALIDAD, method=4)
    puntaje = puntuar(img, caracteres, tiene_imagen, rect.width / rect.height)
    return {"puntaje": puntaje, "usable": puntaje >= USABLE, "ancho": img.width, "alto": img.height}


def main():
    os.makedirs(CARPETA, exist_ok=True)
    catalogo = json.load(open(os.path.join(SALIDA, "catalogo-local.json"), encoding="utf-8"))
    indice = json.load(open(INDICE, encoding="utf-8")) if os.path.exists(INDICE) else {}
    libros = [b for b in catalogo["libros"] if b["slug"] not in indice]
    if "--muestra" in sys.argv:
        n = int(sys.argv[sys.argv.index("--muestra") + 1])
        random.seed(11)
        libros = random.sample(libros, min(n, len(libros)))
    print(f"Por procesar: {len(libros)} · ya hechas: {len(indice)}")
    for i, libro in enumerate(libros, 1):
        try:
            indice[libro["slug"]] = procesar(catalogo["raiz"], libro)
        except Exception as exc:  # noqa: BLE001  PDF raro: queda la portada generada
            indice[libro["slug"]] = {"puntaje": 0, "usable": False, "error": str(exc)[:120]}
        if i % 50 == 0 or i == len(libros):
            with open(INDICE, "w", encoding="utf-8") as fh:
                json.dump(indice, fh, ensure_ascii=False)
            print(f"  … {i} de {len(libros)}")
    usables = sum(1 for v in indice.values() if v.get("usable"))
    peso = sum(os.path.getsize(os.path.join(CARPETA, f)) for f in os.listdir(CARPETA))
    print(f"Listo: {len(indice)} procesadas · {usables} usables · {peso / 1024 / 1024:.1f} MB en miniaturas")


if __name__ == "__main__":
    main()
