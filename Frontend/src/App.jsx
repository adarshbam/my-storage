import { Suspense, lazy } from "react";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { ThemeProvider } from "./components/ui/ThemeProvider";
import { AuthProvider } from "./context/AuthContext";
import ProtectedRoute from "./components/drive/ProtectedRoute";
import PublicRoute from "./components/drive/PublicRoute";
import Login from "./pages/Login";
import Register from "./pages/Register";
import ResetPassword from "./pages/ResetPassword";
import Users from "./pages/Users";
import Profile from "./pages/Profile";
import SharedAccessClaim from "./pages/SharedAccessClaim";

// Landing Page Components
import Navbar from "./components/sections/Navbar";
import Hero from "./components/sections/Hero";
import ScaleSecurity from "./components/sections/ScaleSecurity";
import HowItWorks from "./components/sections/HowItWorks";
import Integrations from "./components/sections/Integrations";
import Pricing from "./components/sections/Pricing";
import FinalCTA from "./components/sections/FinalCTA";
import Footer from "./components/sections/Footer";

// Lazy load Dashboard Components to prevent heavy imports (like react-syntax-highlighter) on public pages
const DashboardLayout = lazy(() => import("./layouts/DashboardLayout"));
const FileBrowser = lazy(() => import("./components/drive/FileBrowser"));
const TrashView = lazy(() => import("./components/drive/TrashView"));

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
          <Pricing />
          <FinalCTA />
        </main>
        <Footer />
      </div>
    </div>
  );
}

// Simple loading fallback for suspense
const PageLoader = () => (
  <div className="min-h-screen flex items-center justify-center bg-white dark:bg-slate-950">
    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
  </div>
);

function App() {
  return (
    <ThemeProvider defaultTheme="dark" storageKey="vite-ui-theme">
      <AuthProvider>
        <BrowserRouter>
          <Suspense fallback={<PageLoader />}>
            <Routes>
              <Route path="/" element={<LandingPage />} />
              <Route path="/users" element={<Users />} />
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
              </Route>

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
                </Route>
              </Route>
            </Routes>
          </Suspense>
        </BrowserRouter>
      </AuthProvider>
    </ThemeProvider>
  );
}

export default App;
