import { useState } from "react";
import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import { Check, Zap, ArrowRight } from "lucide-react";

const plans = [
  {
    name: "Hobby",
    price: "0",
    desc: "Perfect for testing the vault.",
    features: [
      "15 GB Encrypted Storage",
      "Basic Neural Sorting",
      "Mobile App Access",
      "Standard Speed Network",
    ],
    color: "from-blue-400 to-cyan-400",
    shadow: "shadow-blue-500/20",
    borderHover: "hover:border-blue-500/30",
  },
  {
    name: "Professional",
    price: "9.99",
    desc: "For power users and creators.",
    features: [
      "2 TB Encrypted Storage",
      "Advanced AI Search",
      "Priority Access Network",
      "Version History (30 days)",
      "Zero-Knowledge Vault",
    ],
    popular: true,
    color: "from-[#14b8a6] to-[#0ea5e9]",
    shadow: "shadow-teal-500/30",
    borderHover: "hover:border-[#14b8a6]/40",
  },
  {
    name: "Enterprise",
    price: "24.99",
    desc: "For teams and secure collaboration.",
    features: [
      "Unlimited Storage",
      "Team Management",
      "SSO & Audit Logs",
      "Unlimited Version History",
      "24/7 Dedicated Support",
    ],
    color: "from-purple-400 to-pink-500",
    shadow: "shadow-purple-500/20",
    borderHover: "hover:border-purple-500/30",
  },
];

const Pricing = () => {
  const [isYearly, setIsYearly] = useState(false);

  return (
    <section id="pricing" className="py-32 relative overflow-hidden bg-[#010504]">
      {/* Ambient background grids */}
      <div className="absolute inset-0 bg-[linear-gradient(rgba(20,184,166,0.03)_1px,transparent_1px),linear-gradient(90deg,rgba(20,184,166,0.03)_1px,transparent_1px)] bg-[size:48px_48px] [mask-image:radial-gradient(ellipse_80%_80%_at_50%_0%,#000_20%,transparent_100%)] pointer-events-none" />

      <div className="container mx-auto px-4 sm:px-6 relative z-10 max-w-[1200px]">
        {/* Header */}
        <div className="text-center max-w-2xl mx-auto mb-20">
          <span className="inline-flex items-center gap-2 py-1 px-3 rounded-full bg-white/5 border border-white/10 text-[#14b8a6] font-bold tracking-widest text-xs uppercase mb-6 shadow-[0_0_20px_rgba(20,184,166,0.1)]">
            <Zap size={14} fill="currentColor" /> Simple Plans
          </span>
          <h2 className="text-5xl md:text-6xl font-black text-white mb-6 tracking-tight">
            Transparent Pricing. <br/>
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-white/40 to-white/80">
                Zero hidden fees.
            </span>
          </h2>
          
          {/* Custom Sleek Toggle */}
          <div className="flex items-center justify-center gap-6 mt-12">
            <span className={`text-sm font-bold tracking-widest uppercase transition-colors ${!isYearly ? "text-white" : "text-white/30"}`}>
              Monthly
            </span>
            <button
              onClick={() => setIsYearly(!isYearly)}
              className="relative w-16 h-8 bg-white/5 rounded-full p-1 border border-white/10 flex items-center shadow-inner focus:outline-none"
            >
              <motion.div
                className="w-6 h-6 rounded-full bg-gradient-to-r from-[#14b8a6] to-[#0ea5e9] shadow-[0_0_15px_rgba(20,184,166,0.6)]"
                animate={{ x: isYearly ? 32 : 0 }}
                transition={{ type: "spring", stiffness: 500, damping: 30 }}
              />
            </button>
            <span className={`text-sm font-bold tracking-widest uppercase transition-colors flex items-center gap-2 ${isYearly ? "text-white" : "text-white/30"}`}>
              Yearly
              <span className="bg-[#14b8a6]/20 text-[#14b8a6] px-2 py-0.5 rounded text-[10px] border border-[#14b8a6]/30">Save 20%</span>
            </span>
          </div>
        </div>

        {/* Pricing Tiers */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 lg:gap-8 items-center relative">
            {/* Background ambient glow behind middle card */}
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[300px] h-[500px] bg-[#14b8a6]/10 blur-[120px] rounded-full pointer-events-none" />

          {plans.map((plan, index) => (
            <motion.div
              key={index}
              initial={{ opacity: 0, y: 40 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: "-50px" }}
              transition={{ delay: index * 0.15, duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
              className={`relative group rounded-[2.5rem] bg-[#020705] border border-white/5 transition-all duration-500 overflow-hidden flex flex-col ${plan.borderHover} ${plan.popular ? "md:scale-105 shadow-[0_20px_80px_rgba(20,184,166,0.15)] z-20 py-12" : "shadow-xl z-10 py-10 opacity-90 hover:opacity-100"}`}
            >
              {/* Top border highlight */}
              <div className={`absolute top-0 left-0 w-full h-1 bg-gradient-to-r ${plan.color} opacity-50 group-hover:opacity-100 transition-opacity`} />
              
              {plan.popular && (
                <div className="absolute top-0 left-1/2 -translate-x-1/2 px-4 py-1.5 bg-gradient-to-r from-[#14b8a6]/20 to-[#0ea5e9]/20 border-b border-x border-[#14b8a6]/30 rounded-b-xl backdrop-blur-md">
                    <span className="text-[#14b8a6] text-[10px] font-black uppercase tracking-widest drop-shadow-[0_0_10px_rgba(20,184,166,0.8)]">Most Popular</span>
                </div>
              )}

              <div className="px-8 flex-1">
                <h3 className="text-2xl font-bold text-white mb-2 tracking-tight">{plan.name}</h3>
                <p className="text-white/40 text-sm mb-8">{plan.desc}</p>
                
                <div className="flex items-baseline gap-1 mb-10 border-b border-white/5 pb-10">
                  <span className="text-5xl font-black text-white tracking-tighter">
                    ${isYearly ? (parseFloat(plan.price) * 0.8).toFixed(2) : plan.price}
                  </span>
                  <span className="text-white/30 font-medium">/{isYearly ? "mo" : "mo"}</span>
                </div>

                <div className="space-y-4 mb-10">
                  {plan.features.map((feature, i) => (
                    <div key={i} className="flex items-start gap-3">
                      <div className={`mt-0.5 w-5 h-5 rounded-full flex items-center justify-center shrink-0 border border-white/10 ${plan.popular ? "bg-[#14b8a6]/20 text-[#14b8a6] border-[#14b8a6]/30" : "bg-white/5 text-white/50"}`}>
                        <Check size={12} strokeWidth={3} />
                      </div>
                      <span className={`text-sm ${plan.popular ? "text-white/80 font-medium" : "text-white/60"}`}>
                        {feature}
                      </span>
                    </div>
                  ))}
                </div>
              </div>

              <div className="px-8 mt-auto">
                <Link to="/register" className="block w-full">
                  <button className={`w-full py-4 rounded-2xl font-bold tracking-wide transition-all duration-300 flex items-center justify-center gap-2 group/btn relative overflow-hidden ${
                      plan.popular 
                        ? "bg-[#14b8a6] text-[#010504] shadow-[0_0_30px_rgba(20,184,166,0.3)] hover:shadow-[0_0_40px_rgba(20,184,166,0.5)]" 
                        : "bg-white/5 text-white border border-white/10 hover:bg-white/10"
                  }`}>
                    {plan.popular && <div className="absolute inset-0 bg-white/20 opacity-0 group-hover/btn:opacity-100 transition-opacity" />}
                    <span className="relative z-10">{plan.price === "0" ? "Start Free" : "Get Started"}</span>
                    <ArrowRight size={18} className="relative z-10 group-hover/btn:translate-x-1 transition-transform" />
                  </button>
                </Link>
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default Pricing;
