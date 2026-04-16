"use client";

import { Analytics as VercelAnalytics } from "@vercel/analytics/react";
import { useSyncExternalStore } from "react";

function getConsentSnapshot() {
  return localStorage.getItem("analytics_consent") === "true";
}

function getConsentServerSnapshot() {
  return false;
}

function subscribeToConsent(callback: () => void) {
  window.addEventListener("storage", callback);
  return () => window.removeEventListener("storage", callback);
}

export function Analytics() {
  const enabled = useSyncExternalStore(
    subscribeToConsent,
    getConsentSnapshot,
    getConsentServerSnapshot
  );

  if (!enabled) return null;

  return <VercelAnalytics />;
}
