import { CheckCircle2Icon, CloudUploadIcon, RefreshCwIcon } from "lucide-react";
import { useEffect, useState } from "react";
import {
  desktopRelease,
  type DesktopReleaseManifest,
  publishDesktopRelease,
  uploadDesktopReleaseChunk
} from "./connect-service.services";

export function DesktopReleaseUploader() {
  const [current, setCurrent] = useState<DesktopReleaseManifest | null>();
  const [files, setFiles] = useState<FileList | null>(null);
  const [message, setMessage] = useState("");
  const [pending, setPending] = useState(false);

  useEffect(() => {
    void desktopRelease()
      .then(setCurrent)
      .catch(() => setCurrent(null));
  }, []);

  async function publish() {
    if (!files?.length) return;
    setPending(true);
    setMessage("");
    try {
      const selected = Array.from(files);
      const latest = selected.find((file) => file.name === "latest.json");
      if (!latest) throw new Error("Select latest.json with the signed MSI and .sig files.");
      const manifest = JSON.parse(await latest.text()) as DesktopReleaseManifest;
      const version = manifest.version;
      const required = [
        `CodeLogicX_${version}_x64_en-US.msi`,
        `CodeLogicX_${version}_x64_en-US.msi.sig`
      ];
      for (const name of required) {
        const file = selected.find((candidate) => candidate.name === name);
        if (!file) throw new Error(`Missing ${name}.`);
        await uploadFile(version, file, setMessage);
      }
      const setup = selected.find((file) => file.name === `CodeLogicX_Setup_${version}_x64.exe`);
      if (setup) {
        await uploadFile(version, setup, setMessage);
      }
      setMessage("Validating signature and publishing…");
      await publishDesktopRelease(manifest);
      setCurrent(manifest);
      setMessage(`Version ${version} is live.`);
    } catch (reason) {
      setMessage(reason instanceof Error ? reason.message : "Desktop release upload failed.");
    } finally {
      setPending(false);
    }
  }

  return (
    <section className="mt-8 max-w-4xl rounded-lg border bg-card p-5">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="flex gap-3">
          <span className="grid size-9 place-items-center rounded-md bg-muted text-muted-foreground">
            <CloudUploadIcon className="size-4" />
          </span>
          <div>
            <h2 className="font-semibold">Desktop update release</h2>
            <p className="pt-1 text-sm text-muted-foreground">
              Upload the generated signed updater bundle to CodeLogicX cloud storage.
            </p>
          </div>
        </div>
        <span className="rounded-full border px-3 py-1 text-xs text-muted-foreground">
          {current === undefined
            ? "Checking…"
            : current
              ? `Live · v${current.version}`
              : "No release"}
        </span>
      </div>
      <div className="mt-5 grid gap-3 sm:grid-cols-[minmax(0,1fr)_auto]">
        <label className="grid min-h-24 cursor-pointer place-items-center rounded-md border border-dashed p-4 text-center text-sm text-muted-foreground hover:bg-muted/40">
          <input
            accept=".json,.msi,.sig,.exe"
            className="sr-only"
            multiple
            onChange={(event) => setFiles(event.target.files)}
            type="file"
          />
          <span>
            {files?.length
              ? `${files.length} release files selected`
              : "Select latest.json, MSI, .sig, and optional Setup EXE"}
          </span>
        </label>
        <button
          className="flex h-10 items-center justify-center gap-2 self-end rounded-md bg-primary px-5 text-sm font-medium text-primary-foreground disabled:opacity-50"
          disabled={!files?.length || pending}
          onClick={() => void publish()}
          type="button"
        >
          {pending ? (
            <RefreshCwIcon className="size-4 animate-spin" />
          ) : (
            <CloudUploadIcon className="size-4" />
          )}
          Publish update
        </button>
      </div>
      {message ? (
        <p className="mt-4 flex items-center gap-2 text-sm text-muted-foreground">
          {!pending && message.includes("is live") ? (
            <CheckCircle2Icon className="size-4 text-emerald-600" />
          ) : null}
          {message}
        </p>
      ) : null}
      <p className="mt-4 border-t pt-4 text-xs leading-5 text-muted-foreground">
        Administrator permission is required. latest.json becomes public only after the MSI and its
        Tauri signature match. Desktop still asks the user before installation.
      </p>
    </section>
  );
}

async function uploadFile(version: string, file: File, report: (message: string) => void) {
  const chunkSize = 8 * 1024 * 1024;
  for (let offset = 0; offset < file.size; offset += chunkSize) {
    const percent = Math.min(100, Math.round(((offset + chunkSize) / file.size) * 100));
    report(`Uploading ${file.name} · ${percent}%`);
    await uploadDesktopReleaseChunk(
      version,
      file,
      file.slice(offset, Math.min(file.size, offset + chunkSize)),
      offset
    );
  }
}
