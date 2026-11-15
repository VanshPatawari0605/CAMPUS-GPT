import {
  BarChart3, Bell, BookOpenCheck, CalendarClock, FileText, GraduationCap, LayoutDashboard,
  LogOut, Megaphone, Menu, MessageSquare, ScrollText, User as UserIcon, X,
} from "lucide-react";
import { useState } from "react";
import { NavLink, Outlet, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

export default function Layout() {
  const { user, logout, t } = useAuth();
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const isAdmin = user?.role === "admin";

  const studentNav = [
    { to: "/", label: t("nav.dashboard"), icon: LayoutDashboard, end: true },
    { to: "/chat", label: t("nav.assistant"), icon: MessageSquare },
    { to: "/notices", label: t("nav.notices"), icon: Bell },
    { to: "/deadlines", label: t("nav.deadlines"), icon: CalendarClock },
    { to: "/quizzes", label: t("nav.quizzes"), icon: BookOpenCheck },
    { to: "/profile", label: t("nav.profile"), icon: UserIcon },
  ];
  const adminNav = [
    { to: "/admin", label: "Analytics", icon: BarChart3, end: true },
    { to: "/admin/documents", label: "Documents & Notices", icon: FileText },
    { to: "/admin/deadlines", label: "Deadline review", icon: ScrollText },
    { to: "/admin/announcements", label: "Announcements", icon: Megaphone },
  ];
  const nav = isAdmin ? adminNav : studentNav;

  const handleLogout = async () => {
    await logout();
    navigate(isAdmin ? "/admin/login" : "/login");
  };

  const sidebar = (
    <div className="flex h-full flex-col bg-white">
      <div className="flex items-center gap-2 px-5 py-5">
        <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-brand-600 text-white">
          <GraduationCap className="h-5 w-5" />
        </span>
        <div>
          <p className="font-semibold leading-tight text-slate-900">CampusGPT</p>
          <p className="text-xs text-slate-500">{isAdmin ? "Administrator" : "Student portal"}</p>
        </div>
      </div>
      <nav className="flex-1 space-y-1 px-3">
        {nav.map(({ to, label, icon: Icon, end }) => (
          <NavLink
            key={to}
            to={to}
            end={end}
            onClick={() => setOpen(false)}
            className={({ isActive }) =>
              `flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition ${
                isActive ? "bg-brand-50 text-brand-700" : "text-slate-600 hover:bg-slate-100"
              }`
            }
          >
            <Icon className="h-5 w-5" />
            {label}
          </NavLink>
        ))}
      </nav>
      <div className="border-t border-slate-200 p-4">
        <p className="truncate text-sm font-medium text-slate-800">{user?.fullName}</p>
        <p className="mb-3 truncate text-xs text-slate-500">{user?.email}</p>
        <button onClick={handleLogout} className="btn-ghost w-full">
          <LogOut className="h-4 w-4" /> {t("nav.logout")}
        </button>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen lg:flex">
      <aside className="fixed inset-y-0 left-0 hidden w-64 border-r border-slate-200 lg:block">{sidebar}</aside>

      {/* Mobile top bar + drawer */}
      <header className="sticky top-0 z-30 flex items-center justify-between border-b border-slate-200 bg-white px-4 py-3 lg:hidden">
        <div className="flex items-center gap-2 font-semibold text-slate-900">
          <GraduationCap className="h-5 w-5 text-brand-600" /> CampusGPT
        </div>
        <button onClick={() => setOpen(true)} aria-label="Open menu" className="rounded p-1.5 hover:bg-slate-100">
          <Menu className="h-6 w-6" />
        </button>
      </header>
      {open && (
        <div className="fixed inset-0 z-40 lg:hidden">
          <div className="absolute inset-0 bg-slate-900/50" onClick={() => setOpen(false)} />
          <div className="absolute inset-y-0 left-0 w-72 shadow-xl">
            <button onClick={() => setOpen(false)} className="absolute right-3 top-4 rounded p-1 hover:bg-slate-100" aria-label="Close menu">
              <X className="h-5 w-5" />
            </button>
            {sidebar}
          </div>
        </div>
      )}

      <main className="min-w-0 flex-1 lg:ml-64">
        <div className="mx-auto max-w-6xl p-4 sm:p-6 lg:p-8">
          <Outlet />
        </div>
      </main>
    </div>
  );
}
