"use client";

import { useSyncExternalStore, useCallback } from "react";
import { Button } from "@/components/ui/button";

function getConsentSnapshot() {
  return localStorage.getItem("analytics_consent");
}

function getConsentServerSnapshot() {
  return "pending" as string | null;
}

function subscribeToConsent(callback: () => void) {
  window.addEventListener("storage", callback);
  return () => window.removeEventListener("storage", callback);
}

export function CookieBanner() {
  const consent = useSyncExternalStore(
    subscribeToConsent,
    getConsentSnapshot,
    getConsentServerSnapshot
  );

  const accept = useCallback(() => {
    localStorage.setItem("analytics_consent", "true");
    window.dispatchEvent(new Event("storage"));
  }, []);

  const refuse = useCallback(() => {
    localStorage.setItem("analytics_consent", "false");
    window.dispatchEvent(new Event("storage"));
  }, []);

  if (consent !== null) return null;

  return (
    <div
      className="fixed inset-x-0 bottom-0 z-50 border-t border-warm-border bg-background/95 px-5 py-3 backdrop-blur-sm sm:px-8"
      role="banner"
      aria-label="Consentement aux cookies"
    >
      <div className="mx-auto flex max-w-5xl flex-col items-center gap-3 sm:flex-row sm:justify-between">
        <p className="text-sm text-muted-text">
          Ce site utilise uniquement des cookies analytiques anonymes.
        </p>
        <div className="flex gap-2">
          <Button size="sm" variant="outline" onClick={refuse} className="h-8 rounded-lg text-sm">
            Refuser
          </Button>
          <Button size="sm" onClick={accept} className="h-8 rounded-lg bg-blue text-sm text-white hover:bg-blue-dark">
            Accepter
          </Button>
        </div>
      </div>
    </div>
  );
}
