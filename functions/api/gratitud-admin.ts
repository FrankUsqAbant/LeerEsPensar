import { formatGratitudeName } from "../../src/utils/gratitud";
import type { SessionEnv } from "../_lib/auth";
import { jsonResponse } from "../_lib/auth";
import { readJson, verifyAdmin } from "../_lib/admin";
import { readWall, writeWall } from "../_lib/gratitud";

interface AdminBody {
  codigo?: unknown;
  accion?: unknown;
  nombre?: unknown;
  apellido?: unknown;
  id?: unknown;
}

const texto = (v: unknown, max: number) => (typeof v === "string" ? v.slice(0, max) : "");

/** Muro de gratitud (solo Frank): verificar el código, registrar un donante o quitarlo. */
export const onRequestPost: PagesFunction<SessionEnv> = async (context) => {
  const { request, env } = context;
  const body = await readJson<AdminBody>(request);
  if (!body) return jsonResponse({ ok: false, error: "Solicitud no válida." }, 400);
  const denegado = await verifyAdmin(request, env, body.codigo);
  if (denegado) return denegado;

  const accion = texto(body.accion, 20);
  const muro = await readWall(env);

  if (accion === "registrar") {
    const nombre = formatGratitudeName(texto(body.nombre, 60), texto(body.apellido, 60));
    if (!nombre) {
      return jsonResponse({ ok: false, error: "Escribe un nombre y un apellido válidos (solo letras)." }, 400);
    }
    const entrada = { id: crypto.randomUUID(), nombre, fecha: new Date().toISOString().slice(0, 10) };
    const nuevo = [entrada, ...muro];
    await writeWall(env, nuevo);
    return jsonResponse({ ok: true, registrado: entrada, muro: nuevo });
  }

  if (accion === "quitar") {
    const id = texto(body.id, 60);
    const nuevo = muro.filter((e) => e.id !== id);
    await writeWall(env, nuevo);
    return jsonResponse({ ok: true, muro: nuevo });
  }

  return jsonResponse({ ok: true, muro });
};
