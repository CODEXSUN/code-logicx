import { registerPlugin } from "@capacitor/core";
import { mobileApi } from "./mobile-api";

export type UpdateManifest = {
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

export async function checkForUpdate() {
  if (checking) return null;
  checking = true;
  try {
    const manifest = await mobileApi.getMobileRelease();
    return validManifest(manifest) && compareVersions(manifest.version, __APP_VERSION__) > 0
      ? manifest
      : null;
  } finally {
    checking = false;
  }
}

export function installUpdate(manifest: UpdateManifest) {
  if (!validManifest(manifest)) throw new Error("The mobile release details are invalid.");
  return updater.install({ sha256: manifest.sha256, url: manifest.apkUrl });
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
