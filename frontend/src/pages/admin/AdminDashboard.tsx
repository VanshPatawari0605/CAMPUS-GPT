import { AlertTriangle, FileText, MessageSquare, SearchCheck, ThumbsDown, ThumbsUp, Users } from "lucide-react";
import { useEffect, useState } from "react";
import toast from "react-hot-toast";
import {
  Bar, BarChart, CartesianGrid, Cell, Legend, Line, LineChart, Pie, PieChart, ResponsiveContainer, Tooltip, XAxis, YAxis,
} from "recharts";
import { Empty, fmtDate, PageHeader, PageLoader } from "../../components/ui";
import { api, errorMessage } from "../../lib/api";

interface Slice { name: string; value: number }
interface Analytics {
  totals: { students: number; documents: number; chats: number; queries: number; answerRate: number; thumbsUp: number; thumbsDown: number };
  queriesPerDay: { date: string; total: number; answered: number }[];
  knowledgeGaps: { question: string; count: number; lastAsked: string; departments: string[] }[];
  topicsAsked: Slice[];
  byDepartment: Slice[];
  byLanguage: Slice[];
  documentsByCategory: Slice[];
}

const COLORS = ["#4f46e5", "#0ea5e9", "#10b981", "#f59e0b", "#ef4444", "#8b5cf6", "#64748b"];
const LANG_NAME: Record<string, string> = { en: "English", hi: "Hindi", or: "Odia" };

function Stat({ icon: Icon, label, value }: { icon: typeof Users; label: string; value: string | number }) {
  return (
    <div className="card flex items-center gap-4">
      <span className="flex h-11 w-11 items-center justify-center rounded-lg bg-brand-50 text-brand-600"><Icon className="h-5 w-5" /></span>
      <div>
        <p className="text-2xl font-semibold text-slate-900">{value}</p>
        <p className="text-xs text-slate-500">{label}</p>
      </div>
    </div>
  );
}

export default function AdminDashboard() {
  const [data, setData] = useState<Analytics | null>(null);

  useEffect(() => {
    api.get("/admin/analytics").then((r) => setData(r.data)).catch((e) => toast.error(errorMessage(e)));
  }, []);

  if (!data) return <PageLoader />;
  const { totals } = data;

  const Pie_ = ({ title, items }: { title: string; items: Slice[] }) => (
    <div className="card">
      <h3 className="mb-2 font-semibold text-slate-900">{title}</h3>
      {items.length === 0 ? <Empty>No data yet</Empty> : (
        <ResponsiveContainer width="100%" height={220}>
          <PieChart>
            <Pie data={items} dataKey="value" nameKey="name" innerRadius={45} outerRadius={80} paddingAngle={2}>
              {items.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
            </Pie>
            <Tooltip />
            <Legend />
          </PieChart>
        </ResponsiveContainer>
      )}
    </div>
  );

  return (
    <>
      <PageHeader title="Analytics" subtitle="Usage, answer quality and knowledge gaps across CampusGPT." />

      <div className="mb-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Stat icon={Users} label="Students" value={totals.students} />
        <Stat icon={FileText} label="Indexed documents" value={totals.documents} />
        <Stat icon={MessageSquare} label="Questions asked" value={totals.queries} />
        <Stat icon={SearchCheck} label="Answered from documents" value={`${totals.answerRate}%`} />
      </div>

      <div className="mb-6 grid gap-4 lg:grid-cols-3">
        <div className="card lg:col-span-2">
          <h3 className="mb-3 font-semibold text-slate-900">Questions, last 14 days</h3>
          <ResponsiveContainer width="100%" height={260}>
            <LineChart data={data.queriesPerDay}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
              <XAxis dataKey="date" tickFormatter={(d: string) => d.slice(5)} fontSize={12} />
              <YAxis allowDecimals={false} fontSize={12} />
              <Tooltip />
              <Legend />
              <Line type="monotone" dataKey="total" name="Asked" stroke="#4f46e5" strokeWidth={2} dot={false} />
              <Line type="monotone" dataKey="answered" name="Answered" stroke="#10b981" strokeWidth={2} dot={false} />
            </LineChart>
          </ResponsiveContainer>
        </div>
        <div className="card">
          <h3 className="mb-3 font-semibold text-slate-900">Answer feedback</h3>
          <div className="flex items-center justify-around py-6">
            <div className="text-center"><ThumbsUp className="mx-auto mb-1 h-6 w-6 text-emerald-600" /><p className="text-2xl font-semibold">{totals.thumbsUp}</p><p className="text-xs text-slate-500">Helpful</p></div>
            <div className="text-center"><ThumbsDown className="mx-auto mb-1 h-6 w-6 text-red-600" /><p className="text-2xl font-semibold">{totals.thumbsDown}</p><p className="text-xs text-slate-500">Not helpful</p></div>
          </div>
        </div>
      </div>

      <div className="card mb-6">
        <h3 className="mb-1 flex items-center gap-2 font-semibold text-slate-900">
          <AlertTriangle className="h-4 w-4 text-amber-500" /> Knowledge gaps
        </h3>
        <p className="mb-3 text-sm text-slate-500">Most frequent questions the chatbot could not answer. Upload documents covering these topics.</p>
        {data.knowledgeGaps.length === 0 ? <Empty>No unanswered questions yet.</Empty> : (
          <ul className="divide-y divide-slate-100">
            {data.knowledgeGaps.map((g, i) => (
              <li key={i} className="flex items-center justify-between gap-3 py-2.5">
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium text-slate-800">{g.question}</p>
                  <p className="text-xs text-slate-400">Last asked {fmtDate(g.lastAsked)}{g.departments.length ? ` · ${g.departments.join(", ")}` : ""}</p>
                </div>
                <span className="shrink-0 rounded-full bg-amber-100 px-2.5 py-0.5 text-xs font-semibold text-amber-800">{g.count}×</span>
              </li>
            ))}
          </ul>
        )}
      </div>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        <Pie_ title="Topics asked about" items={data.topicsAsked} />
        <Pie_ title="Documents by category" items={data.documentsByCategory} />
        <Pie_ title="Language usage" items={data.byLanguage.map((l) => ({ ...l, name: LANG_NAME[l.name] || l.name }))} />
        <div className="card md:col-span-2 xl:col-span-3">
          <h3 className="mb-2 font-semibold text-slate-900">Questions by department</h3>
          {data.byDepartment.length === 0 ? <Empty>No data yet</Empty> : (
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={data.byDepartment}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                <XAxis dataKey="name" fontSize={12} />
                <YAxis allowDecimals={false} fontSize={12} />
                <Tooltip />
                <Bar dataKey="value" name="Questions" fill="#4f46e5" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>
      </div>
    </>
  );
}
