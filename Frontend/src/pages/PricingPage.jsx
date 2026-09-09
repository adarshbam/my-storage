import Navbar from "../components/sections/Navbar";
import PricingSection from "../components/sections/PricingSection";
import Footer from "../components/sections/Footer";

export default function PricingPage() {
  return (
    <div className="min-h-screen text-slate-900 dark:text-white font-sans transition-colors duration-300 relative">
      {/* Global Static Background */}
      <div className="fixed inset-0 z-[0] bg-vault-bg pointer-events-none transition-colors duration-500">
        {/* Subtle top radial tint powered by active theme */}
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[80vw] h-[55vh] bg-[radial-gradient(ellipse,rgba(var(--accent-primary-rgb),0.12)_0%,transparent_70%)] dark:bg-[radial-gradient(ellipse,rgba(var(--accent-primary-rgb),0.09)_0%,transparent_70%)]" />
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
