import { Navigate, Outlet } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import Skeleton from "../ui/Skeleton";

export default function PublicRoute({ children }) {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="h-screen w-screen flex flex-col items-center justify-center bg-[#030706] p-6">
        <div className="w-full max-w-md space-y-4 p-8 rounded-3xl bg-vault-surface/40 border border-white/5">
          <div className="flex items-center gap-3 justify-center mb-6">
            <Skeleton variant="circular" className="w-12 h-12" />
            <Skeleton className="h-6 w-36 rounded-lg" />
          </div>
          <Skeleton className="h-11 w-full rounded-xl" />
          <Skeleton className="h-11 w-full rounded-xl" />
          <Skeleton className="h-11 w-full rounded-xl" />
        </div>
      </div>
    );
  }

  if (user) {
    return <Navigate to="/dashboard" replace />;
  }

  return children || <Outlet />;
}
