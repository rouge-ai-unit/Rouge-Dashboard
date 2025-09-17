"use client";

import { SessionProvider } from "next-auth/react";
import "./globals.css";
import { usePathname } from "next/navigation";
import Script from "next/script";
import { Toaster } from "@/components/ui/sonner";
import { ThemeProvider } from "@/components/ThemeProvider";
import GlobalDialogProvider from "@/components/GlobalDialog";
import ErrorBoundary from "@/components/ErrorBoundary";
import dynamic from "next/dynamic";

const GA_TRACKING_ID = process.env.NEXT_PUBLIC_GOOGLE_ANALYTICS_ID;

// Dynamically import ChatbotWidget to prevent SSR issues
const ChatbotWidget = dynamic(() => import("../components/ChatbotWidget"), {
  ssr: false,
});



export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        {GA_TRACKING_ID && (
          <>
            <Script
              strategy="afterInteractive"
              src={`https://www.googletagmanager.com/gtag/js?id=${GA_TRACKING_ID}`}
            />
            <Script
              id="google-analytics"
              strategy="afterInteractive"
              dangerouslySetInnerHTML={{
                __html: `
                  window.dataLayer = window.dataLayer || [];
                  function gtag(){dataLayer.push(arguments);}
                  gtag('js', new Date());
                  gtag('config', '${GA_TRACKING_ID}', {
                    page_path: window.location.pathname,
                  });
                `,
              }}
            />
          </>
        )}
      </head>
  <body suppressHydrationWarning>
        <SessionProvider>
          {/* <Sidebar>{children}</Sidebar> */}
          <ThemeProvider
            attribute="class"
            defaultTheme="dark"
            enableSystem
            disableTransitionOnChange
          >
            <GlobalDialogProvider>
              <ErrorBoundary>
                <div className="bg-[#202222]">{children}</div>
              </ErrorBoundary>
            </GlobalDialogProvider>
          </ThemeProvider>
          <Toaster richColors theme="dark" />
          <ChatbotWidget />
        </SessionProvider>
      </body>
    </html>
  );
}
