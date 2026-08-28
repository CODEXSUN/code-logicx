import { CableIcon, CheckIcon, CopyIcon, RefreshCwIcon, ServerIcon } from "lucide-react";
import { QRCodeSVG } from "qrcode.react";
import { useCallback, useEffect, useState } from "react";
import { createServicePairing, type ServicePairing } from "./connect-service.services";

export function ConnectServiceWorkspace() {
  const [pairing, setPairing] = useState<ServicePairing>();
  const [error, setError] = useState("");
  const [pending, setPending] = useState(true);
  const [copied, setCopied] = useState<"code" | "url">();

  const refresh = useCallback(async () => {
    setPending(true);
    try {
      setPairing(await createServicePairing());
      setError("");
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Could not create a service bridge.");
    } finally {
      setPending(false);
    }
  }, []);

  useEffect(() => {
    void refresh();
    const interval = window.setInterval(() => void refresh(), 45_000);
    return () => window.clearInterval(interval);
  }, [refresh]);

  async function copy(kind: "code" | "url", value: string) {
    await navigator.clipboard.writeText(value);
    setCopied(kind);
    window.setTimeout(() => setCopied(undefined), 1600);
  }

  return (
    <main className="min-h-full bg-background px-6 py-8 md:px-10">
      <header className="flex max-w-3xl items-start gap-4 border-b pb-7">
        <span className="grid size-10 shrink-0 place-items-center rounded-md border text-muted-foreground">
          <CableIcon className="size-5" />
        </span>
        <div className="grid gap-2">
          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-muted-foreground">
            Services
          </p>
          <h1 className="text-2xl font-semibold tracking-tight">Connect Service</h1>
          <p className="text-sm leading-6 text-muted-foreground">
            Create a secure bridge between this cloud account and the CodeLogicX Desktop IDE.
          </p>
        </div>
      </header>

      <section className="mt-8 grid max-w-4xl gap-6 lg:grid-cols-[minmax(0,1fr)_280px]">
        <div className="rounded-lg border bg-card p-5">
          <div className="flex items-start justify-between gap-4">
            <div className="flex gap-3">
              <span className="grid size-9 place-items-center rounded-md bg-muted text-muted-foreground">
                <ServerIcon className="size-4" />
              </span>
              <div>
                <h2 className="font-semibold">Cloud server bridge</h2>
                <p className="pt-1 text-sm text-muted-foreground">
                  Signed in · waiting for a desktop client
                </p>
              </div>
            </div>
            <button
              aria-label="Create another connection code"
              className="grid size-9 place-items-center rounded-md border text-muted-foreground hover:bg-muted"
              disabled={pending}
              onClick={() => void refresh()}
              type="button"
            >
              <RefreshCwIcon className={`size-4 ${pending ? "animate-spin" : ""}`} />
            </button>
          </div>

          {error ? (
            <p className="mt-5 rounded-md border border-destructive/30 bg-destructive/5 p-3 text-sm text-destructive">
              {error}
            </p>
          ) : null}

          <div className="mt-6 grid gap-6 sm:grid-cols-[180px_minmax(0,1fr)]">
            <div className="grid size-[180px] place-items-center rounded-lg border bg-white p-3">
              {pairing ? (
                <QRCodeSVG className="size-full" level="M" value={pairing.payload} />
              ) : (
                <RefreshCwIcon className="size-6 animate-spin text-muted-foreground" />
              )}
            </div>
            <div className="grid content-start gap-4">
              <div>
                <span className="text-xs font-medium text-muted-foreground">One-time code</span>
                <strong className="block pt-1 text-3xl tracking-[0.28em]">
                  {pairing?.code ?? "------"}
                </strong>
              </div>
              <button
                className="flex h-10 items-center justify-center gap-2 rounded-md bg-primary px-4 text-sm font-medium text-primary-foreground disabled:opacity-50"
                disabled={!pairing}
                onClick={() => pairing && void copy("code", pairing.code)}
                type="button"
              >
                {copied === "code" ? (
                  <CheckIcon className="size-4" />
                ) : (
                  <CopyIcon className="size-4" />
                )}
                {copied === "code" ? "Code copied" : "Copy code"}
              </button>
              <button
                className="flex h-10 items-center justify-center gap-2 rounded-md border px-4 text-sm font-medium hover:bg-muted disabled:opacity-50"
                disabled={!pairing}
                onClick={() => pairing && void copy("url", pairing.pairingUrl)}
                type="button"
              >
                {copied === "url" ? (
                  <CheckIcon className="size-4" />
                ) : (
                  <CopyIcon className="size-4" />
                )}
                {copied === "url" ? "Bridge URL copied" : "Copy bridge URL"}
              </button>
              <p className="text-xs leading-5 text-muted-foreground">
                {pairing
                  ? `Expires ${new Date(pairing.expiresAt).toLocaleTimeString()}. It refreshes automatically and can be used once.`
                  : "Creating a short-lived connection ticket…"}
              </p>
            </div>
          </div>
        </div>

        <aside className="rounded-lg border p-5">
          <h2 className="font-semibold">Desktop client</h2>
          <ol className="mt-4 grid gap-4 text-sm leading-6 text-muted-foreground">
            <li>
              <strong className="text-foreground">1.</strong> Open Connect Service in the Desktop
              IDE.
            </li>
            <li>
              <strong className="text-foreground">2.</strong> Enter this code or paste the bridge
              URL.
            </li>
            <li>
              <strong className="text-foreground">3.</strong> Confirm the connected account shown by
              Desktop.
            </li>
          </ol>
          <p className="mt-5 border-t pt-4 text-xs leading-5 text-muted-foreground">
            The bridge transfers a short-lived account token. Repository paths, local credentials,
            and agent secrets remain on the desktop device.
          </p>
        </aside>
      </section>
    </main>
  );
}
