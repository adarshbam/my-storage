import { Suspense, lazy, useEffect } from "react";
import { BrowserRouter, Routes, Route, useLocation, Navigate } from "react-router-dom";
import { ThemeProvider } from "./components/ui/ThemeProvider";
import { AuthProvider } from "./context/AuthContext";
import { PlanProvider } from "./context/PlanContext";
import { GuideProvider } from "./context/GuideContext";
import { ShortcutProvider } from "./context/ShortcutContext";
import ProtectedRoute from "./components/drive/ProtectedRoute";
import PublicRoute from "./components/drive/PublicRoute";
import Login from "./pages/Login";
import Register from "./pages/Register";
import ResetPassword from "./pages/ResetPassword";
import Users from "./pages/Users";
import Profile from "./pages/Profile";
import OwnerSettings from "./pages/OwnerSettings/OwnerSettings";
import SharedAccessClaim from "./pages/SharedAccessClaim";
import WallyAcademyPage from "./pages/WallyAcademyPage";

// Landing Page Components
import Navbar from "./components/sections/Navbar";
import Hero from "./components/sections/Hero";
import ScaleSecurity from "./components/sections/ScaleSecurity";
import HowItWorks from "./components/sections/HowItWorks";
import Integrations from "./components/sections/Integrations";
import PricingSection from "./components/sections/PricingSection";
import FinalCTA from "./components/sections/FinalCTA";
import Footer from "./components/sections/Footer";

// Dashboard Components
import DashboardLayout from "./layouts/DashboardLayout";
import FileBrowser from "./components/drive/FileBrowser";
import TrashView from "./components/drive/TrashView";
import BillingPlansPage from "./pages/BillingPlansPage";

function LandingPage() {
  return (
    <div className="min-h-screen text-slate-900 dark:text-white font-sans transition-colors duration-300 relative">
      {/* Global Static Background */}
      <div className="fixed inset-0 z-[0] bg-gradient-to-br from-[#f2faf7] via-[#e6f4f1] to-[#eaf7f4] dark:from-[#010a08] dark:via-[#021612] dark:to-[#010806] pointer-events-none">
        {/* Subtle top radial tint – light: mint, dark: deep teal */}
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[80vw] h-[50vh] bg-[radial-gradient(ellipse,rgba(20,184,166,0.12)_0%,transparent_70%)] dark:bg-[radial-gradient(ellipse,rgba(16,185,129,0.08)_0%,transparent_70%)]" />
      </div>

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

// Clean fallback for route suspense
const PageLoader = () => (
  <div className="min-h-screen w-full bg-vault-bg" />
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
            <GuideProvider>
              <ShortcutProvider>
                <ScrollToHashElement />
                <Suspense fallback={<PageLoader />}>
                <Routes>
                  <Route path="/" element={<LandingPage />} />
                  <Route
                    path="/shared-access/:token"
                    element={<SharedAccessClaim />}
                  />
                  <Route
                    path="/share/:token"
                    element={<SharedAccessClaim />}
                  />
                  <Route
                    path="/shared/:token"
                    element={<SharedAccessClaim />}
                  />
                  <Route
                    path="/shared-link/:token"
                    element={<SharedAccessClaim />}
                  />
                  <Route
                    path="/s/:token"
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
                      <Route path="tutorials" element={<WallyAcademyPage />} />
                    </Route>
                  </Route>

                  {/* Catch-all fallback */}
                  <Route
                    path="*"
                    element={<Navigate to="/dashboard" replace />}
                  />
                </Routes>
              </Suspense>
              </ShortcutProvider>
            </GuideProvider>
          </BrowserRouter>
        </PlanProvider>
      </AuthProvider>
    </ThemeProvider>
  );
}

export default App;
