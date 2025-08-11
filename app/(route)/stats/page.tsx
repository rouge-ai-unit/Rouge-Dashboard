"use client";

import LookerEmbed from "@/components/LookerEmbed";
import { motion } from "framer-motion";
import { BarChart3 } from "lucide-react";

export default function Page() {
  return (
    <main className="min-h-screen p-6">
      <div className="max-w-6xl mx-auto">
        <motion.h1
          initial={{ opacity: 0, y: -8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.35 }}
          className="text-3xl md:text-4xl font-bold mb-6 text-white flex items-center gap-2"
        >
          <BarChart3 className="h-7 w-7 text-blue-400" /> Analytics
        </motion.h1>
        <motion.section
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.35, delay: 0.05 }}
          className="bg-[#232526] rounded-xl p-3 md:p-4 border border-gray-700 shadow-lg"
        >
          <LookerEmbed />
        </motion.section>
      </div>
    </main>
  );
}
