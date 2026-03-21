import { useState } from "react";
import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import { Check } from "lucide-react";
import Button from "../ui/Button";
import Card from "../ui/Card";

const plans = [
  {
    name: "Free",
    price: "0",
    desc: "Perfect for personal use.",
    features: [
      "15 GB Storage",
      "Basic Photo Editor",
      "Mobile App Access",
      "Secure SSL Transfer",
    ],
    className:
      "border-brand-500 dark:border-brand-500 shadow-xl scale-105 z-10 h-full",
    variant: "default",
  },
  {
    name: "Pro",
    price: "9.99",
    desc: "For power users and creators.",
    features: [
      "2 TB Storage",
      "Advanced AI Search",
      "Priority Support",
      "Version History (30 days)",
      "Vault Security",
    ],
    popular: true,
    variant: "brand", // Highlighted variant
  },
  {
    name: "Business",
    price: "24.99",
    desc: "For teams and collaboration.",
    features: [
      "Unlimited Storage",
      "Team Management",
      "SSO & Audit Logs",
      "Unlimited Version History",
      "24/7 Dedicated Support",
    ],
    variant: "dark",
  },
];

const Pricing = () => {
  const [isYearly, setIsYearly] = useState(false);

  return (
    <section id="pricing" className="py-32 relative bg-transparent">
      <div className="container mx-auto px-6">
        <div className="text-center max-w-2xl mx-auto mb-16">
          <h2 className="text-3xl md:text-5xl font-bold text-slate-900 dark:text-white mb-6">
            Simple, transparent pricing
          </h2>
          <p className="text-xl text-slate-500 dark:text-slate-400 mb-8">
            Start with 15GB free. Upgrade as you grow.
          </p>

          <div className="flex items-center justify-center gap-4 mb-2">
            <span
              className={`text-sm font-medium ${!isYearly ? "text-slate-900 dark:text-white" : "text-slate-400 dark:text-slate-500"}`}
            >
              Monthly
            </span>
            <button
              onClick={() => setIsYearly(!isYearly)}
              className="relative w-14 h-8 bg-slate-200 dark:bg-slate-800 rounded-full p-1 transition-colors duration-300 focus:outline-none focus:ring-2 focus:ring-[#14b8a6]"
            >
              <motion.div
                className="w-6 h-6 bg-[#2dd4bf] rounded-full shadow-[0_0_10px_rgba(45,212,191,0.5)]"
                animate={{ x: isYearly ? 24 : 0 }}
                transition={{ type: "spring", stiffness: 500, damping: 30 }}
              />
            </button>
            <span
              className={`text-sm font-medium ${isYearly ? "text-slate-900 dark:text-white" : "text-slate-400 dark:text-slate-500"}`}
            >
              Yearly{" "}
              <span className="text-green-500 font-bold text-xs ml-1">
                (Save 20%)
              </span>
            </span>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 max-w-6xl mx-auto">
          {plans.map((plan, index) => (
            <motion.div
              key={index}
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: index * 0.1, duration: 0.5 }}
              className={`relative h-full ${plan.popular ? "z-20 md:-mt-4" : "z-10"}`}
            >
              {plan.popular && (
                <div className="absolute -top-5 left-0 right-0 flex justify-center z-30">
                  <span className="bg-gradient-to-r from-[#14b8a6] to-[#3b82f6] text-white text-[11px] font-black px-5 py-2 rounded-[20px] tracking-widest shadow-[0_0_20px_rgba(20,184,166,0.6)]">
                    Most Popular
                  </span>
                </div>
              )}

              <Card
                variant={plan.popular ? "brand" : "dark"}
                className={`h-full flex flex-col relative transition-all duration-300 ${plan.popular ? "border-[#14b8a6]/80 shadow-[0_0_50px_rgba(20,184,166,0.3)] scale-105 bg-white/[0.06] backdrop-blur-3xl" : "border-white/10 scale-100"}`}
              >
                <div className="mb-8">
                  <h3 className="text-2xl font-bold text-slate-900 dark:text-white mb-2">
                    {plan.name}
                  </h3>
                  <p className="text-slate-500 dark:text-slate-400 mb-6">
                    {plan.desc}
                  </p>
                  <div className="flex items-baseline gap-1">
                    <span className="text-4xl font-black text-slate-900 dark:text-white">
                      $
                      {isYearly
                        ? (parseFloat(plan.price) * 0.8).toFixed(2)
                        : plan.price}
                    </span>
                    <span className="text-slate-400 dark:text-slate-500">
                      /{isYearly ? "mo (billed yearly)" : "mo"}
                    </span>
                  </div>
                </div>

                <div className="flex-1 space-y-4 mb-8">
                  {plan.features.map((feature, i) => (
                    <div key={i} className="flex items-start gap-3">
                      <div
                        className={`mt-1 w-5 h-5 rounded-full flex items-center justify-center shrink-0 
                        ${plan.popular ? "bg-[#14b8a6] text-white shadow-[0_0_10px_rgba(20,184,166,0.5)]" : "bg-slate-100 dark:bg-slate-800 text-[#2dd4bf]"}`}
                      >
                        <Check size={12} strokeWidth={3} />
                      </div>
                      <span className="text-slate-600 dark:text-slate-300 text-sm">
                        {feature}
                      </span>
                    </div>
                  ))}
                </div>

                <Link to="/register" className="w-full">
                  <Button
                    variant={plan.popular ? "masterclass" : "outline"}
                    className="w-full justify-center"
                  >
                    {plan.price === "0" ? "Start Free" : "Get Started"}
                  </Button>
                </Link>
              </Card>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default Pricing;
