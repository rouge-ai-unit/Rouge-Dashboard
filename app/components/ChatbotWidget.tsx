"use client";

import { useState } from "react";
import { MessageCircle } from "lucide-react";

export default function ChatbotWidget() {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <>
      {/* Floating Chatbot Toggle Button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="fixed bottom-6 right-6 bg-[#1F2937] hover:bg-[#111827] text-white p-3 rounded-full shadow-xl z-50"
        aria-label="Toggle Chatbot"
      >
        <MessageCircle size={24} />
      </button>

      {/* Chatbot Modal */}
      {isOpen && (
        <div className="fixed bottom-24 right-6 z-50 w-[360px] h-[480px] bg-white rounded-2xl shadow-2xl overflow-hidden border border-gray-300">
          <iframe
            src="https://chatbotai-tan-six.vercel.app/"
            title="Chatbot"
            className="w-full h-full border-none"
            style={{
              margin: "0px",
              padding: "0px",
              display: "block",
            }}
            scrolling="no"
          />
        </div>
      )}
    </>
  );
}
