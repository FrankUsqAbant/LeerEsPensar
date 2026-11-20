/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useCallback, useEffect, useState } from "react";
import { AccessGate } from "./components/AccessGate";
import { LampPreloader } from "./components/LampPreloader";
import { ErrorBoundary } from "./components/ErrorBoundary";
import { Phase1FoundationView } from "./components/Phase1FoundationView";

const INTRO_SEEN_KEY = "lep:intro-seen";

/** La lluvia completa solo se ve la primera vez; luego, versión corta. */
function hasSeenIntro(): boolean {
  try {
    return window.localStorage.getItem(INTRO_SEEN_KEY) === "1";
  } catch {
    return false;
  }
}

function markIntroSeen(): void {
  try {
    window.localStorage.setItem(INTRO_SEEN_KEY, "1");
  } catch {
    // Sin almacenamiento (modo privado): se verá completa otra vez, sin romper nada.
  }
}

function shouldSkipPreloaderInitially(): boolean {
  if (typeof window === "undefined") return false;
  const params = new URLSearchParams(window.location.search);
  return params.get("autostart") === "1";
}

export default function App() {
  const [showPreloader, setShowPreloader] = useState<boolean>(() => !shouldSkipPreloaderInitially());
  const [paperTextureUrl, setPaperTextureUrl] = useState<string | null>(null);
  useEffect(() => {
    if (!showPreloader) document.documentElement.style.backgroundColor = "";
  }, [showPreloader]);
  const [fullIntro, setFullIntro] = useState<boolean>(() => typeof window === "undefined" || !hasSeenIntro());

  const handlePreloaderComplete = useCallback((assets: { paperTextureUrl: string | null }) => {
    if (assets.paperTextureUrl) {
      setPaperTextureUrl(assets.paperTextureUrl);
    }
    markIntroSeen();
    // La penumbra inicial del <html> (evita el fogonazo blanco) ya no hace falta.
    document.documentElement.style.backgroundColor = "";
    setShowPreloader(false);
  }, []);

  const handleReplayPreloader = useCallback(() => {
    if (typeof window !== "undefined") {
      window.scrollTo({ top: 0, behavior: "instant" });
    }
    // Repetir a pedido muestra la lluvia completa.
    setFullIntro(true);
    setShowPreloader(true);
  }, []);

  return (
    <ErrorBoundary>
      <AccessGate>
        <div
          data-state={showPreloader ? "preloading" : "ready"}
          style={
            paperTextureUrl
              ? { backgroundImage: `url(${paperTextureUrl})`, backgroundRepeat: "repeat" }
              : undefined
          }
        >
          <LampPreloader
            visible={showPreloader}
            fullIntro={fullIntro}
            onComplete={handlePreloaderComplete}
          />
          <Phase1FoundationView onReplayPreloader={handleReplayPreloader} />
        </div>
      </AccessGate>
    </ErrorBoundary>
  );
}
