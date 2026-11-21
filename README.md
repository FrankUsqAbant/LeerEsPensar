<a href="https://leer-es-pensar.pages.dev">
  <img src="docs/hero.webp" alt="LeerEsPensar: estante de libros con portadas reales bajo una lámpara de lectura" width="100%" />
</a>

# LeerEsPensar

Biblioteca privada de clásicos literarios para descargar en PDF, gratis. Una sala de lectura
con lámpara (claro/oscuro), estante de 1764 libros con sus portadas reales y descarga directa.

→ **[leer-es-pensar.pages.dev](https://leer-es-pensar.pages.dev)** (acceso con código del grupo) ·
**[Fan page](https://www.facebook.com/LeerPensar)** · leyendoparapensar@gmail.com

- **Estante en dos repisas**: portadas destacadas y toda la biblioteca de la A a la Z, con búsqueda
  y desplazamiento suave.
- **Ficha en doble página** que se abre desde el estante y descarga el PDF real.
- **Lámpara** que cambia de día a noche y luz que sigue la hora local.
- **Apoyo** con Yape y PayPal, y **muro de gratitud** que administra el autor.
- **"Lo leí" en la fan page**: el lector toca un botón y se publica al momento
  con la portada, su nombre, un agradecimiento y una cita sobre la lectura.

## Estructura

```
src/                 Aplicación (React + Vite + Tailwind)
functions/           Cloudflare Pages Functions: acceso, catálogo, PDFs, portadas, gratitud, fan page
public/              Archivos estáticos (cabeceras, QR, texturas, favicon)
scripts/biblioteca/  Inventariar, catalogar y subir los PDFs a R2
scripts/fanpage/     Conectar la fan page de Facebook (guarda la llave sin mostrarla)
docs/                Guías (biblioteca, fan page) e imagen del README
```

## Uso

```bash
npm install
npm run dev      # http://localhost:3000
npm test         # pruebas
npm run build && npx wrangler pages deploy --branch main
```

Secretos en Cloudflare Pages (no van en el repositorio): `ACCESS_CODE`, `ADMIN_CODE`, `SESSION_SECRET`
y los de Facebook. Modelo local: [.dev.vars.example](.dev.vars.example).

- Libros (Cloudflare R2, privado) y cómo agregarlos: [docs/biblioteca.md](docs/biblioteca.md)
- Fan page y cómo renovar la llave: [docs/fanpage.md](docs/fanpage.md)
