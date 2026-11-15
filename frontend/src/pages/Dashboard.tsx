import { ArrowRight, Bell, BookOpenCheck, CalendarClock, MessageSquare, Megaphone, Sparkles } from "lucide-react";
import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Badge, daysUntil, Empty, fmtDate, PageLoader } from "../components/ui";
import { useAuth } from "../context/AuthContext";
import { api } from "../lib/api";
import type { Announcement, Deadline, DocumentItem, Session } from "../lib/types";

export default function Dashboard() {
  const { user, t } = useAuth();
  const [data, setData] = useState<{
    deadlines: Deadline[]; notices: DocumentItem[]; sessions: Session[]; announcements: Announcement[]; quizCount: number;
  } | null>(null);

  useEffect(() => {
    Promise.allSettled([
      api.get("/deadlines"), api.get("/documents/notices"), api.get("/chat/sessions"),
      api.get("/announcements"), api.get("/quizzes"),
    ]).then(([d, n, s, a, q]) => {
      const val = <T,>(r: PromiseSettledResult<{ data: T }>, fallback: T) => (r.status === "fulfilled" ? r.value.data : fallback);
      setData({
        deadlines: val<{ deadlines: Deadline[] }>(d, { deadlines: [] }).deadlines,
        notices: val<{ notices: DocumentItem[] }>(n, { notices: [] }).notices,
        sessions: val<{ sessions: Session[] }>(s, { sessions: [] }).sessions,
        announcements: val<{ announcements: Announcement[] }>(a, { announcements: [] }).announcements,
        quizCount: val<{ quizzes: unknown[] }>(q, { quizzes: [] }).quizzes.length,
      });
    });
  }, []);

  if (!data) return <PageLoader />;

  const Section = ({ title, icon: Icon, to, children }: { title: string; icon: typeof Bell; to?: string; children: React.ReactNode }) => (
    <div className="card">
      <div className="mb-3 flex items-center justify-between">
        <h2 className="flex items-center gap-2 font-semibold text-slate-900">
          <Icon className="h-4 w-4 text-brand-600" /> {title}
        </h2>
        {to && <Link to={to} className="text-xs font-medium text-brand-600 hover:underline">View all</Link>}
      </div>
      {children}
    </div>
  );

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-slate-900">
          {t("dash.welcome")}, {user?.fullName.split(" ")[0]}
        </h1>
        <p className="mt-1 flex flex-wrap items-center gap-2 text-sm text-slate-500">
          <Badge tone="brand">{user?.department}</Badge>
          <Badge>Semester {user?.semester}</Badge>
        </p>
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <div className="relative overflow-hidden rounded-xl bg-gradient-to-br from-brand-600 to-indigo-800 p-6 text-white shadow-sm lg:col-span-2">
          <Sparkles className="absolute -right-4 -top-4 h-32 w-32 text-white/10" />
          <h2 className="text-xl font-semibold">{t("dash.askTitle")}</h2>
          <p className="mt-1 max-w-md text-sm text-indigo-100">{t("dash.askBody")}</p>
          <Link to="/chat" className="mt-5 inline-flex items-center gap-2 rounded-lg bg-white px-4 py-2 text-sm font-medium text-brand-700 hover:bg-indigo-50">
            <MessageSquare className="h-4 w-4" /> {t("dash.askButton")} <ArrowRight className="h-4 w-4" />
          </Link>
        </div>
        <Section title={t("dash.quiz")} icon={BookOpenCheck} to="/quizzes">
          <p className="text-sm text-slate-500">
            {data.quizCount ? `You have ${data.quizCount} saved quiz${data.quizCount > 1 ? "zes" : ""}.` : "Generate practice questions from your college documents."}
          </p>
          <Link to="/quizzes" className="btn-ghost mt-3">Practice now</Link>
        </Section>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <Section title={t("dash.deadlines")} icon={CalendarClock} to="/deadlines">
          {data.deadlines.length === 0 ? <Empty>{t("dash.none")}</Empty> : (
            <ul className="divide-y divide-slate-100">
              {data.deadlines.slice(0, 5).map((d) => (
                <li key={d._id} className="flex items-center justify-between gap-3 py-2.5">
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium text-slate-800">{d.title}</p>
                    <p className="text-xs text-slate-400">{fmtDate(d.date)}</p>
                  </div>
                  <Badge tone="amber">{daysUntil(d.date)}</Badge>
                </li>
              ))}
            </ul>
          )}
        </Section>

        <Section title={t("dash.notices")} icon={Bell} to="/notices">
          {data.notices.length === 0 ? <Empty>{t("dash.none")}</Empty> : (
            <ul className="divide-y divide-slate-100">
              {data.notices.slice(0, 5).map((n) => (
                <li key={n._id} className="py-2.5">
                  <p className="truncate text-sm font-medium text-slate-800">{n.title}</p>
                  <p className="text-xs text-slate-400">{n.category} · {fmtDate(n.createdAt)}</p>
                </li>
              ))}
            </ul>
          )}
        </Section>

        <Section title={t("dash.chats")} icon={MessageSquare} to="/chat">
          {data.sessions.length === 0 ? <Empty>{t("dash.none")}</Empty> : (
            <ul className="divide-y divide-slate-100">
              {data.sessions.slice(0, 5).map((s) => (
                <li key={s._id}>
                  <Link to={`/chat?session=${s._id}`} className="flex items-center justify-between gap-3 py-2.5 hover:text-brand-600">
                    <span className="truncate text-sm">{s.title}</span>
                    <span className="shrink-0 text-xs text-slate-400">{fmtDate(s.updatedAt)}</span>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </Section>

        <Section title={t("dash.announcements")} icon={Megaphone}>
          {data.announcements.length === 0 ? <Empty>{t("dash.none")}</Empty> : (
            <ul className="space-y-3">
              {data.announcements.slice(0, 4).map((a) => (
                <li key={a._id}>
                  <p className="flex items-center gap-2 text-sm font-medium text-slate-800">
                    {a.title} {a.priority === "important" && <Badge tone="red">Important</Badge>}
                  </p>
                  <p className="line-clamp-2 text-xs text-slate-500">{a.body}</p>
                </li>
              ))}
            </ul>
          )}
        </Section>
      </div>
    </div>
  );
}
