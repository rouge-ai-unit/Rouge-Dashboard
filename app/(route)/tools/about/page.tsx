"use client";
import { motion } from "framer-motion";
import { Info } from "lucide-react";

export default function AboutPage() {
  return (
    <main className="p-6 min-h-screen">
      <div className="max-w-4xl mx-auto">
        <motion.h1
          initial={{ opacity: 0, y: -8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3 }}
          className="text-3xl md:text-4xl font-bold mb-4 text-white flex items-center gap-2"
        >
          <Info className="h-7 w-7 text-blue-400" /> About Us
        </motion.h1>
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3, delay: 0.05 }}
          className="bg-[#232526] rounded-xl p-6 border border-gray-700 text-gray-100 shadow-lg"
        >
          <p className="leading-relaxed">
            Welcome to the Rouge Company Dashboard. Here, you can manage all your business units, view analytics, and collaborate with your team. We’re always eager to hear from you. Whether you have questions, feedback, or just want to connect, the AI Unit is here and ready to assist you. Don’t hesitate to reach out — we’re just a message away!
          </p>
        </motion.div>
      </div>
    </main>
  );
}
