import { Button } from "@codelogicx/ui/components/button";
import { Input } from "@codelogicx/ui/components/input";
import { HeartIcon, LightbulbIcon, MessageCircleIcon, PlusIcon, SearchIcon } from "lucide-react";
import { useMemo, useState } from "react";
import { IdeaDetail } from "./idea-detail";
import { IdeaEditor } from "./idea-editor";
import { useIdeas } from "./ideas.hooks";

export function IdeasWorkspace() {
  const segments = window.location.pathname.split("/").filter(Boolean);
  const uuid = segments[3];
  const action = segments[4];
  if (uuid === "new") return <IdeaEditor />;
  if (uuid && action === "edit") return <IdeaEditor uuid={uuid} />;
  if (uuid) return <IdeaDetail uuid={uuid} />;
  return <IdeasList />;
}

function IdeasList() {
  const ideas = useIdeas();
  const [search, setSearch] = useState("");
  const [density, setDensity] = useState<"comfortable" | "compact">("comfortable");
  const visible = useMemo(() => (ideas.data ?? []).filter((idea) => `${idea.title} ${idea.excerpt} ${idea.tags.join(" ")}`.toLowerCase().includes(search.toLowerCase())), [ideas.data, search]);
  return (
    <main className="mx-auto w-[calc(100%-2rem)] max-w-6xl py-6 lg:w-[calc(100%-3rem)] lg:py-8">
      <header className="flex flex-wrap items-end justify-between gap-5 border-b pb-6"><div><p className="text-sm font-medium text-primary">Community workspace</p><h1 className="pt-1 text-3xl font-semibold tracking-tight">Project ideas</h1><p className="max-w-2xl pt-2 text-base leading-7 text-muted-foreground">Discuss proposals, collect evidence, vote on direction, and connect promising ideas to projects.</p></div><Button onClick={() => window.location.assign("/app/codelogicx/ideas/new")}><PlusIcon />New idea</Button></header>
      <div className="flex items-center gap-3 py-5"><div className="relative max-w-md flex-1"><SearchIcon className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" /><Input className="pl-9" value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search ideas and tags" /></div><span className="text-sm text-muted-foreground">{visible.length} discussions</span></div>
      {visible.length ? <div className="divide-y border-y">{visible.map((idea) => <button key={idea.uuid} className={`flex w-full gap-4 text-left transition-colors hover:bg-muted/40 ${density === "compact" ? "py-3" : "py-5"}`} onClick={() => window.location.assign(`/app/codelogicx/ideas/${idea.uuid}`)}><span className="mt-1 flex size-10 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary"><LightbulbIcon className="size-5" /></span><span className="min-w-0 flex-1"><span className="flex flex-wrap items-center gap-2"><strong className="text-base">{idea.title}</strong><span className="rounded-full bg-muted px-2 py-0.5 text-xs">{idea.category}</span></span><span className="mt-1 line-clamp-2 block text-sm leading-6 text-muted-foreground">{idea.excerpt || "Open this idea to read the full proposal."}</span><span className="mt-3 flex flex-wrap gap-2">{idea.tags.slice(0, 4).map((tag) => <span key={tag} className="text-xs text-primary">#{tag}</span>)}</span></span><span className="flex w-24 shrink-0 items-center justify-end gap-3 pt-1 text-sm text-muted-foreground"><span className="flex items-center gap-1"><HeartIcon className="size-4" />{idea.likes}</span><span className="flex items-center gap-1"><MessageCircleIcon className="size-4" />{idea.commentCount}</span></span></button>)}</div> : <div className="grid min-h-72 place-items-center border-y text-center"><div><LightbulbIcon className="mx-auto size-8 text-muted-foreground" /><h2 className="pt-3 font-medium">No matching ideas</h2><p className="pt-1 text-sm text-muted-foreground">Start the first discussion or change your search.</p></div></div>}
      <div className="fixed bottom-5 right-5 z-20 rounded-lg border bg-background p-2 shadow-lg"><span className="px-2 text-xs font-medium text-muted-foreground">View</span><Button size="sm" variant={density === "compact" ? "secondary" : "ghost"} onClick={() => setDensity("compact")}>Compact</Button><Button size="sm" variant={density === "comfortable" ? "secondary" : "ghost"} onClick={() => setDensity("comfortable")}>Relaxed</Button></div>
    </main>
  );
}
