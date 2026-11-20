import { FormEvent, ReactNode, useEffect, useState } from "react";
import { BRAND_CONFIG } from "../config/brand";

type GateStatus = "checking" | "gated" | "open";

async function hasOpenSession(): Promise<boolean> {
  try {
    const response = await fetch("/api/session", { credentials: "same-origin" });
    if (response.ok) return true;
    if (response.status === 404 && import.meta.env.DEV) return true;
    return false;
  } catch {
    return import.meta.env.DEV;
  }
}

export function AccessGate({ children }: { children: ReactNode }) {
  const [status, setStatus] = useState<GateStatus>("checking");
  const [code, setCode] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    void hasOpenSession().then((ok) => setStatus(ok ? "open" : "gated"));
  }, []);

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setSubmitting(true);
    setError(null);
    try {
      const response = await fetch("/api/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "same-origin",
        body: JSON.stringify({ code: code.trim() }),
      });
      if (!response.ok) {
        let message = "No se pudo comprobar el código. Inténtalo de nuevo.";
        if (response.status === 401) message = "El código no es válido.";
        if (response.status === 429) {
          message = "Demasiados intentos. Espera unos minutos e inténtalo de nuevo.";
        }
        try {
          const payload = (await response.json()) as { error?: unknown };
          if (typeof payload?.error === "string" && payload.error.trim()) {
            message = payload.error.trim();
          }
        } catch {
          // keep fallback message
        }
        setError(message);
        return;
      }

      setStatus("open");
    } catch {
      setError("No se pudo comprobar el código. Inténtalo de nuevo.");
    } finally {
      setSubmitting(false);
    }
  };

  if (status === "open") {
    return children;
  }

  return (
    <div
      className={`min-h-screen flex items-center justify-center px-6 ${
        status === "checking" ? "bg-[#1C1A17]" : "bg-[#FAF7F2] text-[#1A1917]"
      }`}
    >
      <div className="w-full max-w-md">
        {status === "checking" ? (
          <p className="sr-only" aria-live="polite">
            Abriendo la biblioteca…
          </p>
        ) : (
          <form
            onSubmit={(event) => void handleSubmit(event)}
            className="bg-[#FAF8F5] border border-[#E6DFD3] rounded-2xl shadow-sm px-6 py-8 space-y-5"
          >
            <div className="space-y-2 text-center">
              <p className="font-serif text-3xl font-semibold tracking-tight">
                {BRAND_CONFIG.name}
              </p>
              <p className="text-sm text-[#6B665E] leading-relaxed">
                Esta biblioteca es privada. Escribe el código que compartimos en el grupo para entrar.
              </p>
            </div>

            <div className="space-y-1.5">
              <label htmlFor="access-code" className="block text-xs font-medium text-[#6B665E]">
                Código de acceso
              </label>
              <input
                id="access-code"
                type="password"
                name="code"
                autoComplete="current-password"
                required
                value={code}
                onChange={(event) => setCode(event.target.value)}
                className="w-full px-3.5 py-2.5 text-sm bg-[#F3EFE8] border border-[#E6DFD3] rounded-lg text-[#1A1917] focus:outline-none focus:ring-2 focus:ring-[#D97757]/40"
              />
            </div>

            {error && (
              <p role="alert" className="text-sm text-[#7A2E16]">
                {error}
              </p>
            )}

            <button
              type="submit"
              disabled={submitting || code.trim().length === 0}
              className="w-full px-4 py-2.5 text-sm font-medium text-[#FAF8F5] bg-[#1A1917] rounded-lg hover:bg-[#32302C] disabled:opacity-60 transition-colors"
            >
              {submitting ? "Comprobando…" : "Entrar"}
            </button>
          </form>
        )}
      </div>
    </div>
  );
}
