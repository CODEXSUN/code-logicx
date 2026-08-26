import { Button } from "@codelogicx/ui/components/button";
import { Textarea } from "@codelogicx/ui/components/textarea";
import { ArrowLeftIcon, HeartIcon, MessageCircleIcon, PencilIcon, ReplyIcon, Share2Icon } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { useProjectManagerRecordsQuery } from "../project-manager/project-manager.hooks";
import { useIdea, useIdeaActions, useIdeaComments } from "./ideas.hooks";
import type { IdeaComment } from "./ideas.types";

export function IdeaDetail({ uuid }: { uuid: string }) {
  const query = useIdea(uuid);
  const comments = useIdeaComments(uuid);
  const projects = useProjectManagerRecordsQuery("project");
  const actions = useIdeaActions();
  const [replyTo, setReplyTo] = useState<string | null>(null);
  const [comment, setComment] = useState("");
  const idea = query.data;
  if (!idea) return <main className="grid min-h-[70vh] place-items-center">Loading discussion…</main>;
  const projectNames = idea.projectUuids.map((id) => projects.data?.find((project) => project.id === id)?.title ?? id);
  async function postComment() {
    if (!comment.trim()) return;
    await actions.comment.mutateAsync({ uuid, bodyHtml: `<p>${escapeHtml(comment.trim())}</p>`, parentUuid: replyTo });
    setComment(""); setReplyTo(null); await comments.refetch();
  }
  async function share() {
    await navigator.clipboard.writeText(window.location.href);
    toast.success("Discussion link copied");
  }
  return (
    <main className="mx-auto w-[calc(100%-2rem)] max-w-5xl py-6 lg:w-[calc(100%-3rem)] lg:py-8">
      <div className="flex items-center justify-between pb-6"><Button variant="ghost" onClick={() => window.location.assign("/app/codelogicx/ideas")}><ArrowLeftIcon />All ideas</Button><Button variant="outline" onClick={() => window.location.assign(`/app/codelogicx/ideas/${uuid}/edit`)}><PencilIcon />Edit</Button></div>
      <article>
        <div className="flex flex-wrap items-center gap-2 text-sm"><span className="rounded-full bg-primary/10 px-2.5 py-1 font-medium text-primary">{idea.category}</span><span className="capitalize text-muted-foreground">{idea.status.replace("-", " ")}</span><span className="text-muted-foreground">· {idea.author}</span></div>
        <h1 className="max-w-4xl pt-4 text-4xl font-semibold tracking-tight">{idea.title}</h1>
        <p className="max-w-3xl pt-3 text-lg leading-8 text-muted-foreground">{idea.excerpt}</p>
        <div className="flex flex-wrap gap-2 pt-5">{idea.tags.map((tag) => <span key={tag} className="rounded-md bg-muted px-2 py-1 text-sm">#{tag}</span>)}{projectNames.map((name) => <span key={name} className="rounded-md border px-2 py-1 text-sm">{name}</span>)}</div>
        <div className="prose prose-neutral mt-9 max-w-none border-t pt-8 dark:prose-invert" dangerouslySetInnerHTML={{ __html: idea.contentHtml }} />
        {idea.attachments.length ? <div className="grid gap-3 pt-8 sm:grid-cols-2 lg:grid-cols-3">{idea.attachments.map((attachment) => <figure key={attachment.uuid} className="overflow-hidden rounded-lg border"><img className="aspect-video w-full object-cover" src={attachment.dataUrl} alt={attachment.name} /><figcaption className="truncate px-3 py-2 text-sm">{attachment.name}</figcaption></figure>)}</div> : null}
        {idea.poll ? <section className="mt-8 max-w-2xl rounded-xl bg-muted/50 p-5"><h2 className="text-lg font-semibold">{idea.poll.question}</h2><div className="space-y-2 pt-4">{idea.poll.options.map((option) => { const total = idea.poll!.options.reduce((sum, item) => sum + item.votes, 0); const percent = total ? Math.round(option.votes / total * 100) : 0; return <button key={option.id} className="relative flex w-full overflow-hidden rounded-md border bg-background px-3 py-2 text-left" onClick={() => void actions.vote.mutateAsync({ uuid, optionId: option.id })}><span className="absolute inset-y-0 left-0 bg-primary/10" style={{ width: `${percent}%` }} /><span className="relative flex w-full justify-between"><span>{option.label}</span><span>{option.votes} · {percent}%</span></span></button>; })}</div></section> : null}
        <div className="mt-8 flex gap-2 border-y py-3"><Button variant="ghost" onClick={() => void actions.like.mutateAsync(uuid)}><HeartIcon />{idea.likes} Like</Button><Button variant="ghost" onClick={() => document.getElementById("discussion")?.scrollIntoView({ behavior: "smooth" })}><MessageCircleIcon />{idea.commentCount} Discuss</Button><Button variant="ghost" onClick={() => void share()}><Share2Icon />Share</Button></div>
      </article>
      <section id="discussion" className="pt-10"><h2 className="text-xl font-semibold">Discussion</h2><p className="pt-1 text-sm text-muted-foreground">Build on the proposal, ask questions, and reply to a specific point.</p>
        <div className="space-y-4 pt-6">{thread(comments.data ?? []).map(({ comment: entry, replies }) => <CommentThread key={entry.uuid} comment={entry} replies={replies} onLike={(id) => void actions.likeComment.mutateAsync(id).then(() => comments.refetch())} onReply={setReplyTo} />)}</div>
        <div className="sticky bottom-4 mt-8 rounded-xl border bg-background/95 p-4 shadow-lg backdrop-blur"><div className="flex items-center justify-between pb-2"><strong>{replyTo ? "Write a reply" : "Join the discussion"}</strong>{replyTo ? <button className="text-sm text-muted-foreground" onClick={() => setReplyTo(null)}>Cancel reply</button> : null}</div><Textarea value={comment} onChange={(event) => setComment(event.target.value)} placeholder="Share a constructive response…" /><div className="flex justify-end pt-3"><Button disabled={!comment.trim() || actions.comment.isPending} onClick={() => void postComment()}>Post {replyTo ? "reply" : "comment"}</Button></div></div>
      </section>
    </main>
  );
}

function CommentThread({ comment, replies, onLike, onReply }: { comment: IdeaComment; replies: IdeaComment[]; onLike: (uuid: string) => void; onReply: (uuid: string) => void }) {
  return <div className="border-l-2 pl-4"><div className="flex items-center gap-2 text-sm"><strong>{comment.author}</strong><span className="text-muted-foreground">{new Date(comment.createdAt).toLocaleString()}</span></div><div className="prose prose-sm max-w-none pt-2 dark:prose-invert" dangerouslySetInnerHTML={{ __html: comment.bodyHtml }} /><div className="flex gap-1"><Button size="sm" variant="ghost" onClick={() => onLike(comment.uuid)}><HeartIcon />{comment.likes}</Button><Button size="sm" variant="ghost" onClick={() => onReply(comment.uuid)}><ReplyIcon />Reply</Button></div>{replies.length ? <div className="space-y-4 pt-4">{replies.map((reply) => <CommentThread key={reply.uuid} comment={reply} replies={[]} onLike={onLike} onReply={onReply} />)}</div> : null}</div>;
}
function thread(comments: IdeaComment[]) { const roots = comments.filter((item) => !item.parentUuid); return roots.map((comment) => ({ comment, replies: comments.filter((item) => item.parentUuid === comment.uuid) })); }
function escapeHtml(value: string) { return value.replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;").replaceAll('"', "&quot;").replaceAll("'", "&#039;"); }
