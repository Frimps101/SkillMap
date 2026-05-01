import { Navigate, Route, Routes } from "react-router-dom";

import AppLayout from "./components/layout/AppLayout";
import ProtectedRoute from "./components/layout/ProtectedRoute";
import LoginPage from "./pages/auth/LoginPage";
import RegisterPage from "./pages/auth/RegisterPage";
import JobsFeedPage from "./pages/dashboard/JobsFeedPage";
import LearningPathPage from "./pages/dashboard/LearningPathPage";
import SkillsDashboardPage from "./pages/dashboard/SkillsDashboardPage";
import SourceManagerPage from "./pages/dashboard/SourceManagerPage";
import SettingsPage from "./pages/dashboard/SettingsPage";

export default function App() {
  return (
    <Routes>
      {/* Public routes */}
      <Route path="/login" element={<LoginPage />} />
      <Route path="/register" element={<RegisterPage />} />

      {/* Protected app routes */}
      <Route element={<ProtectedRoute />}>
        <Route element={<AppLayout />}>
          <Route index element={<Navigate to="/jobs" replace />} />
          <Route path="/jobs" element={<JobsFeedPage />} />
          <Route path="/skills" element={<SkillsDashboardPage />} />
          <Route path="/learning" element={<LearningPathPage />} />
          <Route path="/sources" element={<SourceManagerPage />} />
          <Route path="/settings" element={<SettingsPage />} />
        </Route>
      </Route>

      {/* Fallback */}
      <Route path="*" element={<Navigate to="/jobs" replace />} />
    </Routes>
  );
}
