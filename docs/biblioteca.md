# Biblioteca de PDFs

Cómo pasar los libros desde la carpeta local a Cloudflare R2. Todo el proceso es
reanudable y nada modifica la carpeta original.

## Pasos

| # | Paso | Herramienta | Estado |
|---|---|---|---|
| 1 | **Inventario**: cuántos PDFs, peso, duplicados y dañados | `scripts/biblioteca/inventario.mjs` | Listo |
| 2 | **Catálogo**: título, autor y páginas de cada PDF; revisión de dudosos | `scripts/biblioteca/catalogo.py` + `correcciones.json` | Listo |
| 3 | **Subida a R2** con wrangler (reanudable, usa la sesión de `wrangler login`) | `scripts/biblioteca/subir.mjs` | Listo (1764) |
| 4 | **Sitio con la biblioteca**: catálogo privado, descarga directa, estante de dos repisas | `publicar-catalogo.mjs` + `functions/api/catalogo.ts` | Listo |

## 1. Inventario

```bash
node scripts/biblioteca/inventario.mjs "C:\ruta\a\los\libros"
```

Solo lee. Deja el reporte en `scripts/biblioteca/salida/` (ignorada por git, porque
contiene nombres de archivos personales):

- `inventario.md`: resumen legible (totales, por carpeta, por tamaño, duplicados).
- `inventario.json`: un registro por PDF para los pasos siguientes.

## 2. Catálogo

```bash
python scripts/biblioteca/catalogo.py
```

Lee el inventario y abre cada PDF solo para contar páginas. Genera en `salida/`:

- `catalogo-local.json`: un libro por PDF a subir (título, autor, año, páginas, clave en R2).
- `catalogo-revision.md`: muestra al azar, dudosos, autores unificados, nombres invertidos
  y ediciones repetidas.

Reglas automáticas:

- "Autor - Título" o al revés (detecta qué lado es un autor conocido).
- Variantes de un autor ("Grabiel"/"Gabriel") → la escritura más común, con tildes.
- Duplicados exactos y ediciones repetidas: queda una sola (la de más páginas).

Para corregir a mano, edita `scripts/biblioteca/correcciones.json` y vuelve a ejecutar:

```json
{
  "autores": { "Nombre detectado": "Nombre correcto" },
  "libros": {
    "CARPETA\archivo.pdf": { "titulo": "Título correcto", "autor": "Autor", "anio": 1955 },
    "CARPETA\otro.pdf": { "omitir": true }
  }
}
```

## 3. Subida a R2

```bash
node scripts/biblioteca/subir.mjs --simular     # qué subiría, sin subir
node scripts/biblioteca/subir.mjs --prueba 3    # solo 3 libros (los más livianos)
node scripts/biblioteca/subir.mjs               # todo lo pendiente
```

- Usa la sesión de `npx wrangler login` (cuenta con R2 activado); no necesita claves.
- Reanudable: guarda lo subido en `salida/subidos.json`; si se corta, ejecútalo de nuevo.
- Registro de cada archivo en `salida/subida.log` (OK / FALLO con el motivo).
- Bucket privado `leer-es-pensar-books`, claves `libros/<slug>.pdf`.

## 4. Publicar el catálogo en el sitio

```bash
node scripts/biblioteca/publicar-catalogo.mjs            # genera salida/catalogo-publico.json
node scripts/biblioteca/publicar-catalogo.mjs --subir    # y lo sube a R2 como catalogo.json
```

- Solo incluye libros que ya están en R2 (según `salida/subidos.json`): el sitio nunca muestra
  un libro que no se pueda descargar. No incluye rutas de la laptop.
- El sitio lo pide a `/api/catalogo` (función privada: exige el código de acceso, igual que los PDFs).
- La descarga es directa: `/pdf/libros/<slug>.pdf?descargar=1&nombre=Título - Autor`.
- Si el catálogo no responde, el estante muestra la selección original de 16 libros.
- Estante en dos repisas: "Portadas destacadas" (portadas reales, de la más vistosa) y
  "Toda la biblioteca, de la A a la Z" (todos; "Autor desconocido" al final).
- Cada repisa dibuja solo los libros visibles (`src/hooks/useShelfScroller.ts`): flechas con
  paso suave, mantener presionado para deslizar, arrastrar con el mouse con inercia.

**En desarrollo** (`npm run dev`), `scripts/biblioteca/vite-biblioteca-local.ts` imita
`/api/catalogo` y `/pdf/libros/*` con los archivos locales de `salida/`, sin publicar nada.

## 5. Portadas reales

```bash
python scripts/biblioteca/portadas.py          # miniatura de la página 1 + puntaje (reanudable)
node scripts/biblioteca/subir-portadas.mjs     # sube a R2 (portadas/) solo las aprobadas
node scripts/biblioteca/publicar-catalogo.mjs --subir
```

- Puntaje 0–100: color, imagen en la página, poco texto corrido y forma de libro.
- Aprobadas (≥ 45) se muestran sobre la tapa; el resto conserva la portada generada.
- Las de ≥ 70 forman la repisa de bienvenida "Portadas destacadas" (24 distintas cada día).
- Se entregan por `/portada/<slug>.webp`, privada con sesión (como los PDFs).

## Muro de gratitud

- Quien dona aparece como "Nombre + inicial" ("María G.") abajo del cuadro de apoyo y en el pie.
- Lo registra Frank: enlace discreto «adm» en el pie → su código de administrador → nombre y apellido.
- Datos en el KV `GRATITUD` (clave `muro`); funciones `/api/gratitud` (lectura, con sesión) y
  `/api/gratitud-admin` (con `ADMIN_CODE`, intentos fallidos limitados como el ingreso).
- Cambiar el código de administrador: `npx wrangler pages secret put ADMIN_CODE --project-name leer-es-pensar`.
- En desarrollo el muro vive en memoria y el código de prueba es `dev`.

## Fan page: "lo leí"

- El lector, en la ficha → Compartir → **Publicar que lo leí** (nombre, apellido y comentario opcional).
  Queda pendiente; se guarda solo "Nombre + inicial". Máximo 5 por hora por IP.
- Frank, en «adm» → **Publicaciones**: ve la tarjeta (portada real + resumen + "María G. lo leyó"),
  escribe o pide a la IA un resumen y publica. Sin Facebook conectado: descargar tarjeta + copiar texto.
- Funciones: `/api/compartir` (lector) y `/api/compartir-admin` (con `ADMIN_CODE`).
- Opcional, para publicar solo y sugerir resúmenes (secretos de Cloudflare Pages):
  - `FB_PAGE_ID`, `FB_PAGE_TOKEN` (token de la página con `pages_manage_posts`), `FB_GRAPH_VERSION` (por defecto `v23.0`).
  - `GEMINI_API_KEY` (gratis en Google AI Studio) y `GEMINI_MODEL` (por defecto `gemini-2.5-flash`).

## Compresión: se suben los originales

Probado el 2026-11-20 con `scripts/biblioteca/comprimir.py` (verifica páginas, texto y aspecto):

- PDFs de texto (la gran mayoría): ahorran 0–3 %. No vale la pena.
- PDFs escaneados: ya traen JPEG muy comprimidos. Recomprimirlos a la misma resolución
  los agranda, y bajarlos de 300 a 150 ppp ahorra ~35 % pero las páginas cambian a la vista
  (la verificación lo rechaza).
- Decisión: se suben **los originales, sin comprimir** (6,2 GB caben en los 10 GB gratis).
  La herramienta queda para cuando la biblioteca se acerque al límite.
- Los **duplicados exactos no se suben** (65 grupos, 63,6 MB); se sube una sola copia.

## Límites gratuitos de R2

- 10 GB-mes de almacenamiento (luego USD 0,015 por GB-mes).
- 1 millón de escrituras al mes; la descarga hacia los lectores no tiene costo.

Fuente: <https://developers.cloudflare.com/r2/pricing/>

## Reglas

- El bucket es privado: los PDFs se entregan solo por `functions/pdf/` con sesión.
- Las claves de R2 viven en la configuración local de rclone, nunca en el repo.
- Nombres en R2: `slug-del-libro.pdf` (minúsculas, sin tildes ni espacios).
