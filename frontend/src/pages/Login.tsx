import { useForm } from "react-hook-form";
import toast from "react-hot-toast";
import { Link, Navigate, useNavigate } from "react-router-dom";
import AuthShell from "../components/AuthShell";
import { Spinner } from "../components/ui";
import { useAuth } from "../context/AuthContext";
import { errorMessage } from "../lib/api";

interface Form { email: string; password: string }

export default function Login() {
  const { user, login } = useAuth();
  const navigate = useNavigate();
  const { register, handleSubmit, formState: { errors, isSubmitting } } = useForm<Form>();

  if (user) return <Navigate to={user.role === "admin" ? "/admin" : "/"} replace />;

  const onSubmit = async (d: Form) => {
    try {
      await login(d.email, d.password);
      navigate("/");
    } catch (e) {
      toast.error(errorMessage(e, "Login failed"));
    }
  };

  return (
    <AuthShell title="Welcome to CampusGPT" subtitle="Sign in to your student account">
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4" noValidate>
        <div>
          <label className="label" htmlFor="email">Email</label>
          <input id="email" type="email" className="input" autoComplete="email"
            {...register("email", { required: "Email is required" })} />
          {errors.email && <p className="mt-1 text-xs text-red-600">{errors.email.message}</p>}
        </div>
        <div>
          <label className="label" htmlFor="password">Password</label>
          <input id="password" type="password" className="input" autoComplete="current-password"
            {...register("password", { required: "Password is required" })} />
          {errors.password && <p className="mt-1 text-xs text-red-600">{errors.password.message}</p>}
        </div>
        <button className="btn-primary w-full" disabled={isSubmitting}>
          {isSubmitting && <Spinner className="text-white" />} Sign in
        </button>
      </form>
      <p className="mt-5 text-center text-sm text-slate-500">
        New student? <Link to="/register" className="font-medium text-brand-600 hover:underline">Create an account</Link>
      </p>
      <p className="mt-2 text-center text-xs text-slate-400">
        <Link to="/admin/login" className="hover:underline">Administrator login</Link>
      </p>
    </AuthShell>
  );
}
