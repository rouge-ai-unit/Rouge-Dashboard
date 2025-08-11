"use client";

import { SessionProvider } from "next-auth/react";
import "./globals.css";
import ChatbotWidget from "../components/ChatbotWidget";
import { useSession } from "next-auth/react";
import Script from "next/script";
import { Toaster } from "@/components/ui/sonner";
import { ThemeProvider } from "@/components/ThemeProvider";
import GlobalDialogProvider from "@/components/GlobalDialog";

const GA_TRACKING_ID = process.env.NEXT_PUBLIC_GOOGLE_ANALYTICS_ID;

function AuthenticatedChatbot() {
  const { status } = useSession();
  if (status !== "authenticated") return null;
  return <ChatbotWidget />;
}

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
              <div className="bg-[#202222]">{children}</div>
            </GlobalDialogProvider>
          </ThemeProvider>
          <Toaster richColors theme="dark" />
          <AuthenticatedChatbot />
        </SessionProvider>
      </body>
    </html>
  );
}
