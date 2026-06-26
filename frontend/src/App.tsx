import { Navigate, Route, Routes } from "react-router-dom";

import AppLayout from "./components/layout/AppLayout";
import ProtectedRoute from "./components/layout/ProtectedRoute";
import LandingPage from "./pages/LandingPage";
import LoginPage from "./pages/auth/LoginPage";
import RegisterPage from "./pages/auth/RegisterPage";
import CVReviewPage from "./pages/dashboard/CVReviewPage";
import SavedJobsPage from "./pages/dashboard/SavedJobsPage";
import JobsFeedPage from "./pages/dashboard/JobsFeedPage";
import LearningPathPage from "./pages/dashboard/LearningPathPage";
import SkillsDashboardPage from "./pages/dashboard/SkillsDashboardPage";
import SourceManagerPage from "./pages/dashboard/SourceManagerPage";
import SettingsPage from "./pages/dashboard/SettingsPage";

export default function App() {
  return (
    <Routes>
      {/* Landing */}
      <Route path="/" element={<LandingPage />} />

      {/* Public auth routes */}
      <Route path="/login" element={<LoginPage />} />
      <Route path="/register" element={<RegisterPage />} />

      {/* Protected app routes */}
      <Route element={<ProtectedRoute />}>
        <Route element={<AppLayout />}>
          <Route path="/jobs" element={<JobsFeedPage />} />
          <Route path="/saved-jobs" element={<SavedJobsPage />} />
          <Route path="/skills" element={<SkillsDashboardPage />} />
          <Route path="/learning" element={<LearningPathPage />} />
          <Route path="/cv" element={<CVReviewPage />} />
          <Route path="/sources" element={<SourceManagerPage />} />
          <Route path="/settings" element={<SettingsPage />} />
        </Route>
      </Route>

      {/* Fallback */}
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
