import type { Contact, Conversation, ConversationMessage, Idea, IdeaInput, MobileData, Project, Todo, TodoInput } from "./mobile-types";

type Envelope<T> = { data: T; success: true } | { error: { message: string }; success: false };
const tokenKey = "codelogicx_mobile_session";
const endpointKey = "codelogicx_mobile_endpoint";
const cloudTokenKey = "codelogicx_mobile_cloud_session";
const cloudEndpointKey = "codelogicx_mobile_cloud_endpoint";
const localBackendKey = "codelogicx_mobile_local_backend";
const localEndpoint = "http://127.0.0.1:9150";

export class MobileApi {
  hasSession() { return Boolean(localStorage.getItem(tokenKey)); }
  usesLocalBackend() { return localStorage.getItem(localBackendKey) === "true"; }
  signOut() { localStorage.removeItem(tokenKey); localStorage.removeItem(endpointKey); }

  async connectLocal(): Promise<void> {
    preserveCloudSession();
    const session = await this.request<{ accessToken: string }>("/auth/development/login", { body: "{}", method: "POST" }, false, localEndpoint);
    localStorage.setItem(tokenKey, session.accessToken);
    localStorage.setItem(endpointKey, localEndpoint);
    localStorage.setItem(localBackendKey, "true");
  }

  disconnectLocal() {
    restoreCloudSession();
    localStorage.removeItem(localBackendKey);
  }

  async pair(payload: string): Promise<void> {
    const pairing = JSON.parse(payload) as { endpoint?: string; secret?: string; ticketId?: string; version?: number };
    if (pairing.version !== 1 || !pairing.endpoint || !pairing.secret || !pairing.ticketId) throw new Error("This is not a CodeLogicX Mobile Connect code.");
    const endpoint = allowedEndpoint(pairing.endpoint);
    const session = await this.request<{ accessToken: string }>("/auth/mobile-pairing/redeem", { body: JSON.stringify({ secret: pairing.secret, ticketId: pairing.ticketId }), method: "POST" }, false, endpoint);
    localStorage.setItem(tokenKey, session.accessToken);
    localStorage.setItem(endpointKey, endpoint);
  }

  async loadData(): Promise<MobileData> {
    const results = await Promise.allSettled([
      this.codelogic<Idea[]>("/ideas"), this.codelogic<Project[]>("/admin/project-manager/project"),
      this.codelogic<Todo[]>("/task-manager/todos"), this.codelogic<Conversation[]>("/messaging/conversations")
    ]);
    const value = <T,>(index: number) => results[index]?.status === "fulfilled" ? results[index].value as T : [] as T;
    const firstFailure = results.find((result) => result.status === "rejected");
    if (results.every((result) => result.status === "rejected") && firstFailure?.status === "rejected") {
      throw firstFailure.reason;
    }
    return { ideas: value<Idea[]>(0), projects: value<Project[]>(1), todos: value<Todo[]>(2), conversations: value<Conversation[]>(3) };
  }

  createIdea(input: IdeaInput): Promise<Idea> {
    const categoryColors: Record<string, string> = { Design: "#db2777", Engineering: "#7c3aed", General: "#2563eb", Operations: "#ea580c", Product: "#0891b2", Research: "#4f46e5" };
    const statusColors: Record<string, string> = { archived: "#64748b", completed: "#16a34a", "in-progress": "#ca8a04", open: "#0284c7", planned: "#7c3aed" };
    const content = input.content.trim();
    return this.codelogic<Idea>("/ideas", { body: JSON.stringify({ assigneeUuids: [], category: input.category, categoryColor: categoryColors[input.category] ?? categoryColors.General, contentHtml: `<p>${escapeHtml(content).replaceAll("\n", "<br>")}</p>`, excerpt: content.slice(0, 500), projectUuids: [], status: input.status, statusColor: statusColors[input.status] ?? statusColors.open, tags: input.tags, title: input.title.trim(), visibility: input.visibility }), method: "POST" });
  }

  sendHoneyMessage(message: string, threadId: string | null) {
    return this.codelogic<{ id: string; messages: Array<{ body: string; id: string; role: "assistant" | "user" }> }>("/honey/chat", { body: JSON.stringify({ context: { pageLabel: "CodeLogicX Mobile", pathname: "/mobile", projectId: null, projectTitle: null, recentError: null, runStatus: null, taskId: null }, message, threadId }), method: "POST" });
  }

  saveTodo(input: TodoInput, id?: string): Promise<Todo> {
    return this.codelogic<Todo>(id ? `/task-manager/todos/${id}` : "/task-manager/todos", { body: JSON.stringify(input), method: id ? "PUT" : "POST" });
  }

  listContacts(): Promise<Contact[]> { return this.codelogic<Contact[]>("/messaging/contacts"); }
  listMessages(id: string): Promise<ConversationMessage[]> { return this.codelogic<ConversationMessage[]>(`/messaging/conversations/${id}/messages`); }
  createConversation(memberId: string): Promise<Conversation> { return this.codelogic<Conversation>("/messaging/conversations", { body: JSON.stringify({ memberIds: [memberId], type: "direct" }), method: "POST" }); }
  sendMessage(id: string, content: string): Promise<ConversationMessage> { return this.codelogic<ConversationMessage>(`/messaging/conversations/${id}/messages`, { body: JSON.stringify({ attachment: null, clientMessageId: crypto.randomUUID(), content, mentionIds: [] }), method: "POST" }); }

  private codelogic<T>(path: string, options: RequestInit = {}) { return this.request<T>(`/api/codelogicx${path}`, options); }

  private async request<T>(path: string, options: RequestInit = {}, authenticated = true, endpoint = mobileEndpoint()): Promise<T> {
    const token = localStorage.getItem(tokenKey);
    const response = await fetch(`${endpoint}${path}`, { ...options, headers: { ...(options.body ? { "Content-Type": "application/json" } : {}), ...(authenticated && token ? { Authorization: `Bearer ${token}` } : {}) } });
    const envelope = await response.json() as Envelope<T>;
    if (!response.ok || !envelope.success) throw new Error(envelope.success ? "Request failed" : envelope.error.message);
    return envelope.data;
  }
}

export const mobileApi = new MobileApi();

function mobileEndpoint() { return (localStorage.getItem(endpointKey) || import.meta.env.VITE_MOBILE_API_URL).replace(/\/+$/u, ""); }
function allowedEndpoint(value: string) { const url = new URL(value); const local = ["127.0.0.1", "10.0.2.2", "localhost"].includes(url.hostname); if (url.protocol !== "https:" && !(local && url.protocol === "http:")) throw new Error("Mobile Connect requires a secure HTTPS site."); return url.origin; }
function preserveCloudSession() { const token = localStorage.getItem(tokenKey); const endpoint = localStorage.getItem(endpointKey); if (token && !localStorage.getItem(localBackendKey)) localStorage.setItem(cloudTokenKey, token); if (endpoint && !localStorage.getItem(localBackendKey)) localStorage.setItem(cloudEndpointKey, endpoint); }
function restoreCloudSession() { const token = localStorage.getItem(cloudTokenKey); const endpoint = localStorage.getItem(cloudEndpointKey); token ? localStorage.setItem(tokenKey, token) : localStorage.removeItem(tokenKey); endpoint ? localStorage.setItem(endpointKey, endpoint) : localStorage.removeItem(endpointKey); }
function escapeHtml(value: string) { return value.replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;").replaceAll('"', "&quot;").replaceAll("'", "&#039;"); }
