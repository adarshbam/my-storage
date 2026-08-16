import { Suspense, lazy, useEffect } from "react";
import { BrowserRouter, Routes, Route, useLocation, Navigate } from "react-router-dom";
import { ThemeProvider } from "./components/ui/ThemeProvider";
import { AuthProvider } from "./context/AuthContext";
import { PlanProvider } from "./context/PlanContext";
import ProtectedRoute from "./components/drive/ProtectedRoute";
import PublicRoute from "./components/drive/PublicRoute";
import Login from "./pages/Login";
import Register from "./pages/Register";
import ResetPassword from "./pages/ResetPassword";
import Users from "./pages/Users";
import Profile from "./pages/Profile";
import OwnerSettings from "./pages/OwnerSettings/OwnerSettings";
import SharedAccessClaim from "./pages/SharedAccessClaim";
import Skeleton from "./components/ui/Skeleton";
import ThemeControls from "./components/ui/ThemeControls";

// Landing Page Components
import Navbar from "./components/sections/Navbar";
import Hero from "./components/sections/Hero";
import ScaleSecurity from "./components/sections/ScaleSecurity";
import HowItWorks from "./components/sections/HowItWorks";
import Integrations from "./components/sections/Integrations";
import PricingSection from "./components/sections/PricingSection";
import FinalCTA from "./components/sections/FinalCTA";
import Footer from "./components/sections/Footer";

// Lazy load Dashboard Components to prevent heavy imports (like react-syntax-highlighter) on public pages
const DashboardLayout = lazy(() => import("./layouts/DashboardLayout"));
const FileBrowser = lazy(() => import("./components/drive/FileBrowser"));
const TrashView = lazy(() => import("./components/drive/TrashView"));
const BillingPlansPage = lazy(() => import("./pages/BillingPlansPage"));

function LandingPage() {
  return (
    <div className="vault-app min-h-screen font-sans relative">
      <div className="vault-app-background" aria-hidden="true" />
      <div className="relative z-10 flex flex-col min-h-screen">
        <Navbar />
        <main className="flex-grow">
          <Hero />
          <ScaleSecurity />
          <HowItWorks />
          <Integrations />
          <PricingSection />
          <FinalCTA />
        </main>
        <Footer />
      </div>
    </div>
  );
}

// Modern skeleton loading fallback for suspense
const PageLoader = () => (
  <div className="min-h-screen flex flex-col p-8 bg-[#030706] text-white space-y-6">
    <div className="flex items-center justify-between pb-4 border-b border-white/5">
      <div className="flex items-center gap-3">
        <Skeleton variant="circular" className="w-10 h-10" />
        <Skeleton className="h-6 w-32 rounded-lg" />
      </div>
      <Skeleton className="h-9 w-28 rounded-xl" />
    </div>
    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
      {[1, 2, 3, 4, 5, 6, 7, 8].map((i) => (
        <div key={i} className="aspect-[4/3] rounded-2xl bg-vault-surface/40 border border-white/5 overflow-hidden p-3 flex flex-col justify-between">
          <Skeleton className="h-5 w-16 rounded-md" />
          <Skeleton className="h-10 w-10 self-center rounded-xl" />
          <Skeleton className="h-4 w-3/4 rounded" />
        </div>
      ))}
    </div>
  </div>
);

function ScrollToHashElement() {
  const { hash } = useLocation();

  useEffect(() => {
    if (hash) {
      const element = document.getElementById(hash.replace("#", ""));
      if (element) {
        element.scrollIntoView({ behavior: "smooth" });
      }
    } else {
      window.scrollTo({ top: 0, behavior: "smooth" });
    }
  }, [hash]);

  return null;
}

function App() {
  return (
    <ThemeProvider defaultTheme="dark" storageKey="vite-ui-theme">
      <AuthProvider>
        <PlanProvider>
          <BrowserRouter>
            <ScrollToHashElement />
            <ThemeControls />
            <Suspense fallback={<PageLoader />}>
              <Routes>
                <Route path="/" element={<LandingPage />} />
                <Route
                  path="/shared-access/:token"
                  element={<SharedAccessClaim />}
                />
                <Route element={<PublicRoute />}>
                  <Route path="/login" element={<Login />} />
                  <Route path="/register" element={<Register />} />
                  <Route path="/reset-password" element={<ResetPassword />} />
                </Route>

                <Route element={<ProtectedRoute />}>
                  <Route path="/profile" element={<Profile />} />
                  <Route path="/users" element={<Users />} />
                  <Route path="/owner/settings" element={<OwnerSettings />} />
                </Route>

                {/* Redirect /billing to /dashboard/billing */}
                <Route
                  path="/billing"
                  element={<Navigate to="/dashboard/billing" replace />}
                />

                <Route path="/dashboard" element={<ProtectedRoute />}>
                  <Route element={<DashboardLayout />}>
                    <Route index element={<FileBrowser />} />
                    <Route path="folder/:folderId" element={<FileBrowser />} />
                    <Route path="search" element={<FileBrowser />} />
                    <Route
                      path="shared"
                      element={<FileBrowser specialView="shared" />}
                    />
                    <Route
                      path="shared/folder/:folderId"
                      element={<FileBrowser specialView="shared" />}
                    />
                    <Route
                      path="admin/folder/:folderId"
                      element={<FileBrowser specialView="admin" />}
                    />
                    <Route
                      path="owner/folder/:folderId"
                      element={<FileBrowser specialView="owner" />}
                    />
                    <Route
                      path="recent"
                      element={<FileBrowser specialView="recent" />}
                    />
                    <Route
                      path="starred"
                      element={<FileBrowser specialView="starred" />}
                    />
                    <Route
                      path="google-drive"
                      element={<FileBrowser specialView="google-drive" />}
                    />
                    <Route
                      path="google-drive/:driveFolderId"
                      element={<FileBrowser specialView="google-drive-folder" />}
                    />
                    <Route
                      path="github"
                      element={<FileBrowser specialView="github" />}
                    />
                    <Route
                      path="github/*"
                      element={<FileBrowser specialView="github-repo" />}
                    />
                    <Route path="trash" element={<TrashView />} />
                    <Route path="billing" element={<BillingPlansPage />} />
                  </Route>
                </Route>

                {/* Catch-all fallback */}
                <Route
                  path="*"
                  element={<Navigate to="/dashboard" replace />}
                />
              </Routes>
            </Suspense>
          </BrowserRouter>
        </PlanProvider>
      </AuthProvider>
    </ThemeProvider>
  );
}

export default App;
