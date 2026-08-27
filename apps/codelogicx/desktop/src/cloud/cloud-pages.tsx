import { BriefcaseBusiness, CheckSquare2, Lightbulb, MessageCircle, Users } from "lucide-react";
import type { CloudData, CloudPage, CloudSession } from "./cloud-types";

export function CloudPageContent({
  data,
  page,
  session,
  setPage
}: {
  data: CloudData;
  page: CloudPage;
  session?: CloudSession | undefined;
  setPage: (page: CloudPage) => void;
}) {
  if (page === "ideas")
    return (
      <CloudList
        items={data.ideas.map((item) => ({
          detail: item.excerpt || "No short description provided.",
          meta: `${item.category} · ${relativeTime(item.updatedAt)}`,
          status: item.status,
          title: item.title
        }))}
        title="Ideas"
        subtitle={`${data.ideas.length} discussions from cloud`}
      />
    );
  if (page === "projects")
    return (
      <CloudList
        items={data.projects.map((item) => ({
          detail: plainText(item.description) || "Project planning and delivery workspace.",
          meta: item.priority || "Project",
          status: item.status,
          title: item.title
        }))}
        title="Projects"
        subtitle={`${data.projects.length} project spaces`}
      />
    );
  if (page === "tasks")
    return (
      <CloudList
        items={data.tasks.map((item) => ({
          detail: item.description || "No task description.",
          meta: item.dueDate ? `Due ${formatDate(item.dueDate)}` : relativeTime(item.updatedAt),
          status: item.status,
          title: item.title
        }))}
        title="Tasks"
        subtitle={`${data.tasks.length} assigned items`}
      />
    );
  if (page === "messages")
    return (
      <CloudList
        items={data.conversations.map((item) => ({
          detail: item.lastMessage?.content || "Start the conversation",
          meta: relativeTime(item.updatedAt),
          status: item.unreadCount ? `${item.unreadCount} unread` : "Read",
          title: item.title || item.members.map((member) => member.name).join(", ")
        }))}
        title="Messenger"
        subtitle={`${data.conversations.length} conversations`}
      />
    );
  return <CloudDashboard data={data} name={session?.name} setPage={setPage} />;
}

function CloudDashboard({
  data,
  name,
  setPage
}: {
  data: CloudData;
  name?: string | undefined;
  setPage: (page: CloudPage) => void;
}) {
  const openTasks = data.tasks.filter(
    (item) => !["done", "completed"].includes(item.status.toLowerCase())
  ).length;
  const unread = data.conversations.reduce((total, item) => total + item.unreadCount, 0);
  const metrics = [
    [data.projects.length, "Active projects", "projects"],
    [data.ideas.length, "Ideas", "ideas"],
    [openTasks, "Open tasks", "tasks"],
    [unread, "Unread messages", "messages"]
  ] as const;
  return (
    <div className="cloud-page cloud-dashboard">
      <header>
        <p>Cloud workspace</p>
        <h1>
          {greeting()}, {name?.split(" ")[0] || "Sundar"}
        </h1>
        <span>“Learn deliberately, build thoughtfully, and improve continuously.”</span>
      </header>
      <section className="cloud-metrics">
        {metrics.map(([value, label, target]) => (
          <button key={label} onClick={() => setPage(target)}>
            <strong>{value}</strong>
            <span>{label}</span>
          </button>
        ))}
      </section>
      <section className="cloud-dashboard-grid">
        <DashboardBlock
          icon={CheckSquare2}
          items={data.tasks.slice(0, 4).map((item) => ({ label: item.title, value: item.status }))}
          title="My work"
        />
        <DashboardBlock
          icon={Lightbulb}
          items={data.ideas
            .slice(0, 4)
            .map((item) => ({ label: item.title, value: relativeTime(item.updatedAt) }))}
          title="Recent ideas"
        />
        <DashboardBlock
          icon={BriefcaseBusiness}
          items={data.projects
            .slice(0, 4)
            .map((item) => ({ label: item.title, value: item.status }))}
          title="Projects"
        />
        <DashboardBlock
          icon={Users}
          items={data.conversations.slice(0, 4).map((item) => ({
            label: item.title || "Team conversation",
            value: item.unreadCount ? `${item.unreadCount} unread` : "Read"
          }))}
          title="Messenger"
        />
      </section>
    </div>
  );
}

function DashboardBlock({
  icon: Icon,
  items,
  title
}: {
  icon: typeof Lightbulb;
  items: Array<{ label: string; value: string }>;
  title: string;
}) {
  return (
    <section className="cloud-dashboard-block">
      <header>
        <span>
          <Icon size={17} />
        </span>
        <h2>{title}</h2>
      </header>
      {items.length ? (
        <div>
          {items.map((item) => (
            <p key={`${item.label}-${item.value}`}>
              <strong>{item.label}</strong>
              <span>{item.value}</span>
            </p>
          ))}
        </div>
      ) : (
        <p className="cloud-empty">Nothing needs attention.</p>
      )}
    </section>
  );
}

function CloudList({
  items,
  subtitle,
  title
}: {
  items: Array<{ detail: string; meta: string; status: string; title: string }>;
  subtitle: string;
  title: string;
}) {
  return (
    <div className="cloud-page cloud-list">
      <header>
        <p>CodeLogicX Cloud</p>
        <h1>{title}</h1>
        <span>{subtitle}</span>
      </header>
      {items.length ? (
        <section>
          {items.map((item, index) => (
            <article key={`${item.title}-${index}`}>
              <span className="cloud-list-icon">
                {title === "Ideas" ? (
                  <Lightbulb size={18} />
                ) : title === "Projects" ? (
                  <BriefcaseBusiness size={18} />
                ) : title === "Tasks" ? (
                  <CheckSquare2 size={18} />
                ) : (
                  <MessageCircle size={18} />
                )}
              </span>
              <div>
                <header>
                  <h2>{item.title}</h2>
                  <span>{item.status}</span>
                </header>
                <p>{item.detail}</p>
                <small>{item.meta}</small>
              </div>
            </article>
          ))}
        </section>
      ) : (
        <div className="cloud-empty-page">
          No {title.toLowerCase()} are available from this cloud account.
        </div>
      )}
    </div>
  );
}

function greeting() {
  const hour = new Date().getHours();
  return hour < 12 ? "Good morning" : hour < 17 ? "Good afternoon" : "Good evening";
}

function relativeTime(value: string) {
  const time = new Date(value).getTime();
  if (!Number.isFinite(time)) return "Recently";
  const minutes = Math.max(1, Math.round((Date.now() - time) / 60_000));
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.round(minutes / 60);
  return hours < 24 ? `${hours}h ago` : `${Math.round(hours / 24)}d ago`;
}

function formatDate(value: string) {
  const date = new Date(value);
  return Number.isFinite(date.getTime())
    ? date.toLocaleDateString([], { day: "numeric", month: "short" })
    : value;
}

function plainText(value: string) {
  return new DOMParser().parseFromString(value, "text/html").body.textContent?.trim() ?? "";
}
