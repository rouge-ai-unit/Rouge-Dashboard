"use client";

import { useEffect, useState } from "react";
import {
  Drawer,
  DrawerContent,
  DrawerHeader,
  DrawerTitle,
  DrawerTrigger,
} from "@/components/ui/drawer";
import { Button } from "@/components/ui/button";
import { MessageCircle, X, Expand, Shrink } from "lucide-react";

export default function ChatbotWidget() {
  const [isOpen, setIsOpen] = useState(false);
  const [isFullScreen, setIsFullScreen] = useState(false);

  // Lock body scroll when sheet or fullscreen is open
  useEffect(() => {
    const shouldLock = isOpen || isFullScreen;
    const original = document.body.style.overflow;
    if (shouldLock) document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = original;
    };
  }, [isOpen, isFullScreen]);

  return (
    <Drawer open={isOpen} onOpenChange={setIsOpen}>
      {/* Floating activator with label */}
      <div className="fixed bottom-6 right-6 z-50 flex items-center gap-2 group">
        <span
          className="pointer-events-none select-none opacity-0 translate-x-2 group-hover:opacity-100 group-hover:translate-x-0 transition md:opacity-100 md:translate-x-0 hidden sm:inline-flex items-center px-3 py-1.5 rounded-full text-sm text-gray-200 bg-[#101418]/90 border border-gray-700 shadow-lg"
        >
          Chat with AI Agent
        </span>
        <DrawerTrigger asChild>
          <Button
            variant="default"
            className="w-16 h-16 rounded-full shadow-lg text-white bg-[#1F2937] hover:bg-[#111827]"
            aria-label={isOpen ? "Close chat" : "Open chat: Chat with AI Agent"}
            title="Chat with AI Agent"
            aria-expanded={isOpen}
          >
            {isOpen ? <X size={24} /> : <MessageCircle size={24} />}
          </Button>
        </DrawerTrigger>
      </div>
      {!isFullScreen && (
        <DrawerContent className="bg-gray-900 text-white border-gray-700 transition-all duration-300 ease-in-out max-w-3xl h-[85vh] mx-auto rounded-t-2xl">
        <div className="w-full h-full flex flex-col">
      <DrawerHeader className="flex justify-between items-center p-4 border-b border-gray-700">
            <DrawerTitle className="text-lg font-semibold">
        Chat with AI Agent
            </DrawerTitle>
            <div className="flex items-center gap-2">
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setIsFullScreen(!isFullScreen)}
                aria-label={isFullScreen ? "Exit full screen" : "Go full screen"}
              >
                {isFullScreen ? (
                  <Shrink size={20} />
                ) : (
                  <Expand size={20} />
                )}
              </Button>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setIsOpen(false)}
                aria-label="Close chatbot"
              >
                <X size={20} />
              </Button>
            </div>
          </DrawerHeader>
          <div className="flex-1 w-full h-full overflow-hidden">
            <iframe
              src="https://chatbotai-tan-six.vercel.app/"
              title="Chatbot"
              className="w-full h-full border-none"
            />
          </div>
        </div>
        </DrawerContent>
      )}

      {isFullScreen && (
        <div className="fixed inset-0 z-[1000] bg-gray-900 text-white flex flex-col">
          <div className="flex items-center justify-between px-4 py-3 border-b border-gray-700">
            <h2 className="text-base sm:text-lg font-semibold">Chat with AI Agent</h2>
            <div className="flex items-center gap-1">
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setIsFullScreen(false)}
                aria-label="Exit full screen"
              >
                <Shrink size={20} />
              </Button>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => {
                  setIsFullScreen(false);
                  setIsOpen(false);
                }}
                aria-label="Close chatbot"
              >
                <X size={20} />
              </Button>
            </div>
          </div>
          <div className="flex-1 min-h-0">
            <iframe
              src="https://chatbotai-tan-six.vercel.app/"
              title="Chatbot"
              className="w-full h-full border-0"
            />
          </div>
        </div>
      )}
    </Drawer>
  );
}
