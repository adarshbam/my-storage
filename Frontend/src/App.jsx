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
import PrivacyPolicyPage from "./pages/PrivacyPolicyPage";
import TermsOfServicePage from "./pages/TermsOfServicePage";
import SecurityPolicyPage from "./pages/SecurityPolicyPage";

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
import StandaloneLayout from "./layouts/StandaloneLayout";
import FileBrowser from "./components/drive/FileBrowser";
import TrashView from "./components/drive/TrashView";
import BillingPlansPage from "./pages/BillingPlansPage";
import GoogleDriveChamber from "./components/chambers/GoogleDriveChamber";
import GitHubChamber from "./components/chambers/GitHubChamber";
import WallGuideOverlay from "./components/guide/WallGuideOverlay";
import WallLauncher from "./components/guide/WallLauncher";

function LandingPage() {
  return (
    <div className="min-h-screen text-slate-900 dark:text-white font-sans transition-colors duration-300 relative">
      {/* Global Static Background */}
      <div className="fixed inset-0 z-[0] bg-vault-bg pointer-events-none transition-colors duration-500">
        {/* Subtle top radial tint powered by active theme */}
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[80vw] h-[55vh] bg-[radial-gradient(ellipse,rgba(var(--accent-primary-rgb),0.12)_0%,transparent_70%)] dark:bg-[radial-gradient(ellipse,rgba(var(--accent-primary-rgb),0.09)_0%,transparent_70%)]" />
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
                  <Route path="/privacy" element={<PrivacyPolicyPage />} />
                  <Route path="/terms" element={<TermsOfServicePage />} />
                  <Route path="/security" element={<SecurityPolicyPage />} />
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

                  {/* Dedicated Non-Vault Pages (Storage, Tutorials, Settings, User & Owner Portals) */}
                  <Route element={<ProtectedRoute />}>
                    <Route element={<StandaloneLayout />}>
                      <Route path="/profile" element={<Profile />} />
                      <Route path="/users" element={<Users />} />
                      <Route path="/owner/settings" element={<OwnerSettings />} />
                      <Route path="/dashboard/billing" element={<BillingPlansPage />} />
                      <Route path="/billing" element={<BillingPlansPage />} />
                      <Route path="/dashboard/tutorials" element={<WallyAcademyPage />} />
                      <Route path="/tutorials" element={<WallyAcademyPage />} />
                    </Route>
                  </Route>

                  {/* Core Vault Chamber Routes with CommandBar & NavigationRail */}
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
                        element={<GoogleDriveChamber />}
                      />
                      <Route
                        path="google-drive/:driveFolderId"
                        element={<GoogleDriveChamber />}
                      />
                      <Route
                        path="github"
                        element={<GitHubChamber />}
                      />
                      <Route
                        path="github/*"
                        element={<GitHubChamber />}
                      />
                      <Route path="trash" element={<TrashView />} />
                    </Route>
                  </Route>

                  {/* Catch-all fallback */}
                  <Route
                    path="*"
                    element={<Navigate to="/dashboard" replace />}
                  />
                </Routes>
              </Suspense>

              {/* Global Singleton for Wally Interactive Onboarding Guide & Launcher */}
              <WallGuideOverlay />
              <WallLauncher />
            </ShortcutProvider>
          </GuideProvider>
          </BrowserRouter>
        </PlanProvider>
      </AuthProvider>
    </ThemeProvider>
  );
}

export default App;
