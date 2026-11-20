import { hasValidSession, jsonResponse } from "../_lib/auth";

export const onRequestGet = async (context) => {
  const ok = await hasValidSession(context.request, context.env);
  if (!ok) {
    return jsonResponse({ ok: false }, 401);
  }
  return jsonResponse({ ok: true });
};
