import { Eye, RefreshCw, ScanText, Trash2, Upload } from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";
import { useForm } from "react-hook-form";
import toast from "react-hot-toast";
import NoticeDetails from "../../components/NoticeDetails";
import { Badge, Empty, fmtDate, Modal, PageHeader, PageLoader, Spinner } from "../../components/ui";
import { api, errorMessage } from "../../lib/api";
import { DEPARTMENTS, DOC_CATEGORIES, type DocumentItem } from "../../lib/types";

interface Form { title: string; category: string; department: string; semester: number; isNotice: boolean }

const statusTone = { ready: "green", processing: "amber", failed: "red" } as const;
const MAX_MB = 25;

export default function AdminDocuments() {
  const [docs, setDocs] = useState<DocumentItem[] | null>(null);
  const [file, setFile] = useState<File | null>(null);
  const [progress, setProgress] = useState<number | null>(null);
  const [viewing, setViewing] = useState<DocumentItem | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  const { register, handleSubmit, reset, formState: { isSubmitting } } = useForm<Form>({
    defaultValues: { category: "General", department: "All", semester: 0, isNotice: false },
  });

  const load = useCallback(
    () => api.get("/admin/documents").then((r) => setDocs(r.data.documents)).catch((e) => { toast.error(errorMessage(e)); setDocs([]); }),
    []
  );
  useEffect(() => { load(); }, [load]);

  // Poll while anything is still being indexed or analysed.
  const busy = docs?.some((d) => d.status === "processing" || d.analysisStatus === "running");
  useEffect(() => {
    if (!busy) return;
    const id = setInterval(load, 3000);
    return () => clearInterval(id);
  }, [busy, load]);

  const pickFile = (f: File | null) => {
    if (!f) return setFile(null);
    if (f.type !== "application/pdf") return toast.error("Only PDF files are allowed");
    if (f.size > MAX_MB * 1024 * 1024) return toast.error(`File must be under ${MAX_MB} MB`);
    setFile(f);
  };

  const onSubmit = async (d: Form) => {
    if (!file) return toast.error("Choose a PDF first");
    const fd = new FormData();
    fd.append("file", file);
    fd.append("title", d.title);
    fd.append("category", d.category);
    fd.append("department", d.department);
    fd.append("semester", String(d.semester));
    fd.append("isNotice", String(d.isNotice));
    try {
      setProgress(0);
      await api.post("/admin/documents", fd, {
        onUploadProgress: (e) => setProgress(Math.round((e.loaded * 100) / (e.total || file.size))),
      });
      toast.success("Uploaded. Indexing has started.");
      reset();
      setFile(null);
      if (fileRef.current) fileRef.current.value = "";
      load();
    } catch (e) {
      toast.error(errorMessage(e, "Upload failed"));
    } finally {
      setProgress(null);
    }
  };

  const act = async (fn: () => Promise<unknown>, ok: string) => {
    try {
      await fn();
      toast.success(ok);
      load();
    } catch (e) {
      toast.error(errorMessage(e));
    }
  };

  return (
    <>
      <PageHeader title="Documents & notices" subtitle="Upload PDFs to index them for the chatbot. Mark circulars as notices to extract structured details." />

      <form onSubmit={handleSubmit(onSubmit)} className="card mb-8 space-y-4">
        <h2 className="font-semibold text-slate-900">Upload a document</h2>
        <div
          onClick={() => fileRef.current?.click()}
          onDragOver={(e) => e.preventDefault()}
          onDrop={(e) => { e.preventDefault(); pickFile(e.dataTransfer.files[0] ?? null); }}
          className="flex cursor-pointer flex-col items-center rounded-lg border-2 border-dashed border-slate-300 p-6 text-center hover:border-brand-500 hover:bg-brand-50/40"
        >
          <Upload className="mb-2 h-6 w-6 text-slate-400" />
          <p className="text-sm text-slate-600">{file ? file.name : "Click or drag a PDF here"}</p>
          <p className="text-xs text-slate-400">PDF only, up to {MAX_MB} MB</p>
          <input ref={fileRef} type="file" accept="application/pdf" className="hidden" onChange={(e) => pickFile(e.target.files?.[0] ?? null)} />
        </div>

        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <div className="sm:col-span-2 lg:col-span-4">
            <label className="label" htmlFor="title">Title</label>
            <input id="title" className="input" placeholder="Academic Regulations 2026" {...register("title", { required: true, minLength: 2 })} />
          </div>
          <div>
            <label className="label" htmlFor="category">Category</label>
            <select id="category" className="input" {...register("category")}>{DOC_CATEGORIES.map((c) => <option key={c}>{c}</option>)}</select>
          </div>
          <div>
            <label className="label" htmlFor="department">Department</label>
            <select id="department" className="input" {...register("department")}>
              <option value="All">All departments</option>
              {DEPARTMENTS.map((d) => <option key={d}>{d}</option>)}
            </select>
          </div>
          <div>
            <label className="label" htmlFor="semester">Semester</label>
            <select id="semester" className="input" {...register("semester")}>
              <option value={0}>All semesters</option>
              {[1, 2, 3, 4, 5, 6, 7, 8].map((s) => <option key={s} value={s}>{s}</option>)}
            </select>
          </div>
          <label className="flex items-end gap-2 pb-2 text-sm text-slate-700">
            <input type="checkbox" {...register("isNotice")} /> This is a notice / circular
          </label>
        </div>

        {progress !== null && (
          <div>
            <div className="h-2 overflow-hidden rounded-full bg-slate-100">
              <div className="h-full bg-brand-600 transition-all" style={{ width: `${progress}%` }} />
            </div>
            <p className="mt-1 text-xs text-slate-500">Uploading {progress}%</p>
          </div>
        )}
        <button className="btn-primary" disabled={isSubmitting}>{isSubmitting && <Spinner className="text-white" />} Upload & index</button>
      </form>

      {!docs ? <PageLoader /> : docs.length === 0 ? <Empty>No documents uploaded yet.</Empty> : (
        <div className="space-y-3">
          {docs.map((d) => (
            <div key={d._id} className="card">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <h3 className="font-medium text-slate-900">{d.title}</h3>
                    <Badge tone={statusTone[d.status]}>{d.status === "processing" ? "Indexing..." : d.status}</Badge>
                    {d.isNotice && <Badge tone="brand">Notice</Badge>}
                    {d.analysisStatus === "running" && <Badge tone="amber">Analysing...</Badge>}
                    {d.analysisStatus === "failed" && <Badge tone="red">Analysis failed</Badge>}
                  </div>
                  <p className="mt-1 text-xs text-slate-400">
                    {d.category} · {d.department} · {d.semester ? `Sem ${d.semester}` : "All semesters"} · {fmtDate(d.createdAt)}
                    {d.status === "ready" && ` · ${d.pages} pages, ${d.chunks} chunks`}
                  </p>
                  {d.status === "failed" && d.error && <p className="mt-2 text-sm text-red-600">{d.error}</p>}
                </div>
                <div className="flex gap-1">
                  {d.analysis && (
                    <button className="btn-ghost px-2.5 py-1.5" onClick={() => setViewing(d)} title="View extracted details"><Eye className="h-4 w-4" /></button>
                  )}
                  {d.status === "ready" && (
                    <button className="btn-ghost px-2.5 py-1.5" title="Extract notice details" disabled={d.analysisStatus === "running"}
                      onClick={() => act(() => api.post(`/admin/documents/${d._id}/analyze`), "Analysis started")}>
                      <ScanText className="h-4 w-4" />
                    </button>
                  )}
                  <button className="btn-ghost px-2.5 py-1.5" title="Re-index" disabled={d.status === "processing"}
                    onClick={() => act(() => api.post(`/admin/documents/${d._id}/reindex`), "Re-indexing started")}>
                    <RefreshCw className="h-4 w-4" />
                  </button>
                  <button className="btn-ghost px-2.5 py-1.5 text-red-600" title="Delete"
                    onClick={() => window.confirm(`Delete "${d.title}" and its indexed data?`) && act(() => api.delete(`/admin/documents/${d._id}`), "Document deleted")}>
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {viewing?.analysis && (
        <Modal title={viewing.analysis.title || viewing.title} onClose={() => setViewing(null)}>
          <NoticeDetails analysis={viewing.analysis} />
          <details className="mt-5">
            <summary className="cursor-pointer text-xs text-slate-400">Raw JSON</summary>
            <pre className="mt-2 max-h-64 overflow-auto rounded bg-slate-900 p-3 text-xs text-slate-100">{JSON.stringify(viewing.analysis, null, 2)}</pre>
          </details>
        </Modal>
      )}
    </>
  );
}
