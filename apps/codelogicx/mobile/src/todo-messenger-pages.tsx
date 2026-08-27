import { IonIcon, IonSpinner } from "@ionic/react";
import { arrowBackOutline, calendarOutline, createOutline, flagOutline, personAddOutline, pricetagOutline, sendOutline } from "ionicons/icons";
import { useEffect, useState } from "react";
import type { Contact, Conversation, ConversationMessage, Todo, TodoInput } from "./mobile-types";

const emptyTodo: TodoInput = { category: "work", description: "", dueDate: "", priority: "medium", status: "open", title: "" };

export function TodosPage({ reload, save, todos }: { reload: () => Promise<void>; save: (input: TodoInput, id?: string) => Promise<Todo>; todos: Todo[] }) {
  const [editing, setEditing] = useState<Todo | null | "new">(null);
  if (editing) return <TodoForm close={() => setEditing(null)} initial={editing === "new" ? emptyTodo : editing} save={async (input) => { await save(input, editing === "new" ? undefined : editing.id); await reload(); setEditing(null); }}/>;
  return <section className="mobile-page todos-page">
    <header>
      <div><h1>Todos</h1><span>{todos.length} assigned items</span></div>
      <button onClick={() => setEditing("new")}>New Todo</button>
    </header>
    <div className="card-list todo-list">{todos.length ? todos.map((todo) => <article className="todo-card" key={todo.id}>
      <header><h2>{todo.title}</h2><b>{todo.status}</b></header>
      <p>{plainText(todo.description) || "No todo description."}</p>
      <footer>
        <span><IonIcon icon={flagOutline}/>{todo.priority || "medium"}</span>
        <span><IonIcon icon={pricetagOutline}/>{todo.category || "work"}</span>
        {todo.dueDate ? <span><IonIcon icon={calendarOutline}/>{formatTodoDate(todo.dueDate)}</span> : null}
        <button aria-label={`Edit ${todo.title}`} onClick={() => setEditing(todo)}><IonIcon icon={createOutline}/> Edit</button>
      </footer>
    </article>) : <div className="empty-card">No todos available.</div>}</div>
  </section>;
}

function TodoForm({ close, initial, save }: { close: () => void; initial: TodoInput; save: (input: TodoInput) => Promise<void> }) {
  const [form, setForm] = useState(initial); const [saving, setSaving] = useState(false); const [error, setError] = useState("");
  async function submit(event: React.FormEvent) { event.preventDefault(); if (!form.title.trim()) return setError("Add a todo title."); setSaving(true); setError(""); try { await save(form); } catch (reason) { setError(reason instanceof Error ? reason.message : "Could not save this todo."); } finally { setSaving(false); } }
  return <section className="record-form-page"><header><button aria-label="Back to Todos" onClick={close}><IonIcon icon={arrowBackOutline}/></button><div><p>TODO</p><h1>{initial.title ? "Edit Todo" : "New Todo"}</h1></div></header><form onSubmit={(event) => void submit(event)}><label>Title<input autoFocus maxLength={240} onChange={(event) => setForm({ ...form, title: event.target.value })} value={form.title}/></label><label>Description<textarea onChange={(event) => setForm({ ...form, description: event.target.value })} rows={6} value={form.description}/></label><div className="record-form-pair"><label>Status<select onChange={(event) => setForm({ ...form, status: event.target.value })} value={form.status}>{["open", "in-progress", "done"].map((value) => <option key={value}>{value}</option>)}</select></label><label>Priority<select onChange={(event) => setForm({ ...form, priority: event.target.value })} value={form.priority}>{["low", "medium", "high", "urgent"].map((value) => <option key={value}>{value}</option>)}</select></label></div><div className="record-form-pair"><label>Category<input onChange={(event) => setForm({ ...form, category: event.target.value })} value={form.category}/></label><label>Due date<input onChange={(event) => setForm({ ...form, dueDate: event.target.value })} type="date" value={form.dueDate}/></label></div>{error ? <p className="record-form-error">{error}</p> : null}<footer><button onClick={close} type="button">Cancel</button><button disabled={saving} type="submit">{saving ? "Saving…" : "Save Todo"}</button></footer></form></section>;
}

export function MessengerPage({ actorId, conversations, create, listContacts, listMessages, reload, send }: { actorId: string; conversations: Conversation[]; create: (memberId: string) => Promise<Conversation>; listContacts: () => Promise<Contact[]>; listMessages: (id: string) => Promise<ConversationMessage[]>; reload: () => Promise<void>; send: (id: string, content: string) => Promise<ConversationMessage> }) {
  const [selected, setSelected] = useState<Conversation | null>(null); const [starting, setStarting] = useState(false);
  if (selected) return <ConversationThread actorId={actorId} back={() => { setSelected(null); void reload(); }} conversation={selected} listMessages={listMessages} send={send}/>;
  if (starting) return <ContactPicker back={() => setStarting(false)} create={async (id) => setSelected(await create(id))} load={listContacts}/>;
  return <section className="mobile-page messenger-page"><header><div><h1>Messenger</h1><span>{conversations.length} conversations</span></div><button aria-label="New conversation" onClick={() => setStarting(true)}><IonIcon icon={personAddOutline}/></button></header><div className="card-list">{conversations.length ? conversations.map((item) => <button className="messenger-row" key={item.id} onClick={() => setSelected(item)}><span className="avatar">{initials(item.title || item.members[0]?.name || "C")}</span><span><strong>{item.title || item.members.map((member) => member.name).join(", ")}</strong><small>{item.lastMessage?.content || "Start the conversation"}</small></span>{item.unreadCount ? <b>{item.unreadCount}</b> : null}</button>) : <div className="empty-card">No conversations yet.</div>}</div></section>;
}

function ContactPicker({ back, create, load }: { back: () => void; create: (id: string) => Promise<void>; load: () => Promise<Contact[]> }) { const [contacts, setContacts] = useState<Contact[]>([]); const [loading, setLoading] = useState(true); useEffect(() => { void load().then(setContacts).finally(() => setLoading(false)); }, [load]); return <section className="record-form-page"><header><button onClick={back}><IonIcon icon={arrowBackOutline}/></button><div><p>MESSENGER</p><h1>New conversation</h1></div></header><div className="contact-list">{loading ? <IonSpinner/> : contacts.map((contact) => <button key={contact.uuid} onClick={() => void create(contact.uuid)}><span className="avatar">{initials(contact.name)}</span><span><strong>{contact.name}</strong><small>{contact.email}</small></span></button>)}</div></section>; }

function ConversationThread({ actorId, back, conversation, listMessages, send }: { actorId: string; back: () => void; conversation: Conversation; listMessages: (id: string) => Promise<ConversationMessage[]>; send: (id: string, content: string) => Promise<ConversationMessage> }) { const [messages, setMessages] = useState<ConversationMessage[]>([]); const [content, setContent] = useState(""); const [pending, setPending] = useState(false); useEffect(() => { void listMessages(conversation.id).then(setMessages); }, [conversation.id, listMessages]); async function submit(event: React.FormEvent) { event.preventDefault(); const value = content.trim(); if (!value) return; setPending(true); try { const message = await send(conversation.id, value); setMessages((items) => [...items, message]); setContent(""); } finally { setPending(false); } } return <section className="messenger-thread"><header><button onClick={back}><IonIcon icon={arrowBackOutline}/></button><div><strong>{conversation.title || conversation.members.map((member) => member.name).join(", ")}</strong><small>CodeLogicX Messenger</small></div></header><div className="thread-messages">{messages.map((message) => { const outgoing = message.senderId === actorId; return <div className={outgoing ? "is-outgoing" : "is-incoming"} key={message.id}>{outgoing ? null : <strong>{message.senderName}</strong>}<p>{message.content}</p><time>{messageTime(message.createdAt)}</time></div>; })}</div><form onSubmit={(event) => void submit(event)}><input onChange={(event) => setContent(event.target.value)} placeholder="Write a message…" value={content}/><button disabled={pending || !content.trim()}><IonIcon icon={sendOutline}/></button></form></section>; }

function messageTime(value: string) { return new Intl.DateTimeFormat(undefined, { hour: "numeric", minute: "2-digit" }).format(new Date(value)); }
function initials(value: string) { return value.split(/\s+/u).slice(0, 2).map((part) => part[0]?.toUpperCase()).join(""); }
function plainText(value: string) { return new DOMParser().parseFromString(value, "text/html").body.textContent?.trim() ?? ""; }
function formatTodoDate(value: string) { const [year, month, day] = value.slice(0, 10).split("-"); return year && month && day ? `${day}/${month}/${year.slice(-2)}` : value; }
