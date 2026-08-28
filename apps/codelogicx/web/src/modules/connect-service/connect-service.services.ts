import {
  apiPlatformGet,
  apiPlatformPost,
  apiPlatformUpload
} from "../../shared/api/codelogicx-api";

export type ServicePairing = {
  code: string;
  expiresAt: string;
  pairingUrl: string;
  payload: string;
};

export const createServicePairing = () => apiPlatformPost<ServicePairing>("/auth/service-pairing");

export type DesktopReleaseManifest = {
  notes?: string;
  platforms: { "windows-x86_64": { signature: string; url: string } };
  pub_date: string;
  version: string;
};

export const desktopRelease = () =>
  apiPlatformGet<DesktopReleaseManifest | null>("/auth/desktop-releases");
export const uploadDesktopReleaseChunk = (
  version: string,
  file: File,
  chunk: Blob,
  offset: number
) =>
  apiPlatformUpload<{ bytes: number; file: string }>(
    `/auth/desktop-releases/${encodeURIComponent(version)}/${encodeURIComponent(file.name)}`,
    chunk,
    { "X-Upload-Offset": String(offset) }
  );
export const publishDesktopRelease = (manifest: DesktopReleaseManifest) =>
  apiPlatformPost<{ published: true; version: string }>("/auth/desktop-releases/publish", manifest);
