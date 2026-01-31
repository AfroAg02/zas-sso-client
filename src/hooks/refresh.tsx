"use client";
import { useEffect, useState } from "react";
import { refreshTokens } from "../services/server-actions";
import { useAuth } from "./use-auth";
import { redirectToLogin } from "../lib/url";
import { getJWTClaims } from "../lib/decode";
import { getDebug } from "../init-config";

export default function Refresh({ children }: { children: React.ReactNode }) {
  const session = useAuth();
  const [error, setError] = useState<string | null>(null);
  const debug = getDebug();
  const [panelOpen, setPanelOpen] = useState<boolean>(false);
  const [nextRefreshAt, setNextRefreshAt] = useState<number | null>(null);
  const [countdown, setCountdown] = useState<number>(0);
  const [lastLog, setLastLog] = useState<{
    time: number;
    status: "success" | "error";
    message?: string;
  } | null>(null);
  const LOG_KEY = "sso_refresh_logs";

  function readLogs() {
    try {
      const raw =
        typeof window !== "undefined"
          ? window.localStorage.getItem(LOG_KEY)
          : null;
      return raw
        ? (JSON.parse(raw) as Array<{
            time: number;
            status: "success" | "error";
            message?: string;
          }>)
        : [];
    } catch {
      return [];
    }
  }

  function appendLog(entry: {
    time: number;
    status: "success" | "error";
    message?: string;
  }) {
    try {
      const logs = readLogs();
      const next = [...logs, entry];
      if (typeof window !== "undefined")
        window.localStorage.setItem(LOG_KEY, JSON.stringify(next));
      setLastLog(entry);
    } catch {}
  }
  useEffect(() => {
    setError(null); // reset error on session change
    if (!session?.tokens?.accessToken || !session?.tokens?.refreshToken) {
      console.warn("No tokens available, not redirecting due to config");
      return;
    }

    const { accessToken } = session.tokens;
    const tokenClaims = getJWTClaims(accessToken);

    if (!tokenClaims?.exp) {
      console.error("No exp in token claims");
      return;
    }

    const now = Math.floor(Date.now() / 1000);
    const refreshThreshold = 30; // segundos antes de que expire
    const expiresIn = tokenClaims.exp - now;
    const refreshInMs = Math.max((expiresIn - refreshThreshold) * 1000, 0);

    const nextAt = Date.now() + refreshInMs;
    setNextRefreshAt((prev) => (prev !== nextAt ? nextAt : prev));

    const timeoutId = setTimeout(async () => {
      await refreshTokens({
        onSuccess: () => {
          appendLog({ time: Date.now(), status: "success" });
        },
        onError: (err) => {
          const message =
            err instanceof Error
              ? err.message
              : typeof err === "string"
                ? err
                : "Unknown error";
          setError(message as string);
          appendLog({ time: Date.now(), status: "error", message });
          console.error("Error refreshing tokens:", err);
        },
      });
    }, refreshInMs);

    return () => clearTimeout(timeoutId); // limpiar cuando cambie el session
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [session?.tokens?.accessToken, session?.tokens?.refreshToken]);
  useEffect(() => {
    const logs = readLogs();
    if (logs.length > 0) setLastLog(logs[logs.length - 1]);
  }, []);
  useEffect(() => {
    if (!nextRefreshAt) {
      setCountdown(0);
      return;
    }
    const id = setInterval(() => {
      const remaining = Math.max(
        0,
        Math.ceil((nextRefreshAt - Date.now()) / 1000),
      );
      setCountdown(remaining);
    }, 1000);
    return () => clearInterval(id);
  }, [nextRefreshAt]);
  if (error) {
    console.error("Error refreshing session, redirecting to login");
    redirectToLogin({ preservePath: true });
  }
  const claims = session?.tokens?.accessToken
    ? getJWTClaims(session.tokens.accessToken)
    : null;
  const tokenExpSeconds = claims?.exp
    ? Math.max(0, claims.exp - Math.floor(Date.now() / 1000))
    : null;
  return (
    <>
      {children}
      {debug && !panelOpen && (
        <button
          type="button"
          onClick={() => setPanelOpen(true)}
          aria-label="Open SSO Debug Panel"
          style={{
            position: "fixed",
            right: 16,
            bottom: 16,
            padding: "10px 12px",
            background: "#2563eb",
            color: "#ffffff",
            border: "none",
            borderRadius: 9999,
            boxShadow: "0 8px 24px rgba(0,0,0,0.12)",
            cursor: "pointer",
            fontSize: 12,
            fontWeight: 600,
            zIndex: 9999,
          }}
        >
          SSO Debug
        </button>
      )}
      {debug && panelOpen && (
        <div
          style={{
            position: "fixed",
            right: 16,
            bottom: 16,
            width: 360,
            maxHeight: 420,
            overflow: "auto",
            background: "#ffffff",
            border: "1px solid #e5e7eb",
            borderRadius: 8,
            boxShadow: "0 8px 24px rgba(0,0,0,0.12)",
            fontFamily:
              "ui-sans-serif, system-ui, -apple-system, Segoe UI, Roboto",
            fontSize: 12,
            color: "#111827",
            zIndex: 9999,
          }}
        >
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              padding: 8,
              borderBottom: "1px solid #f3f4f6",
              background: "#f9fafb",
            }}
          >
            <strong style={{ fontSize: 12 }}>SSO Debug Panel</strong>
            <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
              <span style={{ color: "#6b7280" }}>
                {new Date().toLocaleTimeString()}
              </span>
              <button
                type="button"
                aria-label="Close"
                onClick={() => setPanelOpen(false)}
                style={{
                  width: 24,
                  height: 24,
                  display: "inline-flex",
                  alignItems: "center",
                  justifyContent: "center",
                  borderRadius: 6,
                  border: "1px solid #e5e7eb",
                  background: "#ffffff",
                  color: "#374151",
                  cursor: "pointer",
                }}
              >
                ×
              </button>
            </div>
          </div>
          <div style={{ padding: 8 }}>
            <div style={{ marginBottom: 8 }}>
              <div>
                <strong>Next Refresh In:</strong> {countdown}s
              </div>
              <div>
                <strong>Token Expires In:</strong> {tokenExpSeconds ?? "N/A"}s
              </div>
              <div>
                <strong>Last Refresh:</strong>{" "}
                {lastLog
                  ? `${lastLog.status} at ${new Date(lastLog.time).toLocaleTimeString()}`
                  : "No logs"}
              </div>
              {lastLog?.status === "error" && (
                <div style={{ color: "#b91c1c" }}>
                  <strong>Error:</strong> {lastLog.message || "Unknown error"}
                </div>
              )}
            </div>
            <div style={{ borderTop: "1px solid #f3f4f6", paddingTop: 8 }}>
              <div style={{ marginBottom: 4 }}>
                <strong>Session</strong>
              </div>
              <pre
                style={{
                  background: "#f3f4f6",
                  padding: 8,
                  borderRadius: 6,
                  overflowX: "auto",
                }}
              >
                {JSON.stringify(session, null, 2)}
              </pre>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
