import { Navigate, Outlet } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import Skeleton from "../ui/Skeleton";
import FileBrowserSkeleton from "./FileBrowserSkeleton";

const ProtectedRoute = () => {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen w-full bg-vault-bg text-white flex flex-col p-6 sm:p-8 space-y-6">
        {/* Top bar placeholder */}
        <div className="flex items-center justify-between pb-4 border-b border-white/5">
          <div className="flex items-center gap-3">
            <Skeleton variant="circular" className="w-10 h-10" />
            <Skeleton className="h-6 w-32 rounded-lg" />
          </div>
          <div className="flex items-center gap-3">
            <Skeleton className="h-9 w-28 rounded-xl" />
            <Skeleton variant="circular" className="w-9 h-9" />
          </div>
        </div>

        {/* Content skeleton */}
        <div className="flex-1 flex flex-col">
          <FileBrowserSkeleton viewMode="grid" count={8} />
        </div>
      </div>
    );
  }

  if (!user) return <Navigate to="/login" replace />;

  return <Outlet />;
};

export default ProtectedRoute;
