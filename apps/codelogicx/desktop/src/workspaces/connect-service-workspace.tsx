import { Cable, CheckCircle2, Cloud, Link2, LogOut, RefreshCw, ShieldCheck } from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import { desktopCloudApi } from "../cloud/cloud-api";
import type { CloudSession } from "../cloud/cloud-types";
import "./connect-service-workspace.css";

export function ConnectServiceWorkspace() {
  const [connected, setConnected] = useState(() => desktopCloudApi.hasSession());
  const [session, setSession] = useState<CloudSession>();
  const [mode, setMode] = useState<"code" | "url">("code");
  const [endpoint, setEndpoint] = useState("https://cx.codexsun.com");
  const [code, setCode] = useState("");
  const [bridgeUrl, setBridgeUrl] = useState("");
  const [pending, setPending] = useState(false);
  const [error, setError] = useState("");

  const verify = useCallback(async () => {
    if (!desktopCloudApi.hasSession()) return;
    setPending(true);
    setError("");
    try {
      setSession(await desktopCloudApi.session());
      setConnected(true);
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "The cloud bridge is unavailable.");
    } finally {
      setPending(false);
    }
  }, []);

  useEffect(() => {
    void verify();
  }, [verify]);

  async function connect() {
    setPending(true);
    setError("");
    try {
      if (mode === "code") await desktopCloudApi.connectWithCode(endpoint, code);
      else await desktopCloudApi.connectWithUrl(bridgeUrl);
      setSession(await desktopCloudApi.session());
      setConnected(true);
      setCode("");
      setBridgeUrl("");
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Could not connect this desktop.");
    } finally {
      setPending(false);
    }
  }

  function disconnect() {
    desktopCloudApi.disconnect();
    setConnected(false);
    setSession(undefined);
    setError("");
  }

  return (
    <main className="connect-service-workspace">
      <header>
        <span className="connect-service-icon">
          <Cable size={20} />
        </span>
        <div>
          <p>Services</p>
          <h1>Connect Service</h1>
          <span>Connect this CodeLogicX Desktop IDE to the cloud workspace.</span>
        </div>
      </header>

      {connected ? (
        <section className="connect-service-card connected">
          <div className="connect-service-card-title">
            <span>
              <CheckCircle2 size={18} />
            </span>
            <div>
              <h2>Bridge connected</h2>
              <p>Desktop client</p>
            </div>
          </div>
          <dl className="connect-service-details">
            <div>
              <dt>Account</dt>
              <dd>{session?.name || session?.email || "Verifying…"}</dd>
            </div>
            <div>
              <dt>Email</dt>
              <dd>{session?.email || "—"}</dd>
            </div>
            <div>
              <dt>Server</dt>
              <dd>{desktopCloudApi.endpoint()}</dd>
            </div>
            <div>
              <dt>Security</dt>
              <dd>
                <ShieldCheck size={15} /> Authenticated token
              </dd>
            </div>
          </dl>
          {error ? <p className="connect-service-error">{error}</p> : null}
          <div className="connect-service-actions">
            <button disabled={pending} onClick={() => void verify()} type="button">
              <RefreshCw className={pending ? "spin" : ""} size={16} /> Verify bridge
            </button>
            <button className="danger" onClick={disconnect} type="button">
              <LogOut size={16} /> Disconnect
            </button>
          </div>
        </section>
      ) : (
        <section className="connect-service-card">
          <div className="connect-service-card-title">
            <span>
              <Cloud size={18} />
            </span>
            <div>
              <h2>Desktop client bridge</h2>
              <p>Use the one-time connection details shown by the web application.</p>
            </div>
          </div>
          <div className="connect-service-modes" role="tablist">
            <button
              aria-selected={mode === "code"}
              onClick={() => setMode("code")}
              role="tab"
              type="button"
            >
              One-time code
            </button>
            <button
              aria-selected={mode === "url"}
              onClick={() => setMode("url")}
              role="tab"
              type="button"
            >
              Bridge URL
            </button>
          </div>
          {mode === "code" ? (
            <div className="connect-service-fields">
              <label>
                Cloud server URL
                <input value={endpoint} onChange={(event) => setEndpoint(event.target.value)} />
              </label>
              <label>
                One-time code
                <input
                  autoFocus
                  inputMode="numeric"
                  maxLength={6}
                  placeholder="000000"
                  value={code}
                  onChange={(event) => setCode(event.target.value.replace(/\D/gu, ""))}
                />
              </label>
            </div>
          ) : (
            <div className="connect-service-fields">
              <label>
                Bridge URL
                <textarea
                  autoFocus
                  placeholder="Paste the bridge URL from the web app"
                  rows={4}
                  value={bridgeUrl}
                  onChange={(event) => setBridgeUrl(event.target.value)}
                />
              </label>
            </div>
          )}
          <p className="connect-service-note">
            <Link2 size={15} /> The ticket expires after one minute and works once.
          </p>
          {error ? <p className="connect-service-error">{error}</p> : null}
          <button
            className="connect-service-primary"
            disabled={
              pending ||
              (mode === "code" ? code.length !== 6 || !endpoint.trim() : !bridgeUrl.trim())
            }
            onClick={() => void connect()}
            type="button"
          >
            {pending ? <RefreshCw className="spin" size={16} /> : <Cable size={16} />}
            {pending ? "Connecting…" : "Connect desktop"}
          </button>
        </section>
      )}
    </main>
  );
}
