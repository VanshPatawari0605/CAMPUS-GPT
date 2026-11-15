import { CheckCircle2, XCircle } from "lucide-react";
import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import toast from "react-hot-toast";
import { Badge, Empty, fmtDate, PageHeader, PageLoader, Spinner } from "../components/ui";
import { api, errorMessage } from "../lib/api";
import type { DocumentItem } from "../lib/types";

interface QuizSummary { _id: string; title: string; difficulty: string; createdAt: string; questionCount: number; bestScore: number }
interface Quiz { _id: string; title: string; questions: { _id: string; question: string; options: string[]; page?: number }[] }
interface Review { question: string; options: string[]; correctIndex: number; explanation: string; page?: number; yourAnswer: number }
interface GenForm { source: "topic" | "document"; topic: string; documentId: string; numQuestions: number; difficulty: string }

export default function Quizzes() {
  const [list, setList] = useState<QuizSummary[] | null>(null);
  const [docs, setDocs] = useState<DocumentItem[]>([]);
  const [quiz, setQuiz] = useState<Quiz | null>(null);
  const [answers, setAnswers] = useState<number[]>([]);
  const [result, setResult] = useState<{ score: number; total: number; review: Review[] } | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const { register, handleSubmit, watch, formState: { isSubmitting } } = useForm<GenForm>({
    defaultValues: { source: "topic", numQuestions: 5, difficulty: "medium" },
  });
  const source = watch("source");

  const load = () =>
    api.get("/quizzes").then((r) => setList(r.data.quizzes)).catch((e) => {
      toast.error(errorMessage(e));
      setList([]);
    });

  useEffect(() => {
    load();
    api.get("/documents").then((r) => setDocs(r.data.documents)).catch(() => {});
  }, []);

  const start = (q: Quiz) => {
    setQuiz(q);
    setAnswers(new Array(q.questions.length).fill(-1));
    setResult(null);
    window.scrollTo({ top: 0 });
  };

  const generate = async (d: GenForm) => {
    try {
      const r = await api.post("/quizzes/generate", {
        topic: d.source === "topic" ? d.topic : undefined,
        documentId: d.source === "document" ? d.documentId : undefined,
        numQuestions: Number(d.numQuestions),
        difficulty: d.difficulty,
      });
      start(r.data.quiz);
      load();
    } catch (e) {
      toast.error(errorMessage(e, "Could not generate a quiz"));
    }
  };

  const open = async (id: string) => {
    try {
      const r = await api.get(`/quizzes/${id}`);
      start(r.data.quiz);
    } catch (e) {
      toast.error(errorMessage(e));
    }
  };

  const submit = async () => {
    if (!quiz) return;
    setSubmitting(true);
    try {
      const r = await api.post(`/quizzes/${quiz._id}/attempt`, { answers });
      setResult({ score: r.data.attempt.score, total: r.data.attempt.total, review: r.data.review });
      load();
    } catch (e) {
      toast.error(errorMessage(e));
    } finally {
      setSubmitting(false);
    }
  };

  /* ---------- Result review ---------- */
  if (quiz && result) {
    return (
      <div className="mx-auto max-w-2xl">
        <PageHeader title="Your results" subtitle={quiz.title} />
        <div className="card mb-5 text-center">
          <p className="text-4xl font-semibold text-brand-600">{result.score}/{result.total}</p>
          <p className="mt-1 text-sm text-slate-500">{Math.round((result.score / result.total) * 100)}% correct</p>
        </div>
        <div className="space-y-4">
          {result.review.map((r, i) => (
            <div key={i} className="card">
              <p className="mb-3 font-medium text-slate-900">{i + 1}. {r.question}</p>
              <ul className="space-y-1.5">
                {r.options.map((o, j) => {
                  const correct = j === r.correctIndex;
                  const wrong = j === r.yourAnswer && !correct;
                  return (
                    <li key={j} className={`flex items-center gap-2 rounded-lg border px-3 py-2 text-sm ${correct ? "border-emerald-300 bg-emerald-50" : wrong ? "border-red-300 bg-red-50" : "border-slate-200"}`}>
                      {correct ? <CheckCircle2 className="h-4 w-4 text-emerald-600" /> : wrong ? <XCircle className="h-4 w-4 text-red-600" /> : <span className="h-4 w-4" />}
                      {o}
                    </li>
                  );
                })}
              </ul>
              <p className="mt-3 text-sm text-slate-600">{r.explanation}{r.page ? ` (Page ${r.page})` : ""}</p>
            </div>
          ))}
        </div>
        <button className="btn-primary mt-5" onClick={() => { setQuiz(null); setResult(null); }}>Back to quizzes</button>
      </div>
    );
  }

  /* ---------- Taking a quiz ---------- */
  if (quiz) {
    const done = answers.every((a) => a >= 0);
    return (
      <div className="mx-auto max-w-2xl">
        <PageHeader title={quiz.title} subtitle={`${quiz.questions.length} questions`} />
        <div className="space-y-4">
          {quiz.questions.map((q, i) => (
            <fieldset key={q._id} className="card">
              <legend className="mb-3 font-medium text-slate-900">{i + 1}. {q.question}</legend>
              <div className="space-y-1.5">
                {q.options.map((o, j) => (
                  <label key={j} className={`flex cursor-pointer items-center gap-3 rounded-lg border px-3 py-2 text-sm ${answers[i] === j ? "border-brand-500 bg-brand-50" : "border-slate-200 hover:bg-slate-50"}`}>
                    <input type="radio" name={`q${i}`} checked={answers[i] === j} onChange={() => setAnswers((a) => a.map((v, k) => (k === i ? j : v)))} />
                    {o}
                  </label>
                ))}
              </div>
            </fieldset>
          ))}
        </div>
        <div className="mt-5 flex gap-3">
          <button className="btn-primary" disabled={!done || submitting} onClick={submit}>
            {submitting && <Spinner className="text-white" />} Submit answers
          </button>
          <button className="btn-ghost" onClick={() => setQuiz(null)}>Cancel</button>
        </div>
        {!done && <p className="mt-2 text-xs text-slate-400">Answer every question to submit.</p>}
      </div>
    );
  }

  /* ---------- Home ---------- */
  return (
    <>
      <PageHeader title="Practice quizzes" subtitle="Generate questions from your college documents and test yourself." />
      <div className="grid gap-6 lg:grid-cols-5">
        <form onSubmit={handleSubmit(generate)} className="card space-y-4 lg:col-span-2">
          <h2 className="font-semibold text-slate-900">New quiz</h2>
          <div className="flex gap-4 text-sm">
            <label className="flex items-center gap-2"><input type="radio" value="topic" {...register("source")} /> By topic</label>
            <label className="flex items-center gap-2"><input type="radio" value="document" {...register("source")} /> From a document</label>
          </div>
          {source === "topic" ? (
            <div>
              <label className="label" htmlFor="topic">Topic</label>
              <input id="topic" className="input" placeholder="e.g. attendance rules" {...register("topic", { required: true })} />
            </div>
          ) : (
            <div>
              <label className="label" htmlFor="doc">Document</label>
              <select id="doc" className="input" {...register("documentId", { required: true })}>
                <option value="">Select a document</option>
                {docs.map((d) => <option key={d._id} value={d._id}>{d.title}</option>)}
              </select>
            </div>
          )}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="label" htmlFor="n">Questions</label>
              <select id="n" className="input" {...register("numQuestions")}>
                {[3, 5, 8, 10].map((n) => <option key={n}>{n}</option>)}
              </select>
            </div>
            <div>
              <label className="label" htmlFor="diff">Difficulty</label>
              <select id="diff" className="input" {...register("difficulty")}>
                <option>easy</option><option>medium</option><option>hard</option>
              </select>
            </div>
          </div>
          <button className="btn-primary w-full" disabled={isSubmitting}>
            {isSubmitting && <Spinner className="text-white" />} {isSubmitting ? "Generating..." : "Generate quiz"}
          </button>
        </form>

        <div className="lg:col-span-3">
          <h2 className="mb-3 font-semibold text-slate-900">Your quizzes</h2>
          {!list ? <PageLoader /> : list.length === 0 ? <Empty>No quizzes yet. Generate your first one.</Empty> : (
            <ul className="space-y-3">
              {list.map((q) => (
                <li key={q._id} className="card flex items-center justify-between gap-3">
                  <div className="min-w-0">
                    <p className="truncate font-medium text-slate-900">{q.title}</p>
                    <p className="text-xs text-slate-400">{q.questionCount} questions · {q.difficulty} · {fmtDate(q.createdAt)}</p>
                  </div>
                  <div className="flex shrink-0 items-center gap-2">
                    {q.bestScore >= 0 && <Badge tone="green">Best {q.bestScore}/{q.questionCount}</Badge>}
                    <button className="btn-ghost px-3 py-1.5" onClick={() => open(q._id)}>{q.bestScore >= 0 ? "Retake" : "Start"}</button>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </>
  );
}
