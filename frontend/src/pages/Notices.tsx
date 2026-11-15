import { ExternalLink, FileText } from "lucide-react";
import { useEffect, useState } from "react";
import toast from "react-hot-toast";
import NoticeDetails from "../components/NoticeDetails";
import { Badge, Empty, fmtDate, Modal, PageHeader, PageLoader } from "../components/ui";
import { api, errorMessage, openPdf } from "../lib/api";
import type { DocumentItem } from "../lib/types";

export default function Notices() {
  const [notices, setNotices] = useState<DocumentItem[] | null>(null);
  const [selected, setSelected] = useState<DocumentItem | null>(null);

  useEffect(() => {
    api.get("/documents/notices").then((r) => setNotices(r.data.notices)).catch((e) => {
      toast.error(errorMessage(e));
      setNotices([]);
    });
  }, []);

  if (!notices) return <PageLoader />;

  return (
    <>
      <PageHeader title="Notices & circulars" subtitle="AI-extracted summaries of official notices relevant to you." />
      {notices.length === 0 ? (
        <Empty>No notices have been published for your department and semester yet.</Empty>
      ) : (
        <div className="grid gap-4 md:grid-cols-2">
          {notices.map((n) => (
            <button key={n._id} onClick={() => setSelected(n)} className="card text-left transition hover:border-brand-500">
              <div className="mb-2 flex items-center gap-2">
                <FileText className="h-4 w-4 text-brand-600" />
                <Badge tone="brand">{n.analysis?.category || n.category}</Badge>
                <span className="ml-auto text-xs text-slate-400">{fmtDate(n.createdAt)}</span>
              </div>
              <h3 className="font-medium text-slate-900">{n.analysis?.title || n.title}</h3>
              <p className="mt-1 line-clamp-2 text-sm text-slate-500">
                {n.analysis?.summary || (n.analysisStatus === "running" ? "Analysis in progress..." : "Open to view the document.")}
              </p>
            </button>
          ))}
        </div>
      )}

      {selected && (
        <Modal title={selected.analysis?.title || selected.title} onClose={() => setSelected(null)}>
          {selected.analysis ? <NoticeDetails analysis={selected.analysis} /> : <p className="text-sm text-slate-500">No extracted details are available for this notice.</p>}
          <button
            className="btn-ghost mt-5"
            onClick={() => openPdf(selected._id).catch((e) => toast.error(errorMessage(e)))}
          >
            <ExternalLink className="h-4 w-4" /> Open original PDF
          </button>
        </Modal>
      )}
    </>
  );
}
