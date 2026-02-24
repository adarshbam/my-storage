import { Suspense, lazy } from "react";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { ThemeProvider } from "./components/ui/ThemeProvider";
import { AuthProvider } from "./context/AuthContext";
import ProtectedRoute from "./components/drive/ProtectedRoute";
import PublicRoute from "./components/drive/PublicRoute";
import Login from "./pages/Login";
import Register from "./pages/Register";

// Landing Page Components
import Navbar from "./components/sections/Navbar";
import Hero from "./components/sections/Hero";
import FeatureHighlights from "./components/sections/FeatureHighlights";
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
    <div className="min-h-screen bg-white dark:bg-slate-950 text-slate-900 dark:text-white font-sans transition-colors duration-300">
      <Navbar />
      <main>
        <Hero />
        <FeatureHighlights />
        <ScaleSecurity />
        <HowItWorks />
        <Integrations />
        <Pricing />
        <FinalCTA />
      </main>
      <Footer />
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
              <Route element={<PublicRoute />}>
                <Route path="/" element={<LandingPage />} />
                <Route path="/login" element={<Login />} />
                <Route path="/register" element={<Register />} />
              </Route>

              <Route path="/dashboard" element={<ProtectedRoute />}>
                <Route element={<DashboardLayout />}>
                  <Route index element={<FileBrowser />} />
                  <Route path="folder/:folderId" element={<FileBrowser />} />
                  <Route path="search" element={<FileBrowser />} />
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
