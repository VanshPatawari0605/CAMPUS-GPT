import { CalendarClock } from "lucide-react";
import { useEffect, useState } from "react";
import toast from "react-hot-toast";
import { Badge, daysUntil, Empty, fmtDate, PageHeader, PageLoader } from "../components/ui";
import { api, errorMessage } from "../lib/api";
import type { Deadline } from "../lib/types";

export default function Deadlines() {
  const [items, setItems] = useState<Deadline[] | null>(null);

  useEffect(() => {
    api.get("/deadlines").then((r) => setItems(r.data.deadlines)).catch((e) => {
      toast.error(errorMessage(e));
      setItems([]);
    });
  }, []);

  if (!items) return <PageLoader />;

  return (
    <>
      <PageHeader title="Academic deadlines" subtitle="Admin-approved dates for your department and semester." />
      {items.length === 0 ? (
        <Empty>No upcoming deadlines right now.</Empty>
      ) : (
        <ul className="space-y-3">
          {items.map((d) => {
            const soon = (new Date(d.date).getTime() - Date.now()) / 86400000 <= 3;
            return (
              <li key={d._id} className="card flex items-start gap-4">
                <span className={`flex h-12 w-12 shrink-0 flex-col items-center justify-center rounded-lg text-center ${soon ? "bg-red-50 text-red-600" : "bg-brand-50 text-brand-700"}`}>
                  <CalendarClock className="h-5 w-5" />
                </span>
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <h3 className="font-medium text-slate-900">{d.title}</h3>
                    <Badge tone={soon ? "red" : "amber"}>{daysUntil(d.date)}</Badge>
                  </div>
                  <p className="text-sm text-slate-500">{fmtDate(d.date)}</p>
                  {d.description && <p className="mt-1 text-sm text-slate-600">{d.description}</p>}
                  {d.sourceDocument && <p className="mt-1 text-xs text-slate-400">Source: {d.sourceDocument.title}</p>}
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </>
  );
}
