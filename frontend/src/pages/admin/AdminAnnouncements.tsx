import { Trash2 } from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import toast from "react-hot-toast";
import { Badge, Empty, fmtDate, PageHeader, PageLoader, Spinner } from "../../components/ui";
import { api, errorMessage } from "../../lib/api";
import { DEPARTMENTS, type Announcement } from "../../lib/types";

interface Form { title: string; body: string; priority: "normal" | "important"; department: string }

export default function AdminAnnouncements() {
  const [items, setItems] = useState<Announcement[] | null>(null);
  const { register, handleSubmit, reset, formState: { isSubmitting } } = useForm<Form>({
    defaultValues: { priority: "normal", department: "All" },
  });

  const load = useCallback(
    () => api.get("/announcements").then((r) => setItems(r.data.announcements)).catch((e) => { toast.error(errorMessage(e)); setItems([]); }),
    []
  );
  useEffect(() => { load(); }, [load]);

  const onSubmit = async (d: Form) => {
    try {
      await api.post("/announcements", d);
      toast.success("Announcement published");
      reset();
      load();
    } catch (e) {
      toast.error(errorMessage(e));
    }
  };

  const remove = async (a: Announcement) => {
    if (!window.confirm(`Delete "${a.title}"?`)) return;
    try {
      await api.delete(`/announcements/${a._id}`);
      load();
    } catch (e) {
      toast.error(errorMessage(e));
    }
  };

  return (
    <>
      <PageHeader title="Announcements" subtitle="Short messages shown on every student's dashboard." />
      <div className="grid gap-6 lg:grid-cols-5">
        <form onSubmit={handleSubmit(onSubmit)} className="card space-y-4 lg:col-span-2">
          <div>
            <label className="label" htmlFor="title">Title</label>
            <input id="title" className="input" {...register("title", { required: true, minLength: 2 })} />
          </div>
          <div>
            <label className="label" htmlFor="body">Message</label>
            <textarea id="body" rows={4} className="input" {...register("body", { required: true })} />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="label" htmlFor="priority">Priority</label>
              <select id="priority" className="input" {...register("priority")}>
                <option value="normal">Normal</option><option value="important">Important</option>
              </select>
            </div>
            <div>
              <label className="label" htmlFor="dep">Audience</label>
              <select id="dep" className="input" {...register("department")}>
                <option value="All">Everyone</option>
                {DEPARTMENTS.map((d) => <option key={d}>{d}</option>)}
              </select>
            </div>
          </div>
          <button className="btn-primary w-full" disabled={isSubmitting}>{isSubmitting && <Spinner className="text-white" />} Publish</button>
        </form>

        <div className="lg:col-span-3">
          {!items ? <PageLoader /> : items.length === 0 ? <Empty>No announcements yet.</Empty> : (
            <ul className="space-y-3">
              {items.map((a) => (
                <li key={a._id} className="card flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <h3 className="font-medium text-slate-900">{a.title}</h3>
                      {a.priority === "important" && <Badge tone="red">Important</Badge>}
                      <Badge>{a.department === "All" ? "Everyone" : a.department}</Badge>
                    </div>
                    <p className="mt-1 text-sm text-slate-600">{a.body}</p>
                    <p className="mt-1 text-xs text-slate-400">{fmtDate(a.createdAt)}</p>
                  </div>
                  <button className="btn-ghost px-2.5 py-1.5 text-red-600" onClick={() => remove(a)} aria-label="Delete"><Trash2 className="h-4 w-4" /></button>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </>
  );
}
