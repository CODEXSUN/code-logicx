import { formatDistanceToNow } from "date-fns";
import { ActivityIcon, Code2Icon } from "lucide-react";
import { useState, type ReactNode } from "react";
import { WorkspaceAnimatedTabs } from "@codelogicx/ui/workspace/animated-tabs";
import type { ProjectManagerRecord } from "../project-manager/project-manager.types";

export function ProjectDevelopmentTabs({
  overview,
  project,
  records
}: {
  overview: ReactNode;
  project: ProjectManagerRecord;
  records: ProjectManagerRecord[];
}) {
  const [active, setActive] = useState("overview");

  return (
    <WorkspaceAnimatedTabs
      value={active}
      onValueChange={setActive}
      tabs={[
        {
          content: overview,
          label: <TabLabel icon={Code2Icon} text="Overview" />,
          value: "overview"
        },
        {
          content: <ActivityTab project={project} records={records} />,
          label: <TabLabel icon={ActivityIcon} text="Activity" />,
          value: "activity"
        }
      ]}
    />
  );
}

function ActivityTab({
  project,
  records
}: {
  project: ProjectManagerRecord;
  records: ProjectManagerRecord[];
}) {
  const recent = [
    project,
    ...records.filter((record) => belongsToProject(record, project, records))
  ]
    .sort((a, b) => Date.parse(b.updatedAt) - Date.parse(a.updatedAt))
    .slice(0, 20);
  return (
    <section className="rounded-xl border bg-card p-5">
      <h3 className="font-semibold">Project activity</h3>
      <div className="mt-4 divide-y">
        {recent.map((record) => (
          <div className="flex items-center gap-3 py-3" key={`${record.kind}-${record.id}`}>
            <ActivityIcon className="size-4 shrink-0 text-muted-foreground" />
            <div className="min-w-0 flex-1">
              <div className="truncate text-sm font-medium">{record.title}</div>
              <div className="text-xs text-muted-foreground">
                {displayKind(record.kind)} · {record.key}
              </div>
            </div>
            <span className="shrink-0 text-xs text-muted-foreground">
              {formatDistanceToNow(new Date(record.updatedAt), { addSuffix: true })}
            </span>
          </div>
        ))}
      </div>
    </section>
  );
}

function TabLabel({ icon: Icon, text }: { icon: typeof Code2Icon; text: string }) {
  return (
    <span className="inline-flex items-center gap-2">
      <Icon className="size-4" />
      {text}
    </span>
  );
}
function displayKind(kind: string) {
  return kind === "issue" ? "Initiative" : kind.charAt(0).toUpperCase() + kind.slice(1);
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
      (item) => item.id === current?.referenceId || item.key === current?.referenceId
    );
  }
  return false;
}
