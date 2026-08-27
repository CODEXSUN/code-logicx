import { IonIcon, IonSpinner } from "@ionic/react";
import { arrowBackOutline, bulbOutline, chatbubbleOutline, chevronForwardOutline, ellipsisHorizontalOutline, folderOpenOutline, folderOutline, gridOutline, listOutline, timeOutline } from "ionicons/icons";
import { useState } from "react";
import type { Conversation, Idea, IdeaInput, MobileData, Project, ProjectRecord, Todo } from "./mobile-types";

export function HomePage({ data, open }: { data: MobileData; open: (page: string) => void }) {
  const metrics = [[active(data.projects), "Active projects", "projects"], [openTasks(data.todos), "Reviews waiting", "tasks"], [0, "Builds failed", "projects"], [0, "Deploys pending", "projects"]] as const;
  const recent = [...data.ideas.map((item) => ({ title: item.title, updatedAt: item.updatedAt })), ...data.projects.map((item) => ({ title: item.title, updatedAt: item.updatedAt }))].sort((left, right) => right.updatedAt.localeCompare(left.updatedAt)).slice(0, 3);
  return <section className="dashboard-page">
    <header className="dashboard-welcome"><h1>{greeting()}</h1><p>“Learn deliberately, build thoughtfully, and improve continuously.”</p></header>
    <div className="dashboard-metrics">{metrics.map(([value, label, page]) => <button key={label} onClick={() => open(page)}><strong>{value}</strong><span>{label}<IonIcon icon={chevronForwardOutline}/></span></button>)}</div>
    <nav className="dashboard-launchers" aria-label="Workspace shortcuts"><button aria-label="Projects" onClick={() => open("projects")}><IonIcon icon={folderOutline}/></button><button aria-label="Ideas" onClick={() => open("ideas")}><IonIcon icon={bulbOutline}/></button><button aria-label="Todos" onClick={() => open("tasks")}><IonIcon icon={listOutline}/></button><button aria-label="Agent" onClick={() => open("agent")}><AgentIcon/></button><button aria-label="All work" onClick={() => open("all")}><IonIcon icon={gridOutline}/></button></nav>
    <div className="dashboard-sections">
      <DashboardSection action={() => open("tasks")} title="Todos"><div className="dashboard-list">{data.todos.length ? data.todos.slice(0, 3).map((todo) => <button key={todo.id} onClick={() => open("tasks")}><span>{todo.title}</span><small>{todo.status}</small></button>) : <EmptyDashboard text="No task needs your focus today."/>}</div></DashboardSection>
      <DashboardSection title="Engineering health"><div className="health-list"><span>Build checks <b>Healthy ✓</b></span><span>Repository sync <b>Healthy ✓</b></span><span>Working trees <b>Clean ✓</b></span></div></DashboardSection>
      <DashboardSection action={() => open("projects")} title="Projects"><div className="dashboard-list">{data.projects.length ? data.projects.slice(0, 3).map((project) => <button key={project.id} onClick={() => open("projects")}><span>{project.title}</span><small>{project.status}</small></button>) : <EmptyDashboard text="No active projects yet."/>}</div></DashboardSection>
      <DashboardSection title="Recent actions"><div className="dashboard-list">{recent.length ? recent.map((item) => <div className="recent-row" key={`${item.title}-${item.updatedAt}`}><span>{item.title}</span><small>{relativeTime(item.updatedAt)}</small></div>) : <EmptyDashboard text="Your latest activity will appear here."/>}</div></DashboardSection>
    </div>
  </section>;
}

export function IdeasPage({ create, ideas }: { create: (input: IdeaInput) => Promise<void>; ideas: Idea[] }) {
  const [creating, setCreating] = useState(false);
  if (creating) return <IdeaCreateForm close={() => setCreating(false)} create={create}/>;
  return <Page className="ideas-page" eyebrow={false} title="Ideas" subtitle={`${ideas.length} discussions`} action="New idea" onAction={() => setCreating(true)}><CardList empty="No ideas from the cloud yet.">{ideas.map((idea) => <article className="content-card" key={idea.uuid}><CardTop eyebrow={`#${idea.referenceNumber} · ${idea.category}`} status={idea.status}/><h2>{idea.title}</h2><p>{idea.excerpt || "No short description provided."}</p><div className="tag-row">{idea.tags.slice(0, 3).map((tag) => <span key={tag}>#{tag}</span>)}</div><CardMeta comments={idea.commentCount} date={idea.updatedAt}/></article>)}</CardList></Page>;
}

export function ProjectsPage({ projects, records }: { projects: Project[]; records: ProjectRecord[] }) {
  return <Page className="projects-page" eyebrow={false} title="Projects" subtitle={`${projects.length} project spaces`}><CardList empty="No projects available.">{projects.map((project) => <ProjectMobileCard key={project.id} project={project} records={records}/>)}</CardList></Page>;
}

function ProjectMobileCard({ project, records }: { project: Project; records: ProjectRecord[] }) {
  const summary = projectSummary(project, records);
  return <article className="project-mobile-card">
    <header><span className="project-mark">{project.logoText || initials(project.title)}</span><strong>{project.key || "PROJECT"}</strong><ProgressRing value={summary.progress}/></header>
    <div className="project-mobile-copy"><h2>{project.title}</h2><p>{plainText(project.description) || "No project description added."}</p></div>
    <div className="project-work-grid">
      <div className="project-recent"><IonIcon icon={timeOutline}/><div>{summary.recent.slice(0, 3).map((item) => <span key={item.id}><strong>{item.title}</strong><small>{displayName(item.assignee)} · {compactAge(item.updatedAt)}</small></span>)}</div></div>
      <div className="project-metrics"><WorkMetric label="Task" {...summary.tasks}/><WorkMetric label="Action" {...summary.actions}/><WorkMetric label="Review" {...summary.reviews}/></div>
    </div>
    <footer><div><b>{project.active ? titleCase(project.status) : "Inactive"}</b><small>{project.assignee ? `Owner: ${project.assignee}` : "Owner not assigned"}</small></div><button aria-label={`Open ${project.title}`}><IonIcon icon={folderOpenOutline}/></button><button aria-label={`More options for ${project.title}`}><IonIcon icon={ellipsisHorizontalOutline}/></button></footer>
  </article>;
}

function ProgressRing({ value }: { value: number }) { const progress = clamp(value); return <div className="project-progress" aria-label={`Overall project progress: ${progress}%`} role="img" style={{ "--progress": `${progress * 3.6}deg` } as React.CSSProperties}><span>{progress}%</span></div>; }
function WorkMetric({ count, label, progress }: { count: number; label: string; progress: number }) { return <div><span><small>{label}</small><b>{count}</b></span><i><em style={{ width: `${clamp(progress)}%` }}/></i></div>; }

export function TasksPage({ todos }: { todos: Todo[] }) {
  return <Page title="Tasks" subtitle={`${todos.length} assigned items`}><CardList empty="No tasks available.">{todos.map((todo) => <article className="content-card" key={todo.id}><CardTop eyebrow={todo.priority || "Task"} status={todo.status}/><h2>{todo.title}</h2><p>{todo.description || "No task description."}</p><CardMeta date={todo.dueDate || todo.updatedAt}/></article>)}</CardList></Page>;
}

export function MessagesPage({ conversations }: { conversations: Conversation[] }) {
  return <Page title="Messages" subtitle={`${conversations.length} conversations`}><CardList empty="No conversations yet.">{conversations.map((item) => <article className="conversation-card" key={item.id}><div className="avatar">{initials(item.title || item.members[0]?.name || "C")}</div><div><div className="conversation-title"><h2>{item.title || item.members.map((member) => member.name).join(", ")}</h2>{item.unreadCount ? <strong>{item.unreadCount}</strong> : null}</div><p>{item.lastMessage?.content || "Start the conversation"}</p><small>{relativeTime(item.updatedAt)}</small></div></article>)}</CardList></Page>;
}

export function LoadingPage() { return <div className="loading-page"><IonSpinner name="crescent"/><span>Syncing cloud data</span></div>; }
export function ErrorPage({ message, retry }: { message: string; retry: () => void }) { return <div className="loading-page"><strong>Cloud connection unavailable</strong><span>{message}</span><button onClick={retry}>Try again</button></div>; }
function IdeaCreateForm({ close, create }: { close: () => void; create: (input: IdeaInput) => Promise<void> }) {
  const [form, setForm] = useState<IdeaInput>({ category: "General", content: "", status: "open", tags: [], title: "", visibility: "private" });
  const [tagText, setTagText] = useState(""); const [error, setError] = useState(""); const [saving, setSaving] = useState(false);
  async function submit(event: React.FormEvent) { event.preventDefault(); if (!form.title.trim() || !form.content.trim()) return setError("Add a title and idea details before saving."); setSaving(true); setError(""); try { await create({ ...form, tags: normalizeTags(tagText) }); close(); } catch (reason) { setError(reason instanceof Error ? reason.message : "Could not save this idea."); } finally { setSaving(false); } }
  return <section className="idea-create-page"><header><button aria-label="Back to ideas" onClick={close}><IonIcon icon={arrowBackOutline}/></button><div><p>NEW IDEA</p><h1>Start a discussion</h1></div></header><form onSubmit={(event) => void submit(event)}><label>Title<input autoFocus maxLength={240} onChange={(event) => setForm({ ...form, title: event.target.value })} placeholder="What should the team explore?" value={form.title}/></label><label>Idea details<textarea maxLength={2000000} onChange={(event) => setForm({ ...form, content: event.target.value })} placeholder="Explain the problem, proposal, trade-offs, and feedback you need…" rows={8} value={form.content}/></label><div className="idea-form-pair"><label>Category<select onChange={(event) => setForm({ ...form, category: event.target.value })} value={form.category}>{["General", "Product", "Engineering", "Design", "Research", "Operations"].map((value) => <option key={value}>{value}</option>)}</select></label><label>Status<select onChange={(event) => setForm({ ...form, status: event.target.value })} value={form.status}>{["open", "planned", "in-progress", "completed", "archived"].map((value) => <option key={value} value={value}>{titleCase(value)}</option>)}</select></label></div><label>Tags<input maxLength={400} onChange={(event) => setTagText(event.target.value)} placeholder="mobile, workflow, planning" value={tagText}/><small>Separate tags with commas.</small></label><label className="visibility-choice"><input checked={form.visibility === "public"} onChange={(event) => setForm({ ...form, visibility: event.target.checked ? "public" : "private" })} type="checkbox"/><span><strong>Share publicly</strong><small>New ideas are private by default.</small></span></label>{error ? <p className="idea-form-error" role="alert">{error}</p> : null}<footer><button onClick={close} type="button">Cancel</button><button disabled={saving} type="submit">{saving ? "Saving…" : "Save private idea"}</button></footer></form></section>;
}
function Page({ action, children, className, eyebrow = true, onAction, subtitle, title }: { action?: string; children: React.ReactNode; className?: string; eyebrow?: boolean; onAction?: () => void; subtitle: string; title: string }) { return <section className={`mobile-page${className ? ` ${className}` : ""}`}><header><div>{eyebrow ? <p>CODELOGICX</p> : null}<h1>{title}</h1><span>{subtitle}</span></div>{action ? <button onClick={onAction}>{action}</button> : null}</header>{children}</section>; }
function CardList({ children, empty }: { children: React.ReactNode[]; empty: string }) { return <div className="card-list">{children.length ? children : <div className="empty-card">{empty}</div>}</div>; }
function CardTop({ eyebrow, status }: { eyebrow: string; status: string }) { return <div className="card-top"><span>{eyebrow}</span><b>{status}</b></div>; }
function CardMeta({ comments, date }: { comments?: number; date: string }) { return <footer className="card-meta"><span><IonIcon icon={timeOutline}/>{relativeTime(date)}</span>{comments !== undefined ? <span><IonIcon icon={chatbubbleOutline}/>{comments}</span> : null}</footer>; }
function DashboardSection({ action, children, title }: { action?: () => void; children: React.ReactNode; title: string }) { return <section className="dashboard-section"><header><h2>{title}</h2>{action ? <button onClick={action}>View all</button> : null}</header>{children}</section>; }
function EmptyDashboard({ text }: { text: string }) { return <div className="dashboard-empty">{text}</div>; }
function greeting() { const hour = new Date().getHours(); if (hour < 12) return "Good morning"; if (hour < 17) return "Good afternoon"; return "Good evening"; }
function active(projects: Project[]) { return projects.filter((item) => item.status.toLowerCase() !== "completed").length; }
function openTasks(todos: Todo[]) { return todos.filter((item) => item.status.toLowerCase() !== "done").length; }
function unread(items: Conversation[]) { return items.reduce((sum, item) => sum + item.unreadCount, 0); }
function projectSummary(project: Project, records: ProjectRecord[]) { const descendants = records.filter((record) => belongsToProject(record, project, records)); const completed = descendants.filter((record) => isCompleted(record.status)).length; const recent = [...descendants].sort((left, right) => Date.parse(right.updatedAt) - Date.parse(left.updatedAt)); return { actions: kindSummary(descendants, "activity"), progress: descendants.length ? Math.round(completed / descendants.length * 100) : projectProgress(project.status), recent: recent.length ? recent : [project], reviews: kindSummary(descendants, "review"), tasks: kindSummary(descendants, "task") }; }
function belongsToProject(record: ProjectRecord, project: Project, records: ProjectRecord[]) { let current: ProjectRecord | undefined = record; const visited = new Set<string>(); while (current?.referenceId && !visited.has(current.id)) { visited.add(current.id); if (current.referenceType === "project" && [project.id, project.key].includes(current.referenceId)) return true; current = records.find((candidate) => candidate.id === current?.referenceId || candidate.key === current?.referenceId); } return false; }
function kindSummary(records: ProjectRecord[], kind: string) { const matching = records.filter((record) => record.kind === kind); const completed = matching.filter((record) => isCompleted(record.status)).length; return { count: matching.length, progress: matching.length ? Math.round(completed / matching.length * 100) : 0 }; }
function isCompleted(status: string) { return ["approved", "completed", "done", "released"].includes(status.toLowerCase()); }
function projectProgress(status: string) { if (isCompleted(status)) return 100; if (status === "in-progress") return 40; if (status === "approved") return 20; return 0; }
function clamp(value: number) { return Math.max(0, Math.min(100, value)); }
function compactAge(value: string) { const minutes = Math.max(0, Math.floor((Date.now() - Date.parse(value)) / 60000)); if (minutes < 1) return "now"; if (minutes < 60) return `${minutes}m`; const hours = Math.floor(minutes / 60); return hours < 24 ? `${hours}h` : `${Math.floor(hours / 24)}d`; }
function displayName(value: string) { const name = value.trim().split("@", 1)[0]?.replace(/[._-]+/gu, " ").trim(); return name ? titleCase(name) : "Unassigned"; }
function relativeTime(value: string) { const time = new Date(value).getTime(); if (!Number.isFinite(time)) return "Recently"; const minutes = Math.max(1, Math.round((Date.now() - time) / 60000)); if (minutes < 60) return `${minutes}m ago`; const hours = Math.round(minutes / 60); return hours < 24 ? `${hours}h ago` : `${Math.round(hours / 24)}d ago`; }
function initials(value: string) { return value.split(/\s+/u).slice(0, 2).map((part) => part[0]?.toUpperCase()).join(""); }
function plainText(value: string) { return new DOMParser().parseFromString(value, "text/html").body.textContent?.trim() ?? ""; }
function normalizeTags(value: string) { return [...new Set(value.split(",").map((tag) => tag.trim().replace(/^#+/u, "").replace(/\s+/gu, "-").slice(0, 48)).filter(Boolean))].slice(0, 20); }
function titleCase(value: string) { return value.replaceAll("-", " ").replace(/\b\w/gu, (letter) => letter.toUpperCase()); }
function AgentIcon() { return <svg aria-hidden="true" className="agent-icon" fill="none" viewBox="0 0 24 24"><path d="M9 4h6M12 2v2M6.5 7h11A2.5 2.5 0 0 1 20 9.5v7a2.5 2.5 0 0 1-2.5 2.5h-11A2.5 2.5 0 0 1 4 16.5v-7A2.5 2.5 0 0 1 6.5 7Z"/><path d="M8 13h.01M16 13h.01M9 16h6M2 11v4M22 11v4"/></svg>; }
