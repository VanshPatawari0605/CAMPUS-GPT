import { Check, Pencil, Plus, Trash2, X } from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import toast from "react-hot-toast";
import { Badge, Empty, fmtDate, Modal, PageHeader, PageLoader, Spinner } from "../../components/ui";
import { api, errorMessage } from "../../lib/api";
import { DEPARTMENTS, type Deadline } from "../../lib/types";

interface Form { title: string; description: string; date: string; department: string; semester: number }
const TABS = ["pending", "approved", "rejected"] as const;
const tone = { pending: "amber", approved: "green", rejected: "red" } as const;

export default function AdminDeadlines() {
  const [tab, setTab] = useState<(typeof TABS)[number]>("pending");
  const [items, setItems] = useState<Deadline[] | null>(null);
  const [editing, setEditing] = useState<Deadline | "new" | null>(null);

  const load = useCallback(() => {
    setItems(null);
    api.get("/admin/deadlines", { params: { status: tab } }).then((r) => setItems(r.data.deadlines)).catch((e) => {
      toast.error(errorMessage(e));
      setItems([]);
    });
  }, [tab]);
  useEffect(load, [load]);

  const setStatus = async (d: Deadline, status: Deadline["status"]) => {
    try {
      await api.patch(`/admin/deadlines/${d._id}`, { status });
      toast.success(status === "approved" ? "Deadline approved and visible to students" : "Updated");
      load();
    } catch (e) {
      toast.error(errorMessage(e));
    }
  };

  const remove = async (d: Deadline) => {
    if (!window.confirm(`Delete "${d.title}"?`)) return;
    try {
      await api.delete(`/admin/deadlines/${d._id}`);
      load();
    } catch (e) {
      toast.error(errorMessage(e));
    }
  };

  return (
    <>
      <PageHeader
        title="Deadline review"
        subtitle="Deadlines extracted from notices appear here. Only approved ones are shown to students."
        action={<button className="btn-primary" onClick={() => setEditing("new")}><Plus className="h-4 w-4" /> Add deadline</button>}
      />

      <div className="mb-4 flex gap-1 rounded-lg bg-slate-100 p-1 sm:w-fit">
        {TABS.map((t) => (
          <button key={t} onClick={() => setTab(t)} className={`flex-1 rounded-md px-4 py-1.5 text-sm font-medium capitalize ${tab === t ? "bg-white shadow-sm" : "text-slate-500"}`}>{t}</button>
        ))}
      </div>

      {!items ? <PageLoader /> : items.length === 0 ? <Empty>No {tab} deadlines.</Empty> : (
        <ul className="space-y-3">
          {items.map((d) => (
            <li key={d._id} className="card flex flex-wrap items-start justify-between gap-3">
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                  <h3 className="font-medium text-slate-900">{d.title}</h3>
                  <Badge tone={tone[d.status]}>{d.status}</Badge>
                </div>
                <p className="text-sm text-slate-600">{fmtDate(d.date)} · {d.department} · {d.semester ? `Sem ${d.semester}` : "All semesters"}</p>
                {d.description && <p className="mt-1 text-sm text-slate-500">{d.description}</p>}
                {d.sourceDocument && <p className="mt-1 text-xs text-slate-400">From: {d.sourceDocument.title}</p>}
              </div>
              <div className="flex gap-1">
                {d.status !== "approved" && <button className="btn-ghost px-2.5 py-1.5 text-emerald-700" title="Approve" onClick={() => setStatus(d, "approved")}><Check className="h-4 w-4" /></button>}
                {d.status !== "rejected" && <button className="btn-ghost px-2.5 py-1.5 text-amber-700" title="Reject" onClick={() => setStatus(d, "rejected")}><X className="h-4 w-4" /></button>}
                <button className="btn-ghost px-2.5 py-1.5" title="Edit" onClick={() => setEditing(d)}><Pencil className="h-4 w-4" /></button>
                <button className="btn-ghost px-2.5 py-1.5 text-red-600" title="Delete" onClick={() => remove(d)}><Trash2 className="h-4 w-4" /></button>
              </div>
            </li>
          ))}
        </ul>
      )}

      {editing && <DeadlineModal deadline={editing === "new" ? null : editing} onClose={() => setEditing(null)} onSaved={() => { setEditing(null); load(); }} />}
    </>
  );
}

function DeadlineModal({ deadline, onClose, onSaved }: { deadline: Deadline | null; onClose: () => void; onSaved: () => void }) {
  const { register, handleSubmit, formState: { errors, isSubmitting } } = useForm<Form>({
    defaultValues: {
      title: deadline?.title ?? "", description: deadline?.description ?? "",
      date: deadline ? deadline.date.slice(0, 10) : "", department: deadline?.department ?? "All", semester: deadline?.semester ?? 0,
    },
  });

  const onSubmit = async (d: Form) => {
    const body = { ...d, semester: Number(d.semester) };
    try {
      if (deadline) await api.patch(`/admin/deadlines/${deadline._id}`, body);
      else await api.post("/admin/deadlines", body);
      toast.success("Saved");
      onSaved();
    } catch (e) {
      toast.error(errorMessage(e));
    }
  };

  return (
    <Modal title={deadline ? "Edit deadline" : "Add deadline"} onClose={onClose}>
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        <div>
          <label className="label" htmlFor="t">Title</label>
          <input id="t" className="input" {...register("title", { required: "Title is required" })} />
          {errors.title && <p className="mt-1 text-xs text-red-600">{errors.title.message}</p>}
        </div>
        <div>
          <label className="label" htmlFor="d">Description</label>
          <textarea id="d" rows={2} className="input" {...register("description")} />
        </div>
        <div className="grid gap-4 sm:grid-cols-3">
          <div>
            <label className="label" htmlFor="date">Date</label>
            <input id="date" type="date" className="input" {...register("date", { required: "Date is required" })} />
            {errors.date && <p className="mt-1 text-xs text-red-600">{errors.date.message}</p>}
          </div>
          <div>
            <label className="label" htmlFor="dep">Department</label>
            <select id="dep" className="input" {...register("department")}>
              <option value="All">All</option>
              {DEPARTMENTS.map((x) => <option key={x}>{x}</option>)}
            </select>
          </div>
          <div>
            <label className="label" htmlFor="sem">Semester</label>
            <select id="sem" className="input" {...register("semester")}>
              <option value={0}>All</option>
              {[1, 2, 3, 4, 5, 6, 7, 8].map((s) => <option key={s} value={s}>{s}</option>)}
            </select>
          </div>
        </div>
        <button className="btn-primary" disabled={isSubmitting}>{isSubmitting && <Spinner className="text-white" />} Save</button>
      </form>
    </Modal>
  );
}
