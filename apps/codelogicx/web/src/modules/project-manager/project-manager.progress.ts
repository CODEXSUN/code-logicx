import type { ProjectManagerRecord } from "./project-manager.types";

const completedStatuses = new Set(["approved", "completed", "done", "released"]);
const activeStatuses = new Set(["active", "assigned", "in-progress", "in-review", "needs-review"]);

export function recordProgress(record: ProjectManagerRecord, records: ProjectManagerRecord[]): number {
  const children = records.filter((candidate) => belongsTo(candidate, record));
  if (!children.length) return statusProgress(record.status);
  return Math.round(
    children.reduce((total, child) => total + recordProgress(child, records), 0) / children.length
  );
}

export function statusProgress(status: string): number {
  const normalized = status.trim().toLowerCase();
  if (completedStatuses.has(normalized)) return 100;
  if (activeStatuses.has(normalized)) return 50;
  return 0;
}

function belongsTo(child: ProjectManagerRecord, parent: ProjectManagerRecord) {
  return (
    child.referenceType === parent.kind &&
    (child.referenceId === parent.id || child.referenceId === parent.key)
  );
}
