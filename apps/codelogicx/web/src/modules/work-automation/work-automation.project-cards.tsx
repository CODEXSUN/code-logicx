import {
  ArchiveRestoreIcon,
  BanIcon,
  Clock3Icon,
  FolderOpenIcon,
  LinkIcon,
  PencilIcon,
  Trash2Icon,
} from "lucide-react";
import { Button } from "@codelogicx/ui/components/button";
import { GlobalLoader } from "@codelogicx/ui/components/global-loader";
import { WorkspaceRowActions } from "@codelogicx/ui/workspace/row-actions";
import { WorkspaceStatusBadge } from "@codelogicx/ui/workspace/status";
import { WorkspaceTableEmptyState } from "@codelogicx/ui/workspace/table";
import type { ProjectManagerRecord } from "../project-manager/project-manager.types";

type ProjectCardListProps = {
  loading: boolean;
  projects: ProjectManagerRecord[];
  records: ProjectManagerRecord[];
  onDeactivate(project: ProjectManagerRecord): void;
  onDelete(project: ProjectManagerRecord): void;
  onEdit(project: ProjectManagerRecord): void;
  onOpen(project: ProjectManagerRecord): void;
  onOpenWork(record: ProjectManagerRecord): void;
  onRestore(project: ProjectManagerRecord): void;
  onWhiteboards(project: ProjectManagerRecord): void;
};

export function ProjectCardList({
  loading,
  projects,
  records,
  onDeactivate,
  onDelete,
  onEdit,
  onOpen,
  onOpenWork,
  onRestore,
  onWhiteboards,
}: ProjectCardListProps) {
  if (loading) return <GlobalLoader className="min-h-48" fullScreen={false} />;
  if (!projects.length) {
    return (
      <WorkspaceTableEmptyState>
        No projects found. Create a project to start planning the work.
      </WorkspaceTableEmptyState>
    );
  }

  return (
    <div className="grid grid-cols-1 gap-x-6 gap-y-7 @3xl/main:grid-cols-2 @7xl/main:grid-cols-3">
      {projects.map((project) => {
        const summary = projectSummary(project, records);
        const visual = projectVisual(project);
        return (
          <article
            className="group flex cursor-pointer flex-col overflow-hidden rounded-lg border border-border/90 bg-card shadow-[0_8px_24px_-18px_rgba(15,23,42,0.65)] transition-[transform,box-shadow,border-color] duration-200 ease-out hover:-translate-y-1 hover:border-primary/40 hover:shadow-[0_14px_32px_-18px_rgba(15,23,42,0.72)]"
            key={project.id}
            role="link"
            tabIndex={0}
            onClick={() => onOpen(project)}
            onKeyDown={(event) => {
              if (event.key === "Enter" || event.key === " ") {
                event.preventDefault();
                onOpen(project);
              }
            }}
          >
            <div className={`flex h-[4.5rem] shrink-0 items-center gap-3 bg-gradient-to-b px-4 ${visual.gradient}`}>
              <div
                aria-label={`${project.title} logo`}
                className="grid size-11 shrink-0 place-items-center rounded-xl border bg-background/90 text-sm font-bold tracking-tight text-foreground shadow-sm backdrop-blur-sm"
              >
                {visual.mark}
              </div>
              <span className="font-mono text-sm font-bold tracking-wide text-foreground/65">{project.key}</span>
              <div className="ml-auto rounded-full bg-background/90 p-0.5 shadow-sm backdrop-blur-sm">
                <ProgressCircle value={summary.progress} />
              </div>
            </div>

            <div className="flex flex-1 flex-col p-4">
              <div className="min-w-0">
                <button
                  className="max-w-full text-left text-lg font-semibold leading-tight hover:text-primary"
                  type="button"
                  onClick={(event) => {
                    event.stopPropagation();
                    onOpen(project);
                  }}
                >
                  {project.title}
                </button>
                <p className="mt-2 line-clamp-2 text-sm leading-6 text-muted-foreground">
                  {plainText(project.description) || "No project description added."}
                </p>
              </div>

              <div className="mt-4 grid min-h-32 grid-cols-[minmax(0,1.15fr)_minmax(9rem,0.85fr)] overflow-hidden rounded-lg bg-muted/20">
                <div className="flex min-w-0 items-start gap-2 px-3 py-3" aria-label="Recent work">
                  <Clock3Icon className="mt-0.5 size-3.5 shrink-0 text-muted-foreground" />
                  <div className="min-w-0 flex-1">
                    {summary.recent.map((work) => (
                      <button
                        className="block w-full min-w-0 border-b border-border/60 py-1.5 text-left first:pt-0 last:border-b-0 last:pb-0 hover:text-primary"
                        key={work.id}
                        type="button"
                        onClick={(event) => {
                          event.stopPropagation();
                          onOpenWork(work);
                        }}
                      >
                        <span className="block min-w-0 leading-tight">
                          <span className="block truncate text-xs font-medium text-foreground/75" title={work.title}>
                            {work.title}
                          </span>
                          <span className="flex min-w-0 items-center justify-between gap-2 pt-0.5 text-[10px] text-muted-foreground">
                            <span className="truncate">{displayName(work.assignee)}</span>
                            <span className="shrink-0 tabular-nums">{compactAge(work.updatedAt)}</span>
                          </span>
                        </span>
                      </button>
                    ))}
                  </div>
                </div>
                <div className="grid content-center gap-3 border-l border-border/50 bg-background/35 px-3 py-3" aria-label="Project work totals">
                  <WorkMetric label="Task" value={summary.tasks.count} progress={summary.tasks.progress} />
                  <WorkMetric label="Action" value={summary.actions.count} progress={summary.actions.progress} />
                  <WorkMetric label="Review" value={summary.reviews.count} progress={summary.reviews.progress} />
                </div>
              </div>

              <div className="mt-auto flex items-end justify-between gap-3 pt-4">
                <div className="flex min-w-0 flex-col items-start gap-2">
                  <WorkspaceStatusBadge
                    label={project.active ? title(project.status) : "Inactive"}
                    tone={project.active ? statusTone(project.status) : "neutral"}
                  />
                  <div className="max-w-full truncate text-xs text-muted-foreground">
                    {project.assignee ? `Owner: ${project.assignee}` : "Owner not assigned"}
                  </div>
                </div>
                <div className="flex shrink-0 items-center gap-2">
                  <Button
                    aria-label={`Open ${project.title}`}
                    size="icon"
                    title="Open project"
                    variant="outline"
                    onClick={(event) => {
                      event.stopPropagation();
                      onOpen(project);
                    }}
                  >
                    <FolderOpenIcon className="size-4" />
                  </Button>
                  <div onClick={(event) => event.stopPropagation()}>
                    <WorkspaceRowActions
                  title={project.title}
                  actions={[
                    {
                      id: "whiteboards",
                      label: "Whiteboards",
                      icon: <LinkIcon className="size-4" />,
                      onSelect: () => onWhiteboards(project),
                    },
                    {
                      id: "edit",
                      label: "Edit",
                      icon: <PencilIcon className="size-4" />,
                      onSelect: () => onEdit(project),
                    },
                    project.active
                      ? {
                          id: "deactivate",
                          label: "Deactivate",
                          icon: <BanIcon className="size-4" />,
                          onSelect: () => onDeactivate(project),
                        }
                      : {
                          id: "restore",
                          label: "Restore",
                          icon: <ArchiveRestoreIcon className="size-4" />,
                          onSelect: () => onRestore(project),
                        },
                    {
                      id: "delete",
                      label: "Delete",
                      icon: <Trash2Icon className="size-4" />,
                      tone: "destructive",
                      onSelect: () => onDelete(project),
                    },
                  ]}
                    />
                  </div>
                </div>
              </div>
            </div>
          </article>
        );
      })}
    </div>
  );
}

function projectSummary(project: ProjectManagerRecord, records: ProjectManagerRecord[]) {
  const descendants = records.filter((record) => belongsToProject(record, project, records));
  const completed = descendants.filter((record) => isCompleted(record.status)).length;
  const recent = descendants.sort(
    (left, right) => Date.parse(right.updatedAt) - Date.parse(left.updatedAt),
  ).slice(0, 5);
  const tasks = kindSummary(descendants, "task");
  const actions = kindSummary(descendants, "activity");
  const reviews = kindSummary(descendants, "review");
  return {
    actions,
    recent: recent.length ? recent : [project],
    progress: descendants.length ? Math.round((completed / descendants.length) * 100) : projectProgress(project.status),
    reviews,
    tasks,
  };
}

function projectVisual(project: ProjectManagerRecord) {
  const fallback = project.title.trim().toLowerCase();
  const colorKey = project.colorKey || fallbackColor(fallback);
  return {
    gradient: projectGradient(colorKey),
    mark: project.logoText || fallbackMark(fallback) || initials(project.title),
  };
}

function projectGradient(colorKey: string) {
  if (colorKey === "violet") return "from-violet-400/35 via-violet-100/20 to-card";
  if (colorKey === "amber") return "from-amber-400/35 via-amber-100/20 to-card";
  if (colorKey === "blue") return "from-blue-400/35 via-blue-100/20 to-card";
  if (colorKey === "emerald") return "from-emerald-400/35 via-emerald-100/20 to-card";
  if (colorKey === "rose") return "from-rose-400/35 via-rose-100/20 to-card";
  if (colorKey === "indigo") return "from-indigo-400/35 via-indigo-100/20 to-card";
  return "from-slate-400/30 via-slate-100/15 to-card";
}

function fallbackColor(titleKey: string) {
  if (titleKey === "app.techmedia") return "violet";
  if (titleKey === "shop.techmedia") return "amber";
  if (titleKey === "cxapp") return "blue";
  if (titleKey === "tenkasi sports") return "emerald";
  if (titleKey === "tirupur connect") return "rose";
  if (titleKey === "cxshop") return "indigo";
  return "slate";
}

function fallbackMark(titleKey: string) {
  if (titleKey === "app.techmedia") return "TM";
  if (titleKey === "shop.techmedia") return "TS";
  if (titleKey === "cxapp") return "CX";
  if (titleKey === "tenkasi sports") return "TS";
  if (titleKey === "tirupur connect") return "TC";
  if (titleKey === "cxshop") return "CS";
  return "";
}

function initials(value: string) {
  const words = value.split(/[^a-z0-9]+/iu).filter(Boolean);
  if (words.length > 1) return words.slice(0, 2).map((word) => word[0]).join("").toUpperCase();
  return value.replace(/[^a-z0-9]/giu, "").slice(0, 2).toUpperCase() || "PR";
}

function belongsToProject(
  record: ProjectManagerRecord,
  project: ProjectManagerRecord,
  records: ProjectManagerRecord[],
): boolean {
  let current: ProjectManagerRecord | undefined = record;
  const visited = new Set<string>();
  while (current?.referenceId && !visited.has(current.id)) {
    visited.add(current.id);
    if (
      current.referenceType === "project" &&
      (current.referenceId === project.id || current.referenceId === project.key)
    ) {
      return true;
    }
    current = records.find(
      (candidate) =>
        candidate.id === current?.referenceId || candidate.key === current?.referenceId,
    );
  }
  return false;
}

function ProgressCircle({ value }: { value: number }) {
  const progress = clamp(value);
  const radius = 24;
  const circumference = 2 * Math.PI * radius;
  return (
    <div className="relative size-14" aria-label={`Overall project progress: ${progress}%`} role="img">
      <svg className="size-14 -rotate-90" viewBox="0 0 56 56" aria-hidden="true">
        <circle className="text-muted" cx="28" cy="28" fill="none" r={radius} stroke="currentColor" strokeWidth="4" />
        <circle className={progressStroke(progress)} cx="28" cy="28" fill="none" r={radius} stroke="currentColor" strokeDasharray={circumference} strokeDashoffset={circumference * (1 - progress / 100)} strokeLinecap="round" strokeWidth="4" />
      </svg>
      <span className="absolute inset-0 grid place-items-center text-xs font-semibold tabular-nums">{progress}%</span>
    </div>
  );
}

function WorkMetric({ label, progress, value }: { label: string; progress: number; value: number }) {
  const normalized = clamp(progress);
  return (
    <div className="min-w-0">
      <div className="flex items-baseline justify-between gap-3">
        <span className="truncate text-xs text-muted-foreground/75">{label}</span>
        <span className="text-sm font-medium tabular-nums text-foreground/45">{value}</span>
      </div>
      <svg className="mt-1.5 h-2 w-full overflow-visible" viewBox="0 0 100 8" preserveAspectRatio="none" role="img" aria-label={`${label} completion: ${normalized}%`}>
        <rect fill="currentColor" className="text-slate-200/65" height="8" rx="4" width="100" />
        <rect fill="currentColor" className={progressStroke(normalized)} height="8" rx="4" width={normalized} />
      </svg>
    </div>
  );
}

function kindSummary(records: ProjectManagerRecord[], kind: ProjectManagerRecord["kind"]) {
  const matching = records.filter((record) => record.kind === kind);
  const completed = matching.filter((record) => isCompleted(record.status)).length;
  return { count: matching.length, progress: matching.length ? Math.round(completed / matching.length * 100) : 0 };
}

function clamp(value: number) {
  return Math.max(0, Math.min(100, value));
}

function compactAge(updatedAt: string) {
  const elapsedMinutes = Math.max(0, Math.floor((Date.now() - Date.parse(updatedAt)) / 60_000));
  if (elapsedMinutes < 1) return "now";
  if (elapsedMinutes < 60) return `${elapsedMinutes}m`;
  const elapsedHours = Math.floor(elapsedMinutes / 60);
  if (elapsedHours < 24) return `${elapsedHours}h`;
  const elapsedDays = Math.floor(elapsedHours / 24);
  if (elapsedDays < 30) return `${elapsedDays}d`;
  const elapsedMonths = Math.floor(elapsedDays / 30);
  if (elapsedMonths < 12) return `${elapsedMonths}mo`;
  return `${Math.floor(elapsedMonths / 12)}y`;
}

function displayName(assignee: string) {
  const name = assignee.trim().split("@", 1)[0]?.replace(/[._-]+/g, " ").trim();
  if (!name) return "Unassigned";
  return name.replace(/\b\w/g, (character) => character.toUpperCase());
}

function progressStroke(value: number) {
  if (value >= 76) return "text-emerald-500";
  if (value >= 51) return "text-blue-500";
  if (value >= 26) return "text-amber-400";
  return "text-red-500";
}

function isCompleted(status: string) {
  return ["approved", "completed", "done", "released"].includes(status);
}

function projectProgress(status: string) {
  if (isCompleted(status)) return 100;
  if (status === "in-progress") return 40;
  if (status === "approved") return 20;
  return 0;
}

function statusTone(status: string) {
  if (isCompleted(status)) return "success" as const;
  if (status === "blocked") return "danger" as const;
  if (status === "on-hold") return "warning" as const;
  return "info" as const;
}

function plainText(value: string) {
  return value.replace(/<[^>]*>/gu, " ").replace(/\s+/gu, " ").trim();
}

function title(value: string) {
  return value.replaceAll("-", " ").replace(/\b\w/gu, (letter) => letter.toUpperCase());
}
