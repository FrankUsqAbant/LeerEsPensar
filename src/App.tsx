/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useCallback, useState } from "react";
import { AccessGate } from "./components/AccessGate";
import { AuthorRainPreloader } from "./components/AuthorRainPreloader";
import { ErrorBoundary } from "./components/ErrorBoundary";
import { Phase1FoundationView } from "./components/Phase1FoundationView";

function shouldSkipPreloaderInitially(): boolean {
  if (typeof window === "undefined") return false;
  const params = new URLSearchParams(window.location.search);
  return params.get("autostart") === "1";
}

export default function App() {
  const [showPreloader, setShowPreloader] = useState<boolean>(() => !shouldSkipPreloaderInitially());
  const [paperTextureUrl, setPaperTextureUrl] = useState<string | null>(null);

  const handlePreloaderComplete = useCallback((assets: { paperTextureUrl: string | null }) => {
    if (assets.paperTextureUrl) {
      setPaperTextureUrl(assets.paperTextureUrl);
    }
    setShowPreloader(false);
  }, []);

  const handleReplayPreloader = useCallback(() => {
    if (typeof window !== "undefined") {
      window.scrollTo({ top: 0, behavior: "instant" });
    }
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
          <AuthorRainPreloader
            visible={showPreloader}
            onComplete={handlePreloaderComplete}
          />
          <Phase1FoundationView onReplayPreloader={handleReplayPreloader} />
        </div>
      </AccessGate>
    </ErrorBoundary>
  );
}
