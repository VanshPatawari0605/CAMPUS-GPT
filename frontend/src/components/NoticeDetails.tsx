import type { NoticeAnalysis } from "../lib/types";
import { Badge } from "./ui";

const List = ({ title, items }: { title: string; items?: string[] }) =>
  items && items.length > 0 ? (
    <div>
      <h4 className="mb-1 text-xs font-semibold uppercase tracking-wide text-slate-400">{title}</h4>
      <ul className="list-disc space-y-0.5 pl-5 text-sm text-slate-700">
        {items.map((x, i) => <li key={i}>{x}</li>)}
      </ul>
    </div>
  ) : null;

/** Structured view of the AI-extracted notice JSON. */
export default function NoticeDetails({ analysis }: { analysis: NoticeAnalysis }) {
  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-2">
        {analysis.category && <Badge tone="brand">{analysis.category}</Badge>}
        {analysis.targetDepartment && <Badge>Dept: {analysis.targetDepartment}</Badge>}
        <Badge>Semester: {analysis.targetSemester ?? "All"}</Badge>
      </div>
      {analysis.summary && <p className="text-sm text-slate-700">{analysis.summary}</p>}

      {analysis.importantDates && analysis.importantDates.length > 0 && (
        <div>
          <h4 className="mb-1 text-xs font-semibold uppercase tracking-wide text-slate-400">Important dates</h4>
          <ul className="space-y-1 text-sm">
            {analysis.importantDates.map((d, i) => (
              <li key={i} className="flex justify-between gap-3 rounded bg-slate-50 px-3 py-1.5">
                <span className="text-slate-700">{d.label}</span>
                <span className="font-medium text-slate-900">{d.date || d.rawText || "—"}</span>
              </li>
            ))}
          </ul>
        </div>
      )}

      {analysis.deadlines && analysis.deadlines.length > 0 && (
        <div>
          <h4 className="mb-1 text-xs font-semibold uppercase tracking-wide text-slate-400">Deadlines</h4>
          <ul className="space-y-1 text-sm">
            {analysis.deadlines.map((d, i) => (
              <li key={i} className="rounded border border-amber-200 bg-amber-50 px-3 py-1.5">
                <span className="font-medium text-amber-900">{d.title}</span>
                <span className="ml-2 text-amber-800">{d.date || "date not stated"}</span>
                {d.description && <p className="text-xs text-amber-800/80">{d.description}</p>}
              </li>
            ))}
          </ul>
        </div>
      )}

      <List title="Eligibility" items={analysis.eligibility} />
      <List title="Required documents" items={analysis.requiredDocuments} />
      <List title="Instructions" items={analysis.instructions} />
    </div>
  );
}
