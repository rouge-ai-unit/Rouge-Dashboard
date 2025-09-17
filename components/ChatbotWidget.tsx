"use client";

import { useEffect, useState, useRef, useCallback } from "react";
import { MessageCircle, X } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { usePathname } from "next/navigation";

interface ChatbotWidgetProps {
  chatbotUrl?: string;
  position?: 'bottom-right' | 'bottom-left';
  theme?: 'dark' | 'light';
}

export default function ChatbotWidget({ 
  chatbotUrl = "https://chatbotai-tan-six.vercel.app/",
  position = 'bottom-right',
  theme = 'dark'
}: ChatbotWidgetProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [iframeLoaded, setIframeLoaded] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [mounted, setMounted] = useState(false);
  const popupRef = useRef<HTMLDivElement>(null);
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const pathname = usePathname();

  // Prevent hydration mismatch by only rendering after mount
  useEffect(() => {
    setMounted(true);
  }, []);

  // Optimized body scroll lock
  useEffect(() => {
    const originalOverflow = document.body.style.overflow;
    
    if (isOpen) {
      document.body.style.overflow = "hidden";
      document.body.style.paddingRight = "0px";
    } else {
      document.body.style.overflow = originalOverflow;
      document.body.style.paddingRight = "";
    }

    return () => {
      document.body.style.overflow = originalOverflow;
      document.body.style.paddingRight = "";
    };
  }, [isOpen]);

  // Enhanced keyboard handling
  useEffect(() => {
    if (!isOpen) return;
    
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.preventDefault();
        setIsOpen(false);
      }
    };
    
    document.addEventListener("keydown", handleKeyDown, { passive: false });
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [isOpen]);

  // Click outside handler
  useEffect(() => {
    if (!isOpen) return;
    
    const handleClick = (e: MouseEvent) => {
      if (popupRef.current && !popupRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    
    document.addEventListener("mousedown", handleClick, { passive: true });
    return () => document.removeEventListener("mousedown", handleClick);
  }, [isOpen]);

  // Handle iframe loading
  const handleIframeLoad = useCallback(() => {
    setIframeLoaded(true);
    setIsLoading(false);
  }, []);

  const handleOpenChat = useCallback(() => {
    setIsLoading(true);
    setIsOpen(true);
  }, []);

  const handleCloseChat = useCallback(() => {
    setIsOpen(false);
    setIframeLoaded(false);
  }, []);

  // Position classes
  const positionClasses = {
    'bottom-right': 'bottom-8 right-8',
    'bottom-left': 'bottom-8 left-8'
  };

  // Theme classes
  const themeClasses = {
    dark: {
      popup: 'bg-[#0F1419] border-[#23262F]',
      header: 'bg-[#0F1419] border-[#23262F]',
      button: 'bg-[#1F2937] hover:bg-[#111827]',
      text: 'text-white',
      subtext: 'text-gray-400',
      accent: 'text-yellow-400'
    },
    light: {
      popup: 'bg-white border-gray-200',
      header: 'bg-white border-gray-200',
      button: 'bg-blue-600 hover:bg-blue-700',
      text: 'text-gray-900',
      subtext: 'text-gray-600',
      accent: 'text-blue-600'
    }
  };

  const currentTheme = themeClasses[theme];

  // Don't render on signin pages
  const isSigninPage = pathname?.startsWith('/signin') || 
                      pathname?.startsWith('/auth/signin') || 
                      pathname?.startsWith('/(auth)/signin');

  // Prevent hydration mismatch by not rendering until mounted or on signin pages
  if (!mounted || isSigninPage) {
    return null;
  }

  return (
    <>
      {/* Floating activator button */}
      <div className={`fixed ${positionClasses[position]} z-50 flex items-center gap-3 group`}>
        {/* Tooltip */}
        <motion.span
          initial={{ opacity: 0, x: position === 'bottom-right' ? 8 : -8 }}
          whileHover={{ opacity: 1, x: 0 }}
          className={`pointer-events-none select-none opacity-0 group-hover:opacity-100 transition-all duration-200 hidden sm:inline-flex items-center px-4 py-2 rounded-xl text-sm ${currentTheme.text} bg-black/90 border border-gray-700 shadow-xl backdrop-blur-sm whitespace-nowrap`}
        >
          Chat with AI Agent
        </motion.span>

        {/* Main button */}
        <motion.button
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          onClick={handleOpenChat}
          aria-label="Open chat: Chat with AI Agent"
          title="Chat with AI Agent"
          className={`relative w-16 h-16 rounded-full shadow-xl text-white ${currentTheme.button} flex items-center justify-center focus:outline-none focus:ring-4 focus:ring-blue-500/50 transition-all duration-200`}
        >
          <MessageCircle size={28} strokeWidth={1.5} />
          
          {/* Pulse animation */}
          <motion.div
            animate={{
              scale: [1, 1.2, 1],
              opacity: [0.5, 0, 0.5]
            }}
            transition={{
              duration: 2,
              repeat: Infinity,
              ease: "easeInOut"
            }}
            className="absolute inset-0 rounded-full bg-blue-500/30"
          />
        </motion.button>
      </div>

      {/* Enhanced Modal Popup */}
      <AnimatePresence mode="wait">
        {isOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/70 backdrop-blur-md"
            aria-modal="true"
            role="dialog"
            aria-labelledby="chatbot-title"
          >
            <motion.div
              ref={popupRef}
              initial={{ scale: 0.9, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.9, opacity: 0, y: 20 }}
              transition={{ 
                type: "spring", 
                stiffness: 400, 
                damping: 30,
                mass: 0.8
              }}
              className={`relative w-full max-w-4xl mx-4 ${currentTheme.popup} rounded-2xl shadow-2xl border overflow-hidden flex flex-col`}
              style={{ 
                height: 'min(95vh, 750px)',
                minHeight: '550px',
                maxHeight: '95vh'
              }}
            >
              {/* Enhanced Header */}
              <div className={`flex items-center justify-between px-6 py-4 border-b ${currentTheme.header} bg-opacity-95 backdrop-blur-sm flex-shrink-0`}>
                <div className="flex items-center gap-3">
                  <div className="relative">
                    <img 
                      src="/logo.jpg" 
                      alt="Rouge Logo" 
                      className="w-11 h-11 rounded-xl object-cover ring-2 ring-white/10" 
                      onError={(e) => {
                        const target = e.target as HTMLImageElement;
                        target.style.display = 'none';
                      }}
                    />
                    <div className="absolute -bottom-1 -right-1 w-4 h-4 bg-green-500 rounded-full border-2 border-white animate-pulse" />
                  </div>
                  <div>
                    <h2 id="chatbot-title" className={`text-lg font-bold ${currentTheme.text} leading-tight`}>
                      Chat with AI Agent
                    </h2>
                    <span className={`text-xs ${currentTheme.subtext} font-medium`}>
                      Talk to <span className={`${currentTheme.accent} font-semibold`}>Rouge Chatbot</span>
                    </span>
                  </div>
                </div>
                
                <button
                  onClick={handleCloseChat}
                  aria-label="Close chatbot"
                  className={`p-2.5 rounded-xl hover:bg-white/10 ${currentTheme.subtext} hover:text-white transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-blue-500/50`}
                >
                  <X size={20} strokeWidth={2} />
                </button>
              </div>

              {/* Content Container - CLEANED UP */}
              <div className="relative flex-1 overflow-hidden">
                {/* Loading overlay */}
                {(isLoading || !iframeLoaded) && (
                  <div className="absolute inset-0 flex items-center justify-center bg-[#0F1419] z-10">
                    <div className="text-center space-y-4">
                      <motion.div
                        animate={{ rotate: 360 }}
                        transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                        className="w-8 h-8 border-3 border-blue-500 border-t-transparent rounded-full mx-auto"
                      />
                      <p className="text-gray-400 text-sm font-medium">Loading chatbot...</p>
                    </div>
                  </div>
                )}

                {/* Clean iframe without extra wrappers */}
                <iframe
                  ref={iframeRef}
                  src={chatbotUrl}
                  title="AI Chatbot Interface"
                  className="w-full h-full border-0"
                  style={{
                    height: '100%',
                    width: '100%',
                    display: 'block',
                    background: 'transparent',
                  }}
                  onLoad={handleIframeLoad}
                  allow="clipboard-write; microphone; camera"
                  sandbox="allow-same-origin allow-scripts allow-forms allow-popups allow-popups-to-escape-sandbox"
                  loading="eager"
                />
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
