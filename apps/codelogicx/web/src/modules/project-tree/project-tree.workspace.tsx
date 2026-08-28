import { Button, Tree, type RenderTreeNodePayload } from "@codelogicx/ui";
import {
  BoxesIcon,
  ChartNoAxesGanttIcon,
  ChevronRightIcon,
  ExternalLinkIcon,
  FolderKanbanIcon,
  ListTodoIcon,
  MapIcon,
  PencilIcon,
  PlusIcon,
  ShieldCheckIcon,
  ZapIcon,
  type LucideIcon
} from "lucide-react";
import { useMemo, useState } from "react";

import { useProjectManagerRecordsQuery } from "../project-manager/project-manager.hooks";
import type {
  ProjectManagerKind,
  ProjectManagerRecord
} from "../project-manager/project-manager.types";
import {
  ProjectTreeEditor,
  type ProjectTreeEditorRequest
} from "./project-tree.editor";
import { ProjectTreeActionDock, type ProjectTreeAction } from "./project-tree.action-dock";
import { ProjectTreeDeliveryVisual } from "./project-tree.delivery-visual";
import {
  buildProjectTree,
  countTreeNodes,
  expandableTreeValues,
  findPlanningNode,
  type PlanningKind,
  type PlanningNode
} from "./project-tree.model";

const kindIcons: Record<PlanningKind, LucideIcon> = {
  action: ZapIcon,
  gantt: ChartNoAxesGanttIcon,
  module: BoxesIcon,
  project: FolderKanbanIcon,
  review: ShieldCheckIcon,
  roadmap: MapIcon,
  task: ListTodoIcon
};

export function ProjectTreeWorkspace() {
  const projects = useProjectManagerRecordsQuery("project");
  const modules = useProjectManagerRecordsQuery("issue");
  const tasks = useProjectManagerRecordsQuery("task");
  const actions = useProjectManagerRecordsQuery("activity");
  const reviews = useProjectManagerRecordsQuery("review");
  const [selectedValue, setSelectedValue] = useState("");
  const [editor, setEditor] = useState<ProjectTreeEditorRequest | null>(null);
  const projectTree = useMemo(
    () =>
      buildProjectTree({
        actions: actions.data ?? [],
        modules: modules.data ?? [],
        projects: projects.data ?? [],
        reviews: reviews.data ?? [],
        tasks: tasks.data ?? []
      }),
    [actions.data, modules.data, projects.data, reviews.data, tasks.data]
  );
  const selectedNode = useMemo(
    () => findPlanningNode(projectTree, selectedValue) ?? projectTree[0],
    [projectTree, selectedValue]
  );
  const records = useMemo(
    () => [
      ...(projects.data ?? []),
      ...(modules.data ?? []),
      ...(tasks.data ?? []),
      ...(actions.data ?? []),
      ...(reviews.data ?? [])
    ],
    [actions.data, modules.data, projects.data, reviews.data, tasks.data]
  );
  const selectedRecord = selectedNode
    ? records.find(
        (record) =>
          record.id === selectedNode.meta.recordId && record.kind === selectedNode.meta.recordKind
      )
    : undefined;
  const queries = [projects, modules, tasks, actions, reviews];
  const isLoading = queries.some((query) => query.isLoading);
  const error = queries.find((query) => query.error)?.error;

  return (
    <div className="flex min-h-[calc(100dvh-4rem)] min-w-0 flex-col overflow-x-hidden bg-background">
      <header className="flex min-h-12 items-center gap-2 border-b px-5 py-2 lg:px-6">
        <h1 className="truncate text-lg font-semibold tracking-tight">Project planning</h1>
        <CountBadge count={countTreeNodes(projectTree)} />
        <Button className="ml-auto" onClick={() => setEditor({ kind: "project" })} size="sm">
          <PlusIcon className="size-4" />
          Add new
        </Button>
      </header>

      <main className="grid min-h-0 min-w-0 flex-1 lg:grid-cols-[minmax(22rem,38rem)_minmax(0,1fr)]">
        <aside className="min-w-0 overflow-hidden border-b bg-card lg:border-b-0 lg:border-r">
          {isLoading ? <TreeMessage>Loading live project flow…</TreeMessage> : null}
          {error ? <TreeMessage>Unable to load projects: {error.message}</TreeMessage> : null}
          {!isLoading && !error && !projectTree.length ? (
            <TreeMessage>Create a project to begin its delivery tree.</TreeMessage>
          ) : null}
          {projectTree.length ? (
            <Tree
              className="space-y-1 px-4 pb-6 pt-2"
              data={projectTree}
              defaultExpandedValues={expandableTreeValues(projectTree)}
              key={expandableTreeValues(projectTree).join("|")}
              levelOffset={22}
              onNodeSelect={(value) => {
                setEditor(null);
                setSelectedValue(value);
              }}
              renderNode={(payload) => <PlanningTreeRow {...payload} />}
              {...(selectedNode ? { selectedValue: selectedNode.value } : {})}
              withLines
            />
          ) : null}
        </aside>

        {editor ? (
          <ProjectTreeEditor
            key={`${editor.kind}:${editor.record?.id ?? editor.parent?.id ?? "new"}`}
            onClose={() => setEditor(null)}
            records={records}
            request={editor}
          />
        ) : selectedNode && ["roadmap", "gantt"].includes(selectedNode.meta.kind) ? (
          <ProjectTreeDeliveryVisual
            actions={actions.data ?? []}
            modules={modules.data ?? []}
            node={selectedNode}
            onEdit={(record) => setEditor({ kind: record.kind, record })}
            projects={projects.data ?? []}
            reviews={reviews.data ?? []}
            tasks={tasks.data ?? []}
          />
        ) : selectedNode ? (
          <PlanningDetails
            node={selectedNode}
            onAddChild={(kind, parent) => setEditor({ kind, parent })}
            onEdit={(record) => setEditor({ kind: record.kind, record })}
            {...(selectedRecord ? { record: selectedRecord } : {})}
          />
        ) : (
          <EmptyDetails />
        )}
      </main>
    </div>
  );
}

function PlanningTreeRow(payload: RenderTreeNodePayload) {
  const node = payload.node as PlanningNode;
  const Icon = kindIcons[node.meta.kind];
  const projectTone = node.meta.kind === "project" ? projectColorTone(node.meta.colorKey) : null;
  return (
    <button
      {...payload.elementProps}
      className={`group flex h-11 w-full items-center gap-2.5 rounded-md pr-2 text-left outline-none transition-colors hover:bg-muted/70 focus-visible:ring-2 focus-visible:ring-ring ${
        projectTone?.row ?? ""
      } ${payload.selected ? "ring-1 ring-inset ring-foreground/10" : ""}`}
      type="button"
    >
      <span className="flex size-4 shrink-0 items-center justify-center">
        {payload.hasChildren ? (
          <ChevronRightIcon
            className={`size-3.5 transition-transform ${payload.expanded ? "rotate-90" : ""}`}
          />
        ) : null}
      </span>
      <span
        className={`flex size-7 shrink-0 items-center justify-center rounded-md ${
          projectTone?.icon ?? "bg-muted"
        }`}
      >
        <Icon className="size-3.5" />
      </span>
      <span className="flex min-w-0 flex-1 items-center gap-2">
        <span className="shrink-0 rounded bg-foreground/[0.65] px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-background">
          {planningKindLabel(node.meta.kind)} :
        </span>
        <span className="truncate text-sm font-medium">{node.label}</span>
      </span>
      <CountBadge count={node.children?.length ?? 0} />
      <ProgressBadge value={node.meta.progress} />
      <StatusBadge status={node.meta.status} />
    </button>
  );
}

function PlanningDetails({
  node,
  onAddChild,
  onEdit,
  record
}: {
  node: PlanningNode;
  onAddChild(kind: ProjectManagerKind, parent: ProjectManagerRecord): void;
  onEdit(record: ProjectManagerRecord): void;
  record?: ProjectManagerRecord;
}) {
  const childKind = record ? nextChildKind(record.kind) : null;
  const dockActions: ProjectTreeAction[] = [
    ...(record
      ? [
          {
            icon: PencilIcon,
            label: `Edit ${kindLabel(record.kind)}`,
            onSelect: () => onEdit(record)
          }
        ]
      : []),
    ...(record && childKind
      ? [
          {
            icon: PlusIcon,
            label: `Add ${kindLabel(childKind)}`,
            onSelect: () => onAddChild(childKind, record)
          }
        ]
      : []),
    {
      icon: ExternalLinkIcon,
      label: `Open ${node.meta.kind}`,
      onSelect: () => window.location.assign(node.meta.href),
      primary: true
    }
  ];
  return (
    <section className="min-w-0 px-5 py-7 lg:px-10 lg:py-9">
      <div className="mx-auto grid max-w-5xl gap-10 lg:grid-cols-[minmax(0,1.5fr)_minmax(15rem,0.75fr)] lg:gap-14">
        <div className="min-w-0">
          <DataLabel>Reference no</DataLabel>
          <p className="break-all pt-1 font-mono text-sm font-medium">{node.meta.reference}</p>

          <div className="pt-8">
            <DataLabel>Title</DataLabel>
            <h2 className="pt-2 text-3xl font-semibold tracking-tight lg:text-4xl">{node.label}</h2>
          </div>

          <div className="pt-8">
            <DataLabel>Message</DataLabel>
            <p className="max-w-2xl pt-2 text-base leading-7 text-muted-foreground">
              {node.meta.description}
            </p>
          </div>
        </div>

        <div className="flex min-h-[calc(100dvh-10rem)] min-w-0 flex-col lg:border-l lg:pl-10">
          <dl className="flex flex-col gap-5">
            <Detail label="Owner" value={node.meta.owner} />
            <Detail label="Status" value={<StatusBadge status={node.meta.status} />} />
            <Detail label="Type" value={node.meta.type} />
            <Detail label="Priority" value={node.meta.priority} />
            <Detail label="Start" value={node.meta.startDate || "Not set"} />
            <Detail label="Due" value={node.meta.dueDate || "Not set"} />
            <Detail label="Level" value={node.meta.kind} />
            <Detail label="Source" value={node.meta.source} />
          </dl>
          <div className="sticky bottom-4 mt-auto flex flex-col items-start gap-2 pt-8">
            <ProjectTreeActionDock actions={dockActions} />
            {node.meta.source === "demo" ? (
              <span className="text-xs text-muted-foreground">Demo scenario · not persisted</span>
            ) : null}
          </div>
        </div>
      </div>
    </section>
  );
}

function Detail({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div>
      <dt>
        <DataLabel>{label}</DataLabel>
      </dt>
      <dd className="pt-1 text-sm font-medium capitalize">{value}</dd>
    </div>
  );
}

function DataLabel({ children }: { children: React.ReactNode }) {
  return (
    <span className="text-xs font-medium uppercase tracking-[0.08em] text-muted-foreground/60">
      {children}
    </span>
  );
}

function StatusBadge({ status }: { status: string }) {
  const complete = ["done", "completed"].includes(status.toLowerCase());
  return (
    <span
      className={`shrink-0 rounded-full px-2.5 py-1 text-xs font-medium ${
        complete ? "bg-emerald-50 text-emerald-700" : "border bg-background text-muted-foreground"
      }`}
    >
      {status}
    </span>
  );
}

function CountBadge({ count }: { count: number }) {
  return (
    <span className="inline-flex min-w-6 shrink-0 items-center justify-center rounded-full bg-muted px-2 py-0.5 text-xs font-medium tabular-nums text-muted-foreground">
      {count}
    </span>
  );
}

function ProgressBadge({ value }: { value: number }) {
  return (
    <span
      className="inline-flex w-10 shrink-0 items-center justify-center rounded-full bg-muted/70 px-1.5 py-0.5 text-[10px] font-semibold tabular-nums text-muted-foreground"
      title={`${value}% complete`}
    >
      {value}%
    </span>
  );
}

function nextChildKind(kind: ProjectManagerKind): ProjectManagerKind | null {
  if (kind === "project") return "issue";
  if (kind === "issue") return "task";
  if (kind === "task") return "activity";
  if (kind === "activity") return "review";
  return null;
}

function kindLabel(kind: ProjectManagerKind) {
  return kind === "issue" ? "module" : kind === "activity" ? "action" : kind;
}

function planningKindLabel(kind: PlanningKind) {
  return kind.charAt(0).toUpperCase() + kind.slice(1);
}

function projectColorTone(colorKey: string) {
  const tones: Record<string, { icon: string; row: string }> = {
    amber: { icon: "bg-amber-200/60 text-amber-800", row: "bg-amber-50/70 hover:bg-amber-100/70" },
    blue: { icon: "bg-blue-200/60 text-blue-800", row: "bg-blue-50/70 hover:bg-blue-100/70" },
    emerald: {
      icon: "bg-emerald-200/60 text-emerald-800",
      row: "bg-emerald-50/70 hover:bg-emerald-100/70"
    },
    indigo: {
      icon: "bg-indigo-200/60 text-indigo-800",
      row: "bg-indigo-50/70 hover:bg-indigo-100/70"
    },
    rose: { icon: "bg-rose-200/60 text-rose-800", row: "bg-rose-50/70 hover:bg-rose-100/70" },
    slate: { icon: "bg-slate-200/70 text-slate-700", row: "bg-slate-50/80 hover:bg-slate-100/80" },
    violet: {
      icon: "bg-violet-200/60 text-violet-800",
      row: "bg-violet-50/70 hover:bg-violet-100/70"
    }
  };
  return tones[colorKey] ?? tones.slate;
}

function EmptyDetails() {
  return (
    <section className="flex min-h-72 items-center justify-center px-6 text-sm text-muted-foreground">
      Select a project flow item to inspect its fields.
    </section>
  );
}

function TreeMessage({ children }: { children: React.ReactNode }) {
  return <p className="px-6 py-10 text-sm text-muted-foreground">{children}</p>;
}
