import { useForm } from "react-hook-form";
import toast from "react-hot-toast";
import { PageHeader, Spinner } from "../components/ui";
import { useAuth } from "../context/AuthContext";
import { api, errorMessage } from "../lib/api";
import { LANGUAGE_LABELS } from "../lib/i18n";
import { DEPARTMENTS, type Lang } from "../lib/types";

interface Form { fullName: string; department: string; semester: number; preferredLanguage: Lang; subjects: string }

export default function Profile() {
  const { user, setUser } = useAuth();
  const { register, handleSubmit, formState: { isSubmitting, isDirty } } = useForm<Form>({
    defaultValues: {
      fullName: user?.fullName, department: user?.department, semester: user?.semester,
      preferredLanguage: user?.preferredLanguage, subjects: (user?.subjects || []).join(", "),
    },
  });

  const onSubmit = async (d: Form) => {
    try {
      const subjects = d.subjects.split(",").map((s) => s.trim()).filter(Boolean);
      const r = await api.put("/profile", { ...d, semester: Number(d.semester), subjects });
      setUser({ ...user!, ...r.data.user, id: user!.id });
      toast.success("Profile updated");
    } catch (e) {
      toast.error(errorMessage(e));
    }
  };

  return (
    <div className="max-w-xl">
      <PageHeader title="My profile" subtitle="Your department and semester personalise the answers you get." />
      <form onSubmit={handleSubmit(onSubmit)} className="card space-y-4">
        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label className="label">Email</label>
            <input className="input bg-slate-50" value={user?.email} disabled />
          </div>
          <div>
            <label className="label">Student ID</label>
            <input className="input bg-slate-50" value={user?.studentId} disabled />
          </div>
        </div>
        <div>
          <label className="label" htmlFor="fullName">Full name</label>
          <input id="fullName" className="input" {...register("fullName", { required: true, minLength: 2 })} />
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="label" htmlFor="department">Department</label>
            <select id="department" className="input" {...register("department")}>
              {DEPARTMENTS.map((d) => <option key={d}>{d}</option>)}
            </select>
          </div>
          <div>
            <label className="label" htmlFor="semester">Semester</label>
            <select id="semester" className="input" {...register("semester")}>
              {[1, 2, 3, 4, 5, 6, 7, 8].map((s) => <option key={s} value={s}>{s}</option>)}
            </select>
          </div>
        </div>
        <div>
          <label className="label" htmlFor="lang">Preferred language</label>
          <select id="lang" className="input" {...register("preferredLanguage")}>
            {(Object.keys(LANGUAGE_LABELS) as Lang[]).map((l) => <option key={l} value={l}>{LANGUAGE_LABELS[l]}</option>)}
          </select>
        </div>
        <div>
          <label className="label" htmlFor="subjects">Subjects of interest</label>
          <input id="subjects" className="input" placeholder="Operating Systems, DBMS, Machine Learning" {...register("subjects")} />
          <p className="mt-1 text-xs text-slate-400">Comma separated</p>
        </div>
        <button className="btn-primary" disabled={isSubmitting || !isDirty}>
          {isSubmitting && <Spinner className="text-white" />} Save changes
        </button>
      </form>
    </div>
  );
}
