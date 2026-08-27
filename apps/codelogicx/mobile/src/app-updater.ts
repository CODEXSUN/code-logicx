import { App as CapacitorApp } from "@capacitor/app";
import { registerPlugin } from "@capacitor/core";

type UpdateManifest = {
  apkUrl: string;
  applicationId: "com.codexsun.codelogicx";
  publishedAt: string;
  sha256: string;
  version: string;
  versionCode: number;
};

type AppUpdaterPlugin = {
  install(options: { sha256: string; url: string }): Promise<{ started: boolean }>;
};

const updater = registerPlugin<AppUpdaterPlugin>("AppUpdater");
let checking = false;

export function startUpdateMonitor() {
  const initialCheck = window.setTimeout(() => void checkForUpdate(), 2_500);
  const listener = CapacitorApp.addListener("appStateChange", ({ isActive }) => {
    if (isActive) void checkForUpdate();
  });
  return () => {
    window.clearTimeout(initialCheck);
    void listener.then((handle) => handle.remove());
  };
}

async function checkForUpdate() {
  if (checking) return;
  checking = true;
  try {
    const response = await fetch(updateManifestUrl(), { cache: "no-store" });
    if (!response.ok) return;
    const manifest = await response.json() as UpdateManifest;
    if (!validManifest(manifest) || compareVersions(manifest.version, __APP_VERSION__) <= 0) return;
    await updater.install({ sha256: manifest.sha256, url: manifest.apkUrl });
  } catch (error) {
    console.warn("CodeLogicX update check did not complete.", error);
  } finally {
    checking = false;
  }
}

function updateManifestUrl() {
  const endpoint = localStorage.getItem("codelogicx_mobile_endpoint") || import.meta.env.VITE_MOBILE_API_URL;
  return `${new URL(endpoint).origin}/mobile/codelogicx-update.json`;
}

function validManifest(value: UpdateManifest) {
  return value.applicationId === "com.codexsun.codelogicx"
    && /^https:\/\//u.test(value.apkUrl)
    && /^[a-f\d]{64}$/iu.test(value.sha256)
    && /^\d+\.\d+\.\d+$/u.test(value.version)
    && Number.isSafeInteger(value.versionCode);
}

function compareVersions(left: string, right: string) {
  const leftParts = left.split(".").map(Number);
  const rightParts = right.split(".").map(Number);
  for (let index = 0; index < 3; index += 1) {
    const difference = (leftParts[index] ?? 0) - (rightParts[index] ?? 0);
    if (difference) return difference;
  }
  return 0;
}
