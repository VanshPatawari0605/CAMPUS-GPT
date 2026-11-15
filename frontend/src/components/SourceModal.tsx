import { ExternalLink } from "lucide-react";
import toast from "react-hot-toast";
import { errorMessage, openPdf } from "../lib/api";
import type { Source } from "../lib/types";
import { Badge, Modal } from "./ui";

export default function SourceModal({ source, onClose }: { source: Source; onClose: () => void }) {
  const open = () => openPdf(source.documentId, source.page).catch((e) => toast.error(errorMessage(e, "Could not open PDF")));

  return (
    <Modal title={source.documentName} onClose={onClose}>
      <div className="mb-3 flex flex-wrap items-center gap-2">
        <Badge tone="brand">Page {source.page}</Badge>
        {source.category && <Badge>{source.category}</Badge>}
        <Badge tone="green">Match {Math.round(source.score * 100)}%</Badge>
      </div>
      <p className="mb-1 text-xs font-medium uppercase tracking-wide text-slate-400">Extracted passage</p>
      <blockquote className="whitespace-pre-wrap rounded-lg border-l-4 border-brand-500 bg-slate-50 p-4 text-sm leading-relaxed text-slate-700">
        {source.passage}
      </blockquote>
      <button onClick={open} className="btn-primary mt-4">
        <ExternalLink className="h-4 w-4" /> Open PDF at page {source.page}
      </button>
    </Modal>
  );
}
