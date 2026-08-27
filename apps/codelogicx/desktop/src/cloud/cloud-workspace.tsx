import {
  Bell,
  BriefcaseBusiness,
  CheckSquare2,
  Cloud,
  LayoutDashboard,
  Lightbulb,
  Link2,
  LogOut,
  MessageCircle,
  RefreshCw,
  Server,
  Users
} from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import { desktopCloudApi } from "./cloud-api";
import { CloudPageContent } from "./cloud-pages";
import type { CloudData, CloudPage, CloudSession } from "./cloud-types";
import "./cloud-workspace.css";

const emptyData: CloudData = { conversations: [], ideas: [], projects: [], tasks: [] };
const navigation = [
  { icon: LayoutDashboard, id: "dashboard", label: "Dashboard" },
  { icon: Lightbulb, id: "ideas", label: "Ideas" },
  { icon: BriefcaseBusiness, id: "projects", label: "Projects" },
  { icon: CheckSquare2, id: "tasks", label: "Tasks" },
  { icon: MessageCircle, id: "messages", label: "Messenger" }
] as const;

export function CloudWorkspace({ onExitLocal }: { onExitLocal?: (() => void) | undefined }) {
  const [connected, setConnected] = useState(() => desktopCloudApi.hasSession());
  if (!connected)
    return <CloudConnect onConnected={() => setConnected(true)} onExitLocal={onExitLocal} />;
  return <CloudDesk onDisconnected={() => setConnected(false)} onExitLocal={onExitLocal} />;
}

function CloudConnect({
  onConnected,
  onExitLocal
}: {
  onConnected: () => void;
  onExitLocal?: (() => void) | undefined;
}) {
  const [mode, setMode] = useState<"code" | "url">("code");
  const [endpoint, setEndpoint] = useState("https://cx.codexsun.com");
  const [code, setCode] = useState("");
  const [syncUrl, setSyncUrl] = useState("");
  const [error, setError] = useState("");
  const [pending, setPending] = useState(false);

  async function connect() {
    setPending(true);
    setError("");
    try {
      if (mode === "code") await desktopCloudApi.connectWithCode(endpoint, code);
      else await desktopCloudApi.connectWithUrl(syncUrl);
      onConnected();
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Could not connect to CodeLogicX Cloud.");
    } finally {
      setPending(false);
    }
  }

  return (
    <main className="cloud-connect">
      <section className="cloud-connect-copy">
        <span className="cloud-mark">
          <Cloud size={28} />
        </span>
        <p>CodeLogicX Desktop Cloud</p>
        <h1>Your engineering workspace, available locally.</h1>
        <span>
          Connect this computer to the same account used by the mobile application. Cloud records
          remain owned by the server; local repositories and credentials stay on this device.
        </span>
        <ul>
          <li>
            <Lightbulb size={16} /> Ideas and discussions
          </li>
          <li>
            <BriefcaseBusiness size={16} /> Projects and delivery status
          </li>
          <li>
            <CheckSquare2 size={16} /> Assigned tasks
          </li>
          <li>
            <MessageCircle size={16} /> Team conversations
          </li>
        </ul>
      </section>
      <section className="cloud-connect-form" aria-label="Connect desktop to cloud">
        <header>
          <span>
            <Link2 size={18} />
          </span>
          <div>
            <h2>Connect this desktop</h2>
            <p>Use a one-time code or desktop sync URL.</p>
          </div>
        </header>
        <div className="cloud-connect-modes" role="tablist">
          <button aria-selected={mode === "code"} onClick={() => setMode("code")} role="tab">
            App OTP
          </button>
          <button aria-selected={mode === "url"} onClick={() => setMode("url")} role="tab">
            Sync URL
          </button>
        </div>
        {mode === "code" ? (
          <div className="cloud-fields">
            <label>
              Cloud URL
              <input value={endpoint} onChange={(event) => setEndpoint(event.target.value)} />
            </label>
            <label>
              One-time code
              <input
                autoFocus
                className="cloud-code-input"
                inputMode="numeric"
                maxLength={6}
                placeholder="000000"
                value={code}
                onChange={(event) => setCode(event.target.value.replace(/\D/gu, ""))}
              />
            </label>
            <p>Open Settings → Mobile Connect in the web application to create this code.</p>
          </div>
        ) : (
          <div className="cloud-fields">
            <label>
              Desktop sync URL
              <textarea
                autoFocus
                placeholder="Paste the sync URL from Mobile Connect"
                rows={4}
                value={syncUrl}
                onChange={(event) => setSyncUrl(event.target.value)}
              />
            </label>
            <p>The URL is single-use and expires after one minute.</p>
          </div>
        )}
        {error ? (
          <p className="cloud-error" role="alert">
            {error}
          </p>
        ) : null}
        <button
          className="cloud-primary"
          disabled={pending || (mode === "code" ? code.length !== 6 || !endpoint : !syncUrl.trim())}
          onClick={() => void connect()}
        >
          {pending ? "Connecting…" : "Connect securely"}
        </button>
        {onExitLocal ? (
          <button className="cloud-secondary" onClick={onExitLocal}>
            Continue with local workspace
          </button>
        ) : null}
      </section>
    </main>
  );
}

function CloudDesk({
  onDisconnected,
  onExitLocal
}: {
  onDisconnected: () => void;
  onExitLocal?: (() => void) | undefined;
}) {
  const [page, setPage] = useState<CloudPage>("dashboard");
  const [data, setData] = useState(emptyData);
  const [session, setSession] = useState<CloudSession>();
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const [nextSession, nextData] = await Promise.all([
        desktopCloudApi.session(),
        desktopCloudApi.loadData()
      ]);
      setSession(nextSession);
      setData(nextData);
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Cloud data is unavailable.");
    } finally {
      setLoading(false);
    }
  }, []);
  useEffect(() => {
    void load();
  }, [load]);

  function disconnect() {
    desktopCloudApi.disconnect();
    onDisconnected();
  }

  return (
    <main className="cloud-desk">
      <aside>
        <header>
          <span className="cloud-mark">
            <Cloud size={20} />
          </span>
          <div>
            <strong>CodeLogicX</strong>
            <small>Developer Portal</small>
          </div>
        </header>
        <nav>
          {navigation.map((item) => (
            <button
              className={page === item.id ? "active" : ""}
              key={item.id}
              onClick={() => setPage(item.id)}
            >
              <item.icon size={18} />
              <span>{item.label}</span>
            </button>
          ))}
        </nav>
        <footer>
          <div>
            <span>{initials(session?.name || session?.email || "Cloud")}</span>
            <p>
              <strong>{session?.name || "Cloud account"}</strong>
              <small>{session?.email}</small>
            </p>
          </div>
          {onExitLocal ? (
            <button onClick={onExitLocal}>
              <Server size={17} />
              Local workspace
            </button>
          ) : null}
          <button onClick={disconnect}>
            <LogOut size={17} />
            Disconnect
          </button>
        </footer>
      </aside>
      <section className="cloud-main">
        <header className="cloud-toolbar">
          <div>
            <span className="cloud-live-dot" />
            Connected to {hostName(desktopCloudApi.endpoint())}
          </div>
          <div>
            <button aria-label="Refresh cloud data" onClick={() => void load()}>
              <RefreshCw size={16} />
            </button>
            <button aria-label="Notifications">
              <Bell size={16} />
            </button>
          </div>
        </header>
        <div className="cloud-scroll">
          {loading ? (
            <CloudState
              title="Syncing cloud workspace"
              detail="Loading the latest projects, ideas, tasks, and messages."
            />
          ) : error ? (
            <CloudState
              action={() => void load()}
              detail={error}
              title="Cloud connection unavailable"
            />
          ) : (
            <CloudPageContent data={data} page={page} session={session} setPage={setPage} />
          )}
        </div>
      </section>
    </main>
  );
}

function CloudState({
  action,
  detail,
  title
}: {
  action?: () => void;
  detail: string;
  title: string;
}) {
  return (
    <div className="cloud-state">
      <Cloud size={28} />
      <strong>{title}</strong>
      <span>{detail}</span>
      {action ? <button onClick={action}>Try again</button> : null}
    </div>
  );
}
function initials(value: string) {
  return value
    .split(/\s+/u)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join("");
}
function hostName(value: string) {
  try {
    return new URL(value).hostname;
  } catch {
    return "cloud";
  }
}
