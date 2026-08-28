import { formatDistanceToNow } from "date-fns";
import {
  ActivityIcon,
  CalendarDaysIcon,
  CheckCircle2Icon,
  CircleDotIcon,
  ListChecksIcon,
  ListTreeIcon,
  PlusIcon,
  UserRoundIcon
} from "lucide-react";
import { Button } from "@codelogicx/ui/components/button";
import { WorkspaceStatusBadge } from "@codelogicx/ui/workspace/status";
import type { ProjectManagerRecord } from "../project-manager/project-manager.types";
import { recordProgress } from "../project-manager/project-manager.progress";
import { ProjectDevelopmentTabs } from "./work-automation.project-development";

type ProjectDashboardProps = {
  project: ProjectManagerRecord;
  records: ProjectManagerRecord[];
  onAddIssue(): void;
  onOpenAction(action: ProjectManagerRecord): void;
  onOpenIssues(): void;
  onOpenTask(task: ProjectManagerRecord): void;
};

export function ProjectDashboard({
  project,
  records,
  onAddIssue,
  onOpenAction,
  onOpenIssues,
  onOpenTask
}: ProjectDashboardProps) {
  const descendants = records.filter((record) => belongsToProject(record, project, records));
  const issues = descendants.filter((record) => record.kind === "issue");
  const tasks = descendants.filter((record) => record.kind === "task");
  const actions = descendants
    .filter((record) => record.kind === "activity")
    .sort((left, right) => Date.parse(right.updatedAt) - Date.parse(left.updatedAt));
  const completed = descendants.filter((record) => isCompleted(record.status)).length;
  const blocked = descendants.filter((record) => record.status === "blocked").length;
  const progress = descendants.length ? recordProgress(project, [project, ...descendants]) : 0;
  const recent = [project, ...descendants]
    .sort((left, right) => Date.parse(right.updatedAt) - Date.parse(left.updatedAt))
    .slice(0, 6);
  const mark = project.logoText || initials(project.title);

  return (
    <div className="grid gap-6">
      <section
        className={`overflow-hidden rounded-xl border bg-gradient-to-b ${projectGradient(project.colorKey)}`}
      >
        <div className="flex flex-col gap-6 p-6 lg:flex-row lg:items-start lg:justify-between">
          <div className="flex min-w-0 items-start gap-4">
            <div className="grid size-16 shrink-0 place-items-center rounded-2xl border bg-background/90 text-xl font-bold shadow-sm">
              {mark}
            </div>
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <span className="font-mono text-xs text-muted-foreground">{project.key}</span>
                <WorkspaceStatusBadge
                  label={project.active ? title(project.status) : "Inactive"}
                  tone={project.active ? statusTone(project.status) : "neutral"}
                />
              </div>
              <h2 className="mt-2 text-2xl font-semibold tracking-tight">{project.title}</h2>
              <p className="mt-2 max-w-3xl text-sm leading-6 text-muted-foreground">
                {plainText(project.description) || "No project overview has been added yet."}
              </p>
            </div>
          </div>
        </div>
      </section>

      <ProjectDevelopmentTabs
        project={project}
        records={records}
        overview={
          <div className="grid gap-6">
            <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
              <Metric
                label="Overall progress"
                value={`${progress}%`}
                detail={`${completed} completed items`}
              />
              <Metric
                label="Modules"
                value={String(issues.length)}
                detail={`${activeCount(issues)} active`}
              />
              <Metric
                label="Total work"
                value={String(descendants.length)}
                detail="Across the delivery hierarchy"
              />
              <Metric
                label="Blocked"
                value={String(blocked)}
                detail={blocked ? "Needs attention" : "No blockers"}
                danger={blocked > 0}
              />
            </section>

            <section
              aria-label="Open modules list"
              className="cursor-pointer rounded-xl border bg-card p-5 transition-[border-color,box-shadow,transform] hover:-translate-y-0.5 hover:border-foreground/25 hover:shadow-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              role="link"
              tabIndex={0}
              onClick={onOpenIssues}
              onKeyDown={(event) => {
                if (event.target !== event.currentTarget) return;
                if (event.key === "Enter" || event.key === " ") {
                  event.preventDefault();
                  onOpenIssues();
                }
              }}
            >
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <h3 className="font-semibold">Module overview</h3>
                  <p className="mt-1 text-sm text-muted-foreground">
                    Current delivery state for this project.
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={(event) => {
                      event.stopPropagation();
                      onOpenIssues();
                    }}
                  >
                    <ListTreeIcon className="size-4" />
                    View modules
                  </Button>
                  <Button
                    size="sm"
                    onClick={(event) => {
                      event.stopPropagation();
                      onAddIssue();
                    }}
                  >
                    <PlusIcon className="size-4" />
                    Add module
                  </Button>
                </div>
              </div>
              <div className="mt-5 grid gap-3">
                {issues.length ? (
                  issues.slice(0, 6).map((issue) => (
                    <OverviewRecordRow
                      icon={CircleDotIcon}
                      key={issue.id}
                      record={issue}
                      onClick={onOpenIssues}
                    />
                  ))
                ) : (
                  <div className="rounded-lg border border-dashed p-8 text-center">
                    <div className="text-sm font-medium">No modules added</div>
                    <p className="mt-1 text-sm text-muted-foreground">
                      Create the first module to begin delivery planning.
                    </p>
                    <Button
                      className="mt-4"
                      size="sm"
                      onClick={(event) => {
                        event.stopPropagation();
                        onAddIssue();
                      }}
                    >
                      <PlusIcon className="size-4" /> Add module
                    </Button>
                  </div>
                )}
              </div>
            </section>

            <div className="grid items-start gap-6 xl:grid-cols-2">
              <OverviewRecordSection
                description="Project tasks linked through the module hierarchy."
                emptyDescription="Add tasks from a module to track project delivery."
                emptyLabel="No tasks added"
                icon={ListChecksIcon}
                records={tasks.slice(0, 8)}
                title="Tasks"
                onOpen={onOpenTask}
              />
              <OverviewRecordSection
                description="Latest project actions, ordered by recent updates."
                emptyDescription="Actions appear here when work begins on a task."
                emptyLabel="No actions added"
                icon={ActivityIcon}
                records={actions.slice(0, 8)}
                title="Actions"
                onOpen={onOpenAction}
              />
            </div>

            <div className="grid items-start gap-6 xl:grid-cols-2">
                <section className="rounded-xl border bg-card p-5">
                  <h3 className="font-semibold">Project details</h3>
                  <div className="mt-4 grid gap-4">
                    <Detail
                      icon={UserRoundIcon}
                      label="Owner"
                      value={project.assignee || "Not assigned"}
                    />
                    <Detail icon={ListTreeIcon} label="Type" value={title(project.type)} />
                    <Detail
                      icon={CalendarDaysIcon}
                      label="Planned start"
                      value={formatDate(project.startDate)}
                    />
                    <Detail
                      icon={CheckCircle2Icon}
                      label="Target finish"
                      value={formatDate(project.dueDate)}
                    />
                  </div>
                </section>

                <section className="rounded-xl border bg-card p-5">
                  <h3 className="font-semibold">Recent project actions</h3>
                  <div className="mt-4 divide-y">
                    {recent.map((record) => (
                      <div
                        className="flex items-start gap-3 py-3 first:pt-0 last:pb-0"
                        key={`${record.kind}-${record.id}`}
                      >
                        <div className="grid size-9 shrink-0 place-items-center rounded-full bg-muted">
                          <ActivityIcon className="size-4 text-muted-foreground" />
                        </div>
                        <div className="min-w-0 flex-1">
                          <div className="truncate text-sm font-medium">{record.title}</div>
                          <div className="mt-0.5 text-xs text-muted-foreground">
                            {title(record.kind)} · {record.key}
                          </div>
                          <div className="mt-1 text-xs text-muted-foreground">
                            {formatDistanceToNow(new Date(record.updatedAt), { addSuffix: true })}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </section>
            </div>
          </div>
        }
      />
    </div>
  );
}

function OverviewRecordRow({
  icon: Icon,
  onClick,
  record
}: {
  icon: typeof CircleDotIcon;
  onClick(): void;
  record: ProjectManagerRecord;
}) {
  return (
    <button
      className="flex w-full items-center gap-3 rounded-lg border border-transparent bg-muted/35 p-3 text-left transition-colors hover:border-border hover:bg-muted/65"
      type="button"
      onClick={(event) => {
        event.stopPropagation();
        onClick();
      }}
    >
      <Icon className="size-4 shrink-0 text-primary" />
      <span className="min-w-0 flex-1">
        <span className="block truncate text-sm font-medium">{record.title}</span>
        <span className="mt-1 block truncate font-mono text-xs text-muted-foreground">
          {record.key} · {title(record.status)}
        </span>
      </span>
      <WorkspaceStatusBadge label={title(record.status)} tone={statusTone(record.status)} />
    </button>
  );
}

function OverviewRecordSection({
  description,
  emptyDescription,
  emptyLabel,
  icon,
  onOpen,
  records,
  title: sectionTitle
}: {
  description: string;
  emptyDescription: string;
  emptyLabel: string;
  icon: typeof CircleDotIcon;
  onOpen(record: ProjectManagerRecord): void;
  records: ProjectManagerRecord[];
  title: string;
}) {
  return (
    <section className="rounded-xl border bg-card p-5">
      <div>
        <h3 className="font-semibold">{sectionTitle}</h3>
        <p className="mt-1 text-sm text-muted-foreground">{description}</p>
      </div>
      <div className="mt-5 grid gap-3">
        {records.length ? (
          records.map((record) => (
            <OverviewRecordRow
              icon={icon}
              key={record.id}
              record={record}
              onClick={() => onOpen(record)}
            />
          ))
        ) : (
          <div className="rounded-lg border border-dashed p-8 text-center">
            <div className="text-sm font-medium">{emptyLabel}</div>
            <p className="mt-1 text-sm text-muted-foreground">{emptyDescription}</p>
          </div>
        )}
      </div>
    </section>
  );
}

function Metric({
  label,
  value,
  detail,
  danger = false
}: {
  label: string;
  value: string;
  detail: string;
  danger?: boolean;
}) {
  return (
    <div className="rounded-xl border bg-card p-5">
      <div className="text-sm text-muted-foreground">{label}</div>
      <div className={`mt-2 text-3xl font-semibold ${danger ? "text-destructive" : ""}`}>
        {value}
      </div>
      <div className="mt-1 text-xs text-muted-foreground">{detail}</div>
    </div>
  );
}

function Detail({
  icon: Icon,
  label,
  value
}: {
  icon: typeof UserRoundIcon;
  label: string;
  value: string;
}) {
  return (
    <div className="flex items-center gap-3">
      <Icon className="size-4 shrink-0 text-muted-foreground" />
      <div className="min-w-0">
        <div className="text-xs text-muted-foreground">{label}</div>
        <div className="truncate text-sm font-medium">{value}</div>
      </div>
    </div>
  );
}

function belongsToProject(
  record: ProjectManagerRecord,
  project: ProjectManagerRecord,
  records: ProjectManagerRecord[]
) {
  let current: ProjectManagerRecord | undefined = record;
  const visited = new Set<string>();
  while (current?.referenceId && !visited.has(current.id)) {
    visited.add(current.id);
    if (
      current.referenceType === "project" &&
      [project.id, project.key].includes(current.referenceId)
    )
      return true;
    current = records.find(
      (candidate) => candidate.id === current?.referenceId || candidate.key === current?.referenceId
    );
  }
  return false;
}

function activeCount(records: ProjectManagerRecord[]) {
  return records.filter(
    (record) => record.active && !isCompleted(record.status) && record.status !== "blocked"
  ).length;
}
function isCompleted(status: string) {
  return ["approved", "completed", "done", "released"].includes(status);
}
function plainText(value: string) {
  return value
    .replace(/<[^>]*>/gu, " ")
    .replace(/\s+/gu, " ")
    .trim();
}
function initials(value: string) {
  return (
    value
      .split(/[^a-z0-9]+/iu)
      .filter(Boolean)
      .slice(0, 2)
      .map((part) => part[0])
      .join("")
      .toUpperCase() || "PR"
  );
}
function title(value: string) {
  return value.replaceAll("-", " ").replace(/\b\w/gu, (letter) => letter.toUpperCase());
}
function statusTone(status: string) {
  return isCompleted(status)
    ? ("success" as const)
    : status === "blocked"
      ? ("danger" as const)
      : status === "on-hold"
        ? ("warning" as const)
        : ("info" as const);
}
function formatDate(value: string) {
  if (!value) return "Not set";
  const date = new Date(`${value}T00:00:00`);
  return Number.isNaN(date.valueOf())
    ? value
    : new Intl.DateTimeFormat("en-IN", { day: "2-digit", month: "short", year: "numeric" }).format(
        date
      );
}
function projectGradient(color: string) {
  return color === "violet"
    ? "from-violet-400/25 to-card"
    : color === "amber"
      ? "from-amber-400/25 to-card"
      : color === "blue"
        ? "from-blue-400/25 to-card"
        : color === "emerald"
          ? "from-emerald-400/25 to-card"
          : color === "rose"
            ? "from-rose-400/25 to-card"
            : color === "indigo"
              ? "from-indigo-400/25 to-card"
              : "from-slate-400/20 to-card";
}
