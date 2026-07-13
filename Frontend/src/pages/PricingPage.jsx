import Navbar from "../components/sections/Navbar";
import PricingSection from "../components/sections/PricingSection";
import Footer from "../components/sections/Footer";

export default function PricingPage() {
  return (
    <div className="min-h-screen text-slate-900 dark:text-white font-sans transition-colors duration-300 relative">
      {/* Global Static Background */}
      <div className="fixed inset-0 z-[0] bg-gradient-to-br from-[#f2faf7] via-[#e6f4f1] to-[#eaf7f4] dark:from-[#010a08] dark:via-[#021612] dark:to-[#010806] pointer-events-none">
        {/* Subtle top radial tint – light: mint, dark: deep teal */}
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[80vw] h-[50vh] bg-[radial-gradient(ellipse,rgba(20,184,166,0.12)_0%,transparent_70%)] dark:bg-[radial-gradient(ellipse,rgba(16,185,129,0.08)_0%,transparent_70%)]" />
      </div>

      <div className="relative z-10 flex flex-col min-h-screen">
        <Navbar />
        <main className="flex-grow pt-28 pb-16">
          <PricingSection />
        </main>
        <Footer />
      </div>
    </div>
  );
}
