import {
  accessCodesMatch,
  createSessionToken,
  jsonResponse,
  sessionCookieHeader,
} from "../_lib/auth";

export const onRequestPost = async (context) => {
  const { request, env } = context;
  const accessCode = env.ACCESS_CODE;
  const sessionSecret = env.SESSION_SECRET;

  if (!accessCode || !sessionSecret) {
    return jsonResponse({ ok: false, error: "El acceso no está configurado." }, 500);
  }

  let provided = "";
  try {
    const body = await request.json();
    if (body && typeof body.code === "string") {
      provided = body.code.trim();
    }
  } catch {
    return jsonResponse({ ok: false, error: "La solicitud no es válida." }, 400);
  }

  if (!provided) {
    return jsonResponse({ ok: false, error: "Escribe el código de acceso." }, 400);
  }

  const matches = await accessCodesMatch(sessionSecret, provided, accessCode);
  if (!matches) {
    return jsonResponse({ ok: false, error: "El código no es válido." }, 401);
  }

  const token = await createSessionToken(sessionSecret);
  const secure = new URL(request.url).protocol === "https:";
  return jsonResponse(
    { ok: true },
    200,
    { "Set-Cookie": sessionCookieHeader(token, secure) },
  );
};
