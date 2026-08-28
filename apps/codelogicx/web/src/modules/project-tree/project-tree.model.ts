import type { TreeNodeData } from "@codelogicx/ui";

import type { ProjectManagerRecord } from "../project-manager/project-manager.types";
import { recordProgress, statusProgress } from "../project-manager/project-manager.progress";

export type PlanningKind =
  | "project"
  | "module"
  | "task"
  | "action"
  | "review"
  | "roadmap"
  | "gantt";

export type PlanningNode = TreeNodeData & {
  meta: {
    colorKey: string;
    description: string;
    dueDate: string;
    href: string;
    kind: PlanningKind;
    owner: string;
    priority: string;
    progress: number;
    reference: string;
    recordId: string;
    recordKind: ProjectManagerRecord["kind"];
    source: "demo" | "live";
    startDate: string;
    status: string;
    type: string;
  };
};

type RecordsByKind = {
  actions: ProjectManagerRecord[];
  modules: ProjectManagerRecord[];
  projects: ProjectManagerRecord[];
  reviews: ProjectManagerRecord[];
  tasks: ProjectManagerRecord[];
};

export function buildProjectTree(records: RecordsByKind): PlanningNode[] {
  const allRecords = [
    ...records.projects,
    ...records.modules,
    ...records.tasks,
    ...records.actions,
    ...records.reviews
  ];
  return records.projects.map((project, projectIndex) => {
    const modules = childrenOf(records.modules, project);
    const moduleRecords = modules.length ? modules : [demoModule(project, projectIndex)];
    const node = fromRecord(project, "project", moduleRecords.map((module, moduleIndex) =>
      buildModuleBranch(module, project, moduleIndex, records)
    ));
    return withProgress(node, allRecords);
  });
}

export function countTreeNodes(nodes: PlanningNode[]): number {
  return nodes.reduce(
    (total, node) => total + 1 + countTreeNodes((node.children ?? []) as PlanningNode[]),
    0
  );
}

export function expandableTreeValues(nodes: PlanningNode[]): string[] {
  return nodes.flatMap((node) => [
    ...(node.children?.length ? [node.value] : []),
    ...expandableTreeValues((node.children ?? []) as PlanningNode[])
  ]);
}

export function findPlanningNode(
  nodes: PlanningNode[],
  value: string
): PlanningNode | undefined {
  for (const node of nodes) {
    if (node.value === value) return node;
    const match = findPlanningNode((node.children ?? []) as PlanningNode[], value);
    if (match) return match;
  }
  return undefined;
}

function buildModuleBranch(
  module: ProjectManagerRecord,
  project: ProjectManagerRecord,
  moduleIndex: number,
  records: RecordsByKind
) {
  const tasks = childrenOf(records.tasks, module);
  const taskRecords = tasks.length ? tasks : [demoTask(module, project, moduleIndex)];
  return fromRecord(
    module,
    "module",
    taskRecords.map((task, taskIndex) =>
      buildTaskBranch(task, module, project, taskIndex, records)
    )
  );
}

function buildTaskBranch(
  task: ProjectManagerRecord,
  module: ProjectManagerRecord,
  project: ProjectManagerRecord,
  taskIndex: number,
  records: RecordsByKind
) {
  const actions = childrenOf(records.actions, task);
  const actionRecords = actions.length ? actions : [demoAction(task, project, taskIndex)];
  return fromRecord(
    task,
    "task",
    actionRecords.map((action, actionIndex) =>
      buildActionBranch(action, task, module, project, actionIndex, records)
    )
  );
}

function buildActionBranch(
  action: ProjectManagerRecord,
  task: ProjectManagerRecord,
  module: ProjectManagerRecord,
  project: ProjectManagerRecord,
  actionIndex: number,
  records: RecordsByKind
) {
  const reviews = childrenOf(records.reviews, action);
  const reviewRecords = reviews.length
    ? reviews
    : [demoReview(action, project, actionIndex)];
  return fromRecord(
    action,
    "action",
    reviewRecords.map((review) => buildReviewBranch(review, task, module, project))
  );
}

function buildReviewBranch(
  review: ProjectManagerRecord,
  task: ProjectManagerRecord,
  module: ProjectManagerRecord,
  project: ProjectManagerRecord
) {
  const roadmapHref = `/app/codelogicx/roadmap?issue=${encodeURIComponent(module.id)}`;
  const ganttHref = `${roadmapHref}&view=gantt`;
  const gantt = virtualNode({
    description: `Scheduled delivery for ${task.title}, including dates, dependencies, and ownership.`,
    href: ganttHref,
    id: `${review.id}:gantt`,
    kind: "gantt",
    label: "Gantt schedule",
    parent: review,
    status: task.dueDate ? "Scheduled" : "Needs dates"
  });
  const roadmap = virtualNode({
    children: [gantt],
    description: `Module roadmap for ${module.title} in ${project.title}.`,
    href: roadmapHref,
    id: `${review.id}:roadmap`,
    kind: "roadmap",
    label: "Roadmap",
    parent: module,
    status: module.status
  });
  return fromRecord(review, "review", [roadmap]);
}

function fromRecord(
  record: ProjectManagerRecord,
  kind: PlanningKind,
  children: PlanningNode[] = []
): PlanningNode {
  return {
    children,
    label: record.title,
    meta: {
      colorKey: record.colorKey || "slate",
      description:
        plainText(record.description) || `${titleCase(kind)} delivery record for ${record.title}.`,
      dueDate: record.dueDate,
      href: recordHref(record),
      kind,
      owner: record.assignee || "Unassigned",
      priority: record.priority,
      progress: statusProgress(record.status),
      reference: record.key,
      recordId: record.id,
      recordKind: record.kind,
      source: record.id.startsWith("demo:") ? "demo" : "live",
      startDate: record.startDate,
      status: titleCase(record.status || (record.active ? "active" : "inactive")),
      type: record.type || titleCase(kind)
    },
    value: `${kind}:${record.id}`
  };
}

function virtualNode(input: {
  children?: PlanningNode[];
  description: string;
  href: string;
  id: string;
  kind: "roadmap" | "gantt";
  label: string;
  parent: ProjectManagerRecord;
  status: string;
}): PlanningNode {
  return {
    children: input.children ?? [],
    label: input.label,
    meta: {
      colorKey: input.parent.colorKey || "slate",
      description: input.description,
      dueDate: input.parent.dueDate,
      href: input.href,
      kind: input.kind,
      owner: input.parent.assignee || "Project team",
      priority: input.parent.priority,
      progress: statusProgress(input.status),
      reference: `${input.parent.key}-${input.kind.toUpperCase()}`,
      recordId: input.parent.id,
      recordKind: input.parent.kind,
      source: input.parent.id.startsWith("demo:") ? "demo" : "live",
      startDate: input.parent.startDate,
      status: titleCase(input.status || "planning"),
      type: titleCase(input.kind)
    },
    value: `${input.kind}:${input.id}`
  };
}

function childrenOf(records: ProjectManagerRecord[], parent: ProjectManagerRecord) {
  return records.filter(
    (record) =>
      record.referenceType === parent.kind &&
      (record.referenceId === parent.id || record.referenceId === parent.key)
  );
}

function demoModule(project: ProjectManagerRecord, index: number) {
  return demoRecord("issue", project, index, {
    description: "Define the module outcome, delivery boundaries, and measurable acceptance criteria.",
    title: index % 2 ? "Collaboration module" : "Identity and access module",
    type: "product module"
  });
}

function demoTask(module: ProjectManagerRecord, project: ProjectManagerRecord, index: number) {
  return demoRecord("task", module, index, {
    description: `Implement the first complete ${module.title.toLowerCase()} scenario for ${project.title}.`,
    title: index % 2 ? "Connect team workspace" : "Complete secure sign-in flow",
    type: "feature"
  });
}

function demoAction(task: ProjectManagerRecord, project: ProjectManagerRecord, index: number) {
  return demoRecord("activity", task, index, {
    description: `Build, test, and document ${task.title.toLowerCase()} in ${project.title}.`,
    status: "ready",
    title: index % 2 ? "Wire live service and UI" : "Implement end-to-end workflow",
    type: "implementation"
  });
}

function demoReview(action: ProjectManagerRecord, project: ProjectManagerRecord, index: number) {
  return demoRecord("review", action, index, {
    assignee: "Review team",
    description: `Verify functionality, accessibility, security, and release readiness for ${project.title}.`,
    status: "pending",
    title: index % 2 ? "Product readiness review" : "Architecture and quality review",
    type: "quality gate"
  });
}

function demoRecord(
  kind: ProjectManagerRecord["kind"],
  parent: ProjectManagerRecord,
  index: number,
  override: Partial<ProjectManagerRecord>
): ProjectManagerRecord {
  const id = `demo:${parent.id}:${kind}:${index + 1}`;
  return {
    ...parent,
    active: true,
    assignee: parent.assignee || "Project team",
    dueDate: parent.dueDate,
    id,
    key: `${parent.key}-${kind.toUpperCase()}-${String(index + 1).padStart(2, "0")}`,
    kind,
    priority: parent.priority || "medium",
    referenceId: parent.id,
    referenceType: parent.kind,
    startDate: parent.startDate,
    status: "planning",
    ...override
  };
}

function recordHref(record: ProjectManagerRecord) {
  if (record.kind === "project") {
    return `/app/codelogicx/projects?project=${encodeURIComponent(record.id)}`;
  }
  return `/app/codelogicx/projects?kind=${record.kind}&record=${encodeURIComponent(record.id)}`;
}

function titleCase(value: string) {
  return value
    .replaceAll("_", " ")
    .replaceAll("-", " ")
    .replace(/\b\w/gu, (letter) => letter.toUpperCase());
}

function plainText(value: string) {
  return value
    .replace(/&lt;/giu, "<")
    .replace(/&gt;/giu, ">")
    .replace(/&quot;/giu, '"')
    .replace(/&#39;/giu, "'")
    .replace(/&amp;/giu, "&")
    .replace(/<[^>]*>/gu, " ")
    .replace(/&nbsp;/giu, " ")
    .replace(/\s+/gu, " ")
    .trim();
}

function withProgress(node: PlanningNode, records: ProjectManagerRecord[]): PlanningNode {
  const record = records.find(
    (candidate) => candidate.id === node.meta.recordId && candidate.kind === node.meta.recordKind
  );
  return {
    ...node,
    children: ((node.children ?? []) as PlanningNode[]).map((child) => withProgress(child, records)),
    meta: {
      ...node.meta,
      progress: record ? recordProgress(record, records) : node.meta.progress
    }
  };
}
