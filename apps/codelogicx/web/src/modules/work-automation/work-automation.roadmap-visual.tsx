import { WorkspaceStatusBadge } from "@codelogicx/ui/workspace/status";
import {
  ArrowRightIcon,
  BotIcon,
  BoxesIcon,
  ListTodoIcon,
  ShieldCheckIcon,
  ZapIcon,
  type LucideIcon
} from "lucide-react";

import type { ProjectManagerRecord } from "../project-manager/project-manager.types";
import type { WorkflowRecords } from "./work-automation.workflow";

type RoadmapVisualProps = {
  records: WorkflowRecords;
  onAgentRecord(record: ProjectManagerRecord): void;
  onEditRecord(record: ProjectManagerRecord): void;
};

export function RoadmapVisual({ records, onAgentRecord, onEditRecord }: RoadmapVisualProps) {
  return (
    <div className="space-y-4">
      <div>
        <h3 className="font-semibold">Delivery roadmap</h3>
        <p className="text-sm text-muted-foreground">
          Follow each module through its connected tasks, actions, and reviews.
        </p>
      </div>
      {ordered(records.issues).map((module) => (
        <ModuleRoadmap
          key={module.id}
          module={module}
          onAgentRecord={onAgentRecord}
          onEditRecord={onEditRecord}
          records={records}
        />
      ))}
      {!records.issues.length ? (
        <div className="rounded-lg border border-dashed px-6 py-12 text-center text-sm text-muted-foreground">
          No module workflow found.
        </div>
      ) : null}
    </div>
  );
}

function ModuleRoadmap({ module, records, onAgentRecord, onEditRecord }: RoadmapVisualProps & {
  module: ProjectManagerRecord;
}) {
  const paths = roadmapPaths(module, records);
  const items = paths.flatMap((path) => [path.task, path.action, path.review]).filter(Boolean) as ProjectManagerRecord[];
  const completion = items.length
    ? Math.round((items.filter((item) => isComplete(item.status)).length / items.length) * 100)
    : 0;
  return (
    <section className="overflow-hidden rounded-lg border bg-card">
      <header className="flex flex-wrap items-center gap-4 border-b px-5 py-4">
        <span className="flex size-9 items-center justify-center rounded-lg bg-muted">
          <BoxesIcon className="size-4" />
        </span>
        <div className="min-w-0 flex-1">
          <button className="truncate text-left font-semibold hover:underline" onClick={() => onEditRecord(module)} type="button">
            {module.title}
          </button>
          <p className="pt-0.5 font-mono text-xs text-muted-foreground">{module.key}</p>
        </div>
        <WorkspaceStatusBadge label={`${completion}% complete`} tone={completion ? "success" : "info"} />
        <div className="h-1.5 w-full overflow-hidden rounded-full bg-muted">
          <div className="h-full rounded-full bg-emerald-500" style={{ width: `${completion}%` }} />
        </div>
      </header>
      <div className="overflow-x-auto px-5 py-5">
        <div className="min-w-[850px] space-y-3">
          <div className="grid grid-cols-[1fr_40px_1fr_40px_1fr] items-center text-xs font-medium uppercase tracking-[0.08em] text-muted-foreground/55">
            <span>Task</span><span /><span>Action</span><span /><span>Review</span>
          </div>
          {paths.map((path) => (
            <div className="grid grid-cols-[1fr_40px_1fr_40px_1fr] items-stretch" key={path.key}>
              <RoadmapNode icon={ListTodoIcon} onAgentRecord={onAgentRecord} onEditRecord={onEditRecord} record={path.task} stage="Task" />
              <RoadmapConnector />
              <RoadmapNode icon={ZapIcon} onAgentRecord={onAgentRecord} onEditRecord={onEditRecord} record={path.action} stage="Action" />
              <RoadmapConnector />
              <RoadmapNode icon={ShieldCheckIcon} onAgentRecord={onAgentRecord} onEditRecord={onEditRecord} record={path.review} stage="Review" />
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

function RoadmapNode({ record, stage, icon: Icon, onAgentRecord, onEditRecord }: {
  icon: LucideIcon;
  onAgentRecord(record: ProjectManagerRecord): void;
  onEditRecord(record: ProjectManagerRecord): void;
  record: ProjectManagerRecord | null;
  stage: string;
}) {
  if (!record) return <div className="flex min-h-28 items-center rounded-lg border border-dashed bg-muted/10 px-4 text-sm text-muted-foreground">No {stage.toLowerCase()}</div>;
  return (
    <article className="flex min-h-28 flex-col rounded-lg border bg-background p-4 transition-transform hover:-translate-y-0.5 hover:shadow-sm">
      <div className="flex items-start gap-3">
        <span className="flex size-8 shrink-0 items-center justify-center rounded-md bg-muted"><Icon className="size-4" /></span>
        <div className="min-w-0 flex-1">
          <button className="line-clamp-2 text-left text-sm font-semibold hover:underline" onClick={() => onEditRecord(record)} type="button">{record.title}</button>
          <p className="truncate pt-1 font-mono text-[11px] text-muted-foreground/70">{record.key}</p>
          {record.kind === "task" && record.dependencyIds.length ? (
            <p className="pt-1 text-[11px] text-muted-foreground">
              Depends on {record.dependencyIds.length} task
              {record.dependencyIds.length === 1 ? "" : "s"}
            </p>
          ) : null}
        </div>
        <button aria-label={`Ask agent about ${record.title}`} className="flex size-7 shrink-0 items-center justify-center rounded-md border text-muted-foreground hover:bg-muted hover:text-foreground" onClick={() => onAgentRecord(record)} type="button"><BotIcon className="size-3.5" /></button>
      </div>
      <div className="mt-auto flex items-end justify-between gap-2 pt-3">
        <WorkspaceStatusBadge label={pretty(record.status)} tone={statusTone(record.status)} />
        <span className="text-[11px] text-muted-foreground/60">{formatRange(record)}</span>
      </div>
    </article>
  );
}

function RoadmapConnector() {
  return <div className="flex items-center"><span className="h-px flex-1 bg-border" /><ArrowRightIcon className="size-4 text-muted-foreground/45" /></div>;
}

function roadmapPaths(module: ProjectManagerRecord, records: WorkflowRecords) {
  const paths: { action: ProjectManagerRecord | null; key: string; review: ProjectManagerRecord | null; task: ProjectManagerRecord | null }[] = [];
  const tasks = ordered(records.tasks.filter((task) => belongsTo(task, module)));
  for (const task of tasks) {
    const actions = ordered(records.actions.filter((action) => belongsTo(action, task)));
    if (!actions.length) paths.push({ action: null, key: `${task.id}:empty`, review: null, task });
    for (const action of actions) {
      const reviews = ordered(records.reviews.filter((review) => belongsTo(review, action)));
      if (!reviews.length) paths.push({ action, key: `${action.id}:empty`, review: null, task });
      for (const review of reviews) paths.push({ action, key: review.id, review, task });
    }
  }
  if (!paths.length) paths.push({ action: null, key: `${module.id}:empty`, review: null, task: null });
  return paths;
}

function belongsTo(child: ProjectManagerRecord, parent: ProjectManagerRecord) {
  return child.referenceType === parent.kind && (child.referenceId === parent.id || child.referenceId === parent.key);
}
function ordered(records: ProjectManagerRecord[]) {
  return [...records].sort((a, b) => a.createdAt.localeCompare(b.createdAt) || a.id.localeCompare(b.id));
}
function isComplete(status: string) { return ["approved", "completed", "done"].includes(status); }
function pretty(value: string) { return value.split("-").map((part) => part.charAt(0).toUpperCase() + part.slice(1)).join(" "); }
function statusTone(status: string): "danger" | "info" | "success" | "warning" {
  return isComplete(status) ? "success" : status === "blocked" ? "danger" : ["active", "in-progress", "in-review"].includes(status) ? "info" : "warning";
}
function formatRange(record: ProjectManagerRecord) {
  if (!record.startDate && !record.dueDate) return "Dates not set";
  return `${shortDate(record.startDate) || "Start"} – ${shortDate(record.dueDate) || "Open"}`;
}
function shortDate(value: string) {
  if (!value) return "";
  return new Intl.DateTimeFormat("en-IN", { day: "2-digit", month: "short" }).format(new Date(`${value}T00:00:00`));
}
