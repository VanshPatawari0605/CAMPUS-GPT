import { FileText, History, Loader2, MessageSquarePlus, Pencil, Send, Sparkles, ThumbsDown, ThumbsUp, Trash2 } from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";
import toast from "react-hot-toast";
import ReactMarkdown from "react-markdown";
import { useSearchParams } from "react-router-dom";
import SourceModal from "../components/SourceModal";
import { Badge } from "../components/ui";
import { useAuth } from "../context/AuthContext";
import { api, errorMessage } from "../lib/api";
import type { Message, Session, Source } from "../lib/types";

const SUGGESTIONS = [
  "What is the minimum attendance requirement?",
  "Explain the examination registration process.",
  "What documents are required for placement registration?",
  "What are my important academic updates?",
];

export default function Chat() {
  const { t, user } = useAuth();
  const [params, setParams] = useSearchParams();
  const [sessions, setSessions] = useState<Session[]>([]);
  const [activeId, setActiveId] = useState<string | null>(params.get("session"));
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [sending, setSending] = useState(false);
  const [showList, setShowList] = useState(false);
  const [source, setSource] = useState<Source | null>(null);
  const bottomRef = useRef<HTMLDivElement>(null);

  const loadSessions = useCallback(async () => {
    const r = await api.get("/chat/sessions");
    setSessions(r.data.sessions);
  }, []);

  useEffect(() => {
    loadSessions().catch((e) => toast.error(errorMessage(e)));
  }, [loadSessions]);

  useEffect(() => {
    if (!activeId) return setMessages([]);
    api
      .get(`/chat/sessions/${activeId}/messages`)
      .then((r) => setMessages(r.data.messages))
      .catch(() => {
        setActiveId(null);
        setParams({});
      });
  }, [activeId, setParams]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, sending]);

  const openSession = (id: string | null) => {
    setActiveId(id);
    setParams(id ? { session: id } : {});
    setShowList(false);
  };

  const send = async (text: string) => {
    const question = text.trim();
    if (!question || sending) return;
    setInput("");
    setSending(true);

    // Optimistic user bubble
    const tempId = `tmp-${Date.now()}`;
    setMessages((m) => [...m, { _id: tempId, role: "user", content: question, createdAt: new Date().toISOString() }]);

    try {
      let id = activeId;
      if (!id) {
        const s = await api.post("/chat/sessions");
        id = s.data.session._id as string;
        setActiveId(id);
        setParams({ session: id });
      }
      const r = await api.post(`/chat/sessions/${id}/messages`, { question });
      setMessages((m) => [...m.filter((x) => x._id !== tempId), r.data.userMessage, r.data.assistantMessage]);
      loadSessions();
    } catch (e) {
      setMessages((m) => m.filter((x) => x._id !== tempId));
      setInput(question);
      toast.error(errorMessage(e, "Could not get an answer"));
    } finally {
      setSending(false);
    }
  };

  const rename = async (s: Session) => {
    const title = window.prompt("Rename chat", s.title)?.trim();
    if (!title || title === s.title) return;
    try {
      await api.patch(`/chat/sessions/${s._id}`, { title });
      loadSessions();
    } catch (e) {
      toast.error(errorMessage(e));
    }
  };

  const remove = async (s: Session) => {
    if (!window.confirm(`Delete "${s.title}"? This cannot be undone.`)) return;
    try {
      await api.delete(`/chat/sessions/${s._id}`);
      if (s._id === activeId) openSession(null);
      loadSessions();
    } catch (e) {
      toast.error(errorMessage(e));
    }
  };

  const feedback = async (msg: Message, value: "up" | "down") => {
    try {
      await api.post(`/chat/messages/${msg._id}/feedback`, { value });
      setMessages((all) => all.map((m) => (m._id === msg._id ? { ...m, feedback: { value } } : m)));
    } catch (e) {
      toast.error(errorMessage(e));
    }
  };

  return (
    <div className="flex h-[calc(100vh-7.5rem)] gap-4 lg:h-[calc(100vh-4rem)]">
      {/* Session list */}
      <aside
        className={`${showList ? "fixed inset-x-4 top-20 z-30 max-h-[70vh] shadow-xl" : "hidden"} w-auto flex-col overflow-hidden rounded-xl border border-slate-200 bg-white md:static md:flex md:w-64 md:max-h-none md:shadow-none ${showList ? "flex" : ""}`}
      >
        <div className="border-b border-slate-100 p-3">
          <button onClick={() => openSession(null)} className="btn-primary w-full">
            <MessageSquarePlus className="h-4 w-4" /> {t("chat.new")}
          </button>
        </div>
        <ul className="flex-1 overflow-y-auto p-2">
          {sessions.length === 0 && <li className="p-3 text-center text-xs text-slate-400">No chats yet</li>}
          {sessions.map((s) => (
            <li key={s._id}>
              <div className={`group flex items-center gap-1 rounded-lg px-2 py-2 ${s._id === activeId ? "bg-brand-50" : "hover:bg-slate-50"}`}>
                <button onClick={() => openSession(s._id)} className="min-w-0 flex-1 truncate text-left text-sm text-slate-700">
                  {s.title}
                </button>
                <button onClick={() => rename(s)} aria-label="Rename chat" className="rounded p-1 text-slate-400 hover:bg-white hover:text-slate-700">
                  <Pencil className="h-3.5 w-3.5" />
                </button>
                <button onClick={() => remove(s)} aria-label="Delete chat" className="rounded p-1 text-slate-400 hover:bg-white hover:text-red-600">
                  <Trash2 className="h-3.5 w-3.5" />
                </button>
              </div>
            </li>
          ))}
        </ul>
      </aside>

      {/* Conversation */}
      <section className="flex min-w-0 flex-1 flex-col overflow-hidden rounded-xl border border-slate-200 bg-white">
        <div className="flex items-center justify-between border-b border-slate-100 px-4 py-2.5 md:hidden">
          <button onClick={() => setShowList((v) => !v)} className="btn-ghost px-3 py-1.5">
            <History className="h-4 w-4" /> Chats
          </button>
        </div>

        <div className="flex-1 space-y-5 overflow-y-auto p-4 sm:p-6">
          {messages.length === 0 && !sending && (
            <div className="mx-auto mt-6 max-w-lg text-center">
              <span className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-xl bg-brand-50 text-brand-600">
                <Sparkles className="h-6 w-6" />
              </span>
              <p className="font-medium text-slate-800">{t("chat.empty")}</p>
              {user?.department && (
                <p className="mt-1 text-xs text-slate-400">Personalised for {user.department}, semester {user.semester}</p>
              )}
              <div className="mt-5 grid gap-2">
                {SUGGESTIONS.map((q) => (
                  <button key={q} onClick={() => send(q)} className="rounded-lg border border-slate-200 px-4 py-2.5 text-left text-sm text-slate-600 hover:border-brand-500 hover:bg-brand-50">
                    {q}
                  </button>
                ))}
              </div>
            </div>
          )}

          {messages.map((m) =>
            m.role === "user" ? (
              <div key={m._id} className="flex justify-end">
                <div className="max-w-[85%] rounded-2xl rounded-br-sm bg-brand-600 px-4 py-2.5 text-sm text-white">{m.content}</div>
              </div>
            ) : (
              <div key={m._id} className="max-w-[92%]">
                <div className="rounded-2xl rounded-bl-sm border border-slate-200 bg-slate-50 px-4 py-3 text-sm leading-relaxed text-slate-800">
                  <div className="prose-chat">
                    <ReactMarkdown>{m.content}</ReactMarkdown>
                  </div>
                  {m.grounded === false && (
                    <div className="mt-2">
                      <Badge tone="amber">Not found in uploaded documents</Badge>
                    </div>
                  )}
                </div>

                {m.sources && m.sources.length > 0 && (
                  <div className="mt-2">
                    <p className="mb-1 text-xs font-medium uppercase tracking-wide text-slate-400">{t("chat.sources")}</p>
                    <div className="flex flex-wrap gap-2">
                      {m.sources.map((s, i) => (
                        <button
                          key={i}
                          onClick={() => setSource(s)}
                          className="inline-flex max-w-full items-center gap-1.5 rounded-lg border border-brand-100 bg-brand-50 px-2.5 py-1 text-xs text-brand-700 hover:bg-brand-100"
                        >
                          <FileText className="h-3.5 w-3.5 shrink-0" />
                          <span className="truncate">{s.documentName}</span>
                          <span className="shrink-0 font-semibold">p.{s.page}</span>
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                <div className="mt-1.5 flex gap-1">
                  <button
                    onClick={() => feedback(m, "up")}
                    aria-label="Helpful"
                    className={`rounded p-1.5 hover:bg-slate-100 ${m.feedback?.value === "up" ? "text-emerald-600" : "text-slate-400"}`}
                  >
                    <ThumbsUp className="h-4 w-4" />
                  </button>
                  <button
                    onClick={() => feedback(m, "down")}
                    aria-label="Not helpful"
                    className={`rounded p-1.5 hover:bg-slate-100 ${m.feedback?.value === "down" ? "text-red-600" : "text-slate-400"}`}
                  >
                    <ThumbsDown className="h-4 w-4" />
                  </button>
                </div>
              </div>
            )
          )}

          {sending && (
            <div className="flex items-center gap-2 text-sm text-slate-500">
              <Loader2 className="h-4 w-4 animate-spin" /> {t("chat.thinking")}
            </div>
          )}
          <div ref={bottomRef} />
        </div>

        <form
          onSubmit={(e) => {
            e.preventDefault();
            send(input);
          }}
          className="flex gap-2 border-t border-slate-100 p-3"
        >
          <input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            maxLength={2000}
            placeholder={t("chat.placeholder")}
            className="input"
            aria-label="Your question"
          />
          <button className="btn-primary" disabled={sending || !input.trim()}>
            <Send className="h-4 w-4" />
            <span className="hidden sm:inline">{t("chat.send")}</span>
          </button>
        </form>
      </section>

      {source && <SourceModal source={source} onClose={() => setSource(null)} />}
    </div>
  );
}
