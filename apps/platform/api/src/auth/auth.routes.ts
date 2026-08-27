import type { FastifyInstance, FastifyRequest } from "fastify";
import { createHash, randomBytes, randomInt, randomUUID } from "node:crypto";
import { fail, ok } from "@codelogicx/framework/http";
import { z } from "zod";
import { env } from "../env.js";
import { AuthService } from "./auth.service.js";
import { signAuthToken, verifyAuthToken } from "./jwt.js";

const authService = new AuthService();
const loginBody = z
  .object({
    email: z.string().trim().email(),
    password: z.string().min(1)
  })
  .strict();
const mobilePairingBody = z.union([
  z.object({ ticketId: z.string().uuid(), secret: z.string().min(32) }).strict(),
  z.object({ code: z.string().regex(/^\d{6}$/u) }).strict()
]);
const mobilePairingTickets = new Map<string, MobilePairingTicket>();
const mobilePairingAttempts = new Map<string, PairingAttemptWindow>();
const mobilePairingLifetimeMs = 60_000;

export async function registerAuthRoutes(app: FastifyInstance) {
  app.post("/auth/mobile-pairing", async (request, reply) => {
    const payload = authenticatedPayload(request);
    if (!payload)
      return reply
        .code(401)
        .send(
          fail(
            { code: "AUTH_SESSION_EXPIRED", message: "Session expired. Please sign in again." },
            { requestId: request.id }
          )
        );
    pruneMobilePairingTickets();
    const ticketId = randomUUID();
    const secret = randomBytes(32).toString("base64url");
    const code = uniquePairingCode();
    const expiresAt = Date.now() + mobilePairingLifetimeMs;
    mobilePairingTickets.set(ticketId, {
      codeHash: hashSecret(code),
      expiresAt,
      payload,
      secretHash: hashSecret(secret)
    });
    const pairing = { endpoint: "https://cx.codexsun.com", secret, ticketId, version: 1 };
    return ok(
      {
        code,
        expiresAt: new Date(expiresAt).toISOString(),
        pairingUrl: `https://cx.codexsun.com/connect?pairing=${Buffer.from(JSON.stringify(pairing)).toString("base64url")}`,
        payload: JSON.stringify(pairing)
      },
      { requestId: request.id }
    );
  });

  app.post("/auth/mobile-pairing/redeem", async (request, reply) => {
    const parsed = mobilePairingBody.safeParse(request.body);
    if (!parsed.success)
      return reply
        .code(400)
        .send(
          fail(
            { code: "AUTH_MOBILE_PAIRING_INVALID", message: "Invalid mobile pairing code." },
            { requestId: request.id }
          )
        );
    if ("code" in parsed.data && !allowPairingAttempt(request.ip)) {
      return reply.code(429).send(
        fail(
          {
            code: "AUTH_MOBILE_PAIRING_RATE_LIMITED",
            message: "Too many pairing attempts. Create a new code and try again shortly."
          },
          { requestId: request.id }
        )
      );
    }
    const entry = pairingTicket(parsed.data);
    const ticketId = entry?.[0];
    const ticket = entry?.[1];
    if (ticketId) mobilePairingTickets.delete(ticketId);
    if (ticket) mobilePairingAttempts.delete(request.ip);
    const validSecret =
      "code" in parsed.data || ticket?.secretHash === hashSecret(parsed.data.secret);
    if (!ticket || ticket.expiresAt <= Date.now() || !validSecret)
      return reply.code(401).send(
        fail(
          {
            code: "AUTH_MOBILE_PAIRING_EXPIRED",
            message: "This pairing code has expired or was already used."
          },
          { requestId: request.id }
        )
      );
    const { email, name, permissions, role, userId } = ticket.payload;
    const accessToken = signAuthToken({
      email,
      userId,
      ...(name ? { name } : {}),
      ...(permissions ? { permissions } : {}),
      ...(role ? { role } : {})
    });
    return ok({ accessToken, email, name, permissions, role }, { requestId: request.id });
  });

  app.post("/auth/development/login", async (request, reply) => {
    if (env.NODE_ENV !== "development" || env.DEV_AUTO_LOGIN !== "1") {
      return reply
        .code(404)
        .send(
          fail(
            { code: "AUTH_DEVELOPMENT_LOGIN_DISABLED", message: "Development login is disabled." },
            { requestId: request.id }
          )
        );
    }
    const result = await authService.login({
      email: env.INITIAL_ADMIN_EMAIL,
      password: env.INITIAL_ADMIN_PASSWORD
    });
    if (!result) {
      return reply.code(401).send(
        fail(
          {
            code: "AUTH_DEVELOPMENT_LOGIN_FAILED",
            message: "Development credentials are invalid."
          },
          { requestId: request.id }
        )
      );
    }
    return ok(result, { requestId: request.id });
  });

  app.post("/auth/login", async (request, reply) => {
    const parsed = loginBody.safeParse(request.body);
    if (!parsed.success) {
      return reply
        .code(400)
        .send(
          fail(
            { code: "AUTH_INVALID_REQUEST", message: "Email and password are required." },
            { requestId: request.id }
          )
        );
    }
    const result = await authService.login(parsed.data);
    if (!result) {
      return reply
        .code(401)
        .send(
          fail(
            { code: "AUTH_INVALID_CREDENTIALS", message: "Invalid credentials." },
            { requestId: request.id }
          )
        );
    }
    return ok(result, { requestId: request.id });
  });

  app.get("/auth/session", async (request, reply) => {
    const token = bearerToken(request);
    const payload = token ? verifyAuthToken(token) : null;
    if (!payload) {
      return reply
        .code(401)
        .send(
          fail(
            { code: "AUTH_SESSION_EXPIRED", message: "Session expired. Please sign in again." },
            { requestId: request.id }
          )
        );
    }
    return ok(
      {
        authenticated: true,
        email: payload.email,
        expiresAt: new Date(payload.exp * 1000).toISOString(),
        name: payload.name,
        permissions: payload.permissions ?? [],
        role: payload.role,
        sessionIssuedAt: payload.sessionIssuedAt
      },
      { requestId: request.id }
    );
  });

  app.post("/auth/logout", async (request) => ok({ loggedOut: true }, { requestId: request.id }));
}

function bearerToken(request: FastifyRequest) {
  const authorization = request.headers.authorization;
  return authorization?.startsWith("Bearer ") ? authorization.slice("Bearer ".length).trim() : "";
}

function authenticatedPayload(request: FastifyRequest) {
  const token = bearerToken(request);
  return token ? verifyAuthToken(token) : null;
}
function hashSecret(value: string) {
  return createHash("sha256").update(value).digest("hex");
}
function pruneMobilePairingTickets() {
  const now = Date.now();
  for (const [id, ticket] of mobilePairingTickets)
    if (ticket.expiresAt <= now) mobilePairingTickets.delete(id);
  for (const [address, attempts] of mobilePairingAttempts)
    if (attempts.expiresAt <= now) mobilePairingAttempts.delete(address);
}
function allowPairingAttempt(address: string) {
  const existing = mobilePairingAttempts.get(address);
  if (!existing || existing.expiresAt <= Date.now()) {
    mobilePairingAttempts.set(address, {
      count: 1,
      expiresAt: Date.now() + mobilePairingLifetimeMs
    });
    return true;
  }
  existing.count += 1;
  return existing.count <= 10;
}
function pairingTicket(input: z.infer<typeof mobilePairingBody>) {
  if ("code" in input) {
    return Array.from(mobilePairingTickets.entries()).find(
      ([, ticket]) => ticket.codeHash === hashSecret(input.code)
    );
  }
  return [input.ticketId, mobilePairingTickets.get(input.ticketId)] as const;
}
function uniquePairingCode() {
  let code = "";
  do code = String(randomInt(100_000, 1_000_000));
  while (
    Array.from(mobilePairingTickets.values()).some((ticket) => ticket.codeHash === hashSecret(code))
  );
  return code;
}
type MobilePairingTicket = {
  codeHash: string;
  expiresAt: number;
  payload: NonNullable<ReturnType<typeof verifyAuthToken>>;
  secretHash: string;
};
type PairingAttemptWindow = { count: number; expiresAt: number };
