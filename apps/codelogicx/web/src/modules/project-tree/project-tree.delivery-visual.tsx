import type { ProjectManagerRecord } from "../project-manager/project-manager.types";
import {
  RoadmapStatistics,
  WorkAutomationWorkflow,
  type WorkflowRecords
} from "../work-automation/work-automation.workflow";
import type { PlanningNode } from "./project-tree.model";

export function ProjectTreeDeliveryVisual({
  actions,
  modules,
  node,
  onEdit,
  projects,
  reviews,
  tasks
}: {
  actions: ProjectManagerRecord[];
  modules: ProjectManagerRecord[];
  node: PlanningNode;
  onEdit(record: ProjectManagerRecord): void;
  projects: ProjectManagerRecord[];
  reviews: ProjectManagerRecord[];
  tasks: ProjectManagerRecord[];
}) {
  const records = scopedWorkflow(node, { actions, modules, projects, reviews, tasks });
  const agent = (record: ProjectManagerRecord) => openAgent(record, records);
  return (
    <section className="min-w-0 px-5 py-7 lg:px-8 lg:py-8">
      <header className="pb-5">
        <p className="font-mono text-xs text-muted-foreground/65">{node.meta.reference}</p>
        <h2 className="pt-1 text-2xl font-semibold tracking-tight">{node.label}</h2>
      </header>
      {node.meta.kind === "roadmap" ? (
        <div className="grid min-w-0 items-start gap-5 xl:grid-cols-[minmax(0,1fr)_22rem]">
          <WorkAutomationWorkflow
            onAgentRecord={agent}
            onEditRecord={onEdit}
            records={records}
            view="timeline"
          />
          <RoadmapStatistics records={records} />
        </div>
      ) : (
        <WorkAutomationWorkflow
          onAgentRecord={agent}
          onEditRecord={onEdit}
          records={records}
          view="gantt"
        />
      )}
    </section>
  );
}

function scopedWorkflow(
  node: PlanningNode,
  records: {
    actions: ProjectManagerRecord[];
    modules: ProjectManagerRecord[];
    projects: ProjectManagerRecord[];
    reviews: ProjectManagerRecord[];
    tasks: ProjectManagerRecord[];
  }
): WorkflowRecords {
  const module = [...records.modules]
    .sort((left, right) => right.key.length - left.key.length)
    .find((candidate) => node.meta.reference.startsWith(candidate.key));
  if (!module) {
    return {
      actions: records.actions,
      issues: records.modules,
      projects: records.projects,
      reviews: records.reviews,
      tasks: records.tasks
    };
  }
  const tasks = records.tasks.filter((task) => belongsTo(task, module));
  const actions = records.actions.filter((action) =>
    tasks.some((task) => belongsTo(action, task))
  );
  const reviews = records.reviews.filter((review) =>
    actions.some((action) => belongsTo(review, action))
  );
  const project = records.projects.find(
    (candidate) => module.referenceId === candidate.id || module.referenceId === candidate.key
  );
  return {
    actions,
    issues: [module],
    projects: project ? [project] : [],
    reviews,
    tasks
  };
}

function belongsTo(child: ProjectManagerRecord, parent: ProjectManagerRecord) {
  return (
    child.referenceType === parent.kind &&
    (child.referenceId === parent.id || child.referenceId === parent.key)
  );
}

function openAgent(record: ProjectManagerRecord, records: WorkflowRecords) {
  const project = records.projects[0];
  if (!project) return;
  const search = new URLSearchParams({
    project: project.id,
    workItemId: record.id,
    workItemKey: record.key,
    workItemKind: record.kind,
    workItemTitle: record.title
  });
  window.location.assign(`/app/codelogicx/agent-ide?${search.toString()}`);
}
