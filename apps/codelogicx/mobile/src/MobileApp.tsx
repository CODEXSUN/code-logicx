import { IonApp, IonIcon, IonSpinner } from "@ionic/react";
import { BarcodeFormat, BarcodeScanner } from "@capacitor-mlkit/barcode-scanning";
import { App as CapacitorApp } from "@capacitor/app";
import { bulbOutline, chatbubbleEllipsesOutline, checkboxOutline, chevronDownOutline, chevronForwardOutline, closeOutline, cloudDownloadOutline, folderOutline, homeOutline, layersOutline, logOutOutline, menuOutline, optionsOutline, refreshOutline, settingsOutline } from "ionicons/icons";
import { useCallback, useEffect, useState } from "react";
import { mobileApi } from "./mobile-api";
import { checkForUpdate, installUpdate, type UpdateManifest } from "./app-updater";
import { HoneyPet } from "./honey-pet";
import { ErrorPage, HomePage, IdeasPage, LoadingPage, ProjectsPage } from "./mobile-pages";
import { MessengerPage, TodosPage } from "./todo-messenger-pages";
import type { MobileData, Session } from "./mobile-types";

const emptyData: MobileData = { conversations: [], ideas: [], projectRecords: [], projects: [], todos: [] };
const tabs = [
  { id: "home", icon: homeOutline, label: "Home" },
  { id: "ideas", icon: bulbOutline, label: "Ideas" },
  { id: "projects", icon: folderOutline, label: "Projects" },
  { id: "tasks", icon: checkboxOutline, label: "Todos" },
  { id: "messages", icon: chatbubbleEllipsesOutline, label: "Messenger" }
] as const;
type Tab = (typeof tabs)[number]["id"];
const pairingBypass = import.meta.env.VITE_MOBILE_PAIRING_BYPASS === "1";
const honeyVisibilityKey = "codelogicx.screen-companion.visible";

export function MobileApp() {
  const [signedIn, setSignedIn] = useState(() => pairingBypass || mobileApi.hasSession());
  return <IonApp>{signedIn ? <MobileDesk onSignOut={() => { mobileApi.signOut(); setSignedIn(false); }}/> : <MobileConnect onConnected={() => setSignedIn(true)}/>}</IonApp>;
}

function MobileDesk({ onSignOut }: { onSignOut: () => void }) {
  const [tab, setTab] = useState<Tab>("home");
  const [data, setData] = useState(emptyData);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  const [compact, setCompact] = useState(false);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [honeyEnabled, setHoneyEnabled] = useState(() => localStorage.getItem(honeyVisibilityKey) !== "false");
  const [localBackend, setLocalBackend] = useState(() => mobileApi.usesLocalBackend());
  const [localPending, setLocalPending] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [session, setSession] = useState<Session | null>(null);
  const [update, setUpdate] = useState<UpdateManifest | null>(null);
  const [updateState, setUpdateState] = useState<"idle" | "checking" | "current" | "error" | "installing">("idle");
  const load = useCallback(async () => {
    setLoading(true); setError("");
    try { const [nextData, nextSession] = await Promise.all([mobileApi.loadData(), mobileApi.getSession()]); setData(nextData); setSession(nextSession); }
    catch (reason) { setError(reason instanceof Error ? reason.message : "Unable to reach CodeLogicX."); }
    finally { setLoading(false); }
  }, []);
  const refresh = useCallback(async () => {
    try { setData(await mobileApi.loadData()); }
    catch (reason) { setError(reason instanceof Error ? reason.message : "Unable to refresh CodeLogicX."); }
  }, []);
  useEffect(() => { if (pairingBypass && !mobileApi.hasSession()) { setLoading(false); return; } void load(); }, [load]);
  useEffect(() => mobileApi.subscribeMessaging(() => void refresh()), [refresh]);
  const requestUpdate = useCallback(async () => {
    setUpdateState("checking");
    try {
      const release = await checkForUpdate();
      setUpdate(release);
      setUpdateState(release ? "idle" : "current");
    } catch (reason) {
      console.warn("CodeLogicX update check did not complete.", reason);
      setUpdateState("error");
    }
  }, []);
  useEffect(() => {
    if (!session) return;
    const timer = window.setTimeout(() => void requestUpdate(), 1_000);
    const listener = CapacitorApp.addListener("appStateChange", ({ isActive }) => { if (isActive) void requestUpdate(); });
    return () => { window.clearTimeout(timer); void listener.then((handle) => handle.remove()); };
  }, [requestUpdate, session]);
  async function beginUpdate() {
    if (!update) return;
    setUpdateState("installing");
    try { await installUpdate(update); }
    catch (reason) { setError(reason instanceof Error ? reason.message : "Could not start the mobile update."); setUpdateState("error"); }
  }
  function navigate(next: Tab | "agent" | "all") { setDrawerOpen(false); if (next === "agent") { if (!honeyEnabled) { localStorage.setItem(honeyVisibilityKey, "true"); setHoneyEnabled(true); } window.setTimeout(() => window.dispatchEvent(new Event("codelogicx:honey-open")), 0); return; } setTab(next === "all" ? "projects" : next); }
  function toggleHoney() { setHoneyEnabled((enabled) => { localStorage.setItem(honeyVisibilityKey, String(!enabled)); return !enabled; }); }
  async function toggleLocalBackend() {
    setLocalPending(true); setError("");
    try { if (localBackend) mobileApi.disconnectLocal(); else await mobileApi.connectLocal(); setLocalBackend(!localBackend); const [nextData, nextSession] = await Promise.all([mobileApi.loadData(), mobileApi.getSession()]); setData(nextData); setSession(nextSession); }
    catch (reason) { setError(reason instanceof Error ? reason.message : "Could not connect to the local backend."); }
    finally { setLocalPending(false); }
  }
  return <main className={compact ? "mobile-desk is-compact" : "mobile-desk"}>
    <div className="top-actions"><button aria-label="Open menu" onClick={() => setDrawerOpen(true)}><IonIcon icon={menuOutline}/></button></div>
    <div className="page-scroll">{update ? <button className="mobile-update-banner" disabled={updateState === "installing"} onClick={() => void beginUpdate()}><IonIcon icon={cloudDownloadOutline}/><span><strong>CodeLogicX {update.version} is ready</strong><small>{updateState === "installing" ? "Opening Android installer…" : "Tap to download and install"}</small></span><IonIcon icon={chevronForwardOutline}/></button> : null}{loading ? <LoadingPage/> : error ? <ErrorPage message={error} retry={() => void load()}/> : renderPage(tab, data, navigate, load, session?.userId ?? "")}</div>
    <nav className="mobile-tabs">{tabs.map((item) => <button className={tab === item.id ? "is-active" : ""} key={item.id} onClick={() => navigate(item.id)}><IonIcon icon={item.icon}/><span>{item.label}</span></button>)}</nav>
    {honeyEnabled && !drawerOpen ? <HoneyPet send={(message, threadId) => mobileApi.sendHoneyMessage(message, threadId)}/> : null}
    {drawerOpen ? <><button className="drawer-scrim" aria-label="Close menu" onClick={() => setDrawerOpen(false)}/><aside className="mobile-drawer"><header><img alt="CodeLogicX" src="/logo/logo.svg"/><strong>CodeLogicX</strong><button aria-label="Close menu" onClick={() => setDrawerOpen(false)}><IonIcon icon={closeOutline}/></button></header><nav><DrawerItem icon={homeOutline} label="Dashboard" open={() => navigate("home")}/><DrawerItem icon={bulbOutline} label="Ideas" open={() => navigate("ideas")}/><DrawerItem icon={chatbubbleEllipsesOutline} label="Messenger" open={() => navigate("messages")}/><DrawerItem icon={layersOutline} label="Projects" open={() => navigate("projects")}/><DrawerItem icon={checkboxOutline} label="Todos" open={() => navigate("tasks")}/><button className="drawer-settings-trigger" onClick={() => setSettingsOpen((open) => !open)}><IonIcon icon={settingsOutline}/><span>Settings</span><IonIcon className="drawer-chevron" icon={settingsOpen ? chevronDownOutline : chevronForwardOutline}/></button>{settingsOpen ? <div className="drawer-submenu"><SettingSwitch detail="Connected companion" enabled={honeyEnabled} label="Show Honey" toggle={toggleHoney}/><SettingSwitch detail={localPending ? "Connecting…" : "Android emulator · port 9150"} disabled={localPending} enabled={localBackend} label="Local backend" toggle={() => void toggleLocalBackend()}/><button className="compact-submenu" onClick={() => setCompact((value) => !value)}><IonIcon icon={optionsOutline}/><span>{compact ? "Relaxed view" : "Compact view"}</span></button><button className="compact-submenu" disabled={updateState === "checking" || updateState === "installing"} onClick={() => update ? void beginUpdate() : void requestUpdate()}><IonIcon icon={update ? cloudDownloadOutline : refreshOutline}/><span><strong>{update ? `Install ${update.version}` : "Check for updates"}</strong><small>{updateStatus(updateState)}</small></span></button></div> : null}</nav><footer><AccountSummary session={session}/><button onClick={onSignOut}><IonIcon icon={logOutOutline}/><span>Disconnect</span></button></footer></aside></> : null}
  </main>;
}

function DrawerItem({ icon, label, open }: { icon: string; label: string; open: () => void }) { return <button onClick={open}><IonIcon icon={icon}/><span>{label}</span><IonIcon className="drawer-chevron" icon={chevronForwardOutline}/></button>; }
function AccountSummary({ session }: { session: Session | null }) { const name = session?.name || "Connected user"; return <div className="drawer-account"><span className="drawer-account-avatar">{accountInitials(name)}</span><span><strong>{name}</strong><small>{session?.email || "Authenticated session"}</small></span><b>v{__APP_VERSION__}</b></div>; }
function SettingSwitch({ detail, disabled = false, enabled, label, toggle }: { detail: string; disabled?: boolean; enabled: boolean; label: string; toggle: () => void }) { return <div className="drawer-setting-row"><span><strong>{label}</strong><small>{detail}</small></span><button aria-label={`${enabled ? "Disable" : "Enable"} ${label}`} aria-checked={enabled} className={enabled ? "setting-switch is-on" : "setting-switch"} disabled={disabled} onClick={toggle} role="switch"><i/></button></div>; }
function accountInitials(value: string) { return value.split(/\s+/u).slice(0, 2).map((part) => part[0]?.toUpperCase()).join("") || "C"; }
function updateStatus(state: "idle" | "checking" | "current" | "error" | "installing") { return { checking: "Checking release storage…", current: `Version ${__APP_VERSION__} is current`, error: "Unable to check. Tap to retry.", installing: "Opening Android installer…", idle: "Authenticated release check" }[state]; }

function MobileConnect({ onConnected }: { onConnected: () => void }) {
  const [error, setError] = useState(""); const [pending, setPending] = useState(false);
  async function scan() { setPending(true); setError(""); try { await ensureScannerModule(); const result = await BarcodeScanner.scan({ formats: [BarcodeFormat.QrCode] }); const value = result.barcodes[0]?.rawValue || result.barcodes[0]?.displayValue; if (!value) throw new Error("No QR code was scanned."); await mobileApi.pair(value); onConnected(); } catch (reason) { setError(reason instanceof Error ? reason.message : "Could not connect this device."); } finally { setPending(false); } }
  return <main className="connect-page"><div className="connect-logo"><img alt="CodeLogicX" src="/logo/logo.svg"/></div><button disabled={pending} onClick={() => void scan()}>{pending ? <IonSpinner name="crescent"/> : "Scan to connect"}</button>{error ? <p>{error}</p> : null}<small className="connect-version">CodeLogicX v{__APP_VERSION__}</small></main>;
}

async function ensureScannerModule() {
  const { available } = await BarcodeScanner.isGoogleBarcodeScannerModuleAvailable();
  if (!available) await BarcodeScanner.installGoogleBarcodeScannerModule();
}

function renderPage(tab: Tab, data: MobileData, setTab: (tab: Tab | "agent" | "all") => void, load: () => Promise<void>, actorId: string) {
  if (tab === "ideas") return <IdeasPage ideas={data.ideas} create={async (input) => { await mobileApi.createIdea(input); await load(); }}/>;
  if (tab === "projects") return <ProjectsPage projects={data.projects} records={data.projectRecords}/>;
  if (tab === "tasks") return <TodosPage reload={load} save={(input, id) => mobileApi.saveTodo(input, id)} todos={data.todos}/>;
  if (tab === "messages") return <MessengerPage actorId={actorId} conversations={data.conversations} create={(memberId) => mobileApi.createConversation(memberId)} listContacts={() => mobileApi.listContacts()} listMessages={(id) => mobileApi.listMessages(id)} reload={load} send={(id, content) => mobileApi.sendMessage(id, content)}/>;
  return <HomePage data={data} open={(page) => setTab(page as Tab | "agent" | "all")}/>;
}
