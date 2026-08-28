import { Input } from "@codelogicx/ui/components/input";
import { WorkspaceDatePicker } from "@codelogicx/ui/workspace/date-picker";
import { WorkspaceLookup } from "@codelogicx/ui/workspace/lookup";
import { WorkspaceMinimalEditor } from "@codelogicx/ui/workspace/minimal-editor";
import { WorkspaceSelect } from "@codelogicx/ui/workspace/select";
import {
  WorkspaceFormBanner,
  WorkspaceFormField,
  WorkspaceFormFooter,
  WorkspaceFormGrid
} from "@codelogicx/ui/workspace/upsert";
import { useProjectManagerMutations } from "../project-manager/project-manager.hooks";
import {
  formFromRecord,
  payloadFromForm,
  validateProjectManagerForm
} from "../project-manager/project-manager.schema";
import type {
  ProjectManagerForm,
  ProjectManagerKind,
  ProjectManagerRecord
} from "../project-manager/project-manager.types";
import { useState } from "react";
import { toast } from "sonner";

export type ProjectTreeEditorRequest = {
  kind: ProjectManagerKind;
  parent?: ProjectManagerRecord;
  record?: ProjectManagerRecord;
};

export function ProjectTreeEditor({
  onClose,
  records,
  request
}: {
  onClose(): void;
  records: ProjectManagerRecord[];
  request: ProjectTreeEditorRequest;
}) {
  const [form, setForm] = useState<ProjectManagerForm>(() => initialForm(request, records));
  const [error, setError] = useState("");
  const mutations = useProjectManagerMutations(request.kind);
  const loading = mutations.create.isPending || mutations.update.isPending;

  function save() {
    const validationError = validateProjectManagerForm(form);
    if (validationError) {
      setError(validationError);
      return;
    }
    setError("");
    const operation = form.id
      ? mutations.update.mutateAsync({ id: form.id, payload: payloadFromForm(form) })
      : mutations.create.mutateAsync(payloadFromForm(form));
    void operation
      .then((record) => {
        toast.success(form.id ? "Work item updated" : "Work item created", {
          description: record.title
        });
        onClose();
      })
      .catch((reason) =>
        setError(reason instanceof Error ? reason.message : "Work item could not be saved.")
      );
  }

  function patch<K extends keyof ProjectManagerForm>(key: K, value: ProjectManagerForm[K]) {
    setForm((current) => ({ ...current, [key]: value }));
  }

  return (
    <section className="min-w-0 px-5 py-7 lg:px-10 lg:py-9">
      <div className="mx-auto max-w-5xl">
        <div className="pb-5">
          <p className="text-xs font-medium uppercase tracking-[0.08em] text-muted-foreground/60">
            {form.id ? "Inline edit" : "New work item"}
          </p>
          <h2 className="pt-1 text-2xl font-semibold tracking-tight">
            {form.id ? `Edit ${form.title}` : `Add ${label(request.kind)}`}
          </h2>
        </div>
        <form
          className="rounded-md border border-border/90 bg-card p-5 shadow-md shadow-black/10"
          onSubmit={(event) => {
            event.preventDefault();
            save();
          }}
        >
          {error ? <WorkspaceFormBanner title="Could not save">{error}</WorkspaceFormBanner> : null}
          <WorkspaceFormGrid
            className="items-start md:grid-cols-[minmax(0,1.15fr)_minmax(0,0.85fr)]"
            columns={2}
          >
            <div className="grid gap-5">
              <WorkspaceFormField label="Title" required>
                <Input value={form.title} onChange={(event) => patch("title", event.target.value)} />
              </WorkspaceFormField>
              <WorkspaceFormField label={detailsLabel(request.kind)}>
                <WorkspaceMinimalEditor
                  className="[&_.ProseMirror]:min-h-[260px]"
                  content={form.description}
                  onChange={(value) => patch("description", value)}
                />
              </WorkspaceFormField>
            </div>
            <div className="grid gap-5">
              <WorkspaceFormField label={`${label(request.kind)} ID`} required>
                <Input className="font-mono" readOnly value={form.key} />
              </WorkspaceFormField>
              <SimpleLookup
                label={`${label(request.kind)} type`}
                value={form.type}
                onChange={(value) => patch("type", value)}
              />
              <SimpleLookup
                label="Status"
                options={statusOptions(request.kind)}
                value={form.status}
                onChange={(value) => patch("status", value)}
              />
              {request.kind === "task" ? (
                <TaskDependencies
                  form={form}
                  records={records}
                  onChange={(dependencyIds) => patch("dependencyIds", dependencyIds)}
                />
              ) : null}
              <WorkspaceFormField label="Priority" required>
                <WorkspaceSelect
                  options={["low", "medium", "high", "critical"].map((value) => ({
                    label: pretty(value),
                    value
                  }))}
                  value={form.priority}
                  onValueChange={(value) =>
                    patch("priority", value as ProjectManagerForm["priority"])
                  }
                />
              </WorkspaceFormField>
              <SimpleLookup
                label={actorLabel(request.kind)}
                value={form.assignee}
                onChange={(value) => patch("assignee", value)}
              />
              <WorkspaceFormField label="Planned start">
                <WorkspaceDatePicker
                  value={form.startDate}
                  onValueChange={(value) => patch("startDate", value)}
                />
              </WorkspaceFormField>
              <WorkspaceFormField label={dateLabel(request.kind)}>
                <WorkspaceDatePicker
                  value={form.dueDate}
                  onValueChange={(value) => patch("dueDate", value)}
                />
              </WorkspaceFormField>
            </div>
          </WorkspaceFormGrid>
          <WorkspaceFormFooter
            className="mt-7 border-t pt-4"
            onCancel={onClose}
            primaryLabel={form.id ? "Update" : "Save"}
            primaryLoading={loading}
          />
        </form>
      </div>
    </section>
  );
}

function TaskDependencies({
  form,
  onChange,
  records
}: {
  form: ProjectManagerForm;
  onChange(value: string[]): void;
  records: ProjectManagerRecord[];
}) {
  const candidates = records.filter(
    (record) =>
      record.kind === "task" &&
      record.id !== form.id &&
      record.referenceId === form.referenceId &&
      record.referenceType === form.referenceType
  );
  return (
    <WorkspaceFormField label="Depends on">
      <div className="max-h-36 space-y-1 overflow-y-auto rounded-md border border-border/90 bg-background p-2 shadow-sm">
        {candidates.map((task) => (
          <label className="flex cursor-pointer items-center gap-2 rounded px-2 py-2 text-sm hover:bg-muted/60" key={task.id}>
            <input
              checked={form.dependencyIds.includes(task.id)}
              className="size-4 accent-foreground"
              onChange={(event) =>
                onChange(
                  event.target.checked
                    ? [...form.dependencyIds, task.id]
                    : form.dependencyIds.filter((id) => id !== task.id)
                )
              }
              type="checkbox"
            />
            <span className="min-w-0 flex-1 truncate">{task.title}</span>
            <span className="font-mono text-[10px] text-muted-foreground">{task.key}</span>
          </label>
        ))}
        {!candidates.length ? (
          <p className="px-2 py-3 text-xs text-muted-foreground">No sibling tasks are available.</p>
        ) : null}
      </div>
    </WorkspaceFormField>
  );
}

function SimpleLookup({
  label: fieldLabel,
  onChange,
  options = [],
  value
}: {
  label: string;
  onChange(value: string): void;
  options?: string[];
  value: string;
}) {
  const values = [...new Set([value, ...options].filter(Boolean))];
  return (
    <WorkspaceFormField label={fieldLabel} required>
      <WorkspaceLookup
        allowTextValue
        options={values.map((option) => ({ label: pretty(option), value: option }))}
        placeholder={`Select ${fieldLabel.toLowerCase()}`}
        value={value}
        onValueChange={onChange}
      />
    </WorkspaceFormField>
  );
}

function initialForm(request: ProjectTreeEditorRequest, records: ProjectManagerRecord[]) {
  if (request.record) {
    const form = formFromRecord(request.record);
    return { ...form, description: decodeStoredHtml(form.description) };
  }
  const form = formFromRecord();
  return {
    ...form,
    key: nextKey(request.kind, request.parent, records),
    referenceId: request.parent?.id ?? "",
    referenceType: request.parent?.kind ?? "",
    type: label(request.kind).toLowerCase()
  };
}

function nextKey(
  kind: ProjectManagerKind,
  parent: ProjectManagerRecord | undefined,
  records: ProjectManagerRecord[]
) {
  const suffix =
    kind === "issue" ? "ISS" : kind === "task" ? "TSK" : kind === "activity" ? "ACT" : "REV";
  const prefix = parent ? `${parent.key}-${suffix}-` : "PRJ-";
  const usedNumbers = records
    .filter((record) => record.kind === kind && record.key.startsWith(prefix))
    .map((record) => Number(record.key.slice(prefix.length)))
    .filter(Number.isFinite);
  const nextNumber = Math.max(0, ...usedNumbers) + 1;
  return `${prefix}${String(nextNumber).padStart(4, "0")}`;
}

function label(kind: ProjectManagerKind) {
  return kind === "issue" ? "module" : kind === "activity" ? "action" : kind;
}

function detailsLabel(kind: ProjectManagerKind) {
  return kind === "project"
    ? "Roadmap scope and outcome"
    : kind === "issue"
      ? "Module brief and intended outcome"
      : kind === "task"
        ? "Execution details"
        : kind === "activity"
          ? "Work update"
          : "Review notes and feedback";
}

function actorLabel(kind: ProjectManagerKind) {
  return kind === "project" || kind === "issue"
    ? "Owner"
    : kind === "task"
      ? "Assignee"
      : kind === "activity"
        ? "Performed by"
        : "Reviewer";
}

function dateLabel(kind: ProjectManagerKind) {
  return kind === "project"
    ? "Target finish"
    : kind === "issue"
      ? "Target date"
      : kind === "activity"
        ? "Action date"
        : kind === "review"
          ? "Review due date"
          : "Due date";
}

function statusOptions(kind: ProjectManagerKind) {
  if (kind === "project")
    return ["new", "planning", "approved", "in-progress", "on-hold", "blocked", "completed"];
  if (kind === "issue") return ["open", "in-progress", "needs-review", "blocked", "completed"];
  if (kind === "task") return ["open", "assigned", "in-progress", "blocked", "completed"];
  if (kind === "activity") return ["open", "active", "in-progress", "completed"];
  return ["requested", "in-review", "changes-requested", "approved"];
}

function pretty(value: string) {
  return value
    .split("-")
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

function decodeStoredHtml(value: string) {
  return value
    .replace(/&lt;/giu, "<")
    .replace(/&gt;/giu, ">")
    .replace(/&quot;/giu, '"')
    .replace(/&#39;/giu, "'")
    .replace(/&amp;/giu, "&");
}
