import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Check,
  Zap,
  ArrowRight,
  Globe,
  ChevronDown,
  Sparkles,
} from "lucide-react";
import {
  currencySymbols,
  supportedCountries,
  fallbackRates,
  getRoundedPrice,
  detectLocalCurrencyFallback,
} from "../../lib/currency";
import { SERVER_URL } from "../../lib/api";
import { useAuth } from "../../context/AuthContext";
import { formatSize } from "../../lib/utils";
import PlanCard from "../billing/PlanCard";

const PricingSection = () => {
  const { user } = useAuth();
  const [isYearly, setIsYearly] = useState(false);
  const [selectedCountry, setSelectedCountry] = useState("AUTO");
  const [currency, setCurrency] = useState("INR");
  const [detectedCountryName, setDetectedCountryName] = useState("");
  const [rates, setRates] = useState(fallbackRates);
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [planDetails, setPlanDetails] = useState([
    {
      type: "Novice",
      period: "Monthly",
      price: 199,
      desc: "secure storage for files and photos.",
      color: "from-fuchsia-500 to-purple-500",
      shadow: "shadow-fuchsia-500/10",
      borderHover: "hover:border-fuchsia-500/30",
      borderClass: "border-fuchsia-500/20",
      bgHover: "hover:bg-fuchsia-500/5",
      textClass: "text-fuchsia-500",
      bgClass: "bg-fuchsia-500/10",
      storage: "1TB",
      iconBorder: "border-fuchsia-500/20",
      btnClass:
        "bg-transparent hover:bg-fuchsia-500/10 border-slate-200 hover:border-fuchsia-500/30 dark:border-white/10 dark:hover:border-fuchsia-500/30 text-slate-800 dark:text-white",
      features: [
        "1 TB of secure vault storage",
        "Link & Folder sharing",
        "Basic support",
      ],
    },
    {
      type: "Professional",
      period: "Monthly",
      price: 399,
      desc: " storage with priority speed and linkage.",
      color: "from-rose-500 to-orange-500",
      shadow: "shadow-[0_20px_80px_rgba(244,63,94,0.15)]",
      borderHover: "hover:border-rose-500/40",
      borderClass: "border-rose-500/30",
      bgHover: "hover:bg-rose-500/5",

      textClass: "text-rose-500",
      bgClass: "bg-rose-500/10",
      iconBorder: "border-rose-500/25",
      btnClass:
        "bg-gradient-to-r from-rose-500 to-orange-500 text-white shadow-[0_10px_30px_rgba(244,63,94,0.3)] hover:shadow-[0_15px_40px_rgba(244,63,94,0.5)] border-transparent",
      popular: true,
      features: [
        "5 TB of secure vault storage",
        "Priority uploads (10x faster)",
        "Email Support",
        "GitHub, Google Drive, Dropbox seamless linkage",
      ],
    },
    {
      type: "Ultimate",
      period: "Monthly",
      price: 999,
      desc: "15 TB storage for teams and extensive backup.",
      color: "from-blue-500 to-sky-400",
      shadow: "shadow-[0_15px_50px_rgba(59,130,246,0.15)]",
      borderHover: "hover:border-blue-500/50",
      borderClass: "border-blue-500/30",
      bgHover: "hover:bg-blue-500/10",
      textClass: "text-blue-400",
      bgClass: "bg-blue-500/15",
      iconBorder: "border-blue-500/25",
      btnClass:
        "bg-gradient-to-r from-blue-500 to-sky-500 text-white shadow-[0_10px_30px_rgba(59,130,246,0.3)] hover:shadow-[0_15px_40px_rgba(59,130,246,0.5)] border-transparent group-hover:scale-[1.02]",
      isUltimate: true,
      features: [
        "15 TB of secure vault storage",
        "Everything in Professional",
        "Version history (unlimited)",
        "Priority Support (24/7)",
      ],
    },
    {
      type: "Novice",
      period: "Yearly",
      price: 1999,
      desc: "1 TB secure storage for files and photos.",
      color: "from-fuchsia-500 to-purple-500",
      shadow: "shadow-fuchsia-500/10",
      borderHover: "hover:border-fuchsia-500/30",
      borderClass: "border-fuchsia-500/20",
      bgHover: "hover:bg-fuchsia-500/5",
      textClass: "text-fuchsia-500",
      bgClass: "bg-fuchsia-500/10",
      iconBorder: "border-fuchsia-500/20",
      btnClass:
        "bg-transparent hover:bg-fuchsia-500/10 border-slate-200 hover:border-fuchsia-500/30 dark:border-white/10 dark:hover:border-fuchsia-500/30 text-slate-800 dark:text-white",
      features: [
        "1 TB of secure vault storage",
        "Link & Folder sharing",
        "Basic support",
      ],
    },
    {
      type: "Professional",
      period: "Yearly",
      price: 3999,
      desc: "5 TB storage with priority speed and linkage.",
      color: "from-rose-500 to-orange-500",
      shadow: "shadow-[0_20px_80px_rgba(244,63,94,0.15)]",
      borderHover: "hover:border-rose-500/40",
      borderClass: "border-rose-500/30",
      bgHover: "hover:bg-rose-500/5",
      textClass: "text-rose-500",
      bgClass: "bg-rose-500/10",
      iconBorder: "border-rose-500/25",
      btnClass:
        "bg-gradient-to-r from-rose-500 to-orange-500 text-white shadow-[0_10px_30px_rgba(244,63,94,0.3)] hover:shadow-[0_15px_40px_rgba(244,63,94,0.5)] border-transparent",
      popular: true,
      features: [
        "5 TB of secure vault storage",
        "Priority uploads (10x faster)",
        "Email Support",
        "GitHub, Google Drive, Dropbox seamless linkage",
      ],
    },
    {
      type: "Ultimate",
      period: "Yearly",
      price: 9999,
      desc: "15 TB storage for teams and extensive backup.",
      color: "from-blue-500 to-sky-400",
      shadow: "shadow-[0_15px_50px_rgba(59,130,246,0.15)]",
      borderHover: "hover:border-blue-500/50",
      borderClass: "border-blue-500/30",
      bgHover: "hover:bg-blue-500/10",
      textClass: "text-blue-400",
      bgClass: "bg-blue-500/15",
      iconBorder: "border-blue-500/25",
      btnClass:
        "bg-gradient-to-r from-blue-500 to-sky-500 text-white shadow-[0_10px_30px_rgba(59,130,246,0.3)] hover:shadow-[0_15px_40px_rgba(59,130,246,0.5)] border-transparent group-hover:scale-[1.02]",
      isUltimate: true,
      features: [
        "15 TB of secure vault storage",
        "Everything in Professional",
        "Version history (unlimited)",
        "Priority Support (24/7)",
      ],
    },
  ]);
  console.log(planDetails);

  // Fetch exchange rates on mount
  useEffect(() => {
    fetch(`${SERVER_URL}/plan/get-active-plans`)
      .then((res) => res.json())
      .then((allActivePlans) => {
        console.log(allActivePlans);
        if (Array.isArray(allActivePlans)) {
          setPlanDetails((prevPlanDetails) =>
            prevPlanDetails.map((frontendPlan) => {
              const backendPlan = allActivePlans.find(
                (plan) =>
                  plan.type === frontendPlan.type &&
                  plan.period === frontendPlan.period,
              );
              if (!backendPlan) return frontendPlan;

              return {
                ...frontendPlan,
                ...backendPlan,
                price: backendPlan.amount,
              };
            }),
          );
        }
      })
      .catch((err) => {
        console.warn("Failed to fetch active plans:", err);
      });

    fetch("https://open.er-api.com/v6/latest/INR")
      .then((res) => res.json())
      .then((data) => {
        if (data.rates) {
          setRates(data.rates);
        }
      })
      .catch((err) => {
        console.warn("Failed to fetch live rates, using fallbacks:", err);
        setRates(fallbackRates);
      });
    const razorpayScript = document.getElementById("razorpay-script");
    if (razorpayScript) return;
    const script = document.createElement("script");
    script.src = "https://checkout.razorpay.com/v1/checkout.js";
    script.id = "razorpay-script";
    document.body.appendChild(script);
  }, []);

  // Update currency and country display whenever country selection changes
  useEffect(() => {
    if (selectedCountry === "AUTO") {
      fetch("https://ipapi.co/json/")
        .then((res) => res.json())
        .then((data) => {
          if (data.currency) {
            setCurrency(data.currency);
            setDetectedCountryName(
              data.country_name || data.country || "Local",
            );
          } else {
            const fb = detectLocalCurrencyFallback();
            setCurrency(fb);
            setDetectedCountryName("Local");
          }
        })
        .catch(() => {
          const fb = detectLocalCurrencyFallback();
          setCurrency(fb);
          setDetectedCountryName("Local");
        });
    } else {
      const country = supportedCountries.find(
        (c) => c.code === selectedCountry,
      );
      if (country) {
        setCurrency(country.currency);
        setDetectedCountryName("");
      }
    }
  }, [selectedCountry]);

  // Price formatting helper
  const formatPrice = (value, curr) => {
    const symbol = currencySymbols[curr] || curr + " ";
    // For JPY and similar zero-decimal currencies
    if (curr === "JPY" || curr === "KRW") {
      return `${symbol}${Math.round(value).toLocaleString()}`;
    }
    // For INR, show clean integer formatting
    if (curr === "INR") {
      if (value % 1 === 0) {
        return `${symbol}${value.toLocaleString("en-IN")}`;
      }
      return `${symbol}${value.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
    }
    // For other currencies
    if (value % 1 === 0) {
      return `${symbol}${value.toLocaleString()}`;
    }
    return `${symbol}${value.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  };

  const getPriceDisplay = (basePrice) => {
    const type = isYearly ? "yearly" : "monthly";
    const rate = rates[currency] || fallbackRates[currency] || 0.012;
    const converted = basePrice * rate;
    const rounded = getRoundedPrice(converted, currency);
    return formatPrice(rounded, currency);
  };

  // Get the label for the currently selected country/currency
  const getCountryLabel = () => {
    if (selectedCountry === "AUTO") {
      return detectedCountryName || "Detecting...";
    }
    const country = supportedCountries.find((c) => c.code === selectedCountry);
    return country ? country.name : selectedCountry;
  };

  // Handle Get Started click — calls backend to create a Razorpay subscription

  function openRazorpayPopup({ subscriptionId }) {
    const rzp = new Razorpay({
      // key: "rzp_live_T6hzM3zzz0kYbG", // live mode
      key: "rzp_test_TD0xv90hsl04nA", // test mode
      description: "Testing payment",
      name: user.name,
      subscription_id: subscriptionId,

      // notes: {
      //   courseId: course.id,
      //   courseName: course.name,
      // },
      handler: async function (response) {
        console.log(response);
      },
    });
    rzp.open();
  }

  const handleGetStarted = async (planId) => {
    try {
      const res = await fetch(
        `${SERVER_URL}/subscriptions/create-subscription`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          credentials: "include",
          body: JSON.stringify({ planId }),
        },
      );
      const data = await res.json();
      if (!res.ok)
        throw new Error(data.message || "Failed to create subscription");
      const { subscriptionId } = data;
      console.log("Subscription created:", subscriptionId);
      openRazorpayPopup({ subscriptionId });
    } catch (err) {
      console.error("Subscription error:", err.message);
    }
  };

  return (
    <section
      id="pricing"
      className="py-24 relative overflow-hidden bg-transparent"
    >
      {/* Ambient background grids */}
      <div className="absolute inset-0 bg-[linear-gradient(rgba(20,184,166,0.02)_1px,transparent_1px),linear-gradient(90deg,rgba(20,184,166,0.02)_1px,transparent_1px)] bg-[size:48px_48px] [mask-image:radial-gradient(ellipse_80%_80%_at_50%_0%,#000_30%,transparent_100%)] pointer-events-none" />

      <div className="container mx-auto px-4 sm:px-6 relative z-10 max-w-[1200px]">
        {/* Header */}
        <div className="text-center max-w-3xl mx-auto mb-20">
          <span className="inline-flex items-center gap-2 py-1 px-4 rounded-full bg-teal-500/10 border border-teal-500/20 text-[#14b8a6] font-bold tracking-widest text-xs uppercase mb-6 shadow-[0_0_20px_rgba(20,184,166,0.05)]">
            <Zap size={12} fill="currentColor" /> Simple Plans
          </span>
          <h2 className="text-5xl md:text-6xl font-black text-slate-900 dark:text-white mb-6 tracking-tight leading-[1.1]">
            Flexible plans for <br />
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-[#14b8a6] to-[#0ea5e9]">
              your storage needs.
            </span>
          </h2>
          <p className="text-slate-600 dark:text-white/60 text-lg md:text-xl font-medium max-w-xl mx-auto">
            Choose the perfect tier for you. Upgrade, downgrade, or cancel
            anytime.
          </p>

          {/* Controls Row */}
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4 mt-12">
            {/* Monthly / Yearly Toggle */}
            <div className="flex items-center gap-4 bg-slate-100 dark:bg-white/[0.04] border border-slate-200 dark:border-white/[0.08] px-5 py-3 rounded-2xl backdrop-blur-md">
              <span
                className={`text-xs font-bold tracking-widest uppercase transition-colors duration-300 ${!isYearly ? "text-slate-900 dark:text-white" : "text-slate-400 dark:text-white/30"}`}
              >
                Monthly
              </span>
              <button
                onClick={() => setIsYearly(!isYearly)}
                className="relative w-14 h-7 bg-slate-300 dark:bg-white/10 rounded-full p-1 flex items-center shadow-inner focus:outline-none"
              >
                <motion.div
                  className="w-5 h-5 rounded-full bg-gradient-to-r from-[#14b8a6] to-[#0ea5e9] shadow-[0_0_10px_rgba(20,184,166,0.6)]"
                  animate={{ x: isYearly ? 26 : 0 }}
                  transition={{ type: "spring", stiffness: 500, damping: 30 }}
                />
              </button>
              <span
                className={`text-xs font-bold tracking-widest uppercase transition-colors duration-300 ${isYearly ? "text-slate-900 dark:text-white" : "text-slate-400 dark:text-white/30"}`}
              >
                Yearly
              </span>

              {/* "2 Months Free" badge — only visible when yearly is selected */}
              <AnimatePresence>
                {isYearly && (
                  <motion.span
                    initial={{ opacity: 0, scale: 0.8, x: -8 }}
                    animate={{ opacity: 1, scale: 1, x: 0 }}
                    exit={{ opacity: 0, scale: 0.8, x: -8 }}
                    transition={{ type: "spring", stiffness: 400, damping: 25 }}
                    className="bg-[#14b8a6]/15 text-[#14b8a6] px-2.5 py-1 rounded-lg text-[10px] font-black tracking-wide border border-[#14b8a6]/25 whitespace-nowrap"
                  >
                    Save 2 Months
                  </motion.span>
                )}
              </AnimatePresence>
            </div>

            {/* Country / Currency Dropdown */}
            <div className="relative">
              <button
                onClick={() => setDropdownOpen(!dropdownOpen)}
                className="flex items-center gap-3 px-5 py-3 bg-slate-100 hover:bg-slate-200 dark:bg-white/[0.04] dark:hover:bg-white/[0.08] border border-slate-200 dark:border-white/[0.08] rounded-2xl text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-white/70 transition-all duration-300 backdrop-blur-md min-w-[180px]"
              >
                <Globe size={14} className="text-[#14b8a6] shrink-0" />
                <span className="truncate">{getCountryLabel()}</span>
                <ChevronDown
                  size={14}
                  className={`shrink-0 transition-transform duration-300 ml-auto ${dropdownOpen ? "rotate-180" : ""}`}
                />
              </button>

              <AnimatePresence>
                {dropdownOpen && (
                  <>
                    {/* Invisible backdrop to close dropdown on click outside */}
                    <div
                      className="fixed inset-0 z-[60]"
                      onClick={() => setDropdownOpen(false)}
                    />
                    <motion.div
                      initial={{ opacity: 0, y: 8, scale: 0.96 }}
                      animate={{ opacity: 1, y: 0, scale: 1 }}
                      exit={{ opacity: 0, y: 8, scale: 0.96 }}
                      transition={{ duration: 0.15, ease: "easeOut" }}
                      className="absolute top-full left-0 right-0 sm:right-auto sm:min-w-[240px] mt-2 bg-white dark:bg-[#071a15] border border-slate-200 dark:border-white/10 rounded-2xl shadow-2xl dark:shadow-[0_20px_60px_rgba(0,0,0,0.5)] z-[70] py-2 overflow-hidden"
                    >
                      {supportedCountries.map((country) => (
                        <button
                          key={country.code}
                          onClick={() => {
                            setSelectedCountry(country.code);
                            setDropdownOpen(false);
                          }}
                          className={`w-full px-4 py-2.5 text-left text-[11px] font-bold uppercase tracking-wider transition-colors duration-150 flex items-center justify-between gap-2 ${
                            selectedCountry === country.code
                              ? "text-[#14b8a6] bg-[#14b8a6]/10 dark:bg-[#14b8a6]/10"
                              : "text-slate-600 dark:text-white/60 hover:bg-slate-100 dark:hover:bg-white/5"
                          }`}
                        >
                          <span className="truncate">{country.name}</span>
                          {selectedCountry === country.code && (
                            <Check
                              size={12}
                              className="text-[#14b8a6] shrink-0"
                            />
                          )}
                        </button>
                      ))}
                    </motion.div>
                  </>
                )}
              </AnimatePresence>
            </div>
          </div>
        </div>

        {/* Pricing Cards Container */}
        <div className="w-full bg-slate-50/50 dark:bg-[#020705] p-4 md:p-6 lg:p-8 rounded-[3.5rem] shadow-[0_30px_100px_rgba(0,0,0,0.05)] dark:shadow-[0_30px_100px_rgba(0,0,0,0.5)] border border-slate-200/60 dark:border-white/5 relative overflow-hidden">
          {/* Ambient glow inside container */}
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] bg-rose-500/5 blur-[120px] rounded-full pointer-events-none" />
          <div className="absolute top-0 right-0 w-[400px] h-[400px] bg-blue-500/5 blur-[100px] rounded-full pointer-events-none" />
          <div className="absolute bottom-0 left-0 w-[300px] h-[300px] bg-fuchsia-500/5 blur-[100px] rounded-full pointer-events-none" />

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 lg:gap-8 items-stretch relative z-10">
            {planDetails
              .filter((detail) => (detail.period?.toLowerCase() === "yearly") === isYearly)
              .map((detail) => (
                <PlanCard
                  key={detail._id || detail.razorpayPlanId || detail.type + detail.period}
                  plan={detail}
                  currency={currency}
                  rates={rates}
                  onSelect={(plan) => handleGetStarted(plan.razorpayPlanId || plan._id)}
                />
              ))}
          </div>
        </div>
      </div>
    </section>
  );
};

export default PricingSection;
