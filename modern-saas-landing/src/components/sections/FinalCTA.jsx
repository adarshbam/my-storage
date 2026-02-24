import { motion } from "framer-motion";
import { Link } from "react-router-dom";
import Button from "../ui/Button";
import { ArrowRight } from "lucide-react";

const FinalCTA = () => {
  return (
    <section className="py-24 relative overflow-hidden">
      <div className="absolute inset-0 bg-blue-600 dark:bg-blue-900">
        <div className="absolute inset-0 bg-gradient-to-br from-blue-600 to-indigo-900 opacity-90" />
        <div className="absolute top-0 left-0 w-full h-full bg-[url('https://grainy-gradients.vercel.app/noise.svg')] opacity-20" />
      </div>

      <div className="container mx-auto px-6 relative z-10 text-center">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
        >
          <h2 className="text-4xl md:text-6xl font-bold text-white mb-6">
            Ready to organize your life?
          </h2>
          <p className="text-blue-100 text-lg md:text-xl max-w-2xl mx-auto mb-10">
            Join millions of users who trust Storifyy to keep their files safe,
            secure, and accessible from anywhere.
          </p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <Link to="/register">
              <Button className="bg-white text-blue-600 hover:bg-blue-50 w-full sm:w-auto gap-2 border-transparent">
                Get Started for Free <ArrowRight size={18} />
              </Button>
            </Link>
            <Button
              variant="outline"
              className="text-white border-white/20 hover:bg-white/10 w-full sm:w-auto"
            >
              Download App
            </Button>
          </div>
        </motion.div>
      </div>
    </section>
  );
};

export default FinalCTA;
