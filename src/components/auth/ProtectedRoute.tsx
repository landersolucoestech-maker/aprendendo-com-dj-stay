import { Navigate, Outlet, useLocation } from "react-router-dom";
import { AppRole } from "@/lib/platform";
import { useAuth } from "@/contexts/AuthContext";

interface ProtectedRouteProps {
  roles?: AppRole[];
}

export default function ProtectedRoute({ roles }: ProtectedRouteProps) {
  const { user, loading, hasRole } = useAuth();
  const location = useLocation();

  if (loading) {
    return (
      <div className="min-h-screen bg-black text-white flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-white mx-auto mb-4" />
          <p className="text-gray-300">Validando acesso...</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/login" replace state={{ from: location.pathname }} />;
  }

  if (roles?.length && !hasRole(...roles)) {
    return <Navigate to="/acesso-negado" replace />;
  }

  return <Outlet />;
}
