import { Navigate, Outlet } from "react-router-dom";
import { isLoggedIn } from "../../store/authStore";

export default function ProtectedRoute() {
  if (!isLoggedIn()) {
    return <Navigate to="/login" replace />;
  }
  return <Outlet />;
}
