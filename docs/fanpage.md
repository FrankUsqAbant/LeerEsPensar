# Fan page: "lo leí"

Los lectores comparten en la [fan page](https://www.facebook.com/LeerPensar) que leyeron un libro.
Sale al momento, sin aprobación, y une al grupo alrededor de la lectura.

## Cómo funciona

1. En la ficha del libro → **Compartir** → **Publicar que lo leí**: nombre, apellido y un comentario
   opcional. Se publica solo "Nombre + inicial" ("María G."); el nombre queda recordado en ese navegador.
2. Se publica una foto 1080×1350 con la portada real, **"María G. lo leyó"** y su comentario
   (si no escribió nada, una cita clásica sobre la lectura).
3. El texto de la publicación agradece al lector por tomarse el tiempo de leer y aprender, y
   añade una cita (Cervantes, Cicerón, Descartes, Dickinson…).
4. Si Facebook falla, la publicación no se pierde: queda en «adm» → **Publicaciones** para
   publicarla desde ahí (o a mano: descargar tarjeta + copiar texto).

Límites: solo con el código del grupo y 5 publicaciones por hora por persona.

| Pieza | Dónde |
|---|---|
| Publicar (lector) | `functions/api/compartir.ts` |
| Cola y panel «adm» | `functions/api/compartir-admin.ts`, `src/components/AdminFanPagePanel.tsx` |
| Tarjeta | `src/utils/bookShareCard.ts` (lo importante dentro del cuadrado central, que Facebook no recorta) |
| Texto y citas | `src/utils/fanPage.ts` |

## Conexión con Facebook

Secretos de Cloudflare Pages (ya configurados):

- `FB_PAGE_ID` = id de la página Leer es Pensar.
- `FB_PAGE_TOKEN` = llave de la página (permiso `pages_manage_posts`, no caduca).
- `FB_GRAPH_VERSION` = versión de la API (`v27.0`).

### Renovar la llave (si Facebook la invalida, p. ej. al cambiar la contraseña)

1. [Explorador de la API Graph](https://developers.facebook.com/tools/explorer/) → app **Apuntes de Frank**
   → **Generate Access Token** → marcar la página **Leer es Pensar** → copiar el token.
2. [Depurador de tokens](https://developers.facebook.com/tools/debug/accesstoken/) → pegar → **Depurar**
   → **Ampliar token de acceso** → copiar el token nuevo (el de abajo).
3. `node scripts/fanpage/conectar-token.mjs` → pegarlo cuando lo pida (no se ve). Debe decir
   `caduca: nunca · publicar: sí`. Luego volver a desplegar.

## Opcional: resúmenes con IA en «adm»

`GEMINI_API_KEY` (gratis en Google AI Studio) y `GEMINI_MODEL` (por defecto `gemini-2.5-flash`).
Sin ellos, el botón "Sugerir con IA" no aparece.
