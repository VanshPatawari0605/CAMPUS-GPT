import { useForm } from "react-hook-form";
import toast from "react-hot-toast";
import { Link, Navigate, useNavigate } from "react-router-dom";
import AuthShell from "../components/AuthShell";
import { Spinner } from "../components/ui";
import { useAuth } from "../context/AuthContext";
import { errorMessage } from "../lib/api";
import { LANGUAGE_LABELS } from "../lib/i18n";
import { DEPARTMENTS, type Lang } from "../lib/types";

interface Form {
  fullName: string; email: string; password: string; studentId: string;
  department: string; semester: number; preferredLanguage: Lang;
}

const Err = ({ m }: { m?: string }) => (m ? <p className="mt-1 text-xs text-red-600">{m}</p> : null);

export default function Register() {
  const { user, register: signUp } = useAuth();
  const navigate = useNavigate();
  const { register, handleSubmit, formState: { errors, isSubmitting } } = useForm<Form>({
    defaultValues: { department: "CSE", semester: 1, preferredLanguage: "en" },
  });

  if (user) return <Navigate to="/" replace />;

  const onSubmit = async (d: Form) => {
    try {
      await signUp({ ...d, semester: Number(d.semester) });
      toast.success("Account created");
      navigate("/");
    } catch (e) {
      toast.error(errorMessage(e, "Registration failed"));
    }
  };

  return (
    <AuthShell title="Create your account" subtitle="Personalised answers for your department and semester">
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4" noValidate>
        <div>
          <label className="label" htmlFor="fullName">Full name</label>
          <input id="fullName" className="input" {...register("fullName", { required: "Full name is required", minLength: { value: 2, message: "Too short" } })} />
          <Err m={errors.fullName?.message} />
        </div>
        <div>
          <label className="label" htmlFor="email">Email</label>
          <input id="email" type="email" className="input" {...register("email", { required: "Email is required", pattern: { value: /^\S+@\S+\.\S+$/, message: "Enter a valid email" } })} />
          <Err m={errors.email?.message} />
        </div>
        <div>
          <label className="label" htmlFor="password">Password</label>
          <input id="password" type="password" className="input" autoComplete="new-password"
            {...register("password", {
              required: "Password is required",
              minLength: { value: 8, message: "At least 8 characters" },
              validate: (v) => (/[A-Za-z]/.test(v) && /\d/.test(v)) || "Use letters and numbers",
            })} />
          <Err m={errors.password?.message} />
        </div>
        <div>
          <label className="label" htmlFor="studentId">Student ID</label>
          <input id="studentId" className="input" {...register("studentId", { required: "Student ID is required" })} />
          <Err m={errors.studentId?.message} />
        </div>
        <div className="grid grid-cols-2 gap-3">
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
        <button className="btn-primary w-full" disabled={isSubmitting}>
          {isSubmitting && <Spinner className="text-white" />} Create account
        </button>
      </form>
      <p className="mt-5 text-center text-sm text-slate-500">
        Already registered? <Link to="/login" className="font-medium text-brand-600 hover:underline">Sign in</Link>
      </p>
    </AuthShell>
  );
}
