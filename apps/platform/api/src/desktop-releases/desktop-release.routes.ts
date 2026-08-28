import { createReadStream, createWriteStream } from "node:fs";
import { mkdir, readFile, rename, stat, writeFile } from "node:fs/promises";
import { join, resolve } from "node:path";
import { pipeline } from "node:stream/promises";
import type { Readable } from "node:stream";
import type { FastifyInstance, FastifyReply, FastifyRequest } from "fastify";
import { fail, ok } from "@codelogicx/framework/http";
import { z } from "zod";
import { env } from "../env.js";
import { verifyAuthToken } from "../auth/jwt.js";

const versionSchema = z.string().regex(/^\d+\.\d+\.\d+$/u);
const latestSchema = z
  .object({
    version: versionSchema,
    notes: z.string().optional(),
    pub_date: z.string().datetime(),
    platforms: z.object({
      "windows-x86_64": z.object({ signature: z.string().min(20), url: z.string().url() })
    })
  })
  .passthrough();

export async function registerDesktopReleaseRoutes(app: FastifyInstance) {
  app.addContentTypeParser(
    "application/octet-stream",
    { bodyLimit: 10 * 1024 * 1024 },
    (_request, payload, done) => done(null, payload)
  );

  app.get("/desktop/releases/latest.json", async (request, reply) => {
    try {
      const manifest = latestSchema.parse(JSON.parse(await readFile(latestPath(), "utf8")));
      return reply.header("Cache-Control", "no-store").type("application/json").send(manifest);
    } catch {
      return reply.code(404).send("Release not found.");
    }
  });

  app.get<{ Params: { file: string; version: string } }>(
    "/desktop/releases/:version/:file",
    async (request, reply) => {
      const releaseFile = releaseFileName(request.params.version, request.params.file);
      if (!releaseFile) return reply.code(404).send("Release not found.");
      const path = resolve(releaseDirectory(), request.params.version, releaseFile);
      try {
        await stat(path);
      } catch {
        return reply.code(404).send("Release not found.");
      }
      return reply
        .header("Cache-Control", "public, max-age=31536000, immutable")
        .header("Content-Disposition", `attachment; filename="${releaseFile}"`)
        .type(contentType(releaseFile))
        .send(createReadStream(path));
    }
  );

  app.get("/auth/desktop-releases", async (request, reply) => {
    if (!isAdministrator(request)) return forbidden(request, reply);
    try {
      const manifest = latestSchema.parse(JSON.parse(await readFile(latestPath(), "utf8")));
      return ok(manifest, { requestId: request.id });
    } catch {
      return ok(null, { requestId: request.id });
    }
  });

  app.post<{ Params: { file: string; version: string } }>(
    "/auth/desktop-releases/:version/:file",
    async (request, reply) => {
      if (!isAdministrator(request)) return forbidden(request, reply);
      const releaseFile = releaseFileName(request.params.version, request.params.file);
      if (!releaseFile || releaseFile === "latest.json") {
        return reply
          .code(400)
          .send(
            fail(
              {
                code: "DESKTOP_RELEASE_FILE_INVALID",
                message: "This release file is not allowed."
              },
              { requestId: request.id }
            )
          );
      }
      const staging = resolve(releaseDirectory(), ".staging", request.params.version);
      await mkdir(staging, { recursive: true });
      const output = resolve(staging, releaseFile);
      const offset = Number(request.headers["x-upload-offset"] ?? 0);
      if (!Number.isSafeInteger(offset) || offset < 0) {
        return reply
          .code(400)
          .send(
            fail(
              { code: "DESKTOP_RELEASE_OFFSET_INVALID", message: "The upload offset is invalid." },
              { requestId: request.id }
            )
          );
      }
      const existing = await fileSize(output);
      if (offset !== 0 && existing !== offset) {
        return reply
          .code(409)
          .send(
            fail(
              {
                code: "DESKTOP_RELEASE_OFFSET_CONFLICT",
                message: `Resume the upload at byte ${existing}.`
              },
              { requestId: request.id }
            )
          );
      }
      await pipeline(
        request.body as Readable,
        createWriteStream(output, { flags: offset === 0 ? "w" : "a" })
      );
      const file = await stat(output);
      return ok({ bytes: file.size, file: releaseFile }, { requestId: request.id });
    }
  );

  app.post<{ Body: unknown }>("/auth/desktop-releases/publish", async (request, reply) => {
    if (!isAdministrator(request)) return forbidden(request, reply);
    const parsed = latestSchema.safeParse(request.body);
    if (!parsed.success) {
      return reply
        .code(400)
        .send(
          fail(
            { code: "DESKTOP_RELEASE_MANIFEST_INVALID", message: "latest.json is invalid." },
            { requestId: request.id }
          )
        );
    }
    const manifest = parsed.data;
    const version = manifest.version;
    const installer = `CodeLogicX_${version}_x64_en-US.msi`;
    const signatureFile = `${installer}.sig`;
    const expectedUrl = `${publicReleaseBase()}/${version}/${installer}`;
    if (manifest.platforms["windows-x86_64"].url !== expectedUrl) {
      return reply
        .code(400)
        .send(
          fail(
            {
              code: "DESKTOP_RELEASE_URL_INVALID",
              message: `The updater URL must be ${expectedUrl}.`
            },
            { requestId: request.id }
          )
        );
    }
    const staging = resolve(releaseDirectory(), ".staging", version);
    const signature = (await readFile(resolve(staging, signatureFile), "utf8")).trim();
    await stat(resolve(staging, installer));
    if (signature !== manifest.platforms["windows-x86_64"].signature) {
      return reply
        .code(400)
        .send(
          fail(
            {
              code: "DESKTOP_RELEASE_SIGNATURE_MISMATCH",
              message: "The MSI signature does not match latest.json."
            },
            { requestId: request.id }
          )
        );
    }
    const destination = resolve(releaseDirectory(), version);
    await mkdir(destination, { recursive: true });
    await rename(resolve(staging, installer), resolve(destination, installer));
    await rename(resolve(staging, signatureFile), resolve(destination, signatureFile));
    const setup = `CodeLogicX_Setup_${version}_x64.exe`;
    try {
      await rename(resolve(staging, setup), resolve(destination, setup));
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code !== "ENOENT") throw error;
    }
    await mkdir(releaseDirectory(), { recursive: true });
    await writeFile(latestPath(), `${JSON.stringify(manifest, null, 2)}\n`, "utf8");
    return ok({ published: true, version }, { requestId: request.id });
  });
}

function releaseDirectory() {
  const storageRoot = process.env.CODELOGICX_STORAGE_PATH?.trim() || join(process.cwd(), "storage");
  return resolve(storageRoot, "desktop", "release");
}
function latestPath() {
  return resolve(releaseDirectory(), "latest.json");
}
function publicReleaseBase() {
  return (
    process.env.DESKTOP_RELEASE_PUBLIC_BASE_URL?.trim() ||
    `${env.PLATFORM_API_URL.replace(/\/+$/u, "")}/desktop/releases`
  ).replace(/\/+$/u, "");
}
function releaseFileName(version: string, file: string) {
  if (!versionSchema.safeParse(version).success) return null;
  const allowed = new Set([
    `CodeLogicX_${version}_x64_en-US.msi`,
    `CodeLogicX_${version}_x64_en-US.msi.sig`,
    `CodeLogicX_Setup_${version}_x64.exe`
  ]);
  return allowed.has(file) ? file : null;
}
function contentType(file: string) {
  return file.endsWith(".msi") ? "application/x-msi" : "application/octet-stream";
}
async function fileSize(path: string) {
  try {
    return (await stat(path)).size;
  } catch {
    return 0;
  }
}
function isAdministrator(request: FastifyRequest) {
  const authorization = request.headers.authorization;
  const token = authorization?.startsWith("Bearer ") ? authorization.slice(7).trim() : "";
  return Boolean(token && verifyAuthToken(token)?.role === "admin");
}
function forbidden(request: FastifyRequest, reply: FastifyReply) {
  return reply
    .code(403)
    .send(
      fail(
        { code: "DESKTOP_RELEASE_FORBIDDEN", message: "Administrator permission is required." },
        { requestId: request.id }
      )
    );
}
