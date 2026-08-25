import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Check,
  Zap,
  Globe,
  ChevronDown,
} from "lucide-react";
import {
  supportedCountries,
  fallbackRates,
  detectLocalCurrencyFallback,
} from "../../lib/currency";
import { SERVER_URL } from "../../lib/api";
import { useAuth } from "../../context/AuthContext";
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
      description: "Secure 1 TB vault storage for personal files and photos.",
      storage: 1024 * 1024 * 1024 * 1024,
      features: [
        "1 TB of secure vault storage",
        "Link & folder sharing capsules",
        "Standard upload bandwidth",
        "AES-256 cloud encryption",
      ],
    },
    {
      type: "Professional",
      period: "Monthly",
      price: 399,
      description: "5 TB storage with priority speed and multi-cloud sync.",
      popular: true,
      storage: 5 * 1024 * 1024 * 1024 * 1024,
      features: [
        "5 TB of secure vault storage",
        "10x Priority upload bandwidth",
        "GitHub & Google Drive sync",
        "30-day version recovery",
        "Priority email support",
      ],
    },
    {
      type: "Ultimate",
      period: "Monthly",
      price: 999,
      description: "15 TB storage for power creators and professional teams.",
      isUltimate: true,
      storage: 15 * 1024 * 1024 * 1024 * 1024,
      features: [
        "15 TB of secure vault storage",
        "Unlimited device concurrency",
        "Unlimited version rollback",
        "24/7 Dedicated architecture support",
        "All Professional features included",
      ],
    },
    {
      type: "Novice",
      period: "Yearly",
      price: 1999,
      description: "Secure 1 TB vault storage for personal files and photos.",
      storage: 1024 * 1024 * 1024 * 1024,
      features: [
        "1 TB of secure vault storage",
        "Link & folder sharing capsules",
        "Standard upload bandwidth",
        "AES-256 cloud encryption",
      ],
    },
    {
      type: "Professional",
      period: "Yearly",
      price: 3999,
      description: "5 TB storage with priority speed and multi-cloud sync.",
      popular: true,
      storage: 5 * 1024 * 1024 * 1024 * 1024,
      features: [
        "5 TB of secure vault storage",
        "10x Priority upload bandwidth",
        "GitHub & Google Drive sync",
        "30-day version recovery",
        "Priority email support",
      ],
    },
    {
      type: "Ultimate",
      period: "Yearly",
      price: 9999,
      description: "15 TB storage for power creators and professional teams.",
      isUltimate: true,
      storage: 15 * 1024 * 1024 * 1024 * 1024,
      features: [
        "15 TB of secure vault storage",
        "Unlimited device concurrency",
        "Unlimited version rollback",
        "24/7 Dedicated architecture support",
        "All Professional features included",
      ],
    },
  ]);

  useEffect(() => {
    fetch(`${SERVER_URL}/plan/get-active-plans`)
      .then((res) => res.json())
      .then((allActivePlans) => {
        if (Array.isArray(allActivePlans) && allActivePlans.length > 0) {
          setPlanDetails((prevPlanDetails) =>
            prevPlanDetails.map((frontendPlan) => {
              const backendPlan = allActivePlans.find(
                (plan) =>
                  plan.type?.toLowerCase() === frontendPlan.type?.toLowerCase() &&
                  plan.period?.toLowerCase() === frontendPlan.period?.toLowerCase(),
              );
              if (!backendPlan) return frontendPlan;
              return {
                ...frontendPlan,
                ...backendPlan,
                price: backendPlan.amount || frontendPlan.price,
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
      .catch(() => {
        setRates(fallbackRates);
      });

    const razorpayScript = document.getElementById("razorpay-script");
    if (!razorpayScript) {
      const script = document.createElement("script");
      script.src = "https://checkout.razorpay.com/v1/checkout.js";
      script.id = "razorpay-script";
      document.body.appendChild(script);
    }
  }, []);

  useEffect(() => {
    if (selectedCountry === "AUTO") {
      fetch("https://ipapi.co/json/")
        .then((res) => res.json())
        .then((data) => {
          if (data.currency) {
            setCurrency(data.currency);
            setDetectedCountryName(data.country_name || data.country || "Local");
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
      const country = supportedCountries.find((c) => c.code === selectedCountry);
      if (country) {
        setCurrency(country.currency);
        setDetectedCountryName("");
      }
    }
  }, [selectedCountry]);

  const getCountryLabel = () => {
    if (selectedCountry === "AUTO") {
      return detectedCountryName || "Detecting Currency...";
    }
    const country = supportedCountries.find((c) => c.code === selectedCountry);
    return country ? country.name : selectedCountry;
  };

  const openRazorpayPopup = ({ subscriptionId }) => {
    if (typeof window.Razorpay === "undefined") {
      alert("Payment gateway loading, please try again in a moment.");
      return;
    }
    const rzp = new window.Razorpay({
      key: "rzp_test_TD0xv90hsl04nA",
      description: "Vault Subscription Plan",
      name: user?.name || "Vault Storage",
      subscription_id: subscriptionId,
      handler: function (response) {
        console.log("Payment response:", response);
      },
    });
    rzp.open();
  };

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
      if (!res.ok) throw new Error(data.message || "Failed to create subscription");
      const { subscriptionId } = data;
      openRazorpayPopup({ subscriptionId });
    } catch (err) {
      console.error("Subscription error:", err.message);
    }
  };

  return (
    <section id="pricing" className="py-24 relative overflow-hidden bg-vault-bg">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8 relative z-10 max-w-[1300px]">
        {/* Header */}
        <div className="text-center max-w-3xl mx-auto mb-16">
          <span className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-accent-soft border border-accent-border text-accent-primary font-bold tracking-wider text-xs uppercase mb-4">
            <Zap size={13} /> Transparent Pricing
          </span>
          <h2 className="text-4xl sm:text-5xl lg:text-6xl font-black text-slate-900 dark:text-white mb-5 tracking-tight">
            Flexible plans for <br />
            <span className="text-accent-primary">your storage scale.</span>
          </h2>
          <p className="text-slate-600 dark:text-white/60 text-base sm:text-lg font-medium max-w-lg mx-auto">
            Upgrade, downgrade, or cancel anytime. All plans include full zero-knowledge encryption.
          </p>

          {/* Billing Controls */}
          <div className="flex flex-col sm:flex-row items-center justify-center gap-3 sm:gap-4 mt-10 max-w-full">
            {/* Monthly / Yearly Toggle */}
            <div className="flex flex-wrap sm:flex-nowrap items-center justify-center gap-2 sm:gap-3 bg-white/70 dark:bg-vault-surface/70 border border-slate-200 dark:border-white/10 px-3 sm:px-4 py-2 rounded-2xl shadow-sm backdrop-blur-md max-w-full">
              <span
                className={`text-xs font-bold uppercase tracking-wider transition-colors ${
                  !isYearly ? "text-slate-900 dark:text-white" : "text-slate-400 dark:text-white/40"
                }`}
              >
                Monthly
              </span>
              <button
                onClick={() => setIsYearly(!isYearly)}
                className="relative w-12 h-6 bg-slate-200 dark:bg-white/10 rounded-full p-1 flex items-center focus:outline-none cursor-pointer"
              >
                <motion.div
                  className="w-4 h-4 rounded-full bg-accent-primary shadow-sm"
                  animate={{ x: isYearly ? 24 : 0 }}
                  transition={{ type: "spring", stiffness: 500, damping: 30 }}
                />
              </button>
              <span
                className={`text-xs font-bold uppercase tracking-wider transition-colors ${
                  isYearly ? "text-slate-900 dark:text-white" : "text-slate-400 dark:text-white/40"
                }`}
              >
                Yearly
              </span>

              <AnimatePresence>
                {isYearly && (
                  <motion.span
                    initial={{ opacity: 0, scale: 0.8 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.8 }}
                    className="bg-accent-soft text-accent-primary px-2.5 py-0.5 rounded-lg text-[10px] font-bold border border-accent-border uppercase tracking-wider ml-1"
                  >
                    Save 2 Months
                  </motion.span>
                )}
              </AnimatePresence>
            </div>

            {/* Country Selector */}
            <div className="relative">
              <button
                onClick={() => setDropdownOpen(!dropdownOpen)}
                className="flex items-center gap-2.5 px-4 py-2 bg-white/70 dark:bg-vault-surface/70 hover:bg-white dark:hover:bg-vault-surface border border-slate-200 dark:border-white/10 rounded-2xl text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-white/70 shadow-sm backdrop-blur-md min-w-[170px] justify-between cursor-pointer"
              >
                <div className="flex items-center gap-2 truncate">
                  <Globe size={14} className="text-accent-primary shrink-0" />
                  <span className="truncate">{getCountryLabel()}</span>
                </div>
                <ChevronDown
                  size={14}
                  className={`shrink-0 transition-transform ${dropdownOpen ? "rotate-180" : ""}`}
                />
              </button>

              <AnimatePresence>
                {dropdownOpen && (
                  <>
                    <div
                      className="fixed inset-0 z-[60]"
                      onClick={() => setDropdownOpen(false)}
                    />
                    <motion.div
                      initial={{ opacity: 0, y: 6, scale: 0.96 }}
                      animate={{ opacity: 1, y: 0, scale: 1 }}
                      exit={{ opacity: 0, y: 6, scale: 0.96 }}
                      transition={{ duration: 0.15 }}
                      className="absolute top-full left-0 mt-2 bg-white dark:bg-vault-surface border border-slate-200 dark:border-white/10 rounded-2xl shadow-xl z-[70] py-1 max-h-60 overflow-y-auto custom-scrollbar w-56"
                    >
                      {supportedCountries.map((country) => (
                        <button
                          key={country.code}
                          onClick={() => {
                            setSelectedCountry(country.code);
                            setDropdownOpen(false);
                          }}
                          className={`w-full px-3.5 py-2 text-left text-xs font-semibold flex items-center justify-between gap-2 transition-colors ${
                            selectedCountry === country.code
                              ? "text-accent-primary bg-accent-soft"
                              : "text-slate-700 dark:text-white/70 hover:bg-slate-100 dark:hover:bg-white/5"
                          }`}
                        >
                          <span className="truncate">{country.name}</span>
                          {selectedCountry === country.code && (
                            <Check size={13} className="text-accent-primary shrink-0" />
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

        {/* Pricing Cards Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 lg:gap-8 items-stretch max-w-6xl mx-auto">
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
    </section>
  );
};

export default PricingSection;
