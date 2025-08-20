"use client";

import Link from "next/link";
import { useSession, signOut } from "next-auth/react";
import Image from "next/image";
import { useState } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";

export default function Sidebar({ children }: { children: React.ReactNode }) {
  const { data: session, status } = useSession();
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);

  const toggleSidebar = () => setIsSidebarOpen(!isSidebarOpen);

  if (status === "loading") return null;

  return (
    <div className="flex min-h-screen">
      <div
        className={`fixed top-0 left-0 h-full bg-[#171717] text-white z-40 transition-all duration-300 ease-in-out ${
          isSidebarOpen ? "w-64" : "w-16"
        } flex flex-col shadow-lg`}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-gray-700">
          {isSidebarOpen && (
            <Link href="/Home">
              <Image
                src="/logo.jpg"
                alt="Company Logo"
                width={40}
                height={40}
                className="rounded-md"
              />
            </Link>
          )}
          <button
            onClick={toggleSidebar}
            className="text-white focus:outline-none"
            aria-label={isSidebarOpen ? "Collapse sidebar" : "Expand sidebar"}
          >
            {isSidebarOpen ? (
              <ChevronLeft size={24} />
            ) : (
              <ChevronRight size={24} />
            )}
          </button>
        </div>

        {/* Navigation Links */}
        <ul className="flex flex-col space-y-2 p-4 flex-1" role="navigation">
          <li>
            <Link
              href="/Home"
              className={`flex items-center text-white hover:bg-[#2A2A2A] rounded-md p-2 transition-colors ${
                !isSidebarOpen && "justify-center"
              }`}
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                width="20"
                height="20"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
                className="mr-2"
              >
                <rect width="7" height="7" x="3" y="3" rx="1" />
                <rect width="7" height="7" x="14" y="3" rx="1" />
                <rect width="7" height="7" x="14" y="14" rx="1" />
                <rect width="7" height="7" x="3" y="14" rx="1" />
              </svg>
              {isSidebarOpen && <span>Home</span>}
            </Link>
          </li>
          <li>
            <Link
              href="/states"
              className={`flex items-center text-white hover:bg-[#2A2A2A] rounded-md p-2 transition-colors ${
                !isSidebarOpen && "justify-center"
              }`}
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                width="20"
                height="20"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
                className="mr-2"
              >
                <path d="M3 3v18h18" />
                <path d="M3 10h18" />
              </svg>
              {isSidebarOpen && <span>Analytics</span>}
            </Link>
          </li>
          <li>
            <Link
              href="/ai-news-daily"
              className={`flex items-center text-white hover:bg-[#2A2A2A] rounded-md p-2 transition-colors ${
                !isSidebarOpen && "justify-center"
              }`}
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                width="20"
                height="20"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
                className="mr-2"
              >
                <path d="M4 11a9 9 0 0 1 9 9" />
                <path d="M4 4a16 16 0 0 1 16 16" />
                <circle cx="5" cy="19" r="1" />
              </svg>
              {isSidebarOpen && <span>Daily AI News</span>}
            </Link>
          </li>
          <li>
            <Link
              href="/contact"
              className={`flex items-center text-white hover:bg-[#2A2A2A] rounded-md p-2 transition-colors ${
                !isSidebarOpen && "justify-center"
              }`}
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                width="20"
                height="20"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
                className="mr-2"
              >
                <rect width="20" height="16" x="2" y="4" rx="2" />
                <path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7" />
              </svg>
              {isSidebarOpen && <span>Contact Us</span>}
            </Link>
          </li>
        </ul>

        {/* User Section */}
        <div className="p-4 border-t border-gray-700">
          {session ? (
            <div className="flex items-center">
              {isSidebarOpen && (
                <div className="flex-1">
                  <p className="text-sm font-semibold">{session.user?.name}</p>
                  <p className="text-xs text-gray-400">{session.user?.email}</p>
                </div>
              )}
              <button
                onClick={() => signOut()}
                className={`text-white hover:bg-[#2A2A2A] rounded-md p-2 transition-colors ${
                  !isSidebarOpen && "w-10 h-10 flex justify-center"
                }`}
                aria-label="Sign out"
              >
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  width="20"
                  height="20"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
                  <polyline points="16 17 21 12 16 7" />
                  <line x1="21" x2="9" y1="12" y2="12" />
                </svg>
              </button>
            </div>
          ) : (
            <Link
              href="/signin"
              className={`flex items-center text-white hover:bg-[#2A2A2A] rounded-md p-2 transition-colors ${
                !isSidebarOpen && "justify-center"
              }`}
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                width="20"
                height="20"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="M15 3h4a2 2 0 0 1 2 2v4" />
                <path d="M10 14L21 3" />
                <path d="M21 3v4" />
              </svg>
              {isSidebarOpen && <span>Sign In</span>}
            </Link>
          )}
        </div>
      </div>

      {/* Content Area */}
      <main
        className={`flex-1 ml-16 transition-all duration-300 ${
          isSidebarOpen && "ml-64"
        }`}
      >
        {children}
      </main>
    </div>
  );
}
