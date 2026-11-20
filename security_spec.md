# Especificación de Seguridad Firestore — Folio.

## 1. Invariantes de Datos
1. **Aislamiento de PII (`users_private`)**: Solo el usuario autenticado con `request.auth.uid == userId` puede leer o crear su propio documento privado con correo electrónico. Ningún lector puede listar `users_private`.
2. **Propiedad de Progreso (`reading_progress`)**: Cada documento en `reading_progress/{progressId}` pertenece estrictamente a `userId == request.auth.uid`. Las consultas `list` requieren `resource.data.userId == request.auth.uid`.
3. **Integridad de Reseñas (`reviews`)**: Toda reseña exige usuario autenticado con `email_verified == true`, `authorId == request.auth.uid`, contenido entre 10 y 1200 caracteres, calificación entera `[1..5]`, arreglo acotado de máximo 3 etiquetas editoriales y `createdAt == request.time`.
4. **Reportes de PDFs Dañados (`security_reports`)**: Solo un usuario verificado puede registrar un reporte con `reporterId == request.auth.uid`, nombre de archivo acotado (`<= 180`), código de error (`<= 64`) y sello `createdAt == request.time`. Los reportes no son editables ni legibles por terceros.
5. **Validación de Identificadores**: Todo `{id}` de documento en operaciones puntuales pasa por `isValidId(id)` (`^[a-zA-Z0-9_\-]+$`, longitud `<= 128`).

## 2. Payloads Adversarios ("Dirty Dozen")
1. **Shadow Update en `reviews`**: `{ bookId, authorId, authorName, content, rating, reactionTags, createdAt, isFeatured: true }` -> `PERMISSION_DENIED` (rechazado por `hasOnly`).
2. **Suplantación de `authorId`**: `{ ..., authorId: "victim_uid" }` -> `PERMISSION_DENIED`.
3. **Timestamp manipulado**: `{ ..., createdAt: "2020-01-01T00:00:00Z" }` -> `PERMISSION_DENIED` (`createdAt == request.time`).
4. **Inyección de ID largo (> 128 chars)** en `/reviews/{id}` -> `PERMISSION_DENIED` (`isValidId`).
5. **Lectura cruzada de PII** en `/users_private/{otherUid}` -> `PERMISSION_DENIED`.
6. **Listado masivo de PII** en `/users_private` -> `PERMISSION_DENIED`.
7. **Listado sin filtro de usuario** en `/reading_progress` -> `PERMISSION_DENIED` (`resource.data.userId == request.auth.uid`).
8. **Escritura en catálogo `books`** desde cliente -> `PERMISSION_DENIED` (solo lectura pública).
9. **Reseña vacía o spam gigante (> 1200 chars)** -> `PERMISSION_DENIED`.
10. **Array ilimitado de etiquetas (> 3 elementos)** -> `PERMISSION_DENIED`.
11. **Calificación fuera de rango (`rating: 99`)** -> `PERMISSION_DENIED`.
12. **Usuario con `email_verified: false`** intentando crear reseña o reporte -> `PERMISSION_DENIED`.
