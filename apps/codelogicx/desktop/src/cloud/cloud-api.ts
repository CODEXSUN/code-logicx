import type {
  CloudConversation,
  CloudData,
  CloudIdea,
  CloudProject,
  CloudSession,
  CloudTask
} from "./cloud-types";

type Envelope<T> = { data: T; success: true } | { error: { message: string }; success: false };
type PairingPayload = { endpoint: string; secret: string; ticketId: string; version: number };

const endpointKey = "codelogicx_desktop_cloud_endpoint";
const tokenKey = "codelogicx_desktop_cloud_session";

class DesktopCloudApi {
  hasSession() {
    return Boolean(localStorage.getItem(endpointKey) && localStorage.getItem(tokenKey));
  }

  endpoint() {
    return localStorage.getItem(endpointKey) ?? "";
  }

  disconnect() {
    localStorage.removeItem(endpointKey);
    localStorage.removeItem(tokenKey);
  }

  async connectWithCode(endpoint: string, code: string) {
    const cloudEndpoint = allowedEndpoint(endpoint);
    const session = await this.request<{ accessToken: string }>(
      "/auth/mobile-pairing/redeem",
      { body: JSON.stringify({ code: code.replace(/\D/gu, "") }), method: "POST" },
      cloudEndpoint,
      false
    );
    this.saveSession(cloudEndpoint, session.accessToken);
  }

  async connectWithUrl(value: string) {
    const pairing = pairingFromValue(value);
    const endpoint = allowedEndpoint(pairing.endpoint);
    const session = await this.request<{ accessToken: string }>(
      "/auth/mobile-pairing/redeem",
      {
        body: JSON.stringify({ secret: pairing.secret, ticketId: pairing.ticketId }),
        method: "POST"
      },
      endpoint,
      false
    );
    this.saveSession(endpoint, session.accessToken);
  }

  session() {
    return this.request<CloudSession>("/auth/session");
  }

  async loadData(): Promise<CloudData> {
    const results = await Promise.allSettled([
      this.codelogic<CloudIdea[]>("/ideas"),
      this.codelogic<CloudProject[]>("/admin/project-manager/project"),
      this.codelogic<CloudTask[]>("/task-manager/todos"),
      this.codelogic<CloudConversation[]>("/messaging/conversations")
    ]);
    const firstFailure = results.find((result) => result.status === "rejected");
    if (
      results.every((result) => result.status === "rejected") &&
      firstFailure?.status === "rejected"
    ) {
      throw firstFailure.reason;
    }
    return {
      conversations: settledValue(results, 3),
      ideas: settledValue(results, 0),
      projects: settledValue(results, 1),
      tasks: settledValue(results, 2)
    };
  }

  private codelogic<T>(path: string) {
    return this.request<T>(`/api/codelogicx${path}`);
  }

  private async request<T>(
    path: string,
    options: RequestInit = {},
    endpoint = this.endpoint(),
    authenticated = true
  ) {
    const token = localStorage.getItem(tokenKey);
    const response = await fetch(`${endpoint}${path}`, {
      ...options,
      headers: {
        ...(options.body ? { "Content-Type": "application/json" } : {}),
        ...(authenticated && token ? { Authorization: `Bearer ${token}` } : {})
      }
    });
    const envelope = (await response.json()) as Envelope<T>;
    if (!response.ok || !envelope.success) {
      throw new Error(envelope.success ? "Cloud request failed." : envelope.error.message);
    }
    return envelope.data;
  }

  private saveSession(endpoint: string, token: string) {
    localStorage.setItem(endpointKey, endpoint);
    localStorage.setItem(tokenKey, token);
  }
}

export const desktopCloudApi = new DesktopCloudApi();

function settledValue<T>(results: PromiseSettledResult<unknown>[], index: number) {
  const result = results[index];
  return result?.status === "fulfilled" ? (result.value as T) : ([] as T);
}

function pairingFromValue(value: string): PairingPayload {
  const input = value.trim();
  let parsed: unknown;
  if (input.startsWith("{")) parsed = JSON.parse(input);
  else {
    const url = new URL(input);
    const encoded = url.searchParams.get("pairing") ?? url.searchParams.get("payload");
    if (!encoded) throw new Error("The sync URL does not contain pairing details.");
    parsed = JSON.parse(decodeBase64Url(encoded));
  }
  if (!isPairingPayload(parsed)) throw new Error("This is not a CodeLogicX sync URL.");
  return parsed;
}

function isPairingPayload(value: unknown): value is PairingPayload {
  if (!value || typeof value !== "object") return false;
  const pairing = value as Partial<PairingPayload>;
  return pairing.version === 1 && Boolean(pairing.endpoint && pairing.secret && pairing.ticketId);
}

function decodeBase64Url(value: string) {
  const base64 = value.replace(/-/gu, "+").replace(/_/gu, "/");
  return atob(base64.padEnd(Math.ceil(base64.length / 4) * 4, "="));
}

function allowedEndpoint(value: string) {
  const url = new URL(value.trim());
  const local = ["127.0.0.1", "localhost"].includes(url.hostname);
  if (url.protocol !== "https:" && !(local && url.protocol === "http:")) {
    throw new Error("Cloud connections require HTTPS.");
  }
  return url.origin;
}
