import { Button } from "@codelogicx/ui/components/button";
import { Input } from "@codelogicx/ui/components/input";
import { Textarea } from "@codelogicx/ui/components/textarea";
import { WorkspaceEditor } from "@codelogicx/ui/workspace";
import { ArrowLeftIcon, Code2Icon, EyeIcon, FileImageIcon, PenToolIcon, SaveIcon } from "lucide-react";
import { useMemo, useRef, useState } from "react";
import { toast } from "sonner";
import { useProjectManagerRecordsQuery } from "../project-manager/project-manager.hooks";
import { useIdea, useIdeaActions } from "./ideas.hooks";
import type { IdeaInput } from "./ideas.types";
import { IdeaDrawing } from "./idea-drawing";

const categories = ["General", "Product", "Engineering", "Design", "Research", "Operations"];

export function IdeaEditor({ uuid }: { uuid?: string }) {
  const query = useIdea(uuid ?? "");
  if (uuid && query.isLoading) return <main className="grid min-h-[70vh] place-items-center">Loading idea…</main>;
  return <IdeaEditorForm key={query.data?.updatedAt ?? "new"} idea={query.data} />;
}

function IdeaEditorForm({ idea }: { idea?: Awaited<ReturnType<ReturnType<typeof useIdea>["refetch"]>>["data"] }) {
  const projects = useProjectManagerRecordsQuery("project");
  const actions = useIdeaActions();
  const fileInput = useRef<HTMLInputElement>(null);
  const [mode, setMode] = useState<"compose" | "html" | "preview">("compose");
  const [drawingOpen, setDrawingOpen] = useState(false);
  const [files, setFiles] = useState<File[]>([]);
  const [pollQuestion, setPollQuestion] = useState(idea?.poll?.question ?? "");
  const [pollOptions, setPollOptions] = useState(idea?.poll?.options.map((option) => option.label).join("\n") ?? "");
  const [form, setForm] = useState<IdeaInput>({
    title: idea?.title ?? "", excerpt: idea?.excerpt ?? "", contentHtml: idea?.contentHtml ?? "",
    category: idea?.category ?? "General", tags: idea?.tags ?? [], projectUuids: idea?.projectUuids ?? [], status: idea?.status ?? "open"
  });
  const tagText = useMemo(() => form.tags.join(", "), [form.tags]);
  const saving = actions.create.isPending || actions.update.isPending;

  async function save() {
    if (!form.title.trim()) return toast.error("Add a title before saving.");
    try {
      const saved = idea ? await actions.update.mutateAsync({ uuid: idea.uuid, input: form }) : await actions.create.mutateAsync(form);
      for (const file of files) await actions.attach.mutateAsync({ uuid: saved.uuid, input: { dataUrl: await readDataUrl(file), name: file.name, type: file.type } });
      const options = pollOptions.split("\n").map((value) => value.trim()).filter(Boolean);
      if (pollQuestion.trim() && options.length >= 2) await actions.poll.mutateAsync({ uuid: saved.uuid, input: { question: pollQuestion.trim(), options, multipleChoice: false } });
      toast.success(idea ? "Idea updated" : "Idea published");
      window.location.assign(`/app/codelogicx/ideas/${saved.uuid}`);
    } catch (error) { toast.error(error instanceof Error ? error.message : "Could not save idea."); }
  }

  return (
    <main className="fixed inset-x-0 bottom-0 top-14 z-30 flex flex-col bg-background lg:left-[18.75rem]">
      <header className="flex min-h-16 items-center justify-between gap-4 border-b px-5">
        <div className="flex min-w-0 items-center gap-3"><Button size="icon" variant="ghost" onClick={() => window.location.assign("/app/codelogicx/ideas")}><ArrowLeftIcon /></Button><div className="min-w-0"><strong className="block truncate">{idea ? "Edit idea" : "Start a discussion"}</strong><span className="text-sm text-muted-foreground">Share context clearly so the group can respond.</span></div></div>
        <Button disabled={saving} onClick={() => void save()}><SaveIcon />{saving ? "Saving…" : idea ? "Save changes" : "Publish idea"}</Button>
      </header>
      <div className="grid min-h-0 flex-1 overflow-hidden xl:grid-cols-[minmax(0,1fr)_20rem]">
        <section className="min-h-0 overflow-y-auto px-6 py-6 lg:px-10">
          <div className="mx-auto max-w-4xl space-y-5">
            <Input className="h-auto border-0 px-0 text-3xl font-semibold shadow-none focus-visible:ring-0" placeholder="Give your idea a clear title" value={form.title} onChange={(event) => setForm({ ...form, title: event.target.value })} />
            <Textarea className="min-h-20 resize-none border-0 px-0 text-base shadow-none focus-visible:ring-0" placeholder="A short summary for the discussion list" value={form.excerpt} onChange={(event) => setForm({ ...form, excerpt: event.target.value })} />
            <div className="flex items-center gap-1 border-b pb-2">
              {(["compose", "html", "preview"] as const).map((value) => <Button key={value} size="sm" variant={mode === value ? "secondary" : "ghost"} onClick={() => setMode(value)}>{value === "compose" ? <PenToolIcon /> : value === "html" ? <Code2Icon /> : <EyeIcon />}{value[0]!.toUpperCase() + value.slice(1)}</Button>)}
            </div>
            {mode === "compose" ? <WorkspaceEditor className="[&_.ProseMirror]:min-h-[420px]" content={form.contentHtml} onChange={(contentHtml) => setForm({ ...form, contentHtml })} placeholder="Explain the problem, proposal, trade-offs, and what feedback you need…" /> : null}
            {mode === "html" ? <Textarea className="min-h-[520px] font-mono text-sm" value={form.contentHtml} onChange={(event) => setForm({ ...form, contentHtml: event.target.value })} placeholder="Paste a complete HTML fragment or page body here…" /> : null}
            {mode === "preview" ? <iframe sandbox="" title="Idea HTML preview" className="min-h-[560px] w-full rounded-lg border bg-white" srcDoc={form.contentHtml} /> : null}
          </div>
        </section>
        <aside className="overflow-y-auto border-l bg-muted/20 px-5 py-6">
          <div className="space-y-6">
            <Field label="Category"><select className="h-10 w-full rounded-md border bg-background px-3 text-sm" value={form.category} onChange={(event) => setForm({ ...form, category: event.target.value })}>{categories.map((category) => <option key={category}>{category}</option>)}</select></Field>
            <Field label="Status"><select className="h-10 w-full rounded-md border bg-background px-3 text-sm" value={form.status} onChange={(event) => setForm({ ...form, status: event.target.value })}>{["open", "planned", "in-progress", "completed", "archived"].map((status) => <option key={status} value={status}>{status.replace("-", " ")}</option>)}</select></Field>
            <Field label="Tags" hint="Separate with commas"><Input value={tagText} onChange={(event) => setForm({ ...form, tags: event.target.value.split(",").map((tag) => tag.trim()).filter(Boolean) })} placeholder="platform, automation, UX" /></Field>
            <Field label="Related projects" hint="Select any number"><div className="space-y-1">{(projects.data ?? []).map((project) => <label key={project.id} className="flex items-center gap-2 rounded px-2 py-1.5 text-sm hover:bg-muted"><input type="checkbox" checked={form.projectUuids.includes(project.id)} onChange={() => setForm({ ...form, projectUuids: toggle(form.projectUuids, project.id) })} />{project.title}</label>)}</div></Field>
            <Field label="Images"><input ref={fileInput} className="hidden" type="file" accept="image/*" multiple onChange={(event) => setFiles([...files, ...Array.from(event.target.files ?? [])])} /><Button className="w-full" variant="outline" onClick={() => fileInput.current?.click()}><FileImageIcon />Attach images</Button>{files.map((file) => <p key={`${file.name}-${file.size}`} className="truncate text-sm text-muted-foreground">{file.name}</p>)}</Field>
            <Field label="Poll" hint="One option per line"><Input value={pollQuestion} onChange={(event) => setPollQuestion(event.target.value)} placeholder="What should we prioritize?" /><Textarea className="mt-2 min-h-24" value={pollOptions} onChange={(event) => setPollOptions(event.target.value)} placeholder={"Build prototype\nResearch first"} /></Field>
            {idea ? <Button className="w-full" variant="outline" onClick={() => setDrawingOpen(true)}><PenToolIcon />Open Excalidraw</Button> : <p className="text-sm text-muted-foreground">Save the idea once to add an Excalidraw sketch.</p>}
          </div>
        </aside>
      </div>
      {drawingOpen && idea ? <IdeaDrawing initial={idea.drawing} onClose={() => setDrawingOpen(false)} onSave={(scene) => void actions.drawing.mutateAsync({ uuid: idea.uuid, scene }).then(() => { toast.success("Sketch saved"); setDrawingOpen(false); })} /> : null}
    </main>
  );
}

function Field({ children, hint, label }: { children: React.ReactNode; hint?: string; label: string }) { return <div className="space-y-2"><div><label className="text-sm font-medium">{label}</label>{hint ? <p className="text-sm text-muted-foreground">{hint}</p> : null}</div>{children}</div>; }
function toggle(values: string[], value: string) { return values.includes(value) ? values.filter((item) => item !== value) : [...values, value]; }
function readDataUrl(file: File) { return new Promise<string>((resolve, reject) => { const reader = new FileReader(); reader.onload = () => resolve(String(reader.result)); reader.onerror = () => reject(reader.error); reader.readAsDataURL(file); }); }
