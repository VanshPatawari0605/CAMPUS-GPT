import { Loader2, X } from "lucide-react";
import type { ReactNode } from "react";

export const Spinner = ({ className = "" }: { className?: string }) => (
  <Loader2 className={`h-5 w-5 animate-spin text-brand-600 ${className}`} />
);

export const PageLoader = () => (
  <div className="flex h-64 items-center justify-center">
    <Spinner className="h-8 w-8" />
  </div>
);

export function PageHeader({ title, subtitle, action }: { title: string; subtitle?: string; action?: ReactNode }) {
  return (
    <div className="mb-6 flex flex-wrap items-start justify-between gap-3">
      <div>
        <h1 className="text-2xl font-semibold text-slate-900">{title}</h1>
        {subtitle && <p className="mt-1 text-sm text-slate-500">{subtitle}</p>}
      </div>
      {action}
    </div>
  );
}

const tones = {
  slate: "bg-slate-100 text-slate-700",
  green: "bg-emerald-100 text-emerald-700",
  amber: "bg-amber-100 text-amber-800",
  red: "bg-red-100 text-red-700",
  brand: "bg-brand-100 text-brand-700",
};

export const Badge = ({ children, tone = "slate" }: { children: ReactNode; tone?: keyof typeof tones }) => (
  <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${tones[tone]}`}>{children}</span>
);

export const Empty = ({ children }: { children: ReactNode }) => (
  <p className="rounded-lg border border-dashed border-slate-200 p-4 text-center text-sm text-slate-400">{children}</p>
);

export function Modal({ title, onClose, children }: { title: string; onClose: () => void; children: ReactNode }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4" onClick={onClose}>
      <div
        className="max-h-[85vh] w-full max-w-2xl overflow-y-auto rounded-xl bg-white p-6 shadow-xl"
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
      >
        <div className="mb-4 flex items-start justify-between gap-4">
          <h2 className="text-lg font-semibold text-slate-900">{title}</h2>
          <button onClick={onClose} className="rounded p-1 text-slate-400 hover:bg-slate-100" aria-label="Close">
            <X className="h-5 w-5" />
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}

export const fmtDate = (d: string | Date) =>
  new Date(d).toLocaleDateString(undefined, { day: "numeric", month: "short", year: "numeric" });

export function daysUntil(d: string) {
  const diff = Math.ceil((new Date(d).getTime() - Date.now()) / 86400000);
  return diff <= 0 ? "Today" : diff === 1 ? "Tomorrow" : `In ${diff} days`;
}
