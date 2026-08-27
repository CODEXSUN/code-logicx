import {
  createApiApp,
  registerHealthRoute,
  registerRequestLogging
} from "@codelogicx/framework/api";
import { AppError } from "@codelogicx/framework/errors";
import type { HealthCheck } from "@codelogicx/framework/health";
import { registerModules } from "@codelogicx/framework/modules";
import {
  configureNotificationRuntime,
  codelogicxApiModuleKeys,
  registerCodeLogicXApiForHost,
  subscribeMessagingEvents,
  subscribeNotificationEvents
} from "@codelogicx/codelogicx-api";
import type { CodeLogicXDatabase } from "@codelogicx/codelogicx-api";
import type { Kysely } from "kysely";
import { Server as SocketServer } from "socket.io";
import { registerAuthRoutes } from "./auth/auth.routes.js";
import { bootstrapPlatformDatabase, closePlatformDatabase } from "./database/platform-database.js";
import { getPlatformDatabase } from "./database/platform-database.js";
import { identityContext } from "./auth/identity-context.js";
import { env } from "./env.js";
import { verifyAuthToken } from "./auth/jwt.js";
import { permissionModule } from "./modules/permission/index.js";
import { rolePermissionModule } from "./modules/role-permission/index.js";
import { roleModule } from "./modules/role/index.js";
import { userRoleModule } from "./modules/user-role/index.js";
import { userModule, userReferenceContract } from "./modules/user/index.js";
import { registerCodeLogicXAddons } from "./addons/addon-host.js";
import { closeFileManagerDatabase, fileManagerApiModuleKeys } from "./addons/file-manager-host.js";

const modules = [userModule, roleModule, permissionModule, userRoleModule, rolePermissionModule];

export async function createApp() {
  console.info("[codelogicx.boot] bootstrap started");
  await bootstrapPlatformDatabase();
  const database = getPlatformDatabase() as unknown as Kysely<CodeLogicXDatabase>;
  const closeNotifications = await configureNotificationRuntime({
    database,
    email: {
      fromEmail: env.MAIL_FROM_EMAIL,
      fromName: env.MAIL_FROM_NAME,
      host: env.MAIL_SMTP_HOST,
      password: env.MAIL_SMTP_PASSWORD,
      port: env.MAIL_SMTP_PORT,
      secure: env.MAIL_SMTP_SECURE === "1",
      username: env.MAIL_SMTP_USERNAME
    },
    redisUrl: env.REDIS_URL
  });

  const app = await createApiApp({
    appName: "CodeLogicX API",
    cookieSecret: env.JWT_SECRET,
    corsOrigins: platformWebOrigins(),
    environment: env.NODE_ENV,
    shutdownHooks: [closeNotifications, closeFileManagerDatabase, closePlatformDatabase],
    tenantContext: false
  });
  registerNotificationSocket(app);
  registerMessagingSocket(app);
  const healthChecks: HealthCheck[] = [
    {
      name: "codelogicx-api",
      check: () => ({
        details: {
          database: env.DB_NAME,
          modules: [
            ...modules.map((module) => module.key),
            ...codelogicxApiModuleKeys,
            ...fileManagerApiModuleKeys,
            "blogs"
          ],
          runtime: "single-client"
        },
        status: "ok"
      })
    }
  ];

  registerRequestLogging(app);
  registerHealthRoute(app, healthChecks);
  await registerAuthRoutes(app);
  await registerModules(
    modules,
    { app },
    {
      onRegister: (module) => console.info(`[module.register] ${module.key}`),
      onReady: (module) => console.info(`[module.ready] ${module.key}`)
    }
  );
  await registerCodeLogicXAddons(app);
  await app.register(
    async (codelogicxApp) =>
      registerCodeLogicXApiForHost(codelogicxApp, {
        async authorize({ request }) {
          if (
            request.url.includes("/sync/cloud/") ||
            request.url.includes("/telegram/webhook") ||
            isIdeaImageRequest(request)
          )
            return;
          await identityContext(request).authorize(codelogicxPermission(request));
        },
        async resolve(request) {
          if (isIdeaImageRequest(request)) {
            return {
              actor: { id: "codelogicx-idea-image", permissions: [], roles: ["system"] },
              database: getPlatformDatabase() as unknown as Kysely<CodeLogicXDatabase>,
              users: userReferenceContract(getPlatformDatabase())
            };
          }
          const context = identityContext(request);
          const actor = await context.actorUser();
          if (!actor) throw AppError.unauthorized("Session expired. Please sign in again.");
          return {
            actor: {
              email: actor.email,
              id: actor.uuid,
              permissions: [],
              roles: [actor.role]
            },
            database: context.database as unknown as Kysely<CodeLogicXDatabase>,
            users: userReferenceContract(context.database)
          };
        },
        resolveCloudSync() {
          return {
            actor: {
              id: "codelogicx-cloud-sync",
              permissions: [],
              roles: ["system"]
            },
            database: getPlatformDatabase() as unknown as Kysely<CodeLogicXDatabase>,
            users: userReferenceContract(getPlatformDatabase())
          };
        },
        resolvePublicWebhook() {
          return {
            actor: { id: "telegram-webhook", permissions: [], roles: ["system"] },
            database: getPlatformDatabase() as unknown as Kysely<CodeLogicXDatabase>,
            users: userReferenceContract(getPlatformDatabase())
          };
        }
      }),
    { prefix: "/api/codelogicx" }
  );
  console.info("[codelogicx.boot] bootstrap completed");

  return app;
}

function isIdeaImageRequest(request: { method: string; url: string }) {
  return (
    request.method === "GET" &&
    /(?:^|\/api\/codelogicx)\/ideas\/[a-f0-9]{8}\/attachments\/[a-f0-9]{8}\/image(?:\?|$)/u.test(
      request.url
    )
  );
}

function registerNotificationSocket(app: Awaited<ReturnType<typeof createApiApp>>) {
  const io = new SocketServer(app.server, {
    cors: { credentials: true, origin: platformWebOrigins() },
    path: "/api/codelogicx/notifications/socket.io"
  });
  io.use((socket, next) => {
    const authorization = String(
      socket.handshake.auth.token ?? socket.handshake.headers.authorization ?? ""
    );
    const token = authorization.replace(/^Bearer\s+/iu, "");
    const actor = verifyAuthToken(token);
    if (!actor) return next(new Error("Notification socket authentication failed."));
    socket.data.actorId = actor.userId;
    socket.join(`actor:${actor.userId}`);
    next();
  });
  const unsubscribe = subscribeNotificationEvents((event) => {
    io.to(`actor:${event.actorId}`).emit("notification.created", event);
  });
  app.addHook("onClose", async () => {
    unsubscribe();
    await io.close();
  });
}

function registerMessagingSocket(app: Awaited<ReturnType<typeof createApiApp>>) {
  const io = new SocketServer(app.server, {
    cors: { credentials: true, origin: platformWebOrigins() },
    path: "/api/codelogicx/messaging/socket.io"
  });
  io.use((socket, next) => {
    const authorization = String(
      socket.handshake.auth.token ?? socket.handshake.headers.authorization ?? ""
    );
    const actor = verifyAuthToken(authorization.replace(/^Bearer\s+/iu, ""));
    if (!actor) return next(new Error("Messenger socket authentication failed."));
    socket.data.actorId = actor.userId;
    socket.join(`messaging:${actor.userId}`);
    next();
  });
  const unsubscribe = subscribeMessagingEvents((event) => {
    for (const actorId of event.memberIds) {
      if (event.kind === "message") {
        io.to(`messaging:${actorId}`).emit("message.created", event.message);
      } else {
        io.to(`messaging:${actorId}`).emit("conversation.read", event);
      }
    }
  });
  app.addHook("onClose", async () => {
    unsubscribe();
    await io.close();
  });
}

function platformWebOrigins() {
  const configuredOrigins = [
    env.PLATFORM_WEB_ORIGIN,
    ...env.PLATFORM_WEB_ORIGINS.split(","),
    "http://tauri.localhost",
    "https://tauri.localhost",
    "tauri://localhost"
  ];
  if (env.NODE_ENV !== "production") {
    configuredOrigins.push(
      `http://127.0.0.1:${env.PLATFORM_WEB_PORT}`,
      `http://localhost:${env.PLATFORM_WEB_PORT}`
    );
  }

  return Array.from(
    new Set(
      configuredOrigins
        .map((origin) => origin.trim())
        .filter(Boolean)
        .flatMap(localOriginAliases)
        .map((origin) => origin.trim().replace(/\/$/u, ""))
    )
  );
}

function codelogicxPermission(request: { method: string; url: string }) {
  const action = request.method === "GET" || request.method === "HEAD" ? "view" : "manage";
  if (request.url.includes("/task-manager/")) return `codelogicx.task-manager.${action}`;
  if (request.url.includes("/messaging/")) return `codelogicx.messaging.${action}`;
  if (request.url.includes("/planning/")) return `codelogicx.planning.${action}`;
  if (request.url.includes("/github-dashboard/")) return "codelogicx.github-dashboard.view";
  if (request.url.includes("/orchestration/")) return `codelogicx.orchestration.${action}`;
  if (request.url.includes("/sync/")) return `codelogicx.sync.${action}`;
  if (request.url.includes("/notifications")) return `codelogicx.notification.${action}`;
  if (request.url.includes("/project-manager/registry/")) return `codelogicx.registry.${action}`;
  return `codelogicx.project-manager.${action}`;
}

function localOriginAliases(origin: string) {
  const origins = [origin];
  const url = new URL(origin);
  if (url.hostname === "localhost") {
    url.hostname = "127.0.0.1";
    origins.push(url.origin);
  } else if (url.hostname === "127.0.0.1") {
    url.hostname = "localhost";
    origins.push(url.origin);
  }
  return origins;
}
