import { Navigate, Outlet } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import type { Role } from "../lib/types";
import { PageLoader } from "./ui";

export default function ProtectedRoute({ role }: { role: Role }) {
  const { user, loading } = useAuth();
  if (loading) return <PageLoader />;
  if (!user) return <Navigate to={role === "admin" ? "/admin/login" : "/login"} replace />;
  if (user.role !== role) return <Navigate to={user.role === "admin" ? "/admin" : "/"} replace />;
  return <Outlet />;
}
