import { useEffect, useState } from "react";
import QRCode from "qrcode";
import {
  CopyIcon,
  DatabaseZapIcon,
  QrCodeIcon,
  ShieldAlertIcon,
  SmartphoneIcon
} from "lucide-react";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger
} from "@codelogicx/ui/components/alert-dialog";
import { Button } from "@codelogicx/ui/components/button";
import { createMobilePairing, logout } from "../../shared/api/platform-api";

export function ApplicationSettingsWorkspace({
  page = "clear-cache"
}: {
  page?: "clear-cache" | "mobile-connect";
}) {
  if (page === "mobile-connect") return <MobileConnectWorkspace />;
  return <ClearCacheWorkspace />;
}

function ClearCacheWorkspace() {
  const [clearing, setClearing] = useState(false);

  const clearData = async () => {
    setClearing(true);
    await logout();
    await Promise.allSettled([
      clearCacheStorage(),
      clearIndexedDatabases(),
      unregisterServiceWorkers()
    ]);
    clearCookies();
    window.localStorage.clear();
    window.sessionStorage.clear();
    window.location.replace("/login");
  };

  return (
    <main className="mx-auto w-[calc(100%-2rem)] max-w-5xl py-6 lg:w-[calc(100%-3rem)] lg:py-10">
      <header className="max-w-2xl">
        <h1 className="text-2xl font-semibold tracking-tight">Clear cache</h1>
        <p className="pt-2 text-sm leading-6 text-muted-foreground">
          Manage browser data created by CodeLogicX on this device.
        </p>
      </header>

      <section className="flex max-w-3xl items-start justify-between gap-8 border-t py-6 mt-8">
        <div className="flex min-w-0 gap-3">
          <div className="flex size-9 shrink-0 items-center justify-center rounded-md bg-muted text-muted-foreground">
            <DatabaseZapIcon className="size-4" />
          </div>
          <div>
            <h2 className="font-semibold">Clear application data</h2>
            <p className="max-w-xl pt-1 text-sm leading-6 text-muted-foreground">
              Clear CodeLogicX caches, local and session storage, IndexedDB databases, service
              workers, and accessible cookies. You will be signed out after cleanup.
            </p>
          </div>
        </div>

        <AlertDialog>
          <AlertDialogTrigger asChild>
            <Button className="shrink-0" variant="outline">
              Clear data
            </Button>
          </AlertDialogTrigger>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle className="flex items-center gap-2">
                <ShieldAlertIcon className="size-5 text-destructive" />
                Clear CodeLogicX data from this browser?
              </AlertDialogTitle>
              <AlertDialogDescription>
                This removes locally stored preferences, cached responses, offline data, and the
                current session. Server records and project files are not deleted.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel disabled={clearing}>Cancel</AlertDialogCancel>
              <AlertDialogAction disabled={clearing} onClick={() => void clearData()}>
                {clearing ? "Clearing..." : "Clear data and sign out"}
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </section>
    </main>
  );
}

function MobileConnectWorkspace() {
  const [pairing, setPairing] = useState<{
    code: string;
    expiresAt: string;
    image: string;
    pairingUrl: string;
  } | null>(null);
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState("");
  useEffect(() => {
    let active = true;
    const refresh = async () => {
      try {
        const ticket = await createMobilePairing();
        const image = await QRCode.toDataURL(ticket.payload, {
          errorCorrectionLevel: "M",
          margin: 2,
          width: 360
        });
        if (active) {
          setPairing({
            code: ticket.code,
            expiresAt: ticket.expiresAt,
            image,
            pairingUrl: ticket.pairingUrl
          });
          setError("");
        }
      } catch (reason) {
        if (active)
          setError(reason instanceof Error ? reason.message : "Could not create pairing code.");
      }
    };
    void refresh();
    const interval = window.setInterval(() => void refresh(), 45_000);
    return () => {
      active = false;
      window.clearInterval(interval);
    };
  }, []);
  return (
    <main className="mx-auto w-[calc(100%-2rem)] max-w-5xl py-6 lg:w-[calc(100%-3rem)] lg:py-10">
      <header className="max-w-2xl">
        <h1 className="text-2xl font-semibold tracking-tight">Mobile Connect</h1>
        <p className="pt-2 text-sm leading-6 text-muted-foreground">
          Pair the CodeLogicX mobile application with this signed-in account.
        </p>
      </header>
      <section className="mt-8 flex max-w-3xl items-start gap-4 border-t py-6">
        <div className="flex size-10 shrink-0 items-center justify-center rounded-md bg-muted text-muted-foreground">
          <SmartphoneIcon className="size-5" />
        </div>
        <div className="min-w-0">
          <h2 className="font-semibold">Secure device pairing</h2>
          <p className="max-w-xl pt-1 text-sm leading-6 text-muted-foreground">
            A short-lived, one-time QR code will appear here. Connection details remain inside the
            code and the mobile device must confirm its identity after scanning.
          </p>
          <div className="mt-6 flex size-64 items-center justify-center rounded-xl border bg-white p-3 text-muted-foreground">
            {pairing ? (
              <img
                alt="Scan to connect this CodeLogicX account"
                className="size-full"
                src={pairing.image}
              />
            ) : (
              <div className="grid justify-items-center gap-3 text-center">
                <QrCodeIcon className="size-12" />
                <span className="max-w-44 text-xs leading-5">
                  {error || "Creating secure pairing code..."}
                </span>
              </div>
            )}
          </div>
          <p className="max-w-64 pt-3 text-center text-xs leading-5 text-muted-foreground">
            {pairing
              ? `Refreshes automatically · expires ${new Date(pairing.expiresAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", second: "2-digit" })}`
              : "Keep this page open while connecting."}
          </p>
          {pairing ? (
            <div className="mt-5 grid max-w-64 gap-3 border-t pt-5">
              <div className="text-center">
                <span className="text-xs text-muted-foreground">Desktop one-time code</span>
                <strong className="block pt-1 text-2xl tracking-[0.28em]">{pairing.code}</strong>
              </div>
              <Button
                variant="outline"
                onClick={() => {
                  void navigator.clipboard.writeText(pairing.pairingUrl);
                  setCopied(true);
                  window.setTimeout(() => setCopied(false), 1600);
                }}
              >
                <CopyIcon />
                {copied ? "Copied sync URL" : "Copy desktop sync URL"}
              </Button>
            </div>
          ) : null}
        </div>
      </section>
    </main>
  );
}

async function clearCacheStorage() {
  if (!("caches" in window)) return;
  const keys = await window.caches.keys();
  await Promise.all(keys.map((key) => window.caches.delete(key)));
}

async function unregisterServiceWorkers() {
  if (!("serviceWorker" in navigator)) return;
  const registrations = await navigator.serviceWorker.getRegistrations();
  await Promise.all(registrations.map((registration) => registration.unregister()));
}

async function clearIndexedDatabases() {
  if (!("indexedDB" in window) || typeof window.indexedDB.databases !== "function") return;
  const databases = await window.indexedDB.databases();
  await Promise.all(
    databases
      .map((database) => database.name)
      .filter((name): name is string => Boolean(name))
      .map(deleteIndexedDatabase)
  );
}

function deleteIndexedDatabase(name: string) {
  return new Promise<void>((resolve) => {
    const request = window.indexedDB.deleteDatabase(name);
    request.onerror = () => resolve();
    request.onblocked = () => resolve();
    request.onsuccess = () => resolve();
  });
}

function clearCookies() {
  const paths = cookiePaths();
  for (const cookie of document.cookie.split(";")) {
    const name = cookie.split("=")[0]?.trim();
    if (!name) continue;
    for (const path of paths) {
      document.cookie = `${name}=; Max-Age=0; path=${path}; SameSite=Lax`;
    }
  }
}

function cookiePaths() {
  const parts = window.location.pathname.split("/").filter(Boolean);
  return ["/", ...parts.map((_, index) => `/${parts.slice(0, index + 1).join("/")}`)];
}
