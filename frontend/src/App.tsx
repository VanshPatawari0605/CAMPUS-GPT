import { Navigate, Route, Routes } from "react-router-dom";
import Layout from "./components/Layout";
import ProtectedRoute from "./components/ProtectedRoute";
import AdminAnnouncements from "./pages/admin/AdminAnnouncements";
import AdminDashboard from "./pages/admin/AdminDashboard";
import AdminDeadlines from "./pages/admin/AdminDeadlines";
import AdminDocuments from "./pages/admin/AdminDocuments";
import AdminLogin from "./pages/AdminLogin";
import Chat from "./pages/Chat";
import Dashboard from "./pages/Dashboard";
import Deadlines from "./pages/Deadlines";
import Login from "./pages/Login";
import Notices from "./pages/Notices";
import Profile from "./pages/Profile";
import Quizzes from "./pages/Quizzes";
import Register from "./pages/Register";

export default function App() {
  return (
    <Routes>
      <Route path="/login" element={<Login />} />
      <Route path="/register" element={<Register />} />
      <Route path="/admin/login" element={<AdminLogin />} />

      <Route element={<ProtectedRoute role="student" />}>
        <Route element={<Layout />}>
          <Route path="/" element={<Dashboard />} />
          <Route path="/chat" element={<Chat />} />
          <Route path="/notices" element={<Notices />} />
          <Route path="/deadlines" element={<Deadlines />} />
          <Route path="/quizzes" element={<Quizzes />} />
          <Route path="/profile" element={<Profile />} />
        </Route>
      </Route>

      <Route element={<ProtectedRoute role="admin" />}>
        <Route element={<Layout />}>
          <Route path="/admin" element={<AdminDashboard />} />
          <Route path="/admin/documents" element={<AdminDocuments />} />
          <Route path="/admin/deadlines" element={<AdminDeadlines />} />
          <Route path="/admin/announcements" element={<AdminAnnouncements />} />
        </Route>
      </Route>

      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
